// Test the MCP response parser with Lokka format
import { extractJsonFromMCPResponse, validateMCPResponse } from '../src/tests/utils/mcpResponseParser';

// Test data that matches the actual Lokka response format
const testResponse = {
  id: 'test',
  result: {
    content: [{
      type: 'text',
      text: 'Result for graph API - get /organization:\n\n{\n  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#organization",\n  "value": [\n    {\n      "id": "b0d6d46e-1567-4953-8649-eaa749619080",\n      "displayName": "Star Banking Corp"\n    }\n  ]\n}'
    }]
  }
};

try {
  validateMCPResponse(testResponse);
  const data = extractJsonFromMCPResponse(testResponse);
  console.log('Extracted data:', JSON.stringify(data, null, 2));
  console.log('Success! Parser works correctly.');
} catch (error) {
  console.error('Parser failed:', error);
}
