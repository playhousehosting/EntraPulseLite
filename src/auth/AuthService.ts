// Authentication service using MSAL for Electron
import { PublicClientApplication, Configuration, AuthenticationResult, LogLevel } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthToken, User } from '../types';

export class AuthService {
  private msalClient: PublicClientApplication;
  private config: Configuration;
  constructor() {
    // Use Microsoft Graph PowerShell public client ID for interactive login
    // This allows users to authenticate without requiring their own App Registration
    const clientId = process.env.MSAL_CLIENT_ID && process.env.MSAL_CLIENT_ID.trim() !== '' 
      ? process.env.MSAL_CLIENT_ID 
      : '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell
    
    const authority = process.env.MSAL_TENANT_ID && process.env.MSAL_TENANT_ID.trim() !== ''
      ? `https://login.microsoftonline.com/${process.env.MSAL_TENANT_ID}`
      : 'https://login.microsoftonline.com/common';

    console.log(`Using MSAL Client ID: ${clientId}`);
    console.log(`Using Authority: ${authority}`);

    this.config = {
      auth: {
        clientId,
        authority,
      },
      system: {
        loggerOptions: {
          loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
            if (containsPii) return;
            console.log(`[MSAL ${level}]: ${message}`);
          },
          piiLoggingEnabled: false,
          logLevel: LogLevel.Info,
        },
      },
    };

    this.msalClient = new PublicClientApplication(this.config);  }  async login(useRedirectFlow = false): Promise<AuthToken> {
    try {
      // Start with minimal permissions that most users should have
      const authRequest = {
        scopes: [
          'User.Read', // Read current user's profile - basic permission
        ],
        openBrowser: async (url: string) => {
          // In Electron, we can use shell.openExternal to open the browser
          const { shell } = await import('electron');
          await shell.openExternal(url);
        },
        // Use system browser for redirect flow
        // This is more compatible with mobile authentication flows
        redirectUri: useRedirectFlow ? 'https://login.microsoftonline.com/common/oauth2/nativeclient' : undefined,
        successTemplate: `
          <html>
            <head><title>Authentication Successful</title></head>
            <body>
              <h1>Authentication Successful!</h1>
              <p>You can now close this window and return to EntraPulse Lite.</p>
              <script>window.close();</script>
            </body>
          </html>
        `,
        errorTemplate: `
          <html>
            <head><title>Authentication Failed</title></head>
            <body>
              <h1>Authentication Failed</h1>
              <p>Please try again. You can close this window and return to EntraPulse Lite.</p>
              <script>window.close();</script>
            </body>
          </html>
        `
      };

      console.log('Starting authentication with minimal permissions...');
      const response: AuthenticationResult = await this.msalClient.acquireTokenInteractive(authRequest);
      console.log('Authentication successful with basic permissions!');
      
      return this.mapToAuthToken(response);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async requestAdditionalPermissions(permissions: string[]): Promise<AuthToken | null> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      if (accounts.length === 0) {
        throw new Error('No authenticated account found. Please log in first.');
      }

      const authRequest = {
        scopes: permissions,
        account: accounts[0],
        forceRefresh: false,
      };

      console.log(`Requesting additional permissions: ${permissions.join(', ')}`);
      
      // Try silent request first
      try {
        const response = await this.msalClient.acquireTokenSilent(authRequest);
        console.log('Additional permissions granted silently');
        return this.mapToAuthToken(response);
      } catch (silentError) {
        console.log('Silent request failed, requiring interactive consent');
        
        // If silent fails, request interactively
        const interactiveRequest = {
          ...authRequest,
          openBrowser: async (url: string) => {
            const { shell } = await import('electron');
            await shell.openExternal(url);
          },
          prompt: 'consent', // Force consent to show permissions
        };

        const response = await this.msalClient.acquireTokenInteractive(interactiveRequest);
        console.log('Additional permissions granted interactively');
        return this.mapToAuthToken(response);
      }
    } catch (error) {
      console.error('Failed to request additional permissions:', error);
      return null;
    }
  }

  async getTokenWithPermissions(permissions: string[]): Promise<AuthToken | null> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      if (accounts.length === 0) {
        return null;
      }

      const authRequest = {
        scopes: permissions,
        account: accounts[0],
      };

      const response = await this.msalClient.acquireTokenSilent(authRequest);
      return this.mapToAuthToken(response);
    } catch (error) {
      console.log(`Token with permissions [${permissions.join(', ')}] not available silently`);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      for (const account of accounts) {
        await this.msalClient.getTokenCache().removeAccount(account);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      throw new Error('Logout failed');
    }
  }

  async getToken(): Promise<AuthToken | null> {
    try {
      const accounts = await this.msalClient.getTokenCache().getAllAccounts();
      if (accounts.length === 0) {
        return null;
      }

      const authRequest = {
        scopes: ['User.Read'],
        account: accounts[0],
      };

      const response = await this.msalClient.acquireTokenSilent(authRequest);
      return this.mapToAuthToken(response);
    } catch (error) {
      console.error('Token retrieval failed:', error);
      return null;
    }
  }  async getCurrentUser(): Promise<User | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      // Create a temporary Graph client to make the API call
      const client = Client.init({
        authProvider: async (done: (error: any, accessToken: string | null) => void) => {
          done(null, token.accessToken);
        }
      });

      // Call Microsoft Graph API to get user profile
      const response = await client.api('/me').get();
      
      return {
        id: response.id,
        displayName: response.displayName,
        mail: response.mail || response.userPrincipalName,
        userPrincipalName: response.userPrincipalName,
        jobTitle: response.jobTitle,
        department: response.department,
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  private mapToAuthToken(response: AuthenticationResult): AuthToken {
    return {
      accessToken: response.accessToken,
      idToken: response.idToken || '',
      expiresOn: response.expiresOn || new Date(),
      scopes: response.scopes || [],
    };
  }
}
