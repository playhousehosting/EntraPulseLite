# Fix for Lokka MCP Query Result Display Issue

## Problem

The application was executing Microsoft Graph API queries through Lokka MCP successfully, but instead of displaying the actual data results (like user information), it was only showing the query structure that was sent to Lokka. 

From the logs, we could see:
1. Queries were being found and executed: `"Found query to execute"` and `"Executing Graph API query: GET /users"`
2. Lokka was responding with data: `"Lokka MCP result structure: { hasResult: true, hasContent: true, isObject: true }"`
3. But the final response only contained the query JSON instead of actual user data

## Root Cause

The issue was in the query result extraction logic in `UnifiedLLMService.ts`. The code wasn't properly parsing the response structure returned by Lokka MCP, which caused it to fall back to showing the original query instead of the actual Microsoft Graph API results.

## Solution

Enhanced the result extraction logic in `UnifiedLLMService.ts` to:

### 1. Added Better Debug Logging

```typescript
// Debug logging to understand the response structure
console.log('Raw Lokka MCP response:', JSON.stringify(rawResult, null, 2));
console.log('Lokka MCP response received, type:', typeof rawResult);
console.log('Lokka MCP response keys:', rawResult ? Object.keys(rawResult) : 'null');
```

This will help us see exactly what structure Lokka MCP is returning.

### 2. Enhanced Response Parsing Logic

```typescript
// Enhanced result extraction - handle various possible response structures
let extractedResult: any;

if (rawResult?.content && Array.isArray(rawResult.content)) {
  // If the result has a content array, look for json or text content
  const jsonContent = rawResult.content.find((item: any) => item.type === 'json');
  const textContent = rawResult.content.find((item: any) => item.type === 'text');

  if (jsonContent?.json) {
    // Found JSON content
    extractedResult = jsonContent.json;
    console.log('Using JSON content from response');
  } else if (textContent?.text) {
    // Try to parse text content as JSON if possible
    try {
      if (textContent.text.includes('Response from tool') || textContent.text.includes('microsoft_graph_query')) {
        console.log('Detected tool response message, extracting actual data...');
        // Look for JSON data in the tool response
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedResult = JSON.parse(jsonMatch[0]);
        } else {
          // Try to extract args if available
          const toolArgsMatch = textContent.text.match(/args (\{.*\})/);
          if (toolArgsMatch) {
            extractedResult = JSON.parse(toolArgsMatch[1]);
          } else {
            extractedResult = { message: textContent.text };
          }
        }
      } else {
        // Try to parse the entire text as JSON
        extractedResult = JSON.parse(textContent.text);
        console.log('Parsed text content as JSON');
      }
    } catch (parseError) {
      console.warn('Failed to parse text content as JSON:', parseError);
      extractedResult = { message: textContent.text };
    }
  } else {
    console.log('Using content array directly');
    extractedResult = rawResult.content;
  }
} else if (rawResult?.content && typeof rawResult.content === 'string') {
  // Handle case where content is a string (possible JSON)
  try {
    extractedResult = JSON.parse(rawResult.content);
    console.log('Parsed string content as JSON');
  } catch (parseError) {
    console.warn('Failed to parse string content as JSON:', parseError);
    extractedResult = { message: rawResult.content };
  }
} else if (rawResult && typeof rawResult === 'object') {
  console.log('Using raw result object directly');
  extractedResult = rawResult;
} else {
  console.warn('Unexpected response format from Lokka MCP');
  extractedResult = { message: "Query executed but returned unexpected format", rawResponse: rawResult };
}
```

### 3. Key Improvements

1. **Multiple Parsing Strategies**: The code now tries multiple approaches to extract the actual data:
   - JSON content from MCP response
   - Text content parsed as JSON
   - String content parsed as JSON
   - Raw object handling
   - Fallback with detailed error information

2. **Better Pattern Matching**: Enhanced regex pattern to find JSON data within tool responses:
   ```typescript
   const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
   ```

3. **Comprehensive Logging**: Added debug logging at each step to understand exactly what format Lokka MCP is returning.

4. **Error Resilience**: Added proper error handling with fallbacks so the system continues to work even if parsing fails.

## Expected Behavior After Fix

When you test the application now, you should see:

1. **In Console**: Detailed debug logs showing the actual response structure from Lokka MCP
2. **In UI**: The actual Microsoft Graph API results (e.g., guest user data) instead of just the query structure

For example, instead of seeing:
```json
{
  "apiType": "graph",
  "method": "get",
  "endpoint": "/users",
  "queryParams": {
    "$filter": "userType eq 'Guest'",
    "$count": true
  }
}
```

You should now see the actual user data:
```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users",
  "@odata.count": 5,
  "value": [
    {
      "id": "12345678-1234-1234-1234-123456789012",
      "displayName": "John Doe (Guest)",
      "userPrincipalName": "john.doe_example.com#EXT#@yourtenant.onmicrosoft.com",
      "mail": "john.doe@example.com",
      "createdDateTime": "2024-01-15T10:30:00Z",
      "externalUserState": "Accepted"
    }
    // ... more users
  ]
}
```

## Files Modified

- `src/llm/UnifiedLLMService.ts` - Enhanced query result extraction logic

## Testing

1. Run the application with `npm start`
2. Try asking: "How many guest accounts are in the tenant?"
3. Check the console for detailed debug logs about the Lokka MCP response
4. Verify that the UI shows actual user data instead of just the query structure

The enhanced logging will help us understand the exact response format from Lokka MCP and ensure the parsing logic correctly extracts the actual Microsoft Graph API results.
