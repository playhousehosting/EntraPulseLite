// lokka-mcp-startup.test.ts
// Tests for the startup behavior of the External Lokka MCP Server

import { ExternalLokkaMCPServer } from '../../mcp/servers/lokka/ExternalLokkaMCPServer';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { spawn } from 'child_process';

// Mock dependencies
jest.mock('child_process', () => {
  const originalModule = jest.requireActual('child_process');
  
  return {
    ...originalModule,
    spawn: jest.fn()
  };
});

const mockedSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('External Lokka MCP Server Startup', () => {
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
    name: 'external-lokka-test',
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
  });
  
  test('should start server with NPX command by default', async () => {
    // Setup: Spawn succeeds and emits server ready message
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              // Simulate server ready with JSON-RPC output
              callback(Buffer.from('{"jsonrpc":"2.0","id":1,"result":{"capabilities":{}}}'));
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
        killed: false,
        stdin: {
          write: jest.fn()
        }
      } as any;
      
      return mockProcess;
    });
    
    // Create server and start it
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    await server.startServer();
    
    // Verify spawn was called with NPX command
    expect(mockedSpawn).toHaveBeenCalledWith(
      'npx',
      ['-y', '@merill/lokka'],
      expect.objectContaining({
        env: expect.objectContaining({
          TENANT_ID: 'mock-tenant-id',
          CLIENT_ID: 'mock-client-id',
          CLIENT_SECRET: 'mock-client-secret'
        }),
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      })
    );
    
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
  });
  
  test('should use custom command if provided in config', async () => {
    const customConfig = {
      ...mockConfig,
      command: 'lokka',
      args: ['--port', '3097']
    };
    
    // Setup: Spawn succeeds
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('{"jsonrpc":"2.0"}'));
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
        stdin: {
          write: jest.fn()
        }
      } as any;
      
      return mockProcess;
    });
    
    // Create server and start it
    server = new ExternalLokkaMCPServer(customConfig, mockAuthService);
    await server.startServer();
    
    // Verify spawn was called with custom command
    expect(mockedSpawn).toHaveBeenCalledWith(
      'lokka',
      ['--port', '3097'],
      expect.objectContaining({
        env: expect.objectContaining({
          TENANT_ID: 'mock-tenant-id'
        })
      })
    );
  });
  
  test('should use timeout when no server start message received', async () => {
    jest.useFakeTimers();
    
    // Setup: Spawn succeeds but doesn't emit recognizable ready message
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('Some non-JSON output'));
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
        stdin: {
          write: jest.fn()
        }
      } as any;
      
      return mockProcess;
    });
    
    // Create server and start it
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    const startPromise = server.startServer();
    
    // Fast forward the timeout
    jest.advanceTimersByTime(5000);
    
    await startPromise;
    
    // Verify spawn was called
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    
    jest.useRealTimers();
  });
  
  test('should handle server startup errors', async () => {
    // Setup: Spawn fails
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Failed to start process')), 0);
          }
        }),
        kill: jest.fn(),
        killed: false
      } as any;
      
      return mockProcess;
    });
    
    // Create server
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    
    // Start should reject
    await expect(server.startServer()).rejects.toThrow('Failed to start process');
    
    // Verify spawn was attempted
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
  });
});
