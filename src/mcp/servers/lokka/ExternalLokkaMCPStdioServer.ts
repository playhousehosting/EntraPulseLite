// ExternalLokkaMCPStdioServer.ts
// Proper implementation of Lokka MCP Server using stdio communication

import { MCPRequest, MCPResponse, MCPServerConfig, MCPTool } from '../../types';
import { MCPErrorHandler, ErrorCode } from '../../utils';
import { MCPAuthService } from '../../auth/MCPAuthService';
import { StdioMCPClient } from '../../clients/StdioMCPClient';
import { EnhancedStdioMCPClient } from '../../clients/EnhancedStdioMCPClient';
import { ManagedLokkaMCPClient } from '../../clients/ManagedLokkaMCPClient';
import { PersistentLokkaMCPClient } from '../../clients/PersistentLokkaMCPClient';
import { ConfigService } from '../../../shared/ConfigService';

export interface ExternalLokkaMCPServerConfig extends MCPServerConfig {
  env?: {
    TENANT_ID?: string;
    CLIENT_ID?: string;
    CLIENT_SECRET?: string;
    USE_CLIENT_TOKEN?: string; // New: Support for client-provided token mode
    [key: string]: string | undefined;
  };
}

export class ExternalLokkaMCPStdioServer {
  private config: ExternalLokkaMCPServerConfig;
  private authService: MCPAuthService;
  private configService: ConfigService;
  private mcpClient: StdioMCPClient | null = null;
  private enhancedMcpClient: EnhancedStdioMCPClient | null = null;
  private managedClient: ManagedLokkaMCPClient | null = null;
  private persistentClient: PersistentLokkaMCPClient | null = null; // NEW: Persistent client
  private tools: MCPTool[] = [];
  private isStarting: boolean = false; // NEW: Prevent concurrent startup attempts
  private startupPromise: Promise<void> | null = null; // NEW: Track ongoing startup

  constructor(config: ExternalLokkaMCPServerConfig, authService: MCPAuthService, configService: ConfigService) {
    this.config = config;
    this.authService = authService;
    this.configService = configService;
    this.initializeTools();
  }

  private initializeTools(): void {
    // Define the tools we expect Lokka to provide (based on official documentation)
    this.tools = [
      {
        name: 'Lokka-Microsoft',
        description: 'Query Microsoft Graph API via Lokka MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            apiType: {
              type: 'string',
              description: 'API type (graph or azure)',
              enum: ['graph', 'azure']
            },
            method: {
              type: 'string',
              description: 'HTTP method (get, post, put, patch, delete)',
              enum: ['get', 'post', 'put', 'patch', 'delete']
            },
            path: {
              type: 'string',
              description: 'API path (e.g., /me, /users, /groups)'
            },
            queryParams: {
              type: 'object',
              description: 'Query parameters as key-value pairs'
            },
            body: {
              type: 'object',
              description: 'Request body for POST/PUT/PATCH requests'
            },
            fetchAll: {
              type: 'boolean',
              description: 'Whether to fetch all pages for paginated results'
            },
            consistencyLevel: {
              type: 'string',
              description: 'Consistency level for directory queries (e.g., eventual)'
            }
          },
          required: ['apiType', 'method', 'path']
        }
      },      {
        name: 'set-access-token',
        description: 'Set or update access tokens for Microsoft Graph authentication',
        inputSchema: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'Microsoft Graph access token'
            }
          },
          required: ['accessToken']
        }
      },
      {
        name: 'get-auth-status',
        description: 'Check current authentication status and capabilities',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }  async startServer(): Promise<void> {
    // Prevent concurrent startup attempts - this was causing infinite loops
    if (this.isStarting) {
      console.log('🔄 [Lokka Startup] Already starting - waiting for ongoing startup to complete...');
      if (this.startupPromise) {
        return this.startupPromise;
      }
      return;
    }

    // Check if any client is already running
    if (this.isReady()) {
      console.log('✅ [Lokka Startup] Lokka MCP server already running');
      return;
    }

    // Set startup guard
    this.isStarting = true;
    
    // Create startup promise to prevent concurrent attempts
    this.startupPromise = this.performStartup();
    
    try {
      await this.startupPromise;
    } finally {
      this.isStarting = false;
      this.startupPromise = null;
    }
  }

  private async performStartup(): Promise<void> {
    console.log('🚀 [Lokka Startup] Starting Lokka MCP server...');
    
    // Add debugging that will show in DevTools via IPC
    const env = this.config.env || {};
    const debugInfo = {
      configEnv: env,
      configEnvKeys: Object.keys(env),
      hasAccessToken: !!(env.ACCESS_TOKEN && env.ACCESS_TOKEN !== 'dummy-token-will-be-replaced'),
      useClientToken: env.USE_CLIENT_TOKEN,
      authPreference: this.configService.getAuthenticationPreference(),
      hasRequiredVars: !!(env.TENANT_ID && env.CLIENT_ID),
      envVarCount: Object.keys(env).length
    };
    
    console.log('🔍 [Portable Debug] Lokka startup environment check:', debugInfo);
    
    // CHECK: Warn if we don't have valid authentication yet but continue startup
    // We'll start Lokka and set the token later when authentication is available
    if (!env.ACCESS_TOKEN || env.ACCESS_TOKEN === 'dummy-token-will-be-replaced') {
      console.log('⚠️ [Lokka Startup] Starting Lokka without access token - will set token after authentication');
      console.log('⚠️ [Lokka Startup] This is normal during initial configuration load before user login');
      console.log('⚠️ [Lokka Startup] Token will be set automatically after successful authentication');
    } else {
      console.log('✅ [Lokka Startup] Starting Lokka with pre-provided access token');
    }
    
    // Send debug info to renderer process so it shows in DevTools
    if (typeof process !== 'undefined' && process.versions?.electron) {
      try {
        const { ipcMain } = require('electron');
        if (ipcMain) {
          // Emit debug info that can be captured
          console.log('🔍 [Portable Debug - IPC] Broadcasting Lokka environment info');
          ipcMain.emit('lokka-debug', debugInfo);
        }
      } catch (ipcError) {
        console.log('🔍 [Portable Debug] Could not send IPC debug info:', ipcError);
      }
    }
    
    // Validate critical environment variables before starting
    const requiredVars = ['TENANT_ID', 'CLIENT_ID'];
    const missingVars = requiredVars.filter(varName => !env[varName]);
    
    if (missingVars.length > 0) {
      const error = `Missing required environment variables: ${missingVars.join(', ')}`;
      console.warn('⚠️ [Lokka Startup] Environment variables not fully configured - this is normal during initial startup');
      console.warn('⚠️ [Lokka Startup] Missing vars:', missingVars);
      console.warn('⚠️ [Lokka Startup] Available vars:', Object.keys(env));
      console.warn('⚠️ [Lokka Startup] Lokka will start but may fail until user authentication is complete');
      
      // Instead of throwing, we'll continue with startup but expect failures
      // The login process will restart MCP services with proper credentials
    }

    console.log('Starting Lokka MCP server via stdio...');
    console.log('Lokka version: Forcing latest version with --force flag');
    
    const authPreference = this.configService.getAuthenticationPreference();
    console.log(`Using authentication preference: ${authPreference}`);
    console.log('🔧 Using stored MCP configuration environment variables');
    console.log('🔧 Environment variables from storage:', Object.keys(env));    // Create the MCP client configuration
    const clientConfig: MCPServerConfig = {
      name: this.config.name,
      type: this.config.type,
      port: this.config.port || 0, // Not used for stdio, but required by interface
      enabled: true,
      command: this.config.command || 'npx',
      args: this.config.args || ['--yes', '@merill/lokka@latest'],
      env: env  // Put environment variables directly in env property
    };

    console.log('🚀 [ExternalLokkaMCPStdioServer] Using Enhanced Stdio Client for better environment variable handling');
    console.log('Lokka environment setup:', {
      authMethod: env.USE_CLIENT_TOKEN ? 'client-provided-token' : 'client-credentials',
      hasClientSecret: !!env.CLIENT_SECRET,
      useClientToken: env.USE_CLIENT_TOKEN === 'true',
      hasPreProvidedToken: !!(env.ACCESS_TOKEN && env.ACCESS_TOKEN !== 'dummy-token-will-be-replaced'),
      useInteractive: env.USE_INTERACTIVE || 'not-set'
    });

    // FIRST PRIORITY: Try the Persistent Lokka Client (like a Runspace - start once, reuse)
    console.log('🚀 [ExternalLokkaMCPStdioServer] Attempting Persistent Lokka Client first (Runspace-style)...');
    try {
      // Filter out undefined values from environment
      const filteredEnv: Record<string, string> = {};
      Object.entries(env).forEach(([key, value]) => {
        if (value !== undefined && value !== '') { // Don't pass empty strings to avoid Lokka errors
          filteredEnv[key] = value;
        }
      });
      
      // Enhanced debug logging for portable builds
      console.log('🔍 [Portable Debug] Environment filtering for persistent client:', {
        originalEnvKeys: Object.keys(env),
        filteredEnvKeys: Object.keys(filteredEnv),
        originalTenantId: env.TENANT_ID ? `${env.TENANT_ID.substring(0, 8)}...` : 'MISSING/EMPTY',
        originalClientId: env.CLIENT_ID ? `${env.CLIENT_ID.substring(0, 8)}...` : 'MISSING/EMPTY',
        filteredTenantId: filteredEnv.TENANT_ID ? `${filteredEnv.TENANT_ID.substring(0, 8)}...` : 'MISSING/EMPTY',
        filteredClientId: filteredEnv.CLIENT_ID ? `${filteredEnv.CLIENT_ID.substring(0, 8)}...` : 'MISSING/EMPTY',
        hasUseClientToken: !!filteredEnv.USE_CLIENT_TOKEN,
        filteredCount: Object.keys(filteredEnv).length
      });
      
      // Validate that required vars are present before attempting to start
      if (!filteredEnv.TENANT_ID || !filteredEnv.CLIENT_ID) {
        console.warn('⚠️ [Persistent Client] Required environment variables missing - skipping persistent client');
        console.warn('⚠️ [Persistent Client] TENANT_ID present:', !!filteredEnv.TENANT_ID);
        console.warn('⚠️ [Persistent Client] CLIENT_ID present:', !!filteredEnv.CLIENT_ID);
        console.warn('⚠️ [Persistent Client] Will try next client type');
        throw new Error('Required environment variables (TENANT_ID, CLIENT_ID) are missing or empty for persistent client');
      }
      
      this.persistentClient = new PersistentLokkaMCPClient(filteredEnv);
      
      console.log('🔧 [ExternalLokkaMCPStdioServer] Starting Persistent Lokka Client...');
      await this.persistentClient.start();
      
      console.log('✅ [ExternalLokkaMCPStdioServer] Persistent Lokka Client started successfully');
      console.log('🎉 Persistent Lokka MCP server ready for Graph API calls (Runspace-style)');
      
      // Verify environment after successful start
      await this.verifyEnvironmentConfig();
      
      // IMPORTANT: For persistent client, don't call setAccessTokenForActiveClient()
      // The persistent client gets its access token from environment variables
      // Calling set-access-token tool when USE_CLIENT_TOKEN=true causes:
      // "Error setting access token: Token update only supported..."
      console.log('✅ Persistent client uses environment variables for authentication - no token setting required');
      
      return; // Success with persistent client
      
    } catch (persistentError) {
      console.warn('⚠️ [ExternalLokkaMCPStdioServer] Persistent client failed, falling back to managed client:', persistentError);
      
      // Stop persistent client if it started
      if (this.persistentClient) {
        try {
          await this.persistentClient.stop();
        } catch (stopError) {
          console.warn('Error stopping persistent client:', stopError);
        }
        this.persistentClient = null;
      }
    }

    // SECOND PRIORITY: Try the Managed Lokka Client for enhanced environment variable handling
    console.log('🚀 [ExternalLokkaMCPStdioServer] Attempting Managed Lokka Client second...');
    try {
      // Filter out undefined values from environment
      const filteredEnv: Record<string, string> = {};
      Object.entries(env).forEach(([key, value]) => {
        if (value !== undefined && value !== '') { // Don't pass empty strings to avoid Lokka errors
          filteredEnv[key] = value;
        }
      });
      
      // Enhanced debug logging for portable builds
      console.log('🔍 [Portable Debug] Environment filtering for managed client:', {
        originalEnvKeys: Object.keys(env),
        filteredEnvKeys: Object.keys(filteredEnv),
        filteredCount: Object.keys(filteredEnv).length,
        hasRequiredVars: !!(filteredEnv.TENANT_ID && filteredEnv.CLIENT_ID)
      });
      
      // Validate that required vars are present before attempting to start
      if (!filteredEnv.TENANT_ID || !filteredEnv.CLIENT_ID) {
        console.warn('⚠️ [Managed Client] Required environment variables missing - skipping managed client');
        console.warn('⚠️ [Managed Client] Will try next client type');
        throw new Error('Required environment variables (TENANT_ID, CLIENT_ID) are missing or empty for managed client');
      }
      
      this.managedClient = new ManagedLokkaMCPClient(filteredEnv);
      
      console.log('🔧 [ExternalLokkaMCPStdioServer] Starting Managed Lokka Client...');
      await this.managedClient.start();
      
      console.log('✅ [ExternalLokkaMCPStdioServer] Managed Lokka Client started successfully');
      console.log('🎉 Managed Lokka MCP server ready for Graph API calls with guaranteed environment variables');
      
      // Verify environment after successful start
      await this.verifyEnvironmentConfig();
      
      // IMPORTANT: For managed client, don't call setAccessTokenForActiveClient()
      // The managed client gets its access token from environment variables
      // Calling set-access-token tool when USE_CLIENT_TOKEN=true causes:
      // "Error setting access token: Token update only supported..."
      console.log('✅ Managed client uses environment variables for authentication - no token setting required');
      
      return; // Success with managed client
      
    } catch (managedError) {
      console.warn('⚠️ [ExternalLokkaMCPStdioServer] Managed client failed, falling back to enhanced client:', managedError);
      
      // Stop managed client if it started
      if (this.managedClient) {
        try {
          await this.managedClient.stop();
        } catch (stopError) {
          console.warn('Error stopping managed client:', stopError);
        }
        this.managedClient = null;
      }
    }

    // THIRD PRIORITY: Try enhanced client ONLY if Enhanced Graph Access is enabled
    const entraConfig = this.configService.getEntraConfig();
    const enhancedGraphAccessEnabled = entraConfig?.useGraphPowerShell || false;
    console.log('🔍 [Enhanced Graph Access Check] Enhanced Graph Access enabled:', enhancedGraphAccessEnabled);
    
    if (enhancedGraphAccessEnabled) {
      console.log('🚀 [ExternalLokkaMCPStdioServer] Enhanced Graph Access is enabled - attempting Enhanced Stdio Client...');
      this.enhancedMcpClient = new EnhancedStdioMCPClient(clientConfig);
      
      try {
        console.log('🔧 [ExternalLokkaMCPStdioServer] Starting Enhanced Stdio Client...');
        await this.enhancedMcpClient.startServer();
        
        // Add a longer delay for enhanced client to ensure proper startup
        console.log('⏳ Waiting for Enhanced Lokka server to fully initialize...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✅ [ExternalLokkaMCPStdioServer] Enhanced Stdio Client started successfully');        // For client-provided token mode, the enhanced client should have environment variables available
          if (env.USE_CLIENT_TOKEN === 'true') {
            console.log('🔧 Environment variables should now be available to Lokka process');
            console.log('🎉 Enhanced Lokka MCP server ready for Graph API calls');
            
            // Verify environment after successful start
            await this.verifyEnvironmentConfig();
            
            // IMPORTANT: Enhanced client with USE_CLIENT_TOKEN=true gets token from environment
            // Don't call setAccessTokenForActiveClient() to avoid "Token update only supported..." error
            console.log('✅ Enhanced client uses environment variables for authentication - no token setting required');
          }
          
          return; // Success with enhanced client
        
      } catch (enhancedError) {
        console.warn('⚠️ [ExternalLokkaMCPStdioServer] Enhanced client failed, falling back to original:', enhancedError);
        
        // Stop enhanced client if it started
        if (this.enhancedMcpClient) {
          try {
            await this.enhancedMcpClient.stopServer();
          } catch (stopError) {
            console.warn('Error stopping enhanced client:', stopError);
          }
          this.enhancedMcpClient = null;
        }
      }
    } else {
      console.log('⏭️ [ExternalLokkaMCPStdioServer] Enhanced Graph Access is disabled - skipping Enhanced Stdio Client');
    }

    // Fallback to original client
    console.log('🔄 [ExternalLokkaMCPStdioServer] Using original Stdio Client as fallback');
    
    try {
      this.mcpClient = new StdioMCPClient(clientConfig);
      
      await this.mcpClient.start();

      // Add a delay to ensure server is fully ready (following the test pattern)
      console.log('⏳ Waiting for Lokka server to fully initialize...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For client-provided token mode, set the token IMMEDIATELY
      // This must be done before any other operations
      // NOTE: Original client doesn't use environment variables like persistent/managed clients,
      // so it needs the token to be set via the set-access-token tool
      if (env.USE_CLIENT_TOKEN === 'true') {
        console.log('🔧 Setting up access token for original client via set-access-token tool...');
        try {
          await this.setAccessTokenForActiveClient();
        } catch (tokenError) {
          console.warn('⚠️ Failed to set access token for original client - will retry after authentication:', tokenError);
        }
      }

      // Verify server is fully operational
      try {
        const availableTools = await this.mcpClient.listTools();
        console.log('🔧 Lokka MCP server ready with tools:', availableTools.map(t => t.name));
        console.log('🔧 Full tool details:', JSON.stringify(availableTools, null, 2));
        
        // Update our tools list with what the server actually provides
        if (availableTools.length > 0) {
          this.tools = availableTools;
          console.log('✅ Tools list updated with server response');
        } else {
          console.warn('⚠️ No tools returned from Lokka server');
        }
      } catch (error) {
        console.warn('⚠️ Failed to list tools from Lokka MCP server - may work after authentication:', error);
      }
      
      console.log('✅ Lokka MCP server started with original client (may need authentication)');
      
    } catch (originalClientError) {
      console.warn('⚠️ [ExternalLokkaMCPStdioServer] Original client also failed:', originalClientError);
      console.warn('⚠️ [ExternalLokkaMCPStdioServer] Lokka MCP server not available - will retry after user authentication');
      
      // Don't throw error - allow application to continue without Lokka for now
      // The login process will restart MCP services with proper credentials
      return;
    }    // Final verification: Test API functionality
    console.log('\n🔧 Final verification: Testing API functionality...');
    try {
      const authPreference = this.configService.getAuthenticationPreference();
      // Use appropriate test endpoint based on auth mode
      const testPath = authPreference === 'application-credentials' ? '/users?$top=1' : '/me';
      
      // Determine which client to use
      let activeClient: any = null;
      let clientType = 'none';
      
      if (this.persistentClient && (this.persistentClient as any).isInitialized && (this.persistentClient as any).isInitialized()) {
        activeClient = this.persistentClient;
        clientType = 'persistent';
      } else if (this.managedClient && (this.managedClient as any).isInitialized && (this.managedClient as any).isInitialized()) {
        activeClient = this.managedClient;
        clientType = 'managed';
      } else if (this.enhancedMcpClient && (this.enhancedMcpClient as any).isInitialized && (this.enhancedMcpClient as any).isInitialized()) {
        activeClient = this.enhancedMcpClient;
        clientType = 'enhanced';
      } else if (this.mcpClient && (this.mcpClient as any).isInitialized && (this.mcpClient as any).isInitialized()) {
        activeClient = this.mcpClient;
        clientType = 'original';
      }

      if (activeClient) {
        let testResult: any;
        if (clientType === 'persistent' || clientType === 'managed') {
          // Persistent and managed clients use sendRequest
          testResult = await activeClient.sendRequest('tools/call', {
            name: 'Lokka-Microsoft',
            arguments: {
              apiType: 'graph',
              path: testPath,
              method: 'get'
            }
          });
        } else {
          // Enhanced and original clients use callTool
          testResult = await activeClient.callTool('Lokka-Microsoft', {
            apiType: 'graph',
            path: testPath,
            method: 'get'
          });
        }
        
        if (!testResult?.isError && !testResult?.result?.isError) {
          console.log('✅ Lokka API test successful - ready for queries!');
        } else {
          console.warn('⚠️ Lokka API test failed:', testResult?.content?.[0]?.text || testResult?.result?.content?.[0]?.text);
          // Still continue - maybe the API call will work in actual usage
        }
      } else {
        console.warn('⚠️ No active client available for API test');
      }
    } catch (testError) {
      console.warn('⚠️ Could not test API functionality:', testError);
    }
  }

  async stopServer(): Promise<void> {
    console.log('Stopping Lokka MCP server...');
    
    // Stop persistent client if it's being used
    if (this.persistentClient) {
      try {
        console.log('Stopping persistent MCP client...');
        await this.persistentClient.stop();
        this.persistentClient = null;
        console.log('Persistent MCP client stopped');
      } catch (error) {
        console.warn('Error stopping persistent MCP client:', error);
      }
    }
    
    // Stop managed client if it's being used
    if (this.managedClient) {
      try {
        console.log('Stopping managed MCP client...');
        await this.managedClient.stop();
        this.managedClient = null;
        console.log('Managed MCP client stopped');
      } catch (error) {
        console.warn('Error stopping managed MCP client:', error);
      }
    }
    
    // Stop enhanced client if it's being used
    if (this.enhancedMcpClient) {
      try {
        console.log('Stopping enhanced MCP client...');
        await this.enhancedMcpClient.stopServer();
        this.enhancedMcpClient = null;
        console.log('Enhanced MCP client stopped');
      } catch (error) {
        console.warn('Error stopping enhanced MCP client:', error);
      }
    }
    
    // Stop original client if it's being used
    if (this.mcpClient) {
      try {
        console.log('Stopping original MCP client...');
        await this.mcpClient.stop();
        this.mcpClient = null;
        console.log('Original MCP client stopped');
      } catch (error) {
        console.warn('Error stopping original MCP client:', error);
      }
    }
    
    console.log('Lokka MCP server stopped');
  }

  async listTools(): Promise<MCPTool[]> {
    // Try persistent client first
    if (this.persistentClient && this.persistentClient.isInitialized && this.persistentClient.isInitialized()) {
      try {
        console.log('🔍 Listing tools from persistent client...');
        const response = await this.persistentClient.sendRequest('tools/list', {});
        console.log('🔍 Persistent client tools response:', response);
        
        const tools = response.result?.tools || response.tools || [];
        return tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }));
      } catch (error) {
        console.error('Failed to list tools from persistent Lokka client:', error);
      }
    }
    
    // Try managed client second
    if (this.managedClient && this.managedClient.isInitialized && this.managedClient.isInitialized()) {
      try {
        console.log('🔍 Listing tools from managed client...');
        const response = await this.managedClient.sendRequest('tools/list', {});
        console.log('🔍 Managed client tools response:', response);
        
        const tools = response.result?.tools || response.tools || [];
        return tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }));
      } catch (error) {
        console.error('Failed to list tools from managed Lokka client:', error);
      }
    }
    
    // Try enhanced client third
    if (this.enhancedMcpClient && this.enhancedMcpClient.isInitialized && this.enhancedMcpClient.isInitialized()) {
      try {
        const tools = await this.enhancedMcpClient.listTools();
        return tools;
      } catch (error) {
        console.error('Failed to list tools from enhanced Lokka client:', error);
      }
    }
    
    // Try original client fourth
    if (this.mcpClient && this.mcpClient.isInitialized && this.mcpClient.isInitialized()) {
      try {
        const tools = await this.mcpClient.listTools();
        return tools;
      } catch (error) {
        console.error('Failed to list tools from original Lokka client:', error);
      }
    }

    console.warn('No Lokka MCP client is initialized');
    return this.tools; // Return our cached tools as fallback
  }
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    // Check which client is active
    let activeClient: any = null;
    let clientType = 'none';
    
    if (this.persistentClient && this.persistentClient.isInitialized()) {
      activeClient = this.persistentClient;
      clientType = 'persistent';
    } else if (this.managedClient && this.managedClient.isInitialized()) {
      activeClient = this.managedClient;
      clientType = 'managed';
    } else if (this.enhancedMcpClient && this.enhancedMcpClient.isInitialized()) {
      activeClient = this.enhancedMcpClient;
      clientType = 'enhanced';
    } else if (this.mcpClient && this.mcpClient.isInitialized()) {
      activeClient = this.mcpClient;
      clientType = 'original';
    }
    
    if (!activeClient) {
      return {
        id: request.id,
        error: MCPErrorHandler.createError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Lokka MCP server not initialized'
        )
      };
    }

    try {
      console.log(`Handling Lokka MCP request with ${clientType} client:`, request);
      
      // For tool calls, extract the tool name and arguments
      if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        
        let result;
        if (clientType === 'persistent' || clientType === 'managed') {
          // Persistent and managed clients use sendRequest
          result = await activeClient.sendRequest('tools/call', {
            name,
            arguments: args
          });
        } else {
          // Enhanced and original clients use callTool
          result = await activeClient.callTool(name, args);
        }
        
        return {
          id: request.id,
          result
        };
      }
      
      // For other requests, forward directly
      // Note: This is a simplified implementation
      throw new Error(`Unsupported request method: ${request.method}`);
      
    } catch (error) {
      console.error('Lokka MCP request failed:', error);
      return {
        id: request.id,
        error: MCPErrorHandler.createError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          `Lokka MCP request failed: ${(error as Error).message}`
        )
      };
    }
  }
  // Add method to check environment variables after authentication
  async verifyEnvironmentConfig(): Promise<void> {
    const env = this.config.env || {};
    const envCheck = {
      hasRequiredVars: !!(env.TENANT_ID && env.CLIENT_ID),
      hasAccessToken: !!(env.ACCESS_TOKEN && env.ACCESS_TOKEN !== 'dummy-token-will-be-replaced'),
      useClientToken: env.USE_CLIENT_TOKEN === 'true',
      envVarCount: Object.keys(env).length,
      envKeys: Object.keys(env),
      clientType: this.getStatus().activeClient,
      isReady: this.isReady()
    };
    
    console.log('🔍 [Portable Debug] Environment verification:', envCheck);
    
    if (!envCheck.hasRequiredVars) {
      console.error('❌ [Portable Debug] Environment variables not properly configured for portable build');
      console.error('❌ [Portable Debug] Required: TENANT_ID, CLIENT_ID');
      console.error('❌ [Portable Debug] Available:', envCheck.envKeys);
      throw new Error('Environment variables not properly configured for portable build');
    }
  }

  // Compatibility method for the existing interface
  async callTool(toolName: string, arguments_: any): Promise<any> {
    // Add debugging for portable build
    const debugInfo = {
      toolName,
      arguments: arguments_,
      hasActiveClient: this.isReady(),
      clientType: this.getStatus().activeClient,
      envConfigured: !!(this.config.env?.TENANT_ID && this.config.env?.CLIENT_ID),
      envKeys: Object.keys(this.config.env || {}),
      envVarCount: Object.keys(this.config.env || {}).length
    };
    
    console.log('🔧 [Portable Debug] Tool call attempt:', debugInfo);
    
    // Check which client is active and use the appropriate one
    let activeClient: any = null;
    let clientType = 'none';
    
    if (this.persistentClient && this.persistentClient.isInitialized()) {
      activeClient = this.persistentClient;
      clientType = 'persistent';
    } else if (this.managedClient && this.managedClient.isInitialized()) {
      activeClient = this.managedClient;
      clientType = 'managed';
    } else if (this.enhancedMcpClient && this.enhancedMcpClient.isInitialized()) {
      activeClient = this.enhancedMcpClient;
      clientType = 'enhanced';
    } else if (this.mcpClient && this.mcpClient.isInitialized()) {
      activeClient = this.mcpClient;
      clientType = 'original';
    }
    
    if (!activeClient) {
      console.error('🔧 [Portable Debug] No active client available - server not initialized');
      throw new Error('Lokka MCP server not initialized - no active client available');
    }

    console.log(`🔧 ExternalLokkaMCPStdioServer: Using ${clientType} client for tool: ${toolName}`, arguments_);
    
    // Map tool names for compatibility
    let actualToolName = toolName;
    let mappedArguments = arguments_;
    
    if (toolName === 'microsoft_graph_query') {
      // Map to the actual Lokka tool name
      actualToolName = 'Lokka-Microsoft';
      
      // Map the arguments to match Lokka's expected format
      mappedArguments = {
        apiType: arguments_.apiType || 'graph',
        method: arguments_.method || 'get',
        path: arguments_.endpoint || arguments_.path, // Support both 'endpoint' and 'path'
        queryParams: arguments_.queryParams,
        body: arguments_.body
      };
      
      console.log(`🔧 ExternalLokkaMCPStdioServer: Mapped tool '${toolName}' to '${actualToolName}'`);
      console.log(`🔧 ExternalLokkaMCPStdioServer: Mapped arguments:`, mappedArguments);
    }
    
    try {
      // Use the appropriate client method based on client type
      let result;
      if (clientType === 'persistent' || clientType === 'managed') {
        // Persistent and managed clients use sendRequest for tool calls
        result = await activeClient.sendRequest('tools/call', {
          name: actualToolName,
          arguments: mappedArguments
        });
      } else {
        // Enhanced and original clients use callTool
        result = await activeClient.callTool(actualToolName, mappedArguments);
      }
      
      // Debug the result for portable build
      const resultDebug = {
        success: !result?.isError,
        hasContent: !!(result?.content),
        resultPreview: result?.content?.[0]?.text?.substring(0, 100),
        isActualData: !result?.content?.[0]?.text?.includes('Response from tool'),
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : []
      };
      
      console.log('🔧 [Portable Debug] Tool call result:', resultDebug);
      
      // Check if we're getting mock responses instead of real data
      if (result?.content?.[0]?.text?.includes('Response from tool')) {
        console.error('❌ [Portable Debug] Lokka returned query arguments instead of API data');
        console.error('❌ [Portable Debug] This indicates environment variables are not reaching Lokka');
        console.error('❌ [Portable Debug] Env check:', {
          hasEnvVars: Object.keys(this.config.env || {}).length > 0,
          envKeys: Object.keys(this.config.env || {}),
          clientType: clientType
        });
      }
      
      console.log(`🔧 ExternalLokkaMCPStdioServer: Tool result from ${clientType} client:`, result);
      return result;
    } catch (error) {
      console.error('🔧 [Portable Debug] Tool call failed:', {
        error: (error as Error).message,
        toolName,
        clientType,
        hasEnvVars: Object.keys(this.config.env || {}).length > 0
      });
      console.error(`🔧 ExternalLokkaMCPStdioServer: Tool call failed with ${clientType} client:`, error);
      throw error;
    }
  }

  // Check if the server is running and initialized
  isReady(): boolean {
    return (this.persistentClient && this.persistentClient.isInitialized()) ||
           (this.managedClient && this.managedClient.isInitialized()) ||
           (this.enhancedMcpClient && this.enhancedMcpClient.isInitialized()) ||
           (this.mcpClient && this.mcpClient.isInitialized()) ||
           false;
  }
  // Get server status for debugging
  getStatus(): { running: boolean; initialized: boolean; toolCount: number; activeClient: string } {
    let running = false;
    let initialized = false;
    let activeClient = 'none';
    
    if (this.persistentClient && this.persistentClient.isAlive()) {
      running = true;
      if (this.persistentClient.isInitialized()) {
        initialized = true;
        activeClient = 'persistent';
      }
    } else if (this.managedClient && this.managedClient.isAlive()) {
      running = true;
      if (this.managedClient.isInitialized()) {
        initialized = true;
        activeClient = 'managed';
      }
    } else if (this.enhancedMcpClient) {
      // Enhanced client doesn't have isAlive, check if it exists and is initialized
      if (this.enhancedMcpClient.isInitialized()) {
        running = true;
        initialized = true;
        activeClient = 'enhanced';
      }
    } else if (this.mcpClient) {
      running = this.mcpClient.isRunning() || false;
      initialized = this.mcpClient.isInitialized() || false;
      if (initialized) {
        activeClient = 'original';
      }
    }
    
    return {
      running,
      initialized,
      toolCount: this.tools.length,
      activeClient
    };
  }  // Unified method to set access token for whichever client is active
  private async setAccessTokenForActiveClient(): Promise<void> {
    try {
      console.log('🔧 Setting up access token for active Lokka client...');
      
      const env = this.config.env || {};
      let accessToken: string;
      
      // Check if we have a pre-provided ACCESS_TOKEN (Enhanced Graph Access mode)
      if (env.ACCESS_TOKEN && env.ACCESS_TOKEN !== 'dummy-token-will-be-replaced') {
        console.log('🔐 Using pre-provided PowerShell access token for Enhanced Graph Access');
        accessToken = env.ACCESS_TOKEN;
      } else {
        // Get fresh access token from auth service (standard user token mode)
        console.log('🔐 Getting access token from auth service for standard user token mode');
        const token = await this.authService.getToken();
        
        if (!token || !token.accessToken) {
          throw new Error('No valid access token available for user token authentication');
        }
        
        accessToken = token.accessToken;
        
        console.log('Token details:', {
          hasToken: !!token.accessToken,
          tokenLength: token.accessToken.length,
          expiresOn: token.expiresOn
        });
      }

      // Determine which client to use for setting the token
      let activeClient: any = null;
      let clientType = 'none';
      
      if (this.persistentClient && this.persistentClient.isInitialized()) {
        activeClient = this.persistentClient;
        clientType = 'persistent';
      } else if (this.managedClient && this.managedClient.isInitialized()) {
        activeClient = this.managedClient;
        clientType = 'managed';
      } else if (this.enhancedMcpClient && this.enhancedMcpClient.isInitialized()) {
        activeClient = this.enhancedMcpClient;
        clientType = 'enhanced';
      } else if (this.mcpClient && this.mcpClient.isInitialized()) {
        activeClient = this.mcpClient;
        clientType = 'original';
      }

      if (!activeClient) {
        throw new Error('No active MCP client available for setting access token');
      }

      // Set the access token using the appropriate client
      console.log(`🔐 Setting access token for Lokka MCP server using ${clientType} client...`);
      
      let result: any;
      if (clientType === 'persistent' || clientType === 'managed') {
        // Persistent and managed clients use sendRequest
        result = await activeClient.sendRequest('tools/call', {
          name: 'set-access-token',
          arguments: { accessToken: accessToken }
        });
      } else {
        // Enhanced and original clients use callTool
        result = await activeClient.callTool('set-access-token', {
          accessToken: accessToken
        });
      }
      
      console.log('MCP tool set-access-token result:', result);
      
      // Check for errors in the result
      if (result?.isError || result?.result?.isError) {
        const errorMessage = result?.content?.[0]?.text || result?.result?.content?.[0]?.text || 'Unknown error from set-access-token tool';
        console.error('❌ Failed to set access token:', errorMessage);        
        throw new Error(errorMessage);
      }

      console.log('✅ Access token set successfully for Lokka MCP server');
      
      // Quick verification with a test API call appropriate for the auth mode
      try {
        // Use different test endpoints based on authentication mode
        const testPath = env.USE_CLIENT_TOKEN ? '/me' : '/users?$top=1';
        
        let testResult: any;
        if (clientType === 'persistent' || clientType === 'managed') {
          // Persistent and managed clients use sendRequest
          testResult = await activeClient.sendRequest('tools/call', {
            name: 'Lokka-Microsoft',
            arguments: {
              apiType: 'graph',
              path: testPath,
              method: 'get'
            }
          });
        } else {
          // Enhanced and original clients use callTool
          testResult = await activeClient.callTool('Lokka-Microsoft', {
            apiType: 'graph',
            path: testPath,
            method: 'get'
          });
        }
        
        if (!testResult?.isError && !testResult?.result?.isError) {
          console.log('✅ Graph API functionality verified with access token');
        } else {
          console.log('⚠️ Graph API test failed:', testResult?.content?.[0]?.text || testResult?.result?.content?.[0]?.text);
        }
      } catch (testError) {
        console.log('⚠️ Graph API verification failed:', testError);
      }
      
    } catch (error) {
      console.error('❌ Failed to set access token for active client:', error);
      throw error;
    }
  }

  private async setAccessToken(): Promise<void> {
    try {
      console.log('🔧 Setting up access token for Lokka MCP server...');
      
      // Get fresh access token from auth service
      const token = await this.authService.getToken();
      
      if (!token || !token.accessToken) {
        throw new Error('No valid access token available for user token authentication');
      }

      console.log('Token details:', {
        hasToken: !!token.accessToken,
        tokenLength: token.accessToken.length,
        tokenPrefix: token.accessToken.substring(0, 20) + '...',
        expiresOn: token.expiresOn
      });

      // First check if Lokka is already ready and working
      try {
        const authStatusResult = await this.mcpClient?.callTool('get-auth-status', {});
        const authStatusText = authStatusResult?.content?.[0]?.text;
        
        if (authStatusText) {
          const authStatus = JSON.parse(authStatusText);
          console.log('Current Lokka auth status:', JSON.stringify(authStatus, null, 2));
          
          // If Lokka is already ready with a valid token, test if it works
          if (authStatus.authMode === 'client_provided_token' && 
              authStatus.isReady && 
              !authStatus.tokenStatus?.isExpired) {
            console.log('Lokka already has a valid token, testing functionality...');
            
            // Test if it actually works by making a simple API call
            try {
              const testResult = await this.mcpClient?.callTool('Lokka-Microsoft', {
                apiType: 'graph',
                path: '/me',
                method: 'get'
              });
              
              if (!testResult?.isError) {
                console.log('✅ Lokka is already working with existing token');
                return;
              } else {
                console.log('Existing token not working properly, will update it...');
              }
            } catch (testError) {
              console.log('Existing token test failed, will update it...', testError);
            }
          }
        }
      } catch (statusError) {
        console.log('Could not check auth status, proceeding with token setup...', statusError);
      }

      console.log('Setting access token for Lokka MCP server...');
      console.log('Calling MCP tool set-access-token with arguments:', {
        accessToken: token.accessToken.substring(0, 50) + '...'
      });

      // Call the set-access-token tool (following test pattern)
      const result = await this.mcpClient?.callTool('set-access-token', {
        accessToken: token.accessToken
      });
      
      console.log('MCP tool set-access-token result:', result);
      
      // Check for errors in the result (following the test pattern)
      if (result?.isError) {
        const errorMessage = result.content?.[0]?.text || 'Unknown error from set-access-token tool';
        throw new Error(errorMessage);
      }

      // Verify the token was set successfully by checking auth status again
      try {
        const verifyResult = await this.mcpClient?.callTool('get-auth-status', {});
        const verifyText = verifyResult?.content?.[0]?.text;
        
        if (verifyText) {
          const verifyStatus = JSON.parse(verifyText);
          console.log('Token set successfully. New auth status:', JSON.stringify(verifyStatus, null, 2));
          
          if (!verifyStatus.isReady) {
            throw new Error('Token was set but Lokka is not ready');
          }
        }
      } catch (verifyError) {
        console.log('Could not verify token status, but proceeding...', verifyError);
      }
      
      console.log('✅ Access token set successfully for Lokka MCP server');
    } catch (error) {
      console.error('Failed to set access token for Lokka MCP server:', error);
      throw error;
    }
  }

  // Method to restart Lokka after authentication becomes available
  async restartWithAuthentication(): Promise<void> {
    console.log('🔄 [Lokka Restart] Restarting Lokka with authentication after user login');
    
    try {
      // Stop existing server first
      await this.stopServer();
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // CRITICAL: Update environment with fresh access token before restarting
      console.log('🔧 [Lokka Restart] Getting fresh access token for restart...');
      const token = await this.authService.getToken();
      
      if (!token || !token.accessToken) {
        throw new Error('No valid access token available after authentication');
      }
      
      console.log('🔧 [Lokka Restart] Updating environment configuration with fresh access token');
      
      // Update the config environment with the fresh access token
      this.config.env = {
        ...this.config.env,
        ACCESS_TOKEN: token.accessToken,
        USE_CLIENT_TOKEN: 'true' // Ensure we're using client token mode
      };
      
      console.log('🔧 [Lokka Restart] Environment updated, restarting server...');
      
      // Start server again with updated authentication
      await this.startServer();
      
      console.log('✅ [Lokka Restart] Lokka successfully restarted with authentication');
    } catch (error) {
      console.error('❌ [Lokka Restart] Failed to restart Lokka with authentication:', error);
      throw error;
    }
  }

  // NEW: Method to restart Lokka after authentication
  async restartAfterAuthentication(): Promise<void> {
    console.log('🔄 [Lokka Restart] Restarting Lokka MCP server after authentication...');
    
    try {
      // Stop any existing clients first
      await this.stopServer();
      
      // Clear startup state
      this.isStarting = false;
      this.startupPromise = null;
      
      // CRITICAL: Update environment with fresh access token before restarting
      console.log('🔧 [Lokka Restart] Getting fresh access token for restart...');
      const token = await this.authService.getToken();
      
      if (!token || !token.accessToken) {
        throw new Error('No valid access token available after authentication');
      }
      
      console.log('🔧 [Lokka Restart] Updating environment configuration with fresh access token');
      console.log('🔧 [Lokka Restart] Token details:', {
        hasToken: !!token.accessToken,
        tokenLength: token.accessToken.length,
        expiresOn: token.expiresOn
      });
      
      // Update the config environment with the fresh access token
      this.config.env = {
        ...this.config.env,
        ACCESS_TOKEN: token.accessToken,
        USE_CLIENT_TOKEN: 'true' // Ensure we're using client token mode
      };
      
      console.log('🔧 [Lokka Restart] Environment updated for restart:', {
        hasAccessToken: !!(this.config.env.ACCESS_TOKEN && this.config.env.ACCESS_TOKEN !== 'dummy-token-will-be-replaced'),
        useClientToken: this.config.env.USE_CLIENT_TOKEN,
        envVarCount: Object.keys(this.config.env).length
      });
      
      // Start fresh with authentication available
      await this.startServer();
      
      console.log('✅ [Lokka Restart] Lokka MCP server restarted after authentication');
    } catch (error) {
      console.error('❌ [Lokka Restart] Failed to restart Lokka with authentication:', error);
      throw error;
    }
  }
}

// Export for module compatibility
export default ExternalLokkaMCPStdioServer;
