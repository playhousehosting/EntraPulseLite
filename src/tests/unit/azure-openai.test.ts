// azure-openai.test.ts
// Dedicated tests for Azure OpenAI functionality

import { CloudLLMService } from '../../llm/CloudLLMService';
import { EnhancedCloudLLMService } from '../../llm/EnhancedCloudLLMService';
import { UnifiedLLMService } from '../../llm/UnifiedLLMService';
import { ConfigService } from '../../shared/ConfigService';
import { CloudLLMProviderConfig, LLMConfig, ChatMessage } from '../../types';
import axios from 'axios';

// Mock axios for network requests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Azure OpenAI Provider Tests', () => {
  let mockAzureOpenAIConfig: CloudLLMProviderConfig;
  let mockLLMConfig: LLMConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAzureOpenAIConfig = {
      provider: 'azure-openai',
      apiKey: 'test-azure-openai-api-key',
      baseUrl: 'https://test.openai.azure.com',
      model: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 2048
    };

    mockLLMConfig = {
      provider: 'azure-openai',
      apiKey: 'test-azure-openai-api-key',
      baseUrl: 'https://test.openai.azure.com',
      model: 'gpt-4o',
      temperature: 0.1,
      maxTokens: 2048
    };
  });

  describe('CloudLLMService Azure OpenAI', () => {
    let cloudLLMService: CloudLLMService;

    beforeEach(() => {
      cloudLLMService = new CloudLLMService(mockAzureOpenAIConfig);
    });

    test('should initialize with Azure OpenAI configuration', () => {
      expect(cloudLLMService).toBeDefined();
      expect(cloudLLMService.getConfig().provider).toBe('azure-openai');
      expect(cloudLLMService.getConfig().baseUrl).toBe('https://test.openai.azure.com');
    });

    test('should check availability with Azure OpenAI endpoint', async () => {
      // Mock successful Azure OpenAI models endpoint response
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      const isAvailable = await cloudLLMService.isAvailable();
      
      expect(isAvailable).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test.openai.azure.com/openai/models?api-version=2024-02-01',
        expect.objectContaining({
          headers: {
            'api-key': 'test-azure-openai-api-key'
          },
          timeout: 5000
        })
      );
    });

    test('should handle availability check failure', async () => {
      // Mock failed Azure OpenAI endpoint response
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const isAvailable = await cloudLLMService.isAvailable();
      
      expect(isAvailable).toBe(false);
    });

    test('should handle missing baseUrl gracefully', async () => {
      const configWithoutBaseUrl = { ...mockAzureOpenAIConfig, baseUrl: '' };
      const service = new CloudLLMService(configWithoutBaseUrl);

      const isAvailable = await service.isAvailable();
      
      expect(isAvailable).toBe(false);
    });

    test('should fetch Azure OpenAI models successfully', async () => {
      // Mock successful Azure OpenAI models response
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            { id: 'gpt-4o', object: 'model' },
            { id: 'gpt-4o-mini', object: 'model' },
            { id: 'gpt-4-turbo', object: 'model' },
            { id: 'gpt-35-turbo', object: 'model' }
          ]
        }
      });

      const models = await cloudLLMService.getAvailableModels();
      
      expect(models).toEqual(['gpt-35-turbo', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini']);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test.openai.azure.com/openai/models?api-version=2024-02-01',
        expect.objectContaining({
          headers: {
            'api-key': 'test-azure-openai-api-key'
          }
        })
      );
    });

    test('should return fallback models when API call fails', async () => {
      // Mock failed Azure OpenAI models response
      mockedAxios.get.mockRejectedValueOnce(new Error('API error'));

      const models = await cloudLLMService.getAvailableModels();
      const fallbackModels = cloudLLMService.getFallbackModels();
      
      expect(models).toEqual(fallbackModels);
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4o-mini');
      expect(models).toContain('gpt-35-turbo');
    });

    test('should perform chat completions with correct Azure OpenAI format', async () => {
      // Mock successful Azure OpenAI chat completion response
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [{
            message: {
              content: 'Hello! I can help you with Microsoft Graph queries.'
            }
          }]
        }
      });

      const messages: ChatMessage[] = [
        {
          id: 'test-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }
      ];

      const response = await cloudLLMService.chat(messages);
      
      expect(response).toBe('Hello! I can help you with Microsoft Graph queries.');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'system' }),
            expect.objectContaining({ role: 'user', content: 'Hello' })
          ]),
          temperature: 0.1,
          max_tokens: 2048
        }),
        expect.objectContaining({
          headers: {
            'api-key': 'test-azure-openai-api-key',
            'Content-Type': 'application/json'
          }
        })
      );
    });

    test('should throw error when baseUrl is missing for chat', async () => {
      const configWithoutBaseUrl = { ...mockAzureOpenAIConfig, baseUrl: '' };
      const service = new CloudLLMService(configWithoutBaseUrl);

      const messages: ChatMessage[] = [
        {
          id: 'test-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date()
        }
      ];

      await expect(service.chat(messages)).rejects.toThrow('Azure OpenAI requires baseUrl');
    });
  });

  describe('EnhancedCloudLLMService Azure OpenAI', () => {
    let enhancedCloudLLMService: EnhancedCloudLLMService;

    beforeEach(() => {
      enhancedCloudLLMService = new EnhancedCloudLLMService(mockAzureOpenAIConfig);
    });

    test('should initialize with Azure OpenAI configuration', () => {
      expect(enhancedCloudLLMService).toBeDefined();
      expect(enhancedCloudLLMService.getConfig().provider).toBe('azure-openai');
    });

    test('should check availability with Azure OpenAI', async () => {
      // Mock successful Azure OpenAI models endpoint response
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      const isAvailable = await enhancedCloudLLMService.isAvailable();
      
      expect(isAvailable).toBe(true);
    });

    test('should fetch models with enhanced service', async () => {
      // Mock successful Azure OpenAI models response
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: {
          data: [
            { id: 'gpt-4o', object: 'model' },
            { id: 'gpt-4o-mini', object: 'model' }
          ]
        }
      });

      const models = await enhancedCloudLLMService.getAvailableModels();
      
      expect(models).toEqual(['gpt-4o', 'gpt-4o-mini']);
    });
  });

  describe('UnifiedLLMService Azure OpenAI', () => {
    let unifiedLLMService: UnifiedLLMService;

    beforeEach(() => {
      unifiedLLMService = new UnifiedLLMService(mockLLMConfig);
    });

    test('should initialize correctly with Azure OpenAI', () => {
      expect(unifiedLLMService).toBeDefined();
      expect(unifiedLLMService.getConfig().provider).toBe('azure-openai');
      expect(unifiedLLMService.isCloudProvider()).toBe(true);
      expect(unifiedLLMService.isLocalProvider()).toBe(false);
      expect(unifiedLLMService.getProviderType()).toBe('cloud');
    });

    test('should require API key for service readiness', () => {
      expect(unifiedLLMService.isServiceReady()).toBe(true);

      const configWithoutKey = { ...mockLLMConfig, apiKey: '' };
      const serviceWithoutKey = new UnifiedLLMService(configWithoutKey);
      
      expect(serviceWithoutKey.isServiceReady()).toBe(false);
      expect(serviceWithoutKey.getServiceStatus().ready).toBe(false);
      expect(serviceWithoutKey.getServiceStatus().reason).toContain('API key');
    });

    test('should require baseUrl for Azure OpenAI', () => {
      const configWithoutBaseUrl = { ...mockLLMConfig, baseUrl: '' };
      const serviceWithoutBaseUrl = new UnifiedLLMService(configWithoutBaseUrl);
      
      expect(serviceWithoutBaseUrl.isServiceReady()).toBe(false);
      expect(serviceWithoutBaseUrl.getServiceStatus().ready).toBe(false);
      expect(serviceWithoutBaseUrl.getServiceStatus().reason).toContain('baseUrl');
    });

    test('should allow API key updates', () => {
      const newApiKey = 'new-azure-openai-api-key';
      unifiedLLMService.updateApiKey(newApiKey);
      
      expect(unifiedLLMService.getConfig().apiKey).toBe(newApiKey);
      expect(unifiedLLMService.isServiceReady()).toBe(true);
    });
  });

  describe('ConfigService Azure OpenAI Integration', () => {
    let configService: ConfigService;

    beforeEach(() => {
      configService = new ConfigService();
    });

    test('should save Azure OpenAI cloud provider configuration', () => {
      const azureOpenAIConfig: CloudLLMProviderConfig = {
        provider: 'azure-openai',
        apiKey: 'test-azure-key',
        baseUrl: 'https://test.openai.azure.com',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 2048
      };

      expect(() => {
        configService.saveCloudProviderConfig('azure-openai', azureOpenAIConfig);
      }).not.toThrow();
    });

    test('should retrieve Azure OpenAI cloud provider configuration', () => {
      const azureOpenAIConfig: CloudLLMProviderConfig = {
        provider: 'azure-openai',
        apiKey: 'test-azure-key',
        baseUrl: 'https://test.openai.azure.com',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 2048
      };

      configService.saveCloudProviderConfig('azure-openai', azureOpenAIConfig);
      const retrievedConfig = configService.getCloudProviderConfig('azure-openai');

      expect(retrievedConfig).toEqual(azureOpenAIConfig);
      expect(retrievedConfig?.provider).toBe('azure-openai');
      expect(retrievedConfig?.baseUrl).toBe('https://test.openai.azure.com');
    });

    test('should include Azure OpenAI in configured providers list', () => {
      const azureOpenAIConfig: CloudLLMProviderConfig = {
        provider: 'azure-openai',
        apiKey: 'test-azure-key',
        baseUrl: 'https://test.openai.azure.com',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 2048
      };

      configService.saveCloudProviderConfig('azure-openai', azureOpenAIConfig);
      const configuredProviders = configService.getConfiguredCloudProviders();

      expect(configuredProviders).toContain('azure-openai');
    });

    test('should set Azure OpenAI as default provider', () => {
      const azureOpenAIConfig: CloudLLMProviderConfig = {
        provider: 'azure-openai',
        apiKey: 'test-azure-key',
        baseUrl: 'https://test.openai.azure.com',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 2048
      };

      configService.saveCloudProviderConfig('azure-openai', azureOpenAIConfig);
      configService.setDefaultCloudProvider('azure-openai');

      const defaultProvider = configService.getDefaultCloudProvider();
      expect(defaultProvider).toBe('azure-openai');
    });

    test('should remove Azure OpenAI provider configuration', () => {
      const azureOpenAIConfig: CloudLLMProviderConfig = {
        provider: 'azure-openai',
        apiKey: 'test-azure-key',
        baseUrl: 'https://test.openai.azure.com',
        model: 'gpt-4o',
        temperature: 0.1,
        maxTokens: 2048
      };

      configService.saveCloudProviderConfig('azure-openai', azureOpenAIConfig);
      expect(configService.getCloudProviderConfig('azure-openai')).toBeDefined();

      configService.removeCloudProviderConfig('azure-openai');
      expect(configService.getCloudProviderConfig('azure-openai')).toBeNull();
    });
  });

  describe('Azure OpenAI URL Format Validation', () => {
    test('should construct correct Azure OpenAI chat completion URL', () => {
      const service = new CloudLLMService(mockAzureOpenAIConfig);
      
      // Mock the chat method to inspect the URL being called
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { choices: [{ message: { content: 'Test response' } }] }
      });

      const messages: ChatMessage[] = [
        { id: 'test-1', role: 'user', content: 'Test', timestamp: new Date() }
      ];

      service.chat(messages);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://test.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2024-02-01',
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should construct correct Azure OpenAI models URL', async () => {
      const service = new CloudLLMService(mockAzureOpenAIConfig);
      
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      await service.getAvailableModels();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://test.openai.azure.com/openai/models?api-version=2024-02-01',
        expect.objectContaining({
          headers: { 'api-key': 'test-azure-openai-api-key' }
        })
      );
    });
  });

  describe('Azure OpenAI Authentication Headers', () => {
    test('should use api-key header instead of Authorization Bearer', async () => {
      const service = new CloudLLMService(mockAzureOpenAIConfig);
      
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { choices: [{ message: { content: 'Test response' } }] }
      });

      const messages: ChatMessage[] = [
        { id: 'test-1', role: 'user', content: 'Test', timestamp: new Date() }
      ];

      await service.chat(messages);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          headers: {
            'api-key': 'test-azure-openai-api-key',
            'Content-Type': 'application/json'
          }
        })
      );

      // Verify that Authorization header is NOT used
      const callArgs = mockedAxios.post.mock.calls[0];
      const headers = callArgs[2]?.headers;
      expect(headers).not.toHaveProperty('Authorization');
    });

    test('should use correct headers for models endpoint', async () => {
      const service = new CloudLLMService(mockAzureOpenAIConfig);
      
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: { data: [] }
      });

      await service.isAvailable();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'api-key': 'test-azure-openai-api-key'
          }
        })
      );
    });
  });
});
