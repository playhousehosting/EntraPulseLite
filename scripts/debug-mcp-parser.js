// Simple JavaScript version of the MCP Response Parser for debugging

function extractJsonFromText(text) {
  console.log('🔍 extractJsonFromText called with text length:', text.length);
  console.log('🔍 Text preview (first 200 chars):', text.substring(0, 200));
  
  // Remove any leading descriptive text and find the JSON part
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    const jsonStr = jsonMatch[0];
    console.log('🔍 Found JSON string, length:', jsonStr.length);
    
    try {
      const parsed = JSON.parse(jsonStr);
      console.log('🔍 Successfully parsed JSON');
      return parsed;
    } catch (error) {
      console.error('🔍 JSON parse error:', error.message);
      throw new Error(`Failed to parse JSON from text: ${error.message}`);
    }
  } else {
    console.error('🔍 No JSON found in text');
    throw new Error('No JSON content found in text');
  }
}

function extractJsonFromMCPResponse(response) {
  console.log('🔍 extractJsonFromMCPResponse called');
  console.log('🔍 Response keys:', Object.keys(response));
  console.log('🔍 Response type:', typeof response);
  
  // Handle case where response directly contains content (not wrapped in result)
  let content;
  if (response.result && response.result.content && Array.isArray(response.result.content)) {
    // Standard MCP response format: { id: ..., result: { content: [...] } }
    content = response.result.content[0];
    console.log('🔍 Using standard MCP format');
  } else if (response.content && Array.isArray(response.content)) {
    // Direct content format: { content: [...] }
    content = response.content[0];
    console.log('🔍 Using direct content format');
  } else {
    throw new Error('Invalid MCP response format: missing content array');
  }

  if (!content) {
    throw new Error('Invalid MCP response format: empty content array');
  }

  console.log('🔍 Processing content:', JSON.stringify(content, null, 2));

  // Handle direct json format
  if (content.type === 'json' && content.json !== undefined) {
    console.log('🔍 Using direct json format');
    return content.json;
  }

  // Handle case where content has 'json' property but type is 'text'
  if (content.json !== undefined) {
    console.log('🔍 Using json property from text content');
    return content.json;
  }

  // Handle text format that may contain embedded JSON
  if (content.type === 'text' && content.text) {
    console.log('🔍 Extracting JSON from text format');
    const result = extractJsonFromText(content.text);
    console.log('🔍 Extracted result type:', typeof result);
    return result;
  }

  // Fallback: try to parse text if it exists
  if (content.text) {
    console.log('🔍 Fallback: parsing text');
    const result = extractJsonFromText(content.text);
    console.log('🔍 Fallback result type:', typeof result);
    return result;
  }

  throw new Error(`Unsupported MCP response content format: ${JSON.stringify(content)}`);
}

// Test the parser
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
  console.log('📤 Output type:', typeof result);
  console.log('📤 Output preview:', JSON.stringify(result, null, 2).substring(0, 200));
  console.log('✅ Parser test completed successfully');
  
  // Test if the result has the expected structure
  if (result && result.value && Array.isArray(result.value)) {
    console.log('✅ Result has expected Graph API structure');
    console.log('📊 Organization count:', result.value.length);
  } else {
    console.log('❌ Result does not have expected Graph API structure');
    console.log('❌ Result keys:', Object.keys(result || {}));
  }
} catch (error) {
  console.error('❌ Parser test failed:', error.message);
  console.error('Stack:', error.stack);
}
