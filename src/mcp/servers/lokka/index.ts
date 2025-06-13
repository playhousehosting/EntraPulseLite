// index.ts
// Entry point for the Lokka MCP Server

import { ExternalLokkaMCPServer } from './ExternalLokkaMCPServer';
import { ExternalLokkaMCPStdioServer } from './ExternalLokkaMCPStdioServer';

export { ExternalLokkaMCPServer, ExternalLokkaMCPStdioServer };

// Default export is the stdio server for external lokka integration
export default ExternalLokkaMCPStdioServer;
