// AuthService.ts
// Authentication service for EntraPulseLite using MSAL for Electron

import { PublicClientApplication, Configuration, AuthenticationResult, AccountInfo } from '@azure/msal-node';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { AppConfig, AuthToken } from '../types';
import { BrowserWindow, app } from 'electron';
import { createHash, randomBytes } from 'crypto';
import * as http from 'http';
import * as path from 'path';

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
   * @returns Authentication token
   */
  async login(): Promise<AuthToken | null> {
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
        };      } else {
        // Get token using interactive browser window flow
        if (!(this.pca instanceof PublicClientApplication)) {
          throw new Error('Public client required for interactive authentication');
        }

        console.log('🔐 Starting interactive browser authentication...');
        return await this.acquireTokenInteractively();
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
   * Acquire token using interactive browser window (Electron-compatible)
   */
  private async acquireTokenInteractively(): Promise<AuthToken | null> {
    if (!this.pca || !(this.pca instanceof PublicClientApplication) || !this.config?.auth?.scopes) {
      throw new Error('Public client not properly initialized for interactive flow');
    }

    return new Promise((resolve, reject) => {      // Create a new browser window for authentication
      const authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        icon: process.platform === 'win32'
          ? path.resolve(process.resourcesPath || app.getAppPath(), 'assets', 'icon.ico')
          : path.resolve(process.resourcesPath || app.getAppPath(), 'assets', 'EntraPulseLiteLogo.png'),
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        },
        title: 'Sign in to Microsoft',
        autoHideMenuBar: true,
        resizable: false
      });// Generate PKCE parameters for secure authentication
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);      // Build the authorization URL with PKCE for Electron
      const tenantId = this.config!.auth.tenantId;
      const clientId = this.config!.auth.clientId;
      const scopes = encodeURIComponent(this.config!.auth.scopes.join(' '));
      // Use the correct redirect URI that matches Entra app configuration
      const redirectUri = encodeURIComponent('http://localhost');
      const state = Date.now().toString();
      
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
        `client_id=${clientId}&` +
        `response_type=code&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scopes}&` +
        `response_mode=query&` +
        `state=${state}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=S256&` +
        `prompt=select_account`;

      console.log('🌐 Loading Microsoft authentication page with PKCE...');
      
      // Load the authentication URL
      authWindow.loadURL(authUrl);      // Handle URL navigation to catch the redirect with authorization code
      authWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        this.handleAuthRedirect(navigationUrl, authWindow, resolve, reject, state, codeVerifier, () => { authCompleted = true; });
      });

      authWindow.webContents.on('will-redirect', (event, navigationUrl) => {
        this.handleAuthRedirect(navigationUrl, authWindow, resolve, reject, state, codeVerifier, () => { authCompleted = true; });
      });// Handle window closed by user
      let authCompleted = false;
      const handleWindowClosed = () => {
        if (!authCompleted) {
          reject(new Error('Authentication window was closed by user'));
        }
      };
      authWindow.on('closed', handleWindowClosed);// Handle load failures
      authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {        // Check if this is the redirect to localhost (which will fail to load)
        if (validatedURL.startsWith('http://localhost') && validatedURL.includes('code=')) {
          this.handleAuthRedirect(validatedURL, authWindow, resolve, reject, state, codeVerifier, () => { authCompleted = true; });
        } else {
          console.error('Auth window failed to load:', errorCode, errorDescription);
          authWindow.close();
          reject(new Error(`Authentication failed to load: ${errorDescription}`));
        }
      });
    });
  }  /**
   * Handle authentication redirect and extract authorization code
   */
  private async handleAuthRedirect(
    url: string, 
    authWindow: BrowserWindow, 
    resolve: (value: AuthToken | null) => void, 
    reject: (reason?: any) => void,
    expectedState: string,
    codeVerifier: string,
    setAuthCompleted: () => void
  ): Promise<void> {    try {      // Check if this is our redirect URL
      if (url.startsWith('http://localhost')) {
        // Mark authentication as completed to prevent "window closed" error
        setAuthCompleted();
        
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        const error = urlObj.searchParams.get('error');
        const state = urlObj.searchParams.get('state');
        
        authWindow.close();
        
        // Verify state to prevent CSRF attacks
        if (state !== expectedState) {
          reject(new Error('Invalid state parameter - possible CSRF attack'));
          return;
        }
        
        if (error) {
          reject(new Error(`Authentication failed: ${error} - ${urlObj.searchParams.get('error_description')}`));
          return;
        }
        
        if (code) {          console.log('🔑 Authorization code received, exchanging for tokens...');
          
          try {            // Exchange the authorization code for tokens using MSAL with PKCE
            const tokenRequest = {
              scopes: this.config!.auth.scopes,
              code: code,
              redirectUri: 'http://localhost',
              codeVerifier: codeVerifier
            };
            
            const result = await (this.pca as PublicClientApplication).acquireTokenByCode(tokenRequest);
            
            if (!result) {
              reject(new Error('Failed to acquire token from authorization code'));
              return;
            }

            // Store account information for future silent token requests
            this.account = result.account;
            
            console.log('✅ Interactive authentication successful!');
            
            const authToken: AuthToken = {
              accessToken: result.accessToken,
              idToken: result.idToken || '',
              expiresOn: result.expiresOn || new Date(Date.now() + 3600 * 1000),
              scopes: this.config!.auth.scopes
            };

            resolve(authToken);
          } catch (tokenError) {
            console.error('Token exchange failed:', tokenError);
            reject(new Error(`Token exchange failed: ${tokenError}`));
          }
        } else {
          reject(new Error('No authorization code received in redirect'));
        }
      }
    } catch (error) {
      console.error('Error handling auth redirect:', error);
      authWindow.close();
      reject(error);
    }
  }

  /**
   * Get the current user information
   * @returns User account information
   */  /**
   * Get the current user's full profile from Microsoft Graph
   * @returns Full user profile from Graph API or null if not authenticated
   */
  async getCurrentUser(): Promise<any | null> {
    try {
      // First check if we have an authenticated account
      if (!this.account) {
        return null;
      }

      // Get a valid token to make Graph API calls
      const token = await this.getToken();
      if (!token) {
        return null;
      }

      // Create a simple Graph client for this call
      const { Client } = require('@microsoft/microsoft-graph-client');
      const graphClient = Client.init({
        authProvider: async (done: any) => {
          done(null, token.accessToken);
        }
      });

      // Get full user profile from Graph API
      const userProfile = await graphClient.api('/me').get();
      console.log('Retrieved user profile:', userProfile);
      
      return userProfile;
    } catch (error) {
      console.error('Failed to get current user profile:', error);
      
      // Fallback to MSAL account info if Graph API fails
      if (this.account) {
        console.log('Falling back to MSAL account info:', this.account);
        return {
          id: this.account.localAccountId,
          displayName: this.account.name || 'User',
          mail: this.account.username,
          userPrincipalName: this.account.username
        };
      }
        return null;
    }
  }

  /**
   * Get claims from the current ID token
   * @returns Parsed ID token claims or null if not available
   */
  async getIdTokenClaims(): Promise<any | null> {
    try {
      const token = await this.getToken();
      if (!token || !token.idToken) {
        return null;
      }

      // Parse JWT token (ID tokens are in JWT format)
      const parts = token.idToken.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid ID token format');
        return null;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = Buffer.from(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const claims = JSON.parse(decodedPayload);
      
      console.log('ID token claims parsed successfully');
      return claims;
    } catch (error) {
      console.error('Failed to parse ID token claims:', error);
      return null;
    }
  }

  /**
   * Request additional permissions from the user
   * @param permissions Array of permission scopes to request
   * @returns Authentication token with new permissions
   */
  async requestAdditionalPermissions(permissions: string[]): Promise<AuthToken | null> {
    if (!this.config) {
      throw new Error('Authentication service not initialized');
    }    // Update config with new permissions
    const uniqueScopes = new Set([...this.config.auth.scopes, ...permissions]);
    const updatedScopes = Array.from(uniqueScopes);
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
   * Get the current authentication token with automatic refresh
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
      } else if (this.pca instanceof PublicClientApplication) {
        // For interactive flow, try to get cached token first
        const accounts = await this.pca.getTokenCache().getAllAccounts();
        
        if (accounts.length > 0 && this.account) {
          try {
            // Try to acquire token silently - MSAL will automatically refresh if needed
            console.log('🔄 Attempting silent token acquisition...');
            const result = await this.pca.acquireTokenSilent({
              scopes: this.config.auth.scopes,
              account: this.account,
              forceRefresh: false // Let MSAL decide when to refresh
            });
            
            console.log('✅ Silent token acquisition successful');
            return {
              accessToken: result.accessToken,
              idToken: result.idToken || '',
              expiresOn: result.expiresOn || new Date(Date.now() + 3600 * 1000),
              scopes: this.config.auth.scopes
            };
          } catch (silentError) {
            console.log('⚠️ Silent token acquisition failed, trying force refresh...', silentError);
            
            // If silent acquisition fails, try with force refresh
            try {
              const refreshResult = await this.pca.acquireTokenSilent({
                scopes: this.config.auth.scopes,
                account: this.account,
                forceRefresh: true // Force refresh the token
              });
              
              console.log('✅ Force refresh token acquisition successful');
              return {
                accessToken: refreshResult.accessToken,
                idToken: refreshResult.idToken || '',
                expiresOn: refreshResult.expiresOn || new Date(Date.now() + 3600 * 1000),
                scopes: this.config.auth.scopes
              };
            } catch (refreshError) {
              console.error('❌ Force refresh also failed:', refreshError);
              
              // If both silent and force refresh fail, the user needs to sign in again
              // This could happen if the refresh token has also expired (usually after 90 days)
              const errorMessage = (refreshError as any)?.errorCode || (refreshError as any)?.message || 'Token refresh failed';
              console.log('🔐 User needs to authenticate again due to:', errorMessage);
              
              // Clear the cached account and require sign-in
              this.account = null;
              throw new Error('Authentication token expired - please sign in again');
            }
          }
        }
        
        // No cached token available, user needs to sign in
        throw new Error('User not signed in - please use the Sign In button');
      }
      
      throw new Error('Authentication service not properly configured');
    } catch (error) {
      console.error('Error getting token:', error);
      throw error;
    }
  }

  /**
   * Decode JWT token and extract permissions from roles claim
   * @param token Access token to decode
   * @returns Array of permission roles from the token
   */  private decodeTokenPermissions(token: string): string[] {
    try {
      console.log('🔍 Starting token decode process...');
      console.log('📄 Token length:', token.length);
      console.log('📄 Token preview (first 50 chars):', token.substring(0, 50) + '...');
      
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.warn('⚠️ Invalid JWT token format - expected 3 parts, got:', parts.length);
        return [];
      }

      console.log('📋 Token parts lengths:', parts.map(p => p.length));

      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      
      let decodedPayload;
      try {
        decodedPayload = JSON.parse(atob(paddedPayload));
      } catch (decodeError) {
        console.error('❌ Failed to decode JWT payload:', decodeError);
        return [];
      }console.log('🔍 Decoded token payload:', decodedPayload);

      // Log all potential permission claims for debugging
      console.log('📋 Available claims in token:');
      console.log('- roles (app permissions):', decodedPayload.roles);
      console.log('- scp (delegated scopes):', decodedPayload.scp);
      console.log('- scope (space-separated):', decodedPayload.scope);
      console.log('- scopes (array):', decodedPayload.scopes);
      console.log('- aud (audience):', decodedPayload.aud);
      console.log('- appid (app ID):', decodedPayload.appid);      // For client credentials flow: Extract roles claim (application permissions)
      const roles = decodedPayload.roles || [];
      if (Array.isArray(roles) && roles.length > 0) {
        console.log('✅ Found application permissions (roles):', roles);
        return roles;
      }

      // For interactive flow: Extract scp claim (delegated permissions/scopes)
      let scopes = decodedPayload.scp || decodedPayload.scope || '';
      
      // Handle both string and array formats
      let scopeArray: string[] = [];
      if (typeof scopes === 'string' && scopes.length > 0) {
        scopeArray = scopes.split(' ').filter(scope => scope.length > 0);
      } else if (Array.isArray(scopes)) {
        scopeArray = scopes;
      }
      
      if (scopeArray.length > 0) {
        console.log('✅ Found delegated permissions (scopes):', scopeArray);
        return scopeArray;
      }

      // Fallback: look for any other scope-related claims
      if (Array.isArray(decodedPayload.scopes)) {
        console.log('✅ Found scopes array:', decodedPayload.scopes);
        return decodedPayload.scopes;
      }

      console.warn('⚠️ No permission claims found in token - this may be normal for some auth flows');
      console.log('🔍 Full token payload for debugging:', JSON.stringify(decodedPayload, null, 2));
      return [];
    } catch (error) {
      console.error('Failed to decode token:', error);
      return [];
    }
  }

  /**
   * Get the current authentication mode and actual permissions from token
   * @returns Authentication mode information with actual permissions
   */
  getAuthenticationInfo(): { 
    mode: 'client-credentials' | 'interactive'; 
    permissions: string[];
    isAuthenticated: boolean;
    clientId: string;
    tenantId: string;
  } {
    if (!this.config?.auth) {
      throw new Error('Authentication service not initialized');
    }

    return {
      mode: this.useClientCredentials ? 'client-credentials' : 'interactive',
      permissions: this.config.auth.scopes || [],
      isAuthenticated: this.useClientCredentials ? true : false, // For client credentials, we're always "authenticated"
      clientId: this.config.auth.clientId,
      tenantId: this.config.auth.tenantId
    };
  }
  /**
   * Get authentication information including actual permissions from current token
   * @returns Authentication info with actual permissions from token
   */  async getAuthenticationInfoWithToken(): Promise<{ 
    mode: 'client-credentials' | 'interactive'; 
    permissions: string[];
    actualPermissions?: string[];
    isAuthenticated: boolean;
    clientId: string;
    tenantId: string;
  }> {
    const basicInfo = this.getAuthenticationInfo();

    try {
      // Get current token to extract actual permissions for both auth modes
      const token = await this.getToken();
      if (token?.accessToken) {
        console.log('🔍 Attempting to decode token for permission extraction...');
        const actualPermissions = this.decodeTokenPermissions(token.accessToken);
        console.log('🎯 Token decoding result:', actualPermissions);
        
        if (actualPermissions && actualPermissions.length > 0) {
          console.log('✅ Found actual permissions in token:', actualPermissions);
          return {
            ...basicInfo,
            actualPermissions,
            isAuthenticated: true
          };
        } else {
          console.log('⚠️ No actual permissions found in token, using configured permissions');
          return {
            ...basicInfo,
            isAuthenticated: true
          };
        }
      }
    } catch (error) {
      console.error('Failed to get token for permission extraction:', error);
      // For interactive mode, if token retrieval fails, user is not authenticated
      if (!this.useClientCredentials) {
        return {
          ...basicInfo,
          isAuthenticated: false
        };
      }
    }

    return basicInfo;
  }

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

  /**
   * Handle server callback for OAuth redirect
   */
  private async handleServerCallback(
    url: URL,
    authWindow: BrowserWindow | null,
    server: http.Server | null,
    resolve: (value: AuthToken | null) => void,
    reject: (reason?: any) => void,
    codeVerifier: string
  ): Promise<void> {
    try {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      const state = url.searchParams.get('state');

      // Close the auth window and server
      if (authWindow) {
        authWindow.close();
      }
      if (server) {
        server.close();
      }

      if (error) {
        reject(new Error(`Authentication failed: ${error} - ${url.searchParams.get('error_description')}`));
        return;
      }

      if (code) {
        console.log('🔑 Authorization code received via server callback, exchanging for tokens...');

        try {          // Exchange the authorization code for tokens using MSAL with PKCE
          const tokenRequest = {
            scopes: this.config!.auth.scopes,
            code: code,
            redirectUri: 'http://localhost',
            codeVerifier: codeVerifier
          };

          const result = await (this.pca as PublicClientApplication).acquireTokenByCode(tokenRequest);

          if (!result) {
            reject(new Error('Failed to acquire token from authorization code'));
            return;
          }

          // Store account information for future silent token requests
          this.account = result.account;

          console.log('✅ Interactive authentication successful via server callback!');

          const authToken: AuthToken = {
            accessToken: result.accessToken,
            idToken: result.idToken || '',
            expiresOn: result.expiresOn || new Date(Date.now() + 3600 * 1000),
            scopes: this.config!.auth.scopes
          };

          resolve(authToken);
        } catch (tokenError) {
          console.error('Token exchange failed:', tokenError);
          reject(new Error(`Token exchange failed: ${tokenError}`));
        }
      } else {
        reject(new Error('No authorization code received in server callback'));
      }
    } catch (error) {
      console.error('Error handling server callback:', error);
      if (authWindow) {
        authWindow.close();
      }
      if (server) {
        server.close();
      }
      reject(error);
    }
  }

  /**
   * Clear the MSAL token cache to force fresh token acquisition
   * This is useful when scopes have changed and cached tokens have old permissions
   */
  async clearTokenCache(): Promise<void> {
    try {
      if (this.pca instanceof PublicClientApplication) {
        // Get the token cache and clear all accounts
        const tokenCache = this.pca.getTokenCache();
        const accounts = await tokenCache.getAllAccounts();
        
        console.log(`🧹 Clearing ${accounts.length} cached accounts and tokens...`);
        
        // Remove all accounts from cache (this also removes their tokens)
        for (const account of accounts) {
          await tokenCache.removeAccount(account);
          console.log(`Removed cached account: ${account.username}`);
        }
        
        // Reset our stored account reference
        this.account = null;
        
        console.log('✅ Token cache cleared successfully');
      }
    } catch (error) {
      console.error('Failed to clear token cache:', error);
      throw error;
    }
  }

  /**
   * Force a fresh interactive authentication (clears cache first)
   * Use this when you need to get new tokens with updated scopes
   */
  async forceReauthentication(): Promise<AuthToken | null> {
    try {
      console.log('🔄 Forcing fresh authentication with updated scopes...');
      
      // Clear the token cache first
      await this.clearTokenCache();
      
      // Then perform fresh interactive authentication
      return await this.signIn();
    } catch (error) {
      console.error('Force reauthentication failed:', error);
      throw error;
    }
  }
  /**
   * Test authentication credentials by attempting to get a token
   * This can be used to validate Entra application configuration
   */
  async testAuthentication(testConfig?: Partial<AppConfig>): Promise<{ success: boolean; error?: string; details?: any }> {
    try {
      console.log('🧪 Testing authentication with provided configuration...');
      
      // Use provided config or current config
      const configToTest = testConfig || this.config;
      
      if (!configToTest?.auth?.clientId || !configToTest?.auth?.tenantId) {
        return {
          success: false,
          error: 'Missing required configuration: clientId and tenantId are required'
        };
      }

      // Create a temporary MSAL instance for testing
      let testPca: PublicClientApplication | ConfidentialClientApplication;
      
      if (configToTest.auth.clientSecret && configToTest.auth.useClientCredentials) {
        // Test with client credentials flow
        const confidentialConfig: Configuration = {
          auth: {
            clientId: configToTest.auth.clientId,
            authority: `https://login.microsoftonline.com/${configToTest.auth.tenantId}`,
            clientSecret: configToTest.auth.clientSecret
          }
        };
        testPca = new ConfidentialClientApplication(confidentialConfig);
        
        // Try to get a token using client credentials
        const clientCredentialRequest = {
          scopes: ['https://graph.microsoft.com/.default'],
        };
        
        const response = await testPca.acquireTokenByClientCredential(clientCredentialRequest);
        
        if (response?.accessToken) {
          console.log('✅ Client credentials authentication test successful');
          return {
            success: true,
            details: {
              tokenType: 'client_credentials',
              expiresOn: response.expiresOn,
              account: response.account
            }
          };
        } else {
          return {
            success: false,
            error: 'No access token received from client credentials flow'
          };
        }
      } else {
        // Test with public client (device code flow for validation)
        const publicConfig: Configuration = {
          auth: {
            clientId: configToTest.auth.clientId,
            authority: `https://login.microsoftonline.com/${configToTest.auth.tenantId}`
          }
        };
        testPca = new PublicClientApplication(publicConfig);
        
        // For public client testing, we'll just validate the configuration structure
        // since we can't do a full interactive login test in this context
        
        // Try to get existing cached tokens first
        const accounts = await testPca.getTokenCache().getAllAccounts();
        
        if (accounts.length > 0) {
          // Try silent token acquisition
          try {
            const silentRequest = {
              scopes: ['https://graph.microsoft.com/User.Read'],
              account: accounts[0]
            };
            
            const response = await testPca.acquireTokenSilent(silentRequest);
            
            if (response?.accessToken) {
              console.log('✅ Silent token acquisition test successful');
              return {
                success: true,
                details: {
                  tokenType: 'interactive',
                  expiresOn: response.expiresOn,
                  account: response.account
                }
              };
            }
          } catch (silentError) {
            console.log('🔍 Silent token acquisition failed, but configuration appears valid');
          }
        }
        
        // If no cached tokens, just validate the configuration format
        console.log('✅ Public client configuration validation successful');
        return {
          success: true,
          details: {
            tokenType: 'configuration_valid',
            message: 'Configuration is valid. Interactive login would be required for full testing.'
          }
        };
      }
    } catch (error) {
      console.error('❌ Authentication test failed:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: errorMessage,
        details: error
      };
    }
  }

  /**
   * Add a single scope to the current configuration
   * @param scope Permission scope to add
   */
  async addScope(scope: string): Promise<void> {
    if (!this.config) {
      throw new Error('Authentication service not initialized');
    }

    // Add scope if not already present
    if (!this.config.auth.scopes.includes(scope)) {
      this.config.auth.scopes.push(scope);
      console.log(`Added scope: ${scope}`);
    }
  }

  /**
   * Get current configured scopes
   * @returns Array of currently configured scopes
   */
  async getCurrentScopes(): Promise<string[]> {
    if (!this.config) {
      throw new Error('Authentication service not initialized');
    }
    return [...this.config.auth.scopes];
  }

  /**
   * Get scopes from the current access token
   * @returns Array of scopes from the current token
   */
  async getTokenScopes(): Promise<string[]> {
    try {
      const token = await this.getToken();
      if (!token) {
        return [];
      }
      return this.decodeTokenPermissions(token.accessToken);
    } catch (error) {
      console.error('Failed to get token scopes:', error);
      return [];
    }
  }

  /**
   * Set scopes replacing the current configuration
   * @param scopes Array of permission scopes to set
   */
  async setScopes(scopes: string[]): Promise<void> {
    if (!this.config) {
      throw new Error('Authentication service not initialized');
    }
    this.config.auth.scopes = [...scopes];
    console.log(`Set ${scopes.length} scopes in configuration`);
  }
}