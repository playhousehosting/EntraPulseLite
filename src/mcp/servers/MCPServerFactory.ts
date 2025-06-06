// MCPServerFactory.ts
// Factory for creating MCP server instances

import { MCPServerConfig } from '../types';
import { FetchMCPServer } from './fetch';
import { LokkaMCPServer, ExternalLokkaMCPServer } from './lokka';
import { MCPAuthService } from '../auth/MCPAuthService';

export interface MCPServerHandlers {
  handleRequest: (request: any) => Promise<any>;
  startServer?: () => Promise<void>;
  stopServer?: () => Promise<void>;
}

export class MCPServerFactory {
  static createServer(config: MCPServerConfig, authService?: MCPAuthService): MCPServerHandlers {
    switch (config.type) {
      case 'fetch':
        return new FetchMCPServer(config);
      case 'lokka':
        if (!authService) {
          throw new Error('Auth service is required for lokka MCP server');
        }
        return new LokkaMCPServer(config, authService);
      case 'external-lokka':
        if (!authService) {
          throw new Error('Auth service is required for external lokka MCP server');
        }
        return new ExternalLokkaMCPServer(config, authService);
      default:
        throw new Error(`Unsupported MCP server type: ${config.type}`);
    }
  }
}
