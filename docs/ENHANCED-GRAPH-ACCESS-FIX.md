# Enhanced Graph Access Authentication Fix

## Issue
When Enhanced Graph Access was enabled, Microsoft Graph queries were failing with "User not signed in" errors. The MCP client was incorrectly trying to use the main AuthService instead of the PowerShell client ID token.

## Root Cause
The Enhanced Graph Access token was being acquired in `main.ts` and set as an environment variable, but the `ExternalLokkaMCPStdioServer` was not properly checking for and using this pre-provided token.

## Solution

### 1. Updated main.ts Constructor
Added Enhanced Graph Access logic to the initial configuration:

```typescript
// Check if Enhanced Graph Access is enabled and not in application credentials mode
if (storedEntraConfig?.useGraphPowerShell && authPreference !== 'application-credentials') {
  console.log('🔧 Enhanced Graph Access mode detected during initialization');
  lokkaClientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell client ID
  lokkaEnv.CLIENT_ID = lokkaClientId;
  
  // Try to get a PowerShell token for immediate use
  try {
    const graphPowerShellAuthConfig = {
      auth: {
        clientId: lokkaClientId,
        tenantId: authConfig.tenantId,
        scopes: ['https://graph.microsoft.com/user_impersonation'],
        useClientCredentials: false
      }
    };
    
    const tempAuthService = new AuthService(graphPowerShellAuthConfig);
    const token = await tempAuthService.getToken();
    
    if (token && token.accessToken) {
      console.log('🔐 Successfully obtained Enhanced Graph Access token during initialization');
      lokkaEnv.ACCESS_TOKEN = token.accessToken;
      lokkaEnv.USE_INTERACTIVE = 'false';
    } else {
      console.log('⚠️ Failed to get Enhanced Graph Access token during initialization, will use client token mode');
      lokkaEnv.USE_CLIENT_TOKEN = 'true';
    }
  } catch (error) {
    console.log('⚠️ Error getting Enhanced Graph Access token during initialization:', error);
    lokkaEnv.USE_CLIENT_TOKEN = 'true';
  }
}
```

### 2. Enhanced ExternalLokkaMCPStdioServer.ts
Updated the server to check for pre-provided tokens:

```typescript
// Check if an ACCESS_TOKEN is already provided (e.g., from Enhanced Graph Access)
if (this.config.env?.ACCESS_TOKEN) {
  console.log('Using pre-provided ACCESS_TOKEN for Enhanced Graph Access mode');
  env.ACCESS_TOKEN = this.config.env.ACCESS_TOKEN;
  env.USE_INTERACTIVE = this.config.env.USE_INTERACTIVE || 'false';
} else {
  // WORKAROUND: Lokka has a bug where authManager is not initialized in client token mode
  // without an initial ACCESS_TOKEN. To work around this, we'll provide a dummy token
  // that will be immediately replaced with the real token.
  env.ACCESS_TOKEN = 'dummy-token-will-be-replaced';
}
```

Updated token acquisition logic:
```typescript
// Check if we have a pre-provided ACCESS_TOKEN (Enhanced Graph Access mode)
if (this.config.env?.ACCESS_TOKEN && this.config.env.ACCESS_TOKEN !== 'dummy-token-will-be-replaced') {
  console.log('🔐 Using pre-provided PowerShell access token for Enhanced Graph Access');
  accessToken = this.config.env.ACCESS_TOKEN;
} else {
  // Get fresh access token from auth service (standard user token mode)
  console.log('🔐 Getting access token from auth service for standard user token mode');
  const token = await this.authService.getToken();
  
  if (!token || !token.accessToken) {
    throw new Error('No valid access token available for user token authentication');
  }
  
  accessToken = token.accessToken;
}
```

## Authentication Flow

### Standard User Token Mode
1. User authenticates with their configured client ID
2. `AuthService.getToken()` is called to get token
3. Token is passed to Lokka via `set-access-token` tool

### Enhanced Graph Access Mode
1. **main.ts** acquires token using Microsoft Graph PowerShell client ID (`14d82eec-204b-4c2f-b7e8-296a70dab67e`)
2. **main.ts** sets `ACCESS_TOKEN` and `USE_INTERACTIVE=false` in Lokka environment
3. **ExternalLokkaMCPStdioServer** detects pre-provided token and uses it directly
4. **No calls** to `AuthService.getToken()` - completely bypasses main auth service

## Verification
The fix ensures that:
- Enhanced Graph Access uses the correct PowerShell client ID token
- No "User not signed in" errors occur when Enhanced Graph Access is enabled
- Delegated permissions work correctly for Microsoft Graph queries
- Configuration changes take effect immediately without restart

## Logging
Enhanced logging shows which authentication mode is active:
```
🔧 Enhanced Graph Access mode detected during initialization
🔐 Successfully obtained Enhanced Graph Access token during initialization
🔐 Using pre-provided PowerShell access token for Enhanced Graph Access
```

## Impact
This fix resolves the core issue where Enhanced Graph Access was failing to authenticate properly, enabling users to perform delegated Microsoft Graph queries (like accessing their mailbox) when this mode is enabled.
