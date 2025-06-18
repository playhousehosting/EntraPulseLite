// Cloud LLM service for OpenAI/Anthropic integration
import axios, { AxiosError } from 'axios';
import { LLMConfig, ChatMessage } from '../types';
import { MCPClient } from '../mcp/clients';
import { StandardizedPrompts } from '../shared/StandardizedPrompts';

// Interface for MCP response
interface MCPContentItem {
  type: 'text' | 'link';
  text?: string;
  url?: string;
}

interface MCPResponse {
  content: MCPContentItem[];
}

interface CloudLLMConfig extends LLMConfig {
  apiKey: string;
  organization?: string; // For OpenAI
}

interface RetryOptions {
  maxRetries: number;
  baseDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffFactor: number;
}

export class CloudLLMService {
  private config: CloudLLMConfig;
  private mcpClient?: MCPClient;
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffFactor: 2
  };

  // Availability caching to prevent excessive checks
  private availabilityCache: {
    isAvailable: boolean;
    lastChecked: number;
    cacheValidityMs: number;
  } = {
    isAvailable: false,
    lastChecked: 0,
    cacheValidityMs: 60000 // 1 minute cache
  };

  constructor(config: CloudLLMConfig, mcpClient?: MCPClient) {
    this.config = config;
    this.mcpClient = mcpClient;
  }

  /**
   * Helper method to execute a function with retry logic and exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
    options: RetryOptions = this.defaultRetryOptions
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if this is a retryable error
        const isRetryable = this.isRetryableError(error);
        
        if (!isRetryable || attempt === options.maxRetries) {
          console.error(`${context} failed after ${attempt + 1} attempts:`, error);
          throw lastError;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          options.baseDelay * Math.pow(options.backoffFactor, attempt),
          options.maxDelay
        );
        
        console.warn(`${context} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error instanceof Error ? error.message : error);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Determine if an error is retryable (network issues, timeouts, etc.)
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      // Network errors (connection refused, timeout, etc.)
      if (error.code === 'ECONNRESET' || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'ETIMEDOUT' ||
          error.code === 'ENOTFOUND' ||
          error.message.includes('socket hang up') ||
          error.message.includes('timeout')) {
        return true;
      }
      
      // Server errors (5xx) are often retryable
      if (error.response && error.response.status >= 500) {
        return true;
      }
      
      // Rate limiting (429) is retryable
      if (error.response && error.response.status === 429) {
        return true;
      }
    }
    
    return false;
  }
  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      if (this.config.provider === 'openai') {
        return this.chatWithOpenAI(messages);
      } else if (this.config.provider === 'anthropic') {
        return this.chatWithAnthropic(messages);
      } else if (this.config.provider === 'gemini') {
        return this.chatWithGemini(messages);
      } else if (this.config.provider === 'azure-openai') {
        return this.chatWithAzureOpenAI(messages);
      } else {
        throw new Error(`Unsupported cloud LLM provider: ${this.config.provider}`);
      }
    } catch (error) {
      console.error('Cloud LLM chat failed:', error);
      throw new Error('Failed to communicate with cloud LLM');
    }
  }  async isAvailable(): Promise<boolean> {
    // Check cache first to avoid excessive network requests
    const now = Date.now();
    if (now - this.availabilityCache.lastChecked < this.availabilityCache.cacheValidityMs) {
      console.log(`[CloudLLMService] Using cached availability result: ${this.availabilityCache.isAvailable}`);
      return this.availabilityCache.isAvailable;
    }

    try {
      let isAvailable = false;

      if (this.config.provider === 'openai') {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'OpenAI-Organization': this.config.organization
          },
          timeout: 10000, // Increased timeout
        });
        isAvailable = response.status === 200;
      } else if (this.config.provider === 'anthropic') {
        // Test with a simple messages endpoint call
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-3-5-haiku-20241022', // Use the latest available model for testing
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        }, {
          headers: {
            'x-api-key': this.config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          },
          timeout: 15000, // Increased timeout
        });
        isAvailable = response.status === 200;
      } else if (this.config.provider === 'gemini') {
        // Test with a simple generate content call
        const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
          contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
          generationConfig: { maxOutputTokens: 1 }
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          params: {
            key: this.config.apiKey
          },          timeout: 15000, // Increased timeout
        });
        isAvailable = response.status === 200;
      } else if (this.config.provider === 'azure-openai') {
        // Test Azure OpenAI with a simple connectivity check
        if (!this.config.baseUrl) {
          console.error('Azure OpenAI requires full endpoint URL');
          return false;
        }

        try {
          // Extract the base URL from the full endpoint
          const urlObj = new URL(this.config.baseUrl);
          const baseEndpoint = `${urlObj.protocol}//${urlObj.hostname}`;
          
          console.log(`Testing Azure OpenAI connectivity with base endpoint: ${baseEndpoint}`);
          console.log(`Full URL provided: ${this.config.baseUrl}`);
          
          // Always check models endpoint for availability, regardless of the chat URL format
          const modelsEndpoint = `${baseEndpoint}/openai/models?api-version=2025-01-01-preview`;
          console.log(`Checking Azure OpenAI models at: ${modelsEndpoint}`);
            const response = await axios.get(modelsEndpoint, {
            headers: {
              'api-key': this.config.apiKey
            },
            timeout: 15000, // Increased timeout for Azure OpenAI availability checks
          });
          
          console.log(`Azure OpenAI models check successful: Status ${response.status}`);
          
          // Validate that the full URL follows the expected format for chat completions
          if (!this.config.baseUrl.includes('/chat/completions')) {
            console.warn(`⚠️ Azure OpenAI URL may be incomplete. The URL should include '/chat/completions' and an API version.`);
            console.warn(`Example format: https://your-endpoint.openai.azure.com/openai/deployments/your-deployment-name/chat/completions?api-version=2024-02-01`);
          }
            isAvailable = response.status === 200;
        } catch (error) {
          console.error(`Azure OpenAI availability check failed with URL ${this.config.baseUrl}:`, error);
          
          // For Azure OpenAI, be more lenient with timeout errors since the service might still work
          if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
            console.warn(`Azure OpenAI timeout occurred, but service may still be functional. Assuming available.`);
            isAvailable = true; // Assume available for timeout errors
          } else {
            isAvailable = false;
          }
        }
      }

      // Update cache
      this.availabilityCache = {
        isAvailable,
        lastChecked: now,
        cacheValidityMs: isAvailable ? 300000 : 30000 // 5 minutes if available, 30 seconds if not
      };

      return isAvailable;    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Cloud LLM availability check failed:', errorMessage);
      
      // Check for specific error types to provide better feedback
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.error('Authentication failed - check API key');
        } else if (error.response?.status === 404) {
          console.error('API endpoint not found - check API version');
        } else if (error.response?.status === 429) {
          console.error('Rate limit exceeded');
        }
      }
      
      // Update cache with failure
      this.availabilityCache = {
        isAvailable: false,
        lastChecked: now,
        cacheValidityMs: 30000 // 30 seconds for failed checks
      };
      
      return false;
    }
  }  private async chatWithOpenAI(messages: ChatMessage[]): Promise<string> {
    const openaiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Check if a system prompt is already provided in the messages
    const hasSystemPrompt = messages.some(msg => msg.role === 'system');
    
    let fullMessages;
    if (hasSystemPrompt) {
      // Use the provided system prompt (from EnhancedLLMService)
      fullMessages = openaiMessages;
    } else {
      // Use standardized system prompt for direct calls
      const systemPrompt = StandardizedPrompts.getSystemPrompt(this.config.provider);
      fullMessages = [
        { role: 'system', content: systemPrompt },
        ...openaiMessages
      ];
    }

    // Use retry logic for the actual request
    return await this.retryWithBackoff(async () => {
      console.log(`Making OpenAI request with model: ${this.config.model || 'gpt-4o-mini'}, temperature: ${this.config.temperature || 0.1}, max_tokens: ${this.config.maxTokens || 2048}`);
      
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: this.config.model || 'gpt-4o-mini',
        messages: fullMessages,
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 2048,
      }, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Organization': this.config.organization
        },
        timeout: 30000 // 30 second timeout
      });

      console.log(`OpenAI response received with status: ${response.status}`);
      
      if (!response.data?.choices?.[0]?.message?.content) {
        console.warn('OpenAI response format unexpected:', response.data);
        throw new Error('Unexpected OpenAI response format. Check the console for details.');
      }
      
      return response.data.choices[0].message.content;
    }, 'OpenAI chat request').catch((error) => {
      // Enhanced error handling for OpenAI
      console.error(`OpenAI chat request failed:`, error);
      
      if (axios.isAxiosError(error) && error.response) {
        console.error(`Status: ${error.response.status}, Error:`, error.response.data);
        
        if (error.response.status === 401) {
          throw new Error('OpenAI authentication failed (401). Please verify your API key.');
        } else if (error.response.status === 400) {
          throw new Error(`OpenAI bad request (400). ${error.response.data?.error?.message || 'Check your request parameters.'}`);
        } else if (error.response.status === 429) {
          throw new Error('OpenAI rate limit exceeded (429). Please try again later.');
        }
      }
      
      // For network errors, provide helpful guidance
      if (axios.isAxiosError(error) && (
        error.code === 'ECONNRESET' || 
        error.message.includes('socket hang up') ||
        error.message.includes('timeout')
      )) {
        throw new Error(`OpenAI network error: ${error.message}. This may be due to network connectivity issues or server overload. The request was retried ${this.defaultRetryOptions.maxRetries} times.`);
      }      
      // Re-throw the original error with enhanced message
      throw new Error(`OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }

  private async chatWithAnthropic(messages: ChatMessage[]): Promise<string> {
    const anthropicMessages = messages.filter(msg => msg.role !== 'system').map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
    
    // Check if messages already contain an enhanced system prompt, if so use it
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemPrompt = systemMessage?.content || StandardizedPrompts.getSystemPrompt(this.config.provider);

    // Use retry logic for the actual request
    return await this.retryWithBackoff(async () => {
      console.log(`Making Anthropic request with model: ${this.config.model || 'claude-3-5-sonnet-20241022'}, temperature: ${this.config.temperature || 0.1}, max_tokens: ${this.config.maxTokens || 2048}`);
      
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: this.config.model || 'claude-3-5-sonnet-20241022', // Use latest stable model as default
        max_tokens: this.config.maxTokens || 2048,
        temperature: this.config.temperature || 0.1,
        system: systemPrompt,
        messages: anthropicMessages
      }, {
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000 // 30 second timeout
      });

      console.log(`Anthropic response received with status: ${response.status}`);
      
      if (!response.data?.content?.[0]?.text) {
        console.warn('Anthropic response format unexpected:', response.data);
        throw new Error('Unexpected Anthropic response format. Check the console for details.');
      }
      
      return response.data.content[0].text;
    }, 'Anthropic chat request').catch((error) => {
      // Enhanced error handling for Anthropic
      console.error(`Anthropic chat request failed:`, error);
      
      if (axios.isAxiosError(error) && error.response) {
        console.error(`Status: ${error.response.status}, Error:`, error.response.data);
        
        if (error.response.status === 401) {
          throw new Error('Anthropic authentication failed (401). Please verify your API key.');
        } else if (error.response.status === 400) {
          throw new Error(`Anthropic bad request (400). ${error.response.data?.error?.message || 'Check your request parameters.'}`);
        } else if (error.response.status === 429) {
          throw new Error('Anthropic rate limit exceeded (429). Please try again later.');
        }
      }
      
      // For network errors, provide helpful guidance
      if (axios.isAxiosError(error) && (
        error.code === 'ECONNRESET' || 
        error.message.includes('socket hang up') ||
        error.message.includes('timeout')
      )) {
        throw new Error(`Anthropic network error: ${error.message}. This may be due to network connectivity issues or server overload. The request was retried ${this.defaultRetryOptions.maxRetries} times.`);
      }
      
      // Re-throw the original error with enhanced message
      throw new Error(`Anthropic request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }

  private async chatWithGemini(messages: ChatMessage[]): Promise<string> {
    const geminiMessages = messages.filter(msg => msg.role !== 'system').map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));    // Check if messages already contain an enhanced system prompt, if so use it
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemInstruction = systemMessage?.content || StandardizedPrompts.getSystemPrompt(this.config.provider);

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model || 'gemini-1.5-flash'}:generateContent`, {
      contents: geminiMessages,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: this.config.temperature || 0.1,
        maxOutputTokens: this.config.maxTokens || 2048,
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      params: {
        key: this.config.apiKey
      }
    });    return response.data.candidates[0].content.parts[0].text;
  }  private async chatWithAzureOpenAI(messages: ChatMessage[]): Promise<string> {
    const openaiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Check if messages already contain an enhanced system prompt, if so use it
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemPrompt = systemMessage?.content || StandardizedPrompts.getSystemPrompt(this.config.provider);

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...openaiMessages.filter(msg => msg.role !== 'system')
    ];
    
    if (!this.config.baseUrl) {
      console.error('Azure OpenAI requires full endpoint URL');
      throw new Error('Azure OpenAI requires a full endpoint URL. Please configure a valid endpoint in the settings.');
    }

    // Validate the URL format to ensure it's properly formatted for chat completions
    const urlLower = this.config.baseUrl.toLowerCase();
    
    const hasPath = urlLower.includes('/chat/completions');
    const hasApiVersion = urlLower.includes('api-version=');
    const hasDeployment = urlLower.includes('/deployments/');
    
    // Log what's missing for debugging
    const missingComponents = [];
    if (!hasPath) missingComponents.push('/chat/completions path');
    if (!hasApiVersion) missingComponents.push('api-version parameter');
    if (!hasDeployment) missingComponents.push('/deployments/ path');
    
    if (!hasPath || !hasApiVersion || !hasDeployment) {
      console.error(`Invalid Azure OpenAI URL format: ${this.config.baseUrl}`);
      console.error(`Missing components: ${missingComponents.join(', ')}`);
      throw new Error(`Azure OpenAI URL is incomplete. The complete URL should include: ${missingComponents.join(', ')}.\n\nPlease use the format: https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-01`);
    }

    // Extract deployment name for logging
    const deploymentMatch = urlLower.match(/\/deployments\/([^\/]+)/);
    const deploymentName = deploymentMatch ? deploymentMatch[1] : 'unknown';
    console.log(`Azure OpenAI sending request to endpoint: ${this.config.baseUrl}`);
    console.log(`Using deployment: ${deploymentName}`);
    
    // Use retry logic for the actual request
    return await this.retryWithBackoff(async () => {
      console.log(`Making Azure OpenAI request with temperature: ${this.config.temperature || 0.1}, max_tokens: ${this.config.maxTokens || 2048}`);
      
      const response = await axios.post(this.config.baseUrl!, {
        messages: fullMessages,
        temperature: this.config.temperature || 0.1,
        max_tokens: this.config.maxTokens || 2048,
      }, {
        headers: {
          'api-key': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      console.log(`Azure OpenAI response received with status: ${response.status}`);
      
      if (!response.data?.choices?.[0]?.message?.content) {
        console.warn('Azure OpenAI response format unexpected:', response.data);
        throw new Error('Unexpected Azure OpenAI response format. Check the console for details.');
      }
      
      return response.data.choices[0].message.content;
    }, 'Azure OpenAI chat request').catch((error) => {
      // Enhanced error handling for Azure OpenAI
      console.error(`Azure OpenAI chat request failed:`, error);
      
      if (axios.isAxiosError(error) && error.response) {
        console.error(`Status: ${error.response.status}, Error:`, error.response.data);
        
        if (error.response.status === 404) {
          throw new Error(`Azure OpenAI endpoint not found (404). Please verify your endpoint URL format:\n${this.config.baseUrl}\n\nMake sure it includes the correct deployment name and API version.`);
        } else if (error.response.status === 401) {
          throw new Error('Azure OpenAI authentication failed (401). Please verify your API key.');
        } else if (error.response.status === 403) {
          throw new Error('Azure OpenAI access denied (403). Please check if your API key has access to this deployment.');
        } else if (error.response.status === 400) {
          throw new Error(`Azure OpenAI bad request (400). ${error.response.data?.error?.message || 'Check your endpoint configuration or model parameters.'}`);
        }
      }
      
      // For network errors, provide helpful guidance
      if (axios.isAxiosError(error) && (
        error.code === 'ECONNRESET' || 
        error.message.includes('socket hang up') ||
        error.message.includes('timeout')
      )) {
        throw new Error(`Azure OpenAI network error: ${error.message}. This may be due to network connectivity issues or server overload. The request was retried ${this.defaultRetryOptions.maxRetries} times.`);
      }
      
      // Re-throw the original error with enhanced message
      throw new Error(`Azure OpenAI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      if (this.config.provider === 'openai') {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'OpenAI-Organization': this.config.organization
          }
        });
        return response.data.data
          .filter((model: any) => model.id.includes('gpt'))
          .map((model: any) => model.id) || [];      } else if (this.config.provider === 'anthropic') {
        return await this.getAnthropicModels();
      } else if (this.config.provider === 'gemini') {
        return await this.getGeminiModels();
      } else if (this.config.provider === 'azure-openai') {
        return await this.getAzureOpenAIModels();
      }
      return [];
    } catch (error) {
      console.error('Failed to get available cloud models:', error);
      return this.getFallbackModels();
    }
  }
  /**
   * Fetch Anthropic models dynamically from their documentation using Fetch MCP
   */
  private async getAnthropicModels(): Promise<string[]> {
    // First try using MCP Fetch server if available
    if (this.mcpClient) {
      try {
        console.log('Attempting to fetch Anthropic models using MCP Fetch server...');
        const mcpResponse = await this.mcpClient.callTool('fetch', 'fetch', {
          url: 'https://docs.anthropic.com/en/docs/about-claude/models/overview'
        }) as MCPResponse;

        if (mcpResponse?.content && Array.isArray(mcpResponse.content)) {
          const textContent = mcpResponse.content.find(item => item.type === 'text');
          if (textContent?.text) {
            const models = this.extractModelsFromContent(textContent.text);
            if (models.length > 0) {
              console.log('Successfully retrieved Anthropic models via MCP:', models);
              return models;
            }
          }
        }
      } catch (error) {
        console.warn('MCP Fetch for Anthropic models failed, falling back to direct HTTP:', error);
      }
    }

    // Fallback to direct HTTP if MCP is not available or fails
    try {
      console.log('Fetching Anthropic models via direct HTTP...');
      const response = await axios.get('https://docs.anthropic.com/en/docs/about-claude/models/overview', {
        timeout: 10000,
        headers: {
          'User-Agent': 'EntraPulseLite/1.0'
        }
      });

      const models = this.extractModelsFromContent(response.data);
      if (models.length > 0) {
        console.log('Successfully retrieved Anthropic models via HTTP:', models);
        return models;
      }

      throw new Error('No models found in documentation');
    } catch (error) {
      console.warn('Failed to fetch Anthropic models from documentation:', error);
      return this.getFallbackAnthropicModels();
    }
  }

  /**
   * Fetch Gemini models from Google's API
   */
  private async getGeminiModels(): Promise<string[]> {
    try {
      console.log('Fetching Gemini models from Google API...');
      const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
        params: {
          key: this.config.apiKey,
          pageSize: 50 // Get more models in single request
        },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data?.models) {
        const models = response.data.models
          .filter((model: any) => 
            model.name && 
            model.name.includes('gemini') &&
            model.supportedGenerationMethods?.includes('generateContent')
          )
          .map((model: any) => model.name.replace('models/', ''))
          .sort((a: string, b: string) => {
            // Prioritize newer models (higher version numbers)
            const versionA = a.match(/\d+\.?\d*/)?.[0] || '0';
            const versionB = b.match(/\d+\.?\d*/)?.[0] || '0';
            return parseFloat(versionB) - parseFloat(versionA);
          });

        console.log('Successfully retrieved Gemini models:', models);
        return models;
      }

      throw new Error('No models found in API response');
    } catch (error) {
      console.warn('Failed to fetch Gemini models from API:', error);      return this.getFallbackGeminiModels();
    }
  }
  /**
   * Fetch Azure OpenAI models from the deployment
   */  private async getAzureOpenAIModels(): Promise<string[]> {
    try {
      if (!this.config.baseUrl) {
        console.warn('Azure OpenAI requires full endpoint URL');
        return this.getFallbackAzureOpenAIModels();
      }

      console.log(`Fetching Azure OpenAI models using URL: ${this.config.baseUrl}`);
      
      // Extract the base URL from the full endpoint
      const urlObj = new URL(this.config.baseUrl);
      const baseEndpoint = `${urlObj.protocol}//${urlObj.hostname}`;
      
      console.log(`Using base endpoint for models API: ${baseEndpoint}`);
      
      // Validate that the full URL looks like a chat completions URL
      const urlLower = this.config.baseUrl.toLowerCase();
      const isValidChatEndpoint = urlLower.includes('/chat/completions') && urlLower.includes('api-version=');
      
      if (!isValidChatEndpoint) {
        console.warn(`⚠️ Azure OpenAI URL may not be correctly formatted for chat completions.`);
        console.warn(`The expected format is: https://your-endpoint.openai.azure.com/openai/deployments/your-deployment-name/chat/completions?api-version=2024-02-01`);
      }
      
      // Extract the deployment name if possible
      let deploymentName = '';
      const deploymentMatch = urlLower.match(/\/deployments\/([^\/]+)/);
      if (deploymentMatch && deploymentMatch[1]) {
        deploymentName = deploymentMatch[1];
        console.log(`Detected deployment name from URL: ${deploymentName}`);
      }
      
      const modelsEndpoint = `${baseEndpoint}/openai/models?api-version=2025-01-01-preview`;
      console.log(`Querying models API at: ${modelsEndpoint}`);
      
      const response = await axios.get(modelsEndpoint, {
        headers: {
          'api-key': this.config.apiKey
        },
        timeout: 10000
      });

      if (response.data?.data) {
        const models = response.data.data
          .filter((model: any) => model.id && model.id.includes('gpt'))
          .map((model: any) => model.id)
          .sort();

        console.log('Successfully retrieved Azure OpenAI models:', models);
        
        // If we extracted a deployment name, check if it matches any of the models
        if (deploymentName && !models.includes(deploymentName)) {
          console.warn(`⚠️ The deployment name '${deploymentName}' from your URL doesn't match any of the available models.`);
          console.warn(`This might be expected if your deployment has a custom name different from the model ID.`);
        }
        
        return models;
      }

      throw new Error('No models found in Azure OpenAI response');
    } catch (error) {
      console.warn('Failed to fetch Azure OpenAI models:', error);
      return this.getFallbackAzureOpenAIModels();
    }
  }

  /**
   * Extract model names from HTML/text content
   */private extractModelsFromContent(content: string): string[] {
    try {
      const results: string[] = [];
      
      // Pattern 1: Modern Claude models with version-name-date format
      // Examples: claude-3.5-sonnet-20241022, claude-3-opus-20240229
      const modernVersionNameDateRegex = /claude-\d+(?:\.\d+)?-(?:opus|sonnet|haiku)-\d{8}/gi;
      const modernVersionNameDateMatches = content.match(modernVersionNameDateRegex) || [];
      results.push(...modernVersionNameDateMatches);
      
      // Pattern 2: Newer Claude models with name-version-date format
      // Examples: claude-sonnet-4-20250514
      const modernNameVersionDateRegex = /claude-(?:opus|sonnet|haiku)-\d+(?:\.\d+)?-\d{8}/gi;
      const modernNameVersionDateMatches = content.match(modernNameVersionDateRegex) || [];
      results.push(...modernNameVersionDateMatches);
      
      // Pattern 3: Legacy Claude models without dates
      // Examples: claude-instant-v1, claude-2.0, claude-2.1
      const legacyModelRegex = /claude-(?:instant|2)(?:-v\d+|\.\d+)/gi;
      const legacyMatches = content.match(legacyModelRegex) || [];
      results.push(...legacyMatches);
      
      // Pattern 4: Look for models in JSON or quoted strings
      // This can catch models that might be missed by other patterns
      const jsonRegex = /"(claude-[^"]+)"/gi;
      let jsonMatch;
      while ((jsonMatch = jsonRegex.exec(content)) !== null) {
        if (jsonMatch[1] && jsonMatch[1].startsWith('claude-') && !results.includes(jsonMatch[1])) {
          results.push(jsonMatch[1]);
        }
      }
      
      // Pattern 5: Generic claude model pattern for any other formats
      // This is a more generic pattern that might catch models with unusual formats
      const genericClaudeRegex = /\b(claude-[a-z0-9.\-]+)\b/gi;
      const genericMatches = content.match(genericClaudeRegex) || [];
      // Only add matches that weren't already caught by other patterns
      for (const match of genericMatches) {
        if (!results.includes(match) && match.startsWith('claude-')) {
          results.push(match);
        }
      }
      
      // Deduplicate results, convert to lowercase for consistency
      const uniqueResults = [...new Set(results.map(model => model.toLowerCase()))];
      
      // Enhanced sorting algorithm to prioritize models correctly
      return uniqueResults.sort((a: string, b: string) => {
        // Extract dates if present (8-digit numbers) - could be at the end or elsewhere in the string
        const dateAMatch = a.match(/(\d{8})/);
        const dateBMatch = b.match(/(\d{8})/);
        const dateA = dateAMatch ? dateAMatch[1] : '';
        const dateB = dateBMatch ? dateBMatch[1] : '';
        
        // If both have dates, compare by date (newer first)
        if (dateA && dateB) {
          return dateB.localeCompare(dateA);
        }
        
        // If only one has a date, prioritize that one
        if (dateA) return -1;
        if (dateB) return 1;
        
        // Extract versions - could be in different positions depending on model naming pattern
        const versionAMatch = a.match(/\d+(?:\.\d+)?/);
        const versionBMatch = b.match(/\d+(?:\.\d+)?/);
        const versionA = versionAMatch ? versionAMatch[0] : '0';
        const versionB = versionBMatch ? versionBMatch[0] : '0';
        
        // Compare version numbers as floats (higher versions first)
        if (parseFloat(versionA) !== parseFloat(versionB)) {
          return parseFloat(versionB) - parseFloat(versionA);
        }
        
        // If versions are equal, prioritize by model capability (opus > sonnet > haiku)
        if (a.includes('opus') && !b.includes('opus')) return -1;
        if (!a.includes('opus') && b.includes('opus')) return 1;
        if (a.includes('sonnet') && !b.includes('sonnet') && !b.includes('opus')) return -1;
        if (!a.includes('sonnet') && b.includes('sonnet') && !a.includes('opus')) return 1;
        
        // Default to alphabetical sort
        return a.localeCompare(b);
      });
    } catch (error) {
      console.error('Error extracting models from content:', error);
      return [];
    }
  }

  /**
   * Fallback OpenAI models (updated as of June 2025)
   */
  private getFallbackOpenAIModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini', 
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo'
    ];
  }

  /**
   * Fallback Anthropic models (updated as of June 2025)
   */
  private getFallbackAnthropicModels(): string[] {
    return [
      'claude-sonnet-4-20250514',       // New model mentioned by user
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022', 
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307'
    ];
  }

  /**
   * Fallback Gemini models (updated as of June 2025)
   */
  private getFallbackGeminiModels(): string[] {
    return [      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro',
      'gemini-pro-vision'
    ];
  }

  /**
   * Fallback Azure OpenAI models (updated as of June 2025)   */  private getFallbackAzureOpenAIModels(): string[] {
    // Return a list of common Azure OpenAI models available as of 2025
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-1106-preview',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-35-turbo',
      'gpt-35-turbo-16k',
      'text-embedding-ada-002'
    ];
  }

  /**
   * Get the current configuration
   */
  getConfig(): CloudLLMConfig {
    return this.config;
  }

  /**
   * Get fallback models for the current provider
   */
  getFallbackModels(): string[] {
    if (this.config.provider === 'openai') {
      return this.getFallbackOpenAIModels();
    } else if (this.config.provider === 'anthropic') {
      return this.getFallbackAnthropicModels();
    } else if (this.config.provider === 'gemini') {
      return this.getFallbackGeminiModels();    } else if (this.config.provider === 'azure-openai') {
      return this.getFallbackAzureOpenAIModels();
    } else {      return [];
    }
  }
}
