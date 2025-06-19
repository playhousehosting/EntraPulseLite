// MCP Client for communicating with Model Context Protocol servers
import { MCPServerConfig } from '../types';
import { MCPServerManager } from '../servers/MCPServerManager';
import { MCPAuthService } from '../auth/MCPAuthService';
import { MicrosoftDocsMCPClient } from './MicrosoftDocsMCPClient';

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
  private microsoftDocsClients: Map<string, MicrosoftDocsMCPClient> = new Map();
  private authService?: MCPAuthService;

  constructor(serverConfigs: MCPServerConfig[], authService?: MCPAuthService) {
    this.authService = authService;
    // Initialize server manager with auth service if provided
    this.serverManager = new MCPServerManager(serverConfigs, authService);
    
    // Keep track of server configs for backward compatibility
    serverConfigs.forEach(config => {
      this.servers.set(config.name, config);
      
      // Initialize Microsoft Docs MCP clients
      if (config.type === 'microsoft-docs' && config.enabled && authService) {
        this.microsoftDocsClients.set(config.name, new MicrosoftDocsMCPClient(config, authService));
      }
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
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    if (!server.enabled) {
      throw new Error(`MCP server '${serverName}' is disabled`);
    }

    // Handle Microsoft Docs MCP server
    if (server.type === 'microsoft-docs') {
      const client = this.microsoftDocsClients.get(serverName);
      if (!client) {
        throw new Error(`Microsoft Docs MCP client for '${serverName}' not initialized`);
      }
      return await client.listTools();
    }

    // Handle other server types using existing logic
    return this.call(serverName, 'tools/list');
  }
  async callTool(serverName: string, toolName: string, arguments_: any): Promise<any> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    if (!server.enabled) {
      throw new Error(`MCP server '${serverName}' is disabled`);
    }

    // Handle Microsoft Docs MCP server
    if (server.type === 'microsoft-docs') {
      const client = this.microsoftDocsClients.get(serverName);
      if (!client) {
        throw new Error(`Microsoft Docs MCP client for '${serverName}' not initialized`);
      }
      return await client.callTool(toolName, arguments_);
    }

    // Handle other server types using existing logic
    return this.call(serverName, 'tools/call', {
      name: toolName,
      arguments: arguments_,
    });
  }
  getAvailableServers(): MCPServerConfig[] {
    return Array.from(this.servers.values()).filter(server => server.enabled);
  }

  async listResources(serverName: string): Promise<any[]> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    if (!server.enabled) {
      throw new Error(`MCP server '${serverName}' is disabled`);
    }

    // Handle Microsoft Docs MCP server
    if (server.type === 'microsoft-docs') {
      const client = this.microsoftDocsClients.get(serverName);
      if (!client) {
        throw new Error(`Microsoft Docs MCP client for '${serverName}' not initialized`);
      }
      return await client.listResources();
    }

    // Handle other server types using existing logic
    return this.call(serverName, 'resources/list');
  }

  async readResource(serverName: string, uri: string): Promise<any> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server '${serverName}' not found`);
    }

    if (!server.enabled) {
      throw new Error(`MCP server '${serverName}' is disabled`);
    }

    // Handle Microsoft Docs MCP server
    if (server.type === 'microsoft-docs') {
      const client = this.microsoftDocsClients.get(serverName);
      if (!client) {
        throw new Error(`Microsoft Docs MCP client for '${serverName}' not initialized`);
      }
      return await client.readResource(uri);
    }

    // Handle other server types using existing logic
    return this.call(serverName, 'resources/read', { uri });
  }

  async initializeMicrosoftDocsClients(): Promise<void> {
    const promises = Array.from(this.microsoftDocsClients.values()).map(client => 
      client.initialize().catch(error => {
        console.error('Failed to initialize Microsoft Docs MCP client:', error);
        // Don't throw here to allow other clients to initialize
      })
    );
    
    await Promise.all(promises);
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
