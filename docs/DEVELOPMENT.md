# Development Guide

## 🎯 Development Overview

EntraPulse Lite is built with modern TypeScript, Electron, and React technologies. This guide covers the development workflow, architecture, and best practices.

## 🏗️ Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│  Main Process (Node.js)    │    Renderer Process (Web)      │
│  - Window Management       │    - React UI Components       │
│  - IPC Handlers           │    - Material-UI               │
│  - Authentication         │    - Chat Interface             │
│  - LLM Services           │    - Settings Management       │
│  - MCP Servers            │    - User Profile               │
│  - Status Monitoring      │    - Real-time LLM Status       │
├─────────────────────────────────────────────────────────────┤
│                        Shared Services                      │
│  - Types & Interfaces     │    - Utilities                 │
│  - Configuration          │    - Constants                 │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Authentication Layer
- **AuthService**: MSAL-based Microsoft authentication
- **Progressive Permissions**: Request permissions as needed
- **Token Management**: Secure token storage and refresh

#### 2. LLM Integration Layer
- **UnifiedLLMService**: Provider-agnostic interface
- **Local Providers**: Ollama, LM Studio
- **Cloud Providers**: OpenAI, Anthropic, Google Gemini
- **StandardizedPrompts**: Consistent prompts across providers
- **Status Monitoring**: Real-time availability tracking for local LLMs

#### 3. MCP Integration Layer
- **MCPClient**: Protocol communication
- **LokkaMCPServer**: Microsoft Graph API access
- **FetchMCPServer**: Documentation and permissions
- **MCPAuthService**: Authentication for MCP servers

#### 4. UI Layer
- **React Components**: Modern functional components with hooks
- **Material-UI**: Consistent design system
- **Chat Interface**: Real-time messaging with LLMs
- **Settings Management**: Multi-provider configuration

## 🛠️ Development Setup

### Prerequisites
```bash
# Node.js 18+
node --version

# TypeScript
npm install -g typescript

# Development tools
npm install -g @electron/packager
```

### Development Commands
```bash
# Start development with hot reload
npm start

# Build only (without starting)
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Package for distribution
npm run package
```

## 📁 Project Structure Deep Dive

```
src/
├── main/                      # Main Electron process
│   ├── main.ts               # Application entry point
│   ├── ipc-handlers.ts       # IPC message handlers
│   └── window-manager.ts     # Window creation/management
│
├── renderer/                  # Renderer process (UI)
│   ├── components/           # React components
│   │   ├── chat/            # Chat interface components
│   │   ├── auth/            # Authentication components
│   │   ├── settings/        # Settings dialog components
│   │   └── common/          # Reusable UI components
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts       # Authentication hook
│   │   ├── useConfig.ts     # Configuration hook
│   │   └── useLLMStatusPolling.ts # LLM status polling hook
│   ├── context/             # React contexts
│   │   ├── AuthContext.tsx  # Authentication context
│   │   └── LLMStatusContext.tsx # LLM status context
│   ├── styles/              # CSS and styling
│   └── App.tsx              # Main React application
│
├── shared/                    # Shared utilities
│   ├── config/              # Configuration management
│   ├── utils/               # Utility functions
│   └── constants/           # Application constants
│
├── auth/                      # Authentication services
│   ├── AuthService.ts       # MSAL authentication
│   └── auth-diagnostics.ts  # Authentication debugging
│
├── llm/                       # LLM integration
│   ├── UnifiedLLMService.ts # Provider-agnostic service
│   ├── LLMService.ts        # Local LLM service
│   ├── CloudLLMService.ts   # Cloud LLM service
│   └── StandardizedPrompts.ts # Consistent prompts
│
├── mcp/                       # MCP server integration
│   ├── MCPClient.ts         # MCP protocol client
│   ├── MCPServerManager.ts  # Server lifecycle management
│   ├── servers/             # MCP server implementations
│   │   ├── LokkaMCPServer.ts
│   │   └── FetchMCPServer.ts
│   └── auth/                # MCP authentication
│
├── types/                     # TypeScript definitions
│   ├── index.ts             # Main type exports
│   ├── electron.d.ts        # Electron-specific types
│   └── assets.d.ts          # Asset type declarations
│
└── tests/                     # Test suites
    ├── unit/                # Unit tests
    ├── integration/         # Integration tests
    ├── e2e/                 # End-to-end tests
    ├── mocks/               # Test mocks
    └── utils/               # Test utilities
```

## 🔧 Key Development Workflows

### Adding a New LLM Provider

1. **Update Types**:
```typescript
// src/types/index.ts
export interface LLMConfig {
  provider: 'ollama' | 'lm-studio' | 'openai' | 'anthropic' | 'gemini' | 'your-provider';
  // ...
}
```

2. **Implement Provider Logic**:
```typescript
// src/llm/CloudLLMService.ts
private async chatWithYourProvider(messages: any[], config: any): Promise<string> {
  // Implement your provider's API integration
}
```

3. **Add UI Configuration**:
```typescript
// src/renderer/components/settings/CloudProviderCard.tsx
// Add configuration card for your provider
```

4. **Add Tests**:
```typescript
// src/tests/unit/your-provider.test.ts
describe('YourProvider Integration', () => {
  // Add comprehensive tests
});
```

### Adding a New MCP Server

1. **Create Server Implementation**:
```typescript
// src/mcp/servers/YourMCPServer.ts
export class YourMCPServer implements MCPServer {
  async initialize(): Promise<void> {
    // Initialize your server
  }
  
  async handleToolCall(toolName: string, args: any): Promise<any> {
    // Handle tool calls
  }
}
```

2. **Register with Manager**:
```typescript
// src/mcp/MCPServerManager.ts
// Add your server to the manager
```

3. **Add Authentication (if needed)**:
```typescript
// src/mcp/auth/MCPAuthService.ts
// Add authentication logic for your server
```

### Using LLM Status Monitoring

The LLM Status monitoring system provides real-time tracking of LLM availability, particularly for local LLMs that may be started or stopped after application launch.

1. **Access LLM Status in Components**:
```typescript
// src/renderer/components/YourComponent.tsx
import { useLLMStatus } from '../context/LLMStatusContext';

const YourComponent = () => {
  const { 
    localLLMAvailable, 
    anyLLMAvailable, 
    lastChecked, 
    forceCheck 
  } = useLLMStatus();

  // Use status data in your component
  return (
    <div>
      {localLLMAvailable ? 'Local LLM Online' : 'Local LLM Offline'}
      <button onClick={forceCheck}>Refresh Status</button>
    </div>
  );
};
```

2. **Working with IPC Handlers**:
```typescript
// src/main/main.ts (or ipc-handlers.ts)
ipcMain.handle('llm:isLocalAvailable', async () => {
  // Logic to check LLM availability
  return isLocalLLMAvailable;
});
```

3. **Customizing Polling Interval**:
```typescript
// src/renderer/App.tsx
<LLMStatusProvider pollingInterval={10000}> {/* 10 seconds */}
  <YourApp />
</LLMStatusProvider>
```

For more details, see [docs/LOCAL-LLM-STATUS-MONITORING.md](../docs/LOCAL-LLM-STATUS-MONITORING.md).

### Adding New UI Components

1. **Create Component**:
```typescript
// src/renderer/components/your-feature/YourComponent.tsx
import React from 'react';
import { Typography, Card } from '@mui/material';

export const YourComponent: React.FC = () => {
  return (
    <Card>
      <Typography variant="h6">Your Feature</Typography>
    </Card>
  );
};
```

2. **Add to Main App**:
```typescript
// src/renderer/App.tsx
import { YourComponent } from './components/your-feature/YourComponent';
```

3. **Add Tests**:
```typescript
// src/tests/unit/YourComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Your Feature')).toBeInTheDocument();
  });
});
```

## 🧪 Testing Strategy

### Test Types and Coverage

1. **Unit Tests** (`src/tests/unit/`)
   - Individual component testing
   - Service logic testing
   - Pure function testing
   - **Target Coverage**: >90%

2. **Integration Tests** (`src/tests/integration/`)
   - Service integration testing
   - API integration testing
   - Authentication flow testing
   - **Target Coverage**: >80%

3. **End-to-End Tests** (`src/tests/e2e/`)
   - Complete user workflows
   - Cross-platform testing
   - **Target Coverage**: Critical paths

### Running Tests

```bash
# All tests
npm test

# Watch mode during development
npm run test:watch

# Specific test files
npm test -- auth
npm test -- llm
npm test -- mcp

# Coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

### Test Utilities

```typescript
// src/tests/utils/test-helpers.ts
export const createMockAuthService = () => ({
  login: jest.fn(),
  getToken: jest.fn(),
  getCurrentUser: jest.fn(),
});

export const createMockLLMService = () => ({
  chat: jest.fn(),
  isAvailable: jest.fn(),
});
```

## 🔍 Debugging and Diagnostics

### Development Tools

1. **Chrome DevTools**: Built into Electron
   ```bash
   # Start with DevTools open
   npm start -- --debug
   ```

2. **VS Code Debugging**: 
   ```json
   // .vscode/launch.json
   {
     "type": "node",
     "request": "launch",
     "name": "Electron Main",
     "program": "${workspaceFolder}/dist/main/main.js"
   }
   ```

3. **Network Debugging**:
   ```typescript
   // Enable network logging
   process.env.DEBUG = 'mcp:*,llm:*,auth:*'
   ```

### Diagnostic Tools

```typescript
// Built-in diagnostic endpoints
window.electronAPI.debug.checkMCPServerHealth()
window.electronAPI.debug.debugMCP()
window.electronAPI.auth.getAuthenticationInfo()
```

## 📦 Build and Distribution

### Development Builds
```bash
# Quick development build
npm run build:dev

# Production build with optimization
npm run build:prod
```

### Distribution Packages
```bash
# Package for current platform
npm run package

# Package for all platforms
npm run package:all

# Create installers
npm run dist
```

### Code Signing (Production)
```bash
# Set environment variables
export CSC_LINK="path/to/certificate.p12"
export CSC_KEY_PASSWORD="certificate-password"

# Build signed packages
npm run dist
```

## 🚀 Performance Optimization

### Bundle Analysis
```bash
# Analyze webpack bundles
npm run analyze

# Check bundle sizes
npm run bundle-size
```

### Electron Optimization
- Use preload scripts for secure IPC
- Minimize main process complexity
- Implement proper memory management
- Use web workers for heavy computations

### React Optimization
- Implement React.memo for expensive components
- Use useMemo and useCallback appropriately
- Implement virtual scrolling for large lists
- Optimize re-renders with proper state management

## 🔒 Security Best Practices

### Electron Security
- Disable Node.js integration in renderer
- Use preload scripts for secure API exposure
- Implement Content Security Policy (CSP)
- Validate all IPC communications

### Authentication Security
- Secure token storage with encryption
- Implement token refresh logic
- Use HTTPS for all API communications
- Validate authentication state consistently

### API Security
- Sanitize all user inputs
- Implement rate limiting
- Use secure HTTP headers
- Validate API responses

## 📋 Code Standards

### TypeScript Guidelines
- Use strict TypeScript configuration
- Implement proper type definitions
- Avoid `any` types
- Use interfaces over type aliases when possible

### React Guidelines
- Use functional components with hooks
- Implement proper error boundaries
- Use React.memo for performance optimization
- Follow the hooks rules consistently

### Testing Guidelines
- Write tests before implementing features (TDD)
- Use descriptive test names
- Mock external dependencies
- Test both success and error cases

## 🤝 Contributing Workflow

1. **Fork the Repository**
2. **Create Feature Branch**: `git checkout -b feature/your-feature`
3. **Make Changes**: Follow coding standards
4. **Add Tests**: Ensure comprehensive coverage
5. **Run Tests**: `npm test`
6. **Lint Code**: `npm run lint:fix`
7. **Commit Changes**: Use conventional commit messages
8. **Push Branch**: `git push origin feature/your-feature`
9. **Create Pull Request**: Include detailed description

### Commit Message Format
```
type(scope): subject

body

footer
```

Examples:
- `feat(auth): add Google OAuth integration`
- `fix(llm): resolve Anthropic API timeout issue`
- `docs(readme): update installation instructions`
- `test(mcp): add integration tests for Lokka server`

## 📚 Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Material-UI Documentation](https://mui.com)
- [Jest Testing Framework](https://jestjs.io)
- [MCP Protocol Specification](https://modelcontextprotocol.io)

## 📋 Items for Consideration

The following items represent potential enhancements and features that could be implemented in future iterations of EntraPulse Lite. These are organized by category to help with prioritization and planning.

### 🚀 Enhanced Onboarding Experience
- **Welcome First-Run Screen**: Interactive introduction for new users
- **Quick-Start Guide**: Step-by-step walkthrough of key features
- **Example Queries Library**: Pre-populated queries to demonstrate capabilities
- **Interactive Demo Mode**: Guided tour of the application with sample data

### 💰 Freemium Feature Implementation
- **Query Limits Counter**: Visual indicator of remaining free queries
- **Premium Feature Indicators**: Clear marking of premium vs. free features
- **Contextual Upgrade Prompts**: Smart prompts when users approach limits
- **Subscription Management UI**: Interface for managing premium subscriptions

### 🛠️ Error Recovery & Resilience
- **Connection Retry Logic**: Automatic retry with exponential backoff
- **Offline Mode Indicators**: Clear status indicators when working offline
- **Authentication Recovery Flow**: Guided recovery for authentication failures
- **Diagnostic Self-Test**: Built-in system to identify and resolve common issues

### ⚡ Performance Optimizations
- **Query Response Caching**: Local storage of common query results
- **Faster Application Load**: Optimized startup sequence
- **Background Model Download**: Asynchronous downloading of LLM models
- **Lazy-Loading Components**: Load UI components only when needed

### 🔄 Synchronization Enhancements
- **Background Sync**: Keep local data updated in the background
- **Selective Sync Settings**: Control what data is synchronized
- **Cross-Device Settings Sync**: Maintain consistent settings across installations
- **Conflict Resolution**: Smart handling of conflicting changes

## 📜 Documentation

### Key Documents
- [Installation Guide](INSTALLATION.md)
- [Architecture Overview](ARCHITECTURE.md)
- [Configuration Guide](CONFIGURATION.md)
- [Privacy Policy](PRIVACY-POLICY.md)
- [Troubleshooting](TROUBLESHOOTING.md)

### Development Documentation

## 🚨 Critical Issues Fixed - Quick Reference

This project has undergone several critical fixes for authentication, UI state synchronization, and security issues. Use this index to quickly find the relevant documentation:

### Authentication & UI State Issues
| Issue | Document | Description |
|-------|----------|-------------|
| **UI doesn't update after auth** | `CRITICAL-UI-STATE-FIX.md` | Missing IPC security configuration preventing event handling |
| **Infinite loop during login** | `EMERGENCY-FIX-INFINITE-LOOP.md` | Event cascade causing UI freeze and excessive logging |
| **Infinite loop (complete fix)** | `INFINITE-LOOP-FIX-COMPLETE.md` | Final solution with event notification control |
| **UI state synchronization** | `UI-STATE-SYNCHRONIZATION-FIX.md` | Comprehensive data flow fix between components |

### Security Issues
| Issue | Document | Description |
|-------|----------|-------------|
| **Config exposed before auth** | `TROUBLESHOOTING.md` | Prevented sensitive data exposure during startup |
| **Additional security issues** | `SECURITY-FIX-UPDATE.md` | Extended fixes for ConfigService and polling security |

### Testing & Validation
| Purpose | Script | Description |
|---------|--------|-------------|
| **Configuration persistence** | `scripts/test-azure-openai-persistence.js` | Tests Azure OpenAI URL persistence |
| **Basic persistence logic** | `scripts/test-simple-persistence.js` | Tests configuration serialization logic |

### Quick Recovery Commands

If you encounter issues during development:

```typescript
// Clear authentication and reload
await window.electronAPI.auth.logout();
await window.electronAPI.config.getLLMConfig();

// Force LLM status check
await window.electronAPI.llm.isLocalAvailable();

// Reset all configuration
await window.electronAPI.config.clearCache();
location.reload();
```

See `TROUBLESHOOTING.md` for comprehensive issue resolution guide.
