# EntraPulse Lite

A freemium desktop application that provides natural language querying of Microsoft Graph APIs through local LLM integration. EntraPulse Lite is a lightweight derivative of the EntraPulse project, designed as an all-in-one desktop solution similar to Claude Desktop.

## 🚀 Features

- **Progressive Authentication**: Start with basic permissions, request more as needed
- **Microsoft Business Account Authentication**: Secure login with MSAL integration
- **Natural Language Querying**: Chat with your Microsoft Graph data using plain English
- **Multi-Provider LLM Integration**: Works with local (Ollama, LM Studio) and cloud (OpenAI, Anthropic, Google Gemini) AI models
- **Real-time LLM Status Monitoring**: Dynamic tracking of LLM availability with automatic UI updates
- **Built-in MCP Servers**: 
  - Lokka MCP for Microsoft Graph API access
  - External Lokka MCP using the official @merill/lokka package
  - Fetch MCP for Microsoft Learn documentation and Permissions Explorer
- **Chat Interface**: Modern UI with trace visualization and permission management
- **Freemium Model**: No App Registration required for basic usage

## 🏗️ Architecture

- **Platform**: Electron desktop application
- **Language**: TypeScript
- **Build Tool**: Webpack with Electron Forge
- **Authentication**: Microsoft MSAL for secure token management
- **LLM Integration**: Local models via Ollama/LM Studio + Cloud models (OpenAI, Anthropic, Google Gemini)
- **UI Framework**: React with Material-UI
- **MCP Protocol**: Model Context Protocol for extensible AI interactions

## 📁 Project Structure

```
src/
├── main/                 # Main process (Node.js environment)
├── renderer/             # Renderer process (Web environment)
├── shared/               # Shared utilities and types
├── mcp/                  # MCP server integration
├── auth/                 # Authentication logic
├── llm/                  # Local & Cloud LLM integration
├── types/                # TypeScript definitions
└── tests/                # Unit and integration tests
```

## 🛠️ Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- **Local LLM** (Optional: Ollama or LM Studio)
- **Cloud LLM API Keys** (Optional: OpenAI, Anthropic, or Google Gemini)
- **Microsoft Entra App Registration** (Optional: for advanced features)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/darrenjrobinson/EntraPulseLite.git
cd EntrapulseLite

# Install dependencies
npm install

# Start development mode
npm start
```

### Basic Setup

1. **Run the application** - No initial configuration required
2. **Sign in** with your Microsoft account
3. **Choose an LLM provider**:
   - **Local**: Install Ollama or LM Studio (see [Local LLM Setup](#local-llm-setup))
   - **Cloud**: Add API keys in Settings for OpenAI, Anthropic, or Google Gemini

### Local LLM Setup

For privacy-focused AI processing, install a local LLM:

#### Option 1: Ollama (Recommended)
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model
ollama pull llama3.1:8b
```

#### Option 2: LM Studio
1. Download from [lmstudio.ai](https://lmstudio.ai)
2. Install and download a compatible model
3. Start the local server

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for detailed setup instructions.

## 🎯 Key Capabilities

### Progressive Authentication
EntraPulse Lite implements smart permission management:
- Starts with minimal permissions (`User.Read`)
- Requests additional permissions only when needed
- Reduces admin consent requirements
- Provides clear context for permission requests

### Multi-Provider LLM Support
**Local Providers** (Privacy-focused):
- Ollama
- LM Studio

**Cloud Providers** (Advanced features):
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude)
- Google Gemini

### Natural Language Queries
Ask questions in plain English:
- "Show me all users in the Sales department"
- "List groups with external members"
- "What permissions does this application have?"

## 📚 Documentation

- [Installation & Setup](docs/INSTALLATION.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [Privacy Policy](docs/PRIVACY-POLICY.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Contributing](docs/CONTRIBUTING.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
```

## 🔧 Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for:
- Development setup
- Architecture details
- Contributing guidelines
- Testing procedures

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please see [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/darrenjrobinson/EntraPulseLite/issues)
- **Discussions**: [GitHub Discussions](https://github.com/darrenjrobinson/EntraPulseLite/discussions)
- **Documentation**: [Project Wiki](https://github.com/darrenjrobinson/EntraPulseLite/wiki)
