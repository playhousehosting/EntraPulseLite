# Contributing to EntraPulse Lite

Thank you for your interest in contributing to EntraPulse Lite! This document provides guidelines for contributing to this freemium desktop application that enables natural language querying of Microsoft Graph APIs through local LLM integration.

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.0 or higher
- **npm** 8.0 or higher (or **yarn** 1.22+)
- **Git** for version control
- **Microsoft Work/School Account** for testing Microsoft Graph integration
- **Windows 10/11** (primary development platform)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/[your-username]/EntraPulseLite.git
   cd EntraPulseLite
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your development environment
   # Add your test API keys and endpoints
   ```

4. **Start Development**
   ```bash
   # Start in development mode
   npm run dev
   
   # In another terminal, start the app
   npm start
   ```

## 📁 Project Structure

```
src/
├── main/                 # Electron main process
│   ├── AuthService.ts    # Microsoft authentication
│   ├── ConfigService.ts  # Configuration management
│   └── main.ts          # Main entry point
├── renderer/             # Electron renderer process
│   ├── components/      # React components
│   ├── pages/          # Application pages
│   └── App.tsx         # Main React app
├── shared/              # Shared utilities
│   ├── types/          # TypeScript definitions
│   └── constants/      # Application constants
├── mcp/                 # MCP server integration
│   ├── LokkaServer.ts  # Microsoft Graph MCP
│   └── FetchServer.ts  # Web content MCP
├── auth/                # Authentication logic
├── llm/                 # LLM service integration
└── tests/               # Test suites
    ├── unit/           # Unit tests
    ├── integration/    # Integration tests
    └── e2e/           # End-to-end tests
```

## 🛠️ Development Guidelines

### Coding Standards

- **TypeScript**: Use TypeScript for all new code
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Code formatting is enforced
- **Error Handling**: Implement comprehensive error handling
- **Async/Await**: Use async/await for asynchronous operations

### Microsoft Graph Integration

- Use `@azure/msal-electron` for authentication
- Follow Microsoft Graph API best practices
- Handle token refresh automatically
- Implement proper scoping for permissions

### MCP Server Guidelines

- Each MCP server should be self-contained
- Implement proper error handling for MCP communication
- Use the MCP TypeScript SDK
- Document all available tools and their parameters

### Security Requirements

- Follow Electron security best practices
- No `nodeIntegration` in renderer by default
- Implement proper CSP (Content Security Policy)
- Secure IPC communication between processes
- Store sensitive data securely using `electron-store`

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Guidelines

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test service interactions
- **E2E Tests**: Test complete user workflows
- **Mock External APIs**: Use mocks for Microsoft Graph and LLM APIs
- **Test Coverage**: Aim for >80% coverage on new code

### Writing Tests

```typescript
// Example unit test
describe('AuthService', () => {
  it('should acquire token successfully', async () => {
    const authService = new AuthService(mockConfig);
    const token = await authService.getToken();
    expect(token).toBeDefined();
  });
});
```

## 🔧 Building and Packaging

### Development Build

```bash
# Build for development
npm run build:dev

# Build for production
npm run build
```

### Creating Releases

```bash
# Run security checks
npm run security:check

# Build and sign (Windows)
npm run build:signed

# Create release package
npm run release:local
```

## 📋 Pull Request Process

### Before Submitting

1. **Run Tests**: Ensure all tests pass
   ```bash
   npm test
   npm run security:check
   ```

2. **Code Quality**: Run linting and formatting
   ```bash
   npm run lint
   ```

3. **Build Check**: Verify the application builds successfully
   ```bash
   npm run build
   ```

### PR Guidelines

1. **Branch Naming**: Use descriptive branch names
   - `feature/add-new-llm-provider`
   - `fix/authentication-token-refresh`
   - `docs/update-installation-guide`

2. **Commit Messages**: Follow conventional commits
   ```
   feat: add support for Azure OpenAI integration
   fix: resolve authentication token expiration
   docs: update contributing guidelines
   ```

3. **PR Description**: Include
   - Clear description of changes
   - Issue number (if applicable)
   - Screenshots for UI changes
   - Testing performed

4. **Size**: Keep PRs focused and reasonably sized

## 🐛 Bug Reports

### Creating Issues

Use the bug report template and include:

- **Environment**: OS, Node.js version, app version
- **Steps to Reproduce**: Clear, step-by-step instructions
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Console Logs**: Any error messages

### Example Bug Report

```markdown
**Environment:**
- OS: Windows 11
- Node.js: 18.15.0
- EntraPulse Lite: 1.0.0-beta.1

**Description:**
Authentication fails when using client credentials flow...

**Steps to Reproduce:**
1. Configure application credentials in settings
2. Attempt to query Microsoft Graph
3. Observe authentication error

**Expected:** Successful authentication and query execution
**Actual:** Error message "Invalid client credentials"
```

## ✨ Feature Requests

### Proposing Features

1. **Check Existing Issues**: Search for similar requests
2. **Use Feature Template**: Follow the feature request template
3. **Provide Context**: Explain the use case and benefit
4. **Consider Implementation**: Suggest potential approaches

## 🏗️ Architecture Contributions

### Adding New LLM Providers

1. Implement the `LLMProvider` interface
2. Add configuration schema
3. Update the UI settings panel
4. Write comprehensive tests
5. Update documentation

### MCP Server Integration

1. Create server class extending base MCP functionality
2. Define available tools and their schemas
3. Implement error handling
4. Add integration tests
5. Update server registry

## 📚 Documentation

### Types of Documentation

- **Code Comments**: Inline documentation for complex logic
- **API Documentation**: JSDoc for public interfaces
- **User Guides**: Step-by-step usage instructions
- **Developer Docs**: Technical implementation details

### Documentation Standards

- Use clear, concise language
- Include code examples
- Keep documentation up-to-date
- Use proper Markdown formatting

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect different perspectives and experiences

### Getting Help

- **GitHub Discussions**: For questions and general discussion
- **Issues**: For bugs and feature requests
- **Discord/Slack**: (If community channels exist)

## 🎯 Contribution Areas

### High-Priority Areas

- **LLM Provider Support**: Adding new providers (Gemini, Claude, etc.)
- **Microsoft Graph Enhancements**: New query capabilities
- **UI/UX Improvements**: Better user experience
- **Performance Optimization**: Faster response times
- **Test Coverage**: Expanding test suites

### Good First Issues

Look for issues labeled:
- `good-first-issue`
- `documentation`
- `help-wanted`
- `ui-enhancement`

## 🔄 Release Process

### Version Management

- Follow semantic versioning (SemVer)
- Beta releases for testing new features
- Stable releases for production use

### Release Workflow

1. Feature development and testing
2. PR review and merge
3. Release candidate testing
4. Final release via GitHub Actions
5. Release notes and documentation updates

## 📞 Contact

- **Project Maintainer**: Darren Robinson ([@darrenjrobinson](https://github.com/darrenjrobinson))
- **Issues**: [GitHub Issues](https://github.com/darrenjrobinson/EntraPulseLite/issues)
- **Email**: darren@darrenjrobinson.com

---

Thank you for contributing to EntraPulse Lite! Your contributions help make Microsoft Graph more accessible through natural language interaction.
