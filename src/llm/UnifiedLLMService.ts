// Unified LLM service that supports both local and cloud providers
import { LLMConfig, ChatMessage } from '../types';
import { LLMService } from './LLMService';
import { CloudLLMService } from './CloudLLMService';
import { MCPClient } from '../mcp/clients';

// Regular expression for extracting Graph API queries from LLM responses
const EXECUTE_QUERY_REGEX = /<execute_query>([\s\S]*?)<\/execute_query>/g;

export class UnifiedLLMService {
  private localService?: LLMService;
  private cloudService?: CloudLLMService;
  private config: LLMConfig;
  private mcpClient?: MCPClient;

  constructor(config: LLMConfig, mcpClient?: MCPClient) {
    this.config = config;
    this.mcpClient = mcpClient;
    
    // Initialize appropriate service based on provider
    if (config.provider === 'ollama' || config.provider === 'lmstudio') {
      if (!config.baseUrl) {
        throw new Error(`baseUrl is required for ${config.provider}`);
      }
      this.localService = new LLMService(config);    } else if (config.provider === 'openai' || config.provider === 'anthropic') {
      if (!config.apiKey) {
        throw new Error(`apiKey is required for ${config.provider}`);
      }
      // Pass MCP client to CloudLLMService for enhanced model discovery
      this.cloudService = new CloudLLMService(config as any, this.mcpClient);
    } else {
      throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const service = this.getActiveService();
    const response = await service.chat(messages);
    
    // Process any execute_query tags in the response
    if (this.mcpClient && response.includes('<execute_query>')) {
      return await this.processQueriesInResponse(response);
    }
    
    return response;
  }
    /**
   * Process and execute any Microsoft Graph API queries in the LLM response
   */
  private async processQueriesInResponse(response: string): Promise<string> {
    console.log('Processing queries in LLM response...');
    let modifiedResponse = response;
    let queryMatch;
    let hasExecutedQueries = false;
    
    // Find all execute_query blocks
    const queryMatches = [...response.matchAll(EXECUTE_QUERY_REGEX)];
    
    for (const match of queryMatches) {
      try {
        const queryText = match[1].trim();
        console.log('Found query to execute:', queryText);
        
        // Parse the query - expecting JSON object with endpoint, method, and optional params
        const query = JSON.parse(queryText);
        
        if (!query.endpoint) {
          console.warn('Invalid query format - missing endpoint:', queryText);
          continue;
        }
        
        // Ensure method is lowercase and defaults to 'get'
        const method = (query.method || 'get').toLowerCase();        // Execute query via Lokka MCP
        console.log(`Executing Graph API query: ${method.toUpperCase()} ${query.endpoint}`);
        
        // Try external-lokka first (if available), then fall back to lokka
        let serverName = 'external-lokka';
        let toolName = 'Lokka-Microsoft';
        
        // Check if external-lokka server is available
        const availableServers = this.mcpClient!.getAvailableServers();
        console.log('Available MCP servers:', availableServers);
        
        if (!availableServers.includes('external-lokka')) {
          console.log('External-lokka not available, trying lokka server');
          serverName = 'lokka';
          toolName = 'microsoft_graph_query';
        }
        
        console.log(`Using MCP server: ${serverName}, tool: ${toolName}`);
          // Convert query parameters to strings as required by Lokka MCP
        const queryParams = query.params || query.queryParams;
        const stringifiedQueryParams = queryParams ? 
          Object.fromEntries(
            Object.entries(queryParams).map(([key, value]) => [
              key, 
              typeof value === 'string' ? value : String(value)
            ])
          ) : undefined;

        const rawResult = await this.mcpClient!.callTool(serverName, toolName, {
          apiType: 'graph',
          method: method,
          path: query.endpoint, // Note: external Lokka uses 'path' instead of 'endpoint'
          queryParams: stringifiedQueryParams
        });
        
        console.log('Lokka MCP response received, type:', typeof rawResult);
        console.log('Lokka MCP response keys:', rawResult ? Object.keys(rawResult) : 'null');
        
        hasExecutedQueries = true;
        
        // Debug logging to understand the response structure
        console.log('Raw Lokka MCP response:', JSON.stringify(rawResult, null, 2));
          // Enhanced result extraction - handle various possible response structures
        let extractedResult: any;

        if (rawResult?.content && Array.isArray(rawResult.content)) {
          // If the result has a content array, look for json or text content
          const jsonContent = rawResult.content.find((item: any) => item.type === 'json');
          const textContent = rawResult.content.find((item: any) => item.type === 'text');

          if (jsonContent?.json) {
            // Found JSON content
            extractedResult = jsonContent.json;
            console.log('Using JSON content from response');
          } else if (textContent?.text) {
            // Try to parse text content as JSON if possible
            try {
              if (textContent.text.includes('Response from tool microsoft_graph_query with args')) {
                console.log('Detected Lokka MCP debug response - no actual data returned');
                // This means Lokka MCP only returned the query args, not the actual results
                extractedResult = {
                  error: "Lokka MCP Error",
                  message: "Lokka MCP server returned query arguments instead of actual Microsoft Graph API results. This suggests an authentication or configuration issue.",
                  lokkResponse: textContent.text,
                  troubleshooting: {
                    possibleCauses: [
                      "Lokka MCP server authentication failure",
                      "Insufficient permissions for the query",
                      "Lokka MCP server configuration issue",
                      "Network connectivity issue to Microsoft Graph"
                    ],
                    recommendations: [
                      "Check Lokka MCP server logs for authentication errors",
                      "Verify TENANT_ID, CLIENT_ID, and CLIENT_SECRET environment variables",
                      "Ensure the service principal has required Graph API permissions",
                      "Test the external Lokka MCP server directly"
                    ]
                  }
                };
              } else if (textContent.text.includes('Response from tool') || textContent.text.includes('microsoft_graph_query')) {
                console.log('Detected tool response message, extracting actual data...');
                // Look for JSON data in the tool response
                const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  extractedResult = JSON.parse(jsonMatch[0]);
                } else {
                  // Try to extract args if available
                  const toolArgsMatch = textContent.text.match(/args (\{.*\})/);
                  if (toolArgsMatch) {
                    const args = JSON.parse(toolArgsMatch[1]);
                    extractedResult = {
                      warning: "Tool Response Only",
                      message: "Received tool execution confirmation but no actual data",
                      queryExecuted: args
                    };
                  } else {
                    extractedResult = { message: textContent.text };
                  }
                }              } else if (textContent.text.startsWith('Result for graph API')) {
                console.log('Detected Lokka API result, extracting data...');
                // Parse Lokka's formatted response: "Result for graph API - get /path:\n\nDATA"
                
                // Find the JSON data after the header line
                const headerMatch = textContent.text.match(/Result for graph API[^\n]*\n\n(.*)/s);
                if (headerMatch) {
                  const jsonData = headerMatch[1].trim();
                  try {
                    extractedResult = JSON.parse(jsonData);
                    console.log('Parsed Lokka result as JSON');
                  } catch (jsonError) {
                    console.warn('Failed to parse Lokka JSON data:', jsonError);
                    // If not JSON, treat as raw value (like a count)
                    if (!isNaN(Number(jsonData))) {
                      extractedResult = Number(jsonData);
                      console.log('Parsed Lokka result as number:', extractedResult);
                    } else {
                      extractedResult = jsonData;
                      console.log('Using Lokka result as string:', extractedResult);
                    }
                  }
                } else {
                  // Fallback: try to find any JSON in the text
                  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    try {
                      extractedResult = JSON.parse(jsonMatch[0]);
                      console.log('Parsed fallback Lokka JSON');
                    } catch {
                      extractedResult = { message: textContent.text };
                    }
                  } else {
                    extractedResult = { message: textContent.text };
                  }
                }
              } else {
                // Try to parse the entire text as JSON
                extractedResult = JSON.parse(textContent.text);
                console.log('Parsed text content as JSON');
              }} catch (parseError) {
              console.warn('Failed to parse text content as JSON:', parseError);
              extractedResult = { 
                parseError: "JSON Parse Failed",
                message: textContent.text,
                error: parseError instanceof Error ? parseError.message : String(parseError)
              };
            }
          } else {
            console.log('Using content array directly');
            extractedResult = rawResult.content;
          }
        } else if (rawResult?.content && typeof rawResult.content === 'string') {
          // Handle case where content is a string (possible JSON)
          try {
            extractedResult = JSON.parse(rawResult.content);
            console.log('Parsed string content as JSON');
          } catch (parseError) {
            console.warn('Failed to parse string content as JSON:', parseError);
            extractedResult = { message: rawResult.content };
          }
        } else if (rawResult && typeof rawResult === 'object') {
          console.log('Using raw result object directly');
          extractedResult = rawResult;
        } else {
          console.warn('Unexpected response format from Lokka MCP');
          extractedResult = { 
            error: "Unexpected Response Format",
            message: "Query executed but returned unexpected format", 
            rawResponse: rawResult 
          };
        }
          // Format the result for display - create a user-friendly response
        let resultDisplay;
        
        // Special handling for simple count queries
        if (query.endpoint.includes('$count') && typeof extractedResult === 'number') {
          resultDisplay = `The query returned: **${extractedResult}**`;
        } else if (extractedResult && typeof extractedResult === 'object' && extractedResult['@odata.count']) {
          // Handle Graph API responses with @odata.count
          const count = extractedResult['@odata.count'];
          const items = extractedResult.value || [];
          resultDisplay = `Found **${count}** items. ${items.length > 0 ? `Here are the details:\n\n\`\`\`json\n${JSON.stringify(items, null, 2)}\n\`\`\`` : ''}`;
        } else if (extractedResult && typeof extractedResult === 'object' && extractedResult.value && Array.isArray(extractedResult.value)) {
          // Handle Graph API responses with value array
          const items = extractedResult.value;
          resultDisplay = `Found **${items.length}** items:\n\n\`\`\`json\n${JSON.stringify(items, null, 2)}\n\`\`\``;
        } else {
          // Default JSON display
          resultDisplay = `\`\`\`json\n${JSON.stringify(extractedResult, null, 2)}\n\`\`\``;
        }
        
        // Replace the execute_query block with just the result (remove the query tags)
        const replacementText = `**Query Result:**\n${resultDisplay}`;
        modifiedResponse = modifiedResponse.replace(match[0], replacementText);
        
      } catch (error) {
        console.error('Error executing Graph API query:', error);
        const errorMessage = `<execute_query>${match[1]}</execute_query>\n\n**Query Error:** ${(error as Error).message}`;
        modifiedResponse = modifiedResponse.replace(match[0], errorMessage);
      }
    }
    
    if (hasExecutedQueries) {
      console.log('Successfully processed and executed queries in LLM response');
    }
    
    return modifiedResponse;
  }

  async isAvailable(): Promise<boolean> {
    const service = this.getActiveService();
    return service.isAvailable();
  }

  async getAvailableModels(): Promise<string[]> {
    const service = this.getActiveService();
    return service.getAvailableModels();
  }

  private getActiveService(): LLMService | CloudLLMService {
    if (this.localService) {
      return this.localService;
    } else if (this.cloudService) {
      return this.cloudService;
    } else {
      throw new Error('No LLM service available');
    }
  }

  isLocalProvider(): boolean {
    return this.config.provider === 'ollama' || this.config.provider === 'lmstudio';
  }

  isCloudProvider(): boolean {
    return this.config.provider === 'openai' || this.config.provider === 'anthropic';
  }

  getProviderType(): 'local' | 'cloud' {
    return this.isLocalProvider() ? 'local' : 'cloud';
  }
}
