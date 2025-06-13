// Unit tests for AuthService - Updated for current dual-mode authentication
import { AuthService } from '../../auth/AuthService';
import { AppConfig } from '../../types';
import { PublicClientApplication, ConfidentialClientApplication } from '@azure/msal-node';

// Mock MSAL - this should be handled by setup.ts but we ensure it here
jest.mock('@azure/msal-node');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPublicClient: any;
  let mockConfidentialClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockPublicClient = {
      acquireTokenInteractive: jest.fn(),
      acquireTokenSilent: jest.fn(),
      getTokenCache: jest.fn().mockReturnValue({
        getAllAccounts: jest.fn(),
        removeAccount: jest.fn()
      }),
      clearCache: jest.fn()
    };

    mockConfidentialClient = {
      acquireTokenByClientCredential: jest.fn(),
      getTokenCache: jest.fn().mockReturnValue({
        getAllAccounts: jest.fn(),
        removeAccount: jest.fn()
      }),
      clearCache: jest.fn()
    };

    // Mock constructors
    (PublicClientApplication as jest.Mock).mockImplementation(() => mockPublicClient);
    (ConfidentialClientApplication as jest.Mock).mockImplementation(() => mockConfidentialClient);
    
    // Set up instanceof checks to work properly
    Object.setPrototypeOf(mockPublicClient, PublicClientApplication.prototype);
    Object.setPrototypeOf(mockConfidentialClient, ConfidentialClientApplication.prototype);
  });

  describe('Initialization', () => {
    test('should initialize with interactive mode config', () => {
      const config: AppConfig = {
        auth: {
          clientId: 'test-client-id',
          tenantId: 'test-tenant-id',
          scopes: ['User.Read'],
          useClientCredentials: false
        },
        llm: {
          provider: 'ollama',
          model: 'llama2',
          baseUrl: 'http://localhost:11434',
          temperature: 0.2,
          maxTokens: 2048
        },
        mcpServers: [],
        features: {
          enablePremiumFeatures: false,
          enableTelemetry: false
        }
      };

      authService = new AuthService(config);
      
      expect(PublicClientApplication).toHaveBeenCalledWith({
        auth: {
          clientId: 'test-client-id',
          authority: 'https://login.microsoftonline.com/test-tenant-id'
        }
      });
    });

    test('should initialize with client credentials mode config', () => {
      const config: AppConfig = {
        auth: {
          clientId: 'test-client-id',
          tenantId: 'test-tenant-id',
          clientSecret: 'test-client-secret',
          scopes: ['https://graph.microsoft.com/.default'],
          useClientCredentials: true
        },
        llm: {
          provider: 'ollama',
          model: 'llama2',
          baseUrl: 'http://localhost:11434',
          temperature: 0.2,
          maxTokens: 2048
        },
        mcpServers: [],
        features: {
          enablePremiumFeatures: false,
          enableTelemetry: false
        }
      };

      authService = new AuthService(config);
      
      expect(ConfidentialClientApplication).toHaveBeenCalledWith({
        auth: {
          clientId: 'test-client-id',
          authority: 'https://login.microsoftonline.com/test-tenant-id',
          clientSecret: 'test-client-secret'
        }
      });
    });
  });
  describe('Client Credentials Flow', () => {
    beforeEach(() => {
      const config: AppConfig = {
        auth: {
          clientId: 'test-client-id',
          tenantId: 'test-tenant-id',
          clientSecret: 'test-client-secret',
          scopes: ['https://graph.microsoft.com/.default'],
          useClientCredentials: true
        },
        llm: {
          provider: 'ollama',
          model: 'llama2',
          baseUrl: 'http://localhost:11434',
          temperature: 0.2,
          maxTokens: 2048
        },
        mcpServers: [],
        features: {
          enablePremiumFeatures: false,
          enableTelemetry: false
        }
      };

      authService = new AuthService(config);
    });

    test('should acquire token using client credentials', async () => {
      const mockTokenResponse = {
        accessToken: 'test-access-token',
        expiresOn: new Date(Date.now() + 3600000)
      };

      mockConfidentialClient.acquireTokenByClientCredential.mockResolvedValue(mockTokenResponse);

      const result = await authService.getToken();

      expect(mockConfidentialClient.acquireTokenByClientCredential).toHaveBeenCalledWith({
        scopes: ['https://graph.microsoft.com/.default']
      });

      expect(result).toEqual({
        accessToken: 'test-access-token',
        expiresOn: expect.any(Date),
        idToken: '',
        scopes: ['https://graph.microsoft.com/.default']
      });
    });    test('should return authentication info for client credentials mode', () => {
      const authInfo = authService.getAuthenticationInfo();

      expect(authInfo).toEqual({
        mode: 'client-credentials',
        permissions: ['https://graph.microsoft.com/.default'],
        isAuthenticated: true,
        clientId: 'test-client-id',
        tenantId: 'test-tenant-id'
      });
    });
  });
});
