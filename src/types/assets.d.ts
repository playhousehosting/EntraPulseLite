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
      getTokenWithPermissions: (permissions: string[]) => Promise<any>;
    };
    graph: {
      query: (endpoint: string, method: string, data?: any) => Promise<any>;
    };
    llm: {
      chat: (messages: any[]) => Promise<string>;
      isAvailable: () => Promise<boolean>;
    };
    mcp: {
      call: (server: string, method: string, params: any) => Promise<any>;
      listServers: () => Promise<any[]>;
    };
  };
}
