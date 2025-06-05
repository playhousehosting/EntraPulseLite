/**
 * Mock MCP SDK types as a fallback until we can install the real package
 */

export interface MCPClientConfig {
  endpoint: string;
  headers?: Record<string, string>;
  apiKey?: string;
}

export interface Tool {
  name: string;
  description: string;
  schema: any;
}

export class MCPClient {
  private config: MCPClientConfig;

  constructor(config: MCPClientConfig) {
    this.config = config;
  }

  async listTools(): Promise<Tool[]> {
    // Mock implementation
    return [
      {
        name: 'sample_tool',
        description: 'Sample tool description',
        schema: {
          type: 'object',
          properties: {
            input: {
              type: 'string'
            }
          }
        }
      }
    ];
  }

  async callTool(toolName: string, arguments_: any): Promise<any> {
    // Mock implementation
    return {
      content: [
        {
          type: 'text',
          text: `Response from tool ${toolName} with args ${JSON.stringify(arguments_)}`
        }
      ]
    };
  }
}
