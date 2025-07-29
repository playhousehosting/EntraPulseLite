// CustomHttpMCPServer.ts
// Generic implementation for user-defined HTTP MCP servers

import { MCPServerConfig } from '../../types';
import { MCPServerHandlers } from '../MCPServerFactory';

export class CustomHttpMCPServer implements MCPServerHandlers {
  private config: MCPServerConfig;
  private baseUrl: string;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.baseUrl = config.url || `http://localhost:${config.port}`;
  }

  async startServer(): Promise<void> {
    // For HTTP servers, we don't start them - they should already be running
    // Just validate that the server is accessible
    try {
      await this.validateConnection();
      console.log(`Custom HTTP MCP server '${this.config.name}' is accessible at ${this.baseUrl}`);
    } catch (error) {
      console.error(`Custom HTTP MCP server '${this.config.name}' is not accessible:`, error);
      throw new Error(`HTTP MCP server at ${this.baseUrl} is not accessible`);
    }
  }

  async stopServer(): Promise<void> {
    // HTTP servers are external - we don't stop them
    console.log(`Custom HTTP MCP server '${this.config.name}' stop requested (external server)`);
  }

  async handleRequest(request: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
          ...(this.config.options?.headers || {})
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error(`Custom HTTP MCP server '${this.config.name}' request failed:`, error);
      throw new Error(`Request to custom HTTP MCP server failed: ${error}`);
    }
  }

  private async validateConnection(): Promise<void> {
    try {
      // Try to ping the server with a simple request
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        }
      });

      if (!response.ok && response.status !== 404) {
        // 404 is acceptable - server might not have health endpoint
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // If health endpoint fails, try the main MCP endpoint
      try {
        const response = await fetch(`${this.baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'initialize',
            params: {
              protocolVersion: '2024-11-05',
              capabilities: {},
              clientInfo: { name: 'DynamicEndpoint Assistant', version: '1.0.0' }
            },
            id: 1
          })
        });

        if (!response.ok) {
          throw new Error(`MCP endpoint returned ${response.status}: ${response.statusText}`);
        }
      } catch (mcpError) {
        throw new Error(`Both health and MCP endpoints failed: ${mcpError}`);
      }
    }
  }

  isRunning(): boolean {
    // For HTTP servers, we assume they're running if we can connect
    return true;
  }

  getConfig(): MCPServerConfig {
    return { ...this.config };
  }
}