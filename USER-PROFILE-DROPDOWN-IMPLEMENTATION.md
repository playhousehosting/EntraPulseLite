# User Profile Dropdown Implementation

## Overview

The user profile dropdown has been successfully implemented in EntraPulse Lite to display comprehensive user information when clicking the settings icon next to the logged-in user's name.

## Features Implemented

### 1. User Profile Dropdown Component (`UserProfileDropdown.tsx`)

**Features:**
- **User Avatar and Basic Info**: Displays profile picture, display name, email, job title, and department
- **Quick Info Chips**: Shows tenant ID snippet and permission count
- **Detailed Information Dialog**: Full view of all user details with categorized sections
- **Copy to Clipboard**: Quick copy functionality for email addresses
- **Security-First Design**: Uses server-side ID token parsing instead of client-side

**Information Displayed:**

#### Summary View (Dropdown)
- User profile avatar with photo
- Display name
- Email address with copy button
- Job title (if available)
- Department (if available)
- Tenant ID (first 8 characters)
- Permission count

#### Detailed View (Dialog)
1. **Microsoft Graph Profile**
   - Display Name
   - Email Address
   - User Principal Name
   - Object ID
   - Job Title
   - Department

2. **ID Token Claims**
   - Audience (aud)
   - Issuer (iss)
   - Tenant ID (tid)
   - Object ID (oid)
   - Issued At (iat)
   - Expires At (exp)
   - IP Address (ipaddr)
   - Token Version (ver)

3. **Authentication Info**
   - Token expiration time
   - Granted scopes/permissions
   - Client ID
   - Tenant ID

### 2. Enhanced Authentication Service

**New Method Added:**
```typescript
async getIdTokenClaims(): Promise<any | null>
```

- Securely parses JWT ID tokens server-side
- Returns all available claims from the ID token
- Proper error handling and validation
- Uses Node.js Buffer for secure base64 decoding

### 3. IPC Integration

**New IPC Handler:**
```typescript
ipcMain.handle('auth:getIdTokenClaims', async () => {
  try {
    return await this.authService.getIdTokenClaims();
  } catch (error) {
    console.error('Get ID token claims failed:', error);
    return null;
  }
});
```

**Preload Script Updated:**
```javascript
auth: {
  // ...existing methods...
  getIdTokenClaims: () => ipcRenderer.invoke('auth:getIdTokenClaims'),
}
```

### 4. ChatComponent Integration

**Updates:**
- Added state management for dropdown anchor element
- Added click handler for settings icon
- Integrated UserProfileDropdown component
- Updated tooltip text from "Settings" to "User Profile"
- **UI Optimization**: Cleaned up footer permissions panel for interactive users
  - Removed redundant "Current Permissions" section for interactive mode
  - Kept only Authentication Mode display for interactive users
  - Maintained full permissions display for client-credentials mode
  - Moved "Refresh Permissions" button to client-credentials mode only

## User Experience

### Accessing User Information
1. **Login**: User signs in with Microsoft account
2. **Profile Display**: User's name and avatar appear in top-right corner
3. **Settings Icon**: Click the settings icon next to the user's name
4. **Dropdown**: Quick summary view with essential information
5. **Details**: Click "View Full Details" for comprehensive information

### UI Optimization by Authentication Mode

**Interactive Mode (User Login):**
- Clean, minimal footer showing only Authentication Mode
- All permission details accessible via user profile dropdown
- Quick test buttons for common Graph API operations
- No redundant permission display in footer

**Client-Credentials Mode (Application):**
- Full permissions display in footer for transparency
- "Refresh Permissions" button for token refresh
- Detailed permission source indicators
- Comprehensive debugging information

### Security Considerations
- ID token parsing is performed server-side for security
- Sensitive information is only accessible through secure IPC channels
- No client-side JWT manipulation or storage
- All token claims are validated before display

### Information Hierarchy
1. **Primary**: Display name, email, profile picture
2. **Secondary**: Job title, department, basic tenant info
3. **Detailed**: Full token claims, authentication details, permissions

## Technical Implementation

### Component Structure
```
ChatComponent
├── UserProfileAvatar (displays user info)
├── Settings IconButton (triggers dropdown)
└── UserProfileDropdown
    ├── Quick Summary View
    └── Detailed Information Dialog
        ├── Graph Profile Section
        ├── ID Token Claims Section
        └── Authentication Info Section
```

### Data Flow
1. User authentication generates ID token
2. AuthService stores token securely
3. ChatComponent fetches user profile via Graph API
4. UserProfileDropdown requests ID token claims via IPC
5. AuthService parses token server-side and returns claims
6. Component displays information in organized sections

### Error Handling
- Graceful fallback if ID token claims unavailable
- Client-side parsing fallback for compatibility
- Proper error logging and user feedback
- Safe handling of missing user information

## Benefits

1. **Transparency**: Users can see exactly what information the app has access to
2. **Debugging**: Developers and users can verify authentication details
3. **Security**: All sensitive operations performed server-side
4. **Usability**: Easy access to user information without navigation
5. **Compliance**: Clear visibility into data access and permissions
6. **Clean UI**: Reduces footer clutter for interactive users while maintaining functionality
7. **Context-Aware**: Different UI behavior based on authentication mode

## Future Enhancements

Potential improvements for future versions:
- Export user information functionality
- Theme preference settings in dropdown
- Recent activity summary
- Permission management interface
- Multi-tenant account switching

## Testing

The implementation has been tested with:
- ✅ Successful authentication flow
- ✅ Profile picture loading
- ✅ ID token claim parsing
- ✅ Dropdown interaction
- ✅ Detailed dialog functionality
- ✅ Copy to clipboard features
- ✅ Error handling scenarios

## Files Modified

1. **New Files:**
   - `src/renderer/components/UserProfileDropdown.tsx`

2. **Modified Files:**
   - `src/auth/AuthService.ts` - Added `getIdTokenClaims()` method
   - `src/main/main.ts` - Added IPC handler
   - `src/preload.js` - Added IPC method exposure
   - `src/renderer/components/ChatComponent.tsx` - Integrated dropdown

The user profile dropdown is now fully functional and provides comprehensive user information display with a focus on security and usability.
