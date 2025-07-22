# Lokka MCP Configuration Storage Fix

## Problem
The Lokka MCP server was not functional in packaged apps because:
1. It wasn't using the stored configuration from Electron storage
2. It was missing the required `USE_CLIENT_TOKEN=true` environment variable for client-provided-token mode

## Root Cause Analysis

### Issue 1: Ignored Stored Configuration
Even though we had implemented a comprehensive MCP configuration storage system, the `ExternalLokkaMCPStdioServer.ts` was **ignoring** the passed environment configuration and rebuilding environment variables from scratch.

### Issue 2: Missing USE_CLIENT_TOKEN in Enhanced Graph Access Mode
In `ConfigService.getLokkaMCPEnvironment()`, when `enhanced-graph-access` mode provided a user token, it was setting:
```typescript
// OLD CODE (PROBLEMATIC):
if (userToken) {
  env.ACCESS_TOKEN = userToken;
  env.USE_INTERACTIVE = 'false';
  // ❌ Missing: env.USE_CLIENT_TOKEN = 'true';
}
```

This caused Lokka to default to client-credentials mode instead of client-provided-token mode, resulting in the error:
```
Fatal error in main(): Error: Client credentials mode requires TENANT_ID, CLIENT_ID, and CLIENT_SECRET
```

```typescript
// OLD CODE (PROBLEMATIC):
// Prepare environment variables
const env: Record<string, string> = {};

if (authPreference === 'application-credentials' && this.config.env?.CLIENT_SECRET) {
  // ... build env from scratch
} else {
  // ... build env from scratch
}
```

## Solution
Fixed `ExternalLokkaMCPStdioServer.ts` to use the stored configuration directly:

```typescript
// NEW CODE (FIXED):
// Use the environment variables from stored configuration instead of building them here
const env = this.config.env || {};
console.log('🔧 Using stored MCP configuration environment variables');
console.log('🔧 Environment variables from storage:', Object.keys(env));
```

## Changes Made

### File: `src/mcp/servers/lokka/ExternalLokkaMCPStdioServer.ts`
1. **Replaced dynamic environment building** with direct usage of stored configuration
2. **Updated logging references** from `this.config.env?.ACCESS_TOKEN` to `env.ACCESS_TOKEN`
3. **Added debug logging** to show when stored configuration is being used

### File: `src/shared/ConfigService.ts`
4. **Fixed missing USE_CLIENT_TOKEN** in `enhanced-graph-access` mode when user token is provided
5. **Fixed missing USE_CLIENT_TOKEN** in `delegated` mode when user token is provided

### Key Code Changes:

#### ExternalLokkaMCPStdioServer.ts:
- **Line ~109**: Changed from building `env` object to using `this.config.env || {}`
- **Line ~124**: Updated logging to use `env.ACCESS_TOKEN` instead of `this.config.env?.ACCESS_TOKEN`
- **Line ~148**: Updated token check to use `env.ACCESS_TOKEN` instead of `this.config.env?.ACCESS_TOKEN`

#### ConfigService.ts:
- **Enhanced-graph-access mode**: Always set `USE_CLIENT_TOKEN = 'true'` even when providing ACCESS_TOKEN
- **Delegated mode**: Always set `USE_CLIENT_TOKEN = 'true'` even when providing ACCESS_TOKEN

## Flow After Fix

### Configuration Storage (Already Working):
1. User configures Entra settings → stored in Electron storage via `ConfigService`
2. `main.ts` calls `getLokkaMCPEnvironment()` → generates environment from stored config
3. `createMCPServerConfig()` passes environment to MCP server config

### MCP Server Usage (Now Fixed):
4. `ExternalLokkaMCPStdioServer` **now uses** the passed environment directly
5. Environment variables come from stored configuration, not dynamic generation
6. Lokka MCP receives proper authentication configuration from storage

## Verification
When you run the app now, you should see these debug logs instead of the old pattern:
```
🔧 Using stored MCP configuration environment variables
🔧 Environment variables from storage: ['TENANT_ID', 'CLIENT_ID', 'ACCESS_TOKEN', 'USE_INTERACTIVE', 'USE_CLIENT_TOKEN']
Lokka environment setup: {
  authMethod: 'client-provided-token',
  hasClientSecret: false,
  useClientToken: true,
  hasPreProvidedToken: true,
  useInteractive: 'false'
}
```

And you should **NOT** see this error anymore:
```
Fatal error in main(): Error: Client credentials mode requires TENANT_ID, CLIENT_ID, and CLIENT_SECRET
```

## Impact
- ✅ **Packaged apps** now properly persist and use MCP configuration
- ✅ **Authentication settings** persist between app sessions  
- ✅ **Lokka MCP** works consistently in both development and production builds
- ✅ **Configuration management** is centralized through `ConfigService`

## Testing Steps
1. Configure Entra settings in the app
2. Close and restart the app
3. Verify that MCP configuration persists
4. Check that Lokka MCP starts successfully without requiring reconfiguration
5. Verify Graph API queries work immediately after app restart
