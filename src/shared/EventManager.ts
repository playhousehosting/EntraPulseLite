// EventManager.ts
// Centralized event listener management to prevent memory leaks

interface EventListenerRecord {
  channel: string;
  callback: Function;
  component: string;
  timestamp: Date;
}

export class EventManager {
  private static instance: EventManager | null = null;
  private listeners: Map<string, EventListenerRecord[]> = new Map();
  private readonly maxListenersPerChannel = 15;

  private constructor() {}

  static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }
  /**
   * Add an event listener with tracking to prevent memory leaks
   */
  addEventListener(
    channel: string, 
    callback: Function, 
    componentName: string,
    electronAPI: any
  ): void {
    if (!electronAPI?.on) {
      console.warn('EventManager: electronAPI.on not available');
      return;
    }

    // First, aggressively remove any existing listeners for this component and channel
    this.removeEventListener(channel, componentName, electronAPI);

    // Check current listener count
    const existingListeners = this.listeners.get(channel) || [];
    
    // Check if we have too many listeners and force cleanup
    if (existingListeners.length >= this.maxListenersPerChannel) {
      console.warn(`EventManager: Too many listeners for channel ${channel} (${existingListeners.length}). Force cleaning up.`);
      this.forceCleanupChannel(channel, electronAPI);
    }

    // Create unique listener ID to prevent duplicates
    const listenerId = `${componentName}-${Date.now()}-${Math.random()}`;
    
    // Add the new listener
    const record: EventListenerRecord = {
      channel,
      callback,
      component: componentName,
      timestamp: new Date()
    };

    const channelListeners = this.listeners.get(channel) || [];
    channelListeners.push(record);
    this.listeners.set(channel, channelListeners);

    // Add to Electron
    electronAPI.on(channel, callback);

    console.log(`EventManager: Added listener for ${channel} from ${componentName}. Total: ${channelListeners.length}`);
    
    // Call preload force cleanup if too many listeners
    if (channelListeners.length > 20 && electronAPI.forceCleanupListeners) {
      console.warn(`EventManager: Channel ${channel} has ${channelListeners.length} listeners. Calling force cleanup.`);
      electronAPI.forceCleanupListeners(channel);
    }
  }
  /**
   * Remove event listener for a specific component
   */
  removeEventListener(
    channel: string, 
    componentName: string, 
    electronAPI: any
  ): void {
    if (!electronAPI?.removeListener) {
      console.warn('EventManager: electronAPI.removeListener not available');
      return;
    }

    const channelListeners = this.listeners.get(channel) || [];
    const listenersToRemove = channelListeners.filter(l => l.component === componentName);

    let removedCount = 0;
    for (const listener of listenersToRemove) {
      try {
        // Force removal by calling removeListener multiple times if needed
        electronAPI.removeListener(channel, listener.callback);
        
        // Also try removeAllListeners for this specific callback if available
        if (electronAPI.off) {
          electronAPI.off(channel, listener.callback);
        }
        
        removedCount++;
        console.log(`EventManager: Removed listener for ${channel} from ${componentName}`);
      } catch (error) {
        console.warn(`EventManager: Error removing listener for ${channel}:`, error);
      }
    }

    // Update our tracking
    const remainingListeners = channelListeners.filter(l => l.component !== componentName);
    if (remainingListeners.length === 0) {
      this.listeners.delete(channel);
    } else {
      this.listeners.set(channel, remainingListeners);
    }

    console.log(`EventManager: Removed ${removedCount} listeners for ${channel} from ${componentName}`);
  }

  /**
   * Remove all event listeners for a component
   */
  removeAllListenersForComponent(componentName: string, electronAPI: any): void {
    for (const [channel, listeners] of this.listeners.entries()) {
      this.removeEventListener(channel, componentName, electronAPI);
    }
  }

  /**
   * Clean up old listeners (older than 1 hour)
   */
  private cleanupOldListeners(channel: string, electronAPI: any): void {
    const channelListeners = this.listeners.get(channel) || [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const oldListeners = channelListeners.filter(l => l.timestamp < oneHourAgo);
    
    for (const listener of oldListeners) {
      try {
        electronAPI.removeListener(channel, listener.callback);
        console.log(`EventManager: Cleaned up old listener for ${channel} from ${listener.component}`);
      } catch (error) {
        console.warn(`EventManager: Error cleaning up old listener:`, error);
      }
    }

    // Update tracking to remove old listeners
    const activeListeners = channelListeners.filter(l => l.timestamp >= oneHourAgo);
    this.listeners.set(channel, activeListeners);
  }

  /**
   * Get diagnostic information about current listeners
   */
  getDiagnostics(): { [channel: string]: { count: number; components: string[] } } {
    const diagnostics: { [channel: string]: { count: number; components: string[] } } = {};
    
    for (const [channel, listeners] of this.listeners.entries()) {
      diagnostics[channel] = {
        count: listeners.length,
        components: [...new Set(listeners.map(l => l.component))]
      };
    }
    
    return diagnostics;
  }
  /**
   * Periodic cleanup to prevent memory leaks
   */
  performPeriodicCleanup(electronAPI: any): void {
    const diagnostics = this.getDiagnostics();
    console.log('EventManager: Starting periodic cleanup. Current state:', diagnostics);
    
    // Check IPC listener counts if available
    if (electronAPI?.getListenerDiagnostics) {
      const ipcDiagnostics = electronAPI.getListenerDiagnostics();
      console.log('EventManager: IPC diagnostics:', ipcDiagnostics);
      
      // Force cleanup channels with too many listeners
      for (const [channel, info] of Object.entries(ipcDiagnostics)) {
        if ((info as any).count > 20) {
          console.warn(`EventManager: Channel ${channel} has ${(info as any).count} listeners. Force cleaning...`);
          if (electronAPI.forceCleanupListeners) {
            const result = electronAPI.forceCleanupListeners(channel);
            console.log(`EventManager: Force cleanup result for ${channel}:`, result);
          }
        }
      }
    }
    
    // Clean up old tracked listeners
    for (const channel of this.listeners.keys()) {
      this.cleanupOldListeners(channel, electronAPI);
    }
    
    const finalDiagnostics = this.getDiagnostics();
    console.log('EventManager: Periodic cleanup completed. Final state:', finalDiagnostics);
  }

  /**
   * Dispose of all event listeners
   */
  dispose(electronAPI: any): void {
    for (const [channel, listeners] of this.listeners.entries()) {
      for (const listener of listeners) {
        try {
          electronAPI.removeListener(channel, listener.callback);
        } catch (error) {
          console.warn(`EventManager: Error disposing listener for ${channel}:`, error);
        }
      }
    }
    
    this.listeners.clear();
    console.log('EventManager: All listeners disposed');
  }

  /**
   * Force cleanup of all listeners for a specific channel
   */
  private forceCleanupChannel(channel: string, electronAPI: any): void {
    const channelListeners = this.listeners.get(channel) || [];
    
    console.log(`EventManager: Force cleaning up ${channelListeners.length} listeners for channel ${channel}`);
    
    // Remove all listeners for this channel
    for (const listener of channelListeners) {
      try {
        electronAPI.removeListener(channel, listener.callback);
        if (electronAPI.off) {
          electronAPI.off(channel, listener.callback);
        }
      } catch (error) {
        console.warn(`EventManager: Error during force cleanup:`, error);
      }
    }
    
    // Clear tracking
    this.listeners.delete(channel);
    
    // Call preload force cleanup as well
    if (electronAPI.forceCleanupListeners) {
      electronAPI.forceCleanupListeners(channel);
    }
  }
}

export const eventManager = EventManager.getInstance();
