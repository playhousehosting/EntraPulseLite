// ExternalLokkaMCPStdioServer.ts
// Proper implementation of Lokka MCP Server using stdio communication

import { MCPRequest, MCPResponse, MCPServerConfig, MCPTool } from '../../types';
import { MCPErrorHandler, ErrorCode } from '../../utils';
import { MCPAuthService } from '../../auth/MCPAuthService';
import { StdioMCPClient } from '../../clients/StdioMCPClient';

export interface ExternalLokkaMCPServerConfig extends MCPServerConfig {
  env?: {
    TENANT_ID?: string;
    CLIENT_ID?: string;
    CLIENT_SECRET?: string;
    [key: string]: string | undefined;
  };
}

export class ExternalLokkaMCPStdioServer {
  private config: ExternalLokkaMCPServerConfig;
  private authService: MCPAuthService;
  private mcpClient: StdioMCPClient | null = null;
  private tools: MCPTool[] = [];

  constructor(config: ExternalLokkaMCPServerConfig, authService: MCPAuthService) {
    this.config = config;
    this.authService = authService;
    this.initializeTools();
  }

  private initializeTools(): void {
    // Define the tools we expect Lokka to provide
    this.tools = [
      {
        name: 'Lokka-Microsoft',
        description: 'Query Microsoft Graph API via Lokka MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            apiType: {
              type: 'string',
              description: 'API type (graph or azure)',
              enum: ['graph', 'azure']
            },
            method: {
              type: 'string',
              description: 'HTTP method (get, post, put, patch, delete)',
              enum: ['get', 'post', 'put', 'patch', 'delete']
            },
            path: {
              type: 'string',
              description: 'API path (e.g., /me, /users, /groups)'
            },
            queryParams: {
              type: 'object',
              description: 'Query parameters as key-value pairs'
            },
            body: {
              type: 'object',
              description: 'Request body for POST/PUT/PATCH requests'
            },
            subscriptionId: {
              type: 'string',
              description: 'Azure subscription ID (for Azure API calls)'
            },
            apiVersion: {
              type: 'string',
              description: 'API version (for Azure API calls)'
            }
          },
          required: ['apiType', 'method', 'path']
        }
      }
    ];
  }

  async startServer(): Promise<void> {
    if (this.mcpClient?.isRunning()) {
      console.log('Lokka MCP server already running');
      return;
    }

    console.log('Starting Lokka MCP server via stdio...');
      // Create the MCP client configuration
    const clientConfig: MCPServerConfig = {
      name: this.config.name,
      type: this.config.type,
      port: this.config.port || 0, // Not used for stdio, but required by interface
      enabled: true,
      command: this.config.command || 'npx',
      args: this.config.args || ['-y', '@merill/lokka'],
      options: {
        env: {
          TENANT_ID: this.config.env?.TENANT_ID || process.env.LOKKA_TENANT_ID,
          CLIENT_ID: this.config.env?.CLIENT_ID || process.env.LOKKA_CLIENT_ID,
          CLIENT_SECRET: this.config.env?.CLIENT_SECRET || process.env.LOKKA_CLIENT_SECRET
        }
      }
    };

    console.log('Lokka environment:', {
      TENANT_ID: clientConfig.options?.env?.TENANT_ID ? 'SET' : 'NOT SET',
      CLIENT_ID: clientConfig.options?.env?.CLIENT_ID ? 'SET' : 'NOT SET',
      CLIENT_SECRET: clientConfig.options?.env?.CLIENT_SECRET ? 'SET' : 'NOT SET'
    });

    this.mcpClient = new StdioMCPClient(clientConfig);
    await this.mcpClient.start();

    // Verify tools are available
    try {
      const availableTools = await this.mcpClient.listTools();
      console.log('Available Lokka MCP tools:', availableTools.map(t => t.name));
      
      // Update our tools list with what the server actually provides
      if (availableTools.length > 0) {
        this.tools = availableTools;
      }
    } catch (error) {
      console.error('Failed to list tools from Lokka MCP server:', error);
    }

    console.log('Lokka MCP server started successfully');
  }

  async stopServer(): Promise<void> {
    if (this.mcpClient) {
      console.log('Stopping Lokka MCP server...');
      await this.mcpClient.stop();
      this.mcpClient = null;
      console.log('Lokka MCP server stopped');
    }
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.mcpClient?.isInitialized()) {
      throw new Error('Lokka MCP server not initialized');
    }

    try {
      const tools = await this.mcpClient.listTools();
      return tools;
    } catch (error) {
      console.error('Failed to list tools from Lokka MCP server:', error);
      return this.tools; // Return our cached tools as fallback
    }
  }
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    if (!this.mcpClient?.isInitialized()) {
      return {
        id: request.id,
        error: MCPErrorHandler.createError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Lokka MCP server not initialized'
        )
      };
    }

    try {
      console.log('Handling Lokka MCP request:', request);
      
      // For tool calls, extract the tool name and arguments
      if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        const result = await this.mcpClient.callTool(name, args);
        
        return {
          id: request.id,
          result
        };
      }
      
      // For other requests, forward directly
      // Note: This is a simplified implementation
      throw new Error(`Unsupported request method: ${request.method}`);
      
    } catch (error) {
      console.error('Lokka MCP request failed:', error);
      return {
        id: request.id,
        error: MCPErrorHandler.createError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          `Lokka MCP request failed: ${(error as Error).message}`
        )
      };
    }
  }

  // Compatibility method for the existing interface
  async callTool(toolName: string, arguments_: any): Promise<any> {
    if (!this.mcpClient?.isInitialized()) {
      throw new Error('Lokka MCP server not initialized');
    }

    console.log(`Calling Lokka MCP tool: ${toolName}`, arguments_);
    
    try {
      const result = await this.mcpClient.callTool(toolName, arguments_);
      console.log(`Lokka MCP tool result:`, result);
      return result;
    } catch (error) {
      console.error(`Lokka MCP tool call failed:`, error);
      throw error;
    }
  }

  // Check if the server is running and initialized
  isReady(): boolean {
    return this.mcpClient?.isInitialized() || false;
  }
  // Get server status for debugging
  getStatus(): { running: boolean; initialized: boolean; toolCount: number } {
    return {
      running: this.mcpClient?.isRunning() || false,
      initialized: this.mcpClient?.isInitialized() || false,
      toolCount: this.tools.length
    };
  }
}

// Export for module compatibility
export default ExternalLokkaMCPStdioServer;
