// mcpResponseParser.ts
// Utility for parsing MCP response data that may come in different formats
/**
 * Extracts JSON data from MCP response content, handling various formats:
 * 1. Direct json format (content.json)
 * 2. Text format that needs to be parsed as JSON
 * 3. Formatted text with embedded JSON (e.g., "Result for graph API - get /organization:\n\n{...}")
 */
export function extractJsonFromMCPResponse(response) {
    console.log('🔍 extractJsonFromMCPResponse called with:', JSON.stringify(response, null, 2));
    // Handle case where response directly contains content (not wrapped in result)
    let content;
    if (response.result?.content && Array.isArray(response.result.content)) {
        // Standard MCP response format: { id: ..., result: { content: [...] } }
        content = response.result.content[0];
        console.log('🔍 Using standard MCP format');
    }
    else if (response.content && Array.isArray(response.content)) {
        // Direct content format: { content: [...] }
        content = response.content[0];
        console.log('🔍 Using direct content format');
    }
    else {
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
        console.log('🔍 Extracted result:', JSON.stringify(result, null, 2));
        return result;
    }
    // Fallback: try to parse text if it exists
    if (content.text) {
        console.log('🔍 Fallback: parsing text');
        const result = extractJsonFromText(content.text);
        console.log('🔍 Fallback result:', JSON.stringify(result, null, 2));
        return result;
    }
    throw new Error(`Unsupported MCP response content format: ${JSON.stringify(content)}`);
}
/**
 * Extracts JSON from text that may be formatted with descriptive headers
 * Handles formats like:
 * - "Result for graph API - get /organization:\n\n{...json...}"
 * - Direct JSON strings
 * - Multiline formatted text with embedded JSON
 */
function extractJsonFromText(text) {
    console.log('🔍 extractJsonFromText called with text:', text.substring(0, 200) + '...');
    // Try parsing as direct JSON first
    try {
        const directResult = JSON.parse(text);
        console.log('🔍 Direct JSON parse successful');
        return directResult;
    }
    catch (directParseError) {
        console.log('🔍 Direct JSON parse failed, trying pattern extraction');
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
    console.log('🔍 Found potential JSON starting at index', jsonStartIndex, 'content:', potentialJson.substring(0, 100) + '...');
    // Try to parse from the first bracket to the end
    try {
        const parseResult = JSON.parse(potentialJson);
        console.log('🔍 Successfully parsed JSON from extracted text');
        return parseResult;
    }
    catch (error) {
        console.log('🔍 Failed to parse extracted text, trying complete JSON extraction');
        // If that fails, try to find a complete JSON object/array
        // by finding matching braces/brackets
        const extracted = extractCompleteJson(potentialJson);
        if (extracted) {
            try {
                const completeResult = JSON.parse(extracted);
                console.log('🔍 Successfully parsed complete JSON');
                return completeResult;
            }
            catch (parseError) {
                throw new Error(`Failed to parse extracted JSON: ${parseError.message}`);
            }
        }
        throw new Error(`Failed to parse JSON from text: ${error.message}`);
    }
}
/**
 * Attempts to extract a complete JSON object or array from text
 * by finding matching braces/brackets
 */
function extractCompleteJson(text) {
    if (!text.trim())
        return null;
    const firstChar = text.trim()[0];
    if (firstChar !== '{' && firstChar !== '[')
        return null;
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
            }
            else if (char === closeChar) {
                depth--;
                if (depth === 0) {
                    endIndex = i;
                    break;
                }
            }
        }
    }
    if (endIndex === -1)
        return null;
    return text.substring(0, endIndex + 1);
}
/**
 * Validates that an MCP response has the expected structure
 */
export function validateMCPResponse(response) {
    if (!response) {
        throw new Error('Response is undefined');
    }
    if (response.error) {
        throw new Error(`MCP response contains error: ${JSON.stringify(response.error)}`);
    }
    if (!response.result) {
        throw new Error('MCP response missing result');
    }
    if (!response.result.content || !Array.isArray(response.result.content)) {
        throw new Error('MCP response missing content array');
    }
    if (response.result.content.length === 0) {
        throw new Error('MCP response content array is empty');
    }
}
