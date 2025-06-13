// MCPServerFactory.ts
// Factory for creating MCP server instances

import { MCPServerConfig } from '../types';
import { FetchMCPServer } from './fetch';
import { ExternalLokkaMCPStdioServer } from './lokka/ExternalLokkaMCPStdioServer';
import { MCPAuthService } from '../auth/MCPAuthService';

export interface MCPServerHandlers {
  handleRequest: (request: any) => Promise<any>;
  startServer?: () => Promise<void>;
  stopServer?: () => Promise<void>;
}

export class MCPServerFactory {  static createServer(config: MCPServerConfig, authService?: MCPAuthService): MCPServerHandlers {
    switch (config.type) {
      case 'fetch':
        return new FetchMCPServer(config);
      case 'external-lokka':
        if (!authService) {
          throw new Error('Auth service is required for external lokka MCP server');
        }
        return new ExternalLokkaMCPStdioServer(config, authService);
      default:
        throw new Error(`Unsupported MCP server type: ${config.type}`);
    }
  }
}
