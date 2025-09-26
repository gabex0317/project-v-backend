const express = require('express');
const cors = require('cors');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting - máximo 10 requests por minuto por IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // máximo 10 requests por minuto
  message: {
    error: 'Muitas requisições. Tente novamente em 1 minuto.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS - permitir requests de qualquer origem
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware para parsing JSON
app.use(express.json({ limit: '50mb' }));

// Configuração do multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceitar apenas arquivos de áudio
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de áudio são permitidos'), false);
    }
  }
});

// Verificar se a chave da API está configurada
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERRO: OPENAI_API_KEY não configurada!');
  console.log('📝 Crie um arquivo .env com: OPENAI_API_KEY=sua_chave_aqui');
  process.exit(1);
}

// Rota de health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Project V Backend',
    version: '1.0.0',
    powered_by: 'GPT-4o Transcribe',
    endpoints: {
      health: 'GET /',
      transcribe: 'POST /api/transcribe'
    }
  });
});

// Rota principal de transcrição
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log(`🎤 Nova requisição de transcrição - IP: ${req.ip}`);
    
    // Verificar se o arquivo foi enviado
    if (!req.file) {
      return res.status(400).json({
        error: 'Nenhum arquivo de áudio foi enviado',
        code: 'NO_AUDIO_FILE'
      });
    }

    console.log(`📁 Arquivo recebido: ${req.file.size} bytes, tipo: ${req.file.mimetype}`);

    // Preparar FormData para a API da OpenAI
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('file', req.file.buffer, {
      filename: 'audio.webm',
      contentType: req.file.mimetype
    });
    formData.append('model', 'gpt-4o-audio-preview');
    formData.append('language', 'pt');
    formData.append('response_format', 'text');

    console.log('📡 Enviando para OpenAI API...');

    // Fazer requisição para OpenAI
    const fetch = (await import('node-fetch')).default;
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('❌ Erro na API OpenAI (Transcrição):', errorText);
      
      return res.status(transcriptionResponse.status).json({
        error: 'Erro na transcrição',
        details: errorText,
        code: 'TRANSCRIPTION_ERROR'
      });
    }

    const transcript = await transcriptionResponse.text();
    console.log(`✅ Transcrição concluída: ${transcript.length} caracteres`);

    // Se a transcrição estiver vazia, retornar erro
    if (!transcript.trim()) {
      return res.status(400).json({
        error: 'Não foi possível transcrever o áudio. Verifique se há fala audível.',
        code: 'EMPTY_TRANSCRIPTION'
      });
    }

    // Gerar resumo com GPT
    console.log('🧠 Gerando resumo com GPT...');
    
    const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Analise esta transcrição em português brasileiro e forneça:
          1. Um resumo conciso (máximo 200 palavras)
          2. Os 5 pontos mais importantes
          3. Tarefas ou ações identificadas (se houver)
          
          Responda APENAS em JSON válido no formato:
          {
            "summary": "resumo aqui",
            "keyPoints": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
            "tasks": ["tarefa 1", "tarefa 2"]
          }
          
          Transcrição: ${transcript}`
        }],
        max_tokens: 1000,
        temperature: 0.3
      })
    });

    let summaryData = {
      summary: 'Resumo gerado com sucesso',
      keyPoints: ['Transcrição processada'],
      tasks: []
    };

    if (summaryResponse.ok) {
      const summaryResult = await summaryResponse.json();
      try {
        summaryData = JSON.parse(summaryResult.choices[0].message.content);
        console.log('✅ Resumo gerado com sucesso');
      } catch (e) {
        console.log('⚠️ Erro ao parsear resumo, usando fallback');
        summaryData.summary = summaryResult.choices[0].message.content;
      }
    } else {
      console.log('⚠️ Erro no resumo, usando dados básicos');
    }

    const processingTime = Date.now() - startTime;
    console.log(`🎉 Processamento concluído em ${processingTime}ms`);

    // Retornar resultado completo
    res.json({
      success: true,
      transcript: transcript,
      summary: summaryData.summary,
      keyPoints: summaryData.keyPoints || [],
      tasks: summaryData.tasks || [],
      metadata: {
        processingTime: processingTime,
        audioSize: req.file.size,
        transcriptLength: transcript.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('❌ Erro interno:', error);
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error.message,
      code: 'INTERNAL_ERROR',
      processingTime: processingTime
    });
  }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Arquivo muito grande. Máximo permitido: 25MB',
        code: 'FILE_TOO_LARGE'
      });
    }
  }
  
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    code: 'UNHANDLED_ERROR'
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Project V Backend iniciado!');
  console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ Não configurada'}`);
  console.log('📋 Endpoints disponíveis:');
  console.log(`   GET  / - Health check`);
  console.log(`   POST /api/transcribe - Transcrição de áudio`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando servidor...');
  process.exit(0);
});
