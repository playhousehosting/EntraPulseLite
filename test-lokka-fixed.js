const { spawn } = require('child_process');
const path = require('path');

// Test script to validate the fixed Lokka MCP server
console.log('Testing Lokka MCP Server with Fixed Client Selection...');

// Create environment for Lokka authentication
const env = {
  ...process.env,
  ENTRA_CLIENT_ID: 'a0c73c16-a7e3-4564-9a95-2bdf47383716',
  ENTRA_AUTH_MODE: 'enhanced_graph_access'
};

// Test Microsoft Graph API query
const testQuery = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'microsoft_graph_query',
    arguments: {
      query: 'Get my user profile',
      api_path: '/me',
      method: 'GET'
    }
  }
};

console.log('Test Query:', JSON.stringify(testQuery, null, 2));
console.log('Environment Variables:');
console.log('  ENTRA_CLIENT_ID:', env.ENTRA_CLIENT_ID);
console.log('  ENTRA_AUTH_MODE:', env.ENTRA_AUTH_MODE);
console.log('');
console.log('Expected Outcome:');
console.log('- Lokka should initialize with ManagedLokkaMCPClient');
console.log('- Tool call should execute via sendRequest() method');
console.log('- Should return actual Microsoft Graph API data, not just query arguments');
console.log('- No "Lokka MCP server not initialized" error should occur');
console.log('');
console.log('Ready for manual testing in EntraPulseLite application...');
