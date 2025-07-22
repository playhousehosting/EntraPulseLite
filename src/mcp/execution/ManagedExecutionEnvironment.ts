import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import { ConfigService } from '../../shared/ConfigService';

/**
 * Managed Execution Environment for MCP servers
 * Provides a controlled environment similar to PowerShell runspaces
 * where environment variables are guaranteed to be available
 */
export class ManagedExecutionEnvironment extends EventEmitter {
  private nodeProcess: ChildProcess | null = null;
  private isRunning = false;
  private environmentVariables: Record<string, string> = {};
  private workingDirectory: string;
  private serverScript: string;

  constructor(
    private serverName: string,
    private packageName: string,
    private configService: ConfigService
  ) {
    super();
    this.workingDirectory = process.cwd();
    this.serverScript = this.createServerScript();
  }

  /**
   * Create a Node.js script that runs within our controlled environment
   */
  private createServerScript(): string {
    return `
// Managed execution script for ${this.serverName}
const { spawn } = require('child_process');
const path = require('path');

// Environment variables are set by the parent process
console.error('[ManagedExecution] Starting ${this.serverName} with environment:');
console.error('[ManagedExecution] TENANT_ID:', process.env.TENANT_ID ? 'SET' : 'NOT SET');
console.error('[ManagedExecution] CLIENT_ID:', process.env.CLIENT_ID ? 'SET' : 'NOT SET'); 
console.error('[ManagedExecution] ACCESS_TOKEN:', process.env.ACCESS_TOKEN ? 'SET (length: ' + (process.env.ACCESS_TOKEN || '').length + ')' : 'NOT SET');
console.error('[ManagedExecution] USE_CLIENT_TOKEN:', process.env.USE_CLIENT_TOKEN);

// Verify all required environment variables are present
const requiredVars = ['TENANT_ID', 'CLIENT_ID', 'ACCESS_TOKEN', 'USE_CLIENT_TOKEN'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('[ManagedExecution] Missing required environment variables:', missingVars);
  process.exit(1);
}

console.error('[ManagedExecution] All required environment variables are present');

// Dynamic import and execution based on package
async function runPackage() {
  try {
    console.error('[ManagedExecution] Attempting to run package: ${this.packageName}');
    
    // For Lokka, we need to import and run it directly
    if ('${this.packageName}' === '@merill/lokka') {
      console.error('[ManagedExecution] Running Lokka MCP server...');
      
      // Import the Lokka package
      const lokka = await import('${this.packageName}');
      
      // Check if it has a main export or server function
      if (typeof lokka.default === 'function') {
        console.error('[ManagedExecution] Running Lokka default export');
        await lokka.default();
      } else if (typeof lokka.server === 'function') {
        console.error('[ManagedExecution] Running Lokka server function');
        await lokka.server();
      } else if (typeof lokka.main === 'function') {
        console.error('[ManagedExecution] Running Lokka main function');
        await lokka.main();
      } else {
        console.error('[ManagedExecution] Available exports:', Object.keys(lokka));
        // Fallback to spawning the CLI
        console.error('[ManagedExecution] Falling back to CLI execution');
        
        const child = spawn('npx', ['-y', '${this.packageName}'], {
          stdio: ['inherit', 'inherit', 'inherit'],
          env: { ...process.env },
          shell: true
        });
        
        child.on('close', (code) => {
          console.error('[ManagedExecution] Child process exited with code:', code);
          process.exit(code || 0);
        });
        
        child.on('error', (error) => {
          console.error('[ManagedExecution] Child process error:', error);
          process.exit(1);
        });
      }
    } else {
      // For other packages, try to run them directly
      console.error('[ManagedExecution] Running generic package:', '${this.packageName}');
      const pkg = await import('${this.packageName}');
      
      if (typeof pkg.default === 'function') {
        await pkg.default();
      } else if (typeof pkg.main === 'function') {
        await pkg.main();
      } else {
        console.error('[ManagedExecution] No suitable entry point found in package');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('[ManagedExecution] Error running package:', error);
    
    // Fallback to npx execution
    console.error('[ManagedExecution] Falling back to npx execution');
    const child = spawn('npx', ['-y', '${this.packageName}'], {
      stdio: ['inherit', 'inherit', 'inherit'],
      env: { ...process.env },
      shell: true
    });
    
    child.on('close', (code) => {
      process.exit(code || 0);
    });
    
    child.on('error', (error) => {
      console.error('[ManagedExecution] Fallback execution error:', error);
      process.exit(1);
    });
  }
}

// Handle cleanup
process.on('SIGINT', () => {
  console.error('[ManagedExecution] Received SIGINT, shutting down');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[ManagedExecution] Received SIGTERM, shutting down');
  process.exit(0);
});

// Run the package
runPackage().catch(error => {
  console.error('[ManagedExecution] Fatal error:', error);
  process.exit(1);
});
`;
  }

  /**
   * Set environment variables for the managed environment
   */
  setEnvironmentVariables(env: Record<string, string>): void {
    console.log(`[ManagedExecutionEnvironment] Setting environment variables for ${this.serverName}:`, Object.keys(env));
    this.environmentVariables = { ...env };
  }

  /**
   * Start the managed execution environment
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[ManagedExecutionEnvironment] ${this.serverName} is already running`);
      return;
    }

    console.log(`[ManagedExecutionEnvironment] Starting ${this.serverName} in managed environment`);

    try {
      // Prepare the complete environment
      const completeEnv = {
        ...process.env,
        ...this.environmentVariables,
        // Ensure Node.js module resolution works
        NODE_PATH: process.env.NODE_PATH || '',
        PATH: process.env.PATH || ''
      };

      console.log(`[ManagedExecutionEnvironment] Environment prepared:`, {
        hasOriginalEnv: !!process.env.PATH,
        hasCustomEnv: Object.keys(this.environmentVariables).length,
        tenantId: (completeEnv as any).TENANT_ID ? 'SET' : 'NOT SET',
        clientId: (completeEnv as any).CLIENT_ID ? 'SET' : 'NOT SET',
        accessToken: (completeEnv as any).ACCESS_TOKEN ? `SET (${(completeEnv as any).ACCESS_TOKEN.length} chars)` : 'NOT SET',
        useClientToken: (completeEnv as any).USE_CLIENT_TOKEN
      });

      // Spawn Node.js process with our script
      this.nodeProcess = spawn('node', ['-e', this.serverScript], {
        stdio: ['inherit', 'inherit', 'inherit'],
        env: completeEnv,
        cwd: this.workingDirectory,
        shell: false // Use direct execution for better control
      });

      this.isRunning = true;

      this.nodeProcess.on('close', (code, signal) => {
        console.log(`[ManagedExecutionEnvironment] ${this.serverName} process closed with code ${code}, signal ${signal}`);
        this.isRunning = false;
        this.nodeProcess = null;
        this.emit('close', code, signal);
      });

      this.nodeProcess.on('error', (error) => {
        console.error(`[ManagedExecutionEnvironment] ${this.serverName} process error:`, error);
        this.isRunning = false;
        this.nodeProcess = null;
        this.emit('error', error);
      });

      this.nodeProcess.on('spawn', () => {
        console.log(`[ManagedExecutionEnvironment] ${this.serverName} process spawned successfully`);
        this.emit('ready');
      });

      console.log(`[ManagedExecutionEnvironment] ${this.serverName} started with PID: ${this.nodeProcess.pid}`);
    } catch (error) {
      console.error(`[ManagedExecutionEnvironment] Failed to start ${this.serverName}:`, error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the managed execution environment
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.nodeProcess) {
      console.log(`[ManagedExecutionEnvironment] ${this.serverName} is not running`);
      return;
    }

    console.log(`[ManagedExecutionEnvironment] Stopping ${this.serverName}`);

    return new Promise<void>((resolve) => {
      if (!this.nodeProcess) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.log(`[ManagedExecutionEnvironment] Force killing ${this.serverName}`);
        this.nodeProcess?.kill('SIGKILL');
        this.cleanup();
        resolve();
      }, 5000);

      this.nodeProcess.once('close', () => {
        clearTimeout(timeout);
        this.cleanup();
        resolve();
      });

      // Graceful shutdown
      this.nodeProcess.kill('SIGTERM');
    });
  }

  /**
   * Restart the managed execution environment
   */
  async restart(): Promise<void> {
    console.log(`[ManagedExecutionEnvironment] Restarting ${this.serverName}`);
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
    await this.start();
  }

  /**
   * Check if the environment is running
   */
  isActive(): boolean {
    return this.isRunning && !!this.nodeProcess;
  }

  /**
   * Get the process ID
   */
  getProcessId(): number | undefined {
    return this.nodeProcess?.pid;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.isRunning = false;
    this.nodeProcess = null;
    this.emit('stopped');
  }

  /**
   * Get current environment variables
   */
  getEnvironmentVariables(): Record<string, string> {
    return { ...this.environmentVariables };
  }

  /**
   * Update environment variables and restart if running
   */
  async updateEnvironmentVariables(env: Record<string, string>): Promise<void> {
    const wasRunning = this.isRunning;
    
    this.setEnvironmentVariables(env);
    
    if (wasRunning) {
      console.log(`[ManagedExecutionEnvironment] Environment variables updated, restarting ${this.serverName}`);
      await this.restart();
    }
  }
}
