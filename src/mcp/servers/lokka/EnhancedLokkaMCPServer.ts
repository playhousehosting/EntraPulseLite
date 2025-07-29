import { EventEmitter } from 'events';
import { ManagedDynamic_Endpoint_AssistantMCPClient } from '../../clients/ManagedLokkaMCPClient';

export interface EnhancedDynamic_Endpoint_AssistantMCPServerConfig {
  name: string;
  enabled: boolean;
  environment: Record<string, string>;
}

/**
 * Enhanced Dynamic_Endpoint_Assistant MCP Server using managed execution environment
 * This ensures environment variables are properly passed to the Dynamic_Endpoint_Assistant process
 */
export class EnhancedDynamic_Endpoint_AssistantMCPServer extends EventEmitter {
  private managedClient: ManagedDynamic_Endpoint_AssistantMCPClient | null = null;
  private config: EnhancedDynamic_Endpoint_AssistantMCPServerConfig;
  constructor(config: EnhancedDynamic_Endpoint_AssistantMCPServerConfig) {
    super();
    this.config = config;
    
    console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Creating enhanced Dynamic_Endpoint_Assistant server:', {
      name: config.name,
      enabled: config.enabled,
      hasEnvironment: !!config.environment,
      envVarCount: Object.keys(config.environment || {}).length
    });
  }

  /**
   * Start the enhanced Dynamic_Endpoint_Assistant MCP server
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Server disabled, not starting');
      return;
    }

    if (this.managedClient?.isAlive()) {
      console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Server already running');
      return;
    }

    console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Starting enhanced Dynamic_Endpoint_Assistant server...');

    try {
      // Create managed client with environment variables
      this.managedClient = new ManagedDynamic_Endpoint_AssistantMCPClient(this.config.environment);

      // Set up error handling
      this.managedClient.on('error', (error) => {
        console.error('[EnhancedDynamic_Endpoint_AssistantMCP] Client error:', error);
        this.emit('error', error);
      });

      this.managedClient.on('exit', (code, signal) => {
        console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Client exited:', { code, signal });
        this.managedClient = null;
        this.emit('exit', code, signal);
      });

      // Start the managed client
      await this.managedClient.start();
      
      console.log('[EnhancedDynamic_Endpoint_AssistantMCP] ✅ Enhanced Dynamic_Endpoint_Assistant server started successfully');
      this.emit('ready');
    } catch (error) {
      console.error('[EnhancedDynamic_Endpoint_AssistantMCP] ❌ Failed to start enhanced Dynamic_Endpoint_Assistant server:', error);
      this.managedClient = null;
      throw error;
    }
  }

  /**
   * Stop the enhanced Dynamic_Endpoint_Assistant MCP server
   */
  async stop(): Promise<void> {
    console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Stopping enhanced Dynamic_Endpoint_Assistant server...');

    if (this.managedClient) {
      try {
        await this.managedClient.stop();
        console.log('[EnhancedDynamic_Endpoint_AssistantMCP] ✅ Enhanced Dynamic_Endpoint_Assistant server stopped successfully');
      } catch (error) {
        console.error('[EnhancedDynamic_Endpoint_AssistantMCP] ❌ Error stopping enhanced Dynamic_Endpoint_Assistant server:', error);
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
      console.warn('[EnhancedDynamic_Endpoint_AssistantMCP] Cannot list tools - client not running');
      return [];
    }

    try {
      const tools = await this.managedClient.listTools();
      console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Listed tools:', tools);
      return tools;
    } catch (error) {
      console.error('[EnhancedDynamic_Endpoint_AssistantMCP] Failed to list tools:', error);
      return [];
    }
  }

  /**
   * Call a tool
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    if (!this.managedClient?.isAlive()) {
      throw new Error('Enhanced Dynamic_Endpoint_Assistant client not running');
    }

    console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Calling tool:', { name, arguments: arguments_ });

    try {
      const result = await this.managedClient.callTool(name, arguments_);
      console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Tool call result:', result);

      // Check if result contains actual data or just query arguments
      if (this.isQueryArgumentsResponse(result)) {
        console.warn('[EnhancedDynamic_Endpoint_AssistantMCP] ⚠️ Received query arguments instead of actual data');
        throw new Error('Dynamic_Endpoint_Assistant authentication or configuration issue - received query arguments instead of actual Microsoft Graph data');
      }

      return result;
    } catch (error) {
      console.error('[EnhancedDynamic_Endpoint_AssistantMCP] Tool call failed:', error);
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
      type: 'enhanced-dynamic-endpoint-assistant'
    };
  }

  /**
   * Update server configuration
   */
  updateConfig(newConfig: Partial<EnhancedDynamic_Endpoint_AssistantMCPServerConfig>): void {
    console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Updating configuration:', newConfig);
    
    const wasRunning = this.isRunning();
    
    // Update configuration
    this.config = { ...this.config, ...newConfig };
    
    // If enabled state changed or environment changed, restart if running
    if (wasRunning && (newConfig.enabled !== undefined || newConfig.environment)) {
      console.log('[EnhancedDynamic_Endpoint_AssistantMCP] Configuration changed, restarting server...');
      this.stop().then(() => {
        if (this.config.enabled) {
          this.start().catch(error => {
            console.error('[EnhancedDynamic_Endpoint_AssistantMCP] Failed to restart after config update:', error);
          });
        }
      });
    }
  }
}
