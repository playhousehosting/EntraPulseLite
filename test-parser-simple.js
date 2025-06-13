// Test the parser directly with the failing test data
const { extractJsonFromMCPResponse } = require('./src/tests/utils/mcpResponseParser.ts');

// Test with the exact format from the failing test
const testResponse = {
  content: [{
    type: 'text',
    text: 'Result for graph API - get /organization:\n\n{\n  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#organization",\n  "value": [\n    {\n      "id": "b0d6d46e-1567-4953-8649-eaa749619080",\n      "displayName": "Star Banking Corp"\n    }\n  ]\n}'
  }]
};

console.log('Testing parser with failing test data...');
try {
  const result = extractJsonFromMCPResponse(testResponse);
  console.log('SUCCESS: Parser extracted data:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('ERROR: Parser failed:', error.message);
}
