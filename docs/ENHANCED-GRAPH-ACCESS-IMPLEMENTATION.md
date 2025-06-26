# Enhanced Graph Access Implementation

## Overview

This document describes the implementation of the "Enhanced Graph Access" feature in EntraPulse Lite, which allows users to toggle between standard user token authentication and enhanced delegated access using the Microsoft Graph PowerShell well-known client ID.

## Feature Description

The Enhanced Graph Access toggle provides users with the ability to use the Microsoft Graph PowerShell client ID (`14d82eec-204b-4c2f-b7e8-296a70dab67e`) for broader delegated access permissions. This is particularly useful for scenarios requiring access to resources like mailboxes or other Microsoft Graph endpoints that may have more restrictive permissions with standard app registrations.

## Implementation Details

### UI Changes

**File: `src/renderer/components/EnhancedSettingsDialog.tsx`**

1. **Added Enhanced Graph Access Toggle**: A new toggle in the User Token authentication mode section
2. **Dynamic Description**: The User Token mode description changes based on the toggle state
3. **Conditional Display**: The toggle is only available when using User Token authentication mode
4. **Alert Messages**: Added informational alerts to explain the feature
5. **Dynamic Test Button**: Test Connection button shows which authentication mode is being tested
6. **Configuration Notes**: Clear indication that changes take effect immediately without restart

Key UI changes:
- Added `useGraphPowerShell` state management
- Toggle component with proper labels and descriptions
- Info alerts explaining the benefits and behavior
- Dynamic description based on toggle state
- Test button text shows the mode being tested ("Test Enhanced Graph Access Connection")
- Configuration alerts explaining immediate effect

### Backend Configuration

**File: `src/types/index.ts`**

Added the `useGraphPowerShell?: boolean` property to the `EntraConfig` interface to persist the user's choice.

**File: `src/shared/ConfigService.ts`**

Updated the `saveEntraConfig` method to persist the `useGraphPowerShell` setting along with other Entra configuration.

### Authentication Logic

**File: `src/main/main.ts`**

1. **getAuthConfiguration Method**: Already properly handles the Enhanced Graph Access setting by returning the Microsoft Graph PowerShell client ID when enabled

2. **Login Handler (auth:login)**: Updated Lokka MCP server configuration logic to:
   - Check if Enhanced Graph Access is enabled
   - Use Microsoft Graph PowerShell client ID (`14d82eec-204b-4c2f-b7e8-296a70dab67e`) when enabled
   - Set `USE_CLIENT_TOKEN=true` for delegated authentication
   - Omit `CLIENT_SECRET` for delegated mode

3. **Initialization (initializeAuthenticationState)**: Applied the same logic for app startup when existing authentication is detected

4. **Test Configuration (auth:testConfiguration)**: **FIXED** - Now respects the user's authentication mode choice:
   - Tests Enhanced Graph Access mode when `useGraphPowerShell` is enabled
   - Uses correct client ID and scopes based on the selected mode
   - Provides detailed logging of which mode is being tested

5. **Service Reinitialization (reinitializeServices)**: **FIXED** - Now applies Enhanced Graph Access logic:
   - Updates Lokka MCP server configuration when settings change
   - No app restart required - changes take effect immediately
   - Proper configuration of client ID and authentication mode

### Lokka MCP Server Integration

The Lokka MCP server configuration automatically adapts based on the Enhanced Graph Access setting:

**When Enhanced Graph Access is ENABLED (and not in Application Credentials mode):**
- Client ID: `14d82eec-204b-4c2f-b7e8-296a70dab67e` (Microsoft Graph PowerShell)
- Authentication Mode: Delegated (`USE_CLIENT_TOKEN=true`)
- Client Secret: Not used
- Scopes: Uses `user_impersonation` scope for broader access
- **Immediate Effect**: No restart required, MCP server restarts automatically

**When Enhanced Graph Access is DISABLED:**
- Client ID: User's configured client ID or default
- Authentication Mode: Based on available credentials
- Client Secret: Used if available (application credentials mode)
- Scopes: Standard delegated permissions

## Key Implementation Logic

### Environment Variable Configuration

```typescript
// Enhanced Graph Access mode
if (storedEntraConfig.useGraphPowerShell && 
    this.configService.getAuthenticationPreference() !== 'application-credentials') {
  clientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell client ID
  authMode = 'delegated';
  env.CLIENT_ID = clientId;
  env.USE_CLIENT_TOKEN = 'true';
  // No CLIENT_SECRET in delegated mode
}
```

### Authentication Configuration

```typescript
// getAuthConfiguration method
if (storedEntraConfig.useGraphPowerShell && !storedEntraConfig.useApplicationCredentials) {
  return {
    clientId: '14d82eec-204b-4c2f-b7e8-296a70dab67e', // Microsoft Graph PowerShell client ID
    tenantId: storedEntraConfig.tenantId,
    clientSecret: undefined // No client secret for Graph PowerShell delegated access
  };
}
```

### Test Configuration

```typescript
// Test configuration now respects user's mode choice
if (testConfig.useGraphPowerShell && !testConfig.useApplicationCredentials) {
  clientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell client ID
  useClientCredentials = false; // Force delegated mode
  scopes = ['https://graph.microsoft.com/user_impersonation']; // Use user_impersonation scope
}
```

## User Experience

1. **Settings Configuration**: Users can enable Enhanced Graph Access in Settings → Authentication → User Token mode
2. **Visual Feedback**: The UI clearly indicates when Enhanced Graph Access is enabled
3. **Immediate Application**: Changes take effect immediately without requiring app restart
4. **Test Connection**: Tests the correct authentication mode based on user selection
5. **Dynamic Button Text**: Test button shows "Test Enhanced Graph Access Connection" when enabled
6. **Persistent**: The setting is saved and restored across app sessions

## Benefits

- **Broader Access**: Access to mailboxes and other Microsoft Graph resources
- **No App Registration Required**: Uses the well-known Microsoft Graph PowerShell client ID
- **Seamless Integration**: Works transparently with existing Lokka MCP functionality
- **User Control**: Users can toggle the feature on/off as needed
- **Immediate Effect**: No restart required, configuration updates automatically
- **Proper Testing**: Test Connection validates the selected authentication mode

## Fixes Implemented

### Issue 1: Test Connection Testing Wrong Mode
**Problem**: Test Connection was always testing Application Credentials mode when a client secret was present, ignoring the user's mode selection.

**Solution**: Updated `auth:testConfiguration` handler to respect the user's authentication mode choice and Enhanced Graph Access setting.

### Issue 2: Configuration Changes Not Applied to MCP Server
**Problem**: Lokka MCP server configuration wasn't updating when Enhanced Graph Access setting changed, requiring app restart.

**Solution**: Updated `reinitializeServices` method to apply Enhanced Graph Access logic and automatically restart MCP server with new configuration.

### Issue 3: UI Positioning and Feedback
**Problem**: Enhanced Graph Access section wasn't immediately under User Token option, and no clear indication of when changes take effect.

**Solution**: Improved UI layout, added configuration notes about immediate effect, and enhanced test button to show which mode is being tested.

## Testing

To test the Enhanced Graph Access feature:

1. Open Settings → Authentication
2. Select "User Token" authentication mode
3. Enable the "Enhanced Graph Access" toggle
4. Click "Test Enhanced Graph Access Connection" to verify the configuration
5. Save settings (changes take effect immediately)
6. Test queries that require broader permissions (e.g., mailbox access)
7. Verify in logs that the Microsoft Graph PowerShell client ID is being used

## Technical Notes

- The feature only applies to User Token authentication mode
- Application Credentials mode continues to use the configured client ID and secret
- The Lokka MCP server automatically adapts its authentication method based on the setting
- All existing functionality remains compatible and unchanged when the feature is disabled
- No app restart is required - configuration changes are applied immediately

## Security Considerations

- Uses the official Microsoft Graph PowerShell client ID
- No additional client secrets or credentials required
- Follows Microsoft's recommended practices for delegated access
- User consent is still required for accessing resources
