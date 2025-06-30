# External Lokka MCP Server

## Overview

EntraPulseLite includes an external Lokka MCP server implementation that allows you to use the official `@merill/lokka` NPM package to query Microsoft Graph API and other Microsoft services. This implementation launches the Lokka package as a child process, manages its lifecycle, and proxies requests to the running Lokka server.

## Features

- Uses the officially published `@merill/lokka` NPM package
- Supports Microsoft Graph API queries
- Provides enhanced Microsoft API interactions through the `d94_Lokka-Microsoft` tool
- Handles server lifecycle (start/stop) automatically
- Supports both interactive user authentication and client credentials (app-only) authentication
- Configurable through environment variables

## Configuration

To use the external Lokka MCP server, add the following environment variables to your `.env` file:

```
# Enable external Lokka MCP server
USE_EXTERNAL_LOKKA=true

# External Lokka MCP server port
EXTERNAL_MCP_LOKKA_PORT=3003

# Lokka authentication credentials
# If not specified, it will fall back to MSAL_CLIENT_ID and MSAL_TENANT_ID
LOKKA_TENANT_ID=your_tenant_id
LOKKA_CLIENT_ID=your_client_id
LOKKA_CLIENT_SECRET=your_client_secret  # Required for client credentials flow (app-only auth)
```

## Available Tools

The external Lokka MCP server provides two main tools:

### 1. microsoft_graph_query

Provides direct access to Microsoft Graph API endpoints.

**Parameters:**
- `endpoint`: Graph API endpoint path (e.g., `/me`, `/users`)
- `method`: HTTP method (GET, POST, PATCH, PUT, DELETE)
- `body`: Request body for POST/PATCH/PUT requests
- `apiVersion`: API version (v1.0 or beta)
- `queryParams`: Query parameters to include in the request

**Example:**
```javascript
const result = await mcpClient.callTool('external-lokka', 'microsoft_graph_query', {
  endpoint: '/me',
  method: 'GET'
});
```

### 2. d94_Lokka-Microsoft

A versatile tool to interact with Microsoft APIs including Microsoft Graph and Azure Resource Management.

**Parameters:**
- `apiType`: Type of Microsoft API to query (`graph` for Microsoft Graph or `azure` for Azure Resource Management)
- `method`: HTTP method to use (get, post, put, patch, delete)
- `path`: The API URL path to call (e.g., `/users`, `/groups`, `/subscriptions`)
- `apiVersion`: Azure Resource Management API version (required for Azure)
- `subscriptionId`: Azure Subscription ID (for Azure Resource Management)
- `queryParams`: Query parameters for the request
- `body`: The request body (for POST, PUT, PATCH)

**Example:**
```javascript
const result = await mcpClient.callTool('external-lokka', 'd94_Lokka-Microsoft', {
  apiType: 'graph',
  method: 'get',
  path: '/me'
});
```

## Implementation Notes

- The external Lokka MCP server runs as a child process using NPX
- It automatically starts when the application is launched (if enabled)
- The server is gracefully stopped when the application exits
- Authentication is handled through environment variables passed to the Lokka process

## Authentication Methods

### Client Credentials Flow (App-Only Authentication)

The External Lokka MCP Server supports client credentials flow for scenarios where user interaction is not required or where app-only permissions are needed.

To use client credentials flow:

1. **Register an Application in Azure Portal**
   - Navigate to Microsoft Entra ID > App registrations
   - Create a new registration or use an existing one
   - Record the Application (client) ID and Directory (tenant) ID
   - Create a client secret under Certificates & secrets

2. **Grant API Permissions**
   - Add application permissions (not delegated) to your app registration
   - Common permissions for EntraPulseLite scenarios:
     - `User.Read.All` - Read all users' profiles
     - `Group.Read.All` - Read all groups
     - `Directory.Read.All` - Read directory data
   - Grant admin consent for your tenant

3. **Configure EntraPulseLite**
   - Set environment variables in .env.local:
     ```
     LOKKA_TENANT_ID=your_tenant_id
     LOKKA_CLIENT_ID=your_client_id
     LOKKA_CLIENT_SECRET=your_client_secret
     USE_EXTERNAL_LOKKA=true
     ```

### Interactive Authentication

When client credentials are not provided, the External Lokka MCP Server will fall back to interactive (delegated) authentication, which requires a user to sign in. This is the default authentication method for EntraPulseLite.

## Security Considerations

- **Client Secret Management**: Store your client secret securely. Never commit it directly to source control.
- **Least Privilege**: Grant only the permissions that your application needs.
- **Secret Rotation**: Regularly rotate your client secret according to your organization's security policies.
- **Audit Logging**: Enable audit logs in Entra ID to monitor activities performed with the service principal.

## Troubleshooting

If you encounter issues with the External Lokka MCP Server:

1. **Authentication Failed**: Verify that your tenant ID, client ID, and client secret are correct and not expired.

2. **Permission Denied**: Ensure that you've granted the necessary API permissions and admin consent.

3. **Lokka Server Not Starting**: Check the logs for errors. You may need to install or update the Lokka package:
   ```powershell
   npm install -g @merill/lokka
   ```

4. **Integration Test**: Run the integration test to verify connectivity:
   ```powershell
   npm run test:integration -- -t "Lokka MCP Server Tenant Connection"
   ```
