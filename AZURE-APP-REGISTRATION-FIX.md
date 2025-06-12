# Azure App Registration Configuration Fix

## Problem
Getting authentication error: `AADSTS7000218: The request body must contain the following parameter: 'client_assertion' or 'client_secret'`

This error occurs when the Azure App Registration is configured as a **Web Application** or **Single-Page Application** instead of a **Public client/native (mobile & desktop)** application.

## Solution: Configure Azure App Registration Correctly

### Step 1: Check Current Configuration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Find your EntraPulse Lite app registration
4. Click on **Authentication** in the left sidebar

### Step 2: Fix Platform Configuration

#### Remove Incorrect Platform Types:
If you see **Web** or **Single-page application** platforms configured, remove them:
1. Click the **Delete** (trash) icon next to any Web or SPA platform configurations

#### Add Mobile and Desktop Platform:
1. Click **+ Add a platform**
2. Select **Mobile and desktop applications**
3. Check the following redirect URIs:
   - ✅ `https://login.microsoftonline.com/common/oauth2/nativeclient`
   - ✅ `http://localhost`
   - ✅ `urn:ietf:wg:oauth:2.0:oob` (optional)
4. Click **Configure**

### Step 3: Verify Authentication Settings

In the **Authentication** section, ensure:

#### Supported Account Types:
- Select **Accounts in this organizational directory only** (for single tenant)
- OR **Accounts in any organizational directory** (for multi-tenant)

#### Advanced Settings:
- ✅ **Allow public client flows**: **Yes** (IMPORTANT!)
- ✅ **Enable the following mobile and desktop flows**: **Yes**

#### Redirect URIs:
You should now see under **Mobile and desktop applications**:
```
http://localhost
https://login.microsoftonline.com/common/oauth2/nativeclient
```

### Step 4: API Permissions (if not already configured)

1. Go to **API permissions**
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Add the required permissions (e.g., `User.Read`, `Directory.Read.All`, etc.)
6. Click **Grant admin consent** if you have admin privileges

### Step 5: Copy Configuration Details

From the **Overview** page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

## Update Environment Variables

Update your `.env.local` file:

```bash
# Azure App Registration Details
MSAL_CLIENT_ID=your-application-client-id
MSAL_TENANT_ID=your-directory-tenant-id
# No MSAL_CLIENT_SECRET needed for public client
```

## Test the Configuration

After making these changes:

1. Restart the EntraPulse Lite application
2. Click **Sign in with Microsoft**
3. The authentication window should open
4. Complete the sign-in process
5. The window should close automatically upon success

## Why This Fix Works

### Public Client vs Confidential Client

**Public Client (Correct for Electron):**
- Cannot securely store secrets
- Uses PKCE for security
- Suitable for desktop and mobile apps
- No client secret required

**Confidential Client (Wrong for Electron):**
- Can securely store secrets
- Requires client secret or certificate
- Suitable for server-side web apps
- Requires `client_secret` or `client_assertion`

### OAuth 2.0 Flow Differences

**Public Client Flow:**
1. Authorization request with PKCE challenge
2. User authenticates in browser
3. Authorization code returned to redirect URI
4. Token exchange using authorization code + PKCE verifier

**Confidential Client Flow:**
1. Authorization request
2. User authenticates in browser
3. Authorization code returned to redirect URI
4. Token exchange using authorization code + client secret

## Common Issues and Solutions

### Issue: "Redirect URI mismatch"
**Solution:** Ensure `http://localhost` is configured in Azure AD

### Issue: "Invalid client type"
**Solution:** Enable "Allow public client flows" in Azure AD

### Issue: "PKCE required"
**Solution:** Our code already implements PKCE - ensure Azure AD is configured for public client

### Issue: "Cross-origin error"
**Solution:** Use "Mobile and desktop applications" platform, not "Single-page application"

## Verification Checklist

After configuration, verify:

- ✅ Platform type is "Mobile and desktop applications"
- ✅ "Allow public client flows" is enabled
- ✅ Redirect URI `http://localhost` is configured
- ✅ No client secret is configured (not needed for public client)
- ✅ Required API permissions are granted
- ✅ Environment variables are updated
- ✅ Application restarts successfully
- ✅ Authentication window opens when clicking sign-in
- ✅ Sign-in completes successfully

## Alternative: Use Microsoft Graph PowerShell App ID

If you don't want to create your own app registration, you can use Microsoft's public Graph PowerShell app:

```bash
# Use Microsoft Graph PowerShell public app
MSAL_CLIENT_ID=14d82eec-204b-4c2f-b7e8-296a70dab67e
MSAL_TENANT_ID=common
```

This app is pre-configured as a public client and has many Graph permissions already granted.

## Summary

The authentication error occurs because Azure AD expects a confidential client (with secret) but we're implementing a public client (without secret). The fix is to configure the Azure App Registration as a "Mobile and desktop applications" platform with "Allow public client flows" enabled.

This allows our Electron app to use the OAuth 2.0 authorization code flow with PKCE for secure authentication without requiring a client secret.
