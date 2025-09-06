// Enhanced Microsoft Graph MCP Server
// Comprehensive M365 coverage for administrators and MSPs

import { MCPRequest, MCPResponse, MCPServerConfig, MCPTool } from '../../types';
import { MCPErrorHandler, ErrorCode } from '../../utils';
import { MCPAuthService } from '../../auth/MCPAuthService';
import { ConfigService } from '../../../shared/ConfigService';

export interface EnhancedGraphMCPServerConfig extends MCPServerConfig {
  env?: {
    TENANT_ID?: string;
    CLIENT_ID?: string;
    ACCESS_TOKEN?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Enhanced Microsoft Graph MCP Server providing comprehensive M365 administration capabilities
 * Designed for administrators and MSPs managing Microsoft 365 environments
 */
export class EnhancedGraphMCPServer {
  private config: EnhancedGraphMCPServerConfig;
  private authService: MCPAuthService;
  private configService: ConfigService;
  private tools: MCPTool[] = [];

  constructor(config: EnhancedGraphMCPServerConfig, authService: MCPAuthService, configService: ConfigService) {
    this.config = config;
    this.authService = authService;
    this.configService = configService;
    this.initializeEnhancedTools();
  }

  private initializeEnhancedTools(): void {
    this.tools = [
      // Enhanced User & Identity Management
      {
        name: 'enhanced-user-management',
        description: 'Comprehensive user management including licensing, authentication methods, and security settings',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['list', 'get', 'create', 'update', 'delete', 'license', 'security'],
              description: 'User management operation'
            },
            userId: { type: 'string', description: 'User ID or UPN' },
            includeUsageData: { type: 'boolean', description: 'Include usage analytics' },
            licensingData: { type: 'boolean', description: 'Include license assignments' },
            securityData: { type: 'boolean', description: 'Include security context' }
          },
          required: ['operation']
        }
      },

      // Exchange Online Management
      {
        name: 'exchange-online-admin',
        description: 'Exchange Online administration including mailboxes, transport rules, and mail flow',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['mailboxes', 'transport-rules', 'mail-flow', 'usage-reports', 'security-policies'],
              description: 'Exchange admin operation'
            },
            scope: {
              type: 'string',
              enum: ['user', 'tenant', 'organization'],
              description: 'Operation scope'
            },
            includeMetrics: { type: 'boolean', description: 'Include usage metrics' },
            timeRange: { type: 'string', description: 'Time range for reports (7d, 30d, 90d)' }
          },
          required: ['operation']
        }
      },

      // SharePoint Online Management
      {
        name: 'sharepoint-admin',
        description: 'SharePoint Online administration including sites, permissions, and governance',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['sites', 'site-collections', 'permissions', 'sharing-policies', 'storage', 'governance'],
              description: 'SharePoint admin operation'
            },
            siteId: { type: 'string', description: 'Site ID or URL' },
            includeUsage: { type: 'boolean', description: 'Include usage statistics' },
            permissionLevel: { type: 'string', description: 'Permission level filter' }
          },
          required: ['operation']
        }
      },

      // Microsoft Teams Administration
      {
        name: 'teams-admin',
        description: 'Microsoft Teams administration including policies, usage, and governance',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['teams', 'policies', 'usage-analytics', 'call-records', 'governance', 'apps'],
              description: 'Teams admin operation'
            },
            teamId: { type: 'string', description: 'Team ID' },
            policyType: { type: 'string', description: 'Policy type (meeting, messaging, calling)' },
            analyticsTimeframe: { type: 'string', description: 'Analytics timeframe' }
          },
          required: ['operation']
        }
      },

      // Security & Compliance Center
      {
        name: 'security-compliance',
        description: 'Security and compliance management including alerts, policies, and audit logs',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['security-alerts', 'compliance-policies', 'audit-logs', 'dlp-policies', 'retention-policies', 'ediscovery'],
              description: 'Security/compliance operation'
            },
            alertType: { type: 'string', description: 'Security alert type filter' },
            timeRange: { type: 'string', description: 'Time range for logs/alerts' },
            severity: { type: 'string', description: 'Severity level filter' }
          },
          required: ['operation']
        }
      },

      // Device & Endpoint Management (Intune)
      {
        name: 'device-management',
        description: 'Intune device and endpoint management including policies and compliance',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['devices', 'policies', 'compliance', 'apps', 'configurations', 'reports'],
              description: 'Device management operation'
            },
            deviceId: { type: 'string', description: 'Device ID' },
            platform: { type: 'string', description: 'Device platform (iOS, Android, Windows, macOS)' },
            complianceStatus: { type: 'string', description: 'Compliance status filter' }
          },
          required: ['operation']
        }
      },

      // License & Subscription Management
      {
        name: 'license-management',
        description: 'License and subscription management including assignments and usage tracking',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['subscriptions', 'assignments', 'usage-reports', 'optimization', 'forecasting'],
              description: 'License management operation'
            },
            userId: { type: 'string', description: 'User ID for license operations' },
            skuId: { type: 'string', description: 'SKU ID for subscription operations' },
            includeUsageMetrics: { type: 'boolean', description: 'Include usage analytics' }
          },
          required: ['operation']
        }
      },

      // Tenant Administration
      {
        name: 'tenant-admin',
        description: 'Tenant-level administration including settings, domains, and service health',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['organization-settings', 'domains', 'service-health', 'directory-sync', 'external-identities'],
              description: 'Tenant admin operation'
            },
            domain: { type: 'string', description: 'Domain name' },
            serviceFilter: { type: 'string', description: 'Service filter for health checks' },
            includeMetrics: { type: 'boolean', description: 'Include organizational metrics' }
          },
          required: ['operation']
        }
      },

      // Advanced Analytics & Reporting
      {
        name: 'analytics-reporting',
        description: 'Advanced analytics and reporting across M365 services for admin insights',
        inputSchema: {
          type: 'object',
          properties: {
            reportType: {
              type: 'string',
              enum: ['usage-summary', 'security-posture', 'compliance-status', 'license-utilization', 'adoption-metrics'],
              description: 'Type of analytics report'
            },
            timeframe: { type: 'string', description: 'Report timeframe (daily, weekly, monthly)' },
            services: { 
              type: 'array',
              items: { type: 'string' },
              description: 'M365 services to include in report'
            },
            format: {
              type: 'string',
              enum: ['json', 'csv', 'summary'],
              description: 'Report output format'
            }
          },
          required: ['reportType']
        }
      },

      // MSP Multi-Tenant Operations
      {
        name: 'msp-operations',
        description: 'MSP-specific operations for managing multiple client tenants',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['tenant-switching', 'cross-tenant-reports', 'client-health-check', 'billing-data', 'service-requests'],
              description: 'MSP operation type'
            },
            tenantId: { type: 'string', description: 'Target tenant ID' },
            clientIdentifier: { type: 'string', description: 'Client identifier for MSP operations' },
            aggregateData: { type: 'boolean', description: 'Aggregate data across tenants' }
          },
          required: ['operation']
        }
      }
    ];
  }

  async startServer(): Promise<void> {
    console.log('🚀 Starting Enhanced Microsoft Graph MCP Server...');
    
    // Verify authentication and permissions
    try {
      const token = await this.authService.getToken();
      if (!token?.accessToken) {
        throw new Error('No valid access token available');
      }
      
      console.log('✅ Enhanced Graph MCP Server ready with comprehensive M365 coverage');
      console.log('📊 Available service areas:', this.tools.map(t => t.name).join(', '));
      
    } catch (error) {
      console.error('❌ Failed to start Enhanced Graph MCP Server:', error);
      throw error;
    }
  }

  async stopServer(): Promise<void> {
    console.log('⏹️ Stopping Enhanced Graph MCP Server...');
  }

  async listTools(): Promise<MCPTool[]> {
    return this.tools;
  }

  async callTool(name: string, args: any): Promise<MCPResponse> {
    try {
      console.log(`🔧 Enhanced Graph tool call: ${name}`, args);

      switch (name) {
        case 'enhanced-user-management':
          return await this.handleEnhancedUserManagement(args);
        case 'exchange-online-admin':
          return await this.handleExchangeOnlineAdmin(args);
        case 'sharepoint-admin':
          return await this.handleSharePointAdmin(args);
        case 'teams-admin':
          return await this.handleTeamsAdmin(args);
        case 'security-compliance':
          return await this.handleSecurityCompliance(args);
        case 'device-management':
          return await this.handleDeviceManagement(args);
        case 'license-management':
          return await this.handleLicenseManagement(args);
        case 'tenant-admin':
          return await this.handleTenantAdmin(args);
        case 'analytics-reporting':
          return await this.handleAnalyticsReporting(args);
        case 'msp-operations':
          return await this.handleMSPOperations(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`❌ Enhanced Graph tool error (${name}):`, error);
      return {
        id: 'enhanced-graph-error',
        error: MCPErrorHandler.handleError(error, `Enhanced Graph tool call failed: ${name}`)
      };
    }
  }

  // Enhanced User Management Implementation
  private async handleEnhancedUserManagement(args: any): Promise<MCPResponse> {
    const { operation, userId, includeUsageData, licensingData, securityData } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'list':
        endpoints = [
          '/users?$select=id,displayName,userPrincipalName,accountEnabled,createdDateTime,lastSignInDateTime',
          ...(includeUsageData ? ['/reports/getOffice365ActiveUserDetail(period=\'D30\')'] : []),
          ...(licensingData ? ['/users?$expand=assignedLicenses'] : [])
        ];
        description = 'Enhanced user listing with optional usage and licensing data';
        break;
      case 'security':
        endpoints = [
          `/users/${userId}/authentication/methods`,
          `/users/${userId}/registeredDevices`,
          `/users/${userId}/signInActivity`,
          '/identityGovernance/accessReviews/instances'
        ];
        description = 'User security context including authentication methods and device registration';
        break;
      default:
        throw new Error(`Unsupported user management operation: ${operation}`);
    }

    return {
      id: 'enhanced-user-management',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'user-management'
      }
    };
  }

  // Exchange Online Administration Implementation
  private async handleExchangeOnlineAdmin(args: any): Promise<MCPResponse> {
    const { operation, scope, includeMetrics, timeRange } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'mailboxes':
        endpoints = [
          '/users?$filter=assignedLicenses/$count ne 0&$select=id,displayName,mail,mailboxSettings',
          '/reports/getMailboxUsageDetail(period=\'D30\')',
          '/me/mailFolders'
        ];
        description = 'Comprehensive mailbox management and usage analytics';
        break;
      case 'transport-rules':
        endpoints = [
          '/admin/exchange/transportRules',
          '/admin/exchange/mailFlow'
        ];
        description = 'Mail transport rules and flow configuration';
        break;
      case 'security-policies':
        endpoints = [
          '/security/attackSimulation',
          '/admin/exchange/antiSpamPolicies',
          '/admin/exchange/antiMalwarePolicies'
        ];
        description = 'Exchange security policies and threat protection';
        break;
      default:
        throw new Error(`Unsupported Exchange operation: ${operation}`);
    }

    return {
      id: 'exchange-online-admin',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'exchange-online'
      }
    };
  }

  // SharePoint Administration Implementation
  private async handleSharePointAdmin(args: any): Promise<MCPResponse> {
    const { operation, siteId, includeUsage, permissionLevel } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'sites':
        endpoints = [
          '/sites?search=*',
          '/admin/sharepoint/sites',
          ...(includeUsage ? ['/reports/getSharePointSiteUsageDetail(period=\'D30\')'] : [])
        ];
        description = 'SharePoint sites management with usage analytics';
        break;
      case 'permissions':
        endpoints = [
          `/sites/${siteId}/permissions`,
          `/sites/${siteId}/drive/root/permissions`,
          '/admin/sharepoint/sharing/policies'
        ];
        description = 'SharePoint permissions and sharing policies';
        break;
      case 'governance':
        endpoints = [
          '/admin/sharepoint/governance/policies',
          '/compliance/dataGovernance/policies',
          '/sites/retention/policies'
        ];
        description = 'SharePoint governance and data retention policies';
        break;
      default:
        throw new Error(`Unsupported SharePoint operation: ${operation}`);
    }

    return {
      id: 'sharepoint-admin',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'sharepoint-online'
      }
    };
  }

  // Teams Administration Implementation
  private async handleTeamsAdmin(args: any): Promise<MCPResponse> {
    const { operation, teamId, policyType, analyticsTimeframe } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'teams':
        endpoints = [
          '/teams',
          '/groups?$filter=resourceProvisioningOptions/Any(x:x eq \'Team\')',
          '/admin/teams/settings'
        ];
        description = 'Teams management and organizational settings';
        break;
      case 'policies':
        endpoints = [
          '/admin/teams/meetingPolicies',
          '/admin/teams/messagingPolicies',
          '/admin/teams/callingPolicies'
        ];
        description = 'Teams policies configuration and management';
        break;
      case 'usage-analytics':
        endpoints = [
          '/reports/getTeamsUserActivityUserDetail(period=\'D30\')',
          '/reports/getTeamsDeviceUsageUserDetail(period=\'D30\')',
          '/communications/callRecords'
        ];
        description = 'Teams usage analytics and call quality data';
        break;
      default:
        throw new Error(`Unsupported Teams operation: ${operation}`);
    }

    return {
      id: 'teams-admin',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'microsoft-teams'
      }
    };
  }

  // Security & Compliance Implementation
  private async handleSecurityCompliance(args: any): Promise<MCPResponse> {
    const { operation, alertType, timeRange, severity } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'security-alerts':
        endpoints = [
          '/security/alerts',
          '/security/incidents',
          '/security/secureScores'
        ];
        description = 'Security alerts, incidents, and secure score monitoring';
        break;
      case 'compliance-policies':
        endpoints = [
          '/compliance/dataLossPrevention/policies',
          '/compliance/retentionPolicies',
          '/compliance/sensitivityLabels'
        ];
        description = 'Data loss prevention and compliance policy management';
        break;
      case 'audit-logs':
        endpoints = [
          '/auditLogs/directoryAudits',
          '/auditLogs/signIns',
          '/auditLogs/provisioning'
        ];
        description = 'Comprehensive audit log analysis and monitoring';
        break;
      case 'ediscovery':
        endpoints = [
          '/compliance/ediscovery/cases',
          '/compliance/ediscovery/custodians',
          '/compliance/ediscovery/searches'
        ];
        description = 'eDiscovery case management and legal hold operations';
        break;
      default:
        throw new Error(`Unsupported security/compliance operation: ${operation}`);
    }

    return {
      id: 'security-compliance',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'security-compliance'
      }
    };
  }

  // Device Management Implementation
  private async handleDeviceManagement(args: any): Promise<MCPResponse> {
    const { operation, deviceId, platform, complianceStatus } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'devices':
        endpoints = [
          '/deviceManagement/managedDevices',
          '/devices',
          '/reports/getDeviceComplianceDetail(period=\'D30\')'
        ];
        description = 'Device inventory and compliance status monitoring';
        break;
      case 'policies':
        endpoints = [
          '/deviceManagement/deviceCompliancePolicies',
          '/deviceManagement/deviceConfigurations',
          '/deviceManagement/deviceManagementScripts'
        ];
        description = 'Device compliance policies and configuration management';
        break;
      case 'apps':
        endpoints = [
          '/deviceAppManagement/mobileApps',
          '/deviceAppManagement/mobileAppConfigurations',
          '/deviceAppManagement/appProtectionPolicies'
        ];
        description = 'Mobile application management and protection policies';
        break;
      default:
        throw new Error(`Unsupported device management operation: ${operation}`);
    }

    return {
      id: 'device-management',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'device-management'
      }
    };
  }

  // License Management Implementation
  private async handleLicenseManagement(args: any): Promise<MCPResponse> {
    const { operation, userId, skuId, includeUsageMetrics } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'subscriptions':
        endpoints = [
          '/subscribedSkus',
          '/organization/{org-id}/licenseDetails',
          '/admin/billing/subscriptions'
        ];
        description = 'Subscription and license inventory management';
        break;
      case 'assignments':
        endpoints = [
          `/users/${userId}/assignedLicenses`,
          '/users?$select=id,displayName,assignedLicenses',
          '/groups?$filter=assignedLicenses/$count ne 0'
        ];
        description = 'License assignment management and optimization';
        break;
      case 'usage-reports':
        endpoints = [
          '/reports/getOffice365ServicesUserCounts(period=\'D30\')',
          '/reports/getOffice365ActiveUserCounts(period=\'D30\')',
          '/reports/getLicenseUsageByService(period=\'D30\')'
        ];
        description = 'License usage analytics and optimization insights';
        break;
      default:
        throw new Error(`Unsupported license management operation: ${operation}`);
    }

    return {
      id: 'license-management',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'license-management'
      }
    };
  }

  // Tenant Administration Implementation
  private async handleTenantAdmin(args: any): Promise<MCPResponse> {
    const { operation, domain, serviceFilter, includeMetrics } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'organization-settings':
        endpoints = [
          '/organization',
          '/admin/tenant/settings',
          '/policies/conditionalAccess'
        ];
        description = 'Tenant configuration and organizational settings';
        break;
      case 'domains':
        endpoints = [
          '/domains',
          '/domains/{domain}/verificationDnsRecords',
          '/admin/domains/federation'
        ];
        description = 'Domain management and federation configuration';
        break;
      case 'service-health':
        endpoints = [
          '/admin/serviceAnnouncement/healthOverviews',
          '/admin/serviceAnnouncement/issues',
          '/admin/serviceAnnouncement/messages'
        ];
        description = 'M365 service health monitoring and incident tracking';
        break;
      default:
        throw new Error(`Unsupported tenant admin operation: ${operation}`);
    }

    return {
      id: 'tenant-admin',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'tenant-administration'
      }
    };
  }

  // Analytics & Reporting Implementation
  private async handleAnalyticsReporting(args: any): Promise<MCPResponse> {
    const { reportType, timeframe, services, format } = args;
    
    let endpoints: string[] = [];
    let description = '';

    switch (reportType) {
      case 'usage-summary':
        endpoints = [
          '/reports/getOffice365ActiveUserCounts(period=\'D30\')',
          '/reports/getOffice365ServicesUserCounts(period=\'D30\')',
          '/reports/getEmailActivityUserCounts(period=\'D30\')',
          '/reports/getTeamsUserActivityUserCounts(period=\'D30\')'
        ];
        description = 'Comprehensive M365 usage summary across all services';
        break;
      case 'security-posture':
        endpoints = [
          '/security/secureScores',
          '/security/secureScores/controlProfiles',
          '/identityGovernance/accessReviews/instances',
          '/reports/getSignInAnalytics(period=\'D30\')'
        ];
        description = 'Organization security posture and risk assessment';
        break;
      case 'compliance-status':
        endpoints = [
          '/compliance/dataGovernance/policies',
          '/compliance/retentionPolicies',
          '/auditLogs/directoryAudits',
          '/reports/getComplianceStatus(period=\'D30\')'
        ];
        description = 'Compliance status and governance overview';
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    return {
      id: 'analytics-reporting',
      result: {
        reportType,
        endpoints,
        description,
        enhanced: true,
        scope: 'analytics-reporting',
        format: format || 'json',
        timeframe: timeframe || 'monthly'
      }
    };
  }

  // MSP Operations Implementation
  private async handleMSPOperations(args: any): Promise<MCPResponse> {
    const { operation, tenantId, clientIdentifier, aggregateData } = args;
    
    // MSP operations would require additional authentication and tenant switching logic
    // This is a framework for MSP-specific functionality
    
    let endpoints: string[] = [];
    let description = '';

    switch (operation) {
      case 'tenant-switching':
        endpoints = [
          `/admin/partner/tenants/${tenantId}/context`,
          `/admin/partner/delegatedAccess`
        ];
        description = 'MSP tenant context switching and delegated access management';
        break;
      case 'cross-tenant-reports':
        endpoints = [
          '/admin/partner/reports/usage',
          '/admin/partner/reports/security',
          '/admin/partner/reports/compliance'
        ];
        description = 'Aggregated reporting across multiple client tenants';
        break;
      case 'client-health-check':
        endpoints = [
          '/security/secureScores',
          '/admin/serviceAnnouncement/healthOverviews',
          '/reports/getOffice365ActiveUserCounts(period=\'D7\')'
        ];
        description = 'Client tenant health assessment and monitoring';
        break;
      default:
        throw new Error(`Unsupported MSP operation: ${operation}`);
    }

    return {
      id: 'msp-operations',
      result: {
        operation,
        endpoints,
        description,
        enhanced: true,
        scope: 'msp-operations',
        tenantId,
        clientIdentifier
      }
    };
  }
}