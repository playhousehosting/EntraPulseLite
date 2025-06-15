// Preload script for EntraPulse Lite - Electron security bridge
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Asset handling
  getAssetPath: (assetName) => {
    return ipcRenderer.invoke('app:getAssetPath', assetName);
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication methods
  auth: {
    login: (useRedirectFlow = false) => ipcRenderer.invoke('auth:login', useRedirectFlow),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    getIdTokenClaims: () => ipcRenderer.invoke('auth:getIdTokenClaims'),
    requestPermissions: (permissions) => ipcRenderer.invoke('auth:requestPermissions', permissions),
    getTokenWithPermissions: (permissions) => ipcRenderer.invoke('auth:getTokenWithPermissions', permissions),
    getAuthenticationInfo: () => ipcRenderer.invoke('auth:getAuthenticationInfo'),
    clearTokenCache: () => ipcRenderer.invoke('auth:clearTokenCache'),
    forceReauthentication: () => ipcRenderer.invoke('auth:forceReauthentication'),
  },

  // Microsoft Graph methods
  graph: {
    query: (endpoint, method, data) => ipcRenderer.invoke('graph:query', endpoint, method, data),
    getUserPhoto: (userId) => ipcRenderer.invoke('graph:getUserPhoto', userId),
  },

  // Local LLM methods
  llm: {
    chat: (messages) => ipcRenderer.invoke('llm:chat', messages),
    isAvailable: () => ipcRenderer.invoke('llm:isAvailable'),
    testConnection: (config) => ipcRenderer.invoke('llm:testConnection', config),
    getAvailableModels: (config) => ipcRenderer.invoke('llm:getAvailableModels', config),
    testProviderConnection: (provider, config) => ipcRenderer.invoke('llm:testProviderConnection', provider, config),
    getProviderModels: (provider, config) => ipcRenderer.invoke('llm:getProviderModels', provider, config),
  },

  // MCP methods
  mcp: {
    call: (server, toolName, arguments_) => ipcRenderer.invoke('mcp:call', server, toolName, arguments_),
    listServers: () => ipcRenderer.invoke('mcp:listServers'),
    listTools: (server) => ipcRenderer.invoke('mcp:listTools', server),
  },

  // Configuration methods
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (config) => ipcRenderer.invoke('config:update', config),
    getLLMConfig: () => ipcRenderer.invoke('config:getLLMConfig'),
    saveLLMConfig: (config) => ipcRenderer.invoke('config:saveLLMConfig', config),
    clearModelCache: (provider) => ipcRenderer.invoke('config:clearModelCache', provider),
    getCachedModels: (provider) => ipcRenderer.invoke('config:getCachedModels', provider),
  },

  // Event listeners for real-time updates
  on: (channel, callback) => {
    const validChannels = ['auth-status-changed', 'chat-message', 'graph-api-call'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  // Remove event listeners
  removeAllListeners: (channel) => {
    const validChannels = ['auth-status-changed', 'chat-message', 'graph-api-call'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
