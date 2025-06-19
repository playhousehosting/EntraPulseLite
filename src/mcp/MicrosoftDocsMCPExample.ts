// Test example for Microsoft Docs MCP integration
import { MCPClient } from './clients/MCPClient';
import { MCPServerConfig } from './types';
import { MCPAuthService } from './auth/MCPAuthService';

/**
 * Test Microsoft Docs MCP Server integration
 */
export async function testMicrosoftDocsMCP(authService?: MCPAuthService): Promise<void> {
  console.log('🔬 Testing Microsoft Docs MCP Server integration...\n');

  try {
    // Create server config
    const serverConfig: MCPServerConfig = {
      name: 'microsoft-docs',
      type: 'microsoft-docs',
      port: 0,
      enabled: true,
      url: 'https://learn.microsoft.com/api/mcp',
      authConfig: {
        type: 'none' // Microsoft Docs MCP doesn't require authentication
      }
    };

    // Create MCP client
    const mcpClient = new MCPClient([serverConfig], authService);

    // Initialize Microsoft Docs clients
    console.log('🔧 Initializing Microsoft Docs MCP client...');
    await mcpClient.initializeMicrosoftDocsClients();
    console.log('✅ Microsoft Docs MCP client initialized successfully\n');

    // 1. List available tools
    console.log('📋 Listing available tools...');
    try {
      const tools = await mcpClient.listTools('microsoft-docs');
      console.log(`✅ Found ${tools.length} tools:`);
      tools.forEach((tool, index) => {
        console.log(`  ${index + 1}. ${tool.name}`);
        if (tool.description) {
          console.log(`     Description: ${tool.description}`);
        }
        console.log('');
      });

      // 2. Test a specific tool if available
      if (tools.length > 0) {
        const firstTool = tools[0];
        console.log(`🔍 Testing tool: "${firstTool.name}"`);
        
        // Example queries for common Microsoft Docs MCP tools
        const testQueries = [
          'Microsoft Graph API authentication',
          'Azure Active Directory setup',
          'Microsoft Entra permissions',
          'Graph API user management'
        ];

        for (const query of testQueries) {
          try {
            console.log(`   Testing query: "${query}"`);
            
            // Adjust parameters based on the actual tool schema
            // Common parameters for documentation search tools
            const result = await mcpClient.callTool('microsoft-docs', firstTool.name, {
              query: query,
              maxResults: 3,
              includeContent: true
            });
            
            console.log(`   ✅ Query successful:`);
            if (result.content) {
              console.log(`      Content snippets: ${result.content.length} items`);
            }
            if (result.results) {
              console.log(`      Results: ${result.results.length} items`);
            }
            console.log('');
          } catch (toolError) {
            console.log(`   ⚠️  Query failed: ${(toolError as Error).message}`);
            console.log('');
          }
        }
      }

      // 3. Test resources if the server supports them
      console.log('📚 Testing resources...');
      try {
        const resources = await mcpClient.listResources('microsoft-docs');
        console.log(`✅ Found ${resources.length} resources:`);
        resources.slice(0, 5).forEach((resource, index) => {
          console.log(`  ${index + 1}. ${resource.name || resource.uri}`);
          if (resource.description) {
            console.log(`     Description: ${resource.description}`);
          }
        });

        // Test reading a resource if available
        if (resources.length > 0) {
          const firstResource = resources[0];
          console.log(`\n🔍 Testing resource read: "${firstResource.name || firstResource.uri}"`);
          try {
            const resourceContent = await mcpClient.readResource('microsoft-docs', firstResource.uri);
            console.log(`   ✅ Resource read successful`);
            if (resourceContent.contents) {
              console.log(`      Content length: ${JSON.stringify(resourceContent.contents).length} characters`);
            }
          } catch (resourceError) {
            console.log(`   ⚠️  Resource read failed: ${(resourceError as Error).message}`);
          }
        }
      } catch (resourcesError) {
        console.log(`⚠️  Resources not supported or failed: ${(resourcesError as Error).message}`);
      }

    } catch (toolsError) {
      console.error(`❌ Failed to list tools: ${(toolsError as Error).message}`);
    }

    console.log('\n🎉 Microsoft Docs MCP test completed!');

  } catch (error) {
    console.error('❌ Microsoft Docs MCP test failed:', error);
    throw error;
  }
}

/**
 * Run a simple health check on Microsoft Docs MCP
 */
export async function healthCheckMicrosoftDocsMCP(authService?: MCPAuthService): Promise<boolean> {
  try {
    console.log('🏥 Running Microsoft Docs MCP health check...');

    const serverConfig: MCPServerConfig = {
      name: 'microsoft-docs',
      type: 'microsoft-docs',
      port: 0,
      enabled: true,
      url: 'https://learn.microsoft.com/api/mcp',
      authConfig: {
        type: 'none'
      }
    };

    const mcpClient = new MCPClient([serverConfig], authService);
    await mcpClient.initializeMicrosoftDocsClients();
    
    // Try to list tools as a health check
    const tools = await mcpClient.listTools('microsoft-docs');
    
    console.log(`✅ Health check passed - ${tools.length} tools available`);
    return true;
  } catch (error) {
    console.error(`❌ Health check failed: ${(error as Error).message}`);
    return false;
  }
}

// Export for use in other modules
export { testMicrosoftDocsMCP as default };

// Run test if this file is executed directly
if (require.main === module) {
  testMicrosoftDocsMCP().catch(console.error);
}
