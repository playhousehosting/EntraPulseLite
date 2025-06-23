#!/usr/bin/env node

/**
 * Debug script to test Lokka AuthManager initialization in client-provided token mode
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to the Lokka main.ts file (assuming it's compiled to JS)
const lokkaPath = path.join('c:', 'Users', 'DarrenRobinson', 'OneDrive - Increment', 'GitHub', 'lokka', 'dist', 'main.js');

console.log('🔍 Testing Lokka AuthManager initialization with client-provided token mode...\n');

// Test with dummy token
const env = {
  ...process.env,
  USE_CLIENT_TOKEN: 'true',
  ACCESS_TOKEN: 'dummy-token-for-initialization-test',
  NODE_ENV: 'development'
};

console.log('Environment variables being passed:');
console.log('- USE_CLIENT_TOKEN:', env.USE_CLIENT_TOKEN);
console.log('- ACCESS_TOKEN:', env.ACCESS_TOKEN ? 'PROVIDED' : 'NOT PROVIDED');
console.log('- NODE_ENV:', env.NODE_ENV);
console.log('\n🚀 Starting Lokka process...\n');

const lokkaProcess = spawn('node', [lokkaPath], {
  env,
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdoutBuffer = '';
let stderrBuffer = '';

lokkaProcess.stdout.on('data', (data) => {
  const output = data.toString();
  stdoutBuffer += output;
  console.log('STDOUT:', output.trim());
});

lokkaProcess.stderr.on('data', (data) => {
  const output = data.toString();
  stderrBuffer += output;
  console.log('STDERR:', output.trim());
});

// Send MCP initialization after a delay
setTimeout(() => {
  console.log('\n📤 Sending MCP initialize...');
  
  const initMessage = {
    id: 1,
    jsonrpc: "2.0",
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "DebugScript", version: "1.0.0" }
    }
  };
  
  lokkaProcess.stdin.write(JSON.stringify(initMessage) + '\n');
}, 1000);

// Send get-auth-status after initialization
setTimeout(() => {
  console.log('\n📤 Sending get-auth-status...');
  
  const authStatusMessage = {
    id: 2,
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "get-auth-status",
      arguments: {}
    }
  };
  
  lokkaProcess.stdin.write(JSON.stringify(authStatusMessage) + '\n');
}, 2000);

// Send set-access-token test
setTimeout(() => {
  console.log('\n📤 Sending set-access-token test...');
  
  const setTokenMessage = {
    id: 3,
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: "set-access-token",
      arguments: {
        accessToken: "test-token-replacement"
      }
    }
  };
  
  lokkaProcess.stdin.write(JSON.stringify(setTokenMessage) + '\n');
}, 3000);

// Clean shutdown after tests
setTimeout(() => {
  console.log('\n🛑 Shutting down test...');
  lokkaProcess.kill('SIGTERM');
}, 5000);

lokkaProcess.on('exit', (code, signal) => {
  console.log(`\n✅ Lokka process exited with code ${code}, signal ${signal}`);
  console.log('\n📝 Full STDOUT:', stdoutBuffer);
  console.log('\n📝 Full STDERR:', stderrBuffer);
});

lokkaProcess.on('error', (error) => {
  console.error('\n❌ Failed to start Lokka process:', error);
});
