# 🚀 Project V Backend

Backend seguro para o Project V - Sistema de transcrição com GPT-4o Transcribe.

## 🎯 Funcionalidades

- ✅ API REST para transcrição de áudio
- ✅ Integração com GPT-4o Transcribe (OpenAI)
- ✅ Geração automática de resumos
- ✅ Rate limiting (10 req/min por IP)
- ✅ Segurança com Helmet
- ✅ CORS configurado
- ✅ Upload de arquivos até 25MB

## 🛠️ Instalação Local

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite o arquivo .env com sua chave OpenAI
```

### 3. Executar servidor
```bash
npm start
```

Servidor estará disponível em: http://localhost:3000

## 🌐 Deploy no Railway

### 1. Conectar repositório
- Acesse: https://railway.app
- Conecte seu GitHub
- Importe este projeto

### 2. Configurar variável de ambiente
- Vá em Settings > Variables
- Adicione: `OPENAI_API_KEY` = sua_chave_openai

### 3. Deploy automático
- Railway fará deploy automaticamente
- URL será gerada automaticamente

## 📡 Endpoints

### GET /
Health check do servidor
```json
{
  "status": "online",
  "service": "Project V Backend",
  "version": "1.0.0"
}
```

### POST /api/transcribe
Transcrever áudio para texto + resumo

**Request:**
- Content-Type: multipart/form-data
- Campo: `audio` (arquivo de áudio)

**Response:**
```json
{
  "success": true,
  "transcript": "Texto transcrito...",
  "summary": "Resumo do conteúdo...",
  "keyPoints": ["Ponto 1", "Ponto 2", ...],
  "tasks": ["Tarefa 1", "Tarefa 2", ...],
  "metadata": {
    "processingTime": 1500,
    "audioSize": 1024000,
    "transcriptLength": 250
  }
}
```

## 🔒 Segurança

- Rate limiting: 10 requests/minuto por IP
- Helmet para headers de segurança
- Validação de tipos de arquivo
- Limite de tamanho: 25MB
- Chave API protegida no servidor

## 🚨 Códigos de Erro

- `NO_AUDIO_FILE`: Nenhum arquivo enviado
- `FILE_TOO_LARGE`: Arquivo maior que 25MB
- `TRANSCRIPTION_ERROR`: Erro na API OpenAI
- `EMPTY_TRANSCRIPTION`: Áudio sem fala detectada
- `INTERNAL_ERROR`: Erro interno do servidor

## 📊 Monitoramento

Logs incluem:
- IP do cliente
- Tamanho do arquivo
- Tempo de processamento
- Status das requisições
- Erros detalhados

## 🔧 Desenvolvimento

```bash
# Modo desenvolvimento
npm run dev

# Testar endpoint
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@test.wav"
```

## 📦 Dependências

- `express`: Servidor web
- `cors`: Cross-origin requests
- `multer`: Upload de arquivos
- `helmet`: Segurança
- `express-rate-limit`: Rate limiting
- `dotenv`: Variáveis de ambiente

## 🌟 Recursos Avançados

- Suporte a múltiplos formatos de áudio
- Processamento assíncrono
- Logs estruturados
- Graceful shutdown
- Health checks

---

**Desenvolvido para o Project V** 🎤✨
