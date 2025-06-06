// MCPServerManager.ts
// Service for managing MCP servers

import { MCPServerConfig } from '../types';
import { MCPServerFactory, MCPServerHandlers } from './MCPServerFactory';
import { MCPAuthService } from '../auth/MCPAuthService';

// Explicitly export the class to resolve module issue
export class MCPServerManager {
  private servers: Map<string, MCPServerHandlers> = new Map();
  private configs: MCPServerConfig[] = [];
  private authService?: MCPAuthService;
  
  // Static instance for singleton access
  static _instance: MCPServerManager | null = null;

  constructor(serverConfigs: MCPServerConfig[], authService?: MCPAuthService) {
    this.configs = serverConfigs;
    this.authService = authService;
    this.initializeServers();
    
    // Store instance reference for singleton access
    MCPServerManager._instance = this;
  }
  private initializeServers(): void {
    this.configs.forEach(config => {
      if (config.enabled) {
        try {
          const serverInstance = MCPServerFactory.createServer(config, this.authService);
          this.servers.set(config.name, serverInstance);
          
          // Start server if it has a startServer method (like ExternalLokkaMCPServer)
          if (serverInstance.startServer) {
            serverInstance.startServer()
              .then(() => console.log(`MCP server '${config.name}' started successfully`))
              .catch(err => console.error(`Failed to start MCP server '${config.name}':`, err));
          }
          
          console.log(`MCP server '${config.name}' initialized successfully`);
        } catch (error) {
          console.error(`Failed to initialize MCP server '${config.name}':`, error);
        }
      }
    });
  }

  getServerInstance(name: string): MCPServerHandlers {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`MCP server '${name}' not found or not enabled`);
    }
    return server;
  }

  getEnabledServerConfigs(): MCPServerConfig[] {
    return this.configs.filter(config => config.enabled);
  }

  async handleRequest(serverName: string, request: any): Promise<any> {
    const server = this.getServerInstance(serverName);
    return server.handleRequest(request);
  }
  
  async stopAllServers(): Promise<void> {
    const stopPromises: Promise<void>[] = [];
    
    for (const [name, server] of this.servers.entries()) {
      if (server.stopServer) {
        console.log(`Stopping MCP server: ${name}`);
        stopPromises.push(
          server.stopServer()
            .catch(err => console.error(`Error stopping MCP server ${name}:`, err))
        );
      }
    }
    
    await Promise.all(stopPromises);
    console.log('All MCP servers stopped');
  }
}

// Default export to resolve module issues
export default MCPServerManager;
