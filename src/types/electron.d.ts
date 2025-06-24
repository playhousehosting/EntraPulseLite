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
  testConfiguration(config: any): Promise<{ success: boolean; error?: string; details?: any }>;
}

interface GraphAPI {
  query(endpoint: string, method: string, data?: any): Promise<any>;
  getUserPhoto(userId?: string): Promise<string | null>;
  clearPhotoCache(): Promise<{ success: boolean; error?: string }>;
  clearUserPhotoCache(userId: string): Promise<{ success: boolean; error?: string }>;
  getPhotoCacheStats(): Promise<{ size: number; maxSize: number; entries: Array<{ userId: string; hasPhoto: boolean; age: number }> } | null>;
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
  saveCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini', config: any): Promise<void>;
  getCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini'): Promise<any>;
  getConfiguredCloudProviders(): Promise<Array<{ provider: 'openai' | 'anthropic' | 'gemini'; config: any }>>;
  setDefaultCloudProvider(provider: 'openai' | 'anthropic' | 'gemini'): Promise<void>;
  getDefaultCloudProvider(): Promise<{ provider: 'openai' | 'anthropic' | 'gemini'; config: any } | null>;
  removeCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini'): Promise<void>;
  getEntraConfig(): Promise<any>;
  saveEntraConfig(config: any): Promise<void>;
  clearEntraConfig(): Promise<void>;
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
  openExternal(url: string): Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: ElectronWindow;
  }
}

export {};
