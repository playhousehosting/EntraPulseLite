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
        return this.chatWithAnthropic(messages);
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
    ];

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: this.config.model || 'gpt-4o-mini',
      messages: fullMessages,
      temperature: this.config.temperature || 0.7,
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

Always be helpful, accurate, and security-conscious in your responses.`;

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: this.config.model || 'claude-3-5-sonnet-20241022',
      max_tokens: this.config.maxTokens || 2048,
      temperature: this.config.temperature || 0.7,
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
          .map((model: any) => model.id) || [];
      } else if (this.config.provider === 'anthropic') {
        return await this.getAnthropicModels();
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
      ];
    } else if (this.config.provider === 'anthropic') {
      return this.getFallbackAnthropicModels();
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
}
