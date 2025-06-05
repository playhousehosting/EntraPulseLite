// MCPServerFactory.ts
// Factory for creating MCP server instances

import { MCPServerConfig } from '../types';
import { FetchMCPServer } from './fetch';
import { LokkaMCPServer } from './lokka';
import { MCPAuthService } from '../auth/MCPAuthService';

export interface MCPServerHandlers {
  handleRequest: (request: any) => Promise<any>;
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
      default:
        throw new Error(`Unsupported MCP server type: ${config.type}`);
    }
  }
}
