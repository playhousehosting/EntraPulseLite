// lokka-mcp-e2e.test.ts
// End-to-end tests for the External Lokka MCP Server integration with LLM

import { ExternalLokkaMCPServer } from '../../mcp/servers/lokka/ExternalLokkaMCPServer';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { AuthService } from '../../auth/AuthService';
import { MCPRequest, MCPResponse } from '../../mcp/types';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// Skip the test if tenant credentials are not configured
const shouldRunTests = 
  process.env.LOKKA_TENANT_ID &&
  process.env.LOKKA_CLIENT_ID &&
  process.env.LOKKA_CLIENT_SECRET;

describe('External Lokka MCP Server End-to-End Tests', () => {
  // Skip the entire test suite if tenant credentials are not configured
  (shouldRunTests ? describe : describe.skip)('LLM to Graph API Flow', () => {
    let server: ExternalLokkaMCPServer;
    let authService: MCPAuthService;
    
    beforeAll(async () => {
      // Initialize auth service with tenant credentials
      const msalAuthService = new AuthService({
        app: { name: 'EntraPulseLite-Test' },
        auth: {
          clientId: process.env.LOKKA_CLIENT_ID || '',
          tenantId: process.env.LOKKA_TENANT_ID || '',
          clientSecret: process.env.LOKKA_CLIENT_SECRET || '',
          useClientCredentials: true,
          scopes: ['https://graph.microsoft.com/.default']
        }
      });
      
      authService = new MCPAuthService(msalAuthService);
      
      // Configure server with tenant credentials
      const config: any = {
        name: 'external-lokka-e2e',
        type: 'external-lokka',
        port: 3098, // Use a different port for E2E tests
        enabled: true,
        env: {
          TENANT_ID: process.env.LOKKA_TENANT_ID,
          CLIENT_ID: process.env.LOKKA_CLIENT_ID,
          CLIENT_SECRET: process.env.LOKKA_CLIENT_SECRET
        }
      };
      
      // Create server instance
      server = new ExternalLokkaMCPServer(config, authService);
      
      // Start the server
      await server.startServer();
    }, 30000); // Increase timeout to allow server startup
    
    afterAll(async () => {
      // Stop the server
      if (server) {
        await server.stopServer();
      }
    });
    
    test('should resolve natural language query to Graph API call', async () => {
      // Skip if tenant credentials are not configured
      if (!shouldRunTests) {
        return;
      }
      
      // 1. Simulate LLM understanding the user query "Show me the top 5 users"
      console.log('Step 1: LLM interprets user query "Show me the top 5 users"');
      
      // 2. LLM would translate this to a tool call - we simulate this step
      console.log('Step 2: LLM translates to a Microsoft Graph query');
      const mcpRequest: MCPRequest = {
        id: 'test-natural-language-flow',
        method: 'tools/call',
        params: {
          name: 'microsoft_graph_query',
          arguments: {
            endpoint: '/users',
            method: 'GET',
            queryParams: {
              $select: 'id,displayName,userPrincipalName',
              $top: '5'
            }
          }
        }
      };
      
      // 3. Send the request to the External Lokka MCP Server
      console.log('Step 3: Sending request to External Lokka MCP Server');
      const response: MCPResponse = await server.handleRequest(mcpRequest);
      
      // 4. Verify the response
      console.log('Step 4: Verifying the response');
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(response.result.content[0].type).toBe('json');
      
      // 5. Extract the user data from the response
      const userData = response.result.content[0].json;
      expect(userData).toBeDefined();
      expect(userData.value).toBeDefined();
      expect(Array.isArray(userData.value)).toBe(true);
      
      // 6. Simulate LLM formatting the response for the user
      console.log('Step 6: LLM formats the response data for the user');
      const usersFound = userData.value;
      console.log(`Found ${usersFound.length} users:`);
      
      usersFound.forEach((user: any, index: number) => {
        console.log(`${index + 1}. ${user.displayName} (${user.userPrincipalName})`);
      });
      
      // Verify we didn't get more than 5 users (as requested)
      expect(usersFound.length).toBeLessThanOrEqual(5);
    }, 20000);
    
    test('should handle complex Graph API queries through d94_Lokka-Microsoft tool', async () => {
      // Skip if tenant credentials are not configured
      if (!shouldRunTests) {
        return;
      }
      
      // Use the d94_Lokka-Microsoft tool for more advanced scenarios
      const mcpRequest: MCPRequest = {
        id: 'test-advanced-lokka-tool',
        method: 'tools/call',
        params: {
          name: 'd94_Lokka-Microsoft',
          arguments: {
            apiType: 'graph',
            method: 'get',
            path: '/users',
            queryParams: {
              '$select': 'id,displayName,mail',
              '$filter': 'startsWith(displayName,\'A\')',
              '$orderby': 'displayName',
              '$top': '3'
            }
          }
        }
      };
      
      // Send the request
      const response = await server.handleRequest(mcpRequest);
      
      // Verify the response
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      
      // Check the returned data
      const userData = response.result.content[0].json;
      expect(userData).toBeDefined();
      expect(userData.value).toBeDefined();
      expect(Array.isArray(userData.value)).toBe(true);
      
      // If any users were found, verify they match our filter (names starting with 'A')
      if (userData.value.length > 0) {
        userData.value.forEach((user: any) => {
          expect(user.displayName.charAt(0).toUpperCase()).toBe('A');
        });
      }
      
      // Make sure we didn't get more than 3 users (as specified in $top)
      expect(userData.value.length).toBeLessThanOrEqual(3);
    }, 20000);
  });
});
