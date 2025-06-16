// Test file to verify cloud provider types are working
import { CloudLLMProviderConfig } from './src/types';

// Declare the electronAPI interface for testing
declare global {
  interface Window {
    electronAPI: {
      config: {
        getConfiguredCloudProviders(): Promise<Array<{ provider: 'openai' | 'anthropic' | 'gemini'; config: CloudLLMProviderConfig }>>;
        getDefaultCloudProvider(): Promise<{ provider: 'openai' | 'anthropic' | 'gemini'; config: CloudLLMProviderConfig } | null>;
        saveCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini', config: CloudLLMProviderConfig): Promise<void>;
        setDefaultCloudProvider(provider: 'openai' | 'anthropic' | 'gemini'): Promise<void>;
      };
    };
  }
}

// This should not have any TypeScript errors if the types are properly defined
async function testTypes() {
  // Test the config methods
  const providers = await window.electronAPI.config.getConfiguredCloudProviders();
  const defaultProvider = await window.electronAPI.config.getDefaultCloudProvider();
  
  // Test saving a cloud provider
  const testConfig: CloudLLMProviderConfig = {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: 'test-key',
    temperature: 0.7,
    maxTokens: 2048
  };
  
  await window.electronAPI.config.saveCloudProviderConfig('openai', testConfig);
  await window.electronAPI.config.setDefaultCloudProvider('openai');
  
  console.log('Types are working correctly!');
}
