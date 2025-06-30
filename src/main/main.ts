// Main Electron process for EntraPulse Lite
import { app, BrowserWindow, ipcMain, Menu, globalShortcut, shell } from 'electron';
import * as path from 'path';
import { AuthService } from '../auth/AuthService';
import { GraphService } from '../shared/GraphService';
import { ConfigService } from '../shared/ConfigService';
import { LLMService } from '../llm/LLMService';
import { EnhancedLLMService } from '../llm/EnhancedLLMService';
import { MCPClient } from '../mcp/clients/MCPSDKClient';
import { MCPAuthService } from '../mcp/auth/MCPAuthService';
import { MCPServerManager } from '../mcp/servers/MCPServerManager';
import { GraphMCPClient } from '../mcp/clients/GraphMCPClient';
import { MCPErrorHandler, ErrorCode } from '../mcp/utils';
import { debugMCP, checkMCPServerHealth } from '../mcp/mcp-debug';
import { AutoUpdaterService } from './AutoUpdaterService';
import { AppConfig, MCPServerConfig } from '../types';

// Set app ID for Windows taskbar integration
if (process.platform === 'win32') {
  app.setAppUserModelId('com.increment.entrapulselite');
}

class EntraPulseLiteApp {
  private mainWindow: BrowserWindow | null = null;
  private authService!: AuthService;
  private graphService!: GraphService;
  private configService!: ConfigService;
  private llmService!: EnhancedLLMService;
  private mcpClient!: MCPClient;
  private mcpServerManager!: MCPServerManager;
  private autoUpdaterService!: AutoUpdaterService;
  private config!: AppConfig;
  private configurationAvailabilityNotified: boolean = false;constructor() {
    this.initializeServices().then(() => {
      this.setupEventHandlers();
    });
  }

  private getDefaultModelForProvider(provider: 'ollama' | 'lmstudio' | 'openai' | 'anthropic'): string {
    switch (provider) {
      case 'ollama':
        return 'codellama:7b';
      case 'lmstudio':
        return 'gpt-4';
      case 'openai':
        return 'gpt-4o-mini';      case 'anthropic':
        return 'claude-3-haiku-20240307';
      default:        return 'gpt-4o-mini';
    }
  }
  private async initializeServices(): Promise<void> {    // Initialize configuration service first
    this.configService = new ConfigService();    // Get authentication configuration (stored config takes precedence)
    const authConfig = await this.getAuthConfiguration();
      // Check if we have Lokka credentials OR if user can authenticate interactively
    const hasLokkaCreds = authConfig.clientSecret && authConfig.clientId && authConfig.tenantId;
    const canUseTokenAuth = authConfig.clientId && authConfig.tenantId; // Token auth only needs these
    
    console.log('[Main] Lokka authentication options:', {
      hasLokkaCreds,
      canUseTokenAuth,
      clientIdExists: Boolean(authConfig.clientId),
      tenantIdExists: Boolean(authConfig.tenantId),
      clientSecretExists: Boolean(authConfig.clientSecret)
    });
    
    // Set service-level access for the main process (trusted environment)
    this.configService.setServiceLevelAccess(true);
    
      // Set authentication as verified since we are in the main process
    this.configService.setAuthenticationVerified(true);
    
    // Check user's authentication preference from the Entra config
    const authPreference = this.configService.getAuthenticationPreference();
    const useAppCredentials = authPreference === 'application-credentials' && hasLokkaCreds;
    
    // Set authentication context based on user preference, not just credential availability
    const authMode = useAppCredentials ? 'client-credentials' : 'interactive';
    console.log(`[Main] Setting initial authentication mode: ${authMode} (preference: ${authPreference})`);
    this.configService.setAuthenticationContext(authMode);
      // Initialize configuration using stored config
    const storedLLMConfig = this.configService.getLLMConfig();
    const storedEntraConfig = this.configService.getEntraConfig();
    
    // Determine the client ID and prepare Lokka environment based on Enhanced Graph Access setting
    let lokkaClientId = authConfig.clientId;
    let lokkaEnv: Record<string, string>;
    
    // Check if Enhanced Graph Access is enabled and not in application credentials mode
    if (storedEntraConfig?.useGraphPowerShell && authPreference !== 'application-credentials') {
      console.log('🔧 Enhanced Graph Access mode detected during initialization');
      lokkaClientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell client ID
      lokkaEnv = {
        TENANT_ID: 'common', // Use 'common' for multi-tenant Enhanced Graph Access
        CLIENT_ID: lokkaClientId
      };
      
      // Try to get a PowerShell token for immediate use
      try {        const graphPowerShellAuthConfig: AppConfig = {
          auth: {
            clientId: lokkaClientId,
            tenantId: authConfig.tenantId,
            scopes: [
              'https://graph.microsoft.com/User.Read',
              'https://graph.microsoft.com/Mail.Read',
              'https://graph.microsoft.com/Mail.ReadWrite',
              'https://graph.microsoft.com/Calendars.Read',
              'https://graph.microsoft.com/Files.Read.All',
              'https://graph.microsoft.com/Directory.Read.All'
            ],
            useClientCredentials: false
          },
          llm: storedLLMConfig, // Use existing LLM config
          mcpServers: [], // Not needed for token acquisition
          features: {
            enablePremiumFeatures: false,
            enableTelemetry: false,
          }
        };
        
        const tempAuthService = new AuthService(graphPowerShellAuthConfig);
        const token = await tempAuthService.getToken();
        
        if (token && token.accessToken) {
          console.log('🔐 Successfully obtained Enhanced Graph Access token during initialization');
          lokkaEnv.ACCESS_TOKEN = token.accessToken;
          lokkaEnv.USE_INTERACTIVE = 'false';
        } else {
          console.log('⚠️ Failed to get Enhanced Graph Access token during initialization, will use client token mode');
          lokkaEnv.USE_CLIENT_TOKEN = 'true';
        }
      } catch (error) {
        console.log('⚠️ Error getting Enhanced Graph Access token during initialization:', error);
        lokkaEnv.USE_CLIENT_TOKEN = 'true';
      }
    } else {
      lokkaEnv = {
        TENANT_ID: authConfig.tenantId,
        CLIENT_ID: authConfig.clientId,
        ...(authConfig.clientSecret && { CLIENT_SECRET: authConfig.clientSecret })
      };
    }
    
      this.config = {
      auth: {
        clientId: authConfig.clientId,        tenantId: authConfig.tenantId,
        scopes: useAppCredentials 
          ? ['https://graph.microsoft.com/.default'] // Client credentials flow requires .default scope
          : ['https://graph.microsoft.com/.default'], // Interactive flow using .default to inherit all app registration permissions
        clientSecret: authConfig.clientSecret, // Only needed for confidential client applications
        useClientCredentials: Boolean(useAppCredentials), // Use client credentials flow based on user preference
      },
      llm: storedLLMConfig, // Use stored LLM configuration
      mcpServers: [        {
          name: 'external-lokka',
          type: 'external-lokka',
          port: 0, // Not used for stdin/stdout MCP servers
          enabled: Boolean(canUseTokenAuth), // Enable if we can do token auth OR client credentials
          command: 'npx',
          args: ['-y', '@merill/lokka'],
          env: lokkaEnv
        },
        {
          name: 'fetch',
          type: 'fetch',
          port: 3002, // Only used for built-in fetch server
          enabled: true,
        },
        {
          name: 'microsoft-docs',
          type: 'microsoft-docs',
          port: 0, // Not used for HTTP-based MCP servers
          enabled: true,
          url: 'https://learn.microsoft.com/api/mcp',
          authConfig: {
            type: 'none' // Microsoft Docs MCP doesn't require authentication
          }
        },
      ],
      features: {
        enablePremiumFeatures: false, // Set via UI preferences
        enableTelemetry: false, // Set via UI preferences
      },
    };    // Log the final Lokka MCP server configuration for debugging
    const lokkaConfig = this.config.mcpServers.find(server => server.name === 'external-lokka');
    console.log('[Main] Final Lokka MCP server configuration:', {
      enabled: lokkaConfig?.enabled,
      hasEnv: Boolean(lokkaConfig?.env),
      envKeys: lokkaConfig?.env ? Object.keys(lokkaConfig.env) : [],
      envValues: lokkaConfig?.env ? Object.keys(lokkaConfig.env).reduce((acc, key) => {
        acc[key] = Boolean(lokkaConfig.env![key]);
        return acc;
      }, {} as Record<string, boolean>) : {},
      enhancedAccess: Boolean(storedEntraConfig?.useGraphPowerShell),
      clientId: lokkaClientId.substring(0, 8) + '...'
    });

    // Initialize services
    this.authService = new AuthService(this.config);
    this.graphService = new GraphService(this.authService);    // Initialize MCP services first
    const mcpAuthService = new MCPAuthService(this.authService);
    
    // Create MCPServerManager with auth service
    console.log('Initializing MCP client with server configs:', this.config.mcpServers);
    this.mcpServerManager = new MCPServerManager(this.config.mcpServers, mcpAuthService, this.configService);
      // Initialize MCP client with auth service
    this.mcpClient = new MCPClient(this.config.mcpServers, mcpAuthService);    // Determine LLM configuration based on preferences
    let llmConfig = { ...this.config.llm }; // Start with the full configuration
    const preferLocal = this.config.llm.preferLocal;
    const hasLocalProvider = (this.config.llm.provider === 'ollama' || this.config.llm.provider === 'lmstudio') && 
                            this.config.llm.baseUrl && this.config.llm.model;
    
    console.log('[Main] LLM provider selection debug:', {
      preferLocal,
      currentProvider: this.config.llm.provider,
      currentModel: this.config.llm.model,
      currentBaseUrl: this.config.llm.baseUrl,
      hasLocalProvider,
      hasCloudProviders: !!this.config.llm.cloudProviders,
      cloudProviderKeys: this.config.llm.cloudProviders ? Object.keys(this.config.llm.cloudProviders) : [],
      defaultCloudProviderField: this.config.llm.defaultCloudProvider
    });
    
    // Check if we should use local LLM (preferLocal is true and local provider is configured)
    if (preferLocal && hasLocalProvider) {
      console.log('🔧 Using LOCAL LLM as preferred:', this.config.llm.provider, 'Model:', this.config.llm.model);
      // Use the existing local configuration (already copied above)
    } else {
      // Fall back to cloud provider logic
      const defaultCloudProvider = this.configService.getDefaultCloudProvider();
      
      if (defaultCloudProvider) {
        // Update the main provider fields to match the default cloud provider
        // but keep the full cloudProviders configuration intact
        llmConfig.provider = defaultCloudProvider.provider;
        llmConfig.model = defaultCloudProvider.config.model;
        
        // Only update these fields if they're not already set at the root level
        if (!llmConfig.apiKey || llmConfig.apiKey.trim() === '') {
          llmConfig.apiKey = defaultCloudProvider.config.apiKey;
        }
        if (!llmConfig.baseUrl || llmConfig.baseUrl.trim() === '') {
          llmConfig.baseUrl = defaultCloudProvider.config.baseUrl;
        }
        if (llmConfig.temperature === undefined) {
          llmConfig.temperature = defaultCloudProvider.config.temperature;
        }
        if (llmConfig.maxTokens === undefined) {
          llmConfig.maxTokens = defaultCloudProvider.config.maxTokens;
        }
        if (!llmConfig.organization || llmConfig.organization.trim() === '') {
          llmConfig.organization = defaultCloudProvider.config.organization;
        }
        
        console.log('🔄 Using default cloud provider for LLM:', defaultCloudProvider.provider, 'Model:', defaultCloudProvider.config.model);
        console.log('🔄 Full llmConfig includes cloudProviders:', !!llmConfig.cloudProviders, 'keys:', llmConfig.cloudProviders ? Object.keys(llmConfig.cloudProviders) : 'none');
      } else {
        console.log('⚠️ No default cloud provider configured, using stored LLM config');
        console.log('⚠️ This means either defaultCloudProvider is not set or the provider is not in cloudProviders');
      }
    }
    
    // Initialize LLM service with the appropriate configuration
    this.llmService = new EnhancedLLMService(llmConfig, this.authService, this.mcpClient);
    
    // Initialize auto-updater service
    this.autoUpdaterService = new AutoUpdaterService(this.configService);
    
    // Log successful initialization
    console.log('Services initialized successfully');
  }
  /**
   * Reinitialize services when configuration changes (e.g., Entra config updated)
   */
  private async reinitializeServices(): Promise<void> {
    try {
      console.log('[Main] Reinitializing services with updated configuration...');
      
      // Store current cloud provider configurations before context switch
      const currentCloudProviders = this.configService.getLLMConfig()?.cloudProviders;
      const currentDefaultProvider = this.configService.getDefaultCloudProvider();
      console.log('[Main] Preserving cloud providers during reinitialization:', {
        hasCloudProviders: !!currentCloudProviders,
        providerCount: currentCloudProviders ? Object.keys(currentCloudProviders).length : 0,
        defaultProvider: currentDefaultProvider?.provider
      });
        // Get updated authentication configuration
      const authConfig = await this.getAuthConfiguration();
        // Check if we have Lokka credentials configured for non-interactive authentication
      const hasLokkaCreds = authConfig.clientSecret && authConfig.clientId && authConfig.tenantId;
      
      // Check user's authentication preference from the Entra config
      const authPreference = this.configService.getAuthenticationPreference();
      const useAppCredentials = authPreference === 'application-credentials' && hasLokkaCreds;
      
      // Update authentication context in ConfigService BEFORE reinitializing other services
      console.log('[Main] Updating authentication context for configuration mode...');
      console.log('[Main] Authentication analysis:', {
        hasLokkaCreds,
        authPreference,
        useAppCredentials
      });
      
      // Determine the new authentication mode based on user preference
      const newAuthMode = useAppCredentials ? 'client-credentials' : 'interactive';
      console.log(`[Main] Switching authentication mode to: ${newAuthMode}`);
      
      // Set authentication context but preserve existing cloud provider configs
      this.configService.setAuthenticationContext(newAuthMode);
      
      // Restore cloud provider configurations if they exist
      if (currentCloudProviders && Object.keys(currentCloudProviders).length > 0) {
        console.log('[Main] Restoring cloud provider configurations after context switch...');
        const restoredConfig = this.configService.getLLMConfig();
        restoredConfig.cloudProviders = currentCloudProviders;
        if (currentDefaultProvider) {
          restoredConfig.defaultCloudProvider = currentDefaultProvider.provider;
        }
        this.configService.saveLLMConfig(restoredConfig);
        console.log('[Main] Cloud provider configurations restored successfully');
      }
      
      // Update the config object - use preference not just credential availability
      this.config.auth = {
        clientId: authConfig.clientId,
        tenantId: authConfig.tenantId,
        scopes: useAppCredentials 
          ? ['https://graph.microsoft.com/.default'] 
          : ['https://graph.microsoft.com/.default'],
        clientSecret: authConfig.clientSecret,
        useClientCredentials: Boolean(useAppCredentials),
      };      // Update MCP server configuration with Enhanced Graph Access support
      const lokkaServerIndex = this.config.mcpServers.findIndex(server => server.name === 'external-lokka');
      if (lokkaServerIndex !== -1) {
        // Get the stored Entra configuration to check for Enhanced Graph Access setting
        const storedEntraConfig = this.configService.getEntraConfig();
        
        // Determine client ID and authentication mode based on Enhanced Graph Access setting
        let clientId = authConfig.clientId || '';
        let authMode = 'application-credentials';
        let env: Record<string, string>;        // Check if Enhanced Graph Access is enabled and not in application credentials mode
        if (storedEntraConfig?.useGraphPowerShell && 
            this.configService.getAuthenticationPreference() !== 'application-credentials') {
          console.log('🔧 Using Enhanced Graph Access mode with Microsoft Graph PowerShell client ID during reinitialize');
          clientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell client ID
          authMode = 'delegated';
          env = {
            TENANT_ID: 'common', // Use 'common' for multi-tenant Enhanced Graph Access
            CLIENT_ID: clientId
          };
          
          // For Enhanced Graph Access, we need to get a token using the Graph PowerShell client ID
          // and provide it directly to Lokka
          try {            console.log('🔐 Getting access token for Enhanced Graph Access mode during reinitialize...');
            
            // Create a temporary auth service with Microsoft Graph PowerShell client ID
            const graphPowerShellAuthConfig = {
              ...this.config,
              auth: {
                clientId: '14d82eec-204b-4c2f-b7e8-296a70dab67e',
                tenantId: storedEntraConfig.tenantId,
                scopes: [
                  'https://graph.microsoft.com/User.Read',
                  'https://graph.microsoft.com/Mail.Read',
                  'https://graph.microsoft.com/Mail.ReadWrite',
                  'https://graph.microsoft.com/Calendars.Read',
                  'https://graph.microsoft.com/Files.Read.All',
                  'https://graph.microsoft.com/Directory.Read.All'
                ],
                useClientCredentials: false
              }
            };
            
            const tempAuthService = new AuthService(graphPowerShellAuthConfig);
            const token = await tempAuthService.getToken();
            
            if (token && token.accessToken) {
              console.log('🔐 Successfully obtained Enhanced Graph Access token during reinitialize');
              env.CLIENT_ID = clientId;
              env.ACCESS_TOKEN = token.accessToken;
              env.USE_INTERACTIVE = 'false'; // Use provided token, don't authenticate interactively
              // Don't set USE_CLIENT_TOKEN when providing ACCESS_TOKEN directly
            } else {
              console.error('❌ Failed to get Enhanced Graph Access token during reinitialize, falling back to client token mode');
              env.CLIENT_ID = clientId;
              env.USE_CLIENT_TOKEN = 'true';
            }
          } catch (error) {
            console.error('❌ Error getting Enhanced Graph Access token during reinitialize:', error);
            console.log('🔧 Falling back to standard client token mode');
            env.USE_CLIENT_TOKEN = 'true';
          }
        } else if (authConfig.clientSecret) {
          console.log('🔧 Using application credentials mode with client secret during reinitialize');
          env = {
            TENANT_ID: authConfig.tenantId || '',
            CLIENT_ID: clientId,
            CLIENT_SECRET: authConfig.clientSecret
          };
        } else {
          console.log('🔧 Using delegated mode with standard client ID during reinitialize');
          env = {
            TENANT_ID: authConfig.tenantId || '',
            CLIENT_ID: clientId,
            USE_CLIENT_TOKEN: 'true'
          };
        }

        const updatedLokkaConfig: MCPServerConfig = {
          name: 'external-lokka',
          type: 'external-lokka' as const,
          port: 0, // Not used for stdin/stdout MCP servers
          enabled: Boolean(hasLokkaCreds || storedEntraConfig?.useGraphPowerShell),
          command: 'npx',
          args: ['-y', '@merill/lokka'],
          env
        };
        this.config.mcpServers[lokkaServerIndex] = updatedLokkaConfig;
        
        console.log(`[Main] Updated Lokka MCP server config (mode: ${authMode}):`, {
          enabled: updatedLokkaConfig.enabled,
          hasTenantId: Boolean(updatedLokkaConfig.env?.TENANT_ID),
          hasClientId: Boolean(updatedLokkaConfig.env?.CLIENT_ID),
          hasClientSecret: Boolean(updatedLokkaConfig.env?.CLIENT_SECRET),
          useClientToken: Boolean(updatedLokkaConfig.env?.USE_CLIENT_TOKEN),
          enhancedAccess: Boolean(storedEntraConfig?.useGraphPowerShell),
          clientId: clientId.substring(0, 8) + '...'
        });
      } else {
        console.warn('[Main] Lokka server not found in config for update');
      }
      
      // Reinitialize AuthService with new configuration
      this.authService = new AuthService(this.config);
      
      // Update GraphService with new AuthService
      this.graphService = new GraphService(this.authService);
        // Reinitialize MCP services
      const mcpAuthService = new MCPAuthService(this.authService);
      console.log('[Main] Reinitializing MCP client with updated server configs:', this.config.mcpServers);
        // Stop existing MCP services gracefully
      if (this.mcpServerManager) {
        try {
          console.log('[Main] Stopping existing MCP server manager...');
          await this.mcpServerManager.stopAllServers();
          console.log('[Main] MCP server manager stopped successfully');
        } catch (error) {
          console.warn('[Main] Error stopping MCP server manager:', error);
        }
      }
      if (this.mcpClient) {
        try {
          console.log('[Main] Stopping existing MCP client...');
          await this.mcpClient.stopAllServers();
          console.log('[Main] MCP client stopped successfully');
        } catch (error) {
          console.warn('[Main] Error stopping MCP client:', error);
        }
      }
      
      // Wait a moment for services to fully stop
      await new Promise(resolve => setTimeout(resolve, 500));
        // Create new MCP services with updated configuration
      console.log('[Main] Creating new MCP services with updated configs...');
      console.log('[Main] MCP server configs for initialization:', 
        this.config.mcpServers.map(s => ({
          name: s.name,
          type: s.type,
          enabled: s.enabled,
          hasEnv: Boolean(s.env),
          envKeys: s.env ? Object.keys(s.env) : []        }))
      );      
      this.mcpServerManager = new MCPServerManager(this.config.mcpServers, mcpAuthService, this.configService);
      this.mcpClient = new MCPClient(this.config.mcpServers, mcpAuthService);
        
      // Start the new MCP servers explicitly
      console.log('[Main] Starting new MCP servers...');
      try {
        // The MCPServerManager constructor normally starts the servers, but let's be explicit
        // and ensure the Lokka MCP server is started if it's enabled
          // Find the Lokka server config
        const lokkaConfig = this.config.mcpServers.find(server => server.name === 'external-lokka');
        
        if (lokkaConfig && lokkaConfig.enabled) {
          console.log('[Main] Ensuring Lokka MCP server is started...');
          
          try {
            // Use our new method in MCPClient to start the Lokka server explicitly
            await this.mcpClient.startServer('external-lokka');
            console.log('[Main] ✅ Lokka MCP server started explicitly through client');
          } catch (error) {
            console.error('[Main] Failed to start Lokka MCP server through client:', error);
            
            // Fallback to using server manager directly
            const lokkaServer = this.mcpServerManager.getServer('external-lokka');
            if (lokkaServer && lokkaServer.startServer) {
              console.log('[Main] Attempting to start Lokka MCP server through manager...');
              try {
                await lokkaServer.startServer();
                console.log('[Main] ✅ Lokka MCP server started explicitly through manager');
              } catch (error) {
                console.error('[Main] Failed to start Lokka MCP server through manager:', error);
              }
            } else {
              console.warn('[Main] Could not find Lokka server instance in manager');
            }
          }
        } else {
          console.log('[Main] Lokka server is not enabled, skipping explicit start');
        }
        
        // Wait a moment for servers to fully initialize
        await new Promise(resolve => setTimeout(resolve, 1000));        // Verify available servers
        const availableServers = this.mcpClient.getAvailableServers();
        console.log('[Main] Number of available MCP servers after reinitialization:', availableServers.length);
        
        // MCPClient.getAvailableServers() returns string[] of server names
        const lokkaServerExists = availableServers.includes('external-lokka');
        if (lokkaServerExists) {
          console.log('[Main] ✅ External Lokka MCP server is available');
        } else {
          console.warn('[Main] ⚠️ External Lokka MCP server is NOT available');
          console.log('[Main] Available servers:', availableServers);
        }
        
        console.log('[Main] MCP services reinitialized successfully');
      } catch (error) {
        console.error('[Main] Error starting new MCP servers:', error);
      }      // Get updated LLM configuration
      const storedLLMConfig = this.configService.getLLMConfig();
      const defaultCloudProvider = this.configService.getDefaultCloudProvider();
      let llmConfig = this.config.llm;
      
      console.log('[Main] LLM Selection Debug:', {
        storedProvider: storedLLMConfig?.provider,
        storedPreferLocal: storedLLMConfig?.preferLocal,
        defaultCloudProvider: defaultCloudProvider?.provider,
        hasDefaultCloud: !!defaultCloudProvider
      });
      
      // Implement preferLocal logic
      if (storedLLMConfig) {
        if (storedLLMConfig.preferLocal && (storedLLMConfig.provider === 'ollama' || storedLLMConfig.provider === 'lmstudio')) {
          // User prefers local and has configured a local provider
          console.log('[Main] 🖥️ Using local LLM (preferLocal=true):', storedLLMConfig.provider);
          llmConfig = storedLLMConfig;
        } else if (defaultCloudProvider && (storedLLMConfig.provider === 'openai' || storedLLMConfig.provider === 'anthropic' || storedLLMConfig.provider === 'gemini' || storedLLMConfig.provider === 'azure-openai')) {
          // User has selected a cloud provider or preferLocal is false
          console.log('[Main] ☁️ Using cloud LLM (default provider):', defaultCloudProvider.provider);
          llmConfig = {
            provider: defaultCloudProvider.provider,
            model: defaultCloudProvider.config.model,
            apiKey: defaultCloudProvider.config.apiKey,
            baseUrl: defaultCloudProvider.config.baseUrl,
            temperature: defaultCloudProvider.config.temperature,
            maxTokens: defaultCloudProvider.config.maxTokens,
            organization: defaultCloudProvider.config.organization,
            preferLocal: storedLLMConfig.preferLocal // Preserve the preference
          };
        } else {
          // Use the stored configuration as-is
          console.log('[Main] 📋 Using stored LLM config:', storedLLMConfig.provider);
          llmConfig = storedLLMConfig;
        }
      } else if (defaultCloudProvider) {
        // Fallback to default cloud provider if no stored config
        console.log('[Main] ☁️ Fallback to default cloud provider:', defaultCloudProvider.provider);
        llmConfig = {
          provider: defaultCloudProvider.provider,
          model: defaultCloudProvider.config.model,
          apiKey: defaultCloudProvider.config.apiKey,
          baseUrl: defaultCloudProvider.config.baseUrl,
          temperature: defaultCloudProvider.config.temperature,
          maxTokens: defaultCloudProvider.config.maxTokens,
          organization: defaultCloudProvider.config.organization
        };
      } else {
        console.warn('[Main] No LLM configuration available - neither stored config nor default cloud provider');
      }
        // Reinitialize LLM service
      if (this.llmService && typeof this.llmService.dispose === 'function') {
        this.llmService.dispose();
        console.log('[Main] Disposed previous LLM service instance');
      }
      this.llmService = new EnhancedLLMService(llmConfig, this.authService, this.mcpClient);
      
      console.log('[Main] Services reinitialized successfully');
        // Notify renderer that configuration has been updated - but only if not already notified
      if (this.mainWindow && !this.configurationAvailabilityNotified) {
        console.log('📡 [Main] Sending auth:configurationAvailable event from config-update - FIRST TIME ONLY');
        this.configurationAvailabilityNotified = true;
        this.mainWindow.webContents.send('auth:configurationAvailable', { source: 'config-update' });
      }
      
    } catch (error) {
      console.error('[Main] Failed to reinitialize services:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // Set application ID for Windows taskbar
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.increment.entrapulselite');
    }    app.whenReady().then(async () => {
      this.createWindow();
      this.setupMenu();
      this.setupIpcHandlers();
      this.setupGlobalShortcuts();
      
      // Check for existing authentication session after everything is set up
      await this.initializeAuthenticationState();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
      });
    });app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
      // Flag to track if cleanup has been completed
    let cleanupDone = false;
    
    app.on('will-quit', async (event) => {
      // Prevent default quit and perform cleanup only once
      if (!cleanupDone) {
        event.preventDefault();
          try {
          // Unregister all global shortcuts
          globalShortcut.unregisterAll();
          console.log('Global shortcuts unregistered');
          
          // Dispose of LLM service to clean up resources
          if (this.llmService && typeof this.llmService.dispose === 'function') {
            this.llmService.dispose();
            console.log('LLM service disposed');
          }
          
          // Stop all MCP servers gracefully before quitting
          await this.mcpClient.stopAllServers();
          console.log('MCP servers stopped');
          
          // Set the flag to avoid repeated cleanup
          cleanupDone = true;
          
          // Continue with the quit process
          app.exit();
        } catch (error) {
          console.error('Error during cleanup:', error);
          cleanupDone = true;
          app.exit();
        }
      }
    });
  }
  private createWindow(): void {
    this.mainWindow = new BrowserWindow({      width: 1280,
      height: 900,
      minWidth: 900,
      minHeight: 700,
      icon: process.platform === 'win32'
        ? path.resolve(app.getAppPath(), 'assets', 'icon.ico')
        : path.resolve(app.getAppPath(), 'assets', 'EntraPulseLiteLogo.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'default',
      show: false, // Don't show until ready
    });

    // Load the index.html from the dist directory
    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      // Set up auto-updater with the main window reference
      if (this.autoUpdaterService && this.mainWindow) {
        this.autoUpdaterService.setMainWindow(this.mainWindow);
        
        // Check for updates on startup (with delay)
        this.autoUpdaterService.checkForUpdatesOnStartup();
      }
    });

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.webContents.openDevTools();
    }
  }

  private setupMenu(): void {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              // Open settings window
            },
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            },
          },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { 
            role: 'toggleDevTools',
            accelerator: 'F12'
          },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'About EntraPulse Lite',
            click: () => {
              // Show about dialog
            },
          },
        ],
      },
    ];    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupGlobalShortcuts(): void {
    // Register F12 to toggle DevTools - this ensures it works even if menu doesn't respond
    globalShortcut.register('F12', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.toggleDevTools();
      }
    });

    // Register Ctrl+Shift+I as backup shortcut for DevTools
    globalShortcut.register('CmdOrCtrl+Shift+I', () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.toggleDevTools();
      }
    });

    console.log('Global shortcuts registered: F12 and Ctrl+Shift+I for DevTools');
  }

  private setupIpcHandlers(): void {
    // Asset path handler
    ipcMain.handle('app:getAssetPath', (event, assetName: string) => {
      const assetPath = path.join(app.getAppPath(), 'assets', assetName);
      return assetPath;
    });

    // Authentication handlers
    ipcMain.handle('auth:login', async () => {
      try {
        const result = await this.authService.login();
          // After successful login, reinitialize LLM service with full configuration
        if (result) {
          console.log('🔐 Login successful, reloading LLM configuration...');
            // CRITICAL: Set authentication verification flag first
          this.configService.setAuthenticationVerified(true);
          
          // Get Entra config and set authentication context based on available credentials
          const storedEntraConfig = this.configService.getEntraConfig();
          const hasClientSecret = storedEntraConfig?.clientSecret;
          const authContext = hasClientSecret ? 'client-credentials' : 'interactive';
          this.configService.setAuthenticationContext(authContext);
          
          // Get the full LLM configuration now that we're authenticated
          const fullLLMConfig = this.configService.getLLMConfig();
          console.log('🔧 Reloading LLM service with full configuration including cloud providers');          // Reinitialize LLM service with full config
          this.llmService = new EnhancedLLMService(fullLLMConfig, this.authService, this.mcpClient);
            // Check if we have stored Entra credentials and update MCP server config
          console.log('🔧 Checking for stored Entra credentials after login...');
            if (storedEntraConfig && storedEntraConfig.clientId && storedEntraConfig.tenantId) {
            console.log('🔐 Enabling Lokka MCP server for authenticated user...');
              // Enable Lokka MCP server for authenticated user
            const lokkaServerIndex = this.config.mcpServers.findIndex(server => server.name === 'external-lokka');
            if (lokkaServerIndex !== -1) {              // Determine client ID and authentication mode based on Enhanced Graph Access setting
              let clientId = storedEntraConfig.clientId || process.env.MSAL_CLIENT_ID || '';
              let authMode = 'application-credentials';
              let env: Record<string, string>;
              
              // Check if Enhanced Graph Access is enabled and not in application credentials mode
              if (storedEntraConfig?.useGraphPowerShell && 
                  this.configService.getAuthenticationPreference() !== 'application-credentials') {
                console.log('🔧 Using Enhanced Graph Access mode with Microsoft Graph PowerShell client ID');
                clientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell client ID
                authMode = 'delegated';
                env = {
                  TENANT_ID: 'common', // Use 'common' for multi-tenant Enhanced Graph Access
                  CLIENT_ID: clientId
                };
              } else {
                env = {
                  TENANT_ID: storedEntraConfig.tenantId || process.env.MSAL_TENANT_ID || '',
                  CLIENT_ID: storedEntraConfig.clientId || process.env.MSAL_CLIENT_ID || '',
                  ...(storedEntraConfig.clientSecret && { CLIENT_SECRET: storedEntraConfig.clientSecret })
                };
              }
              
              // For Enhanced Graph Access, we need to get a token using the Graph PowerShell client ID
              if (storedEntraConfig?.useGraphPowerShell && 
                  this.configService.getAuthenticationPreference() !== 'application-credentials') {
                try {                  console.log('🔐 Getting access token for Enhanced Graph Access mode...');
                  
                  // Create a temporary auth service with Microsoft Graph PowerShell client ID
                  const graphPowerShellAuthConfig = {
                    ...this.config,
                    auth: {
                      clientId: '14d82eec-204b-4c2f-b7e8-296a70dab67e',
                      tenantId: storedEntraConfig.tenantId,
                      scopes: [
                        'https://graph.microsoft.com/User.Read',
                        'https://graph.microsoft.com/Mail.Read',
                        'https://graph.microsoft.com/Mail.ReadWrite',
                        'https://graph.microsoft.com/Calendars.Read',
                        'https://graph.microsoft.com/Files.Read.All',
                        'https://graph.microsoft.com/Directory.Read.All'
                      ],
                      useClientCredentials: false
                    }
                  };
                  
                  const tempAuthService = new AuthService(graphPowerShellAuthConfig);
                  const token = await tempAuthService.getToken();
                  
                  if (token && token.accessToken) {
                    console.log('🔐 Successfully obtained Enhanced Graph Access token');
                    env.CLIENT_ID = clientId;
                    env.ACCESS_TOKEN = token.accessToken;
                    env.USE_INTERACTIVE = 'false'; // Use provided token, don't authenticate interactively
                    // Don't set USE_CLIENT_TOKEN when providing ACCESS_TOKEN directly
                  } else {
                    console.error('❌ Failed to get Enhanced Graph Access token, falling back to client token mode');
                    env.CLIENT_ID = clientId;
                    env.USE_CLIENT_TOKEN = 'true';
                  }
                } catch (error) {
                  console.error('❌ Error getting Enhanced Graph Access token:', error);
                  console.log('🔧 Falling back to standard client token mode');
                  env.CLIENT_ID = clientId;
                  env.USE_CLIENT_TOKEN = 'true';
                }
              } else if (storedEntraConfig.clientSecret) {
                console.log('🔧 Using application credentials mode with client secret');
                env.CLIENT_ID = clientId;
                env.CLIENT_SECRET = storedEntraConfig.clientSecret;
              } else {
                console.log('🔧 Using delegated mode with standard client ID');
                env.CLIENT_ID = clientId;
                env.USE_CLIENT_TOKEN = 'true';
              }

              this.config.mcpServers[lokkaServerIndex] = {
                ...this.config.mcpServers[lokkaServerIndex],
                enabled: true, // Enable for any authenticated user
                env
              };              
              console.log(`✅ Updated Lokka MCP server configuration after login (mode: ${authMode})`);
              console.log(`🔧 Lokka client ID: ${clientId.substring(0, 8)}...`);
              console.log(`🔧 Lokka auth method: ${env.USE_CLIENT_TOKEN ? 'delegated (client token)' : 'application credentials'}`);
              // Reinitialize MCP services with updated config
              const mcpAuthService = new MCPAuthService(this.authService);
              
              // Stop existing MCP services gracefully
              if (this.mcpServerManager) {
                try {
                  await this.mcpServerManager.stopAllServers();
                } catch (error) {
                  console.warn('Error stopping MCP server manager:', error);
                }
              }              
              // Create new MCP services with updated configuration
              this.mcpServerManager = new MCPServerManager(this.config.mcpServers, mcpAuthService, this.configService);
              this.mcpClient = new MCPClient(this.config.mcpServers, mcpAuthService);
              
              console.log('🚀 MCP services reinitialized with Entra credentials');
            }
          } else {
            console.log('⚠️ No stored Entra credentials found for Lokka MCP server');
          }
          
          // Start or restart the Lokka MCP server with the new authentication context
          try {
            console.log('[Main] Attempting to start Lokka MCP server after successful login...');
            
            // Check if Lokka server is enabled in the configuration
            const lokkaConfig = this.config.mcpServers.find(server => server.name === 'external-lokka');
              if (lokkaConfig && lokkaConfig.enabled) {
              // Try to start the server explicitly
              await this.mcpClient.startServer('external-lokka');
              console.log('[Main] ✅ Lokka MCP server started after authentication');
              
              // Force UI refresh after MCP server initialization
              if (this.mainWindow) {
                console.log('🔄 [Main] Forcing UI state refresh after MCP server startup');
                this.mainWindow.webContents.send('llm:forceStatusRefresh', { source: 'mcp-startup' });
              }
            } else {
              console.log('[Main] Lokka MCP server not enabled, skipping start after login');
            }
          } catch (error) {
            console.error('[Main] Failed to start Lokka MCP server after login:', error);
          }
            // Notify renderer that configuration is now available - but only if not already notified
          if (this.mainWindow && !this.configurationAvailabilityNotified) {
            console.log('📡 [Main] Sending auth:configurationAvailable event from post-login - FIRST TIME ONLY');
            this.configurationAvailabilityNotified = true;
            this.mainWindow.webContents.send('auth:configurationAvailable', { source: 'post-login' });
          }
        }
        
        return result;
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    });    ipcMain.handle('auth:logout', async () => {
      try {
        await this.authService.logout();
        
        // Reset authentication verification flag on logout
        this.configService.setAuthenticationVerified(false);
        
        // Reset configuration availability notification flag for next login session
        this.configurationAvailabilityNotified = false;
        console.log('[Main] Reset configurationAvailabilityNotified flag on logout');
        
        return true;
      } catch (error) {
        console.error('Logout failed:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:getToken', async () => {
      try {
        return await this.authService.getToken();
      } catch (error) {
        console.error('Get token failed:', error);
        return null;
      }
    });

    ipcMain.handle('auth:getCurrentUser', async () => {
      try {
        return await this.authService.getCurrentUser();
      } catch (error) {
        console.error('Get current user failed:', error);
        return null;
      }
    });

    ipcMain.handle('auth:getIdTokenClaims', async () => {
      try {
        return await this.authService.getIdTokenClaims();
      } catch (error) {
        console.error('Get ID token claims failed:', error);
        return null;
      }
    });

    // Progressive permission handlers
    ipcMain.handle('auth:requestPermissions', async (event, permissions: string[]) => {
      try {
        return await this.authService.requestAdditionalPermissions(permissions);
      } catch (error) {
        console.error('Request permissions failed:', error);
        return null;
      }
    });

    ipcMain.handle('auth:getTokenWithPermissions', async (event, permissions: string[]) => {
      try {
        return await this.authService.getTokenWithPermissions(permissions);
      } catch (error) {
        console.error('Get token with permissions failed:', error);
        return null;
      }
    });

    ipcMain.handle('auth:getAuthenticationInfo', async () => {
      try {
        return await this.authService.getAuthenticationInfoWithToken();
      } catch (error) {
        console.error('Get authentication info failed:', error);
        return null;
      }
    });

    // Token cache management handlers
    ipcMain.handle('auth:clearTokenCache', async () => {
      try {
        await this.authService.clearTokenCache();
        return { success: true };
      } catch (error) {
        console.error('Clear token cache failed:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:forceReauthentication', async () => {
      try {
        return await this.authService.forceReauthentication();
      } catch (error) {
        console.error('Force reauthentication failed:', error);
        throw error;
      }
    });    ipcMain.handle('auth:testConfiguration', async (event, testConfig) => {
      try {
        console.log('🧪 Testing authentication configuration via IPC...');
        console.log('🔧 Test config:', {
          hasClientId: !!testConfig.clientId,
          hasClientSecret: !!testConfig.clientSecret,
          useApplicationCredentials: testConfig.useApplicationCredentials,
          useGraphPowerShell: testConfig.useGraphPowerShell
        });
        
        // Determine authentication configuration based on user's settings
        let clientId = testConfig.clientId;
        let useClientCredentials = false;
        let scopes = ['https://graph.microsoft.com/.default'];
          // Check if Enhanced Graph Access is enabled and not in application credentials mode
        if (testConfig.useGraphPowerShell && !testConfig.useApplicationCredentials) {
          console.log('🔧 Testing Enhanced Graph Access mode with Microsoft Graph PowerShell client ID');
          clientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell client ID
          useClientCredentials = false; // Force delegated mode
          scopes = [
            'https://graph.microsoft.com/User.Read',
            'https://graph.microsoft.com/Mail.Read',
            'https://graph.microsoft.com/Mail.ReadWrite',
            'https://graph.microsoft.com/Calendars.Read',
            'https://graph.microsoft.com/Files.Read.All',
            'https://graph.microsoft.com/Directory.Read.All'
          ]; // Request specific mail and other permissions
        } else if (testConfig.useApplicationCredentials && testConfig.clientSecret) {
          console.log('🔧 Testing Application Credentials mode');
          useClientCredentials = true;
          scopes = ['https://graph.microsoft.com/.default'];
        } else {
          console.log('🔧 Testing User Token (delegated) mode');
          useClientCredentials = false;
          scopes = ['https://graph.microsoft.com/.default'];
        }
        
        // Create AppConfig from the provided Entra config
        const appConfig = {
          auth: {
            clientId,
            tenantId: testConfig.tenantId,
            clientSecret: testConfig.clientSecret,
            useClientCredentials,
            scopes
          }
        };

        console.log('🧪 Testing with configuration:', {
          clientId: clientId.substring(0, 8) + '...',
          useClientCredentials,
          scopes,
          authMode: testConfig.useGraphPowerShell ? 'enhanced-delegated' : 
                    testConfig.useApplicationCredentials ? 'application-credentials' : 'delegated'
        });

        return await this.authService.testAuthentication(appConfig);
      } catch (error) {
        console.error('Auth configuration test failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });

    // Microsoft Graph handlers
    ipcMain.handle('graph:query', async (event, endpoint: string, method?: string, data?: any) => {
      try {
        return await this.graphService.query(endpoint, method, data);
      } catch (error) {
        console.error('Graph query failed:', error);
        throw error;
      }
    });
    
    ipcMain.handle('graph:getUserPhoto', async (event, userId?: string) => {
      try {
        return await this.graphService.getUserPhoto(userId);
      } catch (error) {
        console.error('Get user photo failed:', error);
        return null;
      }
    });    // Photo cache management handlers
    ipcMain.handle('graph:clearPhotoCache', async () => {
      try {
        this.graphService.clearPhotoCache();
        return { success: true };
      } catch (error) {
        console.error('Clear photo cache failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('graph:clearUserPhotoCache', async (event, userId: string) => {
      try {
        this.graphService.clearUserPhotoCache(userId);
        return { success: true };
      } catch (error) {
        console.error('Clear user photo cache failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('graph:getPhotoCacheStats', async () => {
      try {
        return this.graphService.getPhotoCacheStats();
      } catch (error) {
        console.error('Get photo cache stats failed:', error);
        return null;
      }
    });    // LLM handlers
    ipcMain.handle('llm:chat', async (event, messages: any, sessionId?: string) => {
      try {
        // Ensure Lokka MCP server is running before chat
        // This handles the case where the user has authenticated but server isn't started
        await this.ensureLokkaMCPServerRunning();
        
        // Use provided session ID if available, otherwise generate a new one
        const effectiveSessionId = sessionId || `session-${event.sender.id}-${Date.now()}`;
        
        console.log(`🔄 Main Process: Received sessionId: ${sessionId}, Using: ${effectiveSessionId}, Messages: ${messages.length}`);
        
        // Now proceed with enhanced chat with conversation context
        return await this.llmService.enhancedChat(messages, effectiveSessionId);
      } catch (error) {
        console.error('LLM chat failed:', error);
        throw error;
      }
    });
    
    ipcMain.handle('llm:isAvailable', async () => {
      try {
        return await this.llmService.isAvailable();
      } catch (error) {
        console.error('LLM availability check failed:', error);
        return false;
      }
    });

    // Check specifically for local LLM availability (Ollama/LM Studio)
    ipcMain.handle('llm:isLocalAvailable', async () => {
      try {
        // Check if we have a local LLM service configured and available
        const config = this.configService.getLLMConfig();
        
        // Only check local providers
        if (config.provider === 'ollama' || config.provider === 'lmstudio') {
          const localLLM = new LLMService(config);
          return await localLLM.isAvailable();
        }
        
        // If current provider is cloud, check if we have local providers configured and available
        const defaultOllamaConfig = {
          provider: 'ollama' as const,
          baseUrl: 'http://localhost:11434',
          model: 'llama2',
          temperature: 0.7,
          maxTokens: 2048
        };
        
        const ollamaService = new LLMService(defaultOllamaConfig);
        const ollamaAvailable = await ollamaService.isAvailable();
        
        if (ollamaAvailable) return true;
        
        // Also check LM Studio
        const defaultLMStudioConfig = {
          provider: 'lmstudio' as const,
          baseUrl: 'http://localhost:1234',
          model: 'local-model',
          temperature: 0.7,
          maxTokens: 2048
        };
        
        const lmStudioService = new LLMService(defaultLMStudioConfig);
        return await lmStudioService.isAvailable();
      } catch (error) {
        console.error('Local LLM availability check failed:', error);
        return false;      }
    });

    // MCP handlers
    ipcMain.handle('mcp:call', async (event, server: string, toolName: string, arguments_: any) => {
      try {
        return await this.mcpClient.callTool(server, toolName, arguments_);
      } catch (error) {
        const mcpError = MCPErrorHandler.handleError(error, `mcp:call(${server}, ${toolName})`);
        console.error('MCP tool call failed:', mcpError);
        
        // Return the error in a consistent format that the renderer can handle
        return {
          error: {
            code: mcpError.code,
            message: mcpError.message
          }
        };
      }
    });

    ipcMain.handle('mcp:listServers', async () => {
      try {
        return this.mcpClient.getAvailableServers();
      } catch (error) {
        const mcpError = MCPErrorHandler.handleError(error, 'mcp:listServers');
        console.error('MCP list servers failed:', mcpError);
        return [];
      }
    });

    ipcMain.handle('mcp:listTools', async (event, server: string) => {
      try {
        return await this.mcpClient.listTools(server);
      } catch (error) {
        const mcpError = MCPErrorHandler.handleError(error, `mcp:listTools(${server})`);
        console.error(`MCP list tools for server ${server} failed:`, mcpError);
        return [];
      }
    });

    // MCP Debug handlers
    ipcMain.handle('mcp:debug', async () => {
      try {
        await debugMCP(this.config);
        return 'Debug information logged to console';
      } catch (error) {
        console.error('MCP debug failed:', error);
        return `Debug failed: ${error}`;
      }
    });    ipcMain.handle('mcp:checkHealth', async () => {
      try {
        return await checkMCPServerHealth();
      } catch (error) {
        console.error('MCP health check failed:', error);
        return {};
      }
    });    // Add new IPC handler for restarting Lokka MCP server
    ipcMain.handle('mcp:restartLokkaMCPServer', async () => {
      try {
        console.log('🔄 Restarting Lokka MCP server due to authentication mode change...');
        
        if (this.mcpServerManager) {
          // Stop the specific Lokka server
          const lokkaServer = this.mcpServerManager.getServer('external-lokka');
          if (lokkaServer && lokkaServer.stopServer) {
            await lokkaServer.stopServer();
            console.log('✅ Stopped Lokka MCP server');
          }
          
          // Update server configuration with new auth settings
          const entraConfig = this.configService.getEntraConfig();
          const lokkaServerIndex = this.config.mcpServers.findIndex(server => server.name === 'external-lokka');
          
          if (lokkaServerIndex !== -1) {
            this.config.mcpServers[lokkaServerIndex] = {
              ...this.config.mcpServers[lokkaServerIndex],
              env: {
                TENANT_ID: entraConfig?.tenantId || process.env.MSAL_TENANT_ID,
                CLIENT_ID: entraConfig?.clientId || process.env.MSAL_CLIENT_ID,
                ...(entraConfig?.clientSecret && { CLIENT_SECRET: entraConfig.clientSecret })
              }
            };
          }
          
          // Recreate MCP services with updated config
          const mcpAuthService = new MCPAuthService(this.authService);
          await this.mcpServerManager.stopAllServers();
          this.mcpServerManager = new MCPServerManager(this.config.mcpServers, mcpAuthService, this.configService);
          this.mcpClient = new MCPClient(this.config.mcpServers, mcpAuthService);
          
          console.log('✅ Restarted Lokka MCP server with new authentication mode');
          
          // Force UI refresh
          if (this.mainWindow) {
            this.mainWindow.webContents.send('llm:forceStatusRefresh', { source: 'auth-mode-change' });
          }
        }
      } catch (error) {
        console.error('Failed to restart Lokka MCP server:', error);
        throw error;
      }
    });

    // Configuration handlers
    ipcMain.handle('config:get', async () => {
      return this.config;
    });

    ipcMain.handle('config:update', async (event, newConfig: Partial<AppConfig>) => {
      try {
        this.config = { ...this.config, ...newConfig };
        // In a real implementation, save to file
        return this.config;
      } catch (error) {
        console.error('Config update failed:', error);
        throw error;
      }
    });    // LLM Configuration handlers
    ipcMain.handle('config:getLLMConfig', async () => {
      const config = this.configService.getLLMConfig();
      
      // If configuration contains cloud providers (indicating authentication is verified and config is available), notify renderer ONCE
      if (config && config.cloudProviders && Object.keys(config.cloudProviders).length > 0 && this.mainWindow && !this.configurationAvailabilityNotified) {
        console.log('📡 [Main] Sending auth:configurationAvailable event from config:getLLMConfig (cloud providers detected) - FIRST TIME ONLY');
        this.configurationAvailabilityNotified = true;
        this.mainWindow.webContents.send('auth:configurationAvailable', { source: 'config:getLLMConfig' });
      }
      
      return config;
    });    ipcMain.handle('config:saveLLMConfig', async (event, newLLMConfig) => {
      try {        
        // Save configuration securely
        this.configService.saveLLMConfig(newLLMConfig);
        
        // Update runtime config
        this.config.llm = newLLMConfig;
        
        // Update existing LLM service with new configuration
        if (this.llmService && this.llmService.updateConfig) {
          console.log('[Main] Updating LLM service configuration with new settings');
          this.llmService.updateConfig(newLLMConfig);
        }
        
        return this.configService.getLLMConfig();
      } catch (error) {
        console.error('LLM config update failed:', error);
        throw error;
      }
    });

    // Model cache management handlers
    ipcMain.handle('config:clearModelCache', async (event, provider?: string) => {
      try {
        this.configService.clearModelCache(provider);
        return { success: true };
      } catch (error) {
        console.error('Failed to clear model cache:', error);
        throw error;
      }
    });

    ipcMain.handle('config:getCachedModels', async (event, provider: string) => {
      try {
        return this.configService.getCachedModels(provider) || [];
      } catch (error) {
        console.error('Failed to get cached models:', error);
        return [];
      }
    });    // Cloud provider configuration handlers
    ipcMain.handle('config:saveCloudProviderConfig', async (event, provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai', config) => {
      try {
        this.configService.saveCloudProviderConfig(provider, config);
        return true;
      } catch (error) {
        console.error('Save cloud provider config failed:', error);
        throw error;
      }
    });

    ipcMain.handle('config:getCloudProviderConfig', async (event, provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
      try {
        return this.configService.getCloudProviderConfig(provider);
      } catch (error) {
        console.error('Get cloud provider config failed:', error);
        return null;
      }
    });    ipcMain.handle('config:getConfiguredCloudProviders', async () => {
      try {
        const providers = this.configService.getConfiguredCloudProviders();
        
        // If we have configured cloud providers, notify renderer that configuration is available ONCE
        if (providers && providers.length > 0 && this.mainWindow && !this.configurationAvailabilityNotified) {
          console.log('📡 [Main] Sending auth:configurationAvailable event from config:getConfiguredCloudProviders - FIRST TIME ONLY');
          this.configurationAvailabilityNotified = true;
          this.mainWindow.webContents.send('auth:configurationAvailable', { source: 'config:getConfiguredCloudProviders' });
        }
        
        return providers;
      } catch (error) {
        console.error('Get configured cloud providers failed:', error);
        return [];
      }
    });

    ipcMain.handle('config:setDefaultCloudProvider', async (event, provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
      try {
        this.configService.setDefaultCloudProvider(provider);
          // Reinitialize LLM service with the new default provider
        const defaultCloudProvider = this.configService.getDefaultCloudProvider();
        if (defaultCloudProvider) {
          // Get current LLM config to preserve all settings and cloud provider configurations
          const currentLLMConfig = this.configService.getLLMConfig();
          
          // Create the updated config by modifying the current config rather than creating a new object
          const llmConfig = {
            ...currentLLMConfig, // Start with all current settings
            // Update the main provider fields to match the new default
            provider: defaultCloudProvider.provider,
            model: defaultCloudProvider.config.model,
            // Only override root-level credentials if they're not already set
            apiKey: currentLLMConfig.apiKey || defaultCloudProvider.config.apiKey,
            baseUrl: currentLLMConfig.baseUrl || defaultCloudProvider.config.baseUrl,
            temperature: currentLLMConfig.temperature !== undefined ? currentLLMConfig.temperature : defaultCloudProvider.config.temperature,
            maxTokens: currentLLMConfig.maxTokens !== undefined ? currentLLMConfig.maxTokens : defaultCloudProvider.config.maxTokens,
            organization: currentLLMConfig.organization || defaultCloudProvider.config.organization
          };
          
          // DEBUG: Check config before LLM service creation
          const preInitConfig = this.configService.getLLMConfig();
          console.log('🔍 DEBUG: Config before LLM service creation - Azure OpenAI exists:', !!preInitConfig.cloudProviders?.['azure-openai']);
            console.log('🔄 Reinitializing LLM with new default cloud provider:', defaultCloudProvider.provider, 'Model:', defaultCloudProvider.config.model);
          
          // Dispose of the previous LLM service instance to prevent memory leaks
          if (this.llmService && typeof this.llmService.dispose === 'function') {
            this.llmService.dispose();
            console.log('🧹 Disposed previous LLM service instance before reinitializing');
          }
          
          this.llmService = new EnhancedLLMService(llmConfig, this.authService, this.mcpClient);
          
          // DEBUG: Check if config still exists immediately after LLM service creation
          const postInitConfig = this.configService.getLLMConfig();
          console.log('🔍 DEBUG: Config after LLM service creation - Has cloudProviders:', !!postInitConfig.cloudProviders);
          if (postInitConfig.cloudProviders) {
            console.log('🔍 DEBUG: Available providers after LLM init:', Object.keys(postInitConfig.cloudProviders));
            console.log('🔍 DEBUG: Azure OpenAI config exists after LLM init:', !!postInitConfig.cloudProviders['azure-openai']);
          }          // Update the runtime config as well
          this.config.llm = llmConfig;
          
          // DEBUG: Check config after runtime config update
          const postRuntimeConfig = this.configService.getLLMConfig();
          console.log('🔍 DEBUG: Config after runtime config update - Azure OpenAI exists:', !!postRuntimeConfig.cloudProviders?.['azure-openai']);
          
          // Notify renderer process that the default cloud provider has changed
          if (this.mainWindow) {
            this.mainWindow.webContents.send('config:defaultCloudProviderChanged', {
              provider: defaultCloudProvider.provider,
              model: defaultCloudProvider.config.model
            });
          }
        }
        
        return true;
      } catch (error) {
        console.error('Set default cloud provider failed:', error);
        throw error;
      }
    });    ipcMain.handle('config:getDefaultCloudProvider', async () => {
      try {
        const defaultProvider = this.configService.getDefaultCloudProvider();
        
        // If we have a default cloud provider, notify renderer that configuration is available ONCE
        if (defaultProvider && this.mainWindow && !this.configurationAvailabilityNotified) {
          console.log('📡 [Main] Sending auth:configurationAvailable event from config:getDefaultCloudProvider - FIRST TIME ONLY');
          this.configurationAvailabilityNotified = true;
          this.mainWindow.webContents.send('auth:configurationAvailable', { source: 'config:getDefaultCloudProvider' });
        }
        
        return defaultProvider;
      } catch (error) {
        console.error('Get default cloud provider failed:', error);
        return null;
      }
    });

    ipcMain.handle('config:removeCloudProviderConfig', async (event, provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
      try {
        this.configService.removeCloudProviderConfig(provider);
        return true;
      } catch (error) {
        console.error('Remove cloud provider config failed:', error);
        throw error;
      }
    });

    // Entra configuration handlers
    ipcMain.handle('config:getEntraConfig', async () => {
      try {
        return this.configService.getEntraConfig();
      } catch (error) {
        console.error('Get Entra config failed:', error);
        return null;
      }
    });

    ipcMain.handle('config:saveEntraConfig', async (event, entraConfig) => {
      try {
        this.configService.saveEntraConfig(entraConfig);
        
        // Reinitialize services with new Entra configuration
        console.log('[Main] Entra config saved, reinitializing services...');
        await this.reinitializeServices();
        
        return true;
      } catch (error) {
        console.error('Save Entra config failed:', error);
        throw error;
      }
    });

    ipcMain.handle('config:clearEntraConfig', async () => {
      try {
        this.configService.clearEntraConfig();
        
        // Reinitialize services after clearing Entra configuration
        console.log('[Main] Entra config cleared, reinitializing services...');
        await this.reinitializeServices();
        
        return true;
      } catch (error) {
        console.error('Clear Entra config failed:', error);
        throw error;
      }
    });

    // Auto-updater handlers
    ipcMain.handle('updater:checkForUpdates', async () => {
      try {
        await this.autoUpdaterService.checkForUpdates();
        return { success: true };
      } catch (error) {
        console.error('Check for updates failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('updater:downloadUpdate', async () => {
      try {
        this.autoUpdaterService.downloadUpdate();
        return { success: true };
      } catch (error) {
        console.error('Download update failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('updater:installUpdate', async () => {
      try {
        this.autoUpdaterService.installUpdate();
        return { success: true };
      } catch (error) {
        console.error('Install update failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('updater:getCurrentVersion', async () => {
      try {
        return this.autoUpdaterService.getCurrentVersion();
      } catch (error) {
        console.error('Get current version failed:', error);
        return '1.0.0-beta.1';
      }
    });

    ipcMain.handle('updater:isUpdatePending', async () => {
      try {
        return this.autoUpdaterService.isUpdatePending();
      } catch (error) {
        console.error('Check update pending failed:', error);
        return false;
      }
    });

    ipcMain.handle('updater:setAutoUpdateEnabled', async (event, enabled: boolean) => {
      try {
        this.autoUpdaterService.setAutoUpdateEnabled(enabled);
        return { success: true };
      } catch (error) {
        console.error('Set auto-update enabled failed:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('updater:getAutoUpdateEnabled', async () => {
      try {
        return this.autoUpdaterService.getAutoUpdateEnabled();
      } catch (error) {
        console.error('Get auto-update enabled failed:', error);
        return true; // Default to enabled
      }
    });

    // LLM testing handlers
    ipcMain.handle('llm:testConnection', async (event, testConfig) => {
      try {
        const { UnifiedLLMService } = require('../llm/UnifiedLLMService');
        const testService = new UnifiedLLMService(testConfig, this.mcpClient);
        return await testService.isAvailable();
      } catch (error) {
        console.error('LLM connection test failed:', error);
        return false;
      }
    });    ipcMain.handle('llm:getAvailableModels', async (event, config?: any) => {
      try {
        // If config is provided, use the appropriate service
        if (config) {
          if ((config.provider === 'ollama' || config.provider === 'lmstudio') && config.baseUrl) {
            // Handle local LLM providers
            console.log(`Fetching models for local provider ${config.provider} at ${config.baseUrl}...`);
            const { LLMService } = require('../llm/LLMService');
            const localService = new LLMService(config);
            return await localService.getAvailableModels();
          } else if ((config.provider === 'openai' || config.provider === 'anthropic' || config.provider === 'gemini' || config.provider === 'azure-openai') && config.apiKey) {
            // Handle cloud LLM providers - check cache first
            const cachedModels = this.configService.getCachedModels(config.provider);
            if (cachedModels && cachedModels.length > 0) {
              console.log(`Using cached models for ${config.provider}:`, cachedModels);
              return cachedModels;
            }

            console.log(`Fetching fresh models for ${config.provider}...`);
            const { CloudLLMService } = require('../llm/CloudLLMService');
            const cloudService = new CloudLLMService(config, this.mcpClient);
            const freshModels = await cloudService.getAvailableModels();
            
            // Cache the results
            if (freshModels && freshModels.length > 0) {
              this.configService.cacheModels(config.provider, freshModels);
              console.log(`Cached ${freshModels.length} models for ${config.provider}`);
            }
            
            return freshModels;
          }
        }
        
        // Otherwise use the default service
        return await this.llmService.getAvailableModels();
      } catch (error) {
        console.error('Get available models failed:', error);
        
        // Return cached models as fallback if available
        if (config?.provider) {
          const cachedModels = this.configService.getCachedModels(config.provider);
          if (cachedModels && cachedModels.length > 0) {
            console.log(`Returning cached models as fallback for ${config.provider}`);
            return cachedModels;
          }
        }
        
        return [];
      }
    });    // Enhanced LLM testing for specific providers
    ipcMain.handle('llm:testProviderConnection', async (event, provider: string, config: any) => {
      try {
        let testService;
        if (provider === 'openai' || provider === 'anthropic' || provider === 'gemini' || provider === 'azure-openai') {
          const { CloudLLMService } = require('../llm/CloudLLMService');
          testService = new CloudLLMService(config, this.mcpClient);
        } else {
          const { LLMService } = require('../llm/LLMService');
          testService = new LLMService(config);
        }
        return await testService.isAvailable();
      } catch (error) {
        console.error(`${provider} connection test failed:`, error);
        return false;
      }
    });

    ipcMain.handle('llm:getProviderModels', async (event, provider: string, config: any) => {
      try {
        let service;
        if (provider === 'openai' || provider === 'anthropic' || provider === 'gemini' || provider === 'azure-openai') {
          const { CloudLLMService } = require('../llm/CloudLLMService');
          service = new CloudLLMService(config, this.mcpClient);
        } else {
          const { LLMService } = require('../llm/LLMService');
          service = new LLMService(config);
        }
        return await service.getAvailableModels();
      } catch (error) {
        console.error(`Get ${provider} models failed:`, error);
        return [];
      }
    });

    // Shell handlers for external links
    ipcMain.handle('shell:openExternal', async (event, url) => {
      try {        // Only allow specific URLs to be opened for security
        const allowedDomains = [
          'https://github.com', 
          'https://learn.microsoft.com',
          'https://docs.microsoft.com',
          'https://portal.azure.com',
          'https://graph.microsoft.com',
          'https://developer.microsoft.com',
          'https://azure.microsoft.com',
          'https://microsoft.com',
          'https://www.microsoft.com',
          'https://techcommunity.microsoft.com',
          'https://aka.ms'
        ];
        
        if (allowedDomains.some(domain => url.startsWith(domain))) {
          await shell.openExternal(url);
          return true;
        } else {
          console.warn('Blocked attempt to open disallowed URL:', url);
          return false;
        }
      } catch (error) {
        console.error('Failed to open external URL:', error);
        return false;
      }
    });

    ipcMain.handle('auth:getTokenPermissions', async () => {
      try {
        const token = await this.authService.getToken();
        if (!token?.accessToken) {
          return { permissions: [], error: 'No access token available' };
        }

        // Decode the token to extract permissions
        const tokenParts = token.accessToken.split('.');
        if (tokenParts.length !== 3) {
          return { permissions: [], error: 'Invalid token format' };
        }

        try {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          // Extract permissions from token
          let permissions: string[] = [];
          
          // Check for delegated scopes (scp claim)
          if (payload.scp) {
            permissions = payload.scp.split(' ').filter((scope: string) => scope.trim().length > 0);
          }
          
          // Check for app-only permissions (roles claim)
          if (payload.roles && Array.isArray(payload.roles)) {
            permissions = [...permissions, ...payload.roles];
          }

          return { 
            permissions,
            tokenInfo: {
              clientId: payload.appid,
              tenantId: payload.tid,
              audience: payload.aud,
              expiresAt: new Date(payload.exp * 1000).toISOString()
            }
          };
        } catch (decodeError) {
          console.error('Failed to decode token:', decodeError);
          return { permissions: [], error: 'Failed to decode token' };
        }      } catch (error) {
        console.error('Get token permissions failed:', error);
        return { permissions: [], error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Get current Graph permissions from the actual token
    ipcMain.handle('auth:getCurrentGraphPermissions', async () => {
      try {
        const token = await this.authService.getToken();
        if (!token?.accessToken) {
          return { permissions: [], error: 'No access token available' };
        }

        // Decode the token to extract scopes/permissions
        const tokenParts = token.accessToken.split('.');
        if (tokenParts.length !== 3) {
          return { permissions: [], error: 'Invalid token format' };
        }

        try {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          // Extract permissions from token
          let permissions: string[] = [];
          
          // Check for delegated scopes (scp claim)
          if (payload.scp) {
            permissions = payload.scp.split(' ').filter((scope: string) => scope.trim().length > 0);
          }
          
          // Check for app-only permissions (roles claim)
          if (payload.roles && Array.isArray(payload.roles)) {
            permissions = [...permissions, ...payload.roles];
          }

          // Remove duplicates and sort
          permissions = [...new Set(permissions)].sort();

          console.log('📊 Current Graph permissions from token:', permissions);
          
          return { 
            permissions,
            clientId: payload.appid,
            source: 'access_token'
          };
        } catch (decodeError) {
          console.error('Failed to decode token:', decodeError);
          return { permissions: [], error: 'Failed to decode token' };
        }      } catch (error) {
        console.error('Get current Graph permissions failed:', error);
        return { permissions: [], error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Get tenant information including display name
    ipcMain.handle('auth:getTenantInfo', async () => {
      try {
        const token = await this.authService.getToken();
        if (!token?.accessToken) {
          return { error: 'No access token available' };
        }

        // Decode the token to extract tenant information
        const tokenParts = token.accessToken.split('.');
        if (tokenParts.length !== 3) {
          return { error: 'Invalid token format' };
        }

        try {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          
          console.log('🔍 Token payload tenant info:', {
            tid: payload.tid,
            iss: payload.iss,
            aud: payload.aud,
            hasDisplayName: !!payload.tenant_display_name
          });
          
          let tenantDisplayName = payload.tid; // Default to tenant ID as fallback
          
          // Primary: Try to get tenant display name from Graph API /organization endpoint
          try {
            // Use the Lokka MCP to get organization details
            // Important: Call without any filter - let it return the organization for the authenticated tenant
            if (this.mcpClient) {
              console.log('🔍 Calling /organization endpoint without filters for tenant:', payload.tid);
              
              const orgInfo = await this.mcpClient.callTool('external-lokka', 'Lokka-Microsoft', {
                apiType: 'graph',
                path: '/organization',
                method: 'get'
                // No queryParams at all - let it return the org for the authenticated tenant
              });
              
              console.log('🔍 Raw organization info response:', orgInfo);
              
              let parsedContent;
              
              // Handle different response formats from MCP
              if (orgInfo?.content) {
                if (Array.isArray(orgInfo.content) && orgInfo.content.length > 0) {
                  // Handle array format like [{type: 'text', text: 'Result for graph API...'}]
                  const firstContent = orgInfo.content[0];
                  if (firstContent?.type === 'text' && firstContent?.text) {
                    try {
                      // Extract JSON from text response like "Result for graph API (v1.0) - get /organization:\n\n{...}"
                      const textContent = firstContent.text;
                      const jsonStart = textContent.indexOf('{');
                      if (jsonStart !== -1) {
                        const jsonString = textContent.substring(jsonStart);
                        parsedContent = JSON.parse(jsonString);
                        console.log('✅ Successfully extracted JSON from text response');
                      } else {
                        console.warn('Could not find JSON start in text response');
                      }
                    } catch (parseError) {
                      console.warn('Could not parse JSON from text response:', parseError);
                    }
                  }
                } else if (typeof orgInfo.content === 'string') {
                  try {
                    parsedContent = JSON.parse(orgInfo.content);
                  } catch (parseError) {
                    console.warn('Could not parse organization info string:', parseError);
                  }
                } else if (typeof orgInfo.content === 'object') {
                  parsedContent = orgInfo.content;
                }
              } else if (orgInfo && typeof orgInfo === 'object') {
                // Sometimes the response might be the data directly
                parsedContent = orgInfo;
              }
              
              console.log('🔍 Parsed organization content:', parsedContent);
              
              if (parsedContent?.value && Array.isArray(parsedContent.value) && parsedContent.value.length > 0) {
                const org = parsedContent.value[0];
                console.log('🔍 Organization object:', org);
                if (org.displayName) {
                  tenantDisplayName = org.displayName;
                  console.log('✅ Retrieved tenant display name from Graph API:', tenantDisplayName);
                } else {
                  console.warn('⚠️ Organization object found but no displayName property:', org);
                }
              } else {
                console.warn('⚠️ Unexpected organization response structure:', parsedContent);
              }
            }
          } catch (graphError) {
            console.warn('Could not retrieve organization info from Graph API:', graphError);
          }
          
          // Secondary: Check for tenant_display_name claim in token (rare but valid)
          if (tenantDisplayName === payload.tid && payload.tenant_display_name) {
            tenantDisplayName = payload.tenant_display_name;
            console.log('✅ Using tenant_display_name from token:', tenantDisplayName);
          }
          
          // Note: We intentionally do NOT use tenant_region_scope as it's not a display name
          
          // Get stored Entra config to compare tenant IDs
          let storedEntraConfig: any = null;
          try {
            storedEntraConfig = await this.configService.getEntraConfig();
          } catch (error) {
            console.warn('Could not retrieve stored Entra config for comparison:', error);
          }
          
          console.log('🏢 Tenant info retrieved:', { 
            tenantId: payload.tid, 
            displayName: tenantDisplayName,
            source: tenantDisplayName === payload.tid ? 'fallback-tenantId' : 
                   payload.tenant_display_name === tenantDisplayName ? 'token-claim' : 'graph-api',
            issuedBy: payload.iss,
            audience: payload.aud,
            configTenantId: storedEntraConfig?.tenantId,
            authTokenTenantId: payload.tid,
            tenantMismatch: storedEntraConfig?.tenantId !== payload.tid
          });
          
          return { 
            tenantId: payload.tid, // Always use the authenticated token's tenant ID
            tenantDisplayName: tenantDisplayName,
            issuedBy: payload.iss,
            audience: payload.aud
          };
        } catch (decodeError) {
          console.error('Failed to decode token:', decodeError);
          return { error: 'Failed to decode token' };
        }      } catch (error) {
        console.error('Get tenant info failed:', error);
        return { error: error instanceof Error ? error.message : String(error) };
      }
    });
  }

  /**
   * Check if user is already authenticated from a previous session
   * and set up authentication context accordingly
   */  private async initializeAuthenticationState(): Promise<void> {
    try {
      console.log('🔍 Checking for existing authentication session...');
      
      // Check if user is already authenticated
      const authInfo = await this.authService.getAuthenticationInfoWithToken();
      
      if (authInfo.isAuthenticated) {
        console.log('✅ Found existing authentication session');
          // Set authentication verification flag
        this.configService.setAuthenticationVerified(true);
        
        // Set authentication context based on available credentials
        const storedEntraConfig = this.configService.getEntraConfig();
        const hasClientSecret = storedEntraConfig?.clientSecret;
        const authContext = hasClientSecret ? 'client-credentials' : 'interactive';
        this.configService.setAuthenticationContext(authContext);
          // Reload LLM service with full configuration
        const fullLLMConfig = this.configService.getLLMConfig();
        console.log('🔧 Initializing LLM service with full configuration from existing session');
          this.llmService = new EnhancedLLMService(fullLLMConfig, this.authService, this.mcpClient);
          // Check if we have stored Entra credentials and update MCP server config
        console.log('🔧 Checking for stored Entra credentials during initialization...');
          if (storedEntraConfig && storedEntraConfig.clientId && storedEntraConfig.tenantId) {
          console.log('🔐 Found stored Entra credentials, updating Lokka MCP server configuration...');          // Enable Lokka MCP server since user is authenticated
          const lokkaServerIndex = this.config.mcpServers.findIndex(server => server.name === 'external-lokka');
          if (lokkaServerIndex !== -1) {            // Determine client ID and authentication mode based on Enhanced Graph Access setting
            let clientId = storedEntraConfig.clientId || process.env.MSAL_CLIENT_ID || '';
            let authMode = 'application-credentials';
            let env: Record<string, string>;            // Check if Enhanced Graph Access is enabled and not in application credentials mode
            if (storedEntraConfig.useGraphPowerShell && 
                this.configService.getAuthenticationPreference() !== 'application-credentials') {
              console.log('🔧 Using Enhanced Graph Access mode with Microsoft Graph PowerShell client ID during startup');
              clientId = '14d82eec-204b-4c2f-b7e8-296a70dab67e'; // Microsoft Graph PowerShell client ID
              authMode = 'delegated';
              env = {
                TENANT_ID: 'common', // Use 'common' for multi-tenant Enhanced Graph Access
                CLIENT_ID: clientId
              };
            } else {
              env = {
                TENANT_ID: storedEntraConfig.tenantId || process.env.MSAL_TENANT_ID || '',
                CLIENT_ID: clientId,
                ...(storedEntraConfig.clientSecret && { CLIENT_SECRET: storedEntraConfig.clientSecret })
              };
            }
            
            // For Enhanced Graph Access, we need to get a token using the Graph PowerShell client ID
            if (storedEntraConfig.useGraphPowerShell && 
                this.configService.getAuthenticationPreference() !== 'application-credentials') {
              try {
                console.log('🔐 Getting access token for Enhanced Graph Access mode during startup...');
                // Create a temporary auth service with Microsoft Graph PowerShell client ID
                const graphPowerShellAuthConfig = {
                  ...this.config,
                  auth: {
                    clientId: '14d82eec-204b-4c2f-b7e8-296a70dab67e',
                    tenantId: 'common', // Use 'common' for multi-tenant access
                    scopes: [
                      'https://graph.microsoft.com/User.Read',
                      'https://graph.microsoft.com/Mail.Read',
                      'https://graph.microsoft.com/Mail.ReadWrite',
                      'https://graph.microsoft.com/Calendars.Read',
                      'https://graph.microsoft.com/Files.Read.All',
                      'https://graph.microsoft.com/Directory.Read.All'
                    ],
                    useClientCredentials: false
                  }
                };
                
                const tempAuthService = new AuthService(graphPowerShellAuthConfig);
                const token = await tempAuthService.getToken();
                
                if (token && token.accessToken) {
                  console.log('🔐 Successfully obtained Enhanced Graph Access token during startup');
                  env.ACCESS_TOKEN = token.accessToken;
                  env.USE_INTERACTIVE = 'false'; // Use provided token, don't authenticate interactively
                  // Don't set USE_CLIENT_TOKEN when providing ACCESS_TOKEN directly
                } else {
                  console.error('❌ Failed to get Enhanced Graph Access token during startup, falling back to client token mode');
                  env.USE_CLIENT_TOKEN = 'true';
                }
              } catch (error) {
                console.error('❌ Error getting Enhanced Graph Access token during startup:', error);
                console.log('🔧 Falling back to standard client token mode');
                env.USE_CLIENT_TOKEN = 'true';
              }
            } else if (storedEntraConfig.clientSecret) {
              console.log('🔧 Using application credentials mode with client secret during startup');
              // Already set in env above
            } else {
              console.log('🔧 Using delegated mode with standard client ID during startup');
              env.USE_CLIENT_TOKEN = 'true';
            }

            this.config.mcpServers[lokkaServerIndex] = {
              ...this.config.mcpServers[lokkaServerIndex],
              enabled: true, // Enable for any authenticated user
              env
            };

            console.log(`✅ Updated Lokka MCP server for authenticated user (mode: ${authMode}):`, {
              enabled: this.config.mcpServers[lokkaServerIndex].enabled,
              authMode: authContext,
              hasClientSecret: Boolean(storedEntraConfig.clientSecret),
              clientId: clientId.substring(0, 8) + '...',
              enhancedAccess: Boolean(storedEntraConfig.useGraphPowerShell)
            });
            
            // Reinitialize MCP services with updated config
            const mcpAuthService = new MCPAuthService(this.authService);
            
            // Stop existing MCP services gracefully
            if (this.mcpServerManager) {
              try {
                await this.mcpServerManager.stopAllServers();
              } catch (error) {
                console.warn('Error stopping MCP server manager:', error);
              }
            }
              // Create new MCP services with updated configuration
            this.mcpServerManager = new MCPServerManager(this.config.mcpServers, mcpAuthService, this.configService);
            this.mcpClient = new MCPClient(this.config.mcpServers, mcpAuthService);
            
            console.log('🚀 MCP services reinitialized with Entra credentials during startup');
          }
        } else {
          console.log('⚠️ No stored Entra credentials found for Lokka MCP server during startup');
          
          // Since user is authenticated but no stored Entra config, Lokka might still be enabled
          // via env vars, so let's check that case
          const lokkaConfig = this.config.mcpServers.find(server => server.name === 'external-lokka');
          if (lokkaConfig && lokkaConfig.enabled) {
            console.log('🔧 Lokka MCP server enabled via environment variables');
          } else {
            console.log('❌ Lokka MCP server not enabled - missing Entra credentials');
          }
        }
        
        // Ensure Lokka MCP server is running after all configuration updates
        console.log('🔧 Attempting to ensure Lokka MCP server is running...');
        const lokkaStarted = await this.ensureLokkaMCPServerRunning();
        
        if (lokkaStarted) {
          console.log('✅ Lokka MCP server is running and ready');
        } else {
          console.warn('⚠️ Lokka MCP server failed to start or is not available');
        }
        
        console.log('🎉 Authentication state initialized successfully');
      } else {
        console.log('❌ No existing authentication session found');
        
        // Make sure authentication verification is false
        this.configService.setAuthenticationVerified(false);
      }
    } catch (error) {
      console.warn('Failed to check authentication state:', error);
        // On error, ensure authentication verification is false
      this.configService.setAuthenticationVerified(false);
    }
  }
  /**
   * Get authentication configuration from stored settings, falling back to environment variables
   */
  private async getAuthConfiguration(): Promise<{clientId: string, tenantId: string, clientSecret?: string}> {
    // First try to get stored configuration
    const storedEntraConfig = this.configService.getEntraConfig();
    
    if (storedEntraConfig && storedEntraConfig.clientId && storedEntraConfig.tenantId) {
      console.log('[Main] Using stored Entra configuration');
      
      // Check if Enhanced Graph Access (Microsoft Graph PowerShell) is enabled
      if (storedEntraConfig.useGraphPowerShell && !storedEntraConfig.useApplicationCredentials) {
        console.log('[Main] Enhanced Graph Access enabled, using Microsoft Graph PowerShell client ID');
        return {
          clientId: '14d82eec-204b-4c2f-b7e8-296a70dab67e', // Microsoft Graph PowerShell client ID
          tenantId: storedEntraConfig.tenantId,
          clientSecret: undefined // No client secret for Graph PowerShell delegated access
        };
      }
      
      return {
        clientId: storedEntraConfig.clientId,
        tenantId: storedEntraConfig.tenantId,
        clientSecret: storedEntraConfig.clientSecret
      };
    }
      // Fall back to default Microsoft Graph PowerShell configuration for interactive auth
    console.log('[Main] Using default Microsoft Graph PowerShell configuration for interactive authentication');
    return {
      clientId: '14d82eec-204b-4c2f-b7e8-296a70dab67e', // Microsoft Graph PowerShell public client
      tenantId: 'common',
      clientSecret: undefined
    };
  }

  /**
   * Check if Lokka MCP server is running and start it if enabled but not running
   * This method can be called after authentication or when MCP services are needed
   */  private async ensureLokkaMCPServerRunning(): Promise<boolean> {
    try {
      console.log('[Main] Checking if Lokka MCP server is running...');
      
      // First check if Lokka is enabled in the configuration
      const lokkaConfig = this.config.mcpServers.find(server => server.name === 'external-lokka');
      
      console.log('[Main] Lokka MCP server configuration check:', {
        found: Boolean(lokkaConfig),
        enabled: lokkaConfig?.enabled,
        hasEnv: Boolean(lokkaConfig?.env),
        envKeys: lokkaConfig?.env ? Object.keys(lokkaConfig.env) : []
      });
        if (!lokkaConfig || !lokkaConfig.enabled) {
        console.log('[Main] Lokka MCP server not enabled in configuration');
        return false;
      }
      
      // Check if the server is in the available servers list
      const availableServers = this.mcpClient.getAvailableServers();
      const lokkaServerExists = availableServers.includes('external-lokka');
      
      console.log('[Main] MCP server availability check:', {
        availableServers,
        lokkaServerExists
      });
      
      if (lokkaServerExists) {
        console.log('[Main] Lokka MCP server found in available servers');
        
        // Try to validate if it's actually running by attempting to list tools
        try {
          // Just checking if the server is actually available
          await this.mcpClient.listTools('external-lokka');
          console.log('[Main] ✅ Lokka MCP server is running and responding');
          return true;
        } catch (error) {
          console.warn('[Main] Lokka MCP server exists but failed to respond:', error);
          // Will try to restart below
        }
      } else {
        console.log('[Main] Lokka MCP server not found in available servers');
      }
      
      // If we get here, server is either not running or not responding
      console.log('[Main] Attempting to start Lokka MCP server...');
      
      try {
        // Try to start the server explicitly through the client
        await this.mcpClient.startServer('external-lokka');
        console.log('[Main] ✅ Lokka MCP server started successfully');
        return true;
      } catch (clientError) {
        console.error('[Main] Failed to start Lokka MCP server through client:', clientError);
        
        // Try direct approach through server manager as fallback
        try {
          const lokkaServer = this.mcpServerManager.getServer('external-lokka');
          if (lokkaServer && lokkaServer.startServer) {
            await lokkaServer.startServer();
            console.log('[Main] ✅ Lokka MCP server started through server manager');
            return true;
          } else {
            console.warn('[Main] Could not find Lokka server instance in manager');
          }
        } catch (managerError) {
          console.error('[Main] Failed to start Lokka MCP server through manager:', managerError);
        }
      }
      
      return false;
    } catch (error) {
      console.error('[Main] Error in ensureLokkaMCPServerRunning:', error);
      return false;
    }
  }
}

// Create and start the application
new EntraPulseLiteApp();
