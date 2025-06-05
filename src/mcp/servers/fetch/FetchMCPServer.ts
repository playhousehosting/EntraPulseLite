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
  }  private async executeTool(request: MCPRequest): Promise<MCPResponse> {
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
        
        const response = await axios.get(permissionUrl, {
          headers: {
            'User-Agent': 'EntraPulse-Lite/1.0'
          }
        });
        
        const html = response.data;
        
        // Extract the permission details
        const titlePattern = /<h1[^>]*>(.*?)<\/h1>/i;
        const titleMatch = titlePattern.exec(html);
        const title = titleMatch ? titleMatch[1].trim() : params.permission;
        
        // Extract description
        const descriptionPattern = /<blockquote[^>]*>([\s\S]*?)<\/blockquote>/i;
        const descriptionMatch = descriptionPattern.exec(html);
        const description = descriptionMatch ? this.extractTextContent(descriptionMatch[1]).trim() : '';
        
        // Extract methods if requested
        let methods: string[] = [];
        if (params.includeDetails) {
          // Extract API methods from tables
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
                  if (method) methods.push(method);
                }
              });
            }
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `# ${title}\n\n${description}\n\n${methods.length > 0 ? '## Available API Methods\n\n' + methods.map(m => `- ${m}`).join('\n') : ''}`
            },
            {
              type: 'link',
              url: permissionUrl,
              name: 'Microsoft Graph Permission Details'
            }
          ]
        };
      } else {
        // Fetch list of all permissions
        const allPermissionsUrl = 'https://graphpermissions.merill.net/permission/';
        
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
        
        return {
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
      }
    } catch (error) {
      console.error('Error fetching Merill permissions info:', error);
      throw new Error(`Failed to fetch Merill permissions info: ${(error as Error).message}`);
    }
  }  private extractTextContent(html: string): string {
    // A very simplified HTML to text extraction - in production code, use a proper HTML parser
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')  // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')    // Remove styles
      .replace(/<!--[\s\S]*?-->/g, '')                   // Remove comments
      .replace(/<[^>]+>/g, ' ')                          // Remove remaining tags
      .replace(/\s+/g, ' ')                              // Collapse whitespace
      .trim();
    
    return text;
  }
}
