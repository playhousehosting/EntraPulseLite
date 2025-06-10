// Enhanced LLM Service that orchestrates MCP tool usage
// Integrates unified LLM (local/cloud), Fetch MCP, and Lokka MCP components for intelligent query handling

import axios from 'axios';
import { LLMConfig, ChatMessage } from '../types';
import { MCPClient } from '../mcp/clients';
import { MCPAuthService } from '../mcp/auth/MCPAuthService';
import { MCPServerConfig } from '../mcp/types';
import { AuthService } from '../auth/AuthService';
import { UnifiedLLMService } from './UnifiedLLMService';

export interface QueryAnalysis {
  needsFetchMcp: boolean;
  needsLokkaMcp: boolean;
  graphEndpoint?: string;
  graphMethod?: string;
  graphParams?: any;
  documentationQuery?: string;
  permissionQuery?: string;
  confidence: number;
  reasoning: string;
}

export interface EnhancedLLMResponse {
  analysis: QueryAnalysis;
  mcpResults: {
    fetchResult?: any;
    lokkaResult?: any;
  };
  finalResponse: string;
  traceData: {
    steps: string[];
    timing: Record<string, number>;
    errors?: string[];
  };
}

export class EnhancedLLMService {
  private config: LLMConfig;
  private mcpClient: MCPClient;
  private authService: AuthService;
  private mcpAuthService: MCPAuthService;
  private unifiedLLM: UnifiedLLMService;  constructor(config: LLMConfig, authService: AuthService, mcpClient?: MCPClient) {
    this.config = config;
    this.authService = authService;
    this.mcpAuthService = new MCPAuthService(authService);
    
    // Use provided MCPClient or create a fallback one
    if (mcpClient) {
      this.mcpClient = mcpClient;
      console.log('EnhancedLLMService: Using provided MCPClient');
    } else {
      console.log('EnhancedLLMService: Creating fallback MCPClient with basic servers');
      // Initialize MCP client with fallback servers (for backward compatibility)
      const serverConfigs: MCPServerConfig[] = [
        {
          name: 'fetch',
          type: 'fetch',
          port: 3001,
          enabled: true,
          url: 'http://localhost:3001'
        },
        {
          name: 'lokka',
          type: 'lokka',
          port: 3002,
          enabled: true,
          url: 'http://localhost:3002',
          command: 'npx',
          args: ['@merill/lokka', '--stdio']
        }
      ];
      
      this.mcpClient = new MCPClient(serverConfigs, this.mcpAuthService);
    }
    
    // Initialize UnifiedLLMService with MCP client for enhanced model discovery
    this.unifiedLLM = new UnifiedLLMService(config, this.mcpClient);
  }

  /**
   * Enhanced chat method that uses MCP tools intelligently
   */
  async enhancedChat(messages: ChatMessage[]): Promise<EnhancedLLMResponse> {
    const startTime = Date.now();
    const trace: string[] = [];
    const errors: string[] = [];

    try {
      // Step 1: Analyze the user query
      trace.push('Starting query analysis');
      const userQuery = messages[messages.length - 1]?.content || '';
      const analysis = await this.analyzeQuery(userQuery);
      trace.push(`Query analysis completed: ${analysis.reasoning}`);      // Step 2: MCP servers are automatically initialized in constructor
      trace.push('MCP servers ready');

      // Step 3: Execute MCP operations based on analysis
      const mcpResults: { fetchResult?: any; lokkaResult?: any } = {};

      // Fetch MCP for documentation/permissions
      if (analysis.needsFetchMcp) {
        try {
          trace.push('Calling Fetch MCP for documentation');
          const fetchQuery = analysis.documentationQuery || analysis.permissionQuery || userQuery;
          mcpResults.fetchResult = await this.mcpClient.callTool('fetch', 'fetch', {
            url: `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(fetchQuery)}`,
            method: 'GET'
          });
          trace.push('Fetch MCP completed successfully');
        } catch (error) {
          const errorMsg = `Fetch MCP failed: ${error}`;
          errors.push(errorMsg);
          trace.push(errorMsg);
        }
      }

      // Lokka MCP for Microsoft Graph data
      if (analysis.needsLokkaMcp && analysis.graphEndpoint) {
        try {
          trace.push('Calling Lokka MCP for Graph data');
          
          // Convert query parameters to strings as required by Lokka MCP
          const stringifiedQueryParams = analysis.graphParams ? 
            Object.fromEntries(
              Object.entries(analysis.graphParams).map(([key, value]) => [
                key, 
                typeof value === 'string' ? value : String(value)
              ])
            ) : undefined;

          // Ensure method is lowercase as required by Lokka MCP
          const method = (analysis.graphMethod || 'get').toLowerCase();          mcpResults.lokkaResult = await this.mcpClient.callTool('lokka', 'microsoft_graph_query', {
            apiType: 'graph',
            method: method,
            endpoint: analysis.graphEndpoint,
            queryParams: stringifiedQueryParams
          });
          trace.push('Lokka MCP completed successfully');
        } catch (error) {
          const errorMsg = `Lokka MCP failed: ${error}`;
          errors.push(errorMsg);
          trace.push(errorMsg);
        }
      }

      // Step 4: Generate final response using LLM with MCP results
      trace.push('Generating final response with LLM');
      const finalResponse = await this.generateFinalResponse(userQuery, analysis, mcpResults);
      trace.push('Final response generated');

      return {
        analysis,
        mcpResults,
        finalResponse,
        traceData: {
          steps: trace,
          timing: { totalTime: Date.now() - startTime },
          errors: errors.length > 0 ? errors : undefined
        }
      };

    } catch (error) {
      const errorMsg = `Enhanced chat failed: ${error}`;
      errors.push(errorMsg);
      trace.push(errorMsg);
      
      // Fallback to basic chat
      trace.push('Falling back to basic chat');
      const fallbackResponse = await this.basicChat(messages);
      
      return {
        analysis: {
          needsFetchMcp: false,
          needsLokkaMcp: false,
          confidence: 0,
          reasoning: 'Analysis failed, using fallback response'
        },
        mcpResults: {},
        finalResponse: fallbackResponse,
        traceData: {
          steps: trace,
          timing: { totalTime: Date.now() - startTime },
          errors
        }
      };
    }
  }

  /**
   * Analyze the user query to determine what MCP tools are needed
   */
  private async analyzeQuery(query: string): Promise<QueryAnalysis> {
    const systemPrompt = `You are an expert analyzer for Microsoft Graph API queries. Analyze the user's query and determine:

1. Does the query need documentation or permission information? (Fetch MCP)
2. Does the query need to access Microsoft Graph data? (Lokka MCP) 
3. What specific Graph endpoint should be called?
4. What parameters should be used?

Examples:
- "List all users" -> needs Lokka MCP, endpoint: /users, method: "get"
- "What permissions does User.Read give me?" -> needs Fetch MCP for permission info
- "Show me guest accounts" -> needs Lokka MCP, endpoint: /users, method: "get", filter: userType eq 'Guest'
- "How do I authenticate to Graph?" -> needs Fetch MCP for documentation

IMPORTANT: Always use lowercase HTTP methods (get, post, put, delete, patch).

Respond ONLY with a JSON object in this exact format:
{
  "needsFetchMcp": boolean,
  "needsLokkaMcp": boolean,
  "graphEndpoint": "string or null",
  "graphMethod": "lowercase HTTP method (get, post, put, delete, patch) or null", 
  "graphParams": object or null,
  "documentationQuery": "string or null",
  "permissionQuery": "string or null",
  "confidence": number (0-1),
  "reasoning": "brief explanation"
}`;

    const analysisMessages: ChatMessage[] = [
      { 
        id: `analysis-system-${Date.now()}`,
        role: 'system', 
        content: systemPrompt,
        timestamp: new Date()
      },
      { 
        id: `analysis-user-${Date.now()}`,
        role: 'user', 
        content: `Analyze this query: "${query}"`,
        timestamp: new Date()
      }
    ];

    try {
      const response = await this.basicChat(analysisMessages);
      
      // Try to parse the JSON response - be more flexible about format
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const analysis = JSON.parse(jsonMatch[0]);
          return {
            needsFetchMcp: Boolean(analysis.needsFetchMcp),
            needsLokkaMcp: Boolean(analysis.needsLokkaMcp),
            graphEndpoint: analysis.graphEndpoint || undefined,
            graphMethod: analysis.graphMethod || undefined,
            graphParams: analysis.graphParams || undefined,
            documentationQuery: analysis.documentationQuery || undefined,
            permissionQuery: analysis.permissionQuery || undefined,
            confidence: Number(analysis.confidence) || 0.5,
            reasoning: String(analysis.reasoning || 'Analysis completed')
          };
        } catch (parseError) {
          console.warn('Failed to parse JSON from LLM response:', parseError);
          console.warn('LLM Response:', response);
        }
      } else {
        console.warn('No JSON found in LLM response:', response);
      }
    } catch (error) {
      console.warn('LLM analysis request failed:', error);
    }

    // Fallback to heuristic analysis
    return this.heuristicAnalysis(query);
  }

  /**
   * Fallback heuristic analysis when LLM analysis fails
   */
  private heuristicAnalysis(query: string): QueryAnalysis {
    const lowerQuery = query.toLowerCase();
    
    // Keywords that suggest Graph data access
    const graphKeywords = ['users', 'groups', 'me', 'mail', 'calendar', 'contacts', 'teams', 'sites', 'files', 'list', 'show', 'get', 'find', 'count'];
    const needsLokkaMcp = graphKeywords.some(keyword => lowerQuery.includes(keyword));
    
    // Keywords that suggest documentation/permission needs
    const docsKeywords = ['permission', 'scope', 'authenticate', 'how to', 'what is', 'explain', 'documentation'];
    const needsFetchMcp = docsKeywords.some(keyword => lowerQuery.includes(keyword));
    
    let graphEndpoint = '/me'; // Default endpoint
    let graphParams: any = undefined;
    
    // Determine specific endpoint based on query
    if (lowerQuery.includes('users')) {
      graphEndpoint = '/users';
      if (lowerQuery.includes('guest')) {
        graphParams = { '$filter': "userType eq 'Guest'" };
      }
    } else if (lowerQuery.includes('groups')) {
      graphEndpoint = '/groups';
    } else if (lowerQuery.includes('mail')) {
      graphEndpoint = '/me/messages';
    }

    return {
      needsFetchMcp,
      needsLokkaMcp,
      graphEndpoint: needsLokkaMcp ? graphEndpoint : undefined,
      graphMethod: 'get', // Use lowercase as required by Lokka MCP
      graphParams,
      documentationQuery: needsFetchMcp ? query : undefined,
      confidence: 0.7,
      reasoning: 'Used heuristic analysis as fallback'
    };
  }
  /**
   * Generate the final response using LLM with MCP results
   */
  private async generateFinalResponse(
    originalQuery: string, 
    analysis: QueryAnalysis, 
    mcpResults: { fetchResult?: any; lokkaResult?: any }
  ): Promise<string> {
    
    let contextData = '';
    
    // Prepare context from Fetch MCP results
    if (mcpResults.fetchResult?.content) {
      const textContent = mcpResults.fetchResult.content.find((item: any) => item.type === 'text');
      if (textContent?.text) {
        contextData += `Documentation Context:\n${textContent.text}\n\n`;
      }
    }
    
    // Prepare context from Lokka MCP results - handle multiple possible response formats
    if (mcpResults.lokkaResult) {
      let lokkaData = null;
      
      // Try different response formats
      if (mcpResults.lokkaResult.content) {
        // MCP protocol format with content array
        const jsonContent = mcpResults.lokkaResult.content.find((item: any) => item.type === 'json' || item.type === 'text');
        if (jsonContent) {
          lokkaData = jsonContent.json || jsonContent.text;
        }
      } else if (mcpResults.lokkaResult.result) {
        // Result property format
        lokkaData = mcpResults.lokkaResult.result;
      } else {
        // Raw object format
        lokkaData = mcpResults.lokkaResult;
      }
      
      if (lokkaData) {
        // Debug logging to understand what data we're working with
        console.log('Lokka MCP result structure:', {
          hasResult: !!mcpResults.lokkaResult,
          hasContent: !!mcpResults.lokkaResult.content,
          isObject: typeof mcpResults.lokkaResult === 'object',
          keys: Object.keys(mcpResults.lokkaResult || {}),
          dataType: typeof lokkaData,
          dataKeys: lokkaData && typeof lokkaData === 'object' ? Object.keys(lokkaData) : 'N/A'
        });
        
        // Extract result from various possible response structures
        let finalLokkaData = lokkaData;
        if (lokkaData.value && Array.isArray(lokkaData.value)) {
          // Common Graph API response format with 'value' array
          finalLokkaData = lokkaData.value;
        } else if (lokkaData.result && typeof lokkaData.result === 'object') {
          // Nested result format
          finalLokkaData = lokkaData.result;
          // Check for further nesting in another 'value' property
          if (finalLokkaData.value && Array.isArray(finalLokkaData.value)) {
            finalLokkaData = finalLokkaData.value;
          }
        }
        
        contextData += `Microsoft Graph Data:\n${JSON.stringify(finalLokkaData, null, 2)}\n\n`;
      }
    }
    
    const systemPrompt = `You are an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant.

${contextData ? `Here is the relevant data retrieved from Microsoft Graph and documentation:\n${contextData}` : ''}

Please provide a helpful, accurate, and actionable response based on the data above.
If you received Graph data, analyze it and provide insights.
If you received documentation, summarize the key points.
Be concise but thorough in your response.`;

    const responseMessages: ChatMessage[] = [
      { 
        id: `response-system-${Date.now()}`,
        role: 'system', 
        content: systemPrompt,
        timestamp: new Date()
      },
      { 
        id: `response-user-${Date.now()}`,
        role: 'user', 
        content: originalQuery,
        timestamp: new Date()
      }
    ];

    try {
      const response = await this.basicChat(responseMessages);
      console.log('Final response generated:', {
        hasContext: !!contextData,
        contextLength: contextData.length,
        responseLength: response.length,
        type: typeof response,
        preview: response.substring(0, 100)
      });
      return response;
    } catch (error) {
      console.error('Failed to generate final response:', error);
      return `I encountered an error while processing your request: ${error}. However, I was able to retrieve some data that might be helpful:\n\n${contextData}`;
    }
  }  /**
   * Basic chat method for fallback and internal use
   */
  async basicChat(messages: ChatMessage[]): Promise<string> {
    try {
      console.log('basicChat called with provider:', this.config.provider);
      console.log('basicChat messages:', messages.length);
      
      // We're using the unified LLM service, which now automatically handles query extraction
      // for both local and cloud LLM services
      const response = await this.unifiedLLM.chat(messages);
      
      console.log('basicChat response:', {
        length: response.length,
        hasContent: !!response && response.trim().length > 0,
        hasExecuteQueryTags: response.includes('<execute_query>')
      });
      
      return response;
    } catch (error) {
      console.error('Basic chat failed:', error);
      throw new Error(`Failed to communicate with LLM: ${(error as Error).message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.unifiedLLM.isAvailable();
  }

  async getAvailableModels(): Promise<string[]> {
    return this.unifiedLLM.getAvailableModels();
  }

  /**
   * Cleanup method to shut down MCP servers
   */
  async shutdown(): Promise<void> {
    try {
      await this.mcpClient.stopAllServers();
    } catch (error) {
      console.error('Error shutting down MCP servers:', error);
    }
  }
}
