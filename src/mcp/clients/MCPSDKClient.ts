// MCPClient.ts - SDK Implementation
// MCP Client using the MCP TypeScript SDK

// Import from mock for now, replace with actual SDK when available
import { MCPClient as SDKMCPClient, MCPClientConfig, Tool } from '../mock';
import { MCPAuthService } from '../auth/MCPAuthService';
import { MCPServerConfig } from '../types';

export interface MCPResponse {
  content: Array<{
    type: string;
    text?: string;
    url?: string;
    name?: string;
    json?: any;
    [key: string]: any;
  }>;
}

export class MCPClient {
  private clients: Map<string, SDKMCPClient> = new Map();
  private serverConfigs: Map<string, MCPServerConfig> = new Map();
  private authService: MCPAuthService;
  
  constructor(serverConfigs: MCPServerConfig[], authService: MCPAuthService) {
    this.authService = authService;
    
    // Store server configs for later reference
    serverConfigs.forEach(config => {
      if (config.enabled) {
        this.serverConfigs.set(config.name, config);
      }
    });
  }

  /**
   * Initialize the client for a specific server
   * @param serverName Name of the MCP server
   * @returns SDK MCP client for the server
   */
  private async initializeClient(serverName: string): Promise<SDKMCPClient> {
    // Check if client already exists
    if (this.clients.has(serverName)) {
      return this.clients.get(serverName)!;
    }

    const serverConfig = this.serverConfigs.get(serverName);
    if (!serverConfig) {
      throw new Error(`MCP server '${serverName}' not found or disabled`);
    }

    // Get authentication headers for this server type
    const authHeaders = await this.authService.getAuthHeaders(serverConfig.type);
    
    // Configure the SDK client
    const clientConfig: MCPClientConfig = {
      endpoint: serverConfig.url || `http://localhost:${serverConfig.port}`,
      headers: authHeaders,
      apiKey: serverConfig.apiKey
    };

    // Create the SDK client
    const client = new SDKMCPClient(clientConfig);
    
    // Store the client for reuse
    this.clients.set(serverName, client);
    
    return client;
  }

  /**
   * Get a list of available servers
   * @returns List of enabled server names
   */
  getAvailableServers(): string[] {
    return Array.from(this.serverConfigs.keys());
  }

  /**
   * Get a specific server configuration
   * @param serverName Name of the MCP server
   * @returns Server configuration
   */
  getServerConfig(serverName: string): MCPServerConfig | undefined {
    return this.serverConfigs.get(serverName);
  }

  /**
   * List available tools on an MCP server
   * @param serverName Name of the MCP server
   * @returns List of available tools
   */
  async listTools(serverName: string): Promise<Tool[]> {
    try {
      const client = await this.initializeClient(serverName);
      return await client.listTools();
    } catch (error) {
      console.error(`Failed to list tools for server ${serverName}:`, error);
      throw error;
    }
  }
  /**
   * Call a tool on an MCP server
   * @param serverName Name of the MCP server
   * @param toolName Name of the tool to call
   * @param arguments_ Arguments to pass to the tool
   * @returns Tool response
   */
  async callTool(serverName: string, toolName: string, arguments_: any): Promise<MCPResponse> {
    try {
      // For external-lokka server, try to get it from MCPServerManager first
      if (serverName === 'external-lokka') {
        try {
          const { MCPServerManager } = await import('../servers/MCPServerManager');
          const serverManager = MCPServerManager.instance;
          
          if (serverManager) {
            const server = serverManager.getServer('external-lokka');
            if (server && 'callTool' in server) {
              console.log(`Using MCPServerManager for ${serverName} tool call`);
              const result = await (server as any).callTool(toolName, arguments_);
              
              // Wrap result in MCP response format if it's not already
              if (result && typeof result === 'object' && result.content) {
                return result;
              } else {
                return {
                  content: [{
                    type: 'json',
                    json: result
                  }]
                };
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to use MCPServerManager for ${serverName}:`, error);
        }
      }
      
      // Fallback to SDK client
      const client = await this.initializeClient(serverName);
      const response = await client.callTool(toolName, arguments_);
      return response;
    } catch (error) {
      console.error(`Failed to call tool ${toolName} on server ${serverName}:`, error);
      throw new Error(`Failed to call tool ${toolName}: ${(error as Error).message}`);
    }
  }/**
   * Stop all MCP servers that have a stop method
   */
  async stopAllServers(): Promise<void> {
    try {
      // Import MCPServerManager dynamically to avoid circular dependencies
      const { MCPServerManager } = await import('../servers/MCPServerManager');
      
      // Get the MCPServerManager instance using the static getter
      const instance = MCPServerManager.instance;
      
      if (instance) {
        console.log('Found MCPServerManager instance, stopping servers...');
        await instance.stopAllServers();
      } else {
        console.warn('Could not find MCPServerManager instance to stop servers');
      }
    } catch (error) {
      console.error('Error stopping MCP servers:', error);
      throw error;
    }
  }

  /**
   * Start a specific MCP server by name
   * @param serverName Name of the MCP server to start
   * @returns Promise that resolves when the server is started
   */
  async startServer(serverName: string): Promise<void> {
    try {
      // Check if the server is in our configs
      const serverConfig = this.serverConfigs.get(serverName);
      if (!serverConfig || !serverConfig.enabled) {
        throw new Error(`MCP server '${serverName}' not found or disabled`);
      }
      
      // Import MCPServerManager dynamically to avoid circular dependencies
      const { MCPServerManager } = await import('../servers/MCPServerManager');
      
      // Get the MCPServerManager instance using the static getter
      const instance = MCPServerManager.instance;
      
      if (instance) {
        console.log(`Attempting to start MCP server '${serverName}' explicitly...`);
        
        // Get the server instance
        const server = instance.getServer(serverName);
        
        if (server && typeof server.startServer === 'function') {
          console.log(`Starting MCP server '${serverName}'...`);
          await server.startServer();
          console.log(`MCP server '${serverName}' started successfully`);
        } else {
          console.warn(`MCP server '${serverName}' does not have a startServer method`);
        }
      } else {
        console.warn('Could not find MCPServerManager instance to start server');
      }
    } catch (error) {
      console.error(`Error starting MCP server '${serverName}':`, error);
      throw error;
    }
  }
}
