// MCP Client for communicating with Model Context Protocol servers
import { MCPServerConfig } from '../types';
import { MCPServerManager } from '../servers/MCPServerManager';
import { MCPAuthService } from '../auth/MCPAuthService';

export interface MCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPClient {
  private serverManager: MCPServerManager;
  private servers: Map<string, MCPServerConfig> = new Map();
  constructor(serverConfigs: MCPServerConfig[], authService?: MCPAuthService) {
    // Initialize server manager with auth service if provided
    this.serverManager = new MCPServerManager(serverConfigs, authService);
    
    // Keep track of server configs for backward compatibility
    serverConfigs.forEach(config => {
      this.servers.set(config.name, config);
    });
  }

  async call(serverName: string, method: string, params?: any): Promise<any> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    if (!server.enabled) {
      throw new Error(`MCP server '${serverName}' is disabled`);
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    };

    try {
      // For built-in servers, we'll use direct communication
      // In a real implementation, this would use the MCP protocol
      const response = await this.sendRequest(server, request);
      
      if (response.error) {
        throw new Error(`MCP Error: ${response.error.message}`);
      }

      return response.result;
    } catch (error) {
      console.error(`MCP call failed for server ${serverName}:`, error);
      throw error;
    }
  }

  async listTools(serverName: string): Promise<any[]> {
    return this.call(serverName, 'tools/list');
  }

  async callTool(serverName: string, toolName: string, arguments_: any): Promise<any> {
    return this.call(serverName, 'tools/call', {
      name: toolName,
      arguments: arguments_,
    });
  }

  getAvailableServers(): MCPServerConfig[] {
    return Array.from(this.servers.values()).filter(server => server.enabled);
  }  
  
  async stopAllServers(): Promise<void> {
    try {
      await this.serverManager.stopAllServers();
    } catch (error) {
      console.error('Error stopping MCP servers:', error);
      throw error;
    }
  }

  private async sendRequest(server: MCPServerConfig, request: MCPRequest): Promise<MCPResponse> {
    try {
      // Convert the request format if needed
      const mcpRequest = {
        id: request.id,
        method: request.method,
        params: request.params
      };
      
      // Use the server manager to handle the request
      const response = await this.serverManager.handleRequest(server.name, mcpRequest);
      
      // Convert the response back to the expected format
      return {
        jsonrpc: '2.0',
        id: request.id,
        result: response.result,
        error: response.error
      };
    } catch (error) {
      console.error(`Error calling MCP server ${server.name}:`, error);
      return {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: `Internal server error: ${(error as Error).message}`
        }
      };
    }
  }
  // No need for separate handlers for each server type
  // All request handling is now delegated to the server implementations via the factory
}
