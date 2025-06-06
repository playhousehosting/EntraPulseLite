// external-lokka-mcp.test.ts
// Tests for the External Lokka MCP Server implementation

import { ExternalLokkaMCPServer } from '../../mcp/servers/lokka/ExternalLokkaMCPServer';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { ErrorCode } from '../../mcp/utils';
import { MCPRequest, MCPResponse } from '../../mcp/types';
import axios from 'axios';
import { spawn } from 'child_process';

// Mock dependencies
jest.mock('child_process', () => {
  const mockProcess = {
    stdout: {
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          // Simulate server started message
          callback('Server listening on port 3003');
        }
      })
    },
    stderr: { on: jest.fn() },
    on: jest.fn((event, callback) => {
      if (event === 'close') {
        callback(0);
      }
    }),
    kill: jest.fn(),
    killed: false
  };
  
  return {
    spawn: jest.fn().mockReturnValue(mockProcess)
  };
});

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock MCPAuthService
const mockAuthService = {
  getAuthHeaders: jest.fn().mockResolvedValue({ Authorization: 'Bearer mock-token' }),
  getGraphAuthProvider: jest.fn().mockResolvedValue({}),
  getToken: jest.fn().mockResolvedValue({
    accessToken: 'mock-token',
    idToken: 'mock-id-token',
    expiresOn: new Date(Date.now() + 3600 * 1000),
    scopes: ['https://graph.microsoft.com/.default']
  })
} as unknown as MCPAuthService;

describe('ExternalLokkaMCPServer', () => {
  let server: ExternalLokkaMCPServer;
  const mockConfig = {
    name: 'external-lokka',
    type: 'external-lokka',
    port: 3003,
    enabled: true,
    env: {
      TENANT_ID: 'mock-tenant-id',
      CLIENT_ID: 'mock-client-id',
      CLIENT_SECRET: 'mock-client-secret'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    
    // Setup default axios mock responses
    mockedAxios.post.mockResolvedValue({
      data: { 
        result: { message: 'Success' } 
      }
    });
    mockedAxios.get.mockResolvedValue({
      status: 200,
      data: { status: 'ok' }
    });
  });
  describe('Server lifecycle', () => {
    it('should start the server successfully', async () => {
      await expect(server.startServer()).resolves.not.toThrow();
      expect(mockedSpawn).toHaveBeenCalled();
    });

    it('should stop the server successfully', async () => {
      // First start the server
      await server.startServer();
      
      // Manually set the serverProcess property for testing
      // In the actual implementation, this would be set by startServer()
      (server as any).isServerRunning = true;
      (server as any).serverProcess = {
        kill: jest.fn()
      };
      
      // Then stop it
      await expect(server.stopServer()).resolves.not.toThrow();
      expect((server as any).serverProcess.kill).toHaveBeenCalled();
    });
  });

  describe('Request handling', () => {
    it('should handle tools/list request', async () => {
      const mockRequest: MCPRequest = {
        id: '123',
        method: 'tools/list'
      };

      const response = await server.handleRequest(mockRequest);
      
      expect(response).toHaveProperty('id', '123');
      expect(Array.isArray(response.result)).toBe(true);
      expect(response.result).toContainEqual(expect.objectContaining({
        name: 'microsoft_graph_query'
      }));
      expect(response.result).toContainEqual(expect.objectContaining({
        name: 'd94_Lokka-Microsoft'
      }));
    });

    it('should handle microsoft_graph_query tool call', async () => {
      const mockRequest: MCPRequest = {
        id: '123',
        method: 'tools/call',
        params: {
          name: 'microsoft_graph_query',
          arguments: {
            endpoint: '/me',
            method: 'GET'
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          result: {
            displayName: 'Test User',
            userPrincipalName: 'test@example.com'
          }
        }
      });

      const response = await server.handleRequest(mockRequest);
      
      expect(response).toHaveProperty('id', '123');
      expect(response.result).toHaveProperty('content');
      expect(response.result.content[0].type).toBe('json');
    });

    it('should handle d94_Lokka-Microsoft tool call', async () => {
      const mockRequest: MCPRequest = {
        id: '124',
        method: 'tools/call',
        params: {
          name: 'd94_Lokka-Microsoft',
          arguments: {
            apiType: 'graph',
            method: 'get',
            path: '/me'
          }
        }
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          result: {
            displayName: 'Test User',
            userPrincipalName: 'test@example.com'
          }
        }
      });

      const response = await server.handleRequest(mockRequest);
      
      expect(response).toHaveProperty('id', '124');
      expect(response.result).toHaveProperty('content');
    });

    it('should return error for invalid tool name', async () => {
      const mockRequest: MCPRequest = {
        id: '125',
        method: 'tools/call',
        params: {
          name: 'non_existent_tool'
        }
      };

      const response = await server.handleRequest(mockRequest);
      
      expect(response).toHaveProperty('id', '125');
      expect(response).toHaveProperty('error');
      expect(response.error?.code).toBe(ErrorCode.NOT_FOUND);
    });

    it('should return error for invalid method', async () => {
      const mockRequest: MCPRequest = {
        id: '126',
        method: 'invalid_method'
      };

      const response = await server.handleRequest(mockRequest);
      
      expect(response).toHaveProperty('id', '126');
      expect(response).toHaveProperty('error');
      expect(response.error?.code).toBe(ErrorCode.NOT_FOUND);
    });  });
  
  describe('Client credentials flow', () => {
    it('should use client credentials if provided', async () => {
      // Set up the config with client credentials
      const clientCredsConfig = {
        ...mockConfig,
        env: {
          TENANT_ID: 'tenant-id',
          CLIENT_ID: 'client-id',
          CLIENT_SECRET: 'client-secret'
        }
      };
      
      const clientCredsServer = new ExternalLokkaMCPServer(clientCredsConfig, mockAuthService);
      await clientCredsServer.startServer();
      
      // Check that the server was started with the correct env variables
      expect(mockedSpawn).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          env: expect.objectContaining({
            TENANT_ID: 'tenant-id',
            CLIENT_ID: 'client-id',
            CLIENT_SECRET: 'client-secret'
          })
        })
      );
    });
  });
});
