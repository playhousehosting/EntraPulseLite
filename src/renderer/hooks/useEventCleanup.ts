// useEventCleanup.ts
// React hook for periodic event listener cleanup

import { useEffect } from 'react';
import { eventManager } from '../../shared/EventManager';

/**
 * Hook to perform periodic cleanup of event listeners
 */
export const useEventCleanup = (intervalMinutes: number = 30) => {
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const electronAPI = window.electronAPI as any;
      if (electronAPI) {
        eventManager.performPeriodicCleanup(electronAPI);
      }
    }, intervalMinutes * 60 * 1000);

    return () => {
      clearInterval(cleanupInterval);
    };
  }, [intervalMinutes]);
};
