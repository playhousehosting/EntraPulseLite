// simport { MCPClient } from '../../mcp/clients/MCPClient';c/tests/unit/fetch-mcp.test.ts
// Tests for the Fetch MCP Server functionality

import { FetchMCPServer } from '../../mcp/servers/fetch';
import { MCPClient } from '../../mcp/clients/MCPClient';
import { MCPServerConfig } from '../../mcp/types';
import { MCPServerManager } from '../../mcp/servers/MCPServerManager';

// Define interfaces for content types
interface ContentItem {
  type: string;
  [key: string]: any;
}

interface TextContent extends ContentItem {
  type: 'text';
  text: string;
}

interface LinkContent extends ContentItem {
  type: 'link';
  url: string;
  name: string;
}

// Mock axios to avoid actual network requests
jest.mock('axios');
import axios from 'axios';

describe('Fetch MCP Server', () => {
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
    
    // Reset mocks
    jest.clearAllMocks();
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
    expect(toolNames).toContain('fetch_merill_permissions');
  });
  
  test('should fetch content from a public website', async () => {
    // Mock axios response
    (axios.get as jest.Mock).mockResolvedValue({
      data: '<html><body><h1>Microsoft Graph Overview</h1><p>Test content</p></body></html>'
    });
    
    // URL for a public website (Microsoft Graph documentation)
    const url = 'https://learn.microsoft.com/en-us/graph/overview';
    
    // Call the fetch_documentation tool
    const result = await mcpClient.callTool('fetch', 'fetch_documentation', {
      url: url
    });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    expect(textContent.text).toContain('Microsoft Graph Overview');
    
    // Verify link is included
    const linkContent = result.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toBe(url);
    
    // Verify axios was called correctly
    expect(axios.get).toHaveBeenCalledWith(url);
  });
  
  test('should search for documentation using a query', async () => {
    // Mock axios response
    (axios.get as jest.Mock).mockResolvedValue({
      data: '<html><body><h1>Search Results</h1><p>Authentication information</p></body></html>'
    });
    
    // Call the fetch_documentation tool with a search query
    const query = 'Microsoft Graph API authentication';
    const result = await mcpClient.callTool('fetch', 'fetch_documentation', {
      query: query
    });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    expect(textContent.text).toContain('Authentication information');
    
    // Verify axios was called correctly with the search URL
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('documentation?terms='));
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent(query)));
  });

  test('should fetch specific permission information from Merill Permissions API', async () => {
    // Mock axios response for a specific permission
    (axios.get as jest.Mock).mockResolvedValue({
      data: `
        <html>
          <head><title>User.Read Permission</title></head>
          <body>
            <h1>User.Read</h1>
            <blockquote>Allow the app to read your profile. It allows the app to see your basic information (name, picture, user principal name).</blockquote>
            <table>
              <thead>
                <tr><th>Methods</th><th>URL</th></tr>
              </thead>
              <tbody>
                <tr><td>GET /me</td><td>https://graph.microsoft.com/v1.0/me</td></tr>
                <tr><td>GET /me/profile</td><td>https://graph.microsoft.com/v1.0/me/profile</td></tr>
              </tbody>
            </table>
          </body>
        </html>
      `
    });
    
    // Call the fetch_merill_permissions tool with a specific permission
    const result = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {
      permission: 'User.Read',
      includeDetails: true
    });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    expect(textContent.text).toContain('User.Read');
    expect(textContent.text).toContain('Allow the app to read your profile');
    expect(textContent.text).toContain('GET /me');
    
    // Verify link is included
    const linkContent = result.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toContain('graphpermissions.merill.net/permission/User.Read');
    
    // Verify axios was called correctly
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/User.Read',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'EntraPulse-Lite/1.0'
        })
      })
    );
  });

  test('should fetch all permissions list from Merill Permissions API', async () => {
    // Mock axios response for all permissions
    (axios.get as jest.Mock).mockResolvedValue({
      data: `
        <html>
          <body>
            <table>
              <thead>
                <tr><th>Permission</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>User.Read</td><td>Read user profile</td></tr>
                <tr><td>Mail.Read</td><td>Read user mail</td></tr>
                <tr><td>Calendars.ReadWrite</td><td>Read and write calendars</td></tr>
              </tbody>
            </table>
          </body>
        </html>
      `
    });
    
    // Call the fetch_merill_permissions tool without a specific permission to get all permissions
    const result = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {});
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    expect(textContent.text).toContain('Microsoft Graph Permissions');
    expect(textContent.text).toContain('User.Read');
    expect(textContent.text).toContain('Mail.Read');
    expect(textContent.text).toContain('Calendars.ReadWrite');
    
    // Verify link is included
    const linkContent = result.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toBe('https://graphpermissions.merill.net/permission/');
    
    // Verify axios was called correctly
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'EntraPulse-Lite/1.0'
        })
      })
    );
  });
});
