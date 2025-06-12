# Interactive Authentication Permissions Display Fix

## Problem Identified
The application was showing only "User.Read" permissions for interactive authentication, even though the app was configured to request more scopes. The issue was that the `getAuthenticationInfoWithToken()` method was not extracting actual permissions from interactive authentication tokens.

## Root Cause Analysis

### Authentication Flow Differences
**Client Credentials (App-only):**
- Uses `roles` claim in JWT token
- Contains application permissions (e.g., `Directory.Read.All`)
- Was working correctly ✅

**Interactive Authentication (Delegated):**
- Uses `scp` or `scope` claim in JWT token  
- Contains delegated permissions (e.g., `User.Read Directory.Read.All`)
- Was NOT being extracted ❌

### Previous Behavior
```typescript
// Only extracted permissions for client credentials
if (this.useClientCredentials) {
  const actualPermissions = this.decodeTokenPermissions(token.accessToken);
  // ...
}
// Interactive auth just returned configured scopes, not actual token permissions
```

### Configured vs Actual Permissions
**App Configuration** (in `main.ts`):
```typescript
scopes: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All', 'Group.Read.All']
```

**What User Actually Consented To:**
- Likely only `User.Read` during sign-in
- Azure App Registration may not have all permissions granted
- User may have only consented to basic permissions

## Solution Implemented

### 1. Updated `getAuthenticationInfoWithToken()` Method
```typescript
// Now extracts actual permissions for BOTH auth modes
try {
  const token = await this.getToken();
  if (token?.accessToken) {
    const actualPermissions = this.decodeTokenPermissions(token.accessToken);
    return {
      ...basicInfo,
      actualPermissions,
      isAuthenticated: true // If we have a token, we're authenticated
    };
  }
} catch (error) {
  // Handle both auth modes appropriately
}
```

### 2. Enhanced `decodeTokenPermissions()` Method
```typescript
// For client credentials: Extract roles claim (application permissions)
const roles = decodedPayload.roles || [];
if (Array.isArray(roles) && roles.length > 0) {
  return roles;
}

// For interactive: Extract scp claim (delegated permissions/scopes)
const scopes = decodedPayload.scp || decodedPayload.scope || '';
if (typeof scopes === 'string' && scopes.length > 0) {
  return scopes.split(' ').filter(scope => scope.length > 0);
}
```

### 3. JWT Token Claims Reference
**Client Credentials Token:**
```json
{
  "roles": ["Directory.Read.All", "User.Read.All"],
  "aud": "https://graph.microsoft.com",
  "appid": "your-app-id"
}
```

**Interactive Token:**
```json
{
  "scp": "User.Read Directory.Read.All",
  "aud": "https://graph.microsoft.com", 
  "upn": "user@domain.com"
}
```

## Expected Results After Fix

### Before Fix:
- **Displayed:** "User.Read" (from configured scopes, not actual token)
- **Source:** Static configuration
- **Accuracy:** Potentially incorrect

### After Fix:
- **Displayed:** Actual permissions from JWT token (e.g., "User.Read", or "User.Read Directory.Read.All" if more were granted)
- **Source:** Live token extraction
- **Accuracy:** 100% accurate to what user actually has

## Why You Might Still See Only "User.Read"

Even with this fix, you might still see only "User.Read" if:

1. **Azure App Registration Missing Permissions:**
   - Your app registration doesn't have `Directory.Read.All` configured
   - Admin consent wasn't granted for org-level permissions

2. **User Consent Scope:**
   - User only consented to `User.Read` during sign-in
   - Didn't consent to broader permissions

3. **Permission Type Mismatch:**
   - Some permissions require admin consent
   - User can't consent to organization-level permissions

## How to Get More Permissions

### Option 1: Update Azure App Registration
1. Go to Azure Portal > App Registrations > Your App
2. Click **API permissions**
3. Add Microsoft Graph permissions:
   - `User.Read` (should already be there)
   - `User.ReadBasic.All` 
   - `Directory.Read.All`
   - `Group.Read.All`
4. Click **Grant admin consent** if you're an admin

### Option 2: Force Re-consent
Add `prompt=consent` to the authentication URL to force user to re-consent to all permissions.

## Testing the Fix

1. **Restart the application**
2. **Sign in again** (to get fresh token)
3. **Check the permissions display** - should now show actual token permissions
4. **Look at browser console** - should log "Decoded token payload" with actual JWT claims
5. **Verify accuracy** - permissions shown should match what's in the JWT token

## Files Modified
- `src/auth/AuthService.ts` - Enhanced permission extraction for both auth modes

The permissions display will now accurately reflect what's actually in your authentication token, not just the configured scopes!
