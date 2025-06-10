# Fix for External Lokka MCP Server Integration

## Problem Identified

The application was successfully starting the external Lokka MCP server and getting authentication working, but it was calling the wrong server name and tool name, which caused it to receive only the query arguments instead of actual Microsoft Graph API results.

From the startup logs, we could see:
- External Lokka MCP server was starting correctly: `"Starting Lokka MCP server with command: npx -y @merill/lokka"`
- Authentication was configured properly: `"TENANT_ID: '...', CLIENT_ID: '...', HAS_CLIENT_SECRET: true"`
- The server exposed a tool called `"Lokka-Microsoft"`: `"Available Lokka tools: [ 'Lokka-Microsoft' ]"`

However, the application was calling:
- Server name: `'lokka'` (should be `'external-lokka'`)
- Tool name: `'microsoft_graph_query'` (should be `'Lokka-Microsoft'`)
- Parameter: `'endpoint'` (should be `'path'`)

## Root Cause

The `UnifiedLLMService.ts` was hardcoded to call the built-in Lokka server (`'lokka'`) with the tool name `'microsoft_graph_query'`, but the external Lokka MCP server uses different naming:
- Server name: `'external-lokka'`
- Tool name: `'Lokka-Microsoft'`
- Parameter name: `'path'` instead of `'endpoint'`

## Solution Implemented

### 1. Updated Server and Tool Detection Logic

```typescript
// Execute query via Lokka MCP
console.log(`Executing Graph API query: ${method.toUpperCase()} ${query.endpoint}`);

// Try external-lokka first (if available), then fall back to lokka
let serverName = 'external-lokka';
let toolName = 'Lokka-Microsoft';

// Check if external-lokka server is available
const availableServers = this.mcpClient!.getAvailableServers();
console.log('Available MCP servers:', availableServers);

if (!availableServers.includes('external-lokka')) {
  console.log('External-lokka not available, trying lokka server');
  serverName = 'lokka';
  toolName = 'microsoft_graph_query';
}

console.log(`Using MCP server: ${serverName}, tool: ${toolName}`);

const rawResult = await this.mcpClient!.callTool(serverName, toolName, {
  apiType: 'graph',
  method: method,
  path: query.endpoint, // Note: external Lokka uses 'path' instead of 'endpoint'
  queryParams: query.params || query.queryParams
});
```

### 2. Enhanced Error Detection for Lokka MCP Issues

```typescript
if (textContent.text.includes('Response from tool microsoft_graph_query with args')) {
  console.log('Detected Lokka MCP debug response - no actual data returned');
  // This means Lokka MCP only returned the query args, not the actual results
  extractedResult = {
    error: "Lokka MCP Error",
    message: "Lokka MCP server returned query arguments instead of actual Microsoft Graph API results. This suggests an authentication or configuration issue.",
    lokkResponse: textContent.text,
    troubleshooting: {
      possibleCauses: [
        "Lokka MCP server authentication failure",
        "Insufficient permissions for the query",
        "Lokka MCP server configuration issue",
        "Network connectivity issue to Microsoft Graph"
      ],
      recommendations: [
        "Check Lokka MCP server logs for authentication errors",
        "Verify TENANT_ID, CLIENT_ID, and CLIENT_SECRET environment variables",
        "Ensure the service principal has required Graph API permissions",
        "Test the external Lokka MCP server directly"
      ]
    }
  };
}
```

### 3. Fixed TypeScript Compilation Issues

```typescript
} catch (parseError) {
  console.warn('Failed to parse text content as JSON:', parseError);
  extractedResult = { 
    parseError: "JSON Parse Failed",
    message: textContent.text,
    error: parseError instanceof Error ? parseError.message : String(parseError)
  };
}
```

## Key Changes Made

1. **Dynamic Server Detection**: The application now checks which MCP servers are available and uses the correct one
2. **Correct Tool Names**: Uses `'Lokka-Microsoft'` for external Lokka and `'microsoft_graph_query'` for built-in Lokka
3. **Correct Parameter Names**: Uses `'path'` for external Lokka instead of `'endpoint'`
4. **Better Error Detection**: Specifically detects when Lokka MCP returns only debug information instead of actual results
5. **Enhanced Logging**: Added comprehensive logging to show which server and tool are being used

## Expected Behavior After Fix

When you test the application now, you should see in the console:
1. `"Available MCP servers: ['external-lokka', 'fetch']"`
2. `"Using MCP server: external-lokka, tool: Lokka-Microsoft"`
3. Actual Microsoft Graph API results instead of just query arguments

The UI should now display real user data like the Claude Desktop example you showed, with actual guest account information including names, emails, and counts.

## Files Modified

- `src/llm/UnifiedLLMService.ts` - Updated server detection, tool names, and error handling

## Testing

Run the application and try asking: "How many guest accounts are in the tenant?"

You should now see actual guest account data instead of just the query structure, matching the behavior you saw in Claude Desktop with the Lokka MCP server.
