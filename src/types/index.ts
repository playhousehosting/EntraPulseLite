// Global type definitions for EntraPulse Lite

export type LogLevel = 'Error' | 'Warning' | 'Info' | 'Verbose';

export interface User {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  photoUrl?: string;
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

export interface MCPAuthConfig {
  type: 'msal' | 'apiKey' | 'basic' | 'none';
  scopes?: string[];
  clientId?: string;
  tenantId?: string;
}

export interface MCPServerConfig {
  name: string;
  type: 'lokka' | 'fetch' | 'external-lokka';
  port: number;
  enabled: boolean;
  url?: string;
  apiKey?: string;
  options?: Record<string, any>;
  authConfig?: MCPAuthConfig;
}

export interface AppConfig {
  auth: {
    clientId: string;
    tenantId: string;
    scopes: string[];
    clientSecret?: string;
    useClientCredentials?: boolean;
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
  };  graph: {
    query: (endpoint: string, method?: string, data?: any) => Promise<any>;
    getUserPhoto: (userId?: string) => Promise<string | null>;
  };
  llm: {
    chat: (messages: ChatMessage[]) => Promise<string>;
    isAvailable: () => Promise<boolean>;
  };  mcp: {
    call: (server: string, toolName: string, arguments_: any) => Promise<any>;
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
