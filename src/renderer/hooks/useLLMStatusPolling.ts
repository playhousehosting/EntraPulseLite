// Hook for polling Local LLM availability in the background
import { useState, useEffect } from 'react';

/**
 * Custom hook for polling local LLM availability
 * @param pollingInterval Polling interval in milliseconds (default: 10000 - 10 seconds)
 * @returns Object containing current status and availability
 */
export const useLLMStatusPolling = (pollingInterval = 10000) => {
  const [localLLMAvailable, setLocalLLMAvailable] = useState<boolean>(false);
  const [anyLLMAvailable, setAnyLLMAvailable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Function to check LLM availability
  const checkLLMAvailability = async () => {
    try {
      setIsLoading(true);
      
      // Check for local LLM availability
      const localAvailable = await (window.electronAPI.llm as any).isLocalAvailable();
      setLocalLLMAvailable(localAvailable);
      
      // Check if any LLM (local or cloud) is available
      const anyAvailable = await window.electronAPI.llm.isAvailable();
      setAnyLLMAvailable(anyAvailable);
      
      // Update last checked timestamp
      setLastChecked(new Date());
    } catch (error) {
      console.error('Failed to check LLM availability:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial check on mount
  useEffect(() => {
    checkLLMAvailability();
  }, []);

  // Set up polling interval
  useEffect(() => {
    const intervalId = setInterval(checkLLMAvailability, pollingInterval);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [pollingInterval]);

  // Force a check - can be called externally when needed
  const forceCheck = () => {
    checkLLMAvailability();
  };

  return {
    localLLMAvailable,  // Status of local LLM (Ollama/LM Studio)
    anyLLMAvailable,    // Status of any LLM (local or cloud)
    isLoading,          // Whether a check is currently in progress
    lastChecked,        // Timestamp of last check
    forceCheck,         // Function to force an immediate check
  };
};

export default useLLMStatusPolling;
