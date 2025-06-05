// FetchMCPServer.ts
// MCP Server implementation for fetching Microsoft documentation and resources

import { MCPRequest, MCPResponse, MCPServerConfig, MCPTool } from '../../types';
import axios from 'axios';
import { MCPErrorHandler, ErrorCode } from '../../utils';

interface FetchDocumentationParams {
  url?: string;
  query?: string;
  maxLength?: number;
}

interface FetchGraphSchemaParams {
  entity?: string;
  version?: string;
}

interface FetchPermissionsParams {
  permission?: string;
  category?: string;
}

interface FetchMerillPermissionsParams {
  permission?: string;
  includeDetails?: boolean;
}

export class FetchMCPServer {
  private config: MCPServerConfig;
  private tools: MCPTool[] = [];
  private baseUrl: string = 'https://learn.microsoft.com';
  private graphApiBaseUrl: string = 'https://graph.microsoft.com';
  
  // Simple caching mechanism to improve performance
  private permissionsCache: Map<string, any> = new Map();
  private cacheTTL: number = 3600000; // 1 hour in milliseconds

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.initializeTools();
  }

  private initializeTools(): void {
    this.tools = [
      {
        name: 'fetch_documentation',
        description: 'Fetch Microsoft Learn documentation for Microsoft Graph API and related topics',
        inputSchema: {
          type: 'object',
          properties: {
            url: { 
              type: 'string',
              description: 'URL to fetch documentation from. If not provided, will use query to search Microsoft Learn'
            },
            query: { 
              type: 'string',
              description: 'Query to search for on Microsoft Learn'
            },
            maxLength: {
              type: 'number', 
              description: 'Maximum length of content to return',
              default: 10000
            }
          }
        }
      },
      {
        name: 'fetch_graph_schema',
        description: 'Fetch Microsoft Graph API schema information for entities',
        inputSchema: {
          type: 'object',
          properties: {
            entity: { 
              type: 'string',
              description: 'Microsoft Graph entity to fetch schema for (e.g., user, group, message)'
            },
            version: { 
              type: 'string',
              description: 'API version (v1.0 or beta)',
              default: 'v1.0'
            }
          },
          required: ['entity']
        }
      },
      {
        name: 'fetch_permissions_info',
        description: 'Fetch information about Microsoft Graph API permissions',
        inputSchema: {
          type: 'object',
          properties: {
            permission: { 
              type: 'string', 
              description: 'Specific permission to look up (e.g., User.Read, Mail.ReadWrite)'
            },
            category: {
              type: 'string',
              description: 'Category of permissions to fetch (e.g., user, mail, calendar)'
            }
          }
        }
      },
      {
        name: 'fetch_merill_permissions',
        description: 'Fetch detailed Microsoft Graph permission information from graphpermissions.merill.net',
        inputSchema: {
          type: 'object',
          properties: {
            permission: { 
              type: 'string', 
              description: 'Specific permission to look up (e.g., User.Read, Mail.ReadWrite). If not provided, returns a list of all permissions.'
            },
            includeDetails: {
              type: 'boolean',
              description: 'Whether to include detailed API method information',
              default: true
            }
          }
        }
      }
    ];
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    switch (request.method) {
      case 'tools/list':
        return {
          id: request.id,
          result: this.tools
        };
      case 'tools/call':
        if (!request.params || !request.params.name) {
          return {
            id: request.id,
            error: {
              code: 400,
              message: 'Tool name is required'
            }
          };
        }
        return this.executeTool(request);
      default:
        return {
          id: request.id,
          error: {
            code: 404,
            message: `Method '${request.method}' not found`
          }
        };
    }
  }

  private async executeTool(request: MCPRequest): Promise<MCPResponse> {
    const toolName = request.params.name;
    const args = request.params.arguments || {};
    
    try {
      switch (toolName) {
        case 'fetch_documentation':
          return {
            id: request.id,
            result: await this.fetchDocumentation(args as FetchDocumentationParams)
          };
        case 'fetch_graph_schema':
          return {
            id: request.id,
            result: await this.fetchGraphSchema(args as FetchGraphSchemaParams)
          };
        case 'fetch_permissions_info':
          return {
            id: request.id,
            result: await this.fetchPermissionsInfo(args as FetchPermissionsParams)
          };
        case 'fetch_merill_permissions':
          return {
            id: request.id,
            result: await this.fetchMerillPermissions(args as FetchMerillPermissionsParams)
          };
        default:
          return {
            id: request.id,
            error: MCPErrorHandler.createError(
              ErrorCode.NOT_FOUND,
              `Tool '${toolName}' not found`
            )
          };
      }
    } catch (error) {
      return {
        id: request.id,
        error: MCPErrorHandler.handleError(error, `FetchMCPServer.executeTool.${toolName}`)
      };
    }
  }

  private async fetchDocumentation(params: FetchDocumentationParams): Promise<any> {
    try {
      let url = '';
      
      if (params.url) {
        // Direct URL fetch
        url = params.url.startsWith('http') ? params.url : `${this.baseUrl}${params.url}`;
      } else if (params.query) {
        // Search Microsoft Learn
        url = `${this.baseUrl}/en-us/search/documentation?terms=${encodeURIComponent(params.query)}`;
      } else {
        throw new Error('Either url or query parameter is required');
      }

      const response = await axios.get(url);
      const html = response.data;
      
      // Extract relevant content from the HTML (simplified approach)
      const text = this.extractTextContent(html);
      
      // Trim content if necessary
      const maxLength = params.maxLength || 10000;
      const content = text.length > maxLength ? 
        text.substring(0, maxLength) + '... (content truncated)' : 
        text;

      return {
        content: [
          {
            type: 'text',
            text: content
          },
          {
            type: 'link',
            url: url,
            name: 'Source Documentation'
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching documentation:', error);
      throw new Error(`Failed to fetch documentation: ${(error as Error).message}`);
    }
  }

  private async fetchGraphSchema(params: FetchGraphSchemaParams): Promise<any> {
    try {
      if (!params.entity) {
        throw new Error('Entity parameter is required');
      }
      
      const entity = params.entity.toLowerCase();
      const version = params.version || 'v1.0';
      const url = `${this.graphApiBaseUrl}/${version}/$metadata`;
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/xml',
          'User-Agent': 'EntraPulse-Lite/1.0'
        }
      });
      
      const xmlData = response.data;
      
      // This is a simplified implementation - in production code we would use a proper XML parser
      // to extract the specific entity schema based on the requested entity name
      const entityPattern = new RegExp(`<EntityType\\s+Name="${entity}"[^>]*>([\\s\\S]*?)</EntityType>`, 'i');
      const match = entityPattern.exec(xmlData);
      
      let content = '';
      if (match && match[1]) {
        content = `Schema for ${entity} (${version}):\n\n${match[1]}`;
      } else {
        content = `Schema for entity '${entity}' not found in the metadata`;
      }

      return {
        content: [
          {
            type: 'text',
            text: content
          },
          {
            type: 'link',
            url: url,
            name: 'Microsoft Graph Metadata'
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching Graph schema:', error);
      throw new Error(`Failed to fetch Graph schema: ${(error as Error).message}`);
    }
  }

  private async fetchPermissionsInfo(params: FetchPermissionsParams): Promise<any> {
    try {
      const url = 'https://learn.microsoft.com/en-us/graph/permissions-reference';
      
      const response = await axios.get(url);
      const html = response.data;
      
      let content = '';
      if (params.permission) {
        // Look for specific permission
        const permissionPattern = new RegExp(`<h3[^>]*id="([^"]*${params.permission}[^"]*)"[^>]*>([\\s\\S]*?)<\\/h3>([\\s\\S]*?)(?:<h3|<h2)`, 'i');
        const match = permissionPattern.exec(html);
        
        if (match && match[3]) {
          content = `Permission: ${match[2]}\n\n${this.extractTextContent(match[3])}`;
        } else {
          content = `Information about permission "${params.permission}" not found in the permissions reference.`;
        }
      } else if (params.category) {
        // Look for specific category
        const categoryPattern = new RegExp(`<h2[^>]*id="([^"]*${params.category}[^"]*)-permissions"[^>]*>([\\s\\S]*?)<\\/h2>([\\s\\S]*?)(?:<h2|$)`, 'i');
        const match = categoryPattern.exec(html);
        
        if (match && match[3]) {
          content = `${match[2]} Permissions:\n\n${this.extractTextContent(match[3])}`;
        } else {
          content = `Information about "${params.category}" permissions not found.`;
        }
      } else {
        // List all permission categories
        content = 'Microsoft Graph Permissions Categories:\n\n';
        const categoryPattern = /<h2[^>]*id="([^"]*)-permissions"[^>]*>([^<]*)/g;
        
        let match;
        while ((match = categoryPattern.exec(html)) !== null) {
          content += `- ${match[2].trim()}: [View details](${url}#${match[1]}-permissions)\n`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: content
          },
          {
            type: 'link',
            url: url,
            name: 'Microsoft Graph Permissions Reference'
          }
        ]
      };
    } catch (error) {
      console.error('Error fetching permissions info:', error);
      throw new Error(`Failed to fetch permissions info: ${(error as Error).message}`);
    }
  }

  private async fetchMerillPermissions(params: FetchMerillPermissionsParams): Promise<any> {
    try {
      if (params.permission) {
        // Fetch specific permission details
        const permissionUrl = `https://graphpermissions.merill.net/permission/${params.permission}`;
        
        // Check if we have a cached response that isn't expired
        const cacheKey = `permission_${params.permission}_${params.includeDetails ? 'detailed' : 'simple'}`;
        const cachedData = this.permissionsCache.get(cacheKey);
        
        if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTTL) {
          console.log(`Using cached data for permission: ${params.permission}`);
          return cachedData.data;
        }
        
        const response = await axios.get(permissionUrl, {
          headers: {
            'User-Agent': 'EntraPulse-Lite/1.0'
          }
        });
        
        const html = response.data;
        
        // Extract the permission details with improved parsing logic
        const titlePattern = /<h1[^>]*>(.*?)<\/h1>/i;
        const titleMatch = titlePattern.exec(html);
        const title = titleMatch ? this.extractTextContent(titleMatch[1]).trim() : params.permission;
        
        // Extract permission type with multiple strategies for better robustness
        let permissionType = '';
        
        // Strategy 1: Look for the dedicated permission type div
        const permissionTypePattern = /<div class="permission-type">([\s\S]*?)<\/div>/i;
        const permissionTypeMatch = permissionTypePattern.exec(html);
        if (permissionTypeMatch) {
          permissionType = this.extractTextContent(permissionTypeMatch[1]).trim();
        } else {
          // Strategy 2: Look for type in a table cell format
          const altTypePattern = /<td[^>]*>Type<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i;
          const altTypeMatch = altTypePattern.exec(html);
          if (altTypeMatch) {
            permissionType = `Permission type: ${this.extractTextContent(altTypeMatch[1]).trim()}`;
          } else {
            // Strategy 3: Look for any occurrence mentioning "Delegated" or "Application"
            if (html.includes('Delegated') && html.includes('Application')) {
              permissionType = 'Permission type: Delegated, Application';
            } else if (html.includes('Delegated')) {
              permissionType = 'Permission type: Delegated';
            } else if (html.includes('Application')) {
              permissionType = 'Permission type: Application';
            }
          }
        }
        
        // Extract description
        const descriptionPattern = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i;
        const descriptionMatch = descriptionPattern.exec(html);
        const description = descriptionMatch ? this.extractTextContent(descriptionMatch[1]).trim() : '';
        
        // Extract methods and resources if requested
        let methods: string[] = [];
        let resources: string[] = [];
        let resourceTypes: Array<{name: string, properties?: Array<{name: string, type: string, description: string}>}> = [];
        
        if (params.includeDetails) {
          // Extract API methods from tables with enhanced parsing
          const methodsPattern = /<table[^>]*>[\s\S]*?<th[^>]*>Methods<\/th>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/gi;
          let methodsMatch;
          
          while ((methodsMatch = methodsPattern.exec(html)) !== null) {
            const methodsBodyContent = methodsMatch[1];
            const methodRows = methodsBodyContent.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
            
            if (methodRows) {
              methodRows.forEach(row => {
                const methodCellPattern = /<td[^>]*>([\s\S]*?)<\/td>/i;
                const methodCellMatch = methodCellPattern.exec(row);
                if (methodCellMatch && methodCellMatch[1]) {
                  const method = this.extractTextContent(methodCellMatch[1]).trim();
                  if (method && !methods.includes(method)) methods.push(method);
                }
              });
            }
          }
          
          // If the standard pattern fails, try an alternative approach to find methods
          if (methods.length === 0) {
            const altMethodsPattern = /<td[^>]*>(GET|POST|PATCH|PUT|DELETE)[^<]*<\/td>/gi;
            let altMethodMatch;
            
            while ((altMethodMatch = altMethodsPattern.exec(html)) !== null) {
              const method = this.extractTextContent(altMethodMatch[0]).trim();
              if (method && !methods.includes(method)) methods.push(method);
            }
          }
          
          // Extract resource information with improved detection for tabbed resources
          
          // First check for tabbed resources (like in AuditLog.Read.All)
          const tabGroupMatch = html.match(/<div\s+class="tabGroup"\s+id="tabgroup_2"[\s\S]*?<ul\s+role="tablist">([\s\S]*?)<\/ul>/i);
          
          if (tabGroupMatch && tabGroupMatch[1]) {
            // Extract resource type tabs
            const tabsContent = tabGroupMatch[1];
            const tabsPattern = /<a\s+href="#tabpanel_2_([^"]*)"[^>]*>([^<]+)<\/a>/gi;
            let tabMatch;
            
            while ((tabMatch = tabsPattern.exec(tabsContent)) !== null) {
              const resourceId = tabMatch[1];
              const resourceTypeName = tabMatch[2].trim();
              
              // Add to resources list
              if (resourceTypeName && !resources.includes(resourceTypeName)) {
                resources.push(resourceTypeName);
              }
              
              // Find the resource panel content
              const tabPanelPattern = new RegExp(`<section\\s+id="tabpanel_2_${resourceId}"[^>]*>[\\s\\S]*?Graph reference:\\s*<a[^>]*>([^<]+)<\\/a>[\\s\\S]*?<table[^>]*>[\\s\\S]*?<tbody>([\\s\\S]*?)<\\/tbody>`, 'i');
              const tabPanelMatch = tabPanelPattern.exec(html);
              
              if (tabPanelMatch && tabPanelMatch[2]) {
                // Extract properties from the table
                const propertiesRows = tabPanelMatch[2].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
                const properties: Array<{name: string, type: string, description: string}> = [];
                
                if (propertiesRows) {
                  propertiesRows.forEach(row => {
                    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
                    if (cells && cells.length >= 3) {
                      const propName = this.extractTextContent(cells[0]).trim();
                      const propType = this.extractTextContent(cells[1]).trim();
                      const propDesc = this.extractTextContent(cells[2]).trim();
                      
                      properties.push({
                        name: propName,
                        type: propType,
                        description: propDesc
                      });
                    }
                  });
                }
                
                resourceTypes.push({
                  name: resourceTypeName,
                  properties: properties
                });
              } else {
                // If we can't extract properties, just add the resource name
                resourceTypes.push({ name: resourceTypeName });
              }
            }
          } else {
            // Fallback for non-tabbed resources
            const resourceListMatch = html.match(/<h2[^>]*>Resources<\/h2>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i);
            
            if (resourceListMatch && resourceListMatch[1]) {
              const resourceListHtml = resourceListMatch[1];
              
              // Extract resource types from bullet list
              const resourceItemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
              let resourceItemMatch;
              
              while ((resourceItemMatch = resourceItemPattern.exec(resourceListHtml)) !== null) {
                const resourceTypeName = this.extractTextContent(resourceItemMatch[1]).trim();
                if (resourceTypeName && !resources.includes(resourceTypeName)) {
                  resources.push(resourceTypeName);
                  resourceTypes.push({ name: resourceTypeName });
                }
              }
            }
          }
          
          // If no resource tabs found, try the standard resource list approach
          if (resources.length === 0) {
            const resourcesPattern = /<h2[^>]*>Resources<\/h2>([\s\S]*?)<(?:h2|\/body)/i;
            const resourcesMatch = resourcesPattern.exec(html);
            if (resourcesMatch && resourcesMatch[1]) {
              const resourcesList = resourcesMatch[1];
              const resourceItemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
              let resourceItemMatch;
              
              while ((resourceItemMatch = resourceItemPattern.exec(resourcesList)) !== null) {
                const resource = this.extractTextContent(resourceItemMatch[1]).trim();
                if (resource && !resources.includes(resource)) resources.push(resource);
              }
            }
          }
          
          // If no resources found, try alternative patterns
          if (resources.length === 0) {
            const altResourcesPattern = /<h[34][^>]*>Resources<\/h[34]>([\s\S]*?)<(?:h[234]|\/body)/i;
            const altResourcesMatch = altResourcesPattern.exec(html);
            if (altResourcesMatch && altResourcesMatch[1]) {
              const resourcesList = altResourcesMatch[1];
              const resourceItemPattern = /<li[^>]*>([\s\S]*?)<\/li>/gi;
              let resourceItemMatch;
              
              while ((resourceItemMatch = resourceItemPattern.exec(resourcesList)) !== null) {
                const resource = this.extractTextContent(resourceItemMatch[1]).trim();
                if (resource && !resources.includes(resource)) resources.push(resource);
              }
            }
          }
        }
        
        // Format the output with enhanced styling
        let formattedText = `# ${title}\n\n`;
        
        // Add permission type if available
        if (permissionType) {
          formattedText += `**${permissionType}**\n\n`;
        }
        
        // Add description
        formattedText += `${description}\n\n`;
        
        // Add API Methods section with better formatting
        if (methods.length > 0) {
          formattedText += '## Available API Methods\n\n';
          formattedText += methods.map(m => `- \`${m}\``).join('\n');
          formattedText += '\n';
        }
        
        // Add Resources section with detailed information when available
        if (resources.length > 0) {
          formattedText += '\n## Resources\n\n';
          
          // Check if we have detailed resource type information
          if (resourceTypes && resourceTypes.length > 0) {
            // Add each resource type with its properties
            resourceTypes.forEach(resourceType => {
              formattedText += `### ${resourceType.name}\n\n`;
              
              if (resourceType.properties && resourceType.properties.length > 0) {
                formattedText += '| Property | Type | Description |\n';
                formattedText += '| --- | --- | --- |\n';
                
                resourceType.properties.forEach(prop => {
                  // Format the description to replace markdown code blocks properly
                  const description = prop.description.replace(/`([^`]+)`/g, '`$1`');
                  formattedText += `| \`${prop.name}\` | ${prop.type} | ${description} |\n`;
                });
                
                formattedText += '\n';
              } else {
                formattedText += 'No detailed properties available for this resource type.\n\n';
              }
            });
          } else {
            // Simple list if no detailed information
            formattedText += resources.map(r => `- **${r}**`).join('\n');
            formattedText += '\n';
          }
        }
        
        // Add note about admin consent if relevant
        if (html.includes('Requires Admin') || html.toLowerCase().includes('admin consent')) {
          formattedText += '\n\n> **Note:** This permission requires administrator consent.';
        }
        
        const result = {
          content: [
            {
              type: 'text',
              text: formattedText
            },
            {
              type: 'link',
              url: permissionUrl,
              name: 'Microsoft Graph Permission Details'
            }
          ]
        };
        
        // Save to cache (using the already declared cacheKey)
        this.permissionsCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return result;
      } else {
        // Fetch list of all permissions
        const allPermissionsUrl = 'https://graphpermissions.merill.net/permission/';
        
        // Check if we have a cached response for all permissions
        const allPermCacheKey = 'all_permissions';
        const cachedAllPermData = this.permissionsCache.get(allPermCacheKey);
        
        if (cachedAllPermData && (Date.now() - cachedAllPermData.timestamp) < this.cacheTTL) {
          console.log('Using cached data for all permissions');
          return cachedAllPermData.data;
        }
        
        const response = await axios.get(allPermissionsUrl, {
          headers: {
            'User-Agent': 'EntraPulse-Lite/1.0'
          }
        });
        
        const html = response.data;
        
        // Extract the permissions table
        const permissionsPattern = /<table[^>]*>[\s\S]*?<thead[^>]*>[\s\S]*?<tr[^>]*>[\s\S]*?<th[^>]*>Permission<\/th>[\s\S]*?<th[^>]*>Description<\/th>[\s\S]*?<\/tr>[\s\S]*?<\/thead>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>[\s\S]*?<\/table>/i;
        const permissionsMatch = permissionsPattern.exec(html);
        
        let permissionsList = '';
        
        if (permissionsMatch && permissionsMatch[1]) {
          const permissionsBody = permissionsMatch[1];
          const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
          
          let rowMatch;
          let permissions: Array<{name: string, description: string}> = [];
          
          while ((rowMatch = rowPattern.exec(permissionsBody)) !== null) {
            const permissionRow = rowMatch[1];
            const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            const cells: string[] = [];
            
            let cellMatch;
            while ((cellMatch = cellPattern.exec(permissionRow)) !== null) {
              cells.push(this.extractTextContent(cellMatch[1]).trim());
            }
            
            if (cells.length >= 2) {
              permissions.push({
                name: cells[0],
                description: cells[1]
              });
            }
          }
          
          permissionsList = permissions.map(p => `- **${p.name}**: ${p.description}`).join('\n');
        }
        
        const allPermissionsResult = {
          content: [
            {
              type: 'text',
              text: `# Microsoft Graph Permissions\n\n${permissionsList || 'No permissions found.'}`
            },
            {
              type: 'link',
              url: allPermissionsUrl,
              name: 'Microsoft Graph Permissions Explorer'
            }
          ]
        };
        
        // Save all permissions to cache
        this.permissionsCache.set('all_permissions', {
          data: allPermissionsResult,
          timestamp: Date.now()
        });
        
        return allPermissionsResult;
      }
    } catch (error) {
      console.error('Error fetching Merill permissions info:', error);
      
      // Enhanced error handling with more specific error messages
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code outside of 2xx
          throw new Error(`Failed to fetch permission information: Server responded with status ${error.response.status}. ${params.permission ? `The permission "${params.permission}" might not exist.` : ''}`);
        } else if (error.request) {
          // The request was made but no response was received
          throw new Error('Failed to fetch permission information: No response received from server. Please check your network connection.');
        } else {
          // Something happened in setting up the request
          throw new Error(`Failed to set up request: ${error.message}`);
        }
      } else {
        // Generic error handling
        throw new Error(`Failed to fetch Merill permissions info: ${(error as Error).message}`);
      }
    }
  }
  
  private extractTextContent(html: string): string {
    // A very simplified HTML to text extraction - in production code, use a proper HTML parser
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')    // Remove styles
      .replace(/<!--[\s\S]*?-->/g, '')                   // Remove comments
      .replace(/<[^>]+>/g, ' ')                          // Remove remaining tags
      .replace(/\s+/g, ' ')                              // Collapse whitespace
      .trim();
  }
}
