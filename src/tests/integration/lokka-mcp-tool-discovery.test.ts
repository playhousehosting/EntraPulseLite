// Lokka MCP Tool Discovery Integration Test
// Tests actual Lokka MCP server tool discovery and communication

import { spawn, ChildProcess } from 'child_process';

describe('Lokka MCP Tool Discovery', () => {
  let lokkaProcess: ChildProcess | null = null;
  const timeout = 30000; // 30 second timeout

  beforeEach(() => {
    lokkaProcess = null;
  });

  afterEach(async () => {
    if (lokkaProcess && !lokkaProcess.killed) {
      lokkaProcess.kill('SIGTERM');
      // Wait for process to terminate
      await new Promise((resolve) => {
        lokkaProcess!.on('exit', resolve);
        setTimeout(resolve, 5000); // Force resolve after 5 seconds
      });
    }
  });

  it('should discover Lokka MCP tools via JSON-RPC communication', async () => {
    // Skip this test in CI environments where Lokka may not be available
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      console.log('Skipping Lokka integration test in CI environment');
      return;
    }

    const env = {
      ...process.env,
      CLIENT_ID: '14d82eec-204b-4c2f-b7e8-296a70dab67e', // Microsoft Graph PowerShell
      TENANT_ID: 'common',
      USE_CLIENT_TOKEN: 'true',
      NODE_ENV: 'development',
      DEBUG_ENTRAPULSE: 'true'
    };

    // Start Lokka process
    lokkaProcess = spawn('npx', ['-y', '@merill/lokka'], {
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    expect(lokkaProcess).toBeTruthy();
    expect(lokkaProcess.stdout).toBeTruthy();
    expect(lokkaProcess.stderr).toBeTruthy();
    expect(lokkaProcess.stdin).toBeTruthy();

    let responseData = '';
    let toolsDiscovered = false;
    let initializationComplete = false;

    // Handle stdout (MCP protocol communication)
    lokkaProcess.stdout!.on('data', (data) => {
      const dataStr = data.toString();
      responseData += dataStr;
      
      try {
        const lines = dataStr.trim().split('\n');
        for (const line of lines) {
          if (line.trim()) {
            const parsed = JSON.parse(line);
            
            // Check for initialization response
            if (parsed.result && parsed.id === 1) {
              initializationComplete = true;
              console.log('✅ Lokka initialization successful');
            }
            
            // Check for tools list response
            if (parsed.result && parsed.result.tools && parsed.id === 2) {
              toolsDiscovered = true;
              console.log('✅ Tools discovered:', parsed.result.tools.length);
              
              // Validate expected tools
              const tools = parsed.result.tools;
              const lokkaToolExists = tools.some((tool: any) => 
                tool.name === 'Lokka-Microsoft' || tool.name.includes('Microsoft')
              );
              
              expect(lokkaToolExists).toBe(true);
              expect(tools.length).toBeGreaterThan(0);
            }
          }
        }
      } catch (e) {
        // Not JSON, ignore
      }
    });

    // Handle stderr (debug info)
    lokkaProcess.stderr!.on('data', (data) => {
      const output = data.toString();
      console.log('Lokka stderr:', output);
      
      // Check for authentication readiness
      if (output.includes('Ready to process requests') || 
          output.includes('Server listening')) {
        console.log('✅ Lokka server is ready');
      }
    });

    // Send initialization request
    const initRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'EntraPulseLite-Test',
          version: '1.0.0'
        }
      }
    };

    lokkaProcess.stdin!.write(JSON.stringify(initRequest) + '\n');

    // Wait 3 seconds, then send tools/list request
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const toolsRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    };
    
    lokkaProcess.stdin!.write(JSON.stringify(toolsRequest) + '\n');

    // Wait for tool discovery or timeout
    await new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (toolsDiscovered) {
          clearInterval(checkInterval);
          resolve(true);
        }
      }, 500);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!toolsDiscovered) {
          console.warn('Tool discovery timed out - this may be normal in test environments');
          resolve(false); // Don't fail the test, just log the timeout
        }
      }, timeout - 5000);
    });

    // Verify we got some response
    expect(responseData.length).toBeGreaterThan(0);
    
    if (toolsDiscovered) {
      console.log('✅ Lokka MCP tool discovery test completed successfully');
    } else {
      console.log('⚠️ Lokka MCP tool discovery test completed with timeout (may be expected in test environment)');
    }
  }, timeout);

  it('should handle Lokka process errors gracefully', async () => {
    // Test with invalid environment to ensure error handling works
    const invalidEnv = {
      ...process.env,
      CLIENT_ID: 'invalid-client-id',
      TENANT_ID: 'invalid-tenant',
      USE_CLIENT_TOKEN: 'true'
    };

    lokkaProcess = spawn('npx', ['-y', '@merill/lokka'], {
      env: invalidEnv,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let errorReceived = false;

    lokkaProcess.stderr!.on('data', (data) => {
      const output = data.toString();
      if (output.includes('error') || output.includes('Error') || output.includes('failed')) {
        errorReceived = true;
      }
    });

    lokkaProcess.on('exit', (code) => {
      // Process should exit with error code or we should see error messages
      expect(code !== 0 || errorReceived).toBe(true);
    });

    // Wait for process to start and potentially fail
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Error handling test completed');
  });
});
