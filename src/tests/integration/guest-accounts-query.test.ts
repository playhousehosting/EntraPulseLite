// guest-accounts-query.test.ts
// Test for querying guest accounts through External Lokka MCP Server

import { ExternalLokkaMCPServer } from '../../mcp/servers/lokka/ExternalLokkaMCPServer';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { MockAuthService } from '../mocks/MockAuthService';
import { MCPRequest, MCPResponse } from '../../mcp/types';
import { GuestAccountAnalyzer } from '../../shared/GuestAccountAnalyzer';
import { MCPClient } from '../../mcp/clients/MCPClient';
import dotenv from 'dotenv';
import path from 'path';

// Don't mock the External Lokka MCP Server - we want to test with the real implementation

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// Skip the test if tenant credentials are not configured
const shouldRunTests = 
  process.env.LOKKA_TENANT_ID &&
  process.env.LOKKA_CLIENT_ID &&
  process.env.LOKKA_CLIENT_SECRET;

describe('Guest Account Queries with Lokka MCP Server', () => {
  // Skip the entire test suite if tenant credentials are not configured
  (shouldRunTests ? describe : describe.skip)('with tenant credentials', () => {
    let server: ExternalLokkaMCPServer;
    let authService: MCPAuthService;
    beforeAll(async () => {
      // Initialize mock auth service for testing
      const mockAuthService = new MockAuthService();      mockAuthService.initialize({
        auth: {
          clientId: process.env.LOKKA_CLIENT_ID || '',
          tenantId: process.env.LOKKA_TENANT_ID || '',
          clientSecret: process.env.LOKKA_CLIENT_SECRET || '',
          useClientCredentials: true,
          scopes: ['https://graph.microsoft.com/.default']
        },
        llm: {
          provider: 'ollama',
          baseUrl: 'http://localhost:11434',
          model: 'llama2'
        },
        mcpServers: [],
        features: {
          enablePremiumFeatures: false,
          enableTelemetry: false
        }
      });
      
      authService = new MCPAuthService(mockAuthService as any);
      
      // Prepare server configuration with actual tenant credentials
      const config = {
        name: 'external-lokka-guest-query',
        type: 'external-lokka',
        port: 3097, // Use a different port for these tests
        enabled: true,
        command: 'npx',
        args: ['-y', '@merill/lokka'],
        env: {
          TENANT_ID: process.env.LOKKA_TENANT_ID,
          CLIENT_ID: process.env.LOKKA_CLIENT_ID,
          CLIENT_SECRET: process.env.LOKKA_CLIENT_SECRET
        }
      };
      
      console.log('Starting Lokka server with tenant credentials...');
      
      // Create server instance
      server = new ExternalLokkaMCPServer(config, authService);
      
      try {
        // Start the server
        console.log('Starting Lokka MCP server on port 3097...');
        await server.startServer();
        console.log('Lokka MCP server started successfully!');
      } catch (error) {
        console.error('Failed to start Lokka server:', error);
        throw error;
      }
    }, 60000); // Increase timeout to allow server startup
    
    afterAll(async () => {
      // Stop the server
      if (server) {
        await server.stopServer();
      }
    });
    
    test('should query and count guest accounts', async () => {
      // Skip if tenant credentials are not configured
      if (!shouldRunTests) {
        return;
      }
        // Make a Graph API request to query guest accounts
      const request: MCPRequest = {
        id: 'guest-accounts-query',
        method: 'tools/call',
        params: {
          name: 'microsoft_graph_query',
          arguments: {
            endpoint: '/users',
            method: 'GET',
            queryParams: {
              '$select': 'id,displayName,userPrincipalName,userType',
              '$filter': 'userType eq \'Guest\'',
              '$count': 'true'
            }
          }
        }
      };
      
      // Execute the request
      const response = await server.handleRequest(request);
      
      // Verify the response
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeDefined();
      expect(response.result.content[0].type).toBe('json');
        // Extract the guest account data
      const guestData = response.result.content[0].json;
      expect(guestData).toBeDefined();
      
      // Handle different possible response formats from Lokka MCP
      let guestArray;
      let odataCount;
      if (guestData.value) {
        // Standard Graph API response format
        guestArray = guestData.value;
        odataCount = guestData['@odata.count'];
      } else if (Array.isArray(guestData)) {
        // Direct array format
        guestArray = guestData;
        odataCount = guestData.length;
      } else {
        throw new Error(`Unexpected guest data format: ${JSON.stringify(guestData)}`);
      }
      
      expect(Array.isArray(guestArray)).toBe(true);
      
      // Log the number of guest accounts found
      console.log(`Found ${guestArray.length} guest accounts`);
      console.log(`Total count from @odata.count: ${odataCount}`);
      
      // Verify the userType for all returned accounts is 'Guest'
      if (guestArray.length > 0) {
        guestArray.forEach((user: any) => {
          expect(user.userType).toBe('Guest');
        });
        
        // Log details of the first few guest accounts
        const sampleUsers = guestArray.slice(0, Math.min(5, guestArray.length));
        console.log('Sample guest accounts:');
        sampleUsers.forEach((user: any, index: number) => {
          console.log(`${index + 1}. ${user.displayName} (${user.userPrincipalName})`);
        });
      }
    }, 15000);
    
    test('should query guest accounts with advanced filtering', async () => {
      // Skip if tenant credentials are not configured
      if (!shouldRunTests) {
        return;
      }
      
      // Use the d94_Lokka-Microsoft tool for more advanced filtering
      const request: MCPRequest = {
        id: 'advanced-guest-query',
        method: 'tools/call',
        params: {
          name: 'd94_Lokka-Microsoft',
          arguments: {
            apiType: 'graph',
            method: 'get',
            path: '/users',
            queryParams: {
              '$select': 'id,displayName,mail,userPrincipalName,userType,createdDateTime',
              '$filter': "userType eq 'Guest' and contains(userPrincipalName, '#EXT#')",
              '$orderby': 'createdDateTime desc',
              '$top': '10'
            }
          }
        }
      };
      
      // Execute the request
      const response = await server.handleRequest(request);
      
      // Verify the response
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
        // Extract the guest account data
      const guestData = response.result.content[0].json;
      expect(guestData).toBeDefined();
      
      // Handle different possible response formats from Lokka MCP
      let guestArray;
      if (guestData.value) {
        // Standard Graph API response format
        guestArray = guestData.value;
      } else if (Array.isArray(guestData)) {
        // Direct array format
        guestArray = guestData;
      } else {
        throw new Error(`Unexpected guest data format: ${JSON.stringify(guestData)}`);
      }
      
      expect(Array.isArray(guestArray)).toBe(true);
      
      // Log the details of recently added guest accounts
      console.log(`Found ${guestArray.length} guest accounts with #EXT# in UPN`);
        if (guestArray.length > 0) {
        // Verify all returned accounts are 'Guest' type
        guestArray.forEach((user: any) => {
          expect(user.userType).toBe('Guest');
          expect(user.userPrincipalName).toContain('#EXT#');
        });
        
        // Log details of the most recently created guest accounts
        console.log('Most recently created guest accounts:');
        guestArray.forEach((user: any, index: number) => {
          const createdDate = new Date(user.createdDateTime);
          console.log(`${index + 1}. ${user.displayName} (Created: ${createdDate.toLocaleDateString()})`);
        });
      }
    }, 15000);
    
    test('should calculate guest account percentage', async () => {
      // Skip if tenant credentials are not configured
      if (!shouldRunTests) {
        return;
      }
      
      // First, get total user count
      const totalUsersRequest: MCPRequest = {
        id: 'total-users-count',
        method: 'tools/call',
        params: {
          name: 'microsoft_graph_query',
          arguments: {
            endpoint: '/users/$count',
            method: 'GET'
          }
        }
      };
        const totalResponse = await server.handleRequest(totalUsersRequest);
      expect(totalResponse.error).toBeUndefined();
      
      // Parse total count - handle different response formats
      let totalUsers;
      const totalData = totalResponse.result.content[0].json;
      
      if (typeof totalData === 'number') {
        totalUsers = totalData;
      } else if (typeof totalData === 'string') {
        totalUsers = parseInt(totalData, 10);
      } else if (totalData && typeof totalData === 'object' && totalData.value !== undefined) {
        totalUsers = totalData.value;
      } else {
        console.log('Unexpected total users response format:', JSON.stringify(totalData));
        totalUsers = 0; // Fallback to avoid NaN
      }
      
      console.log(`Total users in tenant: ${totalUsers}`);
      expect(totalUsers).toBeGreaterThan(0);
        // Then, get guest user count
      const guestCountRequest: MCPRequest = {
        id: 'guest-users-count',
        method: 'tools/call',
        params: {
          name: 'microsoft_graph_query',
          arguments: {
            endpoint: '/users/$count',
            method: 'GET',
            queryParams: {
              '$filter': "userType eq 'Guest'"
            }
          }
        }
      };
        const guestResponse = await server.handleRequest(guestCountRequest);
      expect(guestResponse.error).toBeUndefined();
      
      // Parse guest count - handle different response formats
      let guestUsers;
      const guestData = guestResponse.result.content[0].json;
      
      if (typeof guestData === 'number') {
        guestUsers = guestData;
      } else if (typeof guestData === 'string') {
        guestUsers = parseInt(guestData, 10);
      } else if (guestData && typeof guestData === 'object' && guestData.value !== undefined) {
        guestUsers = guestData.value;
      } else {
        console.log('Unexpected guest users response format:', JSON.stringify(guestData));
        guestUsers = 0; // Fallback to avoid NaN
      }
      
      expect(guestUsers).toBeGreaterThanOrEqual(0);
      
      // Calculate and log the percentage
      const guestPercentage = (guestUsers / totalUsers) * 100;
      console.log(`Total users: ${totalUsers}`);
      console.log(`Guest users: ${guestUsers}`);
      console.log(`Guest user percentage: ${guestPercentage.toFixed(2)}%`);
      
      // Create a simple summary object
      const summary = {
        totalUsers,
        guestUsers,
        guestPercentage: parseFloat(guestPercentage.toFixed(2)),
        memberUsers: totalUsers - guestUsers,
        memberPercentage: parseFloat((100 - guestPercentage).toFixed(2))
      };
      
      console.log('User account summary:', summary);
    }, 20000);
  });
});
