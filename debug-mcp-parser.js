// Quick debug script to test the MCP parser

// Mock MCP response that mimics what Lokka returns
const mockLokkaMCPResponse = {
  id: 'test-1',
  result: {
    content: [
      {
        type: 'text',
        text: 'Result for graph API - get /organization:\n\n{"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#organization", "value": [{"id": "12345", "displayName": "Test Organization"}]}'
      }
    ]
  }
};

console.log('Testing MCP parser with mock Lokka response...');
console.log('Mock response:', JSON.stringify(mockLokkaMCPResponse, null, 2));

// Try to require the parser
const path = require('path');
const parserPath = path.join(__dirname, 'src', 'tests', 'utils', 'mcpResponseParser.ts');

console.log('Attempting to load parser from:', parserPath);

try {
  // Since it's TypeScript, let's try with ts-node
  const tsNode = require('ts-node');
  tsNode.register({
    compilerOptions: {
      module: 'commonjs'
    }
  });
  
  const parser = require('./src/tests/utils/mcpResponseParser.ts');
  console.log('Parser loaded successfully');
  console.log('Available functions:', Object.keys(parser));
  
  const result = parser.extractJsonFromMCPResponse(mockLokkaMCPResponse);
  console.log('Parsed result:', JSON.stringify(result, null, 2));
  
} catch (error) {
  console.error('Error loading or testing parser:', error.message);
  console.error('Stack:', error.stack);
}
