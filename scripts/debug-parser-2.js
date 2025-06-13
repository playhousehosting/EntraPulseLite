// Debug script to test the MCP response parser
const { extractJsonFromMCPResponse } = require('./src/tests/utils/mcpResponseParser.ts');

const testResponse = {
  content: [{
    type: 'text',
    text: 'Result for graph API - get /organization:\n\n{"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#organization", "value": [{"id": "test-org-id", "displayName": "Test Organization"}]}'
  }]
};

console.log('🧪 Testing MCP Response Parser...');
console.log('📥 Input:', JSON.stringify(testResponse, null, 2));

try {
  const result = extractJsonFromMCPResponse(testResponse);
  console.log('📤 Output:', JSON.stringify(result, null, 2));
  console.log('✅ Parser test completed');
} catch (error) {
  console.error('❌ Parser test failed:', error.message);
  console.error('Stack:', error.stack);
}
