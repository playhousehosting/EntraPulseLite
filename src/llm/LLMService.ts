// Local LLM service for Ollama/LM Studio integration
import axios from 'axios';
import { LLMConfig, ChatMessage } from '../types';
import { StandardizedPrompts } from '../shared/StandardizedPrompts';

export class LLMService {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      if (this.config.provider === 'ollama') {
        return this.chatWithOllama(messages);
      } else if (this.config.provider === 'lmstudio') {
        return this.chatWithLMStudio(messages);
      } else {
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
      }    } catch (error) {
      console.error('LLM chat failed:', error);
      
      // Provide more specific error messages
      if (error && typeof error === 'object') {
        if ('code' in error) {
          switch (error.code) {
            case 'ECONNRESET':
              throw new Error(`Connection to ${this.config.provider} was reset. The model may have run out of resources or the request was too large.`);
            case 'ECONNREFUSED':
              throw new Error(`Cannot connect to ${this.config.provider} at ${this.config.baseUrl}. Please ensure ${this.config.provider} is running.`);
            case 'ETIMEDOUT':
              throw new Error(`Timeout communicating with ${this.config.provider}. The request may be too complex or the model is overloaded.`);
            default:
              throw new Error(`Network error communicating with ${this.config.provider}: ${error.code}`);
          }
        }        if ('response' in error && error.response && typeof error.response === 'object') {
          const response = error.response as any;
          const status = response.status || 'Unknown status';
          const statusText = response.statusText || 'Unknown error';
          throw new Error(`${this.config.provider} returned error ${status}: ${statusText}`);
        }
      }
      
      throw new Error(`Failed to communicate with ${this.config.provider}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }  async isAvailable(): Promise<boolean> {
    try {
      if (this.config.provider === 'ollama') {
        // First check if Ollama is running
        const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
          timeout: 5000,
        });
        
        if (response.status !== 200) {
          return false;
        }
        
        // Check if the specific model is available
        if (this.config.model) {
          const models = response.data.models || [];
          const modelExists = models.some((model: any) => 
            model.name === this.config.model || 
            model.name.startsWith(this.config.model + ':')
          );
          
          if (!modelExists) {
            console.log(`Model "${this.config.model}" not found in Ollama. Available models:`, 
              models.map((m: any) => m.name).join(', '));
            return false;
          }
        }
        
        return true;
      } else if (this.config.provider === 'lmstudio') {
        // First check if LM Studio is running
        const response = await axios.get(`${this.config.baseUrl}/v1/models`, {
          timeout: 5000,
        });
        
        if (response.status !== 200) {
          return false;
        }
        
        // Check if the specific model is available
        if (this.config.model) {
          const models = response.data.data || [];
          const modelExists = models.some((model: any) => 
            model.id === this.config.model || 
            model.id.includes(this.config.model)
          );
          
          if (!modelExists) {
            console.log(`Model "${this.config.model}" not found in LM Studio. Available models:`, 
              models.map((m: any) => m.id).join(', '));
            return false;
          }
        }
        
        return true;
      }
      return false;
    } catch (error) {
      // Don't log connection refused errors as they're expected when LLM is not running
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ECONNREFUSED') {
        console.log(`${this.config.provider} is not running at ${this.config.baseUrl}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('LLM availability check failed:', errorMessage);
      }
      return false;
    }
  }  private async chatWithOllama(messages: ChatMessage[]): Promise<string> {
    const ollamaMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Check if a system prompt is already provided in the messages
    const hasSystemPrompt = messages.some(msg => msg.role === 'system');
    
    let fullMessages;
    if (hasSystemPrompt) {
      // Use the provided system prompt (from EnhancedLLMService)
      fullMessages = ollamaMessages;
      console.log(`[LLMService] Using provided system prompt (${fullMessages[0]?.content?.length || 0} chars)`);
    } else {
      // Use standardized system prompt for direct calls
      const systemPrompt = StandardizedPrompts.getSystemPrompt(this.config.provider);
      fullMessages = [
        { role: 'system', content: systemPrompt },
        ...ollamaMessages
      ];
      console.log(`[LLMService] Using standard system prompt (${systemPrompt.length} chars)`);
    }

    // Calculate total message size for debugging
    const totalChars = fullMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
    console.log(`[LLMService] Sending ${fullMessages.length} messages, total ${totalChars} characters to Ollama`);
    
    // Log system message length specifically since that's often the largest
    const systemMsg = fullMessages.find(msg => msg.role === 'system');
    if (systemMsg) {
      console.log(`[LLMService] System message length: ${systemMsg.content?.length || 0} characters`);
    }const response = await axios.post(`${this.config.baseUrl}/api/chat`, {
      model: this.config.model,
      messages: fullMessages,
      stream: false,
      options: {
        temperature: this.config.temperature || 0.2,
        num_predict: this.config.maxTokens || 2048,
        // Add specific timeout and resource limits for Ollama
        timeout: 120000, // 2 minutes timeout
        keep_alive: "5m",
        num_ctx: 8192, // Increase context window
      },
    }, {
      timeout: 120000, // 2 minute HTTP timeout
      // Add request interceptor to handle large payloads
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    return response.data.message.content;
  }  private async chatWithLMStudio(messages: ChatMessage[]): Promise<string> {
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

    const response = await axios.post(`${this.config.baseUrl}/v1/chat/completions`, {
      model: this.config.model,
      messages: fullMessages,
      temperature: this.config.temperature || 0.2,
      max_tokens: this.config.maxTokens || 2048,
    });

    return response.data.choices[0].message.content;
  }

  /**
   * Get available models from the local LLM service
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      if (this.config.provider === 'ollama') {
        const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
          timeout: 10000,
        });
        
        if (response.status === 200 && response.data.models) {
          return response.data.models.map((model: any) => model.name);
        }
      } else if (this.config.provider === 'lmstudio') {
        const response = await axios.get(`${this.config.baseUrl}/v1/models`, {
          timeout: 10000,
        });
        
        if (response.status === 200 && response.data.data) {
          return response.data.data.map((model: any) => model.id);
        }
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return [];
    }
  }
}
