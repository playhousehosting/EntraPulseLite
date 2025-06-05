// LokkaMCPServer.ts
// MCP Server implementation for Microsoft Graph API access

import { MCPRequest, MCPResponse, MCPServerConfig, MCPTool } from '../../types';
import { Client } from '@microsoft/microsoft-graph-client';
import { MCPAuthService } from '../../auth/MCPAuthService';
import { MCPErrorHandler, ErrorCode } from '../../utils';

interface GraphQueryParams {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  version?: string;
  data?: any;
  queryParams?: Record<string, string>;
}

export class LokkaMCPServer {
  private config: MCPServerConfig;
  private tools: MCPTool[] = [];
  private graphClient: Client | null = null;
  private authService: MCPAuthService;

  constructor(config: MCPServerConfig, authService: MCPAuthService) {
    this.config = config;
    this.authService = authService;
    this.initializeTools();
  }

  private initializeTools(): void {
    this.tools = [
      {
        name: 'microsoft_graph_query',
        description: 'Query Microsoft Graph API',
        inputSchema: {
          type: 'object',
          properties: {
            endpoint: { 
              type: 'string',
              description: 'Graph API endpoint path (e.g., /me, /users)'
            },
            method: { 
              type: 'string',
              description: 'HTTP method',
              default: 'GET'
            },
            data: { 
              type: 'object',
              description: 'Request body for POST/PATCH/PUT requests'
            },
            version: {
              type: 'string',
              description: 'API version',
              default: 'v1.0'
            },
            queryParams: {
              type: 'object',
              description: 'Query parameters to include in the request'
            }
          },
          required: ['endpoint']
        }
      }
    ];
  }
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'tools/list':
          return {
            id: request.id,
            result: this.tools
          };
        case 'tools/call':
          if (!request.params || !request.params.name) {
            return {
              id: request.id,
              error: MCPErrorHandler.createError(
                ErrorCode.BAD_REQUEST,
                'Tool name is required'
              )
            };
          }
          return this.executeTool(request);
        default:
          return {
            id: request.id,
            error: MCPErrorHandler.createError(
              ErrorCode.NOT_FOUND,
              `Method '${request.method}' not found`
            )
          };
      }
    } catch (error) {
      return {
        id: request.id,
        error: MCPErrorHandler.handleError(error, `LokkaMCPServer.handleRequest.${request.method}`)
      };
    }
  }

  private async executeTool(request: MCPRequest): Promise<MCPResponse> {
    const toolName = request.params.name;
    const args = request.params.arguments || {};
    
    try {
      switch (toolName) {
        case 'microsoft_graph_query':
          return {
            id: request.id,
            result: await this.executeGraphQuery(args as GraphQueryParams)
          };
        default:
          return {
            id: request.id,
            error: MCPErrorHandler.createError(
              ErrorCode.NOT_FOUND,
              `Tool '${toolName}' not found`
            )
          };
      }
    } catch (error) {
      return {
        id: request.id,
        error: MCPErrorHandler.handleError(error, `LokkaMCPServer.executeTool.${toolName}`)
      };
    }
  }

  private async executeGraphQuery(params: GraphQueryParams): Promise<any> {
    try {
      if (!params.endpoint) {
        throw new Error('Endpoint is required for Graph API queries');
      }

      const client = await this.getGraphClient();
      const version = params.version || 'v1.0';
      const method = (params.method || 'GET').toUpperCase();

      let request = client.api(params.endpoint).version(version);      // Add query parameters if provided
      if (params.queryParams) {
        request = request.query(params.queryParams);
      }

      let result;

      switch (method) {
        case 'GET':
          result = await request.get();
          break;
        case 'POST':
          result = await request.post(params.data || {});
          break;
        case 'PATCH':
          result = await request.patch(params.data || {});
          break;
        case 'PUT':
          result = await request.put(params.data || {});
          break;
        case 'DELETE':
          result = await request.delete();
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${params.method}`);
      }

      return {
        content: [
          {
            type: 'json',
            json: result
          }
        ]
      };
    } catch (error) {
      console.error('Error executing Graph query:', error);
      throw new Error(`Failed to execute Graph query: ${(error as Error).message}`);
    }
  }

  private async getGraphClient(): Promise<Client> {
    if (this.graphClient) {
      return this.graphClient;
    }

    try {
      const authProvider = await this.authService.getGraphAuthProvider();
      
      this.graphClient = Client.initWithMiddleware({
        authProvider: authProvider
      });
      
      return this.graphClient;
    } catch (error) {
      console.error('Error initializing Graph client:', error);
      throw new Error(`Failed to initialize Graph client: ${(error as Error).message}`);
    }
  }
}
