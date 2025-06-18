# Lokka MCP Server Authentication Integration Fix

## Issue
The Lokka MCP server wasn't starting correctly after user authentication, even when Entra application credentials were properly saved in the settings. The server was showing as "not enabled in configuration" and calls to Microsoft Graph via the MCP server were failing.

## Root Cause
The authentication flow and MCP server initialization were disconnected:

1. **User authenticates** with Microsoft identity platform (using default Graph PowerShell app)
2. **Entra credentials are stored** in settings for the Lokka MCP server
3. **MCP server configuration wasn't updated** when user logs in or when app starts with existing auth session
4. **Lokka server remained disabled** because it didn't have proper credentials in its configuration

## Solution
Added logic to check for stored Entra credentials and update the MCP server configuration in two key scenarios:

### 1. During Login (`auth:login` handler)
When a user successfully logs in:
- Check if stored Entra credentials exist in settings
- If found, update the Lokka MCP server configuration with:
  - `enabled: true`
  - Environment variables: `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`
- Reinitialize MCP services with the updated configuration
- Start the Lokka MCP server

### 2. During App Startup (`initializeAuthenticationState`)
When the app starts and finds an existing authentication session:
- Check if stored Entra credentials exist in settings
- If found, update the Lokka MCP server configuration
- Reinitialize MCP services
- Ensure the Lokka MCP server is running

## Code Changes

### In `auth:login` IPC handler:
```typescript
// Check if we have stored Entra credentials and update MCP server config
console.log('🔧 Checking for stored Entra credentials after login...');
const storedEntraConfig = this.configService.getEntraConfig();

if (storedEntraConfig && storedEntraConfig.clientId && storedEntraConfig.tenantId && storedEntraConfig.clientSecret) {
  console.log('🔐 Found stored Entra credentials, updating Lokka MCP server configuration...');
  
  // Update the Lokka server configuration with stored credentials
  const lokkaServerIndex = this.config.mcpServers.findIndex(server => server.name === 'external-lokka');
  if (lokkaServerIndex !== -1) {
    this.config.mcpServers[lokkaServerIndex] = {
      ...this.config.mcpServers[lokkaServerIndex],
      enabled: true, // Enable since we have credentials
      env: {
        TENANT_ID: storedEntraConfig.tenantId,
        CLIENT_ID: storedEntraConfig.clientId,
        CLIENT_SECRET: storedEntraConfig.clientSecret
      }
    };
    
    // Reinitialize MCP services with updated config
    const mcpAuthService = new MCPAuthService(this.authService);
    
    // Stop and restart MCP services
    if (this.mcpServerManager) {
      await this.mcpServerManager.stopAllServers();
    }
    
    this.mcpServerManager = new MCPServerManager(this.config.mcpServers, mcpAuthService);
    this.mcpClient = new MCPClient(this.config.mcpServers, mcpAuthService);
  }
}
```

### In `initializeAuthenticationState` method:
Similar logic added to handle app startup when an existing authentication session is found.

## Expected Behavior
After this fix:

1. **User logs in** → Lokka MCP server automatically starts with Entra credentials
2. **App restarts** → If user was already logged in, Lokka MCP server starts automatically
3. **Microsoft Graph queries** → Use the Lokka MCP server for enhanced Microsoft Graph API access
4. **Logs show**:
   - `🔐 Found stored Entra credentials, updating Lokka MCP server configuration...`
   - `✅ Updated Lokka MCP server configuration with stored credentials`
   - `🚀 MCP services reinitialized with Entra credentials`

## Testing Steps
1. Configure Entra Application Settings in the app
2. Save the settings and test the connection
3. Log in with Microsoft account
4. Ask a Microsoft Graph query like "how many user accounts in the tenant?"
5. Verify the logs show Lokka MCP server being used for the query

## Benefits
- **Seamless integration** between authentication and MCP services
- **Automatic server startup** when credentials are available
- **Enhanced Microsoft Graph queries** through the Lokka MCP server
- **Better user experience** - no manual intervention required
