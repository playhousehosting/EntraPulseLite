// src/tests/unit/fetch-mcp-entitlement.test.ts
// Tests for the Fetch MCP Server handling of EntitlementManagement.Read.All permission

import { FetchMCPServer } from '../../mcp/servers/fetch';
import { MCPServerConfig } from '../../mcp/types';

// Mock axios to avoid actual network requests
jest.mock('axios');
import axios from 'axios';

describe('Fetch MCP Server - EntitlementManagement.Read.All', () => {
  // Create server config for fetch MCP
  const fetchConfig: MCPServerConfig = {
    name: 'fetch',
    type: 'fetch',
    port: 8080,
    enabled: true,
  };
  
  let fetchServer: FetchMCPServer;
  
  beforeEach(() => {
    // Initialize the server with the fetch config
    fetchServer = new FetchMCPServer(fetchConfig);
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock axios response for EntitlementManagement.Read.All permission
    (axios.get as jest.Mock).mockResolvedValue({
      data: `
        <html>
          <head><title>EntitlementManagement.Read.All | Graph Permissions</title></head>
          <body>
            <h1>EntitlementManagement.Read.All</h1>
            <blockquote>Allows the app to read access packages and related entitlement management resources on behalf of the signed-in user.</blockquote>
            
            <div class="permission-type">Permission type: <strong>Delegated, Application</strong></div>
            
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Application</th>
                  <th>Delegated</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Identifier</td>
                  <td>aaaaaaaa-bbbb-cccc-dddd-example1111</td>
                  <td>bbbbbbbb-cccc-dddd-eeee-example2222</td>
                </tr>
                <tr>
                  <td>AdminConsentRequired</td>
                  <td>Yes</td>
                  <td>Yes</td>
                </tr>
              </tbody>
            </table>
            
            <h2>Graph Methods</h2>
            <table>
              <thead>
                <tr><th>Methods</th></tr>
              </thead>
              <tbody>
                <tr><td>GET /identityGovernance/entitlementManagement/accessPackages</td></tr>
                <tr><td>GET /identityGovernance/entitlementManagement/catalogs</td></tr>
                <tr><td>GET /identityGovernance/entitlementManagement/settings</td></tr>
              </tbody>
            </table>
            
            <div class="tabGroup" id="tabgroup_2">
              <ul role="tablist">
                <a href="#tabpanel_2_accessPackage" role="tab">Access Package</a>
                <a href="#tabpanel_2_catalog" role="tab">Catalog</a>
                <a href="#tabpanel_2_setting" role="tab">Setting</a>
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
              <section id="tabpanel_2_catalog" role="tabpanel">
                <h2>Catalog</h2>
                <p>Graph reference: <a href="https://graph.microsoft.com/v1.0/$metadata#catalog">catalog</a></p>
                <table>
                  <thead>
                    <tr><th>Property</th><th>Type</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>id</td>
                      <td>String</td>
                      <td>The unique identifier for the catalog.</td>
                    </tr>
                    <tr>
                      <td>displayName</td>
                      <td>String</td>
                      <td>The display name of the catalog.</td>
                    </tr>
                  </tbody>
                </table>
              </section>
              <section id="tabpanel_2_setting" role="tabpanel">
                <h2>Setting</h2>
                <p>Graph reference: <a href="https://graph.microsoft.com/v1.0/$metadata#setting">setting</a></p>
                <table>
                  <thead>
                    <tr><th>Property</th><th>Type</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>requestApprovalSettings</td>
                      <td>Object</td>
                      <td>Settings for approval of requests.</td>
                    </tr>
                    <tr>
                      <td>expirationSettings</td>
                      <td>Object</td>
                      <td>Settings for expiration of access.</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            </div>
          </body>
        </html>
      `
    });
  });
  
  test('should fetch EntitlementManagement.Read.All permission details directly', async () => {
    // Create a request for the permission
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
    
    // Handle the request
    const response = await fetchServer.handleRequest(request);
    
    // Verify response structure
    expect(response).toBeDefined();
    expect(response.id).toBe('123');
    expect(response.result).toBeDefined();
    expect(response.result.content).toBeDefined();
    expect(Array.isArray(response.result.content)).toBe(true);
    
    // Verify text content
    const textContent = response.result.content.find((item: any) => item.type === 'text');
    expect(textContent).toBeDefined();
    expect(textContent.text).toBeDefined();
    
    // Log the text content for inspection
    console.log('Permission Details:\n', textContent.text);
    
    // Check for expected content
    expect(textContent.text).toContain('# EntitlementManagement.Read.All');
    expect(textContent.text).toContain('Permission type: Delegated, Application');
    expect(textContent.text).toContain('GET /identityGovernance/entitlementManagement/accessPackages');
    expect(textContent.text).toContain('GET /identityGovernance/entitlementManagement/catalogs');
    expect(textContent.text).toContain('GET /identityGovernance/entitlementManagement/settings');
    
    // Verify resource types are included
    expect(textContent.text).toContain('### Access Package');
    expect(textContent.text).toContain('### Catalog');
    expect(textContent.text).toContain('### Setting');
    
    // Verify resource properties are included
    expect(textContent.text).toContain('| `id` | String | The unique identifier');
    expect(textContent.text).toContain('| `displayName` | String | The display name');
    
    // Verify link content
    const linkContent = response.result.content.find((item: any) => item.type === 'link');
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toBe('https://graphpermissions.merill.net/permission/EntitlementManagement.Read.All');
    expect(linkContent.name).toBe('Microsoft Graph Permission Details');
    
    // Verify axios was called with the correct URL
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/EntitlementManagement.Read.All',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'EntraPulse-Lite/1.0'
        })
      })
    );
  });
});
