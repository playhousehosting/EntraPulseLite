// ExternalLokkaMCPServer.ts
// Implementation of Lokka MCP Server using an external NPX process

import { MCPRequest, MCPResponse, MCPServerConfig, MCPTool } from '../../types';
import { MCPErrorHandler, ErrorCode } from '../../utils';
import { MCPAuthService } from '../../auth/MCPAuthService';
import { spawn, ChildProcess } from 'child_process';

export interface ExternalLokkaMCPServerConfig extends MCPServerConfig {
  env?: {
    TENANT_ID?: string;
    CLIENT_ID?: string;
    CLIENT_SECRET?: string;
    [key: string]: string | undefined;
  };
}

export class ExternalLokkaMCPServer {
  private config: ExternalLokkaMCPServerConfig;
  private tools: MCPTool[] = [];
  private authService: MCPAuthService;
  private serverProcess: ChildProcess | null = null;
  private isServerRunning: boolean = false;
  private startupPromise: Promise<void> | null = null;

  constructor(config: ExternalLokkaMCPServerConfig, authService: MCPAuthService) {
    this.config = config;
    this.authService = authService;
    this.initializeTools();
  }

  private initializeTools(): void {
    this.tools = [
      {
        name: 'microsoft_graph_query',
        description: 'Query Microsoft Graph API via Lokka MCP server',
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
            body: { 
              type: 'object',
              description: 'Request body for POST/PATCH/PUT requests'
            },
            apiVersion: {
              type: 'string',
              description: 'API version (v1.0 or beta)',
              default: 'v1.0'
            },
            queryParams: {
              type: 'object',
              description: 'Query parameters to include in the request'
            },
          },
          required: ['endpoint']
        }
      },
      {
        name: 'd94_Lokka-Microsoft',
        description: 'A versatile tool to interact with Microsoft APIs including Microsoft Graph and Azure Resource Management using the Lokka MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            apiType: {
              type: 'string',
              description: "Type of Microsoft API to query. Options: 'graph' for Microsoft Graph (Entra) or 'azure' for Azure Resource Management.",
              enum: ['graph', 'azure']
            },
            method: {
              type: 'string',
              description: 'HTTP method to use',
              enum: ['get', 'post', 'put', 'patch', 'delete']
            },
            path: {
              type: 'string',
              description: "The Azure or Graph API URL path to call (e.g. '/users', '/groups', '/subscriptions')"
            },
            apiVersion: {
              type: 'string',
              description: 'Azure Resource Management API version (required for apiType Azure)'
            },
            subscriptionId: {
              type: 'string',
              description: 'Azure Subscription ID (for Azure Resource Management).'
            },
            queryParams: {
              type: 'object',
              description: 'Query parameters for the request',
              additionalProperties: {
                type: 'string'
              }
            },
            body: {
              description: 'The request body (for POST, PUT, PATCH)'
            }
          },
          required: ['apiType', 'path', 'method']
        }
      }
    ];
  }
  async startServer(): Promise<void> {
    if (this.isServerRunning) {
      return Promise.resolve();
    }

    if (this.startupPromise) {
      return this.startupPromise;
    }

    this.startupPromise = new Promise<void>((resolve, reject) => {
      try {
        // Use npx to run Lokka MCP server
        const command = this.config.command || 'npx';
        const args = this.config.args || ['-y', '@merill/lokka'];
        
        // Get environment variables for the process
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          ...this.config.env,
          // Use provided config or try to get from authService
          TENANT_ID: this.config.env?.TENANT_ID || process.env.LOKKA_TENANT_ID || this.config.authConfig?.tenantId,
          CLIENT_ID: this.config.env?.CLIENT_ID || process.env.LOKKA_CLIENT_ID || this.config.authConfig?.clientId,
          CLIENT_SECRET: this.config.env?.CLIENT_SECRET || process.env.LOKKA_CLIENT_SECRET,
        };
        
        console.log(`Starting Lokka MCP server with command: ${command} ${args.join(' ')}`);
        
        // Spawn the server process with stdio for MCP communication
        this.serverProcess = spawn(command, args, {
          env,
          shell: true,
          stdio: ['pipe', 'pipe', 'pipe'] // stdin, stdout, stderr
        });        
        if (this.serverProcess.stdout) {
          this.serverProcess.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Lokka] ${output}`);
            
            // Lokka MCP server is ready when it outputs the initial capabilities
            if (output.includes('"jsonrpc"') || output.includes('capabilities') || output.includes('tools')) {
              this.isServerRunning = true;
              resolve();
            }
          });
        }
        
        if (this.serverProcess.stderr) {
          this.serverProcess.stderr.on('data', (data) => {
            console.error(`[Lokka Error] ${data.toString()}`);
          });
        }
        
        this.serverProcess.on('error', (error) => {
          console.error('Failed to start Lokka server process:', error);
          this.isServerRunning = false;
          reject(error);
        });
        
        this.serverProcess.on('close', (code) => {
          console.log(`Lokka server process exited with code ${code}`);
          this.isServerRunning = false;
          this.serverProcess = null;
        });
        
        // Log environment variables (without the client secret)
        console.log('Starting Lokka with env:', {
          TENANT_ID: env.TENANT_ID, 
          CLIENT_ID: env.CLIENT_ID,
          HAS_CLIENT_SECRET: Boolean(env.CLIENT_SECRET)
        });
          // Set a timeout for server startup
        setTimeout(async () => {
          if (!this.isServerRunning) {
            console.log('Lokka MCP server started (assuming ready after timeout)');
            this.isServerRunning = true;
            
            // Query available tools from Lokka to understand what's available
            try {
              const toolsRequest = {
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/list'
              };
              
              const toolsResponse = await this.sendMCPRequest(toolsRequest);
              if (toolsResponse.result && toolsResponse.result.tools) {
                console.log('Available Lokka tools:', toolsResponse.result.tools.map((t: any) => t.name));
              }
            } catch (error) {
              console.log('Could not query Lokka tools list:', error);
            }
            
            resolve();
          }
        }, 5000); // 5 second timeout
      } catch (error) {
        console.error('Error starting Lokka server:', error);
        reject(error);
      }
    });
    
    return this.startupPromise;
  }

  async stopServer(): Promise<void> {
    if (this.serverProcess && !this.serverProcess.killed) {
      this.serverProcess.kill();
      this.isServerRunning = false;
      console.log('Lokka server process killed');
    }
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      // Ensure server is running
      await this.startServer();
      
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
        error: MCPErrorHandler.handleError(error, `ExternalLokkaMCPServer.handleRequest.${request.method}`)
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
            result: await this.executeGraphQuery(args)
          };
            case 'd94_Lokka-Microsoft':
          return {
            id: request.id,
            result: await this.executeLokkaQuery(args)
          };
          
        case 'Lokka-Microsoft':
          return {
            id: request.id,
            result: await this.executeLokkaQuery(args)
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
        error: MCPErrorHandler.handleError(error, `ExternalLokkaMCPServer.executeTool.${toolName}`)
      };
    }
  }
  private async executeGraphQuery(params: any): Promise<any> {
    try {
      if (!params.endpoint) {
        throw new Error('Endpoint is required for Graph API queries');
      }

      const method = (params.method || 'GET').toLowerCase();
        // Construct the MCP request for the Lokka server
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'Lokka-Microsoft',
          arguments: {
            apiType: 'graph',
            path: params.endpoint,
            method: method,
            queryParams: params.queryParams,
            body: params.body
          }
        }
      };

      // Send the request via stdio to the Lokka MCP server
      const response = await this.sendMCPRequest(mcpRequest);
      
      if (response.error) {
        throw new Error(`Lokka server returned error: ${response.error.message}`);
      }

      return {
        content: [
          {
            type: 'json',
            json: response.result
          }
        ]
      };
    } catch (error) {
      console.error('Error executing Graph query via Lokka:', error);
      throw new Error(`Failed to execute Graph query: ${(error as Error).message}`);
    }
  }

  private async executeLokkaQuery(params: any): Promise<any> {
    try {
      if (!params.apiType || !params.path || !params.method) {
        throw new Error('apiType, path, and method are required for Lokka queries');
      }      // Construct the MCP request for the Lokka server
      const mcpRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: 'Lokka-Microsoft',
          arguments: params
        }
      };

      // Send the request via stdio to the Lokka MCP server
      const response = await this.sendMCPRequest(mcpRequest);
      
      if (response.error) {
        throw new Error(`Lokka server returned error: ${response.error.message}`);
      }

      return {
        content: [
          {
            type: 'json',
            json: response.result
          }
        ]
      };
    } catch (error) {
      console.error('Error executing Lokka query:', error);
      throw new Error(`Failed to execute Lokka query: ${(error as Error).message}`);
    }
  }

  /**
   * Send MCP request via stdio to the Lokka server
   */
  private async sendMCPRequest(request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess || !this.serverProcess.stdin || !this.serverProcess.stdout) {
        reject(new Error('Lokka server process not available'));
        return;
      }

      const requestId = request.id;
      const requestJson = JSON.stringify(request) + '\n';
      
      // Set up response handler
      const responseHandler = (data: Buffer) => {
        const output = data.toString();
        try {
          // Try to parse each line as JSON
          const lines = output.trim().split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line);
              if (response.id === requestId) {
                this.serverProcess?.stdout?.off('data', responseHandler);
                resolve(response);
                return;
              }
            }
          }
        } catch (error) {
          // Ignore parsing errors for non-JSON output
        }
      };

      // Set up timeout
      const timeout = setTimeout(() => {
        this.serverProcess?.stdout?.off('data', responseHandler);
        reject(new Error('Lokka server request timeout'));
      }, 30000); // 30 second timeout      // Listen for response
      this.serverProcess.stdout.on('data', responseHandler);

      // Send the request
      this.serverProcess.stdin.write(requestJson);
    });
  }
}
