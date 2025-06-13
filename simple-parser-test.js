// simple-parser-test.js
// Simple test to verify the MCP response parser

const { extractJsonFromMCPResponse } = require('./src/tests/utils/mcpResponseParser.ts');

console.log('Testing parser with actual failing response...');

const testResponse = {
  id: 'test',
  result: {
    content: [{
      type: 'text',
      text: 'Result for graph API - get /organization:\n\n{"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#organization", "value": [{"id": "test", "displayName": "Test Org"}]}'
    }]
  }
};

try {
  console.log('Input:', JSON.stringify(testResponse, null, 2));
  const result = extractJsonFromMCPResponse(testResponse);
  console.log('✅ SUCCESS! Extracted result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('❌ FAILED! Error:', error.message);
  console.error('Stack:', error.stack);
}
