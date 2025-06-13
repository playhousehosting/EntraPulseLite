// test-permission.ts
// Simple script to test fetching permission details

import { FetchMCPServer } from './src/mcp/servers/fetch';
import { MCPServerConfig } from './src/mcp/types';
import axios from 'axios';

// Mock axios to prevent actual network requests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Set up mock response
mockedAxios.get.mockResolvedValue({
  data: `
    <html>
      <head><title>EntitlementManagement.Read.All | Graph Permissions</title></head>
      <body>
        <h1>EntitlementManagement.Read.All</h1>
        <blockquote>Allows the app to read access packages and related entitlement management resources on behalf of the signed-in user.</blockquote>
        
        <div class="permission-type">Permission type: <strong>Delegated, Application</strong></div>
        
        <table>
          <thead>
            <tr><th>Methods</th></tr>
          </thead>
          <tbody>
            <tr><td>GET /identityGovernance/entitlementManagement/accessPackages</td></tr>
            <tr><td>GET /identityGovernance/entitlementManagement/catalogs</td></tr>
          </tbody>
        </table>
        
        <div class="tabGroup" id="tabgroup_2">
          <ul role="tablist">
            <a href="#tabpanel_2_accessPackage" role="tab">Access Package</a>
            <a href="#tabpanel_2_catalog" role="tab">Catalog</a>
          </ul>
          <section id="tabpanel_2_accessPackage" role="tabpanel">
            <h2>Access Package</h2>
            <p>Graph reference: <a href="https://graph.microsoft.com/v1.0/$metadata#accessPackage">accessPackage</a></p>
            <table>
              <thead>
                <tr><th>Property</th><th>Type</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>id</td>
                  <td>String</td>
                  <td>The unique identifier for the access package.</td>
                </tr>
                <tr>
                  <td>displayName</td>
                  <td>String</td>
                  <td>The display name of the access package.</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </body>
    </html>
  `
});

async function testFetchPermission() {
  try {
    console.log('Starting test...');
    // Create a FetchMCPServer instance
    const fetchConfig: MCPServerConfig = {
      name: 'fetch',
      type: 'fetch',
      port: 8080,
      enabled: true,
    };
    
    console.log('Creating FetchMCPServer...');
    const fetchServer = new FetchMCPServer(fetchConfig);
    
    // Create a request for EntitlementManagement.Read.All permission
    const request = {
      id: '123',
      method: 'tools/call',
      params: {
        name: 'fetch_merill_permissions',
        arguments: {
          permission: 'EntitlementManagement.Read.All',
          includeDetails: true
        }
      }
    };
    
    console.log('Fetching permission details for EntitlementManagement.Read.All...');
    const response = await fetchServer.handleRequest(request);
    
    if (response.error) {
      console.error('Error:', response.error);
    } else {
      const textContent = response.result.content.find((item: any) => item.type === 'text');
      if (textContent) {
        console.log('Permission Details:');
        console.log(textContent.text);
      }
      
      const linkContent = response.result.content.find((item: any) => item.type === 'link');
      if (linkContent) {
        console.log('\nSource URL:', linkContent.url);
      }
    }
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

testFetchPermission();
