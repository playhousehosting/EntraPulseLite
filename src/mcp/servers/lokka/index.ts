// index.ts
// Entry point for the Lokka MCP Server

import { LokkaMCPServer } from './LokkaMCPServer';
import { ExternalLokkaMCPServer } from './ExternalLokkaMCPServer';
import { ExternalLokkaMCPStdioServer } from './ExternalLokkaMCPStdioServer';

export { LokkaMCPServer, ExternalLokkaMCPServer, ExternalLokkaMCPStdioServer };

// Default export is still the original LokkaMCPServer for backwards compatibility
export default LokkaMCPServer;
