// Cloud LLM service for OpenAI/Anthropic integration
import axios from 'axios';
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

export class CloudLLMService {
  private config: CloudLLMConfig;
  private mcpClient?: MCPClient;

  constructor(config: CloudLLMConfig, mcpClient?: MCPClient) {
    this.config = config;
    this.mcpClient = mcpClient;
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
  }
  async isAvailable(): Promise<boolean> {
    try {
      if (this.config.provider === 'openai') {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'OpenAI-Organization': this.config.organization
          },
          timeout: 5000,
        });
        return response.status === 200;
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
          timeout: 10000,
        });
        return response.status === 200;      } else if (this.config.provider === 'gemini') {
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
          },
          timeout: 10000,
        });
        return response.status === 200;
      } else if (this.config.provider === 'azure-openai') {
        // Test Azure OpenAI with a simple chat completion call
        if (!this.config.baseUrl) {
          console.error('Azure OpenAI requires baseUrl');
          return false;
        }
        const response = await axios.get(`${this.config.baseUrl}/openai/models?api-version=2024-02-01`, {
          headers: {
            'api-key': this.config.apiKey
          },
          timeout: 5000,
        });
        return response.status === 200;
      }
      return false;
    } catch (error) {
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
      
      return false;
    }
  }
  private async chatWithOpenAI(messages: ChatMessage[]): Promise<string> {
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
    } else {      // Use standardized system prompt for direct calls
      const systemPrompt = StandardizedPrompts.getSystemPrompt(this.config.provider);      fullMessages = [
        { role: 'system', content: systemPrompt },
        ...openaiMessages
      ];
    }const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: this.config.model || 'gpt-4o-mini',
      messages: fullMessages,
      temperature: this.config.temperature || 0.1,
      max_tokens: this.config.maxTokens || 2048,
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Organization': this.config.organization
      }
    });

    return response.data.choices[0].message.content;
  }
  private async chatWithAnthropic(messages: ChatMessage[]): Promise<string> {
    const anthropicMessages = messages.filter(msg => msg.role !== 'system').map(msg => ({
      role: msg.role,
      content: msg.content,
    }));    // Check if messages already contain an enhanced system prompt, if so use it
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemPrompt = systemMessage?.content || StandardizedPrompts.getSystemPrompt(this.config.provider);

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: this.config.model || 'claude-3-5-sonnet-20241022', // Use latest stable model as default
      max_tokens: this.config.maxTokens || 2048,
      temperature: this.config.temperature || 0.1,
      system: systemPrompt,
      messages: anthropicMessages}, {
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    });

    return response.data.content[0].text;
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
  }

  private async chatWithAzureOpenAI(messages: ChatMessage[]): Promise<string> {
    const openaiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Check if messages already contain an enhanced system prompt, if so use it
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemPrompt = systemMessage?.content || StandardizedPrompts.getSystemPrompt(this.config.provider);

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...openaiMessages
    ];

    if (!this.config.baseUrl) {
      throw new Error('Azure OpenAI requires baseUrl');
    }

    const response = await axios.post(`${this.config.baseUrl}/openai/deployments/${this.config.model}/chat/completions?api-version=2024-02-01`, {
      messages: fullMessages,
      temperature: this.config.temperature || 0.1,
      max_tokens: this.config.maxTokens || 2048,
    }, {
      headers: {
        'api-key': this.config.apiKey,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
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
   */
  private async getAzureOpenAIModels(): Promise<string[]> {
    try {
      if (!this.config.baseUrl) {
        console.warn('Azure OpenAI requires baseUrl');
        return this.getFallbackAzureOpenAIModels();
      }

      console.log('Fetching Azure OpenAI models...');
      const response = await axios.get(`${this.config.baseUrl}/openai/models?api-version=2024-02-01`, {
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
   * Fallback Azure OpenAI models (updated as of June 2025)
   */  private getFallbackAzureOpenAIModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-35-turbo'
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
