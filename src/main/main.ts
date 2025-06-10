// Main Electron process for EntraPulse Lite
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { AuthService } from '../auth/AuthService';
import { GraphService } from '../shared/GraphService';
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

class EntraPulseLiteApp {  private mainWindow: BrowserWindow | null = null;
  private authService!: AuthService;
  private graphService!: GraphService;
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
  }private initializeServices(): void {    // Initialize configuration
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
          : 'common',
        scopes: hasLokkaCreds 
          ? ['https://graph.microsoft.com/.default'] // Client credentials flow requires .default scope
          : ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All', 'Group.Read.All'], // Interactive flow can use specific scopes
        clientSecret: process.env.MSAL_CLIENT_SECRET || process.env.LOKKA_CLIENT_SECRET, // Only needed for confidential client applications
        useClientCredentials: Boolean(hasLokkaCreds), // Use client credentials flow if Lokka creds are configured
      },      llm: {
        provider: (process.env.LLM_PROVIDER as 'ollama' | 'lmstudio' | 'openai' | 'anthropic') || 'openai',
        baseUrl: process.env.LLM_PROVIDER === 'lmstudio' 
          ? process.env.LLM_BASE_URL || 'http://localhost:1234'
          : process.env.LLM_PROVIDER === 'ollama'
          ? process.env.LLM_BASE_URL || 'http://localhost:11434'
          : undefined,
        model: process.env.LLM_MODEL || this.getDefaultModelForProvider(process.env.LLM_PROVIDER as 'ollama' | 'lmstudio' | 'openai' | 'anthropic' || 'openai'),
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '2048'),
        apiKey: process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
        organization: process.env.OPENAI_ORGANIZATION,
        preferLocal: process.env.LLM_PREFER_LOCAL === 'true',      },
      mcpServers: [
        {
          name: 'lokka',
          type: 'lokka',
          port: parseInt(process.env.MCP_LOKKA_PORT || '3001'),
          enabled: process.env.USE_EXTERNAL_LOKKA !== 'true' && !hasLokkaCreds, // Disable if using external Lokka
        },        {
          name: 'external-lokka',
          type: 'external-lokka',
          port: parseInt(process.env.EXTERNAL_MCP_LOKKA_PORT || '3003'),
          enabled: (process.env.USE_EXTERNAL_LOKKA === 'true' || Boolean(hasLokkaCreds)), // Enable if explicitly set or if creds exist
          command: 'npx',
          args: ['-y', '@merill/lokka'],
          options: {
            env: {
              TENANT_ID: process.env.LOKKA_TENANT_ID || process.env.MSAL_TENANT_ID,
              CLIENT_ID: process.env.LOKKA_CLIENT_ID || process.env.MSAL_CLIENT_ID,
              CLIENT_SECRET: process.env.LOKKA_CLIENT_SECRET
            }
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
      },
    };// Update MCP server configs with auth configuration
    this.config.mcpServers.forEach(server => {
      if (server.type === 'lokka') {
        // Add authentication config for Graph API
        server.authConfig = {
          type: 'msal',
          scopes: this.config.auth.scopes,
          clientId: this.config.auth.clientId,
          tenantId: this.config.auth.tenantId
        };
      }
    });    // Initialize services
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

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
      });
    });    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
    
    app.on('will-quit', async (event) => {
      // Stop all MCP servers gracefully before quitting
      event.preventDefault();
      try {
        await this.mcpClient.stopAllServers();
        app.quit();
      } catch (error) {
        console.error('Error stopping MCP servers:', error);
        app.quit();
      }
    });
    
    app.on('will-quit', async (event) => {
      // Stop all MCP servers gracefully before quitting
      event.preventDefault();
      try {
        await this.mcpClient.stopAllServers();
        app.quit();
      } catch (error) {
        console.error('Error stopping MCP servers:', error);
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
      },
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
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
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
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
    });

    ipcMain.handle('auth:getCurrentUser', async () => {
      try {
        return await this.authService.getCurrentUser();
      } catch (error) {
        console.error('Get current user failed:', error);
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
    });    // Microsoft Graph handlers
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
    });

    // LLM Configuration handlers
    ipcMain.handle('config:getLLMConfig', async () => {
      return this.config.llm;
    });

    ipcMain.handle('config:saveLLMConfig', async (event, newLLMConfig) => {      try {
        this.config.llm = newLLMConfig;
        // Reinitialize LLM service with new config
        this.llmService = new EnhancedLLMService(this.config.llm, this.authService, this.mcpClient);
        // In a real implementation, save to file
        return this.config.llm;
      } catch (error) {
        console.error('LLM config update failed:', error);
        throw error;
      }
    });    // LLM testing handlers
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
        if (config && (config.provider === 'openai' || config.provider === 'anthropic') && config.apiKey) {
          const { CloudLLMService } = require('../llm/CloudLLMService');
          const cloudService = new CloudLLMService(config, this.mcpClient);
          return await cloudService.getAvailableModels();
        }
        
        // Otherwise use the default service
        return await this.llmService.getAvailableModels();
      } catch (error) {
        console.error('Get available models failed:', error);
        return [];
      }
    });

    // Enhanced LLM testing for specific providers
    ipcMain.handle('llm:testProviderConnection', async (event, provider: string, config: any) => {
      try {
        let testService;
        if (provider === 'openai' || provider === 'anthropic') {
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
        if (provider === 'openai' || provider === 'anthropic') {
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
