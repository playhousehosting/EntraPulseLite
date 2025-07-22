const { spawn } = require('child_process');
const path = require('path');

// Test script to discover actual Lokka MCP tool names
console.log('🔍 Lokka MCP Tool Discovery Test');
console.log('=====================================');

// Environment variables for Lokka authentication
const env = {
  ...process.env,
  CLIENT_ID: '14d82eec-204b-4c2f-b7e8-296a70dab67e',
  TENANT_ID: 'common',
  USE_CLIENT_TOKEN: 'true',
  NODE_ENV: 'development',
  DEBUG_ENTRAPULSE: 'true'
};

console.log('Environment:', {
  CLIENT_ID: env.CLIENT_ID,
  TENANT_ID: env.TENANT_ID,
  USE_CLIENT_TOKEN: env.USE_CLIENT_TOKEN
});

// Start Lokka process
const lokka = spawn('npx', ['-y', '@merill/lokka'], {
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});

let responseData = '';

// Handle stdout (MCP protocol communication)
lokka.stdout.on('data', (data) => {
  const dataStr = data.toString();
  console.log('📡 Lokka stdout:', dataStr);
  responseData += dataStr;
  
  try {
    const lines = dataStr.trim().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const parsed = JSON.parse(line);
        console.log('📋 Parsed response:', JSON.stringify(parsed, null, 2));
      }
    }
  } catch (e) {
    // Not JSON, ignore
  }
});

// Handle stderr (debug info)
lokka.stderr.on('data', (data) => {
  console.log('🐛 Lokka stderr:', data.toString());
});

// Send initialization request
console.log('🚀 Sending initialization request...');
const initRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'EntraPulseLite',
      version: '1.0.0'
    }
  }
};

lokka.stdin.write(JSON.stringify(initRequest) + '\n');

// Wait 3 seconds, then send tools/list request
setTimeout(() => {
  console.log('🔍 Sending tools/list request...');
  const toolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  
  lokka.stdin.write(JSON.stringify(toolsRequest) + '\n');
}, 3000);

// Cleanup after 10 seconds
setTimeout(() => {
  console.log('🛑 Terminating Lokka process...');
  lokka.kill('SIGTERM');
  process.exit(0);
}, 10000);
