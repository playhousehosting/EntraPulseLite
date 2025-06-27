// Simple test to verify the parser is working
import { extractJsonFromMCPResponse } from './src/tests/utils/mcpResponseParser';

// Test data that matches the failing test format
const testResponse = {
  id: 'test-org',
  result: {
    content: [{
      type: 'text',
      text: 'Result for graph API - get /organization:\n\n{"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#organization", "value": [{"id": "YOUR_ORGANIZATION_ID", "displayName": "Example Organization"}]}'
    }]
  }
};

console.log('Testing extractJsonFromMCPResponse...');
console.log('Input:', JSON.stringify(testResponse, null, 2));

try {
  const result = extractJsonFromMCPResponse(testResponse);
  console.log('✅ SUCCESS: Extracted result:', JSON.stringify(result, null, 2));
  console.log('Result type:', typeof result);
  console.log('Has value property:', 'value' in result);
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('Full error:', error);
}
