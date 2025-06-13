// test-parser-debug.js
// Quick test of the MCP response parser logic

// Copy of the parser functions
function extractJsonFromText(text) {
  // Try parsing as direct JSON first
  try {
    return JSON.parse(text);
  } catch (directParseError) {
    // If direct parsing fails, try to extract JSON from formatted text
  }

  // Look for JSON patterns in the text
  // Common patterns from Lokka MCP responses:
  // "Result for graph API - get /endpoint:\n\n{...}"
  // "Query result:\n{...}"
  
  // Find the first occurrence of '{' or '[' which typically starts JSON
  const jsonStartMatch = text.match(/[{\[]/);
  if (!jsonStartMatch) {
    throw new Error(`No JSON data found in text: ${text.substring(0, 100)}...`);
  }

  const jsonStartIndex = jsonStartMatch.index;
  const potentialJson = text.substring(jsonStartIndex);

  // Try to parse from the first bracket to the end
  try {
    return JSON.parse(potentialJson);
  } catch (error) {
    // If that fails, try to find a complete JSON object/array
    // by finding matching braces/brackets
    const extracted = extractCompleteJson(potentialJson);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch (parseError) {
        throw new Error(`Failed to parse extracted JSON: ${parseError.message}`);
      }
    }
    
    throw new Error(`Failed to parse JSON from text: ${error.message}`);
  }
}

function extractCompleteJson(text) {
  if (!text.trim()) return null;

  const firstChar = text.trim()[0];
  if (firstChar !== '{' && firstChar !== '[') return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let endIndex = -1;
  
  const isObject = firstChar === '{';
  const openChar = isObject ? '{' : '[';
  const closeChar = isObject ? '}' : ']';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    
    if (char === '"' && !escaped) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }

  if (endIndex === -1) return null;
  
  return text.substring(0, endIndex + 1);
}

function extractJsonFromMCPResponse(response) {
  if (!response.result?.content || !Array.isArray(response.result.content)) {
    throw new Error('Invalid MCP response format: missing content array');
  }

  const content = response.result.content[0];
  if (!content) {
    throw new Error('Invalid MCP response format: empty content array');
  }

  // Handle direct json format
  if (content.type === 'json' && content.json !== undefined) {
    return content.json;
  }

  // Handle case where content has 'json' property but type is 'text'
  if (content.json !== undefined) {
    return content.json;
  }

  // Handle text format that may contain embedded JSON
  if (content.type === 'text' && content.text) {
    return extractJsonFromText(content.text);
  }

  // Fallback: try to parse text if it exists
  if (content.text) {
    return extractJsonFromText(content.text);
  }

  throw new Error(`Unsupported MCP response content format: ${JSON.stringify(content)}`);
}

// Test with actual failing response format
const testResponse = {
  id: 'test',
  result: {
    content: [{
      type: 'text', 
      text: 'Result for graph API - get /organization:\n\n{"@odata.context": "https://graph.microsoft.com/v1.0/$metadata#organization", "value": [{"id": "test", "displayName": "Test Org"}]}'
    }]
  }
};

console.log('Testing MCP Response Parser...');
console.log('Input response:', JSON.stringify(testResponse, null, 2));

try {
  const result = extractJsonFromMCPResponse(testResponse);
  console.log('✅ Extracted result:', JSON.stringify(result, null, 2));
  console.log('Result type:', typeof result);
  console.log('Has value property:', 'value' in result);
} catch (error) {
  console.error('❌ Parser error:', error.message);
  console.error('Full error:', error);
}
