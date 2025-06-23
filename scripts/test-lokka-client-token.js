// Test script to verify Lokka client token mode
// This mimics the working pattern from Lokka's own tests

const { spawn } = require('child_process');

async function testLokkaClientToken() {
  console.log('🧪 Testing Lokka MCP Server - Client Token Mode');
  console.log('=' + '='.repeat(50));

  const testToken = process.env.ACCESS_TOKEN;
  if (!testToken) {
    console.log('❌ No ACCESS_TOKEN environment variable provided');
    console.log('Please set ACCESS_TOKEN environment variable and run again');
    process.exit(1);
  }

  console.log('\n🔧 Starting Lokka with USE_CLIENT_TOKEN=true...');

  // Start Lokka process with environment variable
  const lokkaProcess = spawn('npx', ['@merill/lokka@latest'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      USE_CLIENT_TOKEN: 'true'
    }
  });

  let responseBuffer = '';
  let requestId = 1;

  // Handle stdout
  lokkaProcess.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split('\n');
    responseBuffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line.trim());
          console.log('📨 Received response:', response);
          
          // Handle specific responses
          if (response.id === 1) {
            handleInitializeResponse(response);
          } else if (response.id === 2) {
            handleSetTokenResponse(response);
          } else if (response.id === 3) {
            handleTestApiResponse(response);
          }
        } catch (error) {
          console.log('📋 Lokka output:', line.trim());
        }
      }
    }
  });

  // Handle stderr
  lokkaProcess.stderr.on('data', (data) => {
    console.log('🔍 Lokka stderr:', data.toString().trim());
  });

  // Handle process exit
  lokkaProcess.on('exit', (code) => {
    console.log(`\n🔚 Lokka process exited with code ${code}`);
  });

  // Wait for process to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 1: Initialize
  console.log('\n🔧 Step 1: Initializing MCP connection...');
  const initRequest = {
    id: requestId++,
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      clientInfo: { name: 'TestClient', version: '1.0.0' }
    }
  };
  
  lokkaProcess.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Send initialized notification
  console.log('🔧 Step 2: Sending initialized notification...');
  const initNotification = {
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  };
  
  lokkaProcess.stdin.write(JSON.stringify(initNotification) + '\n');

  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 3: Set access token
  console.log('🔧 Step 3: Setting access token...');
  const setTokenRequest = {
    id: requestId++,
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'set-access-token',
      arguments: {
        accessToken: testToken
      }
    }
  };
  
  lokkaProcess.stdin.write(JSON.stringify(setTokenRequest) + '\n');

  // Wait for token to be set
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 4: Test API call
  console.log('🔧 Step 4: Testing API call (/me)...');
  const testApiRequest = {
    id: requestId++,
    jsonrpc: '2.0',
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
  
  lokkaProcess.stdin.write(JSON.stringify(testApiRequest) + '\n');

  // Wait for test to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Clean up
  console.log('\n🧹 Cleaning up...');
  lokkaProcess.kill();
}

function handleInitializeResponse(response) {
  if (response.error) {
    console.log('❌ Initialize failed:', response.error);
  } else {
    console.log('✅ Initialize successful');
    console.log('   Server info:', response.result?.serverInfo);
  }
}

function handleSetTokenResponse(response) {
  if (response.error) {
    console.log('❌ Set token failed:', response.error);
  } else {
    console.log('✅ Set token successful');
    if (response.result?.isError) {
      console.log('   But tool returned error:', response.result.content?.[0]?.text);
    }
  }
}

function handleTestApiResponse(response) {
  if (response.error) {
    console.log('❌ API test failed:', response.error);
  } else {
    console.log('✅ API test response received');
    if (response.result?.isError) {
      console.log('   API error:', response.result.content?.[0]?.text);
    } else {
      console.log('   API success! User data received');
    }
  }
}

// Run the test
testLokkaClientToken().catch(console.error);
