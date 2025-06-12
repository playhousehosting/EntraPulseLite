/**
 * Type definitions for static assets
 */

// Image file declarations
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

// Global electron window interface
interface Window {
  electron: {
    getAssetPath: (assetName: string) => string;
  };
  electronAPI: {
    auth: {
      login: (useRedirectFlow?: boolean) => Promise<any>;
      logout: () => Promise<void>;
      getToken: () => Promise<any>;
      getCurrentUser: () => Promise<any>;
      requestPermissions: (permissions: string[]) => Promise<any>;
      getTokenWithPermissions: (permissions: string[]) => Promise<any>;      getAuthenticationInfo: () => Promise<{
        mode: 'client-credentials' | 'interactive';
        permissions: string[];
        actualPermissions?: string[];
        isAuthenticated: boolean;
        clientId: string;
        tenantId: string;
      }>;
    };
    graph: {
      query: (endpoint: string, method?: string, data?: any) => Promise<any>;
      getUserPhoto: (userId?: string) => Promise<any>;
    };
    llm: {
      chat: (messages: any[]) => Promise<any>;
      isAvailable: () => Promise<boolean>;
      testConnection: (config: any) => Promise<any>;
      getAvailableModels: (config: any) => Promise<string[]>;
      testProviderConnection: (provider: string, config: any) => Promise<any>;
      getProviderModels: (provider: string, config: any) => Promise<string[]>;
    };
    mcp: {
      call: (server: string, toolName: string, arguments_: any) => Promise<any>;
      listServers: () => Promise<string[]>;
      listTools: (server: string) => Promise<any[]>;
    };
    config: {
      get: () => Promise<any>;
      update: (config: any) => Promise<any>;
      getLLMConfig: () => Promise<any>;
      saveLLMConfig: (config: any) => Promise<any>;
    };
    debug: {
      checkMCPServerHealth: () => Promise<any>;
      debugMCP: () => Promise<any>;
    };
  };
}
