// lokka-mcp-fallback.test.ts
// Tests for the fallback mechanisms in the External Lokka MCP Server

import { ExternalLokkaMCPServer } from '../../mcp/servers/lokka/ExternalLokkaMCPServer';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { spawn } from 'child_process';
import axios from 'axios';

// Mock dependencies
jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process');
  
  return {
    ...originalModule,
    spawn: jest.fn()
  };
});

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('External Lokka MCP Server Fallback Mechanisms', () => {
  let server: ExternalLokkaMCPServer;
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
  
  const mockConfig = {
    name: 'external-lokka-fallback',
    type: 'external-lokka',
    port: 3097,
    enabled: true,
    env: {
      TENANT_ID: 'mock-tenant-id',
      CLIENT_ID: 'mock-client-id',
      CLIENT_SECRET: 'mock-client-secret'
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocked response for health check
    mockedAxios.get.mockResolvedValue({
      data: { status: 'ok' }
    });
  });
  
  test('should fall back to NPX when local command fails', async () => {
    // Setup: First spawn call fails, second one succeeds
    
    // First call with direct command fails
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              // No server started message
            }
          })
        },
        stderr: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('Command not found: lokka'));
            }
          })
        },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Command not found'));
          }
          if (event === 'close') {
            callback(1); // Exit with error code
          }
        }),
        kill: jest.fn(),
        killed: false
      } as any;
      
      return mockProcess;
    });
    
    // Second call with npx succeeds
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('Server listening on port 3097'));
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        }),
        kill: jest.fn(),
        killed: false
      } as any;
      
      return mockProcess;
    });
    
    // Create server and start it
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    await server.startServer();
    
    // Verify first call was with direct command
    expect(mockedSpawn).toHaveBeenNthCalledWith(
      1,
      'lokka',
      [],
      expect.objectContaining({
        env: expect.objectContaining({
          TENANT_ID: 'mock-tenant-id'
        })
      })
    );
    
    // Verify second call was with npx
    expect(mockedSpawn).toHaveBeenNthCalledWith(
      2,
      'npx',
      ['-y', '@merill/lokka'],
      expect.objectContaining({
        env: expect.objectContaining({
          TENANT_ID: 'mock-tenant-id'
        })
      })
    );
  });
  
  test('should use health check when no server start message received', async () => {
    // Setup: Spawn succeeds but doesn't emit server ready message
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('Some output but no server ready message'));
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            // Don't call close, server keeps running
          }
        }),
        kill: jest.fn(),
        killed: false
      } as any;
      
      return mockProcess;
    });
    
    // Axios health check responds successfully
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: { status: 'ready' }
    });
    
    // Create server and start it
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    await server.startServer();
    
    // Verify spawn was called
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    
    // Verify health check was called
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `http://localhost:3097/`
    );
  });
  
  test('should handle server startup timeout', async () => {
    // Setup: Spawn never emits ready message and health check fails
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false
      } as any;
      
      return mockProcess;
    });
    
    // Health check fails
    mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'));
    
    // NPX fallback also fails
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false
      } as any;
      
      return mockProcess;
    });
    
    // Create server
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    
    // Start should reject after timeout
    await expect(server.startServer()).rejects.toThrow();
    
    // Verify both spawn methods were attempted
    expect(mockedSpawn).toHaveBeenCalledTimes(2);
    
    // Verify health check was attempted
    expect(mockedAxios.get).toHaveBeenCalledWith(
      `http://localhost:3097/`
    );
  });
});
