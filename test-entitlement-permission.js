// test-entitlement-permission.js
// Simple script to test the FetchMCPServer with EntitlementManagement.Read.All permission

const { FetchMCPServer } = require('./src/mcp/servers/fetch');

// Create server config for fetch MCP
const fetchConfig = {
  name: 'fetch',
  type: 'fetch',
  port: 8080,
  enabled: true,
};

async function testEntitlementPermission() {
  try {
    console.log('Creating FetchMCPServer...');
    const fetchServer = new FetchMCPServer(fetchConfig);
    
    console.log('Listing tools...');
    const toolsRequest = {
      id: '1',
      method: 'tools/list',
      params: {}
    };
    
    const toolsResponse = await fetchServer.handleRequest(toolsRequest);
    console.log('Available tools:', toolsResponse.result.map(t => t.name));
    
    console.log('\nFetching EntitlementManagement.Read.All permission...');
    const permRequest = {
      id: '2',
      method: 'tools/call',
      params: {
        name: 'fetch_merill_permissions',
        arguments: {
          permission: 'EntitlementManagement.Read.All',
          includeDetails: true
        }
      }
    };
    
    const permResponse = await fetchServer.handleRequest(permRequest);
    
    if (permResponse.error) {
      console.error('Error:', permResponse.error);
    } else {
      const textContent = permResponse.result.content.find(item => item.type === 'text');
      if (textContent) {
        console.log('Permission Details:\n');
        console.log(textContent.text);
      }
      
      const linkContent = permResponse.result.content.find(item => item.type === 'link');
      if (linkContent) {
        console.log('\nSource URL:', linkContent.url);
      }
    }
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

testEntitlementPermission();
