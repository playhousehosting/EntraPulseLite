// src/tests/integration/mcp.test.ts
// Integration tests for MCP functionality

import { MCPClient } from '../../mcp/clients/MCPClient';
import { MCPServerConfig } from '../../mcp/types';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';

describe('MCP Integration', () => {
  let client: MCPClient;
  
  beforeEach(() => {
    // Create mock auth service
    const mockAuthService = {
      getGraphAuthProvider: jest.fn().mockResolvedValue({
        getAccessToken: jest.fn().mockResolvedValue('mock-token')
      })
    } as unknown as MCPAuthService;

    const servers: MCPServerConfig[] = [      {
        name: 'fetch',
        type: 'fetch',
        port: 8080,
        enabled: true,
      },
      {
        name: 'external-lokka',
        type: 'external-lokka',
        port: 8083,
        enabled: true,
        command: 'npx',
        args: ['-y', '@merill/lokka'],
      },
    ];
    
    // Pass the mock auth service to MCPClient
    client = new MCPClient(servers, mockAuthService);
  });
  
  test('should list available servers', () => {
    const servers = client.getAvailableServers();
    
    expect(servers).toHaveLength(2);
    expect(servers[0]).toHaveProperty('name', 'fetch');
    expect(servers[1]).toHaveProperty('name', 'external-lokka');
  });
  
  test('should list tools for fetch server', async () => {
    const tools = await client.listTools('fetch');
    
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    
    // Check for the fetch_documentation tool
    const fetchDocTool = tools.find((tool) => tool.name === 'fetch_documentation');
    expect(fetchDocTool).toBeDefined();
    expect(fetchDocTool).toHaveProperty('description');
    expect(fetchDocTool).toHaveProperty('inputSchema');
  });
    test.skip('should list tools for lokka server', async () => {
    // Skip this test until external Lokka server is properly mocked for integration tests
    const tools = await client.listTools('external-lokka');
    
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    
    // Check for the microsoft_graph_query tool
    const graphQueryTool = tools.find((tool) => tool.name === 'microsoft_graph_query');
    expect(graphQueryTool).toBeDefined();
    expect(graphQueryTool).toHaveProperty('description');
    expect(graphQueryTool).toHaveProperty('inputSchema');
  });
  
  test('should fail for unknown server', async () => {
    await expect(client.listTools('unknown')).rejects.toThrow("MCP server 'unknown' not found");
  });
  
  // Note: These tests rely on server mocking inside MCPClient
  // In a more thorough test suite, we would mock the fetch API for actual HTTP requests
});
