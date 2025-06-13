// lokka-mcp-errors.test.ts
// Integration tests to verify error handling in the External Lokka MCP Server

import { ExternalLokkaMCPServer } from '../../mcp/servers/lokka/ExternalLokkaMCPServer';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { AuthService } from '../../auth/AuthService';
import { extractJsonFromMCPResponse, validateMCPResponse } from '../utils/mcpResponseParser';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// Configure test with intentionally invalid credentials
const invalidConfig: any = {
  name: 'external-lokka-invalid',
  type: 'external-lokka',
  port: 3100, // Use a unique port for this test
  enabled: true,
  command: '@merill/lokka', // This should be installed globally for tests
  env: {
    TENANT_ID: 'invalid-tenant-id',
    CLIENT_ID: 'invalid-client-id',
    CLIENT_SECRET: 'invalid-client-secret'
  }
};

describe('Lokka MCP Server Error Handling', () => {
  let server: ExternalLokkaMCPServer;
  let authService: MCPAuthService;
    beforeAll(async () => {
    // Initialize auth service with invalid credentials
    const msalAuthService = new AuthService({
      app: { name: 'EntraPulseLite-Test' },
      auth: {
        clientId: 'invalid-client-id',
        tenantId: 'invalid-tenant-id',
        clientSecret: 'invalid-client-secret',
        useClientCredentials: true,
        scopes: ['https://graph.microsoft.com/.default']
      },
      llm: {
        provider: 'ollama',
        model: 'test-model',
        baseUrl: 'http://localhost:11434'
      },
      mcpServers: [],
      features: {
        enablePremiumFeatures: false,
        enableTelemetry: false
      }
    });
    
    authService = new MCPAuthService(msalAuthService);
    
    // Create server instance with invalid configuration
    server = new ExternalLokkaMCPServer(invalidConfig, authService);
    
    // We'll start the server in each test to isolate failures
  }, 10000);
  
  afterEach(async () => {
    // Stop the server after each test
    if (server) {
      await server.stopServer().catch(err => console.error('Error stopping server:', err));
    }
  });

  test('should handle server startup failures gracefully', async () => {
    // Modify the config to use a non-existent command
    const badCommandConfig = {
      ...invalidConfig,
      command: 'non-existent-lokka-command',
      port: 3101 // Different port to avoid conflicts
    };
    
    const badCommandServer = new ExternalLokkaMCPServer(badCommandConfig, authService);
    
    // The server should attempt to start but eventually fail without throwing
    await expect(badCommandServer.startServer()).rejects.toThrow();
    
    // Clean up
    await badCommandServer.stopServer().catch(() => {});
  }, 20000);

  test('should handle authentication failures gracefully', async () => {
    // Start the server with invalid credentials
    await server.startServer().catch(err => {
      // We expect an error, but the server should handle it gracefully
      console.log('Expected error during startup with invalid credentials:', err.message);
    });
    
    // Attempt a Graph API request that should fail with auth error
    const request = {
      id: 'test-auth-failure',
      method: 'tools/call',
      params: {
        name: 'microsoft_graph_query',
        arguments: {
          endpoint: '/me',
          method: 'GET'
        }
      }
    };
    
    // The request should be processed but return an auth error
    const response = await server.handleRequest(request);
    
    // Verify we get a proper error response
    expect(response).toBeDefined();
    expect(response.id).toBe('test-auth-failure');
    expect(response.error).toBeDefined();
    
    console.log('Auth failure response:', response.error);
  }, 15000);

  test('should handle invalid requests gracefully', async () => {
    // Start the server
    await server.startServer().catch(() => {});
    
    // Send an invalid request (missing required fields)
    const request = {
      id: 'test-invalid-request',
      method: 'tools/call',
      params: {
        name: 'microsoft_graph_query',
        arguments: {
          // Missing required endpoint parameter
          method: 'GET'
        }
      }
    };
    
    const response = await server.handleRequest(request);
    
    // Verify we get a proper error response
    expect(response).toBeDefined();
    expect(response.id).toBe('test-invalid-request');
    expect(response.error).toBeDefined();
  }, 15000);

  test('should handle network issues gracefully', async () => {
    // Start with a server configured to connect to a non-existent port
    const badPortConfig = {
      ...invalidConfig,
      port: 65535 // This port should be unusable
    };
    
    const badPortServer = new ExternalLokkaMCPServer(badPortConfig, authService);
    
    // Try to start the server (this should fail but not throw)
    await badPortServer.startServer().catch(err => {
      console.log('Expected error with bad port:', err.message);
    });
    
    // Try to make a request (should fail gracefully)
    const request = {
      id: 'test-network-issue',
      method: 'tools/list'
    };
    
    const response = await badPortServer.handleRequest(request);
    
    // Verify we get a proper error response
    expect(response).toBeDefined();
    expect(response.id).toBe('test-network-issue');
    expect(response.error).toBeDefined();
    
    // Clean up
    await badPortServer.stopServer().catch(() => {});
  }, 15000);
});
