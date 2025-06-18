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
    } else {      console.log('EnhancedLLMService: Creating fallback MCPClient with basic servers');
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
          name: 'external-lokka',
          type: 'external-lokka',
          port: 3003,
          enabled: true,
          url: 'http://localhost:3003',
          command: 'npx',
          args: ['-y', '@merill/lokka']
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
            ) : undefined;          // Ensure method is lowercase as required by Lokka MCP
          const method = (analysis.graphMethod || 'get').toLowerCase();
            // Use external-lokka server directly
          const serverName = 'external-lokka';
          const toolName = 'microsoft_graph_query';
          
          console.log(`🔧 EnhancedLLMService: Using MCP server: ${serverName}, tool: ${toolName}`);
          
          mcpResults.lokkaResult = await this.mcpClient.callTool(serverName, toolName, {
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
  private async analyzeQuery(query: string): Promise<QueryAnalysis> {    const systemPrompt = `You are an expert analyzer for Microsoft Graph API queries. Analyze the user's query and determine:

1. Does the query need documentation or permission information? (Fetch MCP)
2. Does the query need to access Microsoft Graph data? (Lokka MCP) 
3. What specific Graph endpoint should be called?
4. What parameters should be used?

Examples:
- "List all users" -> needs Lokka MCP, endpoint: "/users", method: "get"
- "How many users do we have?" -> needs Lokka MCP, endpoint: "/users/$count", method: "get", params: {"ConsistencyLevel": "eventual"}
- "Count of user accounts" -> needs Lokka MCP, endpoint: "/users/$count", method: "get", params: {"ConsistencyLevel": "eventual"}
- "What permissions does User.Read give me?" -> needs Fetch MCP for permission info
- "Show me guest accounts" -> needs Lokka MCP, endpoint: "/users", method: "get", filter: userType eq 'Guest'
- "How do I authenticate to Graph?" -> needs Fetch MCP for documentation

IMPORTANT: 
- Always use lowercase HTTP methods (get, post, put, delete, patch)
- For count queries, use /$count endpoints with ConsistencyLevel parameter
- Never use /me endpoint with client credentials authentication

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
    
    // Determine specific endpoint based on query content
    if (lowerQuery.includes('how many') || lowerQuery.includes('count') || lowerQuery.includes('number of')) {
      if (lowerQuery.includes('user')) {
        graphEndpoint = '/users/$count';
        graphParams = { 'ConsistencyLevel': 'eventual' };
      } else if (lowerQuery.includes('group')) {
        graphEndpoint = '/groups/$count';
        graphParams = { 'ConsistencyLevel': 'eventual' };
      }
    } else if (lowerQuery.includes('users')) {
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
      
      // Debug logging to understand what data we're working with
      console.log('🔍 Raw Lokka MCP result:', {
        result: mcpResults.lokkaResult,
        resultType: typeof mcpResults.lokkaResult,
        isString: typeof mcpResults.lokkaResult === 'string',
        isObject: typeof mcpResults.lokkaResult === 'object',
        hasContent: mcpResults.lokkaResult && typeof mcpResults.lokkaResult === 'object' && 'content' in mcpResults.lokkaResult,
        hasResult: mcpResults.lokkaResult && typeof mcpResults.lokkaResult === 'object' && 'result' in mcpResults.lokkaResult
      });
        // Try different response formats
      if (typeof mcpResults.lokkaResult === 'string') {
        // Direct string result (like "52")
        lokkaData = mcpResults.lokkaResult;
      } else if (mcpResults.lokkaResult && typeof mcpResults.lokkaResult === 'object') {
        if (mcpResults.lokkaResult.content) {
          // MCP protocol format with content array
          const textContent = mcpResults.lokkaResult.content.find((item: any) => item.type === 'text');
          const jsonContent = mcpResults.lokkaResult.content.find((item: any) => item.type === 'json');
          
          if (textContent && textContent.text) {
            // Handle text content - try to extract actual data
            const text = textContent.text;
            
            // Check if it's a Lokka API result format
            if (text.includes('Result for graph API')) {
              // Extract the actual result after the header
              const lines = text.split('\n');
              const resultStartIndex = lines.findIndex((line: string) => line.trim() === '') + 1;
              if (resultStartIndex > 0 && resultStartIndex < lines.length) {
                const resultText = lines.slice(resultStartIndex).join('\n').trim();
                
                // Try to parse as JSON
                try {
                  lokkaData = JSON.parse(resultText);
                } catch {
                  // If not JSON, use as-is (like "52")
                  lokkaData = resultText;
                }
              } else {
                lokkaData = text;
              }
            } else {
              // Regular text content
              lokkaData = text;
            }
          } else if (jsonContent && jsonContent.json) {
            lokkaData = jsonContent.json;
          }
        } else if (mcpResults.lokkaResult.result) {
          // Result property format
          lokkaData = mcpResults.lokkaResult.result;
        } else {
          // Raw object format
          lokkaData = mcpResults.lokkaResult;
        }
      }
        if (lokkaData !== null && lokkaData !== undefined) {
        console.log('🔍 Processing Lokka data:', {
          dataType: typeof lokkaData,
          isString: typeof lokkaData === 'string',
          isObject: typeof lokkaData === 'object',
          data: lokkaData
        });
          // Handle different data types
        let finalLokkaData = lokkaData;
          if (typeof lokkaData === 'string') {
          // Try to parse string as JSON first
          try {
            const parsed = JSON.parse(lokkaData);
            finalLokkaData = parsed;
            console.log('🔍 Successfully parsed string data as JSON');
          } catch {
            // If not JSON, create a meaningful structure for simple values
            if (/^\d+$/.test(lokkaData.trim())) {
              // Numeric string like "52"
              finalLokkaData = parseInt(lokkaData.trim());
              console.log('🔍 Converted numeric string to number');
            } else {
              // Other string content - try to parse as JSON one more time with error handling
              try {
                // Sometimes JSON might have extra whitespace or formatting
                const cleanedData = lokkaData.trim();
                if (cleanedData.startsWith('{') || cleanedData.startsWith('[')) {
                  finalLokkaData = JSON.parse(cleanedData);
                  console.log('🔍 Successfully parsed cleaned JSON string');
                } else {
                  finalLokkaData = { result: lokkaData };
                  console.log('🔍 Wrapped string in result object');
                }
              } catch {
                finalLokkaData = { result: lokkaData };
                console.log('🔍 Wrapped string in result object (fallback)');
              }
            }
          }
        } else if (lokkaData && typeof lokkaData === 'object') {
          // Extract result from various possible response structures
          if (lokkaData.value && Array.isArray(lokkaData.value)) {
            // Common Graph API response format with 'value' array
            finalLokkaData = lokkaData.value;
            console.log('🔍 Extracted data from .value array');
          } else if (lokkaData.result && typeof lokkaData.result === 'object') {
            // Nested result format
            finalLokkaData = lokkaData.result;
            // Check for further nesting in another 'value' property
            if (finalLokkaData.value && Array.isArray(finalLokkaData.value)) {
              finalLokkaData = finalLokkaData.value;
              console.log('🔍 Extracted data from nested .result.value');
            }
          } else {
            console.log('🔍 Using object data as-is');
          }
        }
          
        // Prepare user-friendly context based on data type
        if (typeof finalLokkaData === 'number') {
          // Simple count
          contextData += `Microsoft Graph Data (Count): ${finalLokkaData}\n\n`;
        } else if (Array.isArray(finalLokkaData)) {
          // Array of objects - provide structured summary
          contextData += `Microsoft Graph Data (${finalLokkaData.length} items):\n`;
          
          // Add a summary of the data structure for the LLM
          if (finalLokkaData.length > 0) {
            const sampleItem = finalLokkaData[0];
            if (sampleItem && typeof sampleItem === 'object') {
              const keys = Object.keys(sampleItem);
              contextData += `Data structure includes: ${keys.join(', ')}\n`;
                    // For user data, provide a sample formatted entry
              if (keys.includes('displayName') || keys.includes('userPrincipalName')) {
                contextData += 'Sample entry format: Name (Title) - Email\n';
              }
            }
          }
          
          // Add raw data with intelligent truncation for large datasets
          const rawDataString = JSON.stringify(finalLokkaData, null, 2);
          const MAX_CONTEXT_SIZE = 100000; // 100KB limit for context data
          
          if (rawDataString.length > MAX_CONTEXT_SIZE) {
            // For large datasets, provide summary + sample data
            console.log(`🔍 Large dataset detected (${rawDataString.length} chars), truncating...`);
            
            // If it's secure score data, provide a meaningful summary
            if (finalLokkaData[0] && finalLokkaData[0].currentScore !== undefined) {
              const latest = finalLokkaData[0];
              const summary = {
                latestScore: latest.currentScore,
                maxScore: latest.maxScore,
                percentage: Math.round((latest.currentScore / latest.maxScore) * 100),
                date: latest.createdDateTime,
                activeUserCount: latest.activeUserCount,
                tenantId: latest.azureTenantId,
                totalRecords: finalLokkaData.length
              };
              
              contextData += `Raw data summary: ${JSON.stringify(summary, null, 2)}\n`;
              contextData += `Note: Full dataset contains ${finalLokkaData.length} records but is too large to include completely.\n\n`;
            } else {
              // Generic truncation for other large datasets
              const truncatedData = finalLokkaData.slice(0, 3); // Show first 3 items
              contextData += `Raw data (first 3 of ${finalLokkaData.length} items): ${JSON.stringify(truncatedData, null, 2)}\n`;
              contextData += `Note: Dataset truncated due to size (${rawDataString.length} chars). Showing first 3 items only.\n\n`;
            }
          } else {
            // Small enough to include in full
            contextData += `Raw data: ${rawDataString}\n\n`;
          }        } else if (typeof finalLokkaData === 'object') {
          // Single object - check size before including
          const rawDataString = JSON.stringify(finalLokkaData, null, 2);
          const MAX_CONTEXT_SIZE = 100000; // 100KB limit
          
          if (rawDataString.length > MAX_CONTEXT_SIZE) {
            console.log(`🔍 Large single object detected (${rawDataString.length} chars), providing summary...`);
            
            // Provide object structure summary instead of full data
            const keys = Object.keys(finalLokkaData);
            const summary = {
              dataType: 'Single object',
              keys: keys,
              keyCount: keys.length,
              sizeInfo: `${rawDataString.length} characters (too large to display fully)`
            };
            
            contextData += `Microsoft Graph Data (Single large object):\n${JSON.stringify(summary, null, 2)}\n\n`;
          } else {
            contextData += `Microsoft Graph Data (Single object):\n${rawDataString}\n\n`;
          }        } else {
          // Other types - apply same size check
          const rawDataString = JSON.stringify(finalLokkaData, null, 2);
          const MAX_CONTEXT_SIZE = 100000; // 100KB limit
          
          if (rawDataString.length > MAX_CONTEXT_SIZE) {
            console.log(`🔍 Large data of type ${typeof finalLokkaData} detected (${rawDataString.length} chars), providing summary...`);
            contextData += `Microsoft Graph Data (${typeof finalLokkaData}):\nData too large to display (${rawDataString.length} characters)\n\n`;
          } else {
            contextData += `Microsoft Graph Data:\n${rawDataString}\n\n`;
          }
        }
        
        console.log('🔍 Added context data:', {
          finalLokkaData,
          contextLength: contextData.length,
          contextPreview: contextData.substring(0, 200)
        });
      } else {
        console.log('🔍 No lokkaData extracted from result');
      }
    }    const systemPrompt = `You are an expert Microsoft Entra (Azure AD) and Microsoft Graph API assistant.

${contextData ? `Here is the relevant data retrieved from Microsoft Graph and documentation:
${contextData}

🚨 CRITICAL ANTI-HALLUCINATION INSTRUCTIONS - MUST FOLLOW EXACTLY 🚨:
1. Use ONLY the data provided in the context above
2. You MUST use ONLY the exact numbers from this data
3. If the data shows "553.4", you MUST say "553.4" - NEVER any other number
4. DO NOT perform ANY mathematical operations on the numbers
5. DO NOT round, estimate, or approximate - use the EXACT number shown
6. DO NOT say "about" or "approximately" - state the precise number
7. The number in the data is the FINAL ANSWER - do not change it
8. If asked for a score and the data shows 553.4, your answer MUST contain "553.4"
9. NEVER generate different numbers than what is provided in the data
10. Base your response ONLY on the context data provided above

📋 RESPONSE FORMATTING INSTRUCTIONS (Claude Desktop Style):
1. NEVER show raw JSON data to the user
2. Start with a clear, prominent summary using ## heading
3. Use markdown formatting extensively:
   - ## for main headings
   - ### for subsections  
   - **Bold** for important numbers and key terms
   - - Bullet points for lists
   - > Blockquotes for important insights
   - \`code\` for technical terms or IDs
   - Tables for structured data comparison
4. For user lists: create clean tables or bullet points with:
   - **Name** (Title/Role) - email@domain.com
5. For counts: make numbers prominent with **bold formatting**
6. Add insights section with > blockquotes
7. Structure like this:
   ## Summary
   [Direct answer with key numbers in bold]
   
   ### Details
   [Organized data presentation]
   
   ### Key Insights
   > [Analysis and patterns]
8. Use emojis sparingly for visual appeal (📊 📈 👥 🏢)
9. End with helpful context about what the data means

VERIFICATION CHECK: What number does the data show? You must use that exact number in your response.` : ''}

You are responding to user queries about Microsoft Graph API and Entra ID.
${contextData ? 'Base your response ENTIRELY on the data provided above. Parse and present it in a user-friendly format using the Claude Desktop formatting style above.' : ''}

Response guidelines:
- Start with a ## Summary section and clear, direct answer
- Present data in organized, visually appealing markdown format
- For user accounts: use tables or clean bullet lists with names, titles, emails
- For counts: use **bold** to make numbers prominent
- Add a ### Key Insights section with > blockquotes
- Use proper markdown headings, tables, and formatting
- Be helpful and informative while staying strictly accurate to the provided data

If you received documentation, summarize the key points accurately.`;

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
    ];    try {
      console.log('🔍 About to call final LLM with context:', {
        contextData,
        systemPromptLength: systemPrompt.length,
        originalQuery,
        messagesLength: responseMessages.length
      });
      
      const response = await this.basicChat(responseMessages);
      
      console.log('🔍 Final LLM response received:', {
        hasContext: !!contextData,
        contextLength: contextData.length,
        responseLength: response.length,
        type: typeof response,
        preview: response.substring(0, 100),
        containsFiftyTwo: response.includes('52'),
        containsTwentyTwo: response.includes('22'),
        fullResponse: response
      });
      
      // Post-process response to catch and fix hallucinations
      let correctedResponse = response;
      
      // If we have Lokka data that's a simple number, validate the response mentions the correct number
      if (mcpResults.lokkaResult && contextData.includes('Microsoft Graph Data:')) {
        try {
          // Extract the actual number from the context
          const contextMatch = contextData.match(/Microsoft Graph Data:\s*(\d+)/);
          if (contextMatch && contextMatch[1]) {
            const actualNumber = contextMatch[1];
            console.log('🔍 Validating response contains actual number:', actualNumber);
            
            // Check if response contains the correct number
            if (!response.includes(actualNumber)) {
              console.warn('🚨 HALLUCINATION DETECTED: Response does not contain correct number', actualNumber);
              
              // Try to fix the response by replacing incorrect numbers
              const numberPattern = /\b(\d+)\s+user accounts?\b/gi;
              const matches = [...response.matchAll(numberPattern)];
              
              if (matches.length > 0) {
                console.log('🔧 Attempting to fix hallucinated numbers in response');
                correctedResponse = response.replace(numberPattern, (match, number) => {
                  if (number !== actualNumber) {
                    console.log(`🔧 Replacing hallucinated number ${number} with correct number ${actualNumber}`);
                    return match.replace(number, actualNumber);
                  }
                  return match;
                });
                
                // Also ensure the response explicitly states the correct number
                if (!correctedResponse.includes(`**${actualNumber}**`)) {
                  correctedResponse = correctedResponse.replace(
                    /Based on the query results,.*?\./,
                    `Based on the query results, there are **${actualNumber}** user accounts in your Microsoft Entra tenant.`
                  );
                }
              }
            }
          }
        } catch (validationError) {
          console.warn('Response validation error:', validationError);
        }
      }
      
      if (correctedResponse !== response) {
        console.log('🔧 Response corrected to fix hallucination:', {
          original: response,
          corrected: correctedResponse
        });
      }
      
      return correctedResponse;    } catch (error) {
      console.error('Failed to generate final response:', error);
      
      // Check if we actually have any useful data to share
      const hasData = contextData && contextData.trim().length > 0;
      
      if (hasData) {
        return `I encountered an error while processing your request: ${error}. However, I was able to retrieve some data that might be helpful:\n\n${contextData}`;
      } else {
        // No data was retrieved, provide a cleaner error message
        return `I encountered an error while processing your request: ${error}\n\nPlease try again or switch to a different LLM provider if the issue persists.`;
      }
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
      
      // Enhanced error handling for better user experience
      const enhancedError = this.createUserFriendlyError(error, this.config.provider);
      throw enhancedError;
    }
  }
  /**
   * Create user-friendly error messages based on error type and provider
   */
  private createUserFriendlyError(error: any, provider: string): Error {
    // Handle Axios errors (HTTP requests)
    if (error.response && error.response.status) {
      const status = error.response.status;
      const providerName = this.getProviderDisplayName(provider);
        // Special handling for Ollama-specific errors
      if (provider === 'ollama' && error.response.data) {
        let ollamaError = '';
        
        // Try multiple possible error response structures
        if (error.response.data.error) {
          ollamaError = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          ollamaError = error.response.data;
        } else if (error.response.data.message) {
          ollamaError = error.response.data.message;
        } else {
          // Fallback: convert data to string and look for error patterns
          const dataStr = JSON.stringify(error.response.data);
          ollamaError = dataStr;
        }
        
        console.log(`[EnhancedLLMService] Processing Ollama error: "${ollamaError}"`);
        
        // Check for memory-related errors
        if (ollamaError.includes('requires more system memory') || ollamaError.includes('out of memory')) {
          const memoryMatch = ollamaError.match(/requires more system memory \(([^)]+)\) than is available \(([^)]+)\)/);
          if (memoryMatch) {
            const required = memoryMatch[1];
            const available = memoryMatch[2];
            return new Error(`🧠 **Local LLM Memory Error**: The ${this.config.model} model requires **${required}** of system memory, but only **${available}** is available. 
            
**Solutions:**
• Switch to a smaller model (e.g., codellama:3b or llama3.2:1b)
• Close other applications to free memory
• Use a cloud LLM provider instead
• Increase your system's available memory`);
          } else {
            return new Error(`🧠 **Local LLM Memory Error**: ${ollamaError}

**Solutions:**
• Try a smaller model
• Close other applications to free memory  
• Switch to a cloud LLM provider`);
          }
        }
        
        // Check for model loading errors
        if (ollamaError.includes('model not found') || ollamaError.includes('pull model')) {
          return new Error(`📥 **Local LLM Model Error**: The model "${this.config.model}" is not available locally.

**Solutions:**
• Run: \`ollama pull ${this.config.model}\` to download the model
• Choose a different model that's already downloaded
• Switch to a cloud LLM provider`);
        }
        
        // Check for context length errors
        if (ollamaError.includes('context length') || ollamaError.includes('too long')) {
          return new Error(`📝 **Local LLM Context Error**: The message is too long for the ${this.config.model} model.

**Solutions:**
• Try a shorter question
• Use a model with larger context (e.g., llama3.1 or qwen2.5)
• Switch to a cloud LLM provider with larger context`);
        }
        
        // Other Ollama-specific errors
        if (ollamaError.trim()) {
          return new Error(`🤖 **Local LLM Error**: ${ollamaError}

**Suggestion:** Try switching to a cloud LLM provider for more reliable performance.`);
        }
      }
      
      switch (status) {
        case 429:
          return new Error(`${providerName} rate limit exceeded. Please wait a moment before trying again, or switch to a different LLM provider.`);
        
        case 401:
          return new Error(`${providerName} authentication failed. Please check your API key in the settings.`);
        
        case 403:
          return new Error(`${providerName} access forbidden. Please verify your API key has the necessary permissions.`);
        
        case 404:
          return new Error(`${providerName} endpoint not found. The requested model may not be available.`);
        
        case 500:
        case 502:
        case 503:
        case 504:
          return new Error(`${providerName} is experiencing server issues. Please try again later or switch to a different provider.`);
        
        default:
          return new Error(`${providerName} request failed with status ${status}. Please check your configuration and try again.`);
      }
    }
    
    // Handle network/connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      const providerName = this.getProviderDisplayName(provider);
      
      // Special handling for Ollama connection errors
      if (provider === 'ollama') {
        return new Error(`🔌 **Local LLM Connection Error**: Cannot connect to Ollama at http://localhost:11434

**Solutions:**
• Start Ollama: \`ollama serve\`
• Check if Ollama is running in the background
• Verify Ollama is installed correctly
• Switch to a cloud LLM provider`);
      }
      
      return new Error(`Cannot connect to ${providerName}. Please check your internet connection and provider configuration.`);
    }
    
    // Handle timeout errors
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      const providerName = this.getProviderDisplayName(provider);
      
      if (provider === 'ollama') {
        return new Error(`⏱️ **Local LLM Timeout**: ${providerName} request timed out. The model may be too large or your system too slow.

**Solutions:**
• Try a smaller/faster model
• Reduce the context length
• Close other applications
• Switch to a cloud LLM provider`);
      }
      
      return new Error(`${providerName} request timed out. The service may be slow or overloaded. Please try again.`);
    }
    
    // Fallback for other errors
    const providerName = this.getProviderDisplayName(provider);
    return new Error(`${providerName} communication failed: ${error.message || 'Unknown error'}`);
  }

  /**
   * Get user-friendly provider display name
   */
  private getProviderDisplayName(provider: string): string {
    switch (provider.toLowerCase()) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic';
      case 'gemini': return 'Google Gemini';
      case 'azure-openai': return 'Azure OpenAI';
      case 'ollama': return 'Ollama';
      case 'lmstudio': return 'LM Studio';
      default: return provider;
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

  /**
   * Update the configuration dynamically
   */
  updateConfig(newConfig: LLMConfig): void {
    console.log(`[EnhancedLLMService] Updating config from ${this.config.provider} to ${newConfig.provider}`);
    this.config = newConfig;
    
    // Update the unified LLM service config as well
    if (this.unifiedLLM && this.unifiedLLM.updateConfig) {
      this.unifiedLLM.updateConfig(newConfig);
    }
  }
}
