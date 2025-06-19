# Microsoft Docs MCP Integration

This document describes the integration of the Microsoft Docs MCP Server into EntraPulse Lite.

## Overview

The Microsoft Docs MCP Server provides access to Microsoft Learn documentation through a Model Context Protocol (MCP) interface. This integration allows EntraPulse Lite to query Microsoft's official documentation directly from the application.

## Configuration

The Microsoft Docs MCP server is configured in the main application configuration:

```typescript
{
  name: 'microsoft-docs',
  type: 'microsoft-docs',
  port: 0, // Not used for HTTP-based MCP servers
  enabled: true,
  url: 'https://learn.microsoft.com/api/mcp',
  authConfig: {
    type: 'none' // Microsoft Docs MCP doesn't require authentication
  }
}
```

## Implementation Details

### Files Added/Modified

1. **New Files:**
   - `src/mcp/clients/MicrosoftDocsMCPClient.ts` - HTTP-based MCP client for Microsoft Docs
   - `src/mcp/MicrosoftDocsMCPExample.ts` - Test and example usage
   - `src/tests/integration/microsoft-docs-mcp.test.ts` - Integration tests

2. **Modified Files:**
   - `src/mcp/types.ts` - Added 'microsoft-docs' to MCPServerConfig type
   - `src/types/index.ts` - Added 'microsoft-docs' to MCPServerConfig type  
   - `src/mcp/clients/MCPClient.ts` - Added support for Microsoft Docs MCP
   - `src/mcp/auth/MCPAuthService.ts` - Added auth handling for Microsoft Docs
   - `src/llm/EnhancedLLMService.ts` - Integrated Microsoft Docs MCP into query analysis
   - `src/main/main.ts` - Added Microsoft Docs server to default configuration
   - `package.json` - Added test script for Microsoft Docs MCP

### Key Features

1. **HTTP-based Communication**: Uses HTTP requests to communicate with the remote Microsoft Docs MCP server
2. **Tool Support**: Supports listing and calling tools provided by the server
3. **Resource Support**: Supports listing and reading resources (documentation content)
4. **Error Handling**: Comprehensive error handling for network and server issues
5. **Health Checks**: Built-in health checking functionality
6. **Integration with LLM**: Seamlessly integrated into the Enhanced LLM Service

### API Methods

The `MicrosoftDocsMCPClient` provides the following methods:

- `initialize()` - Initialize the client and perform handshake
- `listTools()` - List available tools from the server
- `callTool(toolName, arguments)` - Call a specific tool
- `listResources()` - List available documentation resources
- `readResource(uri)` - Read the contents of a specific resource
- `healthCheck()` - Check if the server is responding

### Usage in Enhanced LLM Service

The Microsoft Docs MCP is integrated into the query analysis flow:

1. **Query Analysis**: The LLM analyzes user queries to determine if Microsoft Learn documentation is needed
2. **MCP Execution**: If documentation is needed, the Microsoft Docs MCP is called
3. **Response Generation**: The LLM uses the documentation results to generate informed responses

Example queries that would trigger Microsoft Docs MCP:
- "Tell me about Azure Active Directory"
- "How do I authenticate to Graph API?"
- "What are the latest Graph API features?"
- "What permissions does User.Read give me?"

### Relationship to Existing MCPs

The Microsoft Docs MCP is designed to eventually replace the Fetch MCP for documentation queries:

- **Fetch MCP** (legacy): Generic web fetching for Microsoft Learn content
- **Microsoft Docs MCP** (new): Dedicated Microsoft Learn API with structured responses
- **Lokka MCP** (unchanged): Microsoft Graph API data access

The Enhanced LLM Service prefers Microsoft Docs MCP over Fetch MCP when both are available.

## Testing

### Unit Tests
Run unit tests for the MCP client:
```bash
npm test -- --testNamePattern="MicrosoftDocsMCP"
```

### Integration Tests
Run integration tests to verify end-to-end functionality:
```bash
npm run test:microsoft-docs
```

### Manual Testing
Use the example script to manually test the integration:
```typescript
import { testMicrosoftDocsMCP } from './src/mcp/MicrosoftDocsMCPExample';
await testMicrosoftDocsMCP();
```

## Configuration Options

The Microsoft Docs MCP server can be configured with the following options:

- `url`: The MCP server endpoint (default: 'https://learn.microsoft.com/api/mcp')
- `enabled`: Whether the server is enabled (default: true)
- `authConfig.type`: Authentication type (default: 'none')

## Error Handling

The integration includes comprehensive error handling:

1. **Network Errors**: HTTP timeouts, connection failures
2. **Server Errors**: Invalid responses, server unavailability
3. **Authentication Errors**: Token failures (if auth is required)
4. **Parsing Errors**: Invalid JSON responses
5. **Graceful Degradation**: Falls back to other MCPs if Microsoft Docs fails

## Future Enhancements

Potential future improvements:

1. **Caching**: Cache documentation responses to improve performance
2. **Advanced Search**: Support for more sophisticated search parameters
3. **Content Filtering**: Filter results by content type or relevance
4. **Offline Mode**: Cache critical documentation for offline access
5. **Analytics**: Track usage patterns for documentation queries

## Troubleshooting

Common issues and solutions:

1. **Connection Timeouts**: Check network connectivity and firewall settings
2. **Empty Results**: Verify the query format and search terms
3. **Authentication Errors**: Ensure auth configuration is correct (though none is typically required)
4. **Tool Not Found**: Check if the Microsoft Docs MCP server is running and accessible

## Dependencies

The Microsoft Docs MCP integration relies on:

- **fetch**: For HTTP requests (built into modern Node.js)
- **MCP Protocol**: Model Context Protocol specification
- **TypeScript**: For type safety and development experience

No additional external dependencies are required for the basic functionality.
