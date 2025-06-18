# LLM Service Availability Fix

## Issue Description

When users added a Client Secret to the Entra Application Settings, switching from interactive authentication to client-credentials mode, the LLM services became unavailable despite being properly configured. The error message "No LLM Service is available" appeared even though LLMs worked correctly before adding the Client Secret.

## Root Cause Analysis

The issue was caused by improper authentication context management during service reinitialization:

1. **Authentication Context Switching**: When switching from interactive to client-credentials mode, the ConfigService authentication context was not properly maintained
2. **Cloud Provider Configuration Loss**: During service reinitialization, cloud provider configurations were not preserved across authentication context changes
3. **Authentication Verification Reset**: The authentication verification flag was not properly set during reinitialization, causing the ConfigService to return safe defaults without cloud providers

## Technical Details

### Problem Flow
1. User adds Client Secret in Entra Application Settings
2. `saveEntraConfig` IPC handler calls `reinitializeServices()`
3. Authentication context switches from 'interactive' to 'client-credentials'
4. ConfigService returns default configuration without cloud providers
5. LLM service initializes without proper configuration
6. `isAvailable()` returns false due to missing API keys/configurations

### Code Changes Made

#### 1. Enhanced Service Reinitialization (`main.ts`)

**Before:**
```typescript
private async reinitializeServices(): Promise<void> {
  // Get updated authentication configuration
  const authConfig = await this.getAuthConfiguration();
  // ... direct service reinitialization without preserving configs
}
```

**After:**
```typescript
private async reinitializeServices(): Promise<void> {
  // Store current cloud provider configurations before context switch
  const currentCloudProviders = this.configService.getLLMConfig()?.cloudProviders;
  const currentDefaultProvider = this.configService.getDefaultCloudProvider();
  
  // Update authentication context BEFORE reinitializing other services
  const newAuthMode = hasLokkaCreds ? 'client-credentials' : 'interactive';
  this.configService.setAuthenticationContext(newAuthMode);
  
  // Restore cloud provider configurations if they exist
  if (currentCloudProviders && Object.keys(currentCloudProviders).length > 0) {
    const restoredConfig = this.configService.getLLMConfig();
    restoredConfig.cloudProviders = currentCloudProviders;
    if (currentDefaultProvider) {
      restoredConfig.defaultCloudProvider = currentDefaultProvider.provider;
    }
    this.configService.saveLLMConfig(restoredConfig);
  }
  // ... continue with service reinitialization
}
```

#### 2. Improved Initial Service Setup (`main.ts`)

**Before:**
```typescript
// Set initial authentication context (client-credentials mode)
this.configService.setAuthenticationContext('client-credentials');
```

**After:**
```typescript
// Set authentication context based on available credentials
const authMode = hasLokkaCreds ? 'client-credentials' : 'interactive';
console.log(`[Main] Setting initial authentication mode: ${authMode}`);
this.configService.setAuthenticationContext(authMode);
```

## Fix Implementation

### Key Components

1. **Configuration Preservation**
   - Store cloud provider configurations before authentication context changes
   - Restore configurations after context switch
   - Maintain default provider settings

2. **Authentication Context Management**
   - Dynamically determine authentication mode based on available credentials
   - Properly set authentication verification flags
   - Ensure context switches preserve user data

3. **Service Reinitialization Order**
   - Update ConfigService authentication context first
   - Restore cloud provider configurations
   - Then reinitialize other services (Auth, Graph, MCP, LLM)

### Logging and Debugging

Enhanced logging was added to track:
- Cloud provider configuration preservation
- Authentication context switches
- Service reinitialization steps
- Configuration restoration success

Example logs:
```
[Main] Preserving cloud providers during reinitialization: {
  hasCloudProviders: true,
  providerCount: 2,
  defaultProvider: 'azure-openai'
}
[Main] Switching authentication mode to: client-credentials
[Main] Cloud provider configurations restored successfully
```

## Testing Results

1. **Before Fix**: Adding Client Secret caused "No LLM Service is available" error
2. **After Fix**: LLM services remain available when switching authentication modes
3. **Preservation Test**: Cloud provider configurations are maintained across context switches
4. **Functionality Test**: Both interactive and client-credentials modes work correctly

## Benefits

1. **Seamless Mode Switching**: Users can add/remove Client Secrets without losing LLM configurations
2. **Enhanced User Experience**: No need to reconfigure LLM services when changing authentication modes
3. **Configuration Persistence**: All user settings are preserved during authentication context changes
4. **Reliable Service Availability**: LLM services remain consistently available across all authentication scenarios

## Future Considerations

1. **Configuration Backup**: Consider implementing automatic configuration backups before major context switches
2. **Migration Safety**: Add validation to ensure critical configurations are never lost during updates
3. **User Notification**: Provide user feedback when authentication mode changes affect service availability

## Related Files

- `src/main/main.ts` - Service initialization and reinitialization logic
- `src/shared/ConfigService.ts` - Authentication context and configuration management
- `src/llm/UnifiedLLMService.ts` - LLM service availability checking
- `src/llm/EnhancedLLMService.ts` - LLM service orchestration

## Implementation Date

June 18, 2025

## Status

✅ **COMPLETED** - LLM services now remain available when switching between interactive and client-credentials authentication modes.
