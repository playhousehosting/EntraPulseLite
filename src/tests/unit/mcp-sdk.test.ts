// src/tests/unit/mcp-sdk.test.ts
// Tests for the MCP SDK implementation

import { MCPClient } from '../../mcp/clients/MCPSDKClient';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { GraphMCPClient } from '../../mcp/clients/GraphMCPClient';
import { MCPServerConfig } from '../../mcp/types';
import { AuthService } from '../../auth/AuthService';
import { FetchMCPServer } from '../../mcp/servers/fetch/FetchMCPServer';
import { MCPServerManager } from '../../mcp/servers/MCPServerManager';
import { MCPErrorHandler, ErrorCode } from '../../mcp/utils';
import { ConfigService } from '../../shared/ConfigService';

// Mock dependencies
jest.mock('../../auth/AuthService');
jest.mock('../../mcp/mock');
jest.mock('@microsoft/microsoft-graph-client');
jest.mock('axios');
jest.mock('../../shared/ConfigService');

describe('MCP SDK Implementation', () => {
  let mcpClient: MCPClient;
  let authService: AuthService;
  let mcpAuthService: MCPAuthService;
  let configService: ConfigService;
  let serverConfigs: MCPServerConfig[];
  
  beforeEach(() => {
    // Setup mocks
    (AuthService as jest.Mock).mockImplementation(() => ({
      getToken: jest.fn().mockResolvedValue({
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        expiresOn: new Date(Date.now() + 3600000)
      })
    }));

    (ConfigService as jest.Mock).mockImplementation(() => ({
      getAuthenticationContext: jest.fn().mockReturnValue({
        mode: 'user-token',
        userPrincipalName: 'test@example.com',
        tenantId: 'test-tenant'
      }),
      getEntraConfig: jest.fn().mockReturnValue({
        useApplicationCredentials: false,
        clientId: 'test-client-id',
        clientSecret: '',
        tenantId: 'test-tenant'
      })
    }));

    // Create instances
    authService = new AuthService();
    mcpAuthService = new MCPAuthService(authService);
    configService = new ConfigService();
    
    serverConfigs = [
      {
        name: 'docs',
        type: 'fetch',
        port: 8081,
        enabled: true
      },      {
        name: 'graph',
        type: 'external-lokka',
        port: 8080,
        enabled: true,
        command: 'npx',
        args: ['-y', '@merill/lokka'],
        authConfig: {
          type: 'msal',
          scopes: ['User.Read']
        }
      }
    ];
    
    mcpClient = new MCPClient(serverConfigs, mcpAuthService);
  });
    describe('MCPClient', () => {
    test('should initialize with server configs', () => {
      expect(mcpClient).toBeDefined();
      // Check that we get the two enabled servers
      const servers = mcpClient.getAvailableServers();
      expect(servers.length).toBe(2);
      expect(servers).toContain('docs');
      expect(servers).toContain('graph');
    });
    
    test('should get server config by name', () => {
      const config = mcpClient.getServerConfig('docs');
      expect(config).toBeDefined();
      expect(config?.type).toBe('fetch');
      expect(config?.port).toBe(8081);
    });
    
    test('should throw error for unknown server', async () => {
      await expect(mcpClient.callTool('unknown', 'test', {}))
        .rejects.toThrow('MCP server \'unknown\' not found or disabled');
    });
  });
    describe('MCPAuthService', () => {
    test('should get auth headers for lokka server', async () => {
      const headers = await mcpAuthService.getAuthHeaders('external-lokka');
      expect(headers).toHaveProperty('Authorization');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
      expect(headers.Authorization).toContain('Bearer mock-access-token');
    });
    
    test('should get auth headers for fetch server', async () => {
      const headers = await mcpAuthService.getAuthHeaders('fetch');
      expect(headers).toHaveProperty('User-Agent');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
    });
    
    test('should create a Graph auth provider', async () => {
      const provider = await mcpAuthService.getGraphAuthProvider();
      expect(provider).toBeDefined();
      expect(provider).toHaveProperty('getAccessToken');
      
      const token = await provider.getAccessToken();
      expect(token).toBe('mock-access-token');
    });
    
    test('should handle authentication errors gracefully', async () => {
      // Setup error condition
      jest.spyOn(authService, 'getToken').mockImplementationOnce(() => {
        throw new Error('Authentication failed');
      });
        // Test error handling
      await expect(mcpAuthService.getAuthHeaders('external-lokka'))
        .rejects.toThrow('Failed to get authentication headers for external-lokka server');
    });
  });
    describe('MCPServerManager', () => {
    let serverManager: MCPServerManager;
    
    beforeEach(() => {
      serverManager = new MCPServerManager(serverConfigs, mcpAuthService, configService);
    });
    
    test('should initialize enabled servers', () => {
      expect(serverManager).toBeDefined();
      expect(() => serverManager.getServerInstance('docs')).not.toThrow();
      expect(() => serverManager.getServerInstance('graph')).not.toThrow();
    });
    
    test('should throw error for unknown server', () => {
      expect(() => serverManager.getServerInstance('unknown'))
        .toThrow('MCP server \'unknown\' not found or not enabled');
    });
    
    test('should return enabled server configs', () => {
      const configs = serverManager.getEnabledServerConfigs();
      expect(configs.length).toBe(2);
      expect(configs[0].name).toBe('docs');
      expect(configs[1].name).toBe('graph');
    });
  });
});
