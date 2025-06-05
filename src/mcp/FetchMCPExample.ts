// src/mcp/FetchMCPExample.ts
// Example script to demonstrate the use of Fetch MCP Server

import { MCPClient } from './clients/MCPClient';
import { MCPServerConfig } from './types';

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

async function main() {
  try {
    // Set up fetch server config
    const fetchConfig: MCPServerConfig = {
      name: 'fetch',
      type: 'fetch',
      port: 8080,
      enabled: true,
    };
    
    // Create MCP client
    const mcpClient = new MCPClient([fetchConfig]);
    
    console.log('\n--- FETCH MCP SERVER EXAMPLE ---\n');
    
    // 1. List available tools
    console.log('Listing available tools...');
    const tools = await mcpClient.listTools('fetch');
    console.log('Available tools:');
    tools.forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });
      // 2. Fetch documentation from a URL
    console.log('\nFetching documentation from Microsoft Graph overview...');
    const urlResult = await mcpClient.callTool('fetch', 'fetch_documentation', {
      url: 'https://learn.microsoft.com/en-us/graph/overview'
    });
    
    // Log the full result structure to understand the format
    console.log('\nFull result structure:');
    console.log(JSON.stringify(urlResult, null, 2));
    
    // Display text content (truncated)
    if (urlResult?.content) {
      const textContent = urlResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
      if (textContent?.text) {
        console.log('\nContent from URL (truncated):');
        console.log(textContent.text.substring(0, 300) + '...');
      }
    }
    
    // Log all content types that are returned
    if (urlResult?.content && Array.isArray(urlResult.content)) {
      const contentTypes = urlResult.content.map((item: ContentItem) => item.type);
      console.log('\nAvailable content types:', contentTypes.join(', '));
    }
    
    // 3. Search for documentation
    console.log('\nSearching for "Microsoft Graph authentication"...');
    const searchResult = await mcpClient.callTool('fetch', 'fetch_documentation', {
      query: 'Microsoft Graph authentication'
    });
    
    // Display text content (truncated)
    if (searchResult?.content) {
      const textContent = searchResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
      if (textContent?.text) {
        console.log('\nSearch results (truncated):');
        console.log(textContent.text.substring(0, 300) + '...');
      }
    }
      // 4. Fetch permission info
    console.log('\nFetching information about User.Read permission...');
    const permissionResult = await mcpClient.callTool('fetch', 'fetch_permissions_info', {
      permission: 'User.Read'
    });
    
    // Display text content
    if (permissionResult?.content) {
      const textContent = permissionResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
      if (textContent?.text) {
        console.log('\nPermission information:');
        console.log(textContent.text);
      }
      
      // Log link content if any
      const linkContent = permissionResult.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
      if (linkContent) {
        console.log('\nSource link:');
        console.log(`${linkContent.name}: ${linkContent.url}`);
      }
    }
    
    // 5. Test fetching a general web page for LLM context
    try {
      console.log('\nFetching content from a general website for LLM context...');
      const generalResult = await mcpClient.callTool('fetch', 'fetch_documentation', {
        url: 'https://learn.microsoft.com/en-us/dotnet/api/microsoft.identity.client',
        maxLength: 5000 // Limit the size for LLM context
      });
      
      // Prepare content for LLM context
      if (generalResult?.content) {
        const textContent = generalResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
        if (textContent?.text) {
          const linkItem = generalResult.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
          const llmContext = `
          Here is some context about Microsoft Identity Client from Microsoft Learn:
          
          ${textContent.text.substring(0, 1000)}
          
          ...
          
          (Truncated for brevity. Full documentation available at ${linkItem?.url})
          `;
          
          console.log('\nPrepared LLM context:');
          console.log(llmContext.substring(0, 500) + '...');
        }
      }
    } catch (error) {
      console.error('Error fetching content for LLM context:', error);
    }
    
    // 6. Test the new Merill Permissions feature
    try {
      console.log('\nFetching all available Microsoft Graph permissions from Merill...');
      const allPermissionsResult = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {});
      
      if (allPermissionsResult?.content) {
        const textContent = allPermissionsResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
        if (textContent?.text) {
          console.log('\nAll permissions (truncated):');
          console.log(textContent.text.substring(0, 500) + '...');
        }
      }
      
      console.log('\nFetching specific permission details for User.Read...');
      const specificPermissionResult = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {
        permission: 'User.Read',
        includeDetails: true
      });
      
      if (specificPermissionResult?.content) {
        const textContent = specificPermissionResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
        if (textContent?.text) {
          console.log('\nPermission details:');
          console.log(textContent.text);
        }
      }
    } catch (error) {
      console.error('Error fetching Merill permissions:', error);
    }
    
    console.log('\n--- END OF EXAMPLE ---');
    
  } catch (error) {
    console.error('Error in FetchMCPExample:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  main();
}

export { main as runFetchMCPExample };
