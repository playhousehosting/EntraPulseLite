# PKCE Authentication Fix

## Issue Description

The interactive authentication flow was failing with the error:
```
AADSTS9002325: Proof Key for Code Exchange is required for cross-origin authorization code redemption.
```

This error occurs because Microsoft Entra ID requires PKCE (Proof Key for Code Exchange) for public clients using the authorization code flow, especially for cross-origin requests from Electron applications.

## What is PKCE?

PKCE (Proof Key for Code Exchange) is a security extension to OAuth 2.0 that prevents authorization code interception attacks. It's required for:
- Public clients (like Electron apps)
- Cross-origin authorization code flows
- Mobile and native applications

## Solution Implementation

### 1. Added PKCE Helper Methods

Added two helper methods to the `AuthService` class:

```typescript
/**
 * Generate a cryptographically random code verifier for PKCE
 */
private generateCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Generate code challenge from code verifier using SHA256
 */
private generateCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url');
}
```

### 2. Updated Authorization URL

Modified the authorization URL to include PKCE parameters:

```typescript
// Generate PKCE parameters for secure authentication
const codeVerifier = this.generateCodeVerifier();
const codeChallenge = this.generateCodeChallenge(codeVerifier);

const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
  `client_id=${clientId}&` +
  `response_type=code&` +
  `redirect_uri=${redirectUri}&` +
  `scope=${scopes}&` +
  `response_mode=query&` +
  `state=${state}&` +
  `code_challenge=${codeChallenge}&` +         // PKCE code challenge
  `code_challenge_method=S256&` +              // SHA256 method
  `prompt=select_account`;
```

### 3. Updated Token Exchange

Modified the token exchange request to include the code verifier:

```typescript
const tokenRequest = {
  scopes: this.config!.auth.scopes,
  code: code,
  redirectUri: 'http://localhost',
  codeVerifier: codeVerifier  // PKCE code verifier
};
```

### 4. Updated Method Signatures

Updated the `handleAuthRedirect` method to accept and pass the `codeVerifier`:

```typescript
private async handleAuthRedirect(
  url: string, 
  authWindow: BrowserWindow, 
  resolve: (value: AuthToken | null) => void, 
  reject: (reason?: any) => void,
  expectedState: string,
  codeVerifier: string  // Added PKCE code verifier
): Promise<void>
```

## How PKCE Works

1. **Code Verifier Generation**: A cryptographically random string (43-128 characters)
2. **Code Challenge Generation**: SHA256 hash of the code verifier, base64url-encoded
3. **Authorization Request**: Include `code_challenge` and `code_challenge_method=S256`
4. **Token Exchange**: Include the original `code_verifier` to prove ownership

## Security Benefits

- **Prevents Code Interception**: Even if the authorization code is intercepted, it cannot be exchanged for tokens without the code verifier
- **No Client Secret Required**: Public clients don't need to store secrets
- **Cross-Origin Protection**: Protects against cross-origin attacks
- **Replay Attack Prevention**: Each request uses a unique code verifier

## Files Modified

- `src/auth/AuthService.ts`: Added PKCE implementation
  - Added crypto imports (`createHash`, `randomBytes`)
  - Implemented `generateCodeVerifier()` and `generateCodeChallenge()` methods
  - Updated authorization URL to include PKCE parameters
  - Modified token exchange to include code verifier
  - Updated method signatures to pass code verifier

## Testing

After implementing PKCE:
1. Build the application: `npm run build`
2. Start the application: `npm run start`
3. Click "Sign in with Microsoft"
4. Complete the authentication flow in the browser window
5. Verify successful authentication without PKCE errors

## Technical Details

- **Code Verifier**: 32 random bytes encoded as base64url (43 characters)
- **Code Challenge Method**: S256 (SHA256)
- **Challenge Generation**: `base64url(sha256(code_verifier))`
- **State Parameter**: Timestamp-based for CSRF protection

## Next Steps

The authentication flow should now work properly with PKCE. Users will:
1. See a browser window open for Microsoft authentication
2. Complete their login (username, password, MFA if required)
3. Be redirected to localhost (which will fail to load, but that's expected)
4. The application will catch the authorization code and exchange it for tokens
5. Authentication will complete successfully

This fix ensures compliance with Microsoft's security requirements for public clients and provides a secure authentication experience for EntraPulse Lite users.
