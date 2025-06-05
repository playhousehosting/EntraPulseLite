// Microsoft Graph API service with progressive permissions
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthService } from '../auth/AuthService';
import { GraphApiCall } from '../types';

// Define permission tiers for different operations
export const PERMISSION_TIERS = {
  BASIC: ['User.Read'],
  USER_MANAGEMENT: ['User.Read', 'User.ReadBasic.All'],
  DIRECTORY_READ: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All'],
  GROUP_MANAGEMENT: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All', 'Group.Read.All'],
  APPLICATION_READ: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All', 'Group.Read.All', 'Application.Read.All'],
};

export class GraphService {
  private client: Client;
  private authService: AuthService;
  private currentPermissions: string[] = ['User.Read']; // Start with basic permissions

  constructor(authService: AuthService) {
    this.authService = authService;
    this.client = Client.init({
      authProvider: async (done) => {
        try {
          const token = await this.authService.getToken();
          if (token) {
            done(null, token.accessToken);
          } else {
            done(new Error('No valid token available'), null);
          }
        } catch (error) {
          done(error, null);
        }
      },
    });
  }

  async ensurePermissions(requiredPermissions: string[]): Promise<boolean> {
    try {
      // Check if we already have the required permissions
      const hasAllPermissions = requiredPermissions.every(permission => 
        this.currentPermissions.includes(permission)
      );

      if (hasAllPermissions) {
        return true;
      }

      // Try to get token with required permissions silently first
      const token = await this.authService.getTokenWithPermissions(requiredPermissions);
      if (token) {
        this.currentPermissions = [...new Set([...this.currentPermissions, ...requiredPermissions])];
        return true;
      }

      // If silent request fails, request permissions interactively
      const newToken = await this.authService.requestAdditionalPermissions(requiredPermissions);
      if (newToken) {
        this.currentPermissions = [...new Set([...this.currentPermissions, ...requiredPermissions])];
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to ensure permissions:', error);
      return false;
    }
  }

  async query(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const startTime = Date.now();
    let response: any;
    let error: string | undefined;
    let status = 200;

    try {
      // Determine required permissions based on endpoint
      const requiredPermissions = this.getRequiredPermissions(endpoint, method);
      
      // Ensure we have the required permissions
      const hasPermissions = await this.ensurePermissions(requiredPermissions);
      if (!hasPermissions) {
        throw new Error(`Insufficient permissions for ${endpoint}. Required: ${requiredPermissions.join(', ')}`);
      }

      const request = this.client.api(endpoint);

      switch (method.toUpperCase()) {
        case 'GET':
          response = await request.get();
          break;
        case 'POST':
          response = await request.post(data);
          break;
        case 'PUT':
          response = await request.put(data);
          break;
        case 'PATCH':
          response = await request.patch(data);
          break;
        case 'DELETE':
          response = await request.delete();
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (err: any) {
      error = err.message || 'Unknown error';
      status = err.code || 500;
      console.error(`Graph API call failed: ${endpoint}`, err);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;    // Log the API call for debugging
    const apiCall: GraphApiCall = {
      endpoint,
      method: method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      timestamp: new Date(),
      duration,
      status,
      error,
    };

    this.logApiCall(apiCall);

    if (error) {
      throw new Error(error);
    }

    return response;
  }

  private getRequiredPermissions(endpoint: string, method: string): string[] {
    // Map endpoints to required permissions
    const endpointLower = endpoint.toLowerCase();
    
    // Basic user info - minimal permissions
    if (endpointLower.includes('/me') && method === 'GET') {
      return PERMISSION_TIERS.BASIC;
    }
    
    // User queries - need user read permissions
    if (endpointLower.includes('/users') && method === 'GET') {
      return PERMISSION_TIERS.USER_MANAGEMENT;
    }
    
    // Group queries - need group read permissions
    if (endpointLower.includes('/groups') && method === 'GET') {
      return PERMISSION_TIERS.GROUP_MANAGEMENT;
    }
    
    // Application queries - need application read permissions
    if (endpointLower.includes('/applications') || endpointLower.includes('/servicePrincipals')) {
      return PERMISSION_TIERS.APPLICATION_READ;
    }
    
    // Directory queries - need directory read permissions
    if (endpointLower.includes('/directory') || endpointLower.includes('/organization')) {
      return PERMISSION_TIERS.DIRECTORY_READ;
    }
    
    // Default to basic permissions for unknown endpoints
    return PERMISSION_TIERS.BASIC;
  }

  async getMe(): Promise<any> {
    return this.query('/me');
  }

  async getUsers(filter?: string): Promise<any> {
    const endpoint = filter ? `/users?$filter=${encodeURIComponent(filter)}` : '/users';
    return this.query(endpoint);
  }

  async getGroups(): Promise<any> {
    return this.query('/groups');
  }

  async getApplications(): Promise<any> {
    return this.query('/applications');
  }

  async getServicePrincipals(): Promise<any> {
    return this.query('/servicePrincipals');
  }

  private logApiCall(apiCall: GraphApiCall): void {
    // This could be enhanced to send to a logging service or store in local storage
    console.log('Graph API Call:', {
      endpoint: apiCall.endpoint,
      method: apiCall.method,
      duration: `${apiCall.duration}ms`,
      status: apiCall.status,
      error: apiCall.error,
    });

    // Emit event for UI tracing
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      // Could emit to main process for UI updates
    }
  }
}
