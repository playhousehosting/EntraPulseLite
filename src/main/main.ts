// Main Electron process for EntraPulse Lite
import { app, BrowserWindow, ipcMain, Menu, globalShortcut } from 'electron';
import * as path from 'path';
import { AuthService } from '../auth/AuthService';
import { GraphService } from '../shared/GraphService';
import { ConfigService } from '../shared/ConfigService';
import { EnhancedLLMService } from '../llm/EnhancedLLMService';
import { MCPClient } from '../mcp/clients/MCPSDKClient';
import { MCPAuthService } from '../mcp/auth/MCPAuthService';
import { MCPServerManager } from '../mcp/servers/MCPServerManager';
import { GraphMCPClient } from '../mcp/clients/GraphMCPClient';
import { MCPErrorHandler, ErrorCode } from '../mcp/utils';
import { debugMCP, checkMCPServerHealth } from '../mcp/mcp-debug';
import { AppConfig } from '../types';

// Set app ID for Windows taskbar integration
if (process.platform === 'win32') {
  app.setAppUserModelId('com.increment.entrapulselite');
}

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

class EntraPulseLiteApp {
  private mainWindow: BrowserWindow | null = null;
  private authService!: AuthService;
  private graphService!: GraphService;
  private configService!: ConfigService;
  private llmService!: EnhancedLLMService;
  private mcpClient!: MCPClient;
  private mcpServerManager!: MCPServerManager;
  private config!: AppConfig;
  constructor() {
    this.initializeServices();
    this.setupEventHandlers();
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
      default:
        return 'gpt-4o-mini';
    }
  }  private initializeServices(): void {    // Initialize configuration service first
    this.configService = new ConfigService();
    
    // Set initial authentication context (client-credentials mode)
    this.configService.setAuthenticationContext('client-credentials');
    
    // Initialize configuration using stored config
    const storedLLMConfig = this.configService.getLLMConfig();
    // Check if we have Lokka credentials configured for non-interactive authentication
    const hasLokkaCreds = process.env.LOKKA_CLIENT_ID && process.env.LOKKA_TENANT_ID && process.env.LOKKA_CLIENT_SECRET;
    const useExternalLokka = process.env.USE_EXTERNAL_LOKKA === 'true' || hasLokkaCreds;
    
    this.config = {
      auth: {
        clientId: process.env.MSAL_CLIENT_ID && process.env.MSAL_CLIENT_ID.trim() !== '' 
          ? process.env.MSAL_CLIENT_ID 
          : '14d82eec-204b-4c2f-b7e8-296a70dab67e', // Microsoft Graph PowerShell fallback
        tenantId: process.env.MSAL_TENANT_ID && process.env.MSAL_TENANT_ID.trim() !== '' 
          ? process.env.MSAL_TENANT_ID 
          : 'common',        scopes: hasLokkaCreds 
          ? ['https://graph.microsoft.com/.default'] // Client credentials flow requires .default scope
          : ['https://graph.microsoft.com/.default'], // Interactive flow using .default to inherit all app registration permissions
        clientSecret: process.env.MSAL_CLIENT_SECRET || process.env.LOKKA_CLIENT_SECRET, // Only needed for confidential client applications        useClientCredentials: Boolean(hasLokkaCreds), // Use client credentials flow if Lokka creds are configured
      },      llm: storedLLMConfig, // Use stored LLM configuration
      mcpServers: [
        {
          name: 'external-lokka',
          type: 'external-lokka',
          port: parseInt(process.env.EXTERNAL_MCP_LOKKA_PORT || '3003'),
          enabled: (process.env.USE_EXTERNAL_LOKKA === 'true' || Boolean(hasLokkaCreds)), // Enable if explicitly set or if creds exist
          command: 'npx',
          args: ['-y', '@merill/lokka'],
          env: {
            TENANT_ID: process.env.LOKKA_TENANT_ID || process.env.MSAL_TENANT_ID,
            CLIENT_ID: process.env.LOKKA_CLIENT_ID || process.env.MSAL_CLIENT_ID,
            CLIENT_SECRET: process.env.LOKKA_CLIENT_SECRET
          }
        },
        {
          name: 'fetch',
          type: 'fetch',
          port: parseInt(process.env.MCP_DOCS_PORT || '3002'),
          enabled: true,
        },
      ],
      features: {
        enablePremiumFeatures: process.env.ENABLE_PREMIUM_FEATURES === 'true',
        enableTelemetry: process.env.ENABLE_TELEMETRY === 'true',
      },    };

    // Initialize services
    this.authService = new AuthService(this.config);
    this.graphService = new GraphService(this.authService);

    // Initialize MCP services first
    const mcpAuthService = new MCPAuthService(this.authService);
    
    // Create MCPServerManager with auth service
    console.log('Initializing MCP client with server configs:', this.config.mcpServers);
    this.mcpServerManager = new MCPServerManager(this.config.mcpServers, mcpAuthService);
    
    // Initialize MCP client with auth service
    this.mcpClient = new MCPClient(this.config.mcpServers, mcpAuthService);
    
    // Initialize LLM service with MCP client
    this.llmService = new EnhancedLLMService(this.config.llm, this.authService, this.mcpClient);
    
    // Log successful initialization
    console.log('Services initialized successfully');
  }
  private setupEventHandlers(): void {
    // Set application ID for Windows taskbar
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.increment.entrapulselite');
    }
      app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIpcHandlers();
      this.setupGlobalShortcuts();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
      });
    });    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
    
    app.on('will-quit', async (event) => {
      // Prevent default quit to clean up properly
      event.preventDefault();
      
      try {
        // Unregister all global shortcuts
        globalShortcut.unregisterAll();
        console.log('Global shortcuts unregistered');
        
        // Stop all MCP servers gracefully before quitting
        await this.mcpClient.stopAllServers();
        console.log('MCP servers stopped');
        
        // Now quit for real
        app.quit();
      } catch (error) {
        console.error('Error during cleanup:', error);
        app.quit();
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
    ipcMain.handle('auth:login', async (_, useRedirectFlow = false) => {
      try {
        return await this.authService.login(useRedirectFlow);
      } catch (error) {
        console.error('Login failed:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:logout', async () => {
      try {
        await this.authService.logout();
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
    });    ipcMain.handle('auth:getCurrentUser', async () => {
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
    });    ipcMain.handle('auth:getAuthenticationInfo', async () => {
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
    });    // LLM handlers
    ipcMain.handle('llm:chat', async (event, messages) => {
      try {
        return await this.llmService.enhancedChat(messages);
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
    });// MCP handlers
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
    });

    ipcMain.handle('mcp:checkHealth', async () => {
      try {
        return await checkMCPServerHealth();
      } catch (error) {
        console.error('MCP health check failed:', error);
        return {};
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
      return this.configService.getLLMConfig();
    });

    ipcMain.handle('config:saveLLMConfig', async (event, newLLMConfig) => {
      try {
        // Save configuration securely
        this.configService.saveLLMConfig(newLLMConfig);
        
        // Update runtime config
        this.config.llm = newLLMConfig;
        
        // Reinitialize LLM service with new config
        this.llmService = new EnhancedLLMService(this.config.llm, this.authService, this.mcpClient);
        
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
    });    ipcMain.handle('config:getCachedModels', async (event, provider: string) => {
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
    });

    ipcMain.handle('config:getConfiguredCloudProviders', async () => {
      try {
        return this.configService.getConfiguredCloudProviders();
      } catch (error) {
        console.error('Get configured cloud providers failed:', error);
        return [];
      }
    });

    ipcMain.handle('config:setDefaultCloudProvider', async (event, provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
      try {
        this.configService.setDefaultCloudProvider(provider);
        return true;
      } catch (error) {
        console.error('Set default cloud provider failed:', error);
        throw error;
      }
    });

    ipcMain.handle('config:getDefaultCloudProvider', async () => {
      try {
        return this.configService.getDefaultCloudProvider();
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
        if (config && (config.provider === 'openai' || config.provider === 'anthropic' || config.provider === 'gemini' || config.provider === 'azure-openai') && config.apiKey) {
          // Check cache first
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
  }
}

// Create and start the application
new EntraPulseLiteApp();
