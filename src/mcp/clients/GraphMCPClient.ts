// GraphMCPClient.ts
// Specialized MCP client for Microsoft Graph API access

import { Client } from '@microsoft/microsoft-graph-client';
import { MCPAuthService } from '../auth/MCPAuthService';
import { MCPServerConfig } from '../types';

export class GraphMCPClient {
  private graphClient: Client | null = null;
  private serverConfig: MCPServerConfig;
  private authService: MCPAuthService;

  constructor(serverConfig: MCPServerConfig, authService: MCPAuthService) {
    this.serverConfig = serverConfig;
    this.authService = authService;
  }

  /**
   * Initialize Microsoft Graph client
   */
  private async initializeGraphClient(): Promise<Client> {
    if (this.graphClient) {
      return this.graphClient;
    }

    try {
      // Get the Microsoft Graph authentication provider
      const authProvider = await this.authService.getGraphAuthProvider();
      
      // Initialize Microsoft Graph client
      this.graphClient = Client.initWithMiddleware({
        authProvider,
        debugLogging: true
      });

      return this.graphClient;
    } catch (error) {
      console.error('Failed to initialize Microsoft Graph client:', error);
      throw new Error('Failed to initialize Microsoft Graph client');
    }
  }

  /**
   * Execute a query against Microsoft Graph API
   * @param endpoint API endpoint path
   * @param method HTTP method
   * @param data Request body data (for POST, PUT, PATCH)
   * @param version API version
   * @returns Graph API response
   */
  async queryGraph(endpoint: string, method: string = 'GET', data?: any, version: string = 'v1.0'): Promise<any> {
    try {
      const client = await this.initializeGraphClient();
      
      // Build the request
      let request = client.api(endpoint).version(version);
      
      // Add headers if needed
      if (this.serverConfig.options?.headers) {
        for (const [key, value] of Object.entries(this.serverConfig.options.headers)) {
          request = request.header(key, value as string);
        }
      }
      
      // Execute the appropriate method
      switch (method.toUpperCase()) {
        case 'GET':
          return await request.get();
        case 'POST':
          return await request.post(data);
        case 'PUT':
          return await request.put(data);
        case 'PATCH':
          return await request.patch(data);
        case 'DELETE':
          return await request.delete();
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
    } catch (error) {
      console.error(`Graph API query failed for ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get available Graph API endpoints and their capabilities
   * This is useful for showing what is available to the LLM
   * @returns List of available endpoints and their capabilities
   */
  async getAvailableEndpoints(): Promise<any[]> {
    // This would typically return a list of endpoints for which the user has permissions
    // For now, we'll return a simple list of common endpoints
    return [
      {
        endpoint: '/me',
        methods: ['GET'],
        description: 'Get the current user profile'
      },
      {
        endpoint: '/me/messages',
        methods: ['GET'],
        description: 'Get the current user\'s email messages'
      },
      {
        endpoint: '/me/events',
        methods: ['GET', 'POST'],
        description: 'Get or create calendar events'
      },
      {
        endpoint: '/me/drive/root/children',
        methods: ['GET'],
        description: 'List files in OneDrive root folder'
      },
      {
        endpoint: '/users',
        methods: ['GET'],
        description: 'List users in the organization'
      }
    ];
  }
}
