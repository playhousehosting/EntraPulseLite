// ExternalLokkaMCPStdioServer.ts
// Proper implementation of Lokka MCP Server using stdio communication

import { MCPRequest, MCPResponse, MCPServerConfig, MCPTool } from '../../types';
import { MCPErrorHandler, ErrorCode } from '../../utils';
import { MCPAuthService } from '../../auth/MCPAuthService';
import { StdioMCPClient } from '../../clients/StdioMCPClient';
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
  private tools: MCPTool[] = [];

  constructor(config: ExternalLokkaMCPServerConfig, authService: MCPAuthService, configService: ConfigService) {
    this.config = config;
    this.authService = authService;
    this.configService = configService;
    this.initializeTools();
  }

  private initializeTools(): void {
    // Define the tools we expect Lokka to provide
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
            subscriptionId: {
              type: 'string',
              description: 'Azure subscription ID (for Azure API calls)'
            },
            apiVersion: {
              type: 'string',
              description: 'API version (for Azure API calls)'
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
    if (this.mcpClient?.isRunning()) {
      console.log('Lokka MCP server already running');
      return;
    }    console.log('Starting Lokka MCP server via stdio...');
    console.log('Lokka version: Forcing latest version with --force flag');
    
    const authPreference = this.configService.getAuthenticationPreference();
    console.log(`Using authentication preference: ${authPreference}`);
      // Prepare environment variables
    const env: Record<string, string> = {};

    if (authPreference === 'application-credentials' && this.config.env?.CLIENT_SECRET) {
      console.log('Using application credentials authentication for Lokka MCP server');
      env.TENANT_ID = this.config.env.TENANT_ID || '';
      env.CLIENT_ID = this.config.env.CLIENT_ID || '';
      env.CLIENT_SECRET = this.config.env.CLIENT_SECRET;    } else {
      console.log('Using user token authentication for Lokka MCP server');
      // Use Lokka's new client-provided token mode
      env.USE_CLIENT_TOKEN = 'true';
      
      // Check if an ACCESS_TOKEN is already provided (e.g., from Enhanced Graph Access)
      if (this.config.env?.ACCESS_TOKEN) {
        console.log('Using pre-provided ACCESS_TOKEN for Enhanced Graph Access mode');
        env.ACCESS_TOKEN = this.config.env.ACCESS_TOKEN;
        env.USE_INTERACTIVE = this.config.env.USE_INTERACTIVE || 'false';
      } else {
        // WORKAROUND: Lokka has a bug where authManager is not initialized in client token mode
        // without an initial ACCESS_TOKEN. To work around this, we'll provide a dummy token
        // that will be immediately replaced with the real token.
        env.ACCESS_TOKEN = 'dummy-token-will-be-replaced';
      }
    }// Create the MCP client configuration
    const clientConfig: MCPServerConfig = {
      name: this.config.name,
      type: this.config.type,
      port: this.config.port || 0, // Not used for stdio, but required by interface
      enabled: true,
      command: this.config.command || 'npx',
      args: this.config.args || ['--yes', '@merill/lokka@latest'],
      options: { env }
    };    console.log('Lokka environment setup:', {
      authMethod: env.USE_CLIENT_TOKEN ? 'client-provided-token' : 'client-credentials',
      hasClientSecret: !!env.CLIENT_SECRET,
      useClientToken: env.USE_CLIENT_TOKEN === 'true',
      hasPreProvidedToken: !!(this.config.env?.ACCESS_TOKEN && this.config.env.ACCESS_TOKEN !== 'dummy-token-will-be-replaced'),
      useInteractive: env.USE_INTERACTIVE || 'not-set'
    });this.mcpClient = new StdioMCPClient(clientConfig);
    
    await this.mcpClient.start();

    // Add a delay to ensure server is fully ready (following the test pattern)
    console.log('⏳ Waiting for Lokka server to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 2000));    // For client-provided token mode, set the token IMMEDIATELY
    // This must be done before any other operations
    if (env.USE_CLIENT_TOKEN === 'true') {
      console.log('🔧 Setting up access token for client-provided-token mode...');
        
      // Verify Lokka is ready for token operations
      try {
        const availableTools = await this.mcpClient.listTools();
        console.log('✅ Lokka MCP tools available:', availableTools.map(t => t.name));
      } catch (toolsError) {
        console.log('⚠️ Could not verify Lokka tools:', toolsError);
      }
      
      let accessToken: string;
      
      // Check if we have a pre-provided ACCESS_TOKEN (Enhanced Graph Access mode)
      if (this.config.env?.ACCESS_TOKEN && this.config.env.ACCESS_TOKEN !== 'dummy-token-will-be-replaced') {
        console.log('🔐 Using pre-provided PowerShell access token for Enhanced Graph Access');
        accessToken = this.config.env.ACCESS_TOKEN;
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

      // Set the access token
      console.log('🔐 Setting access token for Lokka MCP server...');
      const result = await this.mcpClient?.callTool('set-access-token', {
        accessToken: accessToken
      });
      
      console.log('MCP tool set-access-token result:', result);
        // Check for errors in the result
      if (result?.isError) {
        const errorMessage = result.content?.[0]?.text || 'Unknown error from set-access-token tool';
        console.error('❌ Failed to set access token:', errorMessage);        
        throw new Error(errorMessage);
      }

      console.log('✅ Access token set successfully for Lokka MCP server');      // Quick verification with a test API call appropriate for the auth mode
      try {
        // Use different test endpoints based on authentication mode
        const testPath = env.USE_CLIENT_TOKEN ? '/me' : '/users?$top=1';
        const testResult = await this.mcpClient?.callTool('Lokka-Microsoft', {
          apiType: 'graph',
          path: testPath,
          method: 'get'
        });
        
        if (!testResult?.isError) {
          console.log('✅ Graph API functionality verified');
        } else {
          console.log('⚠️ Graph API test failed:', testResult.content?.[0]?.text);
        }
      } catch (testError) {
        console.log('⚠️ Graph API verification failed:', testError);
      }
    }    // Verify server is fully operational
    try {
      const availableTools = await this.mcpClient.listTools();
      console.log('🔧 Lokka MCP server ready with tools:', availableTools.map(t => t.name));
      
      // Update our tools list with what the server actually provides
      if (availableTools.length > 0) {
        this.tools = availableTools;
        console.log('✅ Tools list updated with server response');
      } else {
        console.warn('⚠️ No tools returned from Lokka server');
      }
    } catch (error) {
      console.error('Failed to list tools from Lokka MCP server:', error);
    }    console.log('🎉 Lokka MCP server started successfully');    // Final verification: Test API functionality
    console.log('\n🔧 Final verification: Testing API functionality...');
    try {
      const authPreference = this.configService.getAuthenticationPreference();
      // Use appropriate test endpoint based on auth mode
      const testPath = authPreference === 'application-credentials' ? '/users?$top=1' : '/me';
      
      const testResult = await this.mcpClient?.callTool('Lokka-Microsoft', {
        apiType: 'graph',
        path: testPath,
        method: 'get'
      });
      
      if (!testResult?.isError) {
        console.log('✅ Lokka API test successful - ready for queries!');
      } else {
        console.warn('⚠️ Lokka API test failed:', testResult?.content?.[0]?.text);
        // Still continue - maybe the API call will work in actual usage
      }
    } catch (testError) {
      console.warn('⚠️ Could not test API functionality:', testError);
    }
  }

  async stopServer(): Promise<void> {
    if (this.mcpClient) {
      console.log('Stopping Lokka MCP server...');
      await this.mcpClient.stop();
      this.mcpClient = null;
      console.log('Lokka MCP server stopped');
    }
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.mcpClient?.isInitialized()) {
      throw new Error('Lokka MCP server not initialized');
    }

    try {
      const tools = await this.mcpClient.listTools();
      return tools;
    } catch (error) {
      console.error('Failed to list tools from Lokka MCP server:', error);
      return this.tools; // Return our cached tools as fallback
    }
  }
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    if (!this.mcpClient?.isInitialized()) {
      return {
        id: request.id,
        error: MCPErrorHandler.createError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          'Lokka MCP server not initialized'
        )
      };
    }

    try {
      console.log('Handling Lokka MCP request:', request);
      
      // For tool calls, extract the tool name and arguments
      if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        const result = await this.mcpClient.callTool(name, args);
        
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
  // Compatibility method for the existing interface
  async callTool(toolName: string, arguments_: any): Promise<any> {
    if (!this.mcpClient?.isInitialized()) {
      throw new Error('Lokka MCP server not initialized');
    }

    console.log(`🔧 ExternalLokkaMCPStdioServer: Calling tool: ${toolName}`, arguments_);
    
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
      const result = await this.mcpClient.callTool(actualToolName, mappedArguments);
      console.log(`🔧 ExternalLokkaMCPStdioServer: Tool result:`, result);
      return result;
    } catch (error) {
      console.error(`🔧 ExternalLokkaMCPStdioServer: Tool call failed:`, error);
      throw error;
    }
  }

  // Check if the server is running and initialized
  isReady(): boolean {
    return this.mcpClient?.isInitialized() || false;
  }
  // Get server status for debugging
  getStatus(): { running: boolean; initialized: boolean; toolCount: number } {
    return {
      running: this.mcpClient?.isRunning() || false,
      initialized: this.mcpClient?.isInitialized() || false,
      toolCount: this.tools.length
    };
  }  private async setAccessToken(): Promise<void> {
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
}

// Export for module compatibility
export default ExternalLokkaMCPStdioServer;
