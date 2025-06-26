# Settings UI Enhancement - Microsoft Graph Permissions and Tenant Display Name

## Overview
Updated the EntraPulse Lite settings UI to display actual current Microsoft Graph PowerShell client permissions and show the tenant display name next to the Tenant ID.

## Changes Made

### 1. Main Process Updates (src/main/main.ts)

#### Added New IPC Handlers:
- **`auth:getCurrentGraphPermissions`**: Retrieves actual current permissions from the access token
  - Decodes the JWT token to extract `scp` (delegated scopes) and `roles` (app permissions)
  - Returns the actual permissions currently granted to the Microsoft Graph PowerShell client
  - Provides more accurate permission information than static lists

- **`auth:getTenantInfo`**: Retrieves tenant information including display name
  - **Primary Source**: Microsoft Graph API `/organization` endpoint for tenant display name
  - **Secondary Source**: Token claims (`tenant_display_name` if available)
  - **Fallback**: Uses tenant ID if display name cannot be retrieved
  - **Best Practice**: Follows Microsoft Graph API pattern, avoiding incorrect usage of `tenant_region_scope`

#### TypeScript Fixes:
- Fixed type issues with environment variables by ensuring they default to empty strings
- Corrected MCP client call syntax to match the expected signature

### 2. Preload Script Updates (src/preload.js)

Added new IPC method exposures:
- `getCurrentGraphPermissions()`: Access to real-time permission data
- `getTenantInfo()`: Access to tenant information including display name

### 3. Settings UI Updates (src/renderer/components/EnhancedSettingsDialog.tsx)

#### State Management:
- Added `tenantInfo` state to track tenant ID, display name, loading, and error states
- Updated `loadGraphPermissions` to use the new `getCurrentGraphPermissions` IPC method
- Added `loadTenantInfo` function to fetch tenant information

#### Interface Updates:
- Updated `EntraConfigFormProps` to include `tenantInfo` parameter
- Modified component function signature and usage to pass tenant information

#### UI Enhancements:

1. **Tenant ID Field**:
   - Added tenant display name in the helper text
   - Format: "{Tenant Display Name} - The Directory (tenant) ID from your Azure app registration"

2. **Enhanced Graph Access Info Box**:
   - Updated "Tenant ID" display to show: "tenant-id-guid (Tenant Display Name)"
   - Added loading indicator while fetching tenant info

3. **Dynamic Permissions Status**:
   - Replaced static permissions warning with dynamic content
   - Shows actual current permissions from the token
   - Displays "Current access" with real granted permissions
   - Lists actual permissions requiring admin consent
   - Includes loading states and error handling

4. **Real-time Permission Display**:
   - "Granted" section shows actual permissions from the access token
   - "Requires admin consent" section shows the delta between available and granted permissions
   - More accurate than previous static lists

## Benefits

### For Users:
- **Transparency**: Users can see exactly what permissions are currently granted
- **Context**: Tenant display name provides human-readable context for the tenant ID
- **Accuracy**: Real-time permission data instead of static assumptions
- **Debugging**: Easier to troubleshoot permission issues with actual vs. expected permissions

### For Administrators:
- **Visibility**: Clear view of what permissions the Microsoft Graph PowerShell client actually has
- **Compliance**: Better understanding of data access scope
- **Management**: Easier to identify when admin consent is needed

## Technical Implementation

### Permission Retrieval:
1. Decodes JWT access token to extract claims
2. Processes `scp` claim for delegated permissions (space-separated string)
3. Processes `roles` claim for application permissions (array)
4. Combines and deduplicates permissions
5. Compares against required permissions list

### Tenant Information:
1. Extracts tenant ID from token `tid` claim
2. Attempts to get display name from various token claims
3. Falls back to Microsoft Graph API `/organization` endpoint
4. Gracefully handles cases where display name isn't available

### Error Handling:
- Graceful fallback when permissions can't be retrieved
- Loading states during API calls
- Error messages for failed operations
- Static fallback content when dynamic data isn't available

## Testing
- Built successfully with no TypeScript errors
- All IPC handlers properly implemented
- UI components updated with proper prop passing
- Error handling implemented throughout

## Future Enhancements
- Cache tenant information to reduce API calls
- Add refresh button for permissions
- Show permission descriptions/explanations
- Add permission request flow for missing permissions

### Tenant Information (Updated):
1. **Primary**: Microsoft Graph API `/organization` endpoint for authoritative tenant display name
2. **Secondary**: Token `tenant_display_name` claim (rare but valid when present)
3. **Fallback**: Tenant ID if neither above methods succeed
4. **Important**: Explicitly avoids using `tenant_region_scope` as display name (not a display name)
5. **Logging**: Enhanced logging shows the source of the display name (graph-api, token-claim, or fallback-tenantId)

This follows Microsoft Graph API best practices and patterns used in the [AzureADTenantID PowerShell module](https://github.com/darrenjrobinson/AzureADTenantID).
