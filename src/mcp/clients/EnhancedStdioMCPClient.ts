import { spawn, ChildProcess } from 'child_process';
import { MCPServerConfig } from '../types';

/**
 * Enhanced StdioMCPClient with managed execution environment
 * This ensures environment variables are properly passed to child processes
 * by using a controlled Node.js execution environment
 */
export class EnhancedStdioMCPClient {
  private serverConfig: MCPServerConfig;
  private childProcess: ChildProcess | null = null;
  private isRunning = false;
  private initialized = false;

  constructor(config: MCPServerConfig) {
    this.serverConfig = config;
  }

  /**
   * Start the MCP server with enhanced environment variable handling
   */
  async startServer(): Promise<void> {
    if (this.isRunning) {
      console.log(`[EnhancedStdioMCPClient] Server ${this.serverConfig.name} is already running`);
      return;
    }

    console.log(`[EnhancedStdioMCPClient] Starting server ${this.serverConfig.name} with enhanced environment`);

    try {
      // Create a controlled execution script
      const executionScript = this.createExecutionScript();
      
      // Prepare complete environment
      const completeEnv = {
        ...process.env,
        ...this.serverConfig.env
      };

      console.log(`[EnhancedStdioMCPClient] Environment prepared for ${this.serverConfig.name}:`, {
        hasOriginalEnv: !!process.env.PATH,
        hasCustomEnv: Object.keys(this.serverConfig.env || {}).length,
        envKeys: Object.keys(this.serverConfig.env || {}),
        tenantId: completeEnv.TENANT_ID ? 'SET' : 'NOT SET',
        clientId: completeEnv.CLIENT_ID ? 'SET' : 'NOT SET',
        accessToken: completeEnv.ACCESS_TOKEN ? `SET (${completeEnv.ACCESS_TOKEN.length} chars)` : 'NOT SET',
        useClientToken: completeEnv.USE_CLIENT_TOKEN
      });

      // Spawn Node.js process with our controlled script
      this.childProcess = spawn('node', ['-e', executionScript], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: completeEnv,
        cwd: process.cwd(),
        shell: false
      });

      this.isRunning = true;

      this.childProcess.on('close', (code, signal) => {
        console.log(`[EnhancedStdioMCPClient] Server ${this.serverConfig.name} process closed with code ${code}, signal ${signal}`);
        this.isRunning = false;
        this.initialized = false;
        this.childProcess = null;
      });

      this.childProcess.on('error', (error) => {
        console.error(`[EnhancedStdioMCPClient] Server ${this.serverConfig.name} process error:`, error);
        this.isRunning = false;
        this.initialized = false;
        this.childProcess = null;
      });

      this.childProcess.on('spawn', () => {
        console.log(`[EnhancedStdioMCPClient] Server ${this.serverConfig.name} process spawned successfully`);
        this.initialized = true;
      });

      console.log(`[EnhancedStdioMCPClient] Server ${this.serverConfig.name} started with PID: ${this.childProcess.pid}`);
    } catch (error) {
      console.error(`[EnhancedStdioMCPClient] Failed to start server ${this.serverConfig.name}:`, error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stopServer(): Promise<void> {
    if (!this.isRunning || !this.childProcess) {
      console.log(`[EnhancedStdioMCPClient] Server ${this.serverConfig.name} is not running`);
      return;
    }

    console.log(`[EnhancedStdioMCPClient] Stopping server ${this.serverConfig.name}`);

    return new Promise<void>((resolve) => {
      if (!this.childProcess) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.log(`[EnhancedStdioMCPClient] Force killing server ${this.serverConfig.name}`);
        this.childProcess?.kill('SIGKILL');
        this.cleanup();
        resolve();
      }, 5000);

      this.childProcess.once('close', () => {
        clearTimeout(timeout);
        this.cleanup();
        resolve();
      });

      // Graceful shutdown
      this.childProcess.kill('SIGTERM');
    });
  }

  /**
   * Check if the server is running
   */
  getIsRunning(): boolean {
    return this.isRunning && !!this.childProcess;
  }

  /**
   * Get the process ID
   */
  getProcessId(): number | undefined {
    return this.childProcess?.pid;
  }

  /**
   * Create the controlled execution script for the MCP server
   */
  private createExecutionScript(): string {
    const command = this.serverConfig.command || 'npx';
    const args = this.serverConfig.args || [];
    
    return `
// Enhanced execution script for ${this.serverConfig.name}
const { spawn } = require('child_process');

// Log environment variables for debugging
console.error('[EnhancedExecution] Starting ${this.serverConfig.name} with environment:');
console.error('[EnhancedExecution] TENANT_ID:', process.env.TENANT_ID ? 'SET' : 'NOT SET');
console.error('[EnhancedExecution] CLIENT_ID:', process.env.CLIENT_ID ? 'SET' : 'NOT SET'); 
console.error('[EnhancedExecution] ACCESS_TOKEN:', process.env.ACCESS_TOKEN ? 'SET (length: ' + (process.env.ACCESS_TOKEN || '').length + ')' : 'NOT SET');
console.error('[EnhancedExecution] USE_CLIENT_TOKEN:', process.env.USE_CLIENT_TOKEN);

// Verify all required environment variables are present for Lokka
if ('${this.serverConfig.name}' === 'external-lokka') {
  const requiredVars = ['TENANT_ID', 'CLIENT_ID', 'ACCESS_TOKEN', 'USE_CLIENT_TOKEN'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('[EnhancedExecution] Missing required environment variables:', missingVars);
    process.exit(1);
  }

  console.error('[EnhancedExecution] All required environment variables are present');
}

// Spawn the actual command with inherited environment
console.error('[EnhancedExecution] Spawning command: ${command} ${args.join(' ')}');

const child = spawn('${command}', ${JSON.stringify(args)}, {
  stdio: ['inherit', 'inherit', 'inherit'],
  env: process.env,
  shell: true
});

child.on('close', (code) => {
  console.error('[EnhancedExecution] Child process exited with code:', code);
  process.exit(code || 0);
});

child.on('error', (error) => {
  console.error('[EnhancedExecution] Child process error:', error);
  process.exit(1);
});

// Handle cleanup signals
process.on('SIGINT', () => {
  console.error('[EnhancedExecution] Received SIGINT, shutting down');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.error('[EnhancedExecution] Received SIGTERM, shutting down');
  child.kill('SIGTERM');
});
`;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.isRunning = false;
    this.initialized = false;
    this.childProcess = null;
  }

  /**
   * Check if the client is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * List available tools (placeholder - not implemented for enhanced client)
   */
  async listTools(): Promise<any[]> {
    throw new Error('listTools not implemented for EnhancedStdioMCPClient - use ManagedLokkaMCPClient instead');
  }

  /**
   * Call a tool (placeholder - not implemented for enhanced client)
   */
  async callTool(name: string, arguments_: any): Promise<any> {
    throw new Error('callTool not implemented for EnhancedStdioMCPClient - use ManagedLokkaMCPClient instead');
  }
}
