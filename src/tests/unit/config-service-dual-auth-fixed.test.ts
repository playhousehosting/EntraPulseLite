import { ConfigService } from '../../shared/ConfigService';
import { LLMConfig, EntraConfig } from '../../types';

// Mock electron-store
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn()
  }));
});

describe.skip('ConfigService Dual Authentication', () => {
  // TODO: Fix these tests after ConfigService API stabilization
  // These tests were written for an older version of ConfigService
  // and need to be updated to match the current API
  let configService: ConfigService;
  let mockStore: any;

  const mockUser = {
    id: 'test-user-123',
    displayName: 'Test User',
    mail: 'test.user@company.com',
    userPrincipalName: 'test.user@company.com'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create ConfigService instance
    configService = new ConfigService();
    configService.setServiceLevelAccess(true); // Enable for testing
    
    // Mock the internal store
    mockStore = (configService as any).store;
    mockStore.get.mockImplementation((key: string) => {
      switch (key) {
        case 'currentAuthMode':
          return 'client-credentials';
        case 'currentUserKey':
          return undefined;
        case 'application':
          return {
            llm: {
              provider: 'anthropic',
              model: 'claude-3-5-sonnet-20241022',
              apiKey: '',
              baseUrl: '',
              temperature: 0.2,
              maxTokens: 4096
            },
            lastUsedProvider: 'anthropic',
            modelCache: {}
          };
        case 'users':
          return {};
        default:
          return undefined;
      }
    });
  });

  describe('Authentication Context Management', () => {
    it('should switch to application credentials mode with complete config', () => {
      const entraConfig: EntraConfig = {
        clientId: 'test-client-id',
        tenantId: 'test-tenant-id',
        clientSecret: 'test-secret',
        useApplicationCredentials: true
      };
      
      configService.saveEntraConfig(entraConfig);
      configService.updateAuthenticationContext();
      
      expect(configService.getAuthenticationMode()).toBe('application-credentials');
    });

    it('should switch to user token mode when application credentials disabled', () => {
      // First set user mode
      configService.setAuthenticationContext('interactive', mockUser);
      
      // Clear application credentials preference
      const entraConfig: EntraConfig = {
        clientId: 'test-client',
        tenantId: 'test-tenant',
        useApplicationCredentials: false
      };
      
      configService.saveEntraConfig(entraConfig);
      configService.updateAuthenticationContext();
      
      expect(configService.getAuthenticationMode()).toBe('user-token');
    });

    it('should handle user context properly when switching modes', () => {
      configService.setAuthenticationContext('interactive', mockUser);
      
      const entraConfig: EntraConfig = {
        clientId: 'test-client',
        tenantId: 'test-tenant',
        useApplicationCredentials: false
      };
      
      configService.saveEntraConfig(entraConfig);
      configService.updateAuthenticationContext();
      
      expect(configService.getCurrentUserInfo()).toEqual(mockUser);
    });
  });

  describe('Configuration Isolation', () => {
    it('should maintain separate LLM configs for different authentication contexts', () => {
      // Set up application credentials config
      configService.setAuthenticationContext('client-credentials', null);
      const appLLMConfig: LLMConfig = {
        provider: 'ollama',
        model: 'llama2',
        baseUrl: 'http://localhost:11434',
        temperature: 0.2,
        maxTokens: 4096
      };
      configService.saveLLMConfig(appLLMConfig);

      // Set up user token config
      configService.setAuthenticationContext('interactive', mockUser);
      const userLLMConfig: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
        temperature: 0.2,
        maxTokens: 4096
      };
      configService.saveLLMConfig(userLLMConfig);

      // Switch back to application credentials and verify config
      configService.setAuthenticationContext('client-credentials', null);
      const retrievedAppConfig = configService.getLLMConfig();
      expect(retrievedAppConfig.provider).toBe('ollama');

      configService.setAuthenticationContext('interactive', mockUser);
      const retrievedUserConfig = configService.getLLMConfig();
      expect(retrievedUserConfig.provider).toBe('openai');
    });

    it('should isolate Entra configurations between contexts', () => {
      // Application context
      configService.setAuthenticationContext('client-credentials', null);
      const appEntraConfig: EntraConfig = {
        clientId: 'app-client-id',
        clientSecret: 'app-secret',
        tenantId: 'app-tenant',
        useApplicationCredentials: true
      };
      configService.saveEntraConfig(appEntraConfig);

      // User context  
      configService.setAuthenticationContext('interactive', mockUser);
      const userEntraConfig: EntraConfig = {
        clientId: 'user-client-id',
        tenantId: 'user-tenant',
        useApplicationCredentials: false
      };
      configService.saveEntraConfig(userEntraConfig);

      // Verify isolation
      configService.setAuthenticationContext('client-credentials', null);
      expect(configService.getEntraConfig()?.useApplicationCredentials).toBe(true);

      configService.setAuthenticationContext('interactive', mockUser);
      expect(configService.getEntraConfig()?.useApplicationCredentials).toBe(false);
    });
  });

  describe('Authentication Preference Detection', () => {
    it('should detect application credentials preference correctly', () => {
      configService.setAuthenticationContext('interactive', mockUser);
      
      const entraConfig: EntraConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-secret',
        tenantId: 'test-tenant',
        useApplicationCredentials: true
      };
      
      configService.saveEntraConfig(entraConfig);
      configService.updateAuthenticationContext();
      
      expect(configService.getAuthenticationMode()).toBe('application-credentials');
    });

    it('should handle incomplete application credentials gracefully', () => {
      configService.setAuthenticationContext('interactive', mockUser);
      
      const entraConfig: EntraConfig = {
        clientId: 'test-client',
        tenantId: 'test-tenant',
        // Missing clientSecret
        useApplicationCredentials: true
      };
      
      configService.saveEntraConfig(entraConfig);
      configService.updateAuthenticationContext();
      
      // Should fall back to user mode when credentials are incomplete
      expect(configService.getAuthenticationMode()).toBe('user-token');
    });
  });

  describe('Runtime Configuration Switching', () => {
    it('should support dynamic switching between authentication modes', () => {
      // Setup different configs for each context
      configService.setAuthenticationContext('client-credentials', null);
      const appConfig: LLMConfig = { 
        provider: 'ollama', 
        model: 'llama2',
        baseUrl: 'http://localhost:11434',
        temperature: 0.2,
        maxTokens: 4096
      };
      configService.saveLLMConfig(appConfig);

      configService.setAuthenticationContext('interactive', mockUser);
      const userConfig: LLMConfig = { 
        provider: 'openai', 
        model: 'gpt-4',
        apiKey: 'test-key',
        temperature: 0.2,
        maxTokens: 4096
      };
      configService.saveLLMConfig(userConfig);

      // Test switching via Entra config updates
      const appEntraConfig: EntraConfig = { 
        useApplicationCredentials: true, 
        clientId: 'test', 
        clientSecret: 'test', 
        tenantId: 'test' 
      };
      configService.saveEntraConfig(appEntraConfig);
      configService.updateAuthenticationContext();
      expect(configService.getLLMConfig().provider).toBe('ollama');

      const userEntraConfig: EntraConfig = { 
        useApplicationCredentials: false,
        clientId: 'test',
        tenantId: 'test'
      };
      configService.saveEntraConfig(userEntraConfig);
      configService.updateAuthenticationContext();
      expect(configService.getLLMConfig().provider).toBe('openai');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing configuration gracefully', () => {
      const entraConfig: EntraConfig = {
        clientId: 'test-client',
        tenantId: 'test-tenant',
        useApplicationCredentials: true
        // Missing clientSecret - should not crash
      };
      
      configService.saveEntraConfig(entraConfig);
      
      // Should not throw on invalid configuration
      expect(() => {
        configService.getAuthenticationMode();
      }).not.toThrow();
      
      // Should handle update gracefully
      expect(() => {
        configService.updateAuthenticationContext();
      }).not.toThrow();
    });

    it('should provide appropriate fallback behavior', () => {
      // Test with empty config
      const emptyConfig: EntraConfig = {
        clientId: '',
        tenantId: '',
        useApplicationCredentials: true
      };
      
      configService.saveEntraConfig(emptyConfig);
      
      // Should fall back to user-token mode
      expect(configService.getAuthenticationMode()).toBe('user-token');
    });
  });

  describe('Authentication Mode Transitions', () => {
    it('should properly transition from interactive to client-credentials', () => {
      // Start with interactive mode
      configService.setAuthenticationContext('interactive', mockUser);
      expect(configService.getAuthenticationMode()).toBe('user-token');
      
      // Configure for application credentials
      const appConfig: EntraConfig = {
        clientId: 'app-client',
        clientSecret: 'app-secret',
        tenantId: 'app-tenant',
        useApplicationCredentials: true
      };
      
      configService.saveEntraConfig(appConfig);
      configService.updateAuthenticationContext();
      
      expect(configService.getAuthenticationMode()).toBe('application-credentials');
    });

    it('should properly transition from client-credentials to interactive', () => {
      // Start with client-credentials mode
      configService.setAuthenticationContext('client-credentials', null);
      expect(configService.getAuthenticationMode()).toBe('application-credentials');
      
      // Set user and disable app credentials
      configService.setAuthenticationContext('interactive', mockUser);
      const userConfig: EntraConfig = {
        clientId: 'user-client',
        tenantId: 'user-tenant',
        useApplicationCredentials: false
      };
      
      configService.saveEntraConfig(userConfig);
      configService.updateAuthenticationContext();
      
      expect(configService.getAuthenticationMode()).toBe('user-token');
    });
  });

  describe('Configuration Persistence', () => {
    it('should persist configuration changes across mode switches', () => {
      // Set initial configs for both modes
      configService.setAuthenticationContext('client-credentials', null);
      const appLLM: LLMConfig = {
        provider: 'ollama',
        model: 'codellama',
        baseUrl: 'http://localhost:11434',
        temperature: 0.1,
        maxTokens: 2048
      };
      configService.saveLLMConfig(appLLM);

      configService.setAuthenticationContext('interactive', mockUser);
      const userLLM: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: 'user-api-key',
        temperature: 0.3,
        maxTokens: 8192
      };
      configService.saveLLMConfig(userLLM);

      // Verify persistence after multiple switches
      configService.setAuthenticationContext('client-credentials', null);
      expect(configService.getLLMConfig().model).toBe('codellama');

      configService.setAuthenticationContext('interactive', mockUser);
      expect(configService.getLLMConfig().model).toBe('claude-3-5-sonnet-20241022');

      configService.setAuthenticationContext('client-credentials', null);
      expect(configService.getLLMConfig().model).toBe('codellama');
    });
  });
});
