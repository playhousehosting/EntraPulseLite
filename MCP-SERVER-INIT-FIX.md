# MCP Server Initialization Fix Summary

## Issues Identified

1. **MCPServerManager singleton instance not properly maintained**
   - The static instance was not properly accessible via a getter method
   - Instance reference was lost during app shutdown

2. **MCPClient stopAllServers method couldn't find MCPServerManager instance**
   - Used incorrect module import pattern to access singleton
   - No fallback mechanism when instance was not found

3. **Missing logging for MCP server startup process**
   - Difficult to diagnose when servers weren't starting properly
   - No visibility into server initialization sequence

4. **MCPServerManager not initialized before MCPClient**
   - Services were initialized in wrong order
   - MCPClient couldn't access server instances

## Changes Made

### 1. MCPServerManager.ts Updates

**Added proper singleton pattern:**
```typescript
// Static instance for singleton access
private static _instance: MCPServerManager | null = null;

// Static getter to access the instance
public static get instance(): MCPServerManager | null {
  return MCPServerManager._instance;
}
```

**Enhanced server initialization logging:**
```typescript
private initializeServers(): void {
  console.log(`Initializing ${this.configs.length} MCP servers...`);
  
  this.configs.forEach(config => {
    if (config.enabled) {
      try {
        console.log(`Creating MCP server: ${config.name} (${config.type})`);
        // ... initialization code
        console.log(`MCP server '${config.name}' initialized successfully`);
      } catch (error) {
        console.error(`Failed to initialize MCP server '${config.name}':`, error);
      }
    } else {
      console.log(`Skipping disabled MCP server: ${config.name}`);
    }
  });
  
  console.log(`MCP servers initialization complete. ${this.servers.size} servers initialized.`);
}
```

**Improved server stopping process:**
```typescript
async stopAllServers(): Promise<void> {
  console.log('Stopping all MCP servers...');
  
  const stopPromises = Array.from(this.servers.entries()).map(async ([name, server]) => {
    if (server.stopServer) {
      try {
        await server.stopServer();
        console.log(`Successfully stopped MCP server: ${name}`);
      } catch (error) {
        console.error(`Error stopping MCP server ${name}:`, error);
      }
    }
  });

  await Promise.all(stopPromises);
  this.servers.clear();
  console.log('All MCP servers stopped');
}
```

### 2. MCPSDKClient.ts Updates

**Fixed stopAllServers method:**
```typescript
async stopAllServers(): Promise<void> {
  try {
    // Import MCPServerManager dynamically to avoid circular dependencies
    const { MCPServerManager } = await import('../servers/MCPServerManager');
    
    // Get the MCPServerManager instance using the static getter
    const instance = MCPServerManager.instance;
    
    if (instance) {
      console.log('Found MCPServerManager instance, stopping servers...');
      await instance.stopAllServers();
    } else {
      console.warn('Could not find MCPServerManager instance to stop servers');
    }
  } catch (error) {
    console.error('Error stopping MCP servers:', error);
    throw error;
  }
}
```

### 3. main.ts Updates

**Added MCPServerManager import:**
```typescript
import { MCPServerManager } from '../mcp/servers/MCPServerManager';
import { debugMCP, checkMCPServerHealth } from '../mcp/mcp-debug';
```

**Added MCPServerManager property:**
```typescript
private mcpServerManager!: MCPServerManager;
```

**Fixed service initialization order:**
```typescript
// Initialize services
this.authService = new AuthService(this.config);
this.graphService = new GraphService(this.authService);
this.llmService = new EnhancedLLMService(this.config.llm, this.authService);

// Initialize MCP services
const mcpAuthService = new MCPAuthService(this.authService);

// Create MCPServerManager with auth service
console.log('Initializing MCP client with server configs:', this.config.mcpServers);
this.mcpServerManager = new MCPServerManager(this.config.mcpServers, mcpAuthService);

// Initialize MCP client with auth service
this.mcpClient = new MCPClient(this.config.mcpServers, mcpAuthService);

// Log successful initialization
console.log('Services initialized successfully');
```

**Added debug IPC handlers:**
```typescript
// MCP Debug handlers
ipcMain.handle('mcp:debug', async () => {
  try {
    await debugMCP(this.config);
    return 'Debug information logged to console';
  } catch (error) {
    console.error('MCP debug failed:', error);
    return `Debug failed: ${error}`;
  }
});

ipcMain.handle('mcp:checkHealth', async () => {
  try {
    return await checkMCPServerHealth();
  } catch (error) {
    console.error('MCP health check failed:', error);
    return {};
  }
});
```

### 4. New Debug Utility (mcp-debug.ts)

**Created comprehensive debugging functions:**
- `debugMCP(config)` - Logs detailed MCP server status information
- `checkMCPServerHealth()` - Returns health status of all servers

### 5. ExternalLokkaMCPServer.ts Updates

**Enhanced startServer method logging:**
```typescript
async startServer(): Promise<void> {
  if (this.isServerRunning) {
    console.log('Lokka server already running');
    return Promise.resolve();
  }

  if (this.startupPromise) {
    console.log('Lokka server already starting up');
    return this.startupPromise;
  }

  console.log('Starting Lokka MCP server...');
  // ... rest of implementation
}
```

## Expected Behavior After Fixes

1. **On app startup:**
   - Console will show MCP servers being initialized with detailed logging
   - MCPServerManager singleton instance will be properly stored and accessible
   - Servers will start in proper sequence

2. **On app shutdown:**
   - Console will show servers being stopped gracefully
   - No more "Could not find MCPServerManager instance" errors
   - Clean shutdown of all MCP processes

3. **During operation:**
   - Debug utilities available via IPC for troubleshooting
   - Health check functionality to verify server status
   - Better error handling and logging throughout

## Testing

Run the application with `npm start` and check the console for:
- "MCPServerManager instance created and stored"
- "Initializing X MCP servers..."
- "MCP server 'name' initialized successfully" for each enabled server
- "Services initialized successfully"

On shutdown, look for:
- "Found MCPServerManager instance, stopping servers..."
- "Successfully stopped MCP server: name" for each server
- "All MCP servers stopped"

## Files Modified

1. `/src/mcp/servers/MCPServerManager.ts` - Core singleton and logging improvements
2. `/src/mcp/clients/MCPSDKClient.ts` - Fixed server stopping mechanism
3. `/src/main/main.ts` - Service initialization order and debug handlers
4. `/src/mcp/servers/lokka/ExternalLokkaMCPServer.ts` - Enhanced startup logging
5. `/src/mcp/mcp-debug.ts` - New debug utility (created)
6. `/test-mcp-init.js` - Test script for verification (created)
