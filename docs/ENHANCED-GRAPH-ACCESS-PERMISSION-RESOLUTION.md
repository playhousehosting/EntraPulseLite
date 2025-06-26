# Enhanced Graph Access Permission Resolution

## Issue Summary

When using Enhanced Graph Access mode in EntraPulse Lite, users may encounter "Access is denied" (403) errors when attempting to access Microsoft Graph APIs that require sensitive permissions like Mail.Read, Mail.ReadWrite, Calendars.Read, etc.

This occurs because the Microsoft Graph PowerShell client ID (`14d82eec-204b-4c2f-b7e8-296a70dab67e`) requires admin consent for delegated permissions that access sensitive user data.

## Root Cause

1. **Enhanced Graph Access mode** uses the well-known Microsoft Graph PowerShell client ID
2. This client ID provides broader API access but requires **admin consent** for sensitive delegated permissions
3. Even though it's a first-party Microsoft application, many organizations require explicit admin consent for mail/calendar access
4. The requested scopes include:
   - `https://graph.microsoft.com/User.Read`
   - `https://graph.microsoft.com/Mail.Read`
   - `https://graph.microsoft.com/Mail.ReadWrite`
   - `https://graph.microsoft.com/Calendars.Read`
   - `https://graph.microsoft.com/Files.Read.All`
   - `https://graph.microsoft.com/Directory.Read.All`

## Error Detection and User Guidance

### Enhanced Error Handling

The application now includes intelligent error detection that specifically identifies Graph API permission errors and provides actionable guidance:

```typescript
// Enhanced error detection in EnhancedLLMService.ts
if (text.includes('Access is denied') || 
    text.includes('ErrorAccessDenied') || 
    (text.includes('statusCode":403') && text.includes('graph.microsoft.com'))) {
  
  throw new Error(`🔐 **Enhanced Graph Access Permission Error**
  
  The Microsoft Graph PowerShell client ID requires admin consent for mail and calendar permissions.
  
  **To resolve this issue:**
  
  1. **Admin Consent Required**: Contact your Azure AD administrator...
  2. **Admin Consent URL**: Use this URL to grant consent...
  3. **Alternative**: Disable Enhanced Graph Access...`);
}
```

### UI Warnings

The Enhanced Settings Dialog now includes prominent warnings about admin consent requirements:

- **Warning Alert**: Displays when Enhanced Graph Access is enabled, explaining the admin consent requirement
- **Information Panel**: Shows the client ID being used and required permissions
- **Test Connection**: Indicates which authentication mode is being tested

## Resolution Steps

### Option 1: Admin Consent (Recommended)

1. **Contact your Azure AD Administrator** to request admin consent for the Microsoft Graph PowerShell application
2. **Required Permissions** (delegated):
   - Mail.Read
   - Mail.ReadWrite
   - Calendars.Read
   - Files.Read.All
   - Directory.Read.All
3. **Admin Consent URL**:
   ```
   https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=14d82eec-204b-4c2f-b7e8-296a70dab67e&response_type=code&scope=https://graph.microsoft.com/Mail.Read%20https://graph.microsoft.com/Mail.ReadWrite%20https://graph.microsoft.com/Calendars.Read%20https://graph.microsoft.com/Files.Read.All%20https://graph.microsoft.com/Directory.Read.All&response_mode=query&state=12345&prompt=admin_consent
   ```

### Option 2: Disable Enhanced Graph Access

1. Open **LLM Settings** → **Authentication**
2. Disable the **Enhanced Graph Access** toggle
3. Click **Update** to save changes
4. Use your own app registration with pre-consented permissions

### Option 3: Use Application Credentials

1. Switch to **Application Credentials** mode if available
2. Provide your client secret
3. This uses application permissions instead of delegated permissions

## Implementation Details

### Code Changes Made

1. **Error Detection**: Added specific handling for Graph API 403 errors in `src/llm/EnhancedLLMService.ts`
2. **User Guidance**: Enhanced error messages with step-by-step resolution instructions
3. **UI Warnings**: Added admin consent warning in authentication settings
4. **Documentation**: Created comprehensive troubleshooting guide

### Authentication Flow

When Enhanced Graph Access is enabled:

1. Application acquires token using Microsoft Graph PowerShell client ID
2. Token includes requested delegated scopes
3. Token is passed to Lokka MCP server via `ACCESS_TOKEN` environment variable
4. Lokka MCP uses the provided token for Graph API calls
5. If permissions are not consented, Graph API returns 403 error
6. Application detects error and provides user guidance

## Testing and Validation

### Test Scenarios

1. **Basic Profile Access**: `/me` endpoint should work (User.Read is typically consented)
2. **Mail Access**: `/me/messages` will fail without admin consent
3. **Calendar Access**: `/me/events` will fail without admin consent
4. **File Access**: `/me/drive/root/children` will fail without admin consent

### Expected Behaviors

- **With Admin Consent**: All Graph API calls succeed, full functionality available
- **Without Admin Consent**: Profile data works, but mail/calendar queries return helpful error messages
- **Error Handling**: Users receive clear guidance on how to resolve permission issues

## Security Considerations

- **Principle of Least Privilege**: Only request permissions that are actually needed
- **Admin Consent**: Ensures organizational control over sensitive data access
- **Token Handling**: Tokens are securely managed and not logged or exposed
- **Fallback Options**: Users can disable Enhanced Graph Access if needed

## Future Enhancements

1. **Dynamic Permission Detection**: Detect which specific permissions are missing
2. **Self-Service Options**: Guide users through self-service consent where possible
3. **Permission Scoping**: Allow users to select which permissions they need
4. **Alternative Client IDs**: Support for organization-specific client IDs with pre-consented permissions

## Related Documentation

- [Enhanced Graph Access Implementation](./ENHANCED-GRAPH-ACCESS-IMPLEMENTATION-COMPLETE.md)
- [Microsoft Graph PowerShell Documentation](https://docs.microsoft.com/en-us/powershell/microsoftgraph/)
- [Azure AD Admin Consent](https://docs.microsoft.com/en-us/azure/active-directory/manage-apps/grant-admin-consent)
