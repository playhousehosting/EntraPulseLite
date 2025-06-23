// MCPServerManager.ts
// Service for managing MCP servers

import { MCPServerConfig } from '../types';
import { MCPServerFactory, MCPServerHandlers } from './MCPServerFactory';
import { MCPAuthService } from '../auth/MCPAuthService';
import { ConfigService } from '../../shared/ConfigService';

// Explicitly export the class to resolve module issue
export class MCPServerManager {
  private servers: Map<string, MCPServerHandlers> = new Map();
  private configs: MCPServerConfig[] = [];
  private authService?: MCPAuthService;
  private configService?: ConfigService;
    // Static instance for singleton access
  private static _instance: MCPServerManager | null = null;
  
  // Static getter to access the instance
  public static get instance(): MCPServerManager | null {
    return MCPServerManager._instance;
  }

  constructor(serverConfigs: MCPServerConfig[], authService?: MCPAuthService, configService?: ConfigService) {
    this.configs = serverConfigs;
    this.authService = authService;
    this.configService = configService;
    this.initializeServers();
    
    // Store instance reference for singleton access
    MCPServerManager._instance = this;
    console.log('MCPServerManager instance created and stored');
  }private initializeServers(): void {
    console.log(`Initializing ${this.configs.length} MCP servers...`);
    
    this.configs.forEach(config => {
      if (config.enabled) {        try {
          console.log(`Creating MCP server: ${config.name} (${config.type})`);
          const serverInstance = MCPServerFactory.createServer(config, this.authService, this.configService);
          this.servers.set(config.name, serverInstance);
          
          // Start server if it has a startServer method
          if (serverInstance.startServer) {
            console.log(`Starting MCP server: ${config.name}`);
            serverInstance.startServer()
              .then(() => console.log(`MCP server '${config.name}' started successfully`))
              .catch(err => console.error(`Failed to start MCP server '${config.name}':`, err));
          }
          
          console.log(`MCP server '${config.name}' initialized successfully`);
        } catch (error) {
          console.error(`Failed to initialize MCP server '${config.name}':`, error);
        }
      } else {
        console.log(`Skipping disabled MCP server: ${config.name}`);
      }
    });
    
    console.log(`MCP servers initialization complete. ${this.servers.size} servers initialized.`);
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
    console.log('Stopping all MCP servers...');
    
    const stopPromises = Array.from(this.servers.entries()).map(async ([name, server]) => {
      if (server.stopServer) {
        try {
          await server.stopServer();
          console.log(`Successfully stopped MCP server: ${name}`);
        } catch (error) {
          console.error(`Error stopping MCP server ${name}:`, error);
        }
      }
    });

    await Promise.all(stopPromises);
    this.servers.clear();
    console.log('All MCP servers stopped');
  }

  public getServer(name: string): MCPServerHandlers | undefined {
    return this.servers.get(name);
  }

  public getAllServers(): Map<string, MCPServerHandlers> {
    return this.servers;
  }
}

// Default export to resolve module issues
export default MCPServerManager;
