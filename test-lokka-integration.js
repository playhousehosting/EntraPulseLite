const { spawn } = require('child_process');

// Test script to verify Lokka MCP integration
async function testLokkaIntegration() {
  console.log('Testing Lokka MCP integration...');
  
  // Start Lokka MCP server
  const lokkaProcess = spawn('npx', ['-y', '@merill/lokka'], {
    env: {
      ...process.env,
      TENANT_ID: process.env.LOKKA_TENANT_ID || 'test-tenant',
      CLIENT_ID: process.env.LOKKA_CLIENT_ID || 'test-client',
      CLIENT_SECRET: process.env.LOKKA_CLIENT_SECRET || 'test-secret'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let serverReady = false;
  
  // Listen for output
  lokkaProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Lokka] ${output}`);
    
    if (output.includes('"jsonrpc"') || output.includes('capabilities') || output.includes('tools')) {
      if (!serverReady) {
        serverReady = true;
        testToolsList();
      }
    }
  });
  
  lokkaProcess.stderr.on('data', (data) => {
    console.error(`[Lokka Error] ${data.toString()}`);
  });
  
  lokkaProcess.on('error', (error) => {
    console.error('Failed to start Lokka:', error);
  });
  
  // Test tools list after server is ready
  async function testToolsList() {
    try {
      console.log('\nTesting tools/list request...');
      
      const toolsRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/list'
      };
      
      // Send the request
      lokkaProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
      
      // Wait for response
      setTimeout(() => {
        console.log('\nTesting Lokka-Microsoft tool...');
        testLokkaQuery();
      }, 2000);
      
    } catch (error) {
      console.error('Error testing tools list:', error);
    }
  }
  
  // Test Lokka-Microsoft tool
  async function testLokkaQuery() {
    try {
      const queryRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'Lokka-Microsoft',
          arguments: {
            apiType: 'graph',
            method: 'get',
            path: '/me'
          }
        }
      };
      
      // Send the request
      lokkaProcess.stdin.write(JSON.stringify(queryRequest) + '\n');
      
      // Clean up after test
      setTimeout(() => {
        console.log('\nTest completed. Stopping Lokka server...');
        lokkaProcess.kill();
      }, 5000);
      
    } catch (error) {
      console.error('Error testing Lokka query:', error);
    }
  }
  
  // Set timeout for overall test
  setTimeout(() => {
    if (!serverReady) {
      console.log('Timeout waiting for Lokka server to start');
      lokkaProcess.kill();
    }
  }, 10000);
}

// Run the test
testLokkaIntegration();
