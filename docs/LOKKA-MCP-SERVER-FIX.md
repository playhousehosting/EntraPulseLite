# Lokka MCP Server Startup Fix

## Issue Description
The Lokka MCP server isn't starting properly after the user has authenticated and the Entra application credentials (ClientID, TenantID, ClientSecret) are retrieved from the profile store. This causes Microsoft Graph API queries to fail as the `external-lokka` MCP server cannot be found.

The error message observed in logs is:
```
Failed to call tool microsoft_graph_query on server external-lokka: Error: MCP server 'external-lokka' not found or disabled
```

## Root Cause
There are several issues:

1. **Timing Issue**: The Lokka MCP server is initialized at application startup, but it needs valid credentials which are only available after the user authenticates.

2. **Configuration Fetching**: The `MCPServerManager` creates server instances, but the Lokka server may not start correctly if the credentials aren't valid yet.

3. **Disconnect Between Client and Server**: The `MCPClient` class (in `MCPSDKClient.ts`) maintains a list of server names but doesn't actually start the servers.

## Solution Implementation

Several changes need to be made to fix this issue:

### 1. Add a method to explicitly start Lokka MCP server

In `MCPClient` class:
```typescript
/**
 * Start a specific MCP server by name
 * @param serverName Name of the MCP server to start
 * @returns Promise that resolves when the server is started
 */
async startServer(serverName: string): Promise<void> {
  try {
    // Check if the server is in our configs
    const serverConfig = this.serverConfigs.get(serverName);
    if (!serverConfig || !serverConfig.enabled) {
      throw new Error(`MCP server '${serverName}' not found or disabled`);
    }
    
    // Import MCPServerManager dynamically to avoid circular dependencies
    const { MCPServerManager } = await import('../servers/MCPServerManager');
    
    // Get the MCPServerManager instance using the static getter
    const instance = MCPServerManager.instance;
    
    if (instance) {
      console.log(`Attempting to start MCP server '${serverName}' explicitly...`);
      
      // Get the server instance
      const server = instance.getServer(serverName);
      
      if (server && typeof server.startServer === 'function') {
        console.log(`Starting MCP server '${serverName}'...`);
        await server.startServer();
        console.log(`MCP server '${serverName}' started successfully`);
      } else {
        console.warn(`MCP server '${serverName}' does not have a startServer method`);
      }
    } else {
      console.warn('Could not find MCPServerManager instance to start server');
    }
  } catch (error) {
    console.error(`Error starting MCP server '${serverName}':`, error);
    throw error;
  }
}
```

### 2. Add a service method to check and ensure Lokka MCP is running 

In `main.ts`:
```typescript
/**
 * Check if Lokka MCP server is running and start it if enabled but not running
 * This method can be called after authentication or when MCP services are needed
 */
private async ensureLokkaMCPServerRunning(): Promise<boolean> {
  try {
    console.log('[Main] Checking if Lokka MCP server is running...');
    
    // First check if Lokka is enabled in the configuration
    const lokkaConfig = this.config.mcpServers.find(server => server.name === 'external-lokka');
    
    if (!lokkaConfig || !lokkaConfig.enabled) {
      console.log('[Main] Lokka MCP server not enabled in configuration');
      return false;
    }
    
    // Check if the server is in the available servers list
    const availableServers = this.mcpClient.getAvailableServers();
    const lokkaServerExists = availableServers.includes('external-lokka');
    
    if (lokkaServerExists) {
      console.log('[Main] Lokka MCP server found in available servers');
      
      // Try to validate if it's actually running by attempting to list tools
      try {
        // Just checking if the server is actually available
        await this.mcpClient.listTools('external-lokka');
        console.log('[Main] ✅ Lokka MCP server is running and responding');
        return true;
      } catch (error) {
        console.warn('[Main] Lokka MCP server exists but failed to respond:', error);
        // Will try to restart below
      }
    } else {
      console.log('[Main] Lokka MCP server not found in available servers');
    }
    
    // If we get here, server is either not running or not responding
    console.log('[Main] Attempting to start Lokka MCP server...');
    
    try {
      // Try to start the server explicitly through the client
      await this.mcpClient.startServer('external-lokka');
      console.log('[Main] ✅ Lokka MCP server started successfully');
      return true;
    } catch (clientError) {
      console.error('[Main] Failed to start Lokka MCP server through client:', clientError);
      
      // Try direct approach through server manager as fallback
      try {
        const lokkaServer = this.mcpServerManager.getServer('external-lokka');
        if (lokkaServer && lokkaServer.startServer) {
          await lokkaServer.startServer();
          console.log('[Main] ✅ Lokka MCP server started through server manager');
          return true;
        } else {
          console.warn('[Main] Could not find Lokka server instance in manager');
        }
      } catch (managerError) {
        console.error('[Main] Failed to start Lokka MCP server through manager:', managerError);
      }
    }
    
    return false;
  } catch (error) {
    console.error('[Main] Error in ensureLokkaMCPServerRunning:', error);
    return false;
  }
}
```

### 3. Call this method at crucial points:

1. After a successful login:
```typescript
// After authentication
try {
  console.log('[Main] Attempting to start Lokka MCP server after successful login...');
  
  // Check if Lokka server is enabled in the configuration
  const lokkaConfig = this.config.mcpServers.find(server => server.name === 'external-lokka');
  
  if (lokkaConfig && lokkaConfig.enabled) {
    // Try to start the server explicitly
    await this.mcpClient.startServer('external-lokka');
    console.log('[Main] ✅ Lokka MCP server started after authentication');
  } else {
    console.log('[Main] Lokka MCP server not enabled, skipping start after login');
  }
} catch (error) {
  console.error('[Main] Failed to start Lokka MCP server after login:', error);
}
```

2. During chatting, before using the LLM service:
```typescript
ipcMain.handle('llm:chat', async (event, messages) => {
  try {
    // Ensure Lokka MCP server is running before chat
    // This handles the case where the user has authenticated but server isn't started
    await this.ensureLokkaMCPServerRunning();
    
    // Now proceed with enhanced chat
    return await this.llmService.enhancedChat(messages);
  } catch (error) {
    console.error('LLM chat failed:', error);
    throw error;
  }
});
```

3. After initializing authentication during startup:
```typescript
// Add this to the initializeAuthenticationState method
if (authInfo.isAuthenticated) {
  console.log('✅ Found existing authentication session');
  
  // Set authentication verification flag
  this.configService.setAuthenticationVerified(true);
  
  // Set authentication context  
  this.configService.setAuthenticationContext('client-credentials');
  
  // Reload LLM service with full configuration
  const fullLLMConfig = this.configService.getLLMConfig();
  console.log('🔧 Initializing LLM service with full configuration from existing session');
  
  this.llmService = new EnhancedLLMService(fullLLMConfig, this.authService, this.mcpClient);
  
  // Ensure Lokka MCP server is running after initializing authentication state
  await this.ensureLokkaMCPServerRunning();
  
  console.log('🎉 Authentication state initialized successfully');
}
```

## Implementation Notes

The current fix requires careful handling of the TypeScript source files as there may be IDE/compiler issues in the current codebase. Specifically:

1. In `main.ts`, there are some formatting issues with the existing IPC handlers that need to be addressed.
2. Make sure proper spacing is maintained between IPC handler definitions.
3. Be careful with method signatures and ensure proper typing for parameters and return values.

The changes should be made incrementally and tested after each step to ensure that:
1. The application builds correctly
2. Authentication works properly
3. Lokka MCP server starts correctly after authentication
4. Microsoft Graph API queries work through the Lokka MCP server

## Testing Steps

1. Build and run the application
2. Log in with Microsoft credentials
3. Go to Settings and configure Entra Application Settings
4. Save the settings and test the connection
5. Try a Microsoft Graph API query like "How many user accounts in the tenant?"
6. Check the logs to confirm that the Lokka MCP server is used for the query

## Expected Outcome

The application should successfully use the Lokka MCP server for Microsoft Graph API queries after the user has authenticated and the Entra application credentials have been saved.
