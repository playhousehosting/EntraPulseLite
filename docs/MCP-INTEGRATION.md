# MCP Server SDK Implementation

This document describes the SDK-based implementation of Model Context Protocol (MCP) servers in EntraPulse Lite.

## Overview

EntraPulse Lite uses a dedicated MCP TypeScript SDK to interact with MCP servers, providing a secure and standardized way to access various data sources, including:

1. Microsoft Graph API (via the Lokka MCP server)
2. Microsoft Learn documentation (via the Fetch MCP server)

## Architecture

The implementation consists of several components:

1. **MCPClient** - The main client for interacting with MCP servers using the MCP TypeScript SDK
2. **MCPAuthService** - Handles authentication for different MCP servers
3. **MCPServerManager** - Manages MCP server instances
4. **MCPServerFactory** - Creates appropriate server instances based on configuration
5. **FetchMCPServer** - Implementation of the Fetch MCP server for Microsoft documentation
6. **LokkaMCPServer** - Implementation of the Lokka MCP server for Microsoft Graph API access
7. **MCPErrorHandler** - Utility for standardized error handling across all MCP components

## Server Types

### Fetch MCP Server

The Fetch MCP server provides access to public Microsoft documentation and resources. It includes the following tools:

- `fetch_documentation` - Fetch Microsoft Learn documentation about Microsoft Graph and related topics
- `fetch_graph_schema` - Fetch Microsoft Graph API schema information for entities
- `fetch_permissions_info` - Fetch information about Microsoft Graph API permissions

### Lokka MCP Server

The Lokka MCP server provides access to Microsoft Graph API. It includes the following tools:

- `microsoft_graph_query` - Execute queries against Microsoft Graph API endpoints

## Authentication

Authentication is handled differently for each server type:

- **Lokka (Graph API)** - Uses Microsoft Authentication Library (MSAL) with OAuth 2.0
- **Fetch (Documentation)** - Typically doesn't require authentication for public documentation

The `MCPAuthService` class handles authentication for different server types, providing appropriate authentication headers or tokens as needed.

## Error Handling

EntraPulse Lite implements a robust error handling system for MCP operations, centered around the `MCPErrorHandler` utility.

### Error Codes

Standardized error codes are used throughout the MCP implementation:

| Code | Name | Description |
|------|------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters or format |
| 401 | UNAUTHORIZED | Authentication required or failed |
| 403 | FORBIDDEN | Insufficient permissions for the operation |
| 404 | NOT_FOUND | Resource, tool, or endpoint not found |
| 405 | METHOD_NOT_ALLOWED | HTTP method not supported for this endpoint |
| 409 | CONFLICT | Resource conflict or concurrency issue |
| 500 | INTERNAL_SERVER_ERROR | Server-side error or unexpected condition |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable or overloaded |

### Error Format

All MCP errors are formatted consistently:

```typescript
interface MCPError {
  code: number;      // HTTP-style error code (400, 401, 404, 500, etc.)
  message: string;   // Human-readable error message
  data?: any;        // Optional additional error data
}
```

### Error Handling Flow

1. When an error occurs in an MCP operation, it's passed to `MCPErrorHandler.handleError()` with context
2. The handler determines the appropriate error code based on the error type and message
3. The error is logged with context for debugging
4. A standardized MCPError object is returned
5. The application can handle the error appropriately based on the error code

### Example Usage

```typescript
try {
  const result = await mcpClient.callTool('graph', 'microsoft_graph_query', { endpoint: '/me' });
  // Process result
} catch (error) {
  const mcpError = MCPErrorHandler.handleError(error, 'GraphOperation');
  
  switch (mcpError.code) {
    case ErrorCode.UNAUTHORIZED:
      // Handle authentication issues
      break;
    case ErrorCode.FORBIDDEN:
      // Handle permission issues
      break;
    default:
      // Handle other errors
      console.error(`Operation failed: [${mcpError.code}] ${mcpError.message}`);
      break;
  }
}
```

## Configuration

MCP servers are configured in the `AppConfig` object:

```typescript
const serverConfigs: MCPServerConfig[] = [
  {
    name: 'graph',
    type: 'lokka',
    port: 8080,
    enabled: true,
    authConfig: {
      type: 'msal',
      scopes: ['User.Read', 'User.ReadBasic.All']
    }
  },
  {
    name: 'docs',
    type: 'fetch',
    port: 8081,
    enabled: true,
    authConfig: {
      type: 'none'
    }
  }
];
```

## Usage Examples

The `MCPExample` class demonstrates how to use the MCP clients and servers in your application:

### Basic MCP Client Setup

```typescript
// Initialize dependencies
const authService = new AuthService();
const mcpAuthService = new MCPAuthService(authService);

// Define server configurations
const serverConfigs = [
  {
    name: 'graph',
    type: 'lokka',
    port: 8080,
    enabled: true,
    authConfig: {
      type: 'msal',
      scopes: ['User.Read']
    }
  },
  {
    name: 'docs',
    type: 'fetch',
    port: 8081,
    enabled: true
  }
];

// Create MCP client
const mcpClient = new MCPClient(serverConfigs, mcpAuthService);
```

### Fetching Documentation

```typescript
async function fetchGraphDocumentation(query: string): Promise<string> {
  try {
    const result = await mcpClient.callTool('docs', 'fetch_documentation', {
      query: `Microsoft Graph API ${query}`
    });
    
    // Process and extract the text content
    if (result?.content && Array.isArray(result.content)) {
      const textContent = result.content
        .filter(item => item.type === 'text')
        .map(item => item.text || '')
        .join('\n\n');
      
      return textContent || 'No documentation found';
    }
    
    return 'No content returned from documentation service';
  } catch (error) {
    const mcpError = MCPErrorHandler.handleError(error, 'fetchGraphDocumentation');
    return `Failed to fetch documentation: [${mcpError.code}] ${mcpError.message}`;
  }
}
```

### Calling Microsoft Graph API

```typescript
async function callGraphApi(endpoint: string): Promise<any> {
  try {
    const result = await mcpClient.callTool('graph', 'microsoft_graph_query', {
      endpoint,
      method: 'GET',
      version: 'v1.0'
    });
    
    if (result?.content && Array.isArray(result.content)) {
      const jsonContent = result.content.find(item => item.type === 'json');
      if (jsonContent?.json) {
        return jsonContent.json;
      }
    }
    
    return null;
  } catch (error) {
    const mcpError = MCPErrorHandler.handleError(error, `callGraphApi(${endpoint})`);
    throw new Error(`Graph API call failed: [${mcpError.code}] ${mcpError.message}`);
  }
}
```

### Combining Multiple MCP Tools

```typescript
async function getUserProfileWithPermissions(): Promise<any> {
  try {
    // First, get the user profile from Graph API
    const userProfile = await callGraphApi('/me');
    
    if (!userProfile) {
      throw new Error('Could not retrieve user profile');
    }
    
    // Then get information about required permissions
    const permissionsInfo = await fetchPermissionsInfo('User.Read');
    
    // Return combined information
    return {
      profile: userProfile,
      permissions: {
        info: permissionsInfo,
        granted: ['User.Read']
      }
    };
  } catch (error) {
    const mcpError = MCPErrorHandler.handleError(error, 'getUserProfileWithPermissions');
    
    switch (mcpError.code) {
      case ErrorCode.UNAUTHORIZED:
        throw new Error('Authentication required. Please sign in to access your profile.');
      case ErrorCode.FORBIDDEN:
        throw new Error('You don\'t have permission to access this information.');
      default:
        throw new Error(`Failed to retrieve profile: ${mcpError.message}`);
    }
  }
}
```

## API Reference

### MCPClient

```typescript
class MCPClient {
  constructor(serverConfigs: MCPServerConfig[], authService: MCPAuthService);
  
  async listTools(serverName: string): Promise<Tool[]>;
  async callTool(serverName: string, toolName: string, arguments_: any): Promise<MCPResponse>;
  getAvailableServers(): MCPServerConfig[];
  getServerConfig(serverName: string): MCPServerConfig | undefined;
}
```

### MCPAuthService

```typescript
class MCPAuthService {
  constructor(authService: AuthService);
  
  async getGraphAuthProvider(): Promise<AuthenticationProvider>;
  async getAuthHeaders(serverType: string): Promise<Record<string, string>>;
  async getToken(): Promise<AuthToken | null>;
}
```

## Error Handling

The MCP implementation includes comprehensive error handling:

1. Authentication errors are properly captured and reported
2. Network errors during API calls are handled gracefully
3. Invalid tool calls return appropriate error responses

## Testing

Tests for the MCP implementation are available in:

- `src/tests/unit/mcp-sdk.test.ts`
- `src/tests/unit/mcp-servers.test.ts`
- `src/tests/integration/mcp.test.ts`
