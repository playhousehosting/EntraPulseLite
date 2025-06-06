// MockAuthService.ts
// A mock authentication service for testing that doesn't rely on MSAL

import { AuthToken, AppConfig } from '../../types';

export class MockAuthService {
  private pca: any = null;
  private account: any = null;
  private config: AppConfig | null = null;
  private useClientCredentials: boolean = false;
  private clientId: string = '';
  private tenantId: string = '';
  private clientSecret: string = '';
  private scopes: string[] = [];
  private isAuthenticated: boolean = false;

  constructor(config?: any) {
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
    this.clientId = config.auth?.clientId || '';
    this.tenantId = config.auth?.tenantId || '';
    this.clientSecret = config.auth?.clientSecret || '';
    this.useClientCredentials = config.auth?.useClientCredentials || false;
    this.scopes = config.auth?.scopes || ['https://graph.microsoft.com/.default'];
  }

  /**
   * Sign in with client credentials
   * @returns Authentication token
   */
  async signIn(): Promise<AuthToken | null> {
    if (!this.useClientCredentials || !this.clientSecret) {
      throw new Error('Client credentials are required for authentication');
    }

    // In the mock, we just simulate a successful login and return a fake token
    this.isAuthenticated = true;
    
    return {
      accessToken: 'mock-access-token',
      idToken: 'mock-id-token',
      expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      scopes: this.scopes,
      clientId: this.clientId,
      tenantId: this.tenantId
    };
  }

  /**
   * Sign out the user
   */
  async signOut(): Promise<void> {
    this.isAuthenticated = false;
  }

  /**
   * Get the current authentication token
   * @returns Authentication token or null if not authenticated
   */
  async getToken(): Promise<AuthToken | null> {
    if (this.useClientCredentials) {
      // For client credentials flow, get a new token each time
      return this.signIn();
    }
    
    return null;
  }
}
