// index.ts
// Entry point for MCP servers

import { MCPServerFactory, MCPServerHandlers } from './MCPServerFactory';
import { MCPServerManager } from './MCPServerManager';
import { FetchMCPServer } from './fetch';
import { LokkaMCPServer, ExternalLokkaMCPServer } from './lokka';

// Re-export the classes
export { MCPServerFactory };
export { MCPServerManager };
export { FetchMCPServer };
export { LokkaMCPServer, ExternalLokkaMCPServer };

// Re-export the type
export type { MCPServerHandlers };

export default MCPServerFactory;
