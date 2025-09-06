// MCP (Model Context Protocol) Service
// Manages MCP server connections, marketplace, and integrations

import EventEmitter from 'eventemitter3';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: 'Graph' | 'Analytics' | 'Security' | 'Productivity' | 'Integration' | 'Custom';
  status: 'Available' | 'Installed' | 'Running' | 'Stopped' | 'Error';
  endpoint: string;
  capabilities: string[];
  permissions: string[];
  config: Record<string, any>;
  lastUpdated: Date;
  installDate?: Date;
  isOfficial: boolean;
  rating: number;
  downloads: number;
  dependencies: string[];
  resources?: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
}

export interface MCPConnection {
  serverId: string;
  connectionId: string;
  status: 'Connected' | 'Disconnected' | 'Error' | 'Connecting';
  lastActivity: Date;
  messagesSent: number;
  messagesReceived: number;
  errorCount: number;
  metadata: Record<string, any>;
}

export interface MCPMarketplaceItem {
  id: string;
  server: MCPServer;
  screenshots: string[];
  documentation: string;
  supportUrl: string;
  sourceUrl?: string;
  licenseType: 'MIT' | 'Apache' | 'GPL' | 'Commercial' | 'Other';
  pricing: {
    type: 'Free' | 'Paid' | 'Freemium' | 'Subscription';
    amount?: number;
    currency?: string;
    interval?: 'Monthly' | 'Yearly' | 'One-time';
  };
  reviews: Array<{
    userId: string;
    rating: number;
    comment: string;
    date: Date;
  }>;
  tags: string[];
  featured: boolean;
}

export interface MCPInstallOptions {
  autoStart?: boolean;
  configOverrides?: Record<string, any>;
  permissions?: string[];
  dependencies?: boolean;
}

export class MCPService extends EventEmitter {
  private availableServers: Map<string, MCPServer> = new Map();
  private installedServers: Map<string, MCPServer> = new Map();
  private connections: Map<string, MCPConnection> = new Map();
  private marketplaceItems: Map<string, MCPMarketplaceItem> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load available servers from marketplace
      await this.loadMarketplace();
      
      // Load installed servers
      await this.loadInstalledServers();
      
      // Initialize connections to running servers
      await this.initializeConnections();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize MCP Service:', error);
      this.emit('error', error);
    }
  }

  // Marketplace Operations
  async getMarketplace(): Promise<MCPMarketplaceItem[]> {
    return Array.from(this.marketplaceItems.values());
  }

  async searchMarketplace(query: string, category?: string): Promise<MCPMarketplaceItem[]> {
    const items = Array.from(this.marketplaceItems.values());
    return items.filter(item => {
      const matchesQuery = !query || 
        item.server.name.toLowerCase().includes(query.toLowerCase()) ||
        item.server.description.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = !category || item.server.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }

  async getFeaturedServers(): Promise<MCPMarketplaceItem[]> {
    return Array.from(this.marketplaceItems.values()).filter(item => item.featured);
  }

  async getServerDetails(serverId: string): Promise<MCPMarketplaceItem | null> {
    return this.marketplaceItems.get(serverId) || null;
  }

  // Server Management
  async installServer(serverId: string, options: MCPInstallOptions = {}): Promise<boolean> {
    try {
      const marketplaceItem = this.marketplaceItems.get(serverId);
      if (!marketplaceItem) {
        throw new Error(`Server ${serverId} not found in marketplace`);
      }

      const server = { ...marketplaceItem.server };
      
      // Install dependencies if requested
      if (options.dependencies && server.dependencies.length > 0) {
        for (const depId of server.dependencies) {
          if (!this.installedServers.has(depId)) {
            await this.installServer(depId, { ...options, dependencies: false });
          }
        }
      }

      // Apply config overrides
      if (options.configOverrides) {
        server.config = { ...server.config, ...options.configOverrides };
      }

      // Apply permission overrides
      if (options.permissions) {
        server.permissions = options.permissions;
      }

      // Mark as installed
      server.status = 'Installed';
      server.installDate = new Date();
      this.installedServers.set(serverId, server);

      // Auto-start if requested
      if (options.autoStart) {
        await this.startServer(serverId);
      }

      // Notify via IPC
      await (window.electronAPI as any).mcp.installServer(serverId, server, options);

      this.emit('serverInstalled', { serverId, server });
      return true;
    } catch (error) {
      console.error(`Failed to install server ${serverId}:`, error);
      this.emit('installError', { serverId, error });
      return false;
    }
  }

  async uninstallServer(serverId: string): Promise<boolean> {
    try {
      const server = this.installedServers.get(serverId);
      if (!server) {
        throw new Error(`Server ${serverId} is not installed`);
      }

      // Stop server if running
      if (server.status === 'Running') {
        await this.stopServer(serverId);
      }

      // Remove from installed servers
      this.installedServers.delete(serverId);

      // Notify via IPC
      await (window.electronAPI as any).mcp.uninstallServer(serverId);

      this.emit('serverUninstalled', { serverId });
      return true;
    } catch (error) {
      console.error(`Failed to uninstall server ${serverId}:`, error);
      this.emit('uninstallError', { serverId, error });
      return false;
    }
  }

  async getInstalledServers(): Promise<MCPServer[]> {
    return Array.from(this.installedServers.values());
  }

  async updateServer(serverId: string): Promise<boolean> {
    try {
      const marketplaceItem = this.marketplaceItems.get(serverId);
      const installedServer = this.installedServers.get(serverId);

      if (!marketplaceItem || !installedServer) {
        throw new Error(`Server ${serverId} not found`);
      }

      // Check if update is available
      if (marketplaceItem.server.version === installedServer.version) {
        return true; // Already up to date
      }

      // Stop server if running
      const wasRunning = installedServer.status === 'Running';
      if (wasRunning) {
        await this.stopServer(serverId);
      }

      // Update server
      const updatedServer = { 
        ...marketplaceItem.server,
        status: 'Installed' as const,
        installDate: installedServer.installDate,
        config: { ...installedServer.config }
      };

      this.installedServers.set(serverId, updatedServer);

      // Restart if it was running
      if (wasRunning) {
        await this.startServer(serverId);
      }

      // Notify via IPC
      await (window.electronAPI as any).mcp.updateServer(serverId, updatedServer);

      this.emit('serverUpdated', { serverId, server: updatedServer });
      return true;
    } catch (error) {
      console.error(`Failed to update server ${serverId}:`, error);
      this.emit('updateError', { serverId, error });
      return false;
    }
  }

  // Server Lifecycle
  async startServer(serverId: string): Promise<boolean> {
    try {
      const server = this.installedServers.get(serverId);
      if (!server) {
        throw new Error(`Server ${serverId} is not installed`);
      }

      if (server.status === 'Running') {
        return true; // Already running
      }

      // Start server via IPC
      const result = await (window.electronAPI as any).mcp.startServer(serverId);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Update status
      server.status = 'Running';
      this.installedServers.set(serverId, server);

      // Create connection
      const connection: MCPConnection = {
        serverId,
        connectionId: result.connectionId,
        status: 'Connected',
        lastActivity: new Date(),
        messagesSent: 0,
        messagesReceived: 0,
        errorCount: 0,
        metadata: {}
      };
      this.connections.set(serverId, connection);

      this.emit('serverStarted', { serverId, server });
      return true;
    } catch (error) {
      console.error(`Failed to start server ${serverId}:`, error);
      const server = this.installedServers.get(serverId);
      if (server) {
        server.status = 'Error';
        this.installedServers.set(serverId, server);
      }
      this.emit('startError', { serverId, error });
      return false;
    }
  }

  async stopServer(serverId: string): Promise<boolean> {
    try {
      const server = this.installedServers.get(serverId);
      if (!server) {
        throw new Error(`Server ${serverId} is not installed`);
      }

      if (server.status === 'Stopped') {
        return true; // Already stopped
      }

      // Stop server via IPC
      const result = await (window.electronAPI as any).mcp.stopServer(serverId);
      if (!result.success) {
        throw new Error(result.error);
      }

      // Update status
      server.status = 'Stopped';
      this.installedServers.set(serverId, server);

      // Remove connection
      this.connections.delete(serverId);

      this.emit('serverStopped', { serverId, server });
      return true;
    } catch (error) {
      console.error(`Failed to stop server ${serverId}:`, error);
      this.emit('stopError', { serverId, error });
      return false;
    }
  }

  async restartServer(serverId: string): Promise<boolean> {
    const stopResult = await this.stopServer(serverId);
    if (!stopResult) return false;

    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 1000));

    return await this.startServer(serverId);
  }

  // Connection Management
  async getConnections(): Promise<MCPConnection[]> {
    return Array.from(this.connections.values());
  }

  async getConnection(serverId: string): Promise<MCPConnection | null> {
    return this.connections.get(serverId) || null;
  }

  async testConnection(serverId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(serverId);
      if (!connection) {
        return false;
      }

      const result = await (window.electronAPI as any).mcp.testConnection(serverId);
      
      // Update connection stats
      connection.lastActivity = new Date();
      if (result.success) {
        connection.status = 'Connected';
      } else {
        connection.status = 'Error';
        connection.errorCount++;
      }
      
      this.connections.set(serverId, connection);
      return result.success;
    } catch (error) {
      console.error(`Failed to test connection for server ${serverId}:`, error);
      return false;
    }
  }

  // Communication
  async sendMessage(serverId: string, message: any): Promise<any> {
    try {
      const connection = this.connections.get(serverId);
      if (!connection || connection.status !== 'Connected') {
        throw new Error(`No active connection to server ${serverId}`);
      }

      const result = await (window.electronAPI as any).mcp.sendMessage(serverId, message);
      
      // Update connection stats
      connection.messagesSent++;
      connection.lastActivity = new Date();
      this.connections.set(serverId, connection);

      return result;
    } catch (error) {
      console.error(`Failed to send message to server ${serverId}:`, error);
      const connection = this.connections.get(serverId);
      if (connection) {
        connection.errorCount++;
        this.connections.set(serverId, connection);
      }
      throw error;
    }
  }

  // Configuration
  async updateServerConfig(serverId: string, config: Record<string, any>): Promise<boolean> {
    try {
      const server = this.installedServers.get(serverId);
      if (!server) {
        throw new Error(`Server ${serverId} is not installed`);
      }

      // Update config
      server.config = { ...server.config, ...config };
      this.installedServers.set(serverId, server);

      // Save config via IPC
      await (window.electronAPI as any).mcp.updateServerConfig(serverId, server.config);

      this.emit('configUpdated', { serverId, config: server.config });
      return true;
    } catch (error) {
      console.error(`Failed to update config for server ${serverId}:`, error);
      return false;
    }
  }

  // Private methods
  private async loadMarketplace(): Promise<void> {
    try {
      // Load from remote marketplace or local cache
      const result = await (window.electronAPI as any).mcp.getMarketplace();
      if (result.success) {
        result.data.forEach((item: MCPMarketplaceItem) => {
          this.marketplaceItems.set(item.id, item);
          this.availableServers.set(item.id, item.server);
        });
      }
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    }
  }

  private async loadInstalledServers(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).mcp.getInstalledServers();
      if (result.success) {
        result.data.forEach((server: MCPServer) => {
          this.installedServers.set(server.id, server);
        });
      }
    } catch (error) {
      console.error('Failed to load installed servers:', error);
    }
  }

  private async initializeConnections(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).mcp.getActiveConnections();
      if (result.success) {
        result.data.forEach((connection: MCPConnection) => {
          this.connections.set(connection.serverId, connection);
        });
      }
    } catch (error) {
      console.error('Failed to initialize connections:', error);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Stop all running servers
    const runningServers = Array.from(this.installedServers.values())
      .filter(server => server.status === 'Running');

    for (const server of runningServers) {
      await this.stopServer(server.id);
    }

    // Clear all data
    this.availableServers.clear();
    this.installedServers.clear();
    this.connections.clear();
    this.marketplaceItems.clear();

    this.removeAllListeners();
  }
}

export default MCPService;