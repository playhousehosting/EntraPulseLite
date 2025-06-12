// Local LLM service for Ollama/LM Studio integration
import axios from 'axios';
import { LLMConfig, ChatMessage } from '../types';

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
      }
    } catch (error) {
      console.error('LLM chat failed:', error);
      throw new Error('Failed to communicate with local LLM');
    }
  }  async isAvailable(): Promise<boolean> {
    try {
      if (this.config.provider === 'ollama') {
        const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
          timeout: 5000,
        });
        return response.status === 200;
      } else if (this.config.provider === 'lmstudio') {
        const response = await axios.get(`${this.config.baseUrl}/v1/models`, {
          timeout: 5000,
        });
        return response.status === 200;
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
  }
  private async chatWithOllama(messages: ChatMessage[]): Promise<string> {
    const ollamaMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const systemPrompt = `You are an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant integrated into EntraPulse Lite. 

You have access to Microsoft Graph APIs through built-in MCP servers and can help users:
- Query user accounts, groups, applications, and service principals
- Understand Microsoft Entra concepts and best practices
- Analyze permissions and security configurations
- Provide natural language explanations of complex directory structures

When users ask questions that require Microsoft Graph API data:
1. ALWAYS create proper Graph query in the following <execute_query> format:
   <execute_query>
   {
     "endpoint": "/users",  // Microsoft Graph API endpoint - REQUIRED
     "method": "get",       // HTTP method (get, post, put, delete, patch) - REQUIRED
     "params": {            // Optional parameters as needed
       "$select": "displayName,mail,userPrincipalName",
       "$filter": "startsWith(displayName, 'A')"
     }
   }
   </execute_query>

2. Explain Microsoft Entra concepts clearly
3. Provide actionable insights about identity and access management
4. Help with troubleshooting and security analysis

Examples of valid queries:
<execute_query>
{
  "endpoint": "/users",
  "method": "get",
  "params": {
    "$filter": "userType eq 'Guest'"
  }
}
</execute_query>

<execute_query>
{
  "endpoint": "/groups",
  "method": "get",
  "params": {
    "$select": "displayName,description"
  }
}
</execute_query>

Always be helpful, accurate, and security-conscious in your responses.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...ollamaMessages
    ];

    const response = await axios.post(`${this.config.baseUrl}/api/chat`, {
      model: this.config.model,
      messages: fullMessages,      stream: false,
      options: {
        temperature: this.config.temperature || 0.2,
        num_predict: this.config.maxTokens || 2048,
      },
    });

    return response.data.message.content;
  }
  private async chatWithLMStudio(messages: ChatMessage[]): Promise<string> {
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

When users ask questions that require Microsoft Graph API data:
1. ALWAYS create proper Graph query in the following <execute_query> format:
   <execute_query>
   {
     "endpoint": "/users",  // Microsoft Graph API endpoint - REQUIRED
     "method": "get",       // HTTP method (get, post, put, delete, patch) - REQUIRED
     "params": {            // Optional parameters as needed
       "$select": "displayName,mail,userPrincipalName",
       "$filter": "startsWith(displayName, 'A')"
     }
   }
   </execute_query>

2. Explain Microsoft Entra concepts clearly
3. Provide actionable insights about identity and access management
4. Help with troubleshooting and security analysis

Examples of valid queries:
<execute_query>
{
  "endpoint": "/users",
  "method": "get",
  "params": {
    "$filter": "userType eq 'Guest'"
  }
}
</execute_query>

<execute_query>
{
  "endpoint": "/groups",
  "method": "get",
  "params": {
    "$select": "displayName,description"
  }
}
</execute_query>

Always be helpful, accurate, and security-conscious in your responses.`;

    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...openaiMessages
    ];

    const response = await axios.post(`${this.config.baseUrl}/v1/chat/completions`, {
      model: this.config.model,      messages: fullMessages,
      temperature: this.config.temperature || 0.2,
      max_tokens: this.config.maxTokens || 2048,
    });

    return response.data.choices[0].message.content;
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      if (this.config.provider === 'ollama') {
        const response = await axios.get(`${this.config.baseUrl}/api/tags`);
        return response.data.models?.map((model: any) => model.name) || [];
      } else if (this.config.provider === 'lmstudio') {
        const response = await axios.get(`${this.config.baseUrl}/v1/models`);
        return response.data.data?.map((model: any) => model.id) || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [];
    }
  }
}
