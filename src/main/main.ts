// Main Electron process for EntraPulseLite
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { AuthService } from '../auth/AuthService';
import { GraphService } from '../shared/GraphService';
import { LLMService } from '../llm/LLMService';
import { MCPClient } from '../mcp/clients/MCPClient';
import { AppConfig } from '../types';

// Load environment variables
require('dotenv').config();

class EntraPulseLiteApp {
  private mainWindow: BrowserWindow | null = null;
  private authService!: AuthService;
  private graphService!: GraphService;
  private llmService!: LLMService;
  private mcpClient!: MCPClient;
  private config!: AppConfig;

  constructor() {
    this.initializeServices();
    this.setupEventHandlers();
  }
  private initializeServices(): void {
    // Initialize configuration
    this.config = {
      auth: {
        clientId: process.env.MSAL_CLIENT_ID && process.env.MSAL_CLIENT_ID.trim() !== '' 
          ? process.env.MSAL_CLIENT_ID 
          : '14d82eec-204b-4c2f-b7e8-296a70dab67e', // Microsoft Graph PowerShell fallback
        tenantId: process.env.MSAL_TENANT_ID && process.env.MSAL_TENANT_ID.trim() !== '' 
          ? process.env.MSAL_TENANT_ID 
          : 'common',
        scopes: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All', 'Group.Read.All'],
      },
      llm: {
        provider: (process.env.LLM_PROVIDER as 'ollama' | 'lmstudio') || 'ollama',
        baseUrl: process.env.LLM_PROVIDER === 'lmstudio' 
          ? process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234'
          : process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: 'llama2', // Default model
      },
      mcpServers: [
        {
          name: 'lokka',
          type: 'lokka',
          port: parseInt(process.env.MCP_LOKKA_PORT || '3001'),
          enabled: true,
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
    };

    // Initialize services
    this.authService = new AuthService();
    this.graphService = new GraphService(this.authService);
    this.llmService = new LLMService(this.config.llm);
    this.mcpClient = new MCPClient(this.config.mcpServers);
  }

  private setupEventHandlers(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIpcHandlers();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) this.createWindow();
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit();
    });
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      icon: path.join(__dirname, '../../assets/icon.png'), // We'll create this later
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
            label: 'About EntraPulseLite',
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
    // Authentication handlers
    ipcMain.handle('auth:login', async () => {
      try {
        return await this.authService.login();
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

    // LLM handlers
    ipcMain.handle('llm:chat', async (event, messages) => {
      try {
        return await this.llmService.chat(messages);
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

    // MCP handlers
    ipcMain.handle('mcp:call', async (event, server: string, method: string, params: any) => {
      try {
        return await this.mcpClient.call(server, method, params);
      } catch (error) {
        console.error('MCP call failed:', error);
        throw error;
      }
    });

    ipcMain.handle('mcp:listServers', async () => {
      try {
        return this.mcpClient.getAvailableServers();
      } catch (error) {
        console.error('MCP list servers failed:', error);
        return [];
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
  }
}

// Create and start the application
new EntraPulseLiteApp();
