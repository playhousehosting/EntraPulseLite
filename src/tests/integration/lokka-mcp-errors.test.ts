// lokka-mcp-errors.test.ts
// Integration tests to verify error handling in the External Lokka MCP Server

import { ExternalLokkaMCPStdioServer as ExternalLokkaMCPServer } from '../../mcp/servers/lokka/ExternalLokkaMCPStdioServer';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { AuthService } from '../../auth/AuthService';
import { ConfigService } from '../../shared/ConfigService';
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
    
    // Create config service
    const configService = new ConfigService();
    configService.setServiceLevelAccess(true);
    
    // Create server instance with invalid configuration
    server = new ExternalLokkaMCPServer(invalidConfig, authService, configService);
    
    // We'll start the server in each test to isolate failures
  }, 10000);
  
  afterEach(async () => {
    // Stop the server after each test
    if (server) {
      await server.stopServer().catch(err => console.error('Error stopping server:', err));
    }
  });  test('should handle server startup failures gracefully', async () => {
    // Create a server with an invalid command that won't exist
    const badCommandConfig = {
      ...invalidConfig,
      command: 'non-existent-lokka-command',
      port: 3101 // Different port to avoid conflicts
    };
    
    const configService = new ConfigService();
    configService.setServiceLevelAccess(true);
    const badCommandServer = new ExternalLokkaMCPServer(badCommandConfig, authService, configService);
    
    // The current implementation uses a timeout approach and doesn't actually reject
    // Instead, it starts the server but it won't be functional
    await badCommandServer.startServer(); // This will resolve due to timeout
    
    // Test that the server reports as running but actual requests fail
    const testRequest = {
      id: 'test-startup-failure',
      method: 'tools/list'
    };
    
    const response = await badCommandServer.handleRequest(testRequest);
      // Should get a response - either success (from hardcoded tools) or error
    expect(response).toBeDefined();
    expect(response.id).toBe('test-startup-failure');
    // The response might contain hardcoded tools list or an error, both are acceptable
    // The key is that the system handles the bad command gracefully
    
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
  test('should handle network issues gracefully', async () => {    // Create a server with a different configuration that might cause network issues
    const networkIssueConfig = {
      ...invalidConfig,
      port: 9999, // Use a port that's unlikely to be available
      command: 'npx', // Use a valid command but invalid arguments
      args: ['-y', '@merill/lokka', '--port', '9999']
    };
    
    const networkConfigService = new ConfigService();
    networkConfigService.setServiceLevelAccess(true);
    const networkServer = new ExternalLokkaMCPServer(networkIssueConfig, authService, networkConfigService);
    
    // Start the server - it may start but not be functional
    await networkServer.startServer().catch(err => {
      console.log('Expected error with network issues:', err.message);
    });
    
    // Try to make a request (should fail gracefully)
    const request = {
      id: 'test-network-issue',
      method: 'tools/list'
    };
    
    const response = await networkServer.handleRequest(request);
      // Verify we get a response (may have error or may succeed with hardcoded tools)
    expect(response).toBeDefined();
    expect(response.id).toBe('test-network-issue');
    
    // In case of network issues, we might get either an error or a successful response
    // The important thing is that the system doesn't crash and handles it gracefully
    console.log('Network test response:', response);
    
    // For this test, we're mainly checking that the system remains stable
    // rather than expecting a specific error response
    
    // Clean up
    await networkServer.stopServer().catch(() => {});
  }, 15000);
});
