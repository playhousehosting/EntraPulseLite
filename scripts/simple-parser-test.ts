// simple-parser-test.ts
import { extractJsonFromMCPResponse, validateMCPResponse } from './src/tests/utils/mcpResponseParser';

const testResponse = {
  id: 'test',
  result: {
    content: [{
      type: 'text', 
      text: 'Result for graph API - get /organization:\n\n{"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#organization", "value": [{"id": "test", "displayName": "Test Org"}]}'
    }]
  }
};

console.log('Testing parser...');
try {
  const result = extractJsonFromMCPResponse(testResponse);
  console.log('Success:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error:', (error as Error).message);
}
