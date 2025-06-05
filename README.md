# EntraPulseLite

A freemium desktop application that provides natural language querying of Microsoft Graph APIs through local LLM integration. EntraPulseLite is a lightweight derivative of the EntraPulse project, designed as an all-in-one desktop solution similar to Claude Desktop.

## 🚀 Features

- **Progressive Authentication**: Start with basic permissions, request more as needed
- **Microsoft Business Account Authentication**: Secure login with MSAL integration
- **Natural Language Querying**: Chat with your Microsoft Graph data using plain English
- **Local LLM Integration**: Works with Ollama and LM Studio for privacy-focused AI
- **Built-in MCP Servers**: 
  - Lokka MCP for Microsoft Graph API access
  - Fetch MCP for Microsoft Learn documentation and Permissions Explorer
- **Chat Interface**: Modern UI with trace visualization and permission management
- **Freemium Model**: No App Registration required for basic usage

## 🏗️ Architecture

- **Platform**: Electron desktop application
- **Language**: TypeScript
- **Build Tool**: Webpack with Electron Forge
- **Authentication**: Microsoft MSAL for secure token management
- **LLM Integration**: Local models via Ollama/LM Studio
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
├── llm/                  # Local LLM integration
├── types/                # TypeScript definitions
└── tests/                # Unit and integration tests
```

## 🛠️ Prerequisites

- **Node.js** 18 or higher
- **npm** or **yarn**
- **Local LLM** (Ollama or LM Studio)
- **Microsoft Entra App Registration** (for advanced features)

### Local LLM Setup

#### Option 1: Ollama
1. Install [Ollama](https://ollama.ai/)
2. Pull a model: `ollama pull llama2` or `ollama pull codellama`
3. Start Ollama service (usually runs on `http://localhost:11434`)

#### Option 2: LM Studio
1. Install [LM Studio](https://lmstudio.ai/)
2. Download a compatible model
3. Start the local server (usually runs on `http://localhost:1234`)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/darrenjrobinson/EntraPulseLite.git
   cd EntraPulseLite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment (optional)**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration if needed
   # For basic usage, no configuration is required!
   ```

4. **Start development**
   ```bash
   npm start
   ```

**Note**: For basic usage, no Microsoft Entra App Registration is required! The application uses progressive permissions starting with minimal access (`User.Read`) and requests additional permissions only when needed. You can upgrade to your own App Registration later for advanced features.

## ⚙️ Configuration

Copy `.env.example` to `.env.local` and configure:

### Microsoft Entra App Registration (Optional)
```env
# Leave empty for interactive user login with Microsoft Graph PowerShell client
MSAL_CLIENT_ID=your_client_id_here
MSAL_TENANT_ID=your_tenant_id_here
# Note: MSAL_CLIENT_SECRET is not needed for public client authentication
```

### Local LLM Configuration
```env
LLM_PROVIDER=ollama  # or lmstudio
OLLAMA_BASE_URL=http://localhost:11434
LMSTUDIO_BASE_URL=http://localhost:1234
```

### MCP Server Configuration
```env
MCP_LOKKA_PORT=3001
MCP_DOCS_PORT=3002
```

## 🧪 Testing

We maintain comprehensive test coverage with unit and integration tests to ensure reliability and functionality.

### Test Structure
```
src/tests/
├── unit/                 # Unit tests for individual components
├── integration/          # Integration tests for workflows
├── e2e/                  # End-to-end tests
├── mocks/                # Mock data and services
└── fixtures/             # Test fixtures and data
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Authentication flow, MCP server communication, LLM integration
- **E2E Tests**: Complete user journeys from login to querying
- **Mock Services**: Microsoft Graph API responses, LLM responses

## 🔧 Development

### Available Scripts

```bash
npm start          # Start development mode
npm run build      # Build for production
npm run package    # Package app for current platform
npm run make       # Create distributable packages
npm test           # Run test suite
npm run lint       # Run code linting
```

### Development Workflow

1. Start the development server: `npm start`
2. Make changes to source files
3. Hot reload will update the application
4. Run tests to validate changes: `npm test`
5. Build and test package: `npm run package`

## 🌐 MCP Servers

EntraPulseLite includes built-in MCP (Model Context Protocol) servers:

### Lokka MCP Server
- **Purpose**: Microsoft Graph API integration
- **Features**: 
  - User and group management
  - Directory queries
  - Application insights
  - Security and compliance data
- **Port**: 3001 (configurable)

### Fetch MCP Server
- **Purpose**: Documentation and web content retrieval
- **Features**:
  - Microsoft Learn documentation access
  - Permissions Explorer integration
  - Real-time web content fetching
  - Cached responses for performance
- **Port**: 3002 (configurable)

## 🔐 Security

- **Token Storage**: Secure token storage using Electron's secure storage
- **CSP**: Content Security Policy implementation
- **IPC Security**: Secure Inter-Process Communication
- **No Node Integration**: Renderer process runs in secure context
- **HTTPS Only**: All external communications use HTTPS

## 📦 Building and Distribution

### Development Build
```bash
npm run build
```

### Package for Current Platform
```bash
npm run package
```

### Create Distributables
```bash
npm run make
```

### Supported Platforms
- Windows (x64, arm64)
- macOS (x64, arm64)
- Linux (x64, arm64)

## 🎯 Freemium Model

### Free Features
- Progressive authentication (no App Registration required)
- Basic Microsoft Graph queries with minimal permissions
- Local LLM integration
- Standard MCP servers
- Community support

### Premium Features (requires App Registration)
- Advanced Graph API access with elevated permissions
- Custom MCP server integration
- Priority support
- Advanced analytics
- Enterprise features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow TypeScript best practices
- Maintain code coverage above 80%
- Update documentation as needed
- Follow commit message conventions

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [GitHub Wiki](https://github.com/darrenjrobinson/EntraPulseLite/wiki)
- **Issues**: [GitHub Issues](https://github.com/darrenjrobinson/EntraPulseLite/issues)
- **Discussions**: [GitHub Discussions](https://github.com/darrenjrobinson/EntraPulseLite/discussions)

## 🙏 Acknowledgments

- Based on the original [EntraPulse](https://github.com/darrenjrobinson/EntraPulse) project
- Inspired by Claude Desktop's user experience
- Built with Microsoft Graph API and MCP protocol standards

---

**EntraPulseLite** - Bringing natural language AI to Microsoft Graph APIs in a secure, local-first desktop application.
