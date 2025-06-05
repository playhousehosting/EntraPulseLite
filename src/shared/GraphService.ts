// Microsoft Graph API service
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthService } from '../auth/AuthService';
import { GraphApiCall } from '../types';

export class GraphService {
  private client: Client;
  private authService: AuthService;

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

  async query(endpoint: string, method: string = 'GET', data?: any): Promise<any> {
    const startTime = Date.now();
    let response: any;
    let error: string | undefined;
    let status = 200;

    try {
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
      error = err.message;
      status = err.code || 500;
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      
      // Log the API call for tracing
      this.logApiCall({
        endpoint,
        method: method.toUpperCase() as any,
        timestamp: new Date(),
        duration,
        status,
        response: error ? undefined : response,
        error,
      });
    }

    return response;
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
    if (typeof window !== 'undefined' && window.electronAPI) {
      // Could emit to main process for UI updates
    }
  }
}
