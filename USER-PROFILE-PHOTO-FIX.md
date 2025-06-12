# User Profile and Photo Fixes

## Issues Identified

### 1. Permissions Still Showing "User.Read"
**Root Cause:** Despite changing to `.default` scope, the token may still only contain basic permissions, or there may be an issue with token refresh/cache.

**Debugging Added:**
- Enhanced permission extraction logging to show all available claims in the JWT token
- Added logging for `roles`, `scp`, `scope`, and `scopes` claims

### 2. No Display Name (Just "User") 
**Root Cause:** The `getCurrentUser()` method was returning MSAL `AccountInfo` instead of calling Microsoft Graph API to get full user profile.

**Fix Applied:**
```typescript
// Before: Just returned MSAL account info
async getCurrentUser(): Promise<AccountInfo | null> {
  return this.account;
}

// After: Calls Graph API /me endpoint for full profile
async getCurrentUser(): Promise<any | null> {
  // Get valid token
  const token = await this.getToken();
  
  // Create Graph client and call /me
  const userProfile = await graphClient.api('/me').get();
  
  // Fallback to MSAL account if Graph API fails
  return userProfile || fallbackUser;
}
```

### 3. Profile Photo Not Working
**Root Cause Analysis from Error Messages:**
- **Beta endpoint:** "Resource not found for the segment 'beta'" - Beta endpoint may not be accessible
- **V1.0 endpoint:** "ErrorBadRequestInvalidTargetIdentity" - Issue with user identity resolution

**Potential Causes:**
1. **Insufficient Permissions:** May need `User.ReadBasic.All` or other permissions for photos
2. **User Identity Issue:** The user ID being passed may be invalid
3. **API Endpoint Access:** Beta endpoint may not be available with current permissions

## Expected Results After Fixes

### 1. Enhanced Debugging
**Console Logs Should Show:**
```
Decoded token payload: { ... }
Available claims in token:
- roles: [array of application permissions]
- scp: "space-separated delegated permissions"  
- scope: "alternative scope claim"
- scopes: [array format if present]
```

### 2. User Profile Display
**Before:** Shows "User" with no display name
**After:** Should show actual user display name from Graph API `/me` call

### 3. Photo Debugging
**Enhanced Error Details:** Now shows full error objects to identify exact photo fetch issues

## Testing Steps

### 1. Test User Profile
1. **Restart application** to get fresh tokens and profile data
2. **Sign in interactively**
3. **Check console logs** for:
   - "Retrieved user profile:" with full user data
   - User display name should appear instead of "User"

### 2. Test Permissions Debugging  
1. **Check browser console** for "Available claims in token"
2. **Verify token contents** - should show what permissions are actually in the token
3. **Compare with Azure AD** - see if token permissions match what's granted in app registration

### 3. Test Photo Fetch
1. **Look for detailed error information** in console
2. **Check specific error codes** to identify root cause
3. **Verify user identity** being passed to photo API

## Potential Next Steps

### If Permissions Still Show "User.Read"
1. **Check token claims** in console output
2. **Verify Azure App Registration** has delegated permissions properly granted  
3. **Force token refresh** by signing out and back in
4. **Check if admin consent** is required for organization-level permissions

### If Profile Still Shows "User"
1. **Check console** for "Retrieved user profile" log
2. **Verify Graph API call** is succeeding
3. **Check token permissions** for `/me` endpoint access

### If Photos Still Fail
1. **Review enhanced error details** for specific permission needs
2. **Test with basic Graph API calls** to verify connectivity
3. **Check user identity resolution** issue in V1.0 endpoint error

## Files Modified
- `src/auth/AuthService.ts`:
  - Updated `getCurrentUser()` to call Graph API `/me` endpoint
  - Enhanced `decodeTokenPermissions()` with detailed claim logging
  - Added fallback logic for profile retrieval

The application should now provide much better visibility into what's happening with permissions and user profile retrieval, making it easier to identify and resolve any remaining issues.
