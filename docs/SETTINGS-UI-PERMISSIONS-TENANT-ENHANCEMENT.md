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

5. **Application Credentials Permissions Display** (New):
   - Added dynamic permission display for Application Credentials mode
   - Shows current application permissions from the access token
   - Displays application-specific configuration details
   - Includes loading states and error handling similar to User Token mode
   - Provides guidance on configuring application permissions

## Application Credentials Permission Display Fix

### Issue
The Settings UI was not displaying permissions when Application Credentials mode was selected. Only a static warning message was shown, while the dynamic permission display was only available for User Token mode with Enhanced Graph Access enabled.

### Root Cause
The dynamic permission display logic in `EntraConfigForm` was only triggered when `localConfig.useGraphPowerShell` was true, which is only available in User Token mode. Application Credentials mode only showed a static warning without any actual permission information.

### Solution
1. **Added Application Credentials Permission Display**: Modified the UI to show dynamic permission information for Application Credentials mode similar to User Token mode
2. **Permission Loading Triggers**: Added permission loading when:
   - Application Credentials mode is selected in the radio button
   - Component is loaded with Application Credentials mode already selected
3. **Consistent UI Pattern**: Both authentication modes now use the same permission display pattern with mode-specific messaging

### Code Changes

#### EntraConfigForm Component Updates:
- **New Permission Display Block**: Added comprehensive permission status display for Application Credentials mode
- **Loading Triggers**: Added `useEffect` to load permissions when Application Credentials mode is selected
- **Mode Switch Handler**: Enhanced authentication mode change handler to load permissions when switching to Application Credentials

#### Features Added:
- **Dynamic Permission Status**: Shows actual application permissions from the access token
- **Configuration Details**: Displays Client ID, Tenant ID, and tenant display name
- **Loading States**: Proper loading indicators during permission retrieval
- **Error Handling**: Graceful fallback when permissions cannot be retrieved
- **Guidance**: Helpful messages about configuring application permissions

## Benefits

### For Users:
- **Transparency**: Users can see exactly what permissions are currently granted in both User Token and Application Credentials modes
- **Context**: Tenant display name provides human-readable context for the tenant ID
- **Accuracy**: Real-time permission data instead of static assumptions
- **Debugging**: Easier to troubleshoot permission issues with actual vs. expected permissions
- **Consistency**: Both authentication modes now show dynamic permission information

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
