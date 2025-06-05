// Preload script for EntraPulseLite - Electron security bridge
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication methods
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
  },

  // Microsoft Graph methods
  graph: {
    query: (endpoint, method, data) => ipcRenderer.invoke('graph:query', endpoint, method, data),
  },

  // Local LLM methods
  llm: {
    chat: (messages) => ipcRenderer.invoke('llm:chat', messages),
    isAvailable: () => ipcRenderer.invoke('llm:isAvailable'),
  },

  // MCP methods
  mcp: {
    call: (server, method, params) => ipcRenderer.invoke('mcp:call', server, method, params),
    listServers: () => ipcRenderer.invoke('mcp:listServers'),
  },

  // Configuration methods
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (config) => ipcRenderer.invoke('config:update', config),
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
