# Token Cache and Permissions Fix - Testing Guide

## Issues Fixed

### 1. MSAL Token Cache Problem
**Problem:** When we changed scopes from specific permissions to `.default`, existing cached tokens still contained the old scopes. MSAL was using cached tokens with limited permissions instead of requesting fresh tokens with all granted permissions.

**Solution:** Added token cache clearing functionality:
- `clearTokenCache()` - Removes all cached accounts and tokens
- `forceReauthentication()` - Clears cache then performs fresh interactive authentication

### 2. Interactive Permissions Display Problem
**Problem:** The UI was hardcoded to show only "User.Read" for interactive authentication instead of extracting actual permissions from the JWT token.

**Solution:** Fixed the ChatComponent to use actual permissions from tokens for both authentication modes:
- Client credentials mode: Uses actual permissions from token
- Interactive mode: Now also uses actual permissions from token

## How to Test the Fix

### Method 1: Use the "Refresh Permissions" Button
1. **Sign in** to the application (if not already signed in)
2. **Look for the new "Refresh Permissions" button** in the Quick Tests section
3. **Click "Refresh Permissions"** - This will:
   - Clear the MSAL token cache
   - Force a fresh interactive authentication
   - Request new tokens with `.default` scope
   - Display the updated permissions

### Method 2: Manual Cache Clearing
You can also clear the cache manually via browser console:
```javascript
// Clear cache
await window.electronAPI.auth.clearTokenCache();

// Force fresh authentication
await window.electronAPI.auth.forceReauthentication();
```

## Expected Results After Testing

### Before Fix:
- **Permissions Display:** Only "User.Read"
- **Token Source:** Old cached token with specific scopes
- **Permission Source:** "Default" or "Configured"

### After Fix:
- **Permissions Display:** All delegated permissions from Azure App Registration:
  - `https://graph.microsoft.com/User.Read`
  - `https://graph.microsoft.com/User.ReadBasic.All`
  - `https://graph.microsoft.com/Directory.Read.All`
  - `https://graph.microsoft.com/Group.Read.All`
  - `https://graph.microsoft.com/Application.Read.All`
  - `https://graph.microsoft.com/AuditLog.Read.All`
  - And others as configured in your Azure App Registration
- **Token Source:** Fresh token with `.default` scope
- **Permission Source:** "From Token" (indicating actual permissions extracted from JWT)

## Debug Information to Look For

### In Browser Console:
1. **Cache Clearing Logs:**
   ```
   🧹 Clearing X cached accounts and tokens...
   Removed cached account: darren@nabifspoc.onmicrosoft.com
   ✅ Token cache cleared successfully
   ```

2. **Token Claims Debugging:**
   ```
   Available claims in token:
   - roles: undefined
   - scp: "User.Read Directory.Read.All Group.Read.All ..."
   - scope: undefined
   - scopes: undefined
   ```

3. **Permission Extraction:**
   ```
   Using actual permissions from interactive token: ["User.Read", "Directory.Read.All", "Group.Read.All", ...]
   ```

## Troubleshooting

### If Permissions Still Show Only "User.Read":
1. **Check browser console** for token debugging information
2. **Verify `.default` scope** is being used in requests
3. **Check Azure App Registration** - ensure delegated permissions are granted
4. **Try the "Refresh Permissions" button** to force cache clearing

### If "Refresh Permissions" Button Doesn't Work:
1. **Check browser console** for error messages
2. **Manually clear cache** using browser console commands
3. **Restart the application** and sign in fresh

### If Token Claims Don't Show Expected Permissions:
1. **Check Azure App Registration** permissions are properly granted
2. **Verify admin consent** has been provided for delegated permissions
3. **Check tenant configuration** - some permissions may require specific tenant settings

## Key Files Modified
- `src/auth/AuthService.ts` - Added cache clearing and debugging
- `src/main/main.ts` - Added IPC handlers for cache operations
- `src/preload.js` - Added cache clearing methods to API
- `src/types/assets.d.ts` - Added TypeScript types
- `src/renderer/components/ChatComponent.tsx` - Fixed permissions display and added button

## The Fix in Action

When you click "Refresh Permissions":
1. **Clear Cache:** All MSAL cached tokens are removed
2. **Fresh Auth:** New interactive authentication is performed
3. **New Token:** Fresh JWT token is received with `.default` scope
4. **Extract Permissions:** Actual permissions are extracted from the `scp` claim
5. **Update UI:** Permissions display is refreshed with all granted permissions

This ensures you get all the permissions that are actually granted to your Azure App Registration, not just the limited cached permissions from the old token.
