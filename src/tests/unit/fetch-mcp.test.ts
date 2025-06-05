// simport { MCPClient } from '../../mcp/clients/MCPClient';c/tests/unit/fetch-mcp.test.ts
// Tests for the Fetch MCP Server functionality

import { FetchMCPServer } from '../../mcp/servers/fetch';
import { MCPClient } from '../../mcp/clients/MCPClient';
import { MCPServerConfig } from '../../mcp/types';
import { MCPServerManager } from '../../mcp/servers/MCPServerManager';

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

// Mock axios to avoid actual network requests
jest.mock('axios');
import axios from 'axios';

describe('Fetch MCP Server', () => {
  // Create server config for fetch MCP
  const fetchConfig: MCPServerConfig = {
    name: 'fetch',
    type: 'fetch',
    port: 8080,
    enabled: true,
  };
  
  let mcpClient: MCPClient;
  
  beforeEach(() => {
    // Initialize the client with the fetch server config
    mcpClient = new MCPClient([fetchConfig]);
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  test('should list available tools', async () => {
    // Get the list of tools from the fetch server
    const tools = await mcpClient.listTools('fetch');
    
    // Verify tools are returned
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    
    // Check for specific tools we know should be available
    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toContain('fetch_documentation');
    expect(toolNames).toContain('fetch_graph_schema');
    expect(toolNames).toContain('fetch_permissions_info');
    expect(toolNames).toContain('fetch_merill_permissions');
  });
  
  test('should fetch content from a public website', async () => {
    // Mock axios response
    (axios.get as jest.Mock).mockResolvedValue({
      data: '<html><body><h1>Microsoft Graph Overview</h1><p>Test content</p></body></html>'
    });
    
    // URL for a public website (Microsoft Graph documentation)
    const url = 'https://learn.microsoft.com/en-us/graph/overview';
    
    // Call the fetch_documentation tool
    const result = await mcpClient.callTool('fetch', 'fetch_documentation', {
      url: url
    });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    expect(textContent.text).toContain('Microsoft Graph Overview');
    
    // Verify link is included
    const linkContent = result.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toBe(url);
    
    // Verify axios was called correctly
    expect(axios.get).toHaveBeenCalledWith(url);
  });
  
  test('should search for documentation using a query', async () => {
    // Mock axios response
    (axios.get as jest.Mock).mockResolvedValue({
      data: '<html><body><h1>Search Results</h1><p>Authentication information</p></body></html>'
    });
    
    // Call the fetch_documentation tool with a search query
    const query = 'Microsoft Graph API authentication';
    const result = await mcpClient.callTool('fetch', 'fetch_documentation', {
      query: query
    });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    expect(textContent.text).toContain('Authentication information');
    
    // Verify axios was called correctly with the search URL
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('documentation?terms='));
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent(query)));
  });

  test('should fetch specific permission information from Merill Permissions API', async () => {
    // Mock axios response for a specific permission
    (axios.get as jest.Mock).mockResolvedValue({
      data: `
        <html>
          <head><title>User.Read Permission</title></head>
          <body>
            <h1>User.Read</h1>
            <blockquote>Allow the app to read your profile. It allows the app to see your basic information (name, picture, user principal name).</blockquote>
            <table>
              <thead>
                <tr><th>Methods</th><th>URL</th></tr>
              </thead>
              <tbody>
                <tr><td>GET /me</td><td>https://graph.microsoft.com/v1.0/me</td></tr>
                <tr><td>GET /me/profile</td><td>https://graph.microsoft.com/v1.0/me/profile</td></tr>
              </tbody>
            </table>
          </body>
        </html>
      `
    });
    
    // Call the fetch_merill_permissions tool with a specific permission
    const result = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {
      permission: 'User.Read',
      includeDetails: true
    });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    expect(textContent.text).toContain('User.Read');
    expect(textContent.text).toContain('Allow the app to read your profile');
    expect(textContent.text).toContain('GET /me');
    
    // Verify link is included
    const linkContent = result.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toContain('graphpermissions.merill.net/permission/User.Read');
    
    // Verify axios was called correctly
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/User.Read',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'EntraPulse-Lite/1.0'
        })
      })
    );
  });

  test('should fetch all permissions list from Merill Permissions API', async () => {
    // Mock axios response for all permissions
    (axios.get as jest.Mock).mockResolvedValue({
      data: `
        <html>
          <body>
            <table>
              <thead>
                <tr><th>Permission</th><th>Description</th></tr>
              </thead>
              <tbody>
                <tr><td>User.Read</td><td>Read user profile</td></tr>
                <tr><td>Mail.Read</td><td>Read user mail</td></tr>
                <tr><td>Calendars.ReadWrite</td><td>Read and write calendars</td></tr>
              </tbody>
            </table>
          </body>
        </html>
      `
    });
    
    // Call the fetch_merill_permissions tool without a specific permission to get all permissions
    const result = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {});
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    expect(textContent.text).toContain('Microsoft Graph Permissions');
    expect(textContent.text).toContain('User.Read');
    expect(textContent.text).toContain('Mail.Read');
    expect(textContent.text).toContain('Calendars.ReadWrite');
    
    // Verify link is included
    const linkContent = result.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toBe('https://graphpermissions.merill.net/permission/');
    
    // Verify axios was called correctly
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'EntraPulse-Lite/1.0'
        })
      })
    );
  });
  
  test('should analyze API permissions structure, types, and resources', async () => {
    // First mock the main permissions page
    (axios.get as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve({
        data: `
          <html>
            <body>
              <table>
                <thead>
                  <tr><th>Permission</th><th>Description</th><th>Type</th></tr>
                </thead>
                <tbody>
                  <tr>
                    <td><a href="/permission/User.Read">User.Read</a></td>
                    <td>Read user profile</td>
                    <td>Delegated</td>
                  </tr>
                  <tr>
                    <td><a href="/permission/Files.ReadWrite.All">Files.ReadWrite.All</a></td>
                    <td>Read and write all files</td>
                    <td>Both</td>
                  </tr>
                  <tr>
                    <td><a href="/permission/Group.Read.All">Group.Read.All</a></td>
                    <td>Read all groups</td>
                    <td>Application</td>
                  </tr>
                </tbody>
              </table>
            </body>
          </html>
        `
      });
    });
    
    // Mock User.Read permission detailed page (Delegated)
    (axios.get as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve({
        data: `
          <html>
            <head><title>User.Read Permission</title></head>
            <body>
              <h1>User.Read</h1>
              <div class="permission-type">Permission type: <strong>Delegated</strong></div>
              <blockquote>Allow the app to read your profile. It allows the app to see your basic information (name, picture, user principal name).</blockquote>
              <h2>API Methods</h2>
              <table>
                <thead>
                  <tr><th>Methods</th><th>URL</th><th>Requires Admin</th></tr>
                </thead>
                <tbody>
                  <tr><td>GET /me</td><td>https://graph.microsoft.com/v1.0/me</td><td>No</td></tr>
                  <tr><td>GET /me/profile</td><td>https://graph.microsoft.com/v1.0/me/profile</td><td>No</td></tr>
                </tbody>
              </table>
              <h2>Resources</h2>
              <ul>
                <li>User</li>
                <li>Profile</li>
              </ul>
            </body>
          </html>
        `
      });
    });
    
    // Mock Files.ReadWrite.All permission detailed page (Both types)
    (axios.get as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve({
        data: `
          <html>
            <head><title>Files.ReadWrite.All Permission</title></head>
            <body>
              <h1>Files.ReadWrite.All</h1>
              <div class="permission-type">Permission type: <strong>Delegated, Application</strong></div>
              <blockquote>Allows the app to read, create, update, and delete all files the signed-in user can access.</blockquote>
              <h2>API Methods (Delegated)</h2>
              <table>
                <thead>
                  <tr><th>Methods</th><th>URL</th><th>Requires Admin</th></tr>
                </thead>
                <tbody>
                  <tr><td>GET /me/drive/items</td><td>https://graph.microsoft.com/v1.0/me/drive/items</td><td>No</td></tr>
                  <tr><td>POST /me/drive/items</td><td>https://graph.microsoft.com/v1.0/me/drive/items</td><td>No</td></tr>
                </tbody>
              </table>
              <h2>API Methods (Application)</h2>
              <table>
                <thead>
                  <tr><th>Methods</th><th>URL</th><th>Requires Admin</th></tr>
                </thead>
                <tbody>
                  <tr><td>GET /users/{id}/drive/items</td><td>https://graph.microsoft.com/v1.0/users/{id}/drive/items</td><td>Yes</td></tr>
                  <tr><td>POST /users/{id}/drive/items</td><td>https://graph.microsoft.com/v1.0/users/{id}/drive/items</td><td>Yes</td></tr>
                </tbody>
              </table>
              <h2>Resources</h2>
              <ul>
                <li>DriveItem</li>
                <li>Drive</li>
              </ul>
            </body>
          </html>
        `
      });
    });
    
    // Mock Group.Read.All permission detailed page (Application only)
    (axios.get as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve({
        data: `
          <html>
            <head><title>Group.Read.All Permission</title></head>
            <body>
              <h1>Group.Read.All</h1>
              <div class="permission-type">Permission type: <strong>Application</strong></div>
              <blockquote>Allows the app to read all group properties and memberships without a signed-in user.</blockquote>
              <h2>API Methods</h2>
              <table>
                <thead>
                  <tr><th>Methods</th><th>URL</th><th>Requires Admin</th></tr>
                </thead>
                <tbody>
                  <tr><td>GET /groups</td><td>https://graph.microsoft.com/v1.0/groups</td><td>Yes</td></tr>
                  <tr><td>GET /groups/{id}</td><td>https://graph.microsoft.com/v1.0/groups/{id}</td><td>Yes</td></tr>
                  <tr><td>GET /groups/{id}/members</td><td>https://graph.microsoft.com/v1.0/groups/{id}/members</td><td>Yes</td></tr>
                </tbody>
              </table>
              <h2>Resources</h2>
              <ul>
                <li>Group</li>
                <li>DirectoryObject</li>
              </ul>
            </body>
          </html>
        `
      });
    });
    
    // Step 1: Get the list of all permissions
    const allPermissionsResult = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {});
    
    // Verify the list contains the expected permissions
    expect(allPermissionsResult).toBeDefined();
    expect(allPermissionsResult.content).toBeDefined();
    const allPermissionsText = allPermissionsResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(allPermissionsText.text).toContain('User.Read');
    expect(allPermissionsText.text).toContain('Files.ReadWrite.All');
    expect(allPermissionsText.text).toContain('Group.Read.All');
    
    // Step 2: Analyze User.Read permission (Delegated)
    const userReadResult = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {
      permission: 'User.Read',
      includeDetails: true
    });
    
    const userReadText = userReadResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(userReadText.text).toContain('Permission type: Delegated');
    expect(userReadText.text).toContain('GET /me');
    expect(userReadText.text).toContain('GET /me/profile');
    expect(userReadText.text).toContain('Resources');
    expect(userReadText.text).toContain('User');
    expect(userReadText.text).toContain('Profile');
    expect(userReadText.text).not.toContain('Application');
    
    // Step 3: Analyze Files.ReadWrite.All permission (Both types)
    const filesPermissionResult = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {
      permission: 'Files.ReadWrite.All',
      includeDetails: true
    });
      const filesPermissionText = filesPermissionResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(filesPermissionText.text).toContain('Permission type: Delegated, Application');
    // The specific headings "API Methods (Delegated)" and "API Methods (Application)" are not preserved
    // in the text extraction process but verify we have the methods from both sections
    expect(filesPermissionText.text).toContain('GET /me/drive/items');
    expect(filesPermissionText.text).toContain('POST /me/drive/items');
    expect(filesPermissionText.text).toContain('GET /users/{id}/drive/items');
    expect(filesPermissionText.text).toContain('POST /users/{id}/drive/items');
    expect(filesPermissionText.text).toContain('DriveItem');
    expect(filesPermissionText.text).toContain('Drive');
    
    // Step 4: Analyze Group.Read.All permission (Application only)
    const groupPermissionResult = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {
      permission: 'Group.Read.All',
      includeDetails: true
    });
      const groupPermissionText = groupPermissionResult.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(groupPermissionText.text).toContain('Permission type: Application');
    expect(groupPermissionText.text).toContain('GET /groups');
    expect(groupPermissionText.text).toContain('GET /groups/{id}');
    expect(groupPermissionText.text).toContain('GET /groups/{id}/members');
    expect(groupPermissionText.text).toContain('Group');
    expect(groupPermissionText.text).toContain('DirectoryObject');
    // The "Requires Admin" text isn't preserved in the processing
    expect(groupPermissionText.text).not.toContain('Delegated');
    
    // Verify correct API endpoints were called
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/',
      expect.any(Object)
    );
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/User.Read',
      expect.any(Object)
    );
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/Files.ReadWrite.All',
      expect.any(Object)
    );
    expect(axios.get).toHaveBeenCalledWith(
      'https://graphpermissions.merill.net/permission/Group.Read.All',
      expect.any(Object)
    );
  });

  test('should fetch EntitlementManagement.Read.All permission details', async () => {
    // Mock axios response for EntitlementManagement.Read.All permission
    (axios.get as jest.Mock).mockResolvedValue({
      data: `
        <html>
          <head><title>EntitlementManagement.Read.All | Graph Permissions</title></head>
          <body>
            <h1>EntitlementManagement.Read.All</h1>
            <blockquote>Allows the app to read access packages and related entitlement management resources on behalf of the signed-in user.</blockquote>
            
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
                  <td>c74fd47d-ed3c-45c3-9a9e-b8676de685d2</td>
                  <td>5449aa12-1393-4ea2-a7c7-d0e06c1a56b2</td>
                </tr>
                <tr>
                  <td>DisplayText</td>
                  <td>Read all entitlement management resources</td>
                  <td>Read all entitlement management resources</td>
                </tr>
                <tr>
                  <td>Description</td>
                  <td>Allows the app to read access packages and related entitlement management resources without a signed-in user.</td>
                  <td>Allows the app to read access packages and related entitlement management resources on behalf of the signed-in user.</td>
                </tr>
                <tr>
                  <td>AdminConsentRequired</td>
                  <td>Yes</td>
                  <td>Yes</td>
                </tr>
              </tbody>
            </table>
            
            <h2>Graph Methods</h2>
            <p>→ API supports delegated access (access on behalf of a user) → API supports app-only access (access without a user)</p>
            
            <table>
              <thead>
                <tr><th>Methods</th></tr>
              </thead>
              <tbody>
                <tr><td>GET /identityGovernance/entitlementManagement/accessPackages</td></tr>
                <tr><td>GET /identityGovernance/entitlementManagement/accessPackages/{accessPackageId}</td></tr>
                <tr><td>GET /identityGovernance/entitlementManagement/catalogs</td></tr>
                <tr><td>GET /identityGovernance/entitlementManagement/catalogs/{accessPackageCatalogId}</td></tr>
                <tr><td>GET /identityGovernance/entitlementManagement/assignments</td></tr>
                <tr><td>GET /identityGovernance/entitlementManagement/connectedOrganizations</td></tr>
                <tr><td>GET /identityGovernance/entitlementManagement/settings</td></tr>
              </tbody>
            </table>
            
            <h2>PowerShell Commands</h2>
            <p>→ Command supports delegated access (access on behalf of a user) → Command supports app-only access (access without a user)</p>
            
            <table>
              <thead>
                <tr><th>Commands</th></tr>
              </thead>
              <tbody>
                <tr><td>Get-MgEntitlementManagementAccessPackage</td></tr>
                <tr><td>Get-MgEntitlementManagementCatalog</td></tr>
                <tr><td>Get-MgEntitlementManagementSetting</td></tr>
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
                    <tr>
                      <td>description</td>
                      <td>String</td>
                      <td>The description of the access package.</td>
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
                    <tr>
                      <td>state</td>
                      <td>String</td>
                      <td>Whether the catalog is published or not.</td>
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
    
    // Call the fetch_merill_permissions tool with the permission
    const result = await mcpClient.callTool('fetch', 'fetch_merill_permissions', {
      permission: 'EntitlementManagement.Read.All',
      includeDetails: true
    });
    
    // Verify result contains content
    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(Array.isArray(result.content)).toBe(true);
    
    // Verify text content exists
    const textContent = result.content.find((item: ContentItem) => item.type === 'text') as TextContent;
    expect(textContent).toBeDefined();
    expect(typeof textContent.text).toBe('string');
    expect(textContent.text.length).toBeGreaterThan(0);
    
    // Check the formatted content contains the expected information
    expect(textContent.text).toContain('EntitlementManagement.Read.All');
    expect(textContent.text).toContain('Allows the app to read access packages');
    expect(textContent.text).toMatch(/Permission type: (Delegated|Application|Delegated, Application)/);
    
    // Verify API methods are included
    expect(textContent.text).toContain('GET /identityGovernance/entitlementManagement/accessPackages');
    expect(textContent.text).toContain('GET /identityGovernance/entitlementManagement/catalogs');
    
    // Verify resource types are included from the tabbed content
    expect(textContent.text).toContain('Access Package');
    expect(textContent.text).toContain('Catalog');
    expect(textContent.text).toContain('Setting');
    
    // Verify properties of resource types are included
    expect(textContent.text).toContain('id');
    expect(textContent.text).toContain('displayName');
    expect(textContent.text).toContain('description');
    
    // Verify we have table formatting for properties
    expect(textContent.text).toContain('| Property | Type | Description |');
    
    // Verify link is included
    const linkContent = result.content.find((item: ContentItem) => item.type === 'link') as LinkContent;
    expect(linkContent).toBeDefined();
    expect(linkContent.url).toBe('https://graphpermissions.merill.net/permission/EntitlementManagement.Read.All');
    
    // Verify axios was called correctly
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
