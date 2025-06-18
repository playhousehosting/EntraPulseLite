# Configuration Issues Resolution

## Issues Addressed

### Issue 1: Application Not Using Stored Entra Configuration
**Problem**: After configuring Entra Application Settings through the UI and removing credentials from `.env.local`, the application showed "No LLM service is currently available" even though LLMs were configured.

**Root Cause**: The application only initialized services once at startup with whatever configuration was available at that time. When Entra configuration was saved through the UI, the services weren't reinitializing to use the new configuration.

### Issue 2: Lokka MCP Requires Client Secret  
**Problem**: Users expected Lokka MCP to work with just Client ID and Tenant ID in user context, but it was failing.

**Root Cause**: Lokka MCP uses the **client credentials flow** which requires a client secret. It cannot work with just Client ID and Tenant ID.

## Solutions Implemented

### Solution 1: Service Reinitialization on Configuration Changes

#### Backend Changes (`main.ts`)

1. **Added `reinitializeServices()` method**:
   - Recreates all services with updated configuration
   - Updates authentication, MCP, and LLM services
   - Gracefully handles existing service cleanup
   - Notifies renderer of configuration updates

2. **Enhanced IPC Handlers**:
   - `config:saveEntraConfig` now calls `reinitializeServices()` after saving
   - `config:clearEntraConfig` now calls `reinitializeServices()` after clearing
   - Both operations trigger service reinitialization automatically

3. **Dynamic Configuration Updates**:
   ```typescript
   // Get updated auth configuration
   const authConfig = await this.getAuthConfiguration();
   
   // Update config object with new values
   this.config.auth = {
     clientId: authConfig.clientId,
     tenantId: authConfig.tenantId,
     // ... updated values
   };
   
   // Recreate services with new config
   this.authService = new AuthService(this.config);
   this.graphService = new GraphService(this.authService);
   // ... etc
   ```

#### Flow After Entra Configuration Save:
1. User saves Entra config through UI
2. Config is stored securely via ConfigService
3. `reinitializeServices()` is called automatically
4. All services are recreated with new configuration
5. Renderer is notified of configuration update
6. UI reflects the new authentication state

### Solution 2: Lokka MCP Client Secret Requirement

#### Understanding Lokka MCP Authentication
Based on official Lokka documentation, the MCP server requires:
- `TENANT_ID` - Microsoft Entra tenant ID
- `CLIENT_ID` - Azure app registration client ID  
- `CLIENT_SECRET` - Azure app registration client secret

**Why Client Secret is Required:**
- Lokka uses **client credentials flow** for non-interactive authentication
- This flow is designed for server-to-server authentication
- Client credentials flow requires a client secret for security
- Interactive flows (which don't need client secret) aren't suitable for MCP servers

#### UI Enhancement
Added warning message in Entra Application Settings:
```tsx
{!localConfig.clientSecret && (
  <Alert severity="warning">
    <strong>Note:</strong> The Lokka MCP server for Microsoft Graph queries requires a Client Secret. 
    Without a Client Secret, you can still authenticate interactively, but Graph queries through the AI assistant will not work.
    To enable full functionality, please provide a Client Secret from your Azure app registration.
  </Alert>
)}
```

## User Experience Improvements

### Before the Fix:
1. ❌ User removes credentials from `.env.local`
2. ❌ User configures Entra settings through UI
3. ❌ Application still shows "No LLM available" 
4. ❌ Requires manual restart to pick up new config
5. ❌ Confusion about why Lokka MCP isn't working

### After the Fix:
1. ✅ User removes credentials from `.env.local`
2. ✅ User configures Entra settings through UI
3. ✅ Application automatically reinitializes services
4. ✅ LLM services become available immediately
5. ✅ Clear warning about Client Secret requirement
6. ✅ Test Connection button validates configuration

## Technical Details

### Service Reinitialization Process
```typescript
private async reinitializeServices(): Promise<void> {
  // 1. Get updated authentication configuration
  const authConfig = await this.getAuthConfiguration();
  
  // 2. Update main config object
  this.config.auth = { /* updated auth config */ };
  
  // 3. Update MCP server configuration  
  // 4. Recreate AuthService with new config
  // 5. Recreate GraphService with new AuthService
  // 6. Recreate MCP services with new auth
  // 7. Recreate LLM service with new MCP client
  // 8. Notify renderer of changes
}
```

### Configuration Precedence
1. **Stored Entra Config** (highest priority)
2. **Environment Variables** (fallback)
3. **Default Values** (last resort)

### MCP Server Configuration Logic
```typescript
const hasLokkaCreds = authConfig.clientSecret && authConfig.clientId && authConfig.tenantId;
const useExternalLokka = process.env.USE_EXTERNAL_LOKKA === 'true' || hasLokkaCreds;

// Lokka MCP server is only enabled when client secret is available
{
  name: 'external-lokka',
  enabled: Boolean(useExternalLokka), // Requires client secret
  env: {
    TENANT_ID: authConfig.tenantId,
    CLIENT_ID: authConfig.clientId,
    CLIENT_SECRET: authConfig.clientSecret // Required by Lokka
  }
}
```

## Alternative Solutions for Client Secret Requirement

### Option 1: Use Interactive Authentication (Current)
- User authenticates interactively for UI features
- Lokka MCP disabled without client secret
- Direct Microsoft Graph queries still work through AuthService

### Option 2: Hybrid Approach (Future Enhancement)
- Interactive authentication for UI
- Optional client credentials for MCP servers
- Graceful degradation when MCP unavailable

### Option 3: Different MCP Server (Alternative)
- Use a different MCP server that supports interactive auth
- Would require development of custom MCP server
- Not currently available in Lokka ecosystem

## Testing Instructions

### Test 1: Service Reinitialization
1. Remove all Entra credentials from `.env.local`
2. Restart application
3. Verify "No LLM service available" message appears
4. Open Settings → Entra Application Settings
5. Enter Client ID and Tenant ID
6. Click "Test Connection" (should work for public client)
7. Click "Save"
8. Verify services automatically become available
9. Verify no restart required

### Test 2: Lokka MCP with Client Secret
1. Add Client Secret to Entra configuration
2. Save configuration
3. Test Graph queries through AI assistant
4. Verify MCP trace shows successful Lokka calls

### Test 3: Lokka MCP without Client Secret
1. Remove Client Secret from Entra configuration
2. Save configuration  
3. Verify warning message appears
4. Test Graph queries through AI assistant
5. Verify MCP trace shows Lokka server not available

## Files Modified

- `src/main/main.ts` - Added service reinitialization logic
- `src/renderer/components/EnhancedSettingsDialog.tsx` - Added client secret warning
- `docs/CONFIGURATION-ISSUES-RESOLUTION.md` - This documentation

## Benefits

1. **Immediate Configuration Updates**: No restart required when changing Entra settings
2. **Clear Requirements**: Users understand what's needed for full functionality  
3. **Graceful Degradation**: App works with or without client secret
4. **Better UX**: Real-time feedback about configuration state
5. **Troubleshooting**: Clear error messages and warnings guide users
