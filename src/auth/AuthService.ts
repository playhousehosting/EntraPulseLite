// Authentication service using MSAL for Electron
import { PublicClientApplication, Configuration, AuthenticationResult, LogLevel } from '@azure/msal-node';
import { AuthToken, User } from '../types';

export class AuthService {
  private msalClient: PublicClientApplication;
  private config: Configuration;

  constructor() {
    this.config = {
      auth: {
        clientId: process.env.MSAL_CLIENT_ID || '',
        authority: `https://login.microsoftonline.com/${process.env.MSAL_TENANT_ID || 'common'}`,
      },
      system: {        loggerOptions: {
          loggerCallback: (level: LogLevel, message: string, containsPii: boolean) => {
            if (containsPii) return;
            console.log(`[MSAL ${level}]: ${message}`);
          },
          piiLoggingEnabled: false,
          logLevel: LogLevel.Info,
        },
      },
    };

    this.msalClient = new PublicClientApplication(this.config);
  }  async login(): Promise<AuthToken> {
    try {
      const authRequest = {
        scopes: [
          'User.Read',
          'User.ReadBasic.All',
          'Directory.Read.All',
          'Group.Read.All',
          'Application.Read.All',
        ],
        openBrowser: async (url: string) => {
          // In Electron, we can use shell.openExternal or handle the browser opening
          const { shell } = require('electron');
          await shell.openExternal(url);
        }
      };

      const response: AuthenticationResult = await this.msalClient.acquireTokenInteractive(authRequest);
      
      return this.mapToAuthToken(response);
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication failed');
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
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = await this.getToken();
      if (!token) return null;

      // This would typically make a call to Microsoft Graph
      // For now, return a placeholder
      return {
        id: 'user-id',
        displayName: 'Current User',
        mail: 'user@domain.com',
        userPrincipalName: 'user@domain.com',
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
