// src/mcp/FetchExample.ts
// Example of using the Fetch MCP Server to retrieve web content

import { MCPClient } from './clients/MCPClient';
import { MCPServerConfig } from './types';

// Define interfaces for MCP content
interface MCPContentItem {
  type: string;
  text?: string;
  json?: any;
  url?: string;
  name?: string;
}

interface MCPContentResult {
  content: MCPContentItem[];
}

/**
 * FetchExample class to demonstrate using the Fetch MCP server
 * for retrieving content from web resources
 */
export class FetchExample {
  private mcpClient: MCPClient;
  
  /**
   * Create a new FetchExample instance with the given MCP client
   * @param mcpClient Initialized MCP client
   */
  constructor(mcpClient: MCPClient) {
    this.mcpClient = mcpClient;
  }
  
  /**
   * Fetch content from a specific URL
   * @param url URL to fetch content from
   * @returns Formatted text content from the URL
   */
  async fetchWebContent(url: string): Promise<string> {
    try {
      const result = await this.mcpClient.callTool('fetch', 'fetch_documentation', {
        url: url
      }) as MCPContentResult;
      
      return this.processContentResult(result, `Content from ${url}`);
    } catch (error) {
      console.error('Error fetching web content:', error);
      return `Failed to fetch content from ${url}: ${(error as Error).message}`;
    }
  }
  
  /**
   * Search for documentation on Microsoft Learn
   * @param query Search query
   * @returns Formatted search results
   */
  async searchDocumentation(query: string): Promise<string> {
    try {
      const result = await this.mcpClient.callTool('fetch', 'fetch_documentation', {
        query: query
      }) as MCPContentResult;
      
      return this.processContentResult(result, `Search results for "${query}"`);
    } catch (error) {
      console.error('Error searching documentation:', error);
      return `Failed to search for "${query}": ${(error as Error).message}`;
    }
  }
  
  /**
   * Look up information about a specific Microsoft Graph permission
   * @param permission Permission name (e.g., User.Read, Mail.Send)
   * @returns Information about the permission
   */
  async lookupPermission(permission: string): Promise<string> {
    try {
      const result = await this.mcpClient.callTool('fetch', 'fetch_permissions_info', {
        permission: permission
      }) as MCPContentResult;
      
      return this.processContentResult(result, `Permission information for ${permission}`);
    } catch (error) {
      console.error('Error looking up permission:', error);
      return `Failed to look up permission "${permission}": ${(error as Error).message}`;
    }
  }
  
  /**
   * Process a content result into a formatted string
   * @param result The content result from an MCP tool call
   * @param headerText Header text to include at the beginning
   * @returns Formatted text content
   */
  private processContentResult(result: MCPContentResult, headerText: string): string {
    if (!result || !result.content || !Array.isArray(result.content)) {
      return 'No content returned';
    }
    
    // Get text content
    const textItems = result.content.filter(item => item.type === 'text');
    const textContent = textItems.map(item => item.text || '').join('\n\n');
    
    // Get link content
    const linkItems = result.content.filter(item => item.type === 'link');
    const linkContent = linkItems.map(item => `Source: ${item.name || item.url} - ${item.url}`).join('\n');
    
    return `${headerText}\n\n${textContent}\n\n${linkContent ? `${linkContent}` : ''}`;
  }
}

/**
 * Create a configured FetchExample instance with default settings
 * @returns Initialized FetchExample instance
 */
export function createFetchExample(): FetchExample {
  // Define server config
  const fetchConfig: MCPServerConfig = {
    name: 'fetch',
    type: 'fetch',
    port: 8080,
    enabled: true
  };
  
  // Create MCP client with fetch server config
  const mcpClient = new MCPClient([fetchConfig]);
  
  // Create and return the example instance
  return new FetchExample(mcpClient);
}
