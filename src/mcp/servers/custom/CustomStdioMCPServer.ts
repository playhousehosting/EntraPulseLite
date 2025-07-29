// CustomStdioMCPServer.ts
// Generic implementation for user-defined STDIO MCP servers

import { MCPServerConfig } from '../../types';
import { MCPServerHandlers } from '../MCPServerFactory';
import { spawn, ChildProcess } from 'child_process';

export class CustomStdioMCPServer implements MCPServerHandlers {
  private config: MCPServerConfig;
  private process: ChildProcess | null = null;
  private isStarted: boolean = false;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async startServer(): Promise<void> {
    if (this.isStarted || this.process) {
      console.log(`Custom MCP server '${this.config.name}' is already running`);
      return;
    }

    try {
      console.log(`Starting custom STDIO MCP server: ${this.config.name}`);
      console.log(`Command: ${this.config.command} ${this.config.args?.join(' ') || ''}`);

      if (!this.config.command) {
        throw new Error('Command is required for custom STDIO MCP servers');
      }

      // Spawn the custom MCP server process
      this.process = spawn(this.config.command, this.config.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ...this.config.env
        }
      });

      // Handle process events
      this.process.on('error', (error) => {
        console.error(`Custom MCP server '${this.config.name}' error:`, error);
        this.isStarted = false;
      });

      this.process.on('exit', (code, signal) => {
        console.log(`Custom MCP server '${this.config.name}' exited with code ${code}, signal ${signal}`);
        this.isStarted = false;
        this.process = null;
      });

      // Log stderr for debugging
      this.process.stderr?.on('data', (data) => {
        console.error(`Custom MCP server '${this.config.name}' stderr:`, data.toString());
      });

      this.isStarted = true;
      console.log(`Custom MCP server '${this.config.name}' started successfully`);

    } catch (error) {
      console.error(`Failed to start custom MCP server '${this.config.name}':`, error);
      this.isStarted = false;
      throw error;
    }
  }

  async stopServer(): Promise<void> {
    if (this.process) {
      console.log(`Stopping custom MCP server: ${this.config.name}`);
      this.process.kill();
      this.process = null;
      this.isStarted = false;
    }
  }

  async handleRequest(request: any): Promise<any> {
    if (!this.process || !this.isStarted) {
      throw new Error(`Custom MCP server '${this.config.name}' is not running`);
    }

    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString();
      
      // Send request to the MCP server
      const jsonRequest = JSON.stringify(request) + '\n';
      
      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for custom MCP server '${this.config.name}'`));
      }, 30000); // 30 second timeout

      // Handle response
      const onData = (data: Buffer) => {
        clearTimeout(timeout);
        try {
          const response = JSON.parse(data.toString().trim());
          resolve(response);
        } catch (parseError) {
          reject(new Error(`Failed to parse response from custom MCP server '${this.config.name}': ${parseError}`));
        }
        this.process?.stdout?.off('data', onData);
      };

      this.process.stdout?.on('data', onData);
      this.process.stdin?.write(jsonRequest);
    });
  }

  isRunning(): boolean {
    return this.isStarted && this.process !== null;
  }

  getConfig(): MCPServerConfig {
    return { ...this.config };
  }
}