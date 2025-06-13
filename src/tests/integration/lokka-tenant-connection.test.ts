// lokka-tenant-connection.test.ts
// Integration test to verify the Lokka MCP Server can connect to an Entra ID tenant

import { ExternalLokkaMCPServer } from '../../mcp/servers/lokka/ExternalLokkaMCPServer';
import { MCPAuthService } from '../../mcp/auth/MCPAuthService';
import { AuthService } from '../../auth/AuthService';
import { validateMCPResponse } from '../utils/mcpResponseParser';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// Skip the test if tenant credentials are not configured
const shouldRunTests = 
  process.env.LOKKA_TENANT_ID &&
  process.env.LOKKA_CLIENT_ID &&
  process.env.LOKKA_CLIENT_SECRET;

describe('Lokka MCP Server Tenant Connection', () => {
  // Skip the entire test suite if tenant credentials are not configured
  (shouldRunTests ? describe : describe.skip)('with tenant credentials', () => {
    let server: ExternalLokkaMCPServer;
    let authService: MCPAuthService;
    
    beforeAll(async () => {
      // Initialize auth service
      const msalAuthService = new AuthService();
      authService = new MCPAuthService(msalAuthService);
      
      // Configure server with tenant credentials
      const config: any = {
        name: 'external-lokka',
        type: 'external-lokka',
        port: 3099, // Use a different port for testing
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
    
    test('should connect to tenant and query Graph API', async () => {
      // Skip if tenant credentials are not configured
      if (!shouldRunTests) {
        return;
      }
      
      // Make a basic Graph API request to verify connection
      const request = {
        id: 'test-connection',
        method: 'tools/call',
        params: {
          name: 'microsoft_graph_query',
          arguments: {
            endpoint: '/organization',
            method: 'GET'
          }
        }
      };
      
      // Execute the request
      const response = await server.handleRequest(request);      // Verify the response
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();      // Validate and extract data using utility
      validateMCPResponse(response);      console.log('🔍 Raw MCP response:', JSON.stringify(response, null, 2));
      
      // Simple and robust MCP response parsing
      let organizationData;
        // Handle the MCP response format we're actually getting
      if (response.result?.content && Array.isArray(response.result.content)) {
        const content = response.result.content[0];
        console.log('🔍 Content structure:', JSON.stringify(content, null, 2));
        console.log('🔍 Content type:', content?.type);
        
        let textContent = null;
        
        if (content?.type === 'text' && content?.text) {
          // Direct text content
          textContent = content.text;
        } else if (content?.type === 'json' && content?.json?.content && Array.isArray(content.json.content)) {
          // Nested MCP structure with JSON wrapper
          const nestedContent = content.json.content[0];
          if (nestedContent?.type === 'text' && nestedContent?.text) {
            textContent = nestedContent.text;
          }
        }
        
        if (textContent) {
          // Extract JSON from the text
          const jsonStart = textContent.indexOf('{');
          if (jsonStart !== -1) {
            const jsonString = textContent.substring(jsonStart);
            organizationData = JSON.parse(jsonString);
          } else {
            throw new Error('No JSON found in MCP text response');
          }
        } else {
          throw new Error(`Invalid MCP content format. Content: ${JSON.stringify(content)}`);
        }
      } else {
        throw new Error(`Invalid MCP response structure. Response: ${JSON.stringify(response.result)}`);
      }
      
      console.log('🔍 Extracted organization data:', JSON.stringify(organizationData, null, 2));
      console.log('🔍 Type of organizationData:', typeof organizationData);
      
      expect(organizationData).toBeDefined();
      
      // Handle different possible response formats from Lokka MCP
      let orgArray;
      if (organizationData.value) {
        // Standard Graph API response format
        orgArray = organizationData.value;
      } else if (Array.isArray(organizationData)) {
        // Direct array format
        orgArray = organizationData;
      } else if (organizationData.id) {
        // Single organization object
        orgArray = [organizationData];
      } else {
        throw new Error(`Unexpected organization data format: ${JSON.stringify(organizationData)}`);
      }
      
      expect(Array.isArray(orgArray)).toBe(true);
      expect(orgArray.length).toBeGreaterThan(0);
      
      // Verify we have some basic organization properties
      const org = orgArray[0];
      expect(org.id).toBeDefined();
      expect(org.displayName).toBeDefined();
      
      console.log('Successfully connected to tenant:', org.displayName);
    }, 15000); // Increase timeout for API call
    
    test('should be able to query users endpoint', async () => {
      // Skip if tenant credentials are not configured
      if (!shouldRunTests) {
        return;
      }
      
      // Query users endpoint
      const request = {
        id: 'test-users',
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
      
      // Execute the request
      const response = await server.handleRequest(request);
        // Verify the response
      expect(response).toBeDefined();
      expect(response.error).toBeUndefined();      // Validate and extract data using utility
      validateMCPResponse(response);      console.log('🔍 Raw users MCP response:', JSON.stringify(response, null, 2));
      
      // Simple and robust MCP response parsing
      let usersData;
        // Handle the MCP response format we're actually getting
      if (response.result?.content && Array.isArray(response.result.content)) {
        const content = response.result.content[0];
        console.log('🔍 Users content structure:', JSON.stringify(content, null, 2));
        console.log('🔍 Users content type:', content?.type);
        
        let textContent = null;
        
        if (content?.type === 'text' && content?.text) {
          // Direct text content
          textContent = content.text;
        } else if (content?.type === 'json' && content?.json?.content && Array.isArray(content.json.content)) {
          // Nested MCP structure with JSON wrapper
          const nestedContent = content.json.content[0];
          if (nestedContent?.type === 'text' && nestedContent?.text) {
            textContent = nestedContent.text;
          }
        }
        
        if (textContent) {
          // Extract JSON from the text
          const jsonStart = textContent.indexOf('{');
          if (jsonStart !== -1) {
            const jsonString = textContent.substring(jsonStart);
            usersData = JSON.parse(jsonString);
          } else {
            throw new Error('No JSON found in MCP text response');
          }
        } else {
          throw new Error(`Invalid MCP content format. Content: ${JSON.stringify(content)}`);
        }
      } else {
        throw new Error(`Invalid MCP response structure. Response: ${JSON.stringify(response.result)}`);
      }
      
      console.log('🔍 Extracted users data:', JSON.stringify(usersData, null, 2));
      console.log('🔍 Type of usersData:', typeof usersData);
      
      expect(usersData).toBeDefined();
      
      // Handle different possible response formats from Lokka MCP
      let userArray;
      if (usersData.value) {
        // Standard Graph API response format
        userArray = usersData.value;
      } else if (Array.isArray(usersData)) {
        // Direct array format
        userArray = usersData;
      } else {
        throw new Error(`Unexpected users data format: ${JSON.stringify(usersData)}`);
      }
      
      expect(Array.isArray(userArray)).toBe(true);
      
      // Log number of users returned
      console.log(`Successfully retrieved ${userArray.length} users`);
    }, 15000); // Increase timeout for API call
  });
});
