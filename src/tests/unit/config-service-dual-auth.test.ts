import { ConfigService } from '../../shared/ConfigService';
import { EntraConfig, LLMConfig } from '../../types';

// Mock electron-store with a simple in-memory implementation
jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(() => {
    const data: any = {};
    return {
      get: jest.fn((key: string, defaultValue?: any) => {
        return key in data ? data[key] : defaultValue;
      }),
      set: jest.fn((key: string, value: any) => {
        data[key] = value;
      }),
      delete: jest.fn((key: string) => {
        delete data[key];
      }),
      has: jest.fn((key: string) => key in data),
      clear: jest.fn(() => {
        Object.keys(data).forEach(key => delete data[key]);
      })
    };
  });
});

describe('ConfigService - Dual Authentication Support', () => {
  let configService: ConfigService;

  const mockUser = {
    id: 'test-user-123',
    email: 'test.user@company.com'
  };
  beforeEach(() => {
    configService = new ConfigService();
    configService.setServiceLevelAccess(true); // Enable service-level access for testing
    configService.setAuthenticationVerified(true); // Enable authentication for testing
  });

  describe('Authentication Preference Detection', () => {
    it('should return user-token as default preference', () => {
      const preference = configService.getAuthenticationPreference();
      expect(preference).toBe('user-token');
    });

    it('should detect application-credentials preference when properly configured', () => {
      const entraConfig: EntraConfig = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        tenantId: 'test-tenant-id',
        useApplicationCredentials: true
      };

      configService.saveEntraConfig(entraConfig);
      
      const preference = configService.getAuthenticationPreference();
      expect(preference).toBe('application-credentials');
    });

    it('should fallback to user-token when application credentials are incomplete', () => {
      const incompleteConfig: EntraConfig = {
        clientId: 'test-client-id',
        tenantId: 'test-tenant-id',
        // Missing clientSecret
        useApplicationCredentials: true
      };

      configService.saveEntraConfig(incompleteConfig);
      
      const preference = configService.getAuthenticationPreference();
      expect(preference).toBe('user-token');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing configuration gracefully', () => {
      expect(() => {
        configService.getAuthenticationPreference();
      }).not.toThrow();

      expect(() => {
        configService.updateAuthenticationContext();
      }).not.toThrow();
    });
  });
});
