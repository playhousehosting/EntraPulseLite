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
      command: '@merill/lokka',
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
      '@merill/lokka',
      ['--port', '3097'],      expect.objectContaining({
        env: expect.objectContaining({
          TENANT_ID: 'mock-tenant-id'
        })
      })
    );
  });
  test('should detect server readiness from output patterns', async () => {
    // Setup: Spawn succeeds and emits output with jsonrpc pattern
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              // Simulate Lokka server output that indicates readiness
              setTimeout(() => {
                callback(Buffer.from('{"jsonrpc":"2.0","method":"notifications/initialized"}'));
              }, 100);
            }
          }),
          removeListener: jest.fn()
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
    
    // Should resolve quickly when readiness pattern is detected
    const startTime = Date.now();
    await expect(server.startServer()).resolves.toBeUndefined();
    const endTime = Date.now();
    
    // Should complete in less than 1 second (not wait for 5-second timeout)
    expect(endTime - startTime).toBeLessThan(1000);
    
    // Verify spawn was called
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
  });

  test('should fallback to timeout when no readiness pattern detected', async () => {
    // Setup: Spawn succeeds but doesn't emit readiness patterns
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              // Simulate output that doesn't indicate readiness
              setTimeout(() => {
                callback(Buffer.from('Starting up...'));
                callback(Buffer.from('Loading configuration...'));
              }, 100);
            }
          }),
          removeListener: jest.fn()
        },
        stderr: { on: jest.fn() },
        on: jest.fn(),
        kill: jest.fn(),
        killed: false,
        stdin: {
          write: jest.fn().mockImplementation((data) => {
            // Mock the tools list request response
            try {
              const request = JSON.parse(data.toString());
              if (request.method === 'tools/list') {
                const mockStdout = mockProcess.stdout;
                setTimeout(() => {
                  // Find the data callback and trigger response
                  const dataCallbacks = mockStdout.on.mock.calls
                    .filter(call => call[0] === 'data')
                    .map(call => call[1]);
                  
                  dataCallbacks.forEach(callback => {
                    callback(Buffer.from(JSON.stringify({
                      jsonrpc: '2.0',
                      id: request.id,
                      result: { tools: [{ name: 'microsoft_graph_query' }] }
                    }) + '\n'));
                  });
                }, 50);
              }
            } catch (e) {
              // Ignore JSON parsing errors for non-request data
            }
          })
        }
      } as any;
      
      return mockProcess;
    });

    // Create server and start it
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    
    // Should resolve after timeout (5+ seconds) but complete successfully
    const startTime = Date.now();
    await expect(server.startServer()).resolves.toBeUndefined();
    const endTime = Date.now();
    
    // Should take at least 5 seconds due to timeout fallback
    expect(endTime - startTime).toBeGreaterThan(4500);
    
    // Verify spawn was called
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
  }, 10000); // 10 second timeout for this test

  test('should handle server startup errors', async () => {
    // Setup: Spawn fails
    mockedSpawn.mockImplementationOnce(() => {
      const mockProcess = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // Immediately trigger error callback
            setImmediate(() => callback(new Error('Failed to start process')));
          }
        }),
        kill: jest.fn(),
        killed: false
      } as any;
      
      return mockProcess;
    });

    // Create server 
    server = new ExternalLokkaMCPServer(mockConfig, mockAuthService);
    
    // Expect server start to reject due to process error
    await expect(server.startServer()).rejects.toThrow('Failed to start process');
    
    // Verify spawn was called
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
  });
});
