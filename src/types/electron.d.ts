// TypeScript definitions for electronAPI exposed via preload script

interface AuthAPI {
  login(useRedirectFlow?: boolean): Promise<any>;
  logout(): Promise<void>;
  getToken(): Promise<any>;
  getCurrentUser(): Promise<any>;
  getIdTokenClaims(): Promise<any | null>;
  requestPermissions(permissions: string[]): Promise<any>;
  getTokenWithPermissions(permissions: string[]): Promise<any>;
  getAuthenticationInfo(): Promise<any>;
  clearTokenCache(): Promise<void>;
  forceReauthentication(): Promise<any>;
}

interface GraphAPI {
  query(endpoint: string, method: string, data?: any): Promise<any>;
  getUserPhoto(userId?: string): Promise<string | null>;
}

interface LLMAPI {
  chat(messages: any[]): Promise<any>;
  isAvailable(): Promise<boolean>;
  testConnection(config: any): Promise<boolean>;
  getAvailableModels(config: any): Promise<string[]>;
  testProviderConnection(provider: string, config: any): Promise<boolean>;
  getProviderModels(provider: string, config: any): Promise<string[]>;
}

interface MCPAPI {
  call(server: string, toolName: string, arguments_: any): Promise<any>;
  listServers(): Promise<string[]>;
  listTools(server: string): Promise<any[]>;
}

interface ConfigAPI {
  get(): Promise<any>;
  update(config: any): Promise<void>;
  getLLMConfig(): Promise<any>;
  saveLLMConfig(config: any): Promise<void>;
  clearModelCache(provider?: string): Promise<void>;
  getCachedModels(provider: string): Promise<string[]>;
}

interface ElectronAPI {
  auth: AuthAPI;
  graph: GraphAPI;
  llm: LLMAPI;
  mcp: MCPAPI;
  config: ConfigAPI;
  on(channel: string, callback: (...args: any[]) => void): void;
  removeAllListeners(channel: string): void;
}

interface ElectronWindow {
  getAssetPath(assetName: string): Promise<string>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: ElectronWindow;
  }
}

export {};
