# Permission and Profile Photo Fixes

## Issues Identified

### 1. Permissions Showing Only "User.Read"
**Problem:** Interactive authentication was only showing "User.Read" permission despite many delegated permissions being granted in Azure App Registration.

**Root Cause:** The application was requesting specific scopes during interactive authentication instead of using `.default` scope to inherit all pre-consented permissions from the app registration.

**Previous Configuration:**
```typescript
scopes: hasLokkaCreds 
  ? ['https://graph.microsoft.com/.default'] // Client credentials flow
  : ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All', 'Group.Read.All'] // Interactive flow - SPECIFIC SCOPES
```

**Fix Applied:**
```typescript
scopes: hasLokkaCreds 
  ? ['https://graph.microsoft.com/.default'] // Client credentials flow
  : ['https://graph.microsoft.com/.default'] // Interactive flow using .default to inherit all app registration permissions
```

### 2. Profile Photo Fetch Failing
**Problem:** Profile photo retrieval was failing with "Unknown error" messages for both beta and v1.0 endpoints.

**Root Cause Analysis:**
1. **Insufficient Error Details:** Error logging was not showing the actual error details
2. **Scope Issues:** Potentially related to the specific scopes vs .default scope issue
3. **Permission Requirements:** Profile photos might need broader permissions than just `User.Read`

**Fix Applied:**
1. **Enhanced Error Logging:** Added detailed error logging to ProfilePhotoService
2. **Scope Fix:** Changed to `.default` scope which should include all necessary permissions
3. **Better Debugging:** Added full error object logging to identify the exact issue

## Expected Results After Fixes

### 1. Permissions Display
**Before:** Shows only "User.Read" regardless of app registration permissions
**After:** Should show all the delegated permissions that are granted in the Azure App Registration:
- Application.Read.All
- AuditLog.Read.All  
- Directory.Read.All
- email
- Group.Read.All
- IdentityRiskEvent.Read.All
- offline_access
- openid
- profile
- RoleManagement.Read.Directory

### 2. Profile Photo Fetch
**Before:** Failing with "Unknown error"
**After:** Should work properly with enhanced error details if it still fails

## Why .default Scope is Better

### Specific Scopes (Previous Approach)
- ❌ **User Consent Required:** User must individually consent to each scope during sign-in
- ❌ **Limited by User:** User might not consent to all scopes
- ❌ **Inconsistent:** Different users might have different permissions
- ❌ **Admin-Required Scopes:** Some permissions require admin consent and can't be user-consented

### .default Scope (New Approach)  
- ✅ **Pre-Consented:** Uses all permissions already granted in app registration
- ✅ **Admin-Controlled:** Permissions are managed centrally in Azure AD
- ✅ **Consistent:** All users get the same permissions (what's granted to the app)
- ✅ **No User Prompts:** No additional consent prompts for users

## Testing Steps

### 1. Test Permission Display
1. **Restart application** to get fresh tokens with .default scope
2. **Sign in interactively** 
3. **Check permissions display** - should now show multiple permissions instead of just "User.Read"
4. **Check browser console** - should log decoded token payload with all permissions

### 2. Test Profile Photo
1. **Sign in and navigate** to where profile photos are displayed
2. **Check browser console** for detailed error messages if photos still fail
3. **Look for specific error details** that will help identify the root cause

## Files Modified
- `src/main/main.ts` - Changed interactive auth scopes to use `.default`
- `src/shared/ProfilePhotoService.ts` - Enhanced error logging with full error details

## Troubleshooting

If permissions still show only "User.Read":
1. **Check token decoding** - look at browser console for "Decoded token payload"
2. **Verify Azure App Registration** - ensure delegated permissions are properly granted
3. **Check token source** - ensure using interactive auth, not client credentials

If profile photos still fail:
1. **Check enhanced error logs** in browser console
2. **Verify permissions** - photos might need specific permissions like `User.ReadBasic.All`
3. **Test with .default scope** - should have all necessary permissions now

The combination of using `.default` scope and enhanced error logging should resolve both issues and provide better visibility into any remaining problems.
