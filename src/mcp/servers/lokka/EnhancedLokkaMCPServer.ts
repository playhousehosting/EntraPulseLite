import { EventEmitter } from 'events';
import { ManagedLokkaMCPClient } from '../../clients/ManagedLokkaMCPClient';

export interface EnhancedLokkaMCPServerConfig {
  name: string;
  enabled: boolean;
  environment: Record<string, string>;
}

/**
 * Enhanced Lokka MCP Server using managed execution environment
 * This ensures environment variables are properly passed to the Lokka process
 */
export class EnhancedLokkaMCPServer extends EventEmitter {
  private managedClient: ManagedLokkaMCPClient | null = null;
  private config: EnhancedLokkaMCPServerConfig;
  constructor(config: EnhancedLokkaMCPServerConfig) {
    super();
    this.config = config;
    
    console.log('[EnhancedLokkaMCP] Creating enhanced Lokka server:', {
      name: config.name,
      enabled: config.enabled,
      hasEnvironment: !!config.environment,
      envVarCount: Object.keys(config.environment || {}).length
    });
  }

  /**
   * Start the enhanced Lokka MCP server
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[EnhancedLokkaMCP] Server disabled, not starting');
      return;
    }

    if (this.managedClient?.isAlive()) {
      console.log('[EnhancedLokkaMCP] Server already running');
      return;
    }

    console.log('[EnhancedLokkaMCP] Starting enhanced Lokka server...');

    try {
      // Create managed client with environment variables
      this.managedClient = new ManagedLokkaMCPClient(this.config.environment);

      // Set up error handling
      this.managedClient.on('error', (error) => {
        console.error('[EnhancedLokkaMCP] Client error:', error);
        this.emit('error', error);
      });

      this.managedClient.on('exit', (code, signal) => {
        console.log('[EnhancedLokkaMCP] Client exited:', { code, signal });
        this.managedClient = null;
        this.emit('exit', code, signal);
      });

      // Start the managed client
      await this.managedClient.start();
      
      console.log('[EnhancedLokkaMCP] ✅ Enhanced Lokka server started successfully');
      this.emit('ready');
    } catch (error) {
      console.error('[EnhancedLokkaMCP] ❌ Failed to start enhanced Lokka server:', error);
      this.managedClient = null;
      throw error;
    }
  }

  /**
   * Stop the enhanced Lokka MCP server
   */
  async stop(): Promise<void> {
    console.log('[EnhancedLokkaMCP] Stopping enhanced Lokka server...');

    if (this.managedClient) {
      try {
        await this.managedClient.stop();
        console.log('[EnhancedLokkaMCP] ✅ Enhanced Lokka server stopped successfully');
      } catch (error) {
        console.error('[EnhancedLokkaMCP] ❌ Error stopping enhanced Lokka server:', error);
      }
      this.managedClient = null;
    }
  }

  /**
   * Check if the server is running
   */
  isRunning(): boolean {
    return this.managedClient?.isAlive() ?? false;
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any[]> {
    if (!this.managedClient?.isAlive()) {
      console.warn('[EnhancedLokkaMCP] Cannot list tools - client not running');
      return [];
    }

    try {
      const tools = await this.managedClient.listTools();
      console.log('[EnhancedLokkaMCP] Listed tools:', tools);
      return tools;
    } catch (error) {
      console.error('[EnhancedLokkaMCP] Failed to list tools:', error);
      return [];
    }
  }

  /**
   * Call a tool
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    if (!this.managedClient?.isAlive()) {
      throw new Error('Enhanced Lokka client not running');
    }

    console.log('[EnhancedLokkaMCP] Calling tool:', { name, arguments: arguments_ });

    try {
      const result = await this.managedClient.callTool(name, arguments_);
      console.log('[EnhancedLokkaMCP] Tool call result:', result);

      // Check if result contains actual data or just query arguments
      if (this.isQueryArgumentsResponse(result)) {
        console.warn('[EnhancedLokkaMCP] ⚠️ Received query arguments instead of actual data');
        throw new Error('Lokka authentication or configuration issue - received query arguments instead of actual Microsoft Graph data');
      }

      return result;
    } catch (error) {
      console.error('[EnhancedLokkaMCP] Tool call failed:', error);
      throw error;
    }
  }

  /**
   * Check if the response contains query arguments instead of actual data
   */
  private isQueryArgumentsResponse(result: any): boolean {
    if (!result || typeof result !== 'object') {
      return false;
    }

    // Check for common patterns that indicate query arguments response
    const resultString = JSON.stringify(result).toLowerCase();
    
    return (
      resultString.includes('query with args') ||
      resultString.includes('apitype') ||
      resultString.includes('method') ||
      resultString.includes('path') ||
      (resultString.includes('graph') && resultString.includes('args')) ||
      (result.content && typeof result.content === 'string' && 
       result.content.includes('Response from tool microsoft_graph_query with args'))
    );
  }

  /**
   * Get server status information
   */
  getStatus(): any {
    return {
      name: this.config.name,
      enabled: this.config.enabled,
      running: this.isRunning(),
      hasEnvironment: !!this.config.environment,
      environmentVars: Object.keys(this.config.environment || {}),
      type: 'enhanced-lokka'
    };
  }

  /**
   * Update server configuration
   */
  updateConfig(newConfig: Partial<EnhancedLokkaMCPServerConfig>): void {
    console.log('[EnhancedLokkaMCP] Updating configuration:', newConfig);
    
    const wasRunning = this.isRunning();
    
    // Update configuration
    this.config = { ...this.config, ...newConfig };
    
    // If enabled state changed or environment changed, restart if running
    if (wasRunning && (newConfig.enabled !== undefined || newConfig.environment)) {
      console.log('[EnhancedLokkaMCP] Configuration changed, restarting server...');
      this.stop().then(() => {
        if (this.config.enabled) {
          this.start().catch(error => {
            console.error('[EnhancedLokkaMCP] Failed to restart after config update:', error);
          });
        }
      });
    }
  }
}
