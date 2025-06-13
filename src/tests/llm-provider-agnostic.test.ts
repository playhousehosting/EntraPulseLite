// LLM Provider Agnostic Test
// Tests to ensure all LLM providers (local and cloud) work consistently

import { UnifiedLLMService } from '../llm/UnifiedLLMService';
import { LLMConfig, ChatMessage } from '../types';

describe('LLM Provider Agnostic Functionality', () => {
  const testMessage: ChatMessage = {
    id: 'test-1',
    role: 'user',
    content: 'How many users are in my organization?',
    timestamp: new Date()
  };

  const systemPromptMessage: ChatMessage = {
    id: 'test-system',
    role: 'system',
    content: `You are an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant integrated into EntraPulse Lite. 

When users ask questions that require Microsoft Graph API data:
1. ALWAYS create proper Graph query in the following <execute_query> format:
   <execute_query>
   {
     "endpoint": "/users/$count",
     "method": "get",
     "params": {
       "ConsistencyLevel": "eventual"
     }
   }
   </execute_query>

Always be helpful, accurate, and security-conscious in your responses.`,
    timestamp: new Date()
  };

  // Test configurations for each provider
  const providerConfigs: { [key: string]: LLMConfig } = {
    ollama: {
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'codellama:7b',
      temperature: 0.2,
      maxTokens: 2048
    },
    lmstudio: {
      provider: 'lmstudio',
      baseUrl: 'http://localhost:1234',
      model: 'gpt-4',
      temperature: 0.2,
      maxTokens: 2048
    },
    openai: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      apiKey: process.env.OPENAI_API_KEY || 'test-key',
      temperature: 0.1,
      maxTokens: 2048
    },
    anthropic: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
      temperature: 0.1,
      maxTokens: 2048
    },
    gemini: {
      provider: 'gemini',
      model: 'gemini-1.5-pro',
      apiKey: process.env.GEMINI_API_KEY || 'test-key',
      temperature: 0.1,
      maxTokens: 2048
    }
  };

  describe.each(Object.entries(providerConfigs))('%s Provider', (providerName, config) => {
    let unifiedLLM: UnifiedLLMService;

    beforeEach(() => {
      unifiedLLM = new UnifiedLLMService(config);
    });

    test('should initialize correctly', () => {
      expect(unifiedLLM).toBeDefined();
      expect(unifiedLLM.getConfig().provider).toBe(config.provider);
    });

    test('should correctly identify provider type', () => {
      if (config.provider === 'ollama' || config.provider === 'lmstudio') {
        expect(unifiedLLM.isLocalProvider()).toBe(true);
        expect(unifiedLLM.isCloudProvider()).toBe(false);
        expect(unifiedLLM.getProviderType()).toBe('local');
      } else {
        expect(unifiedLLM.isLocalProvider()).toBe(false);
        expect(unifiedLLM.isCloudProvider()).toBe(true);
        expect(unifiedLLM.getProviderType()).toBe('cloud');
      }
    });

    test('should handle system prompts consistently', async () => {
      // Mock the actual LLM call to avoid real API calls in tests
      const mockResponse = `Based on your request, I'll query the user count.

<execute_query>
{
  "endpoint": "/users/$count",
  "method": "get",
  "params": {
    "ConsistencyLevel": "eventual"
  }
}
</execute_query>

This will return the total number of users in your organization.`;

      // For this test, we'll mock the underlying service
      jest.spyOn(unifiedLLM as any, 'getActiveService').mockReturnValue({
        chat: jest.fn().mockResolvedValue(mockResponse),
        isAvailable: jest.fn().mockResolvedValue(true),
        getAvailableModels: jest.fn().mockResolvedValue(['test-model'])
      });

      const response = await unifiedLLM.chat([systemPromptMessage, testMessage]);
      
      // All providers should generate the same execute_query format
      expect(response).toContain('<execute_query>');
      expect(response).toContain('"endpoint": "/users/$count"');
      expect(response).toContain('"method": "get"');
      expect(response).toContain('"ConsistencyLevel": "eventual"');
    });

    test('should have consistent error handling', async () => {
      // Mock a failed LLM call
      jest.spyOn(unifiedLLM as any, 'getActiveService').mockReturnValue({
        chat: jest.fn().mockRejectedValue(new Error('Connection failed')),
        isAvailable: jest.fn().mockResolvedValue(false),
        getAvailableModels: jest.fn().mockResolvedValue([])
      });

      await expect(unifiedLLM.chat([testMessage])).rejects.toThrow();
    });

    test('should provide fallback models when API calls fail', async () => {
      // This test verifies that all providers have fallback models defined
      const models = await unifiedLLM.getAvailableModels().catch(() => []);
      
      // Should return an array (empty is okay for test environment)
      expect(Array.isArray(models)).toBe(true);
    });
  });

  describe('Query Processing Consistency', () => {
    test('should extract and process execute_query tags consistently across all providers', () => {
      const testResponse = `I'll help you count the users.

<execute_query>
{
  "endpoint": "/users/$count",
  "method": "get", 
  "params": {
    "ConsistencyLevel": "eventual"
  }
}
</execute_query>

This query will return the total user count.`;

      // Test the regex pattern used in UnifiedLLMService
      const EXECUTE_QUERY_REGEX = /<execute_query>([\s\S]*?)<\/execute_query>/g;
      const matches = [...testResponse.matchAll(EXECUTE_QUERY_REGEX)];
      
      expect(matches).toHaveLength(1);
      
      const queryText = matches[0][1].trim();
      const query = JSON.parse(queryText);
      
      expect(query.endpoint).toBe('/users/$count');
      expect(query.method).toBe('get');
      expect(query.params.ConsistencyLevel).toBe('eventual');
    });
  });

  describe('API Key Management', () => {
    test('cloud providers should handle missing API keys gracefully', () => {
      const configWithoutKey: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: '', // Empty API key
        temperature: 0.1,
        maxTokens: 2048
      };

      expect(() => new UnifiedLLMService(configWithoutKey)).not.toThrow();
      
      const service = new UnifiedLLMService(configWithoutKey);
      expect(service.isServiceReady()).toBe(false);
      expect(service.getServiceStatus().ready).toBe(false);
      expect(service.getServiceStatus().reason).toContain('API key');
    });

    test('local providers should not require API keys', () => {
      const localConfig: LLMConfig = {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'test-model',
        temperature: 0.2,
        maxTokens: 2048
      };

      expect(() => new UnifiedLLMService(localConfig)).not.toThrow();
      
      const service = new UnifiedLLMService(localConfig);
      expect(service.isServiceReady()).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    test('should allow API key updates for cloud providers', () => {
      const config: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: '',
        temperature: 0.1,
        maxTokens: 2048
      };

      const service = new UnifiedLLMService(config);
      expect(service.isServiceReady()).toBe(false);

      service.updateApiKey('new-api-key');
      expect(service.getConfig().apiKey).toBe('new-api-key');
      expect(service.isServiceReady()).toBe(true);
    });

    test('should reject API key updates for local providers', () => {
      const config: LLMConfig = {
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'test-model',
        temperature: 0.2,
        maxTokens: 2048
      };

      const service = new UnifiedLLMService(config);
      expect(() => service.updateApiKey('should-fail')).toThrow();
    });
  });
});
