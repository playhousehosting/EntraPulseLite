// src/tests/unit/fetch-mcp-mock.test.ts
// Tests for the Fetch MCP Server functionality with mocked HTTP responses

import { FetchMCPServer } from '../../mcp/servers/fetch';
import { MCPClient } from '../../mcp/clients/MCPClient';
import { MCPServerConfig } from '../../mcp/types';
import { MCPServerManager } from '../../mcp/servers/MCPServerManager';
import axios from 'axios';

// Mock axios to prevent actual HTTP requests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Fetch MCP Server (Mocked)', () => {
  // Create server config for fetch MCP
  const fetchConfig: MCPServerConfig = {
    name: 'fetch',
    type: 'fetch',
    port: 8080,
    enabled: true,
  };
  
  let mcpClient: MCPClient;
  
  beforeEach(() => {
    // Initialize the client with the fetch server config
    mcpClient = new MCPClient([fetchConfig]);
    
    // Reset all mocks
    jest.resetAllMocks();
  });
  
  test('should list available tools', async () => {
    // Get the list of tools from the fetch server
    const tools = await mcpClient.listTools('fetch');
    
    // Verify tools are returned
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    
    // Check for specific tools we know should be available
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('fetch_documentation');
    expect(toolNames).toContain('fetch_graph_schema');
    expect(toolNames).toContain('fetch_permissions_info');
  });
  
  test('should fetch content from a public website', async () => {
    // URL for a public website (Microsoft Graph documentation)
    const url = 'https://learn.microsoft.com/en-us/graph/overview';
    
    // Mock axios.get response
    mockedAxios.get.mockResolvedValueOnce({
      data: `
        <html>
          <head><title>Microsoft Graph Overview</title></head>
          <body>
            <h1>Microsoft Graph Overview</h1>
            <p>Microsoft Graph is the gateway to data and intelligence in Microsoft 365.</p>
            <p>This is a sample HTML content for testing purposes.</p>
          </body>
        </html>
      `
    });
    
    // Call the fetch_documentation tool
    const result = await mcpClient.callTool('fetch', 'fetch_documentation', {
      url: url
    });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: any) => item.type === 'text');
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    
    // Verify link is included
    const linkContent = result.content.find((item: any) => item.type === 'link');
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toBe(url);
    
    // Verify axios was called with the correct URL
    expect(mockedAxios.get).toHaveBeenCalledWith(url);
  });
  
  test('should search for documentation using a query', async () => {
    // Search query
    const query = 'Microsoft Graph API authentication';
    const encodedQuery = encodeURIComponent(query);
    const expectedUrl = `https://learn.microsoft.com/en-us/search/documentation?terms=${encodedQuery}`;
    
    // Mock axios.get response
    mockedAxios.get.mockResolvedValueOnce({
      data: `
        <html>
          <head><title>Search Results for Microsoft Graph API authentication</title></head>
          <body>
            <h1>Search Results</h1>
            <div class="search-results">
              <div class="search-result">
                <h2>Authentication and authorization basics for Microsoft Graph</h2>
                <p>Learn about authentication options for Microsoft Graph.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });
    
    // Call the fetch_documentation tool
    const result = await mcpClient.callTool('fetch', 'fetch_documentation', { query });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: any) => item.type === 'text');
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    
    // Verify axios was called with the correct URL
    expect(mockedAxios.get).toHaveBeenCalledWith(expectedUrl);
  });
  
  test('should handle errors gracefully', async () => {
    // Mock axios.get to throw an error
    mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
    
    // Expect the callTool to throw an error
    await expect(mcpClient.callTool('fetch', 'fetch_documentation', {
      url: 'https://example.com'
    })).rejects.toThrow();
  });
});
