# Authentication Mode Clarification Fix

## Issue Identified

The user correctly identified a major confusion in the EntraPulse Lite authentication system:

1. **UI showed "User Token (Delegated Permissions)"** was selected
2. **Custom Client ID and Tenant ID were configured** for a custom app registration
3. **But the application was actually using the Microsoft Graph PowerShell client ID** (`14d82eec-204b-4c2f-b7e8-296a70dab67e`)
4. **The token permissions came from Microsoft Graph PowerShell**, not the custom app registration

## Root Cause

The authentication logic in `src/main/main.ts` was designed to:
- Always use the Microsoft Graph PowerShell client ID when `useGraphPowerShell` (Enhanced Graph Access) is enabled
- Ignore any custom Client ID configuration when Enhanced Graph Access is active
- Not clearly communicate this override behavior to the user

## Solution Implemented

### 1. UI Clarification

Updated `EnhancedSettingsDialog.tsx` to clearly show three authentication modes:

#### **Basic User Token**
- Uses default Microsoft authentication
- No custom Client ID needed
- Permissions: `User.Read`, `profile`, `openid`, `email`

#### **Custom User Token** 
- Uses your custom app registration
- Requires Client ID + Tenant ID
- Permissions: Based on your app registration's delegated permissions
- **Only active when Enhanced Graph Access is disabled**

#### **Enhanced Graph Access**
- Uses Microsoft Graph PowerShell client ID (`14d82eec-204b-4c2f-b7e8-296a70dab67e`)
- Requires Tenant ID only
- **Overrides any custom Client ID configuration**
- Permissions: Broader delegated permissions from Microsoft Graph PowerShell

### 2. UI Changes Made

1. **Updated User Token description** to clarify what's actually being used:
   - Shows when Enhanced Graph Access is overriding custom Client ID
   - Explains which permissions are active
   - Clarifies the three different authentication modes

2. **Enhanced Graph Access section** now clearly states:
   - "Override any custom Client ID configuration"
   - Shows the Microsoft Graph PowerShell client ID being used
   - Warns that custom Client ID is ignored

3. **Client ID field** now shows:
   - When it's being ignored (Enhanced Graph Access enabled)
   - When it's being used (Enhanced Graph Access disabled)
   - Visual dimming when ignored

4. **Tenant ID field** clarifies:
   - Required for Enhanced Graph Access
   - Required for custom app authentication

5. **Status alerts** show exactly which client ID is active

### 3. Documentation Updates

Updated `INSTALLATION.md` to:
- Clearly list the three authentication modes
- Explain the override behavior of Enhanced Graph Access
- Clarify field requirements for each mode

## Result

Now the UI and documentation accurately reflect the actual authentication behavior:

- **Enhanced Graph Access ON**: Uses Microsoft Graph PowerShell client ID, ignores custom Client ID
- **Enhanced Graph Access OFF + Custom Client ID**: Uses custom app registration
- **Enhanced Graph Access OFF + No Client ID**: Uses default Microsoft authentication

The user interface now clearly communicates what's happening and prevents confusion about which client ID and permissions are actually being used.

## Technical Details

The authentication logic in `main.ts` was correct but poorly communicated. The fix focuses on:

1. **UI transparency**: Showing exactly which client ID is active
2. **Clear warnings**: When custom configuration is being overridden
3. **Visual indicators**: Dimming ignored fields
4. **Accurate descriptions**: Matching UI text to actual behavior

This ensures users understand the authentication hierarchy and can make informed decisions about which mode to use based on their permission requirements.
