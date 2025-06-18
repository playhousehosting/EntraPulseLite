// Preload script for EntraPulse Lite - Electron security bridge
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Asset handling
  getAssetPath: (assetName) => {
    return ipcRenderer.invoke('app:getAssetPath', assetName);
  },
  // Open external links
  openExternal: (url) => {
    return ipcRenderer.invoke('shell:openExternal', url);
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
    testConfiguration: (config) => ipcRenderer.invoke('auth:testConfiguration', config),
  },

  // Microsoft Graph methods
  graph: {
    query: (endpoint, method, data) => ipcRenderer.invoke('graph:query', endpoint, method, data),
    getUserPhoto: (userId) => ipcRenderer.invoke('graph:getUserPhoto', userId),
    clearPhotoCache: () => ipcRenderer.invoke('graph:clearPhotoCache'),
    clearUserPhotoCache: (userId) => ipcRenderer.invoke('graph:clearUserPhotoCache', userId),
    getPhotoCacheStats: () => ipcRenderer.invoke('graph:getPhotoCacheStats'),
  },

  // Local LLM methods
  llm: {
    chat: (messages) => ipcRenderer.invoke('llm:chat', messages),
    isAvailable: () => ipcRenderer.invoke('llm:isAvailable'),
    isLocalAvailable: () => ipcRenderer.invoke('llm:isLocalAvailable'),
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
    saveCloudProviderConfig: (provider, config) => ipcRenderer.invoke('config:saveCloudProviderConfig', provider, config),
    getCloudProviderConfig: (provider) => ipcRenderer.invoke('config:getCloudProviderConfig', provider),
    getConfiguredCloudProviders: () => ipcRenderer.invoke('config:getConfiguredCloudProviders'),
    setDefaultCloudProvider: (provider) => ipcRenderer.invoke('config:setDefaultCloudProvider', provider),
    getDefaultCloudProvider: () => ipcRenderer.invoke('config:getDefaultCloudProvider'),
    removeCloudProviderConfig: (provider) => ipcRenderer.invoke('config:removeCloudProviderConfig', provider),
    getEntraConfig: () => ipcRenderer.invoke('config:getEntraConfig'),
    saveEntraConfig: (config) => ipcRenderer.invoke('config:saveEntraConfig', config),
    clearEntraConfig: () => ipcRenderer.invoke('config:clearEntraConfig'),
  },

  // Event listeners for real-time updates
  on: (channel, callback) => {
    const validChannels = ['auth-status-changed', 'chat-message', 'graph-api-call', 'config:defaultCloudProviderChanged', 'auth:configurationAvailable', 'llm:forceStatusRefresh'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  // Remove specific event listener
  removeListener: (channel, callback) => {
    const validChannels = ['auth-status-changed', 'chat-message', 'graph-api-call', 'config:defaultCloudProviderChanged', 'auth:configurationAvailable', 'llm:forceStatusRefresh'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },

  // Remove event listeners
  removeAllListeners: (channel) => {
    const validChannels = ['auth-status-changed', 'chat-message', 'graph-api-call', 'config:defaultCloudProviderChanged', 'auth:configurationAvailable', 'llm:forceStatusRefresh'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
});
