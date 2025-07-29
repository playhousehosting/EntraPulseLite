// MCPServerFactory.ts
// Factory for creating MCP server instances

import { MCPServerConfig } from '../types';
import { FetchMCPServer } from './fetch';
import { ExternalDynamic_Endpoint_AssistantMCPStdioServer } from './lokka/ExternalLokkaMCPStdioServer';
import { CustomStdioMCPServer, CustomHttpMCPServer } from './custom';
import { MCPAuthService } from '../auth/MCPAuthService';
import { ConfigService } from '../../shared/ConfigService';

export interface MCPServerHandlers {
  handleRequest: (request: any) => Promise<any>;
  startServer?: () => Promise<void>;
  stopServer?: () => Promise<void>;
}

export class MCPServerFactory {
  static createServer(config: MCPServerConfig, authService?: MCPAuthService, configService?: ConfigService): MCPServerHandlers {
    switch (config.type) {
      case 'fetch':
        return new FetchMCPServer(config);
      case 'external-lokka':
        if (!authService) {
          throw new Error('Auth service is required for external lokka MCP server');
        }
        if (!configService) {
          throw new Error('Config service is required for external lokka MCP server');
        }
        return new ExternalDynamic_Endpoint_AssistantMCPStdioServer(config, authService, configService);
      case 'custom-stdio':
        return new CustomStdioMCPServer(config);
      case 'custom-http':
        return new CustomHttpMCPServer(config);
      default:
        throw new Error(`Unsupported MCP server type: ${config.type}`);
    }
  }

  /**
   * Validate that a server configuration is valid
   */
  static validateConfig(config: MCPServerConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic validation
    if (!config.name || config.name.trim() === '') {
      errors.push('Server name is required');
    }

    if (!config.type) {
      errors.push('Server type is required');
    }

    // Type-specific validation
    switch (config.type) {
      case 'custom-stdio':
        if (!config.command) {
          errors.push('Command is required for STDIO servers');
        }
        break;
      case 'custom-http':
        if (!config.url && !config.port) {
          errors.push('Either URL or port is required for HTTP servers');
        }
        if (config.url && !this.isValidUrl(config.url)) {
          errors.push('Invalid URL format');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
