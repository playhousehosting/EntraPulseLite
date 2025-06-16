// Enhanced Cloud LLM Service with MCP integration for dynamic model discovery
import axios from 'axios';
import { LLMConfig, ChatMessage } from '../types';

interface CloudLLMConfig extends LLMConfig {
  apiKey: string;
  organization?: string; // For OpenAI
}

export interface MCPClient {
  callTool(serverName: string, toolName: string, params: any): Promise<any>;
}

export class EnhancedCloudLLMService {
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
        return this.chatWithAnthropic(messages);      } else if (this.config.provider === 'gemini') {
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
        // Anthropic doesn't have a dedicated health check endpoint
        // We'll assume it's available if we have an API key
        return !!this.config.apiKey;
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
          },
          timeout: 10000,        });
        return response.status === 200;
      } else if (this.config.provider === 'azure-openai') {
        // Test Azure OpenAI with a simple models endpoint call
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
      return false;
    }
  }

  private async chatWithOpenAI(messages: ChatMessage[]): Promise<string> {
    const openaiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const systemPrompt = `You are an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant integrated into EntraPulse Lite. 

You have access to Microsoft Graph APIs through built-in MCP servers and can help users:
- Query user accounts, groups, applications, and service principals
- Understand Microsoft Entra concepts and best practices
- Analyze permissions and security configurations
- Provide natural language explanations of complex directory structures

When users ask questions, you can:
1. Query Microsoft Graph APIs directly using the available MCP tools
2. Explain Microsoft Entra concepts clearly
3. Provide actionable insights about identity and access management
4. Help with troubleshooting and security analysis

Always be helpful, accurate, and security-conscious in your responses.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...openaiMessages
    ];    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: this.config.model || 'gpt-4o-mini',
      messages: fullMessages,
      temperature: this.config.temperature || 0.2,
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
    }));

    const systemPrompt = `You are an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant integrated into EntraPulse Lite. 

You have access to Microsoft Graph APIs through built-in MCP servers and can help users:
- Query user accounts, groups, applications, and service principals
- Understand Microsoft Entra concepts and best practices
- Analyze permissions and security configurations
- Provide natural language explanations of complex directory structures

When users ask questions, you can:
1. Query Microsoft Graph APIs directly using the available MCP tools
2. Explain Microsoft Entra concepts clearly
3. Provide actionable insights about identity and access management
4. Help with troubleshooting and security analysis

Always be helpful, accurate, and security-conscious in your responses.`;    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: this.config.maxTokens || 2048,
      temperature: this.config.temperature || 0.2,
      system: systemPrompt,
      messages: anthropicMessages
    }, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
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
    }));

    // Check if messages already contain an enhanced system prompt, if so use it
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemInstruction = systemMessage?.content || `You are an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant integrated into EntraPulse Lite. 

You have access to Microsoft Graph APIs through built-in MCP servers and can help users:
- Query user accounts, groups, applications, and service principals
- Understand Microsoft Entra concepts and best practices
- Analyze permissions and security configurations
- Provide natural language explanations of complex directory structures

When users ask questions, you can:
1. Query Microsoft Graph APIs directly using the available MCP tools
2. Explain Microsoft Entra concepts clearly
3. Provide actionable insights about identity and access management
4. Help with troubleshooting and security analysis

Always be helpful, accurate, and security-conscious in your responses.`;

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${this.config.model || 'gemini-1.5-flash'}:generateContent`, {
      contents: geminiMessages,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: this.config.temperature || 0.2,
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

    const systemPrompt = `You are an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant integrated into EntraPulse Lite. 

You have access to Microsoft Graph APIs through built-in MCP servers and can help users:
- Query user accounts, groups, applications, and service principals
- Understand Microsoft Entra concepts and best practices
- Analyze permissions and security configurations
- Provide natural language explanations of complex directory structures

When users ask questions, you can:
1. Query Microsoft Graph APIs directly using the available MCP tools
2. Explain Microsoft Entra concepts clearly
3. Provide actionable insights about identity and access management
4. Help with troubleshooting and security analysis

Always be helpful, accurate, and security-conscious in your responses.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...openaiMessages
    ];

    if (!this.config.baseUrl) {
      throw new Error('Azure OpenAI requires baseUrl');
    }

    const response = await axios.post(`${this.config.baseUrl}/openai/deployments/${this.config.model}/chat/completions?api-version=2024-02-01`, {
      messages: fullMessages,
      temperature: this.config.temperature || 0.2,
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
   * Fetch Anthropic models dynamically using MCP Fetch server or direct HTTP
   */
  private async getAnthropicModels(): Promise<string[]> {
    // Try using MCP Fetch server first (more reliable and consistent)
    if (this.mcpClient) {
      try {
        console.log('Attempting to fetch Anthropic models via MCP Fetch server...');
        const mcpResult = await this.mcpClient.callTool('fetch', 'fetch', {
          url: 'https://docs.anthropic.com/en/docs/about-claude/models/overview',
          method: 'GET'
        });

        if (mcpResult?.content) {
          const htmlContent = this.extractTextFromMCPResult(mcpResult);
          const models = this.extractAnthropicModelsFromHTML(htmlContent);
          if (models.length > 0) {
            console.log('Successfully retrieved Anthropic models via MCP:', models);
            return models;
          }
        }
      } catch (mcpError) {
        console.warn('MCP Fetch failed for Anthropic models, falling back to direct HTTP:', mcpError);
      }
    }

    // Fallback to direct HTTP request
    return await this.getAnthropicModelsDirectly();
  }

  /**
   * Extract text content from MCP result
   */
  private extractTextFromMCPResult(mcpResult: any): string {
    if (mcpResult.content) {
      // Handle MCP protocol format with content array
      const textContent = mcpResult.content.find((item: any) => item.type === 'text');
      if (textContent?.text) {
        return textContent.text;
      }
    }
    
    // Handle direct result format
    if (typeof mcpResult === 'string') {
      return mcpResult;
    }
    
    return JSON.stringify(mcpResult);
  }

  /**
   * Extract Anthropic model names from HTML content
   */
  private extractAnthropicModelsFromHTML(htmlContent: string): string[] {
    // Look for patterns like "claude-3-5-sonnet-20241022" in the documentation
    const modelRegex = /claude-[0-9](?:\.[0-9])?-(?:opus|sonnet|haiku)-[0-9]{8}/gi;
    const matches = htmlContent.match(modelRegex);
    
    if (matches && matches.length > 0) {
      // Remove duplicates and sort by recency (newer dates first)
      const uniqueModels = [...new Set(matches)].sort((a, b) => {
        const dateA = a.match(/([0-9]{8})$/)?.[1] || '00000000';
        const dateB = b.match(/([0-9]{8})$/)?.[1] || '00000000';
        return dateB.localeCompare(dateA);
      });
      
      return uniqueModels;
    }
    
    // Try alternative patterns for API names or code blocks
    const alternativeRegex = /"(claude-[^"]+)"|`(claude-[^`]+)`/gi;
    const altMatches = htmlContent.match(alternativeRegex);
    if (altMatches && altMatches.length > 0) {
      const models = altMatches
        .map(match => match.replace(/["`]/g, ''))
        .filter(model => model.includes('claude-'))
        .filter((model, index, arr) => arr.indexOf(model) === index); // Remove duplicates
      
      return models;
    }

    return [];
  }

  /**
   * Direct HTTP fetch for Anthropic models (fallback)
   */
  private async getAnthropicModelsDirectly(): Promise<string[]> {
    try {
      console.log('Fetching Anthropic models directly from documentation...');
      const response = await axios.get('https://docs.anthropic.com/en/docs/about-claude/models/overview', {
        timeout: 10000,
        headers: {
          'User-Agent': 'EntraPulseLite/1.0'
        }
      });

      const models = this.extractAnthropicModelsFromHTML(response.data);
      if (models.length > 0) {
        console.log('Successfully retrieved Anthropic models directly:', models);
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
          pageSize: 50
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
   * Extract Gemini model names from HTML content
   */
  private extractGeminiModelsFromHTML(htmlContent: string): string[] {
    // Look for patterns like "gemini-1" in the documentation
    const modelRegex = /gemini-[0-9]+/gi;
    const matches = htmlContent.match(modelRegex);
    
    if (matches && matches.length > 0) {
      // Remove duplicates
      const uniqueModels = [...new Set(matches)];
      return uniqueModels;
    }
    
    return [];
  }

  /**
   * Direct HTTP fetch for Gemini models (fallback)
   */
  private async getGeminiModelsDirectly(): Promise<string[]> {
    try {
      console.log('Fetching Gemini models directly from documentation...');
      const response = await axios.get('https://docs.gemini.com/en/docs/about-gemini/models/overview', {
        timeout: 10000,
        headers: {
          'User-Agent': 'EntraPulseLite/1.0'
        }
      });

      const models = this.extractGeminiModelsFromHTML(response.data);
      if (models.length > 0) {
        console.log('Successfully retrieved Gemini models directly:', models);
        return models;
      }

      throw new Error('No models found in documentation');
    } catch (error) {
      console.warn('Failed to fetch Gemini models from documentation:', error);
      return this.getFallbackGeminiModels();
    }
  }

  /**
   * Fallback models when dynamic fetching fails
   */
  private getFallbackModels(): string[] {
    if (this.config.provider === 'openai') {
      return [
        'gpt-4o',
        'gpt-4o-mini', 
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo'
      ];    } else if (this.config.provider === 'anthropic') {
      return this.getFallbackAnthropicModels();
    } else if (this.config.provider === 'gemini') {
      return this.getFallbackGeminiModels();
    } else if (this.config.provider === 'azure-openai') {
      return this.getFallbackAzureOpenAIModels();
    }
    return [];
  }

  /**
   * Fallback Anthropic models (updated as of June 2025)
   */
  private getFallbackAnthropicModels(): string[] {
    return [
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
    return [
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.0-pro',
      'gemini-pro',
      'gemini-pro-vision'
    ];
  }
  /**
   * Fallback Azure OpenAI models (updated as of June 2025)
   */
  private getFallbackAzureOpenAIModels(): string[] {
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
}
