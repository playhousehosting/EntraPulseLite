// Global type definitions for EntraPulse Lite

export type LogLevel = 'Error' | 'Warning' | 'Info' | 'Verbose';

export interface User {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

export interface AuthToken {
  accessToken: string;
  idToken: string;
  expiresOn: Date;
  scopes: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    graphApiCalls?: GraphApiCall[];
    llmProvider?: string;
    model?: string;
  };
}

export interface GraphApiCall {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  timestamp: Date;
  duration: number;
  status: number;
  response?: any;
  error?: string;
}

export interface LLMConfig {
  provider: 'ollama' | 'lmstudio';
  baseUrl: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MCPServerConfig {
  name: string;
  type: 'lokka' | 'fetch';
  port: number;
  enabled: boolean;
}

export interface AppConfig {
  auth: {
    clientId: string;
    tenantId: string;
    scopes: string[];
  };
  llm: LLMConfig;
  mcpServers: MCPServerConfig[];
  features: {
    enablePremiumFeatures: boolean;
    enableTelemetry: boolean;
  };
}

export interface ElectronAPI {
  auth: {
    login: (useRedirectFlow?: boolean) => Promise<AuthToken>;
    logout: () => Promise<void>;
    getToken: () => Promise<AuthToken | null>;
    getCurrentUser: () => Promise<User | null>;
    requestPermissions: (permissions: string[]) => Promise<AuthToken | null>;
    getTokenWithPermissions: (permissions: string[]) => Promise<AuthToken | null>;
  };
  graph: {
    query: (endpoint: string, method?: string, data?: any) => Promise<any>;
  };
  llm: {
    chat: (messages: ChatMessage[]) => Promise<string>;
    isAvailable: () => Promise<boolean>;
  };
  mcp: {
    call: (server: string, method: string, params: any) => Promise<any>;
    listServers: () => Promise<MCPServerConfig[]>;
  };
  config: {
    get: () => Promise<AppConfig>;
    update: (config: Partial<AppConfig>) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
