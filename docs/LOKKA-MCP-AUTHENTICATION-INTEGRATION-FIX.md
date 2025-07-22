# Lokka MCP Server Configuration Storage Fix

## Issue
The Lokka MCP server wasn't functional in the packaged application because it wasn't properly storing and reading environment variables from Electron's storage system. The environment variables were being generated dynamically each time but not persisted, causing issues in packaged applications.

## Root Cause
The authentication flow and MCP server configuration were disconnected from persistent storage:

1. **Environment variables were generated dynamically** in main.ts during initialization
2. **No persistent storage** of MCP server configuration settings  
3. **Configuration inconsistency** between stored credentials and runtime usage
4. **Packaged app incompatibility** due to lack of persistent environment variable configuration

## Solution
Implemented a comprehensive MCP configuration storage system that:

1. **Stores MCP configuration** in Electron's encrypted storage alongside other app settings
2. **Generates environment variables** from stored configuration via `getLokkaMCPEnvironment()`
3. **Supports three authentication modes** with appropriate credential storage:
   - `client-credentials`: Stores client ID, tenant ID, and client secret
   - `enhanced-graph-access`: Uses Microsoft Graph PowerShell client ID with runtime user tokens
   - `delegated`: Stores client ID and tenant ID for fallback, primarily uses runtime user tokens
4. **Synchronizes configuration** when Entra settings change
5. **Persists across app restarts** for packaged applications

## Key Architecture Changes

### MCP Configuration Storage
- Added `MCPConfig` interface with proper typing for all authentication modes
- Implemented `getMCPConfig()`, `saveMCPConfig()`, `updateLokkaMCPConfig()` in ConfigService
- Added `getLokkaMCPEnvironment()` to generate environment variables from stored config
- Added `isLokkaMCPConfigured()` to check if Lokka MCP is properly configured

### Authentication Mode Handling
The system now properly handles credentials based on authentication mode:

#### Enhanced Graph Access Mode (`enhanced-graph-access`)
- Uses Microsoft Graph PowerShell client ID: `14d82eec-204b-4c2f-b7e8-296a70dab67e`
- Passes user access token at runtime via `ACCESS_TOKEN` environment variable
- **No stored credentials needed** - clears stored client credentials

#### Delegated Mode (`delegated`) 
- Stores client ID and tenant ID for fallback scenarios
- Primarily uses runtime user access token via `ACCESS_TOKEN` environment variable
- **Client secret not needed** - not stored for this mode

#### Client Credentials Mode (`client-credentials`)
- Stores client ID, tenant ID, and client secret
- Uses app-only authentication with stored credentials
- **All credentials stored** for autonomous operation

### Updated Initialization Logic
```typescript
// Only store credentials that are actually needed for the specific auth mode
if (authMode === 'client-credentials') {
  // Store all credentials for app-only authentication
  mcpConfigUpdate.clientId = authConfig.clientId;
  mcpConfigUpdate.tenantId = authConfig.tenantId;
  mcpConfigUpdate.clientSecret = authConfig.clientSecret;
} else if (authMode === 'enhanced-graph-access') {
  // Clear stored credentials - uses Graph PowerShell client ID and runtime tokens
  mcpConfigUpdate.clientId = undefined;
  mcpConfigUpdate.tenantId = undefined;
  mcpConfigUpdate.clientSecret = undefined;
} else if (authMode === 'delegated') {
  // Store client ID/tenant ID for fallback, no client secret
  mcpConfigUpdate.clientId = authConfig.clientId;
  mcpConfigUpdate.tenantId = authConfig.tenantId;
  mcpConfigUpdate.clientSecret = undefined;
}
```
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

1. **Configuration Storage**: MCP settings persist in Electron storage across app restarts
2. **Authentication Mode Awareness**: Only stores credentials needed for the selected auth mode
3. **Runtime Token Passing**: User access tokens are passed to Lokka MCP at runtime
4. **Packaged App Compatibility**: Works properly in packaged Electron applications
5. **Auto-Synchronization**: MCP config updates when Entra settings change

## Testing Steps
1. Configure Entra Application Settings in the app
2. Choose authentication mode (Enhanced Graph Access recommended)
3. Save settings and restart the application
4. Log in with Microsoft account
5. Ask a Microsoft Graph query like "how many users are in my tenant?"
6. Verify Lokka MCP server responds correctly with proper authentication

## Benefits
- ✅ **Persistent Configuration**: MCP settings stored and persist across restarts
- ✅ **Packaged App Support**: Works in production Electron applications  
- ✅ **Proper Credential Management**: Only stores credentials needed for each auth mode
- ✅ **Runtime Token Passing**: Secure token handling for user authentication
- ✅ **Type Safety**: Full TypeScript support with proper interfaces
- ✅ **Auto-Sync**: Configuration automatically updates with authentication changes
