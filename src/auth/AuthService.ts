// AuthService.ts
// Authentication service for EntraPulseLite using MSAL for Electron

import { PublicClientApplication, Configuration, AuthenticationResult, AccountInfo } from '@azure/msal-node';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { AppConfig, AuthToken } from '../types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export class AuthService {
  private pca: PublicClientApplication | ConfidentialClientApplication | null = null;
  private account: AccountInfo | null = null;
  private config: AppConfig | null = null;
  private useClientCredentials: boolean = false;

  constructor(config?: AppConfig) {
    if (config) {
      this.initialize(config);
    }
  }

  /**
   * Initialize the authentication service with configuration
   * @param config Application configuration
   */
  initialize(config: AppConfig): void {
    this.config = config;
    this.useClientCredentials = config.auth?.useClientCredentials || false;

    // Configure MSAL
    if (this.useClientCredentials && config.auth?.clientSecret) {
      // Use confidential client flow for client credentials
      const confidentialConfig: Configuration = {
        auth: {
          clientId: config.auth.clientId,
          authority: `https://login.microsoftonline.com/${config.auth.tenantId}`,
          clientSecret: config.auth.clientSecret
        }
      };
      this.pca = new ConfidentialClientApplication(confidentialConfig);
    } else {
      // Use public client flow for interactive authentication
      const publicConfig: Configuration = {
        auth: {
          clientId: config.auth.clientId,
          authority: `https://login.microsoftonline.com/${config.auth.tenantId}`
        }
      };
      this.pca = new PublicClientApplication(publicConfig);
    }
  }
  /**
   * Sign in the user (alias for login)
   * @param useRedirectFlow Whether to use redirect flow for authentication
   * @returns Authentication token
   */
  async login(useRedirectFlow: boolean = false): Promise<AuthToken | null> {
    return this.signIn();
  }

  /**
   * Sign in the user
   * @returns Authentication token
   */
  async signIn(): Promise<AuthToken | null> {
    if (!this.pca || !this.config?.auth?.scopes) {
      throw new Error('Authentication service not initialized');
    }

    try {
      if (this.useClientCredentials && this.pca instanceof ConfidentialClientApplication) {
        // Get token using client credentials flow
        const result = await this.pca.acquireTokenByClientCredential({
          scopes: this.config.auth.scopes
        });
        
        if (!result) {
          throw new Error('Failed to acquire token using client credentials');
        }        return {
          accessToken: result.accessToken,
          idToken: result.idToken || '',
          expiresOn: result.expiresOn || new Date(Date.now() + 3600 * 1000), // Default 1 hour
          scopes: this.config.auth.scopes
        };
      } else {
        // Get token using interactive flow (not implemented in this version)
        throw new Error('Interactive authentication not implemented');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  /**
   * Sign out the user (alias for logout)
   */
  async logout(): Promise<void> {
    return this.signOut();
  }

  /**
   * Sign out the user
   */
  async signOut(): Promise<void> {
    this.account = null;
  }

  /**
   * Get the current user information
   * @returns User account information
   */
  async getCurrentUser(): Promise<AccountInfo | null> {
    return this.account;
  }

  /**
   * Request additional permissions from the user
   * @param permissions Array of permission scopes to request
   * @returns Authentication token with new permissions
   */
  async requestAdditionalPermissions(permissions: string[]): Promise<AuthToken | null> {
    if (!this.config) {
      throw new Error('Authentication service not initialized');
    }

    // Update config with new permissions
    const updatedScopes = [...new Set([...this.config.auth.scopes, ...permissions])];
    this.config.auth.scopes = updatedScopes;

    // Re-authenticate with new permissions
    return this.signIn();
  }

  /**
   * Get token with specific permissions
   * @param permissions Array of permission scopes required
   * @returns Authentication token
   */
  async getTokenWithPermissions(permissions: string[]): Promise<AuthToken | null> {
    if (!this.config) {
      throw new Error('Authentication service not initialized');
    }

    // Check if we have all required permissions
    const hasAllPermissions = permissions.every(p => this.config!.auth.scopes.includes(p));
    
    if (!hasAllPermissions) {
      // Request additional permissions if needed
      return this.requestAdditionalPermissions(permissions);
    }

    // Return existing token if we have all permissions
    return this.getToken();
  }

  /**
   * Get the current authentication token
   * @returns Authentication token or null if not authenticated
   */
  async getToken(): Promise<AuthToken | null> {
    try {
      if (!this.pca || !this.config?.auth?.scopes) {
        throw new Error('Authentication service not initialized');
      }

      if (this.useClientCredentials && this.pca instanceof ConfidentialClientApplication) {
        // For client credentials flow, just get a new token each time
        return this.signIn();
      }
      
      // For interactive flow (not implemented in this version)
      throw new Error('Interactive authentication not implemented');
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  }
}