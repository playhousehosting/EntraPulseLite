# Installation & Setup Guide

## 🛠️ Prerequisites

### Required
- **Node.js** 18.0 or higher
- **npm** 8.0 or higher (or **yarn** 1.22+)
- **Git** for version control

### Optional but Recommended
- **Local LLM Provider** (Ollama or LM Studio) for privacy-focused AI
- **Cloud LLM API Keys** (OpenAI, Anthropic, or Google Gemini) for advanced features
- **Microsoft Entra App Registration** for enhanced permissions

## 📦 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/darrenjrobinson/EntraPulseLite.git
cd EntrapulseLite
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration (Optional)
```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your configuration
```

Example `.env.local`:
```env
# Microsoft Entra App Registration (Optional)
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
TENANT_ID=your-tenant-id

# Cloud LLM API Keys (Optional)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_GEMINI_API_KEY=your-gemini-key
```

## 🚀 Quick Start

### Development Mode
```bash
npm start
```

This will:
1. Build the application
2. Start the Electron application
3. Enable hot reload for development

### Production Build
```bash
npm run build
npm run package
```

## 🤖 LLM Provider Setup

### Local Providers (Privacy-Focused)

#### Option 1: Ollama (Recommended)

**Install Ollama:**
```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows (PowerShell)
iwr -useb https://ollama.ai/install.ps1 | iex
```

**Pull and run a model:**
```bash
# Popular options
ollama pull llama3.1:8b
ollama pull codellama:13b
ollama pull mistral:7b

# Verify installation
ollama list
```

**Docker Alternative:**
```bash
# Run Ollama in Docker
docker run -d --name ollama -p 11434:11434 -v ollama:/root/.ollama --restart unless-stopped ollama/ollama

# Pull a model
docker exec -it ollama ollama pull llama3.1:8b
```

#### Option 2: LM Studio

1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Install the application
3. Download a compatible model (e.g., Llama 3.1, CodeLlama)
4. Start the local server (default port: 1234)

### Cloud Providers

#### OpenAI
1. Get API key from [platform.openai.com](https://platform.openai.com)
2. Add to Settings → Cloud Providers → OpenAI
3. Available models: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo

#### Anthropic (Claude)
1. Get API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to Settings → Cloud Providers → Anthropic
3. Available models: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku

#### Google Gemini
1. Get API key from [ai.google.dev](https://ai.google.dev)
2. Add to Settings → Cloud Providers → Google Gemini
3. Available models: Gemini 1.5 Pro, Gemini 1.5 Flash

## 🔐 Microsoft Authentication Setup

### Basic Setup (No App Registration Required)
EntraPulse Lite works out of the box with Microsoft's public client configuration:
- Uses Microsoft's public client ID
- Limited to basic permissions
- Perfect for individual users

### Advanced Setup (Custom App Registration)
For enhanced permissions and enterprise features:

1. **Register Application in Microsoft Entra**:
   - Go to [Azure Portal](https://portal.azure.com)
   - Navigate to Microsoft Entra ID → App registrations
   - Click "New registration"

2. **Configure Application**:
   - Name: "EntraPulse Lite"
   - Supported account types: "Accounts in this organizational directory only"
   - Redirect URI: `msal://redirect` (Public client/native)

3. **Configure Permissions**:
   ```
   Microsoft Graph - Delegated Permissions:
   - User.Read (Basic)
   - User.ReadBasic.All (User queries)
   - Directory.Read.All (Directory queries)
   - Group.Read.All (Group queries)
   - Application.Read.All (App queries)
   ```

4. **Add Configuration**:
   ```env
   CLIENT_ID=your-application-id
   TENANT_ID=your-tenant-id
   ```

## 🧪 Verification

### Test Local LLM Connection
```bash
# Test Ollama
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Hello, world!",
  "stream": false
}'

# Test LM Studio
curl http://localhost:1234/v1/models
```

### Test Application
1. Start the application: `npm start`
2. Sign in with your Microsoft account
3. Select an LLM provider in Settings
4. Ask a test question: "Who am I?"

## 🔧 Development Setup

### Additional Development Dependencies
```bash
# Install development tools globally (optional)
npm install -g @electron/packager
npm install -g electron-builder
```

### IDE Configuration
**VS Code Extensions** (recommended):
- TypeScript Hero
- Electron React
- Material-UI Snippets
- Jest Runner

### Hot Reload Development
```bash
# Start with hot reload
npm run dev

# Run tests in watch mode
npm run test:watch
```

## 🐳 Docker Setup (Optional)

For containerized development:

```bash
# Build development container
docker build -t entrapulse-lite-dev .

# Run with hot reload
docker run -p 3000:3000 -v $(pwd):/app entrapulse-lite-dev npm run dev
```

## 🔍 Troubleshooting

### Common Issues

**1. Node.js Version Conflicts**
```bash
# Use Node Version Manager
nvm install 18
nvm use 18
```

**2. Electron Build Issues**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**3. MSAL Authentication Issues**
- Ensure redirect URI is configured correctly
- Check network connectivity
- Verify tenant and client ID

**4. LLM Connection Issues**
- Verify local LLM is running: `curl http://localhost:11434/api/version`
- Check API keys for cloud providers
- Ensure firewall allows connections

### Getting Help
- Check [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) for detailed solutions
- Search [GitHub Issues](https://github.com/darrenjrobinson/EntraPulseLite/issues)
- Ask questions in [GitHub Discussions](https://github.com/darrenjrobinson/EntraPulseLite/discussions)

## 📈 Performance Optimization

### Local LLM Performance
- **RAM**: 16GB+ recommended for larger models
- **GPU**: NVIDIA GPU with CUDA for faster inference
- **Storage**: SSD recommended for model loading

### Application Performance
- **Electron**: Latest version for security and performance
- **Node.js**: Use LTS version for stability
- **Cache**: Enable model caching for faster responses
