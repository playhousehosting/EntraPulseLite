// eventDiagnostics.ts
// Utility for checking event listener status in development

declare global {
  interface Window {
    __eventDiagnostics: () => void;
  }
}

/**
 * Setup event diagnostics for development
 */
export const setupEventDiagnostics = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    window.__eventDiagnostics = () => {
      const electronAPI = (window as any).electronAPI;
      
      if (electronAPI?.getListenerDiagnostics) {
        const ipcDiagnostics = electronAPI.getListenerDiagnostics();
        console.log('🔍 IPC Event Listener Diagnostics:', ipcDiagnostics);
      }
      
      // Check if EventManager is available
      try {
        const { eventManager } = require('../shared/EventManager');
        const eventManagerDiagnostics = eventManager.getDiagnostics();
        console.log('🔍 EventManager Diagnostics:', eventManagerDiagnostics);      } catch (error) {
        console.log('EventManager not available:', (error as Error).message);
      }
      
      console.log('💡 To check listeners: window.__eventDiagnostics()');
    };
    
    console.log('🔧 Event diagnostics available: window.__eventDiagnostics()');
  }
};
