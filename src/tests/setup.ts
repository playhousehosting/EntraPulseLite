// Test setup file for Jest
import 'jest';

// Mock MSAL dependencies before any other imports
jest.mock('@azure/msal-node', () => {
  const mockMsalInstance = {
    acquireTokenInteractive: jest.fn(),
    acquireTokenSilent: jest.fn(),
    acquireTokenByClientCredential: jest.fn(),
    getTokenCache: jest.fn().mockReturnValue({
      getAllAccounts: jest.fn(),
      removeAccount: jest.fn()
    }),
    clearCache: jest.fn()
  };

  return {
    PublicClientApplication: jest.fn().mockImplementation(() => mockMsalInstance),
    ConfidentialClientApplication: jest.fn().mockImplementation(() => mockMsalInstance),
    LogLevel: {
      Error: 0,
      Warning: 1,
      Info: 2,
      Verbose: 3,
    },
  };
});

// Mock Microsoft Graph Client
jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: jest.fn().mockReturnValue({
      api: jest.fn().mockReturnValue({
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      }),
    }),
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123'),
}));

// Mock Electron APIs for testing
const mockElectronAPI = {
  auth: {
    login: jest.fn(),
    logout: jest.fn(),
    getToken: jest.fn(),
    getCurrentUser: jest.fn(),
  },
  graph: {
    query: jest.fn(),
  },
  llm: {
    chat: jest.fn(),
    isAvailable: jest.fn(),
  },
  mcp: {
    call: jest.fn(),
    listServers: jest.fn(),
  },
  config: {
    get: jest.fn(),
    update: jest.fn(),
  },
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Mock window.electronAPI - handle existing window object
if (typeof window !== 'undefined') {
  // In jsdom environment, window already exists
  (window as any).electronAPI = mockElectronAPI;
} else {
  // In node environment, create global window
  Object.defineProperty(global, 'window', {
    value: {
      electronAPI: mockElectronAPI,
    },
    writable: true,
  });
}

// Mock environment variables for tests
process.env.MSAL_CLIENT_ID = 'test-client-id';
process.env.MSAL_TENANT_ID = 'test-tenant-id';
process.env.MSAL_CLIENT_SECRET = 'test-client-secret';

// Mock console methods in tests
global.console = {
  ...console,
  // Silence console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Node.js setImmediate for Jest compatibility
if (typeof global.setImmediate === 'undefined') {
  (global as any).setImmediate = jest.fn((callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(callback, 0, ...args);
  });
}

// Setup global test utilities
global.beforeEach(() => {
  jest.clearAllMocks();
});
