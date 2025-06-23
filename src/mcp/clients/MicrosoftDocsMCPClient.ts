// Microsoft Docs MCP Client for communicating with Microsoft Learn API using HTTP Streamable transport
import { MCPServerConfig } from '../types';
import { MCPAuthService } from '../auth/MCPAuthService';
import { HttpStreamableMCPClient } from './HttpStreamableMCPClient';

export class MicrosoftDocsMCPClient {
  private httpClient: HttpStreamableMCPClient;

  constructor(serverConfig: MCPServerConfig, authService: MCPAuthService) {
    this.httpClient = new HttpStreamableMCPClient(serverConfig, authService);
  }

  /**
   * Initialize the MCP client and perform handshake with the server
   */
  async initialize(): Promise<void> {
    return this.httpClient.initialize();
  }

  /**
   * List available tools from Microsoft Docs MCP server
   */
  async listTools(): Promise<any[]> {
    return this.httpClient.listTools();
  }

  /**
   * Call a tool on the Microsoft Docs MCP server
   */
  async callTool(toolName: string, arguments_: any): Promise<any> {
    return this.httpClient.callTool(toolName, arguments_);
  }

  /**
   * List available resources from Microsoft Docs MCP server
   */
  async listResources(): Promise<any[]> {
    return this.httpClient.listResources();
  }

  /**
   * Get the contents of a specific resource
   */
  async readResource(uri: string): Promise<any> {
    return this.httpClient.readResource(uri);
  }

  /**
   * Check if the server is healthy and responding
   */
  async healthCheck(): Promise<boolean> {
    return this.httpClient.healthCheck();
  }
}
