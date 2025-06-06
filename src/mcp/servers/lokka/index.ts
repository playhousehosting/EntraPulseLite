// index.ts
// Entry point for the Lokka MCP Server

import { LokkaMCPServer } from './LokkaMCPServer';
import { ExternalLokkaMCPServer } from './ExternalLokkaMCPServer';

export { LokkaMCPServer, ExternalLokkaMCPServer };

// Default export is still the original LokkaMCPServer for backwards compatibility
export default LokkaMCPServer;
