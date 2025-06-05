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

  constructor(serverConfigs: MCPServerConfig[], authService?: MCPAuthService) {
    this.configs = serverConfigs;
    this.authService = authService;
    this.initializeServers();
  }

  private initializeServers(): void {
    this.configs.forEach(config => {
      if (config.enabled) {
        try {
          const serverInstance = MCPServerFactory.createServer(config, this.authService);
          this.servers.set(config.name, serverInstance);
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
}

// Default export to resolve module issues
export default MCPServerManager;
