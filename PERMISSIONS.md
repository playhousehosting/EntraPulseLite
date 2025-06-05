# Progressive Permissions in EntraPulse Lite

EntraPulse Lite implements a progressive permissions model that starts with minimal permissions and requests additional access as needed. This approach improves the user experience and reduces permission-related failures.

## How It Works

### 1. Initial Authentication
When users first sign in, EntraPulse Lite only requests the most basic permission:
- `User.Read` - Allows reading the current user's profile

This permission is available to virtually all users and rarely requires admin consent.

### 2. Permission Tiers
The application defines several permission tiers for different scenarios:

```typescript
export const PERMISSION_TIERS = {
  BASIC: ['User.Read'],
  USER_MANAGEMENT: ['User.Read', 'User.ReadBasic.All'],
  DIRECTORY_READ: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All'],
  GROUP_MANAGEMENT: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All', 'Group.Read.All'],
  APPLICATION_READ: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All', 'Group.Read.All', 'Application.Read.All'],
};
```

### 3. Progressive Permission Requests
When a user tries to perform an action that requires additional permissions:

1. **Silent Check**: The app first tries to get a token with the required permissions silently
2. **Interactive Request**: If silent fails, it shows a consent prompt for the specific permissions needed
3. **Graceful Degradation**: If permissions are denied, the feature is disabled with a clear explanation

## Benefits

### For Users
- **Faster Initial Login**: No need to consent to extensive permissions upfront
- **Clear Context**: Permission requests happen when the feature is actually used
- **Progressive Trust**: Build confidence by starting with minimal access
- **Better UX**: Avoid permission-related login failures

### For Organizations
- **Reduced Admin Burden**: Basic functionality doesn't require admin consent
- **Security**: Only request permissions that are actually needed
- **Compliance**: Easier to audit what permissions are being used and why

## Examples

### Example 1: Basic Profile Access
```typescript
// Initial login - only requires User.Read
const token = await authService.login();
const profile = await graphService.query('/me');
```

### Example 2: Listing Users
```typescript
// When user tries to list all users
try {
  const users = await graphService.query('/users');
} catch (error) {
  if (error.message.includes('Insufficient permissions')) {
    // Show permission request UI
    const granted = await authService.requestAdditionalPermissions(['User.ReadBasic.All']);
    if (granted) {
      const users = await graphService.query('/users');
    }
  }
}
```

### Example 3: Advanced Directory Operations
```typescript
// For advanced operations like reading directory roles
const requiredPermissions = ['Directory.Read.All', 'RoleManagement.Read.Directory'];
const hasPermissions = await graphService.ensurePermissions(requiredPermissions);

if (hasPermissions) {
  const roles = await graphService.query('/directoryRoles');
} else {
  // Show fallback UI or explain why the feature is unavailable
}
```

## Implementation Details

### AuthService Methods

#### `login()`
- Requests only `User.Read` permission
- Uses Microsoft Graph PowerShell public client ID by default
- Minimal friction for initial authentication

#### `requestAdditionalPermissions(permissions: string[])`
- Requests specific additional permissions
- Shows consent prompt explaining what access is needed
- Returns updated token or null if denied

#### `getTokenWithPermissions(permissions: string[])`
- Silently checks if permissions are already available
- Returns token if available, null otherwise
- No user interaction

### GraphService Methods

#### `ensurePermissions(permissions: string[])`
- Automatically handles permission checking and requests
- Transparent to the calling code
- Returns boolean indicating success

#### `query(endpoint: string)`
- Automatically determines required permissions based on endpoint
- Requests permissions if needed
- Provides clear error messages for permission issues

## Configuration

### Environment Variables
```env
# Optional - for custom app registration
MSAL_CLIENT_ID=your_client_id_here
MSAL_TENANT_ID=your_tenant_id_here

# If not provided, uses Microsoft Graph PowerShell public client
# which supports interactive authentication without app registration
```

### Freemium Model Integration
- **Free Tier**: Uses progressive permissions with Microsoft Graph PowerShell client
- **Premium Tier**: Allows custom app registration with additional permissions
- **Enterprise**: Supports application permissions and advanced scenarios

## Best Practices

### 1. Start Small
Always begin with the minimum permissions needed for core functionality.

### 2. Context-Aware Requests
Request permissions when the user is actively trying to use a feature that requires them.

### 3. Clear Communication
Explain why additional permissions are needed and what they enable.

### 4. Graceful Degradation
Provide alternative functionality when permissions are denied.

### 5. Permission Caching
Remember granted permissions to avoid repeated consent prompts.

## Common Permission Scenarios

### Basic User Operations
- **Permission**: `User.Read`
- **Use Cases**: Current user profile, basic authentication
- **Admin Consent**: Not required

### Reading Other Users
- **Permission**: `User.ReadBasic.All`
- **Use Cases**: User directory, basic user information
- **Admin Consent**: May be required in some organizations

### Group Operations
- **Permission**: `Group.Read.All`
- **Use Cases**: Group membership, group properties
- **Admin Consent**: Usually required

### Application Data
- **Permission**: `Application.Read.All`
- **Use Cases**: App registrations, service principals
- **Admin Consent**: Required

### Directory Administration
- **Permission**: `Directory.Read.All`
- **Use Cases**: Organizational data, directory roles
- **Admin Consent**: Required

## Troubleshooting

### Permission Denied Errors
1. Check if the user has the required role in Azure AD
2. Verify if admin consent is required for the permission
3. Ensure the app registration (if custom) has the permission configured

### Consent Loop Issues
1. Clear browser cache and cookies
2. Check for conflicting app registrations
3. Verify redirect URIs are correctly configured

### Silent Token Acquisition Failures
1. Normal for new permissions - will trigger interactive consent
2. Check token expiration and refresh logic
3. Verify permission scope names are correct

## Migration Path

### From Full Permissions to Progressive
1. Identify minimum permissions for core functionality
2. Map features to required permissions
3. Implement permission checking before API calls
4. Add UI for permission requests
5. Test with users who have different permission levels

### Upgrading to Custom App Registration
1. Create app registration in Azure AD
2. Configure required permissions
3. Update environment variables
4. Test with different user roles
5. Submit for admin consent if needed
