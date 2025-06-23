// Microsoft Docs MCP Client for communicating with Microsoft Learn API
import { MCPServerConfig } from '../types';
import { MCPAuthService } from '../auth/MCPAuthService';

export interface HttpMCPRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: any;
}

export interface HttpMCPResponse {
  jsonrpc: string;
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MicrosoftDocsMCPClient {
  private serverConfig: MCPServerConfig;
  private authService: MCPAuthService;
  private baseUrl: string;

  constructor(serverConfig: MCPServerConfig, authService: MCPAuthService) {
    this.serverConfig = serverConfig;
    this.authService = authService;
    this.baseUrl = serverConfig.url || 'https://learn.microsoft.com/api/mcp';
  }

  /**
   * Initialize the MCP client and perform handshake with the server
   */
  async initialize(): Promise<void> {
    try {
      const initRequest: HttpMCPRequest = {
        jsonrpc: '2.0',
        id: 'init',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            sampling: {}
          },
          clientInfo: {
            name: 'EntraPulseLite',
            version: '1.0.0'
          }
        }
      };

      const response = await this.sendRequest(initRequest);
      if (response.error) {
        throw new Error(`Initialization failed: ${response.error.message}`);
      }

      console.log('Microsoft Docs MCP client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Microsoft Docs MCP client:', error);
      throw error;
    }
  }

  /**
   * List available tools from Microsoft Docs MCP server
   */
  async listTools(): Promise<any[]> {
    const request: HttpMCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/list',
      params: {}
    };

    const response = await this.sendRequest(request);
    if (response.error) {
      throw new Error(`Failed to list tools: ${response.error.message}`);
    }

    return response.result?.tools || [];
  }

  /**
   * Call a tool on the Microsoft Docs MCP server
   */
  async callTool(toolName: string, arguments_: any): Promise<any> {
    const request: HttpMCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: arguments_
      }
    };

    const response = await this.sendRequest(request);
    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * List available resources from Microsoft Docs MCP server
   */
  async listResources(): Promise<any[]> {
    const request: HttpMCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'resources/list',
      params: {}
    };

    const response = await this.sendRequest(request);
    if (response.error) {
      throw new Error(`Failed to list resources: ${response.error.message}`);
    }

    return response.result?.resources || [];
  }

  /**
   * Get the contents of a specific resource
   */
  async readResource(uri: string): Promise<any> {
    const request: HttpMCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'resources/read',
      params: {
        uri
      }
    };

    const response = await this.sendRequest(request);
    if (response.error) {
      throw new Error(`Failed to read resource: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * Send HTTP request to the MCP server
   */
  private async sendRequest(request: HttpMCPRequest): Promise<HttpMCPResponse> {
    try {      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EntraPulseLite/1.0.0',
        'Connection': 'keep-alive'
      };

      // Add authentication headers if needed
      if (this.serverConfig.authConfig?.type !== 'none') {
        try {
          const authHeaders = await this.authService.getAuthHeaders('microsoft-docs');
          Object.assign(headers, authHeaders);
        } catch (authError) {
          console.warn('Failed to get auth headers for Microsoft Docs MCP:', authError);
          // Continue without auth headers as Microsoft Docs MCP may not require authentication
        }
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as HttpMCPResponse;
    } catch (error) {
      console.error('Microsoft Docs MCP request failed:', error);
      throw new Error(`Microsoft Docs MCP request failed: ${(error as Error).message}`);
    }
  }

  /**
   * Check if the server is healthy and responding
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.listTools();
      return true;
    } catch (error) {
      console.error('Microsoft Docs MCP health check failed:', error);
      return false;
    }
  }
}
