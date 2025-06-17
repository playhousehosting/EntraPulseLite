// LLM Status Context for making LLM availability state globally available
import React, { createContext, useContext, ReactNode } from 'react';
import { useLLMStatusPolling } from '../hooks/useLLMStatusPolling';

// Define the context type
interface LLMStatusContextType {
  localLLMAvailable: boolean;
  anyLLMAvailable: boolean;
  lastChecked: Date | null;
  forceCheck: () => void;
  isLoading: boolean;
}

// Create the context with default values
const LLMStatusContext = createContext<LLMStatusContextType>({
  localLLMAvailable: false,
  anyLLMAvailable: false,
  lastChecked: null,
  forceCheck: () => {},
  isLoading: false,
});

// Context provider component
interface LLMStatusProviderProps {
  children: ReactNode;
  pollingInterval?: number;
}

export const LLMStatusProvider: React.FC<LLMStatusProviderProps> = ({ 
  children, 
  pollingInterval = 10000 // 10 seconds by default
}) => {
  // Use the LLM status polling hook
  const { 
    localLLMAvailable, 
    anyLLMAvailable,
    lastChecked,
    forceCheck,
    isLoading 
  } = useLLMStatusPolling(pollingInterval);

  const value = {
    localLLMAvailable,
    anyLLMAvailable,
    lastChecked,
    forceCheck,
    isLoading
  };

  return (
    <LLMStatusContext.Provider value={value}>
      {children}
    </LLMStatusContext.Provider>
  );
};

// Hook for using the context
export const useLLMStatus = (): LLMStatusContextType => {
  const context = useContext(LLMStatusContext);
  if (context === undefined) {
    throw new Error('useLLMStatus must be used within a LLMStatusProvider');
  }
  return context;
};

export default LLMStatusContext;
