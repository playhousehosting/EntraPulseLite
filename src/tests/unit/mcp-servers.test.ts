// src/tests/unit/mcp-servers.test.ts
// Tests for MCP server implementations

import { FetchMCPServer } from '../../mcp/servers/fetch';
import { LokkaMCPServer } from '../../mcp/servers/lokka';
import { MCPServerConfig } from '../../mcp/types';
import { MCPServerFactory } from '../../mcp/servers';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';

describe('MCP Servers', () => {
  // Mock auth service
  const mockAuthService = {
    getGraphAuthProvider: jest.fn().mockResolvedValue({
      getAccessToken: jest.fn().mockResolvedValue('mock-token')
    })
  } as unknown as MCPAuthService;

  describe('FetchMCPServer', () => {
    let fetchServer: FetchMCPServer;
    
    beforeEach(() => {
      const config: MCPServerConfig = {
        name: 'fetch',
        type: 'fetch',
        port: 8080,
        enabled: true,
      };
      fetchServer = new FetchMCPServer(config);
    });
    
    test('should handle tools/list request', async () => {
      const request = {
        id: '1',
        method: 'tools/list',
      };
      
      const response = await fetchServer.handleRequest(request);
      
      expect(response).toHaveProperty('id', '1');
      expect(response).toHaveProperty('result');
      expect(Array.isArray(response.result)).toBe(true);
      expect(response.result.length).toBeGreaterThan(0);
      expect(response.result[0]).toHaveProperty('name');
      expect(response.result[0]).toHaveProperty('description');
      expect(response.result[0]).toHaveProperty('inputSchema');
    });
    
    test('should handle unknown method', async () => {
      const request = {
        id: '2',
        method: 'unknown_method',
      };
      
      const response = await fetchServer.handleRequest(request);
      
      expect(response).toHaveProperty('id', '2');
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code', 404);
      expect(response.error).toHaveProperty('message', expect.stringContaining('not found'));
    });
  });
  
  describe('LokkaMCPServer', () => {
    let lokkaServer: LokkaMCPServer;
    
    beforeEach(() => {
      const config: MCPServerConfig = {
        name: 'lokka',
        type: 'lokka',
        port: 8081,
        enabled: true,
      };
      lokkaServer = new LokkaMCPServer(config, mockAuthService);
    });
    
    test('should handle tools/list request', async () => {
      const request = {
        id: '3',
        method: 'tools/list',
      };
      
      const response = await lokkaServer.handleRequest(request);
      
      expect(response).toHaveProperty('id', '3');
      expect(response).toHaveProperty('result');
      expect(Array.isArray(response.result)).toBe(true);
      expect(response.result.length).toBeGreaterThan(0);
      expect(response.result[0]).toHaveProperty('name');
      expect(response.result[0]).toHaveProperty('description');
      expect(response.result[0]).toHaveProperty('inputSchema');
    });
    
    test('should handle unknown method', async () => {
      const request = {
        id: '4',
        method: 'unknown_method',
      };
      
      const response = await lokkaServer.handleRequest(request);
      
      expect(response).toHaveProperty('id', '4');
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code', 404);
      expect(response.error).toHaveProperty('message', expect.stringContaining('not found'));
    });
  });
  
  describe('MCPServerFactory', () => {
    test('should create FetchMCPServer', () => {
      const config: MCPServerConfig = {
        name: 'fetch',
        type: 'fetch',
        port: 8080,
        enabled: true,
      };
      
      const server = MCPServerFactory.createServer(config);
      
      expect(server).toBeInstanceOf(FetchMCPServer);
    });
    
    test('should create LokkaMCPServer', () => {
      const config: MCPServerConfig = {
        name: 'lokka',
        type: 'lokka',
        port: 8081,
        enabled: true,
      };
      
      const server = MCPServerFactory.createServer(config, mockAuthService);
      
      expect(server).toBeInstanceOf(LokkaMCPServer);
    });
    
    test('should throw error for unsupported server type', () => {
      const config: MCPServerConfig = {
        name: 'unsupported',
        type: 'unsupported',
        port: 8082,
        enabled: true,
      };
      
      expect(() => MCPServerFactory.createServer(config)).toThrow('Unsupported MCP server type: unsupported');
    });
  });
});
