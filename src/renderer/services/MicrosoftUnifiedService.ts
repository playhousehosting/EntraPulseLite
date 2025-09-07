// MicrosoftUnifiedService.ts
// Comprehensive Microsoft API service supporting all major Microsoft cloud services

import { EventEmitter } from 'events';
import { AuthService } from '../../auth/AuthService';
import MicrosoftServiceScopes, { ServiceScopeConfig } from './MicrosoftServiceScopes';

// Microsoft Service Endpoints and Configuration
export interface MicrosoftServiceEndpoint {
  id: string;
  name: string;
  displayName: string;
  baseUrl: string;
  category: 'graph' | 'azure' | 'security' | 'compliance' | 'productivity' | 'development';
  description: string;
  requiredScopes: string[];
  defaultVersion?: string;
  documentation: string;
  status: 'available' | 'authenticated' | 'error' | 'checking';
  lastChecked?: Date;
  lastError?: string;
}

export interface MicrosoftServiceCall {
  id: string;
  serviceId: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  statusCode?: number;
  error?: string;
  responseSize?: number;
}

export interface ServiceQueryContext {
  query: string;
  serviceHints: string[];
  confidence: number;
  reasoning: string;
  suggestedServices: string[];
  needsMultiService: boolean;
}

export class MicrosoftUnifiedService extends EventEmitter {
  private authService: AuthService;
  private services: Map<string, MicrosoftServiceEndpoint> = new Map();
  private serviceHistory: Map<string, MicrosoftServiceCall[]> = new Map();
  private lastServiceCheck: Date | null = null;

  constructor(authService: AuthService) {
    super();
    this.authService = authService;
    this.initializeServices();
  }

  /**
   * Initialize all Microsoft service endpoints
   */
  private initializeServices(): void {
    const services: MicrosoftServiceEndpoint[] = [
      // Microsoft Graph - Core M365 Services
      {
        id: 'graph',
        name: 'Microsoft Graph',
        displayName: 'Microsoft Graph API',
        baseUrl: 'https://graph.microsoft.com',
        category: 'graph',
        description: 'Unified API for Microsoft 365 services including users, groups, mail, calendar, files, and more',
        requiredScopes: [
          'User.Read',
          'User.ReadWrite.All',
          'Group.Read.All',
          'Group.ReadWrite.All',
          'Mail.Read',
          'Mail.ReadWrite',
          'Calendars.Read',
          'Calendars.ReadWrite',
          'Files.Read',
          'Files.ReadWrite.All',
          'Sites.Read.All',
          'Sites.ReadWrite.All'
        ],
        defaultVersion: 'v1.0',
        documentation: 'https://docs.microsoft.com/en-us/graph/',
        status: 'checking'
      },

      // Azure Resource Manager
      {
        id: 'azure-arm',
        name: 'Azure Resource Manager',
        displayName: 'Azure ARM API',
        baseUrl: 'https://management.azure.com',
        category: 'azure',
        description: 'Azure resource management, subscriptions, resource groups, and deployments',
        requiredScopes: ['https://management.azure.com/user_impersonation'],
        defaultVersion: '2021-04-01',
        documentation: 'https://docs.microsoft.com/en-us/rest/api/resources/',
        status: 'checking'
      },

      // Microsoft Intune
      {
        id: 'intune',
        name: 'Microsoft Intune',
        displayName: 'Intune Device Management',
        baseUrl: 'https://graph.microsoft.com',
        category: 'security',
        description: 'Device management, mobile application management, and endpoint protection',
        requiredScopes: [
          'DeviceManagementConfiguration.Read.All',
          'DeviceManagementConfiguration.ReadWrite.All',
          'DeviceManagementApps.Read.All',
          'DeviceManagementApps.ReadWrite.All',
          'DeviceManagementManagedDevices.Read.All',
          'DeviceManagementManagedDevices.ReadWrite.All'
        ],
        defaultVersion: 'v1.0',
        documentation: 'https://docs.microsoft.com/en-us/graph/api/resources/intune-graph-overview',
        status: 'checking'
      },

      // SharePoint Online
      {
        id: 'sharepoint',
        name: 'SharePoint Online',
        displayName: 'SharePoint REST API',
        baseUrl: 'https://graph.microsoft.com',
        category: 'productivity',
        description: 'SharePoint sites, lists, libraries, and content management',
        requiredScopes: [
          'Sites.Read.All',
          'Sites.ReadWrite.All',
          'Sites.Manage.All',
          'Sites.FullControl.All'
        ],
        defaultVersion: 'v1.0',
        documentation: 'https://docs.microsoft.com/en-us/graph/api/resources/sharepoint',
        status: 'checking'
      },

      // Microsoft Planner
      {
        id: 'planner',
        name: 'Microsoft Planner',
        displayName: 'Planner Task Management',
        baseUrl: 'https://graph.microsoft.com',
        category: 'productivity',
        description: 'Project planning, task management, and team collaboration',
        requiredScopes: [
          'Tasks.Read',
          'Tasks.ReadWrite',
          'Group.Read.All',
          'Group.ReadWrite.All'
        ],
        defaultVersion: 'v1.0',
        documentation: 'https://docs.microsoft.com/en-us/graph/api/resources/planner-overview',
        status: 'checking'
      },

      // Microsoft Defender for Cloud
      {
        id: 'defender-cloud',
        name: 'Microsoft Defender for Cloud',
        displayName: 'Defender for Cloud',
        baseUrl: 'https://management.azure.com',
        category: 'security',
        description: 'Cloud security posture management and threat protection',
        requiredScopes: ['https://management.azure.com/user_impersonation'],
        defaultVersion: '2020-01-01',
        documentation: 'https://docs.microsoft.com/en-us/rest/api/securitycenter/',
        status: 'checking'
      },

      // Microsoft Sentinel (Azure Sentinel)
      {
        id: 'sentinel',
        name: 'Microsoft Sentinel',
        displayName: 'Sentinel SIEM',
        baseUrl: 'https://management.azure.com',
        category: 'security',
        description: 'Security information and event management, KQL queries, and threat hunting',
        requiredScopes: ['https://management.azure.com/user_impersonation'],
        defaultVersion: '2021-10-01',
        documentation: 'https://docs.microsoft.com/en-us/rest/api/securityinsights/',
        status: 'checking'
      },

      // Azure Log Analytics (KQL)
      {
        id: 'log-analytics',
        name: 'Azure Log Analytics',
        displayName: 'Log Analytics & KQL',
        baseUrl: 'https://api.loganalytics.io',
        category: 'azure',
        description: 'Log queries using KQL, workspace data, and monitoring insights',
        requiredScopes: ['https://api.loganalytics.io/Data.Read'],
        defaultVersion: 'v1',
        documentation: 'https://docs.microsoft.com/en-us/rest/api/loganalytics/',
        status: 'checking'
      },

      // Microsoft Teams
      {
        id: 'teams',
        name: 'Microsoft Teams',
        displayName: 'Teams Collaboration',
        baseUrl: 'https://graph.microsoft.com',
        category: 'productivity',
        description: 'Teams, channels, meetings, calls, and collaboration features',
        requiredScopes: [
          'Team.ReadBasic.All',
          'Team.Read.All',
          'Team.ReadWrite.All',
          'Channel.ReadBasic.All',
          'Channel.Read.All',
          'CallRecords.Read.All'
        ],
        defaultVersion: 'v1.0',
        documentation: 'https://docs.microsoft.com/en-us/graph/api/resources/teams-api-overview',
        status: 'checking'
      },

      // Microsoft Purview (Compliance)
      {
        id: 'purview',
        name: 'Microsoft Purview',
        displayName: 'Purview Compliance',
        baseUrl: 'https://graph.microsoft.com',
        category: 'compliance',
        description: 'Data governance, compliance, risk management, and data catalog',
        requiredScopes: [
          'InformationProtectionPolicy.Read',
          'SecurityEvents.Read.All',
          'ThreatIndicators.ReadWrite.OwnedBy'
        ],
        defaultVersion: 'v1.0',
        documentation: 'https://docs.microsoft.com/en-us/graph/api/resources/security-api-overview',
        status: 'checking'
      },

      // Exchange Online
      {
        id: 'exchange-online',
        name: 'Exchange Online',
        displayName: 'Exchange Online Management',
        baseUrl: 'https://outlook.office365.com',
        category: 'productivity',
        description: 'Advanced Exchange Online management beyond Graph API capabilities',
        requiredScopes: ['https://outlook.office365.com/PowerShell-LiveId'],
        documentation: 'https://docs.microsoft.com/en-us/powershell/exchange/exchange-online-powershell',
        status: 'checking'
      },

      // Power Platform
      {
        id: 'power-platform',
        name: 'Power Platform',
        displayName: 'Power Platform APIs',
        baseUrl: 'https://api.powerapps.com',
        category: 'development',
        description: 'Power Apps, Power Automate, Power BI, and Power Pages management',
        requiredScopes: ['https://service.powerapps.com/user'],
        defaultVersion: '2020-06-01',
        documentation: 'https://docs.microsoft.com/en-us/rest/api/power-platform/',
        status: 'checking'
      },

      // Azure DevOps
      {
        id: 'azure-devops',
        name: 'Azure DevOps',
        displayName: 'Azure DevOps Services',
        baseUrl: 'https://dev.azure.com',
        category: 'development',
        description: 'Source control, build pipelines, work items, and DevOps workflows',
        requiredScopes: ['vso.work_full', 'vso.code_full', 'vso.build_execute'],
        defaultVersion: '7.0',
        documentation: 'https://docs.microsoft.com/en-us/rest/api/azure/devops/',
        status: 'checking'
      }
    ];

    // Initialize services map
    services.forEach(service => {
      this.services.set(service.id, service);
      this.serviceHistory.set(service.id, []);
    });

    this.emit('servicesInitialized', services.length);
  }

  /**
   * Get all available Microsoft services
   */
  getServices(): MicrosoftServiceEndpoint[] {
    return Array.from(this.services.values());
  }

  /**
   * Get service by ID
   */
  getService(serviceId: string): MicrosoftServiceEndpoint | null {
    return this.services.get(serviceId) || null;
  }

  /**
   * Get services by category
   */
  getServicesByCategory(category: string): MicrosoftServiceEndpoint[] {
    return Array.from(this.services.values()).filter(service => service.category === category);
  }

  /**
   * Check authentication status for all services
   */
  async checkAllServicesStatus(): Promise<Map<string, { status: string; error?: string }>> {
    const results = new Map<string, { status: string; error?: string }>();
    
    for (const [serviceId, service] of this.services) {
      try {
        const status = await this.checkServiceStatus(serviceId);
        results.set(serviceId, { status: status.status });
        
        // Update service status
        service.status = status.status as any;
        service.lastChecked = new Date();
        service.lastError = status.error;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.set(serviceId, { status: 'error', error: errorMessage });
        
        // Update service status
        service.status = 'error';
        service.lastChecked = new Date();
        service.lastError = errorMessage;
      }
    }

    this.lastServiceCheck = new Date();
    this.emit('servicesStatusUpdated', results);
    
    return results;
  }

  /**
   * Check authentication status for a specific service
   */
  async checkServiceStatus(serviceId: string): Promise<{ status: string; error?: string }> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    try {
      // Get auth token
      const token = await this.authService.getToken();
      if (!token) {
        return { status: 'error', error: 'No authentication token available' };
      }

      // For Graph-based services, test with a simple call
      if (service.baseUrl.includes('graph.microsoft.com')) {
        // Test with /me endpoint
        const response = await fetch(`${service.baseUrl}/v1.0/me`, {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          return { status: 'authenticated' };
        } else if (response.status === 401) {
          return { status: 'error', error: 'Authentication failed' };
        } else if (response.status === 403) {
          return { status: 'error', error: 'Insufficient permissions' };
        } else {
          return { status: 'error', error: `HTTP ${response.status}` };
        }
      }

      // For Azure ARM services
      if (service.baseUrl.includes('management.azure.com')) {
        const response = await fetch(`${service.baseUrl}/subscriptions?api-version=2020-01-01`, {
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          return { status: 'authenticated' };
        } else {
          return { status: 'error', error: `HTTP ${response.status}` };
        }
      }

      // For other services, assume available if we have a token
      return { status: 'available' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { status: 'error', error: errorMessage };
    }
  }

  /**
   * Analyze a query to determine which Microsoft services might be relevant
   */
  analyzeQuery(query: string): ServiceQueryContext {
    const lowerQuery = query.toLowerCase();
    const serviceHints: string[] = [];
    const suggestedServices: string[] = [];
    let confidence = 0;
    let reasoning = '';

    // Keyword mapping for different services
    const serviceKeywords = {
      'graph': ['user', 'group', 'mail', 'calendar', 'onedrive', 'sharepoint site', 'team', 'person', 'contact'],
      'intune': ['device', 'mobile', 'endpoint', 'compliance policy', 'app protection', 'mdm', 'mam', 'enrollment'],
      'sharepoint': ['sharepoint', 'site collection', 'list', 'library', 'document', 'content type', 'permission'],
      'planner': ['task', 'plan', 'bucket', 'assignment', 'project', 'progress', 'planner'],
      'teams': ['team', 'channel', 'meeting', 'call', 'chat', 'collaboration', 'teams app'],
      'defender-cloud': ['security alert', 'threat', 'vulnerability', 'compliance score', 'security center', 'defender'],
      'sentinel': ['kql', 'kusto', 'log', 'siem', 'incident', 'hunting', 'analytics rule', 'sentinel'],
      'log-analytics': ['kql', 'kusto', 'workspace', 'query', 'log analytics', 'monitoring'],
      'azure-arm': ['subscription', 'resource group', 'azure resource', 'deployment', 'arm template'],
      'purview': ['data governance', 'classification', 'sensitivity label', 'compliance', 'catalog'],
      'power-platform': ['power app', 'power automate', 'power bi', 'flow', 'canvas app', 'model driven'],
      'azure-devops': ['repository', 'build', 'pipeline', 'work item', 'sprint', 'devops', 'git']
    };

    // Check for service-specific keywords
    for (const [serviceId, keywords] of Object.entries(serviceKeywords)) {
      const matchedKeywords = keywords.filter(keyword => lowerQuery.includes(keyword));
      if (matchedKeywords.length > 0) {
        serviceHints.push(...matchedKeywords);
        suggestedServices.push(serviceId);
        confidence += matchedKeywords.length * 0.2;
      }
    }

    // Special handling for KQL queries
    if (lowerQuery.includes('kql') || lowerQuery.match(/\b(let|where|summarize|project|extend|join|union)\b/)) {
      suggestedServices.push('log-analytics', 'sentinel');
      serviceHints.push('kql query detected');
      confidence += 0.4;
    }

    // If no specific service detected, default to Graph
    if (suggestedServices.length === 0) {
      suggestedServices.push('graph');
      confidence = 0.3;
      reasoning = 'No specific service keywords detected, defaulting to Microsoft Graph';
    } else {
      reasoning = `Detected keywords: ${serviceHints.join(', ')}. Suggested services: ${suggestedServices.join(', ')}`;
    }

    // Determine if multiple services might be needed
    const needsMultiService = suggestedServices.length > 1;

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);

    return {
      query,
      serviceHints,
      confidence,
      reasoning,
      suggestedServices,
      needsMultiService
    };
  }

  /**
   * Execute a query against a specific Microsoft service
   */
  async queryService(
    serviceId: string, 
    endpoint: string, 
    method: string = 'GET', 
    data?: any, 
    options: { version?: string; headers?: Record<string, string> } = {}
  ): Promise<any> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    const startTime = Date.now();
    const callId = `${serviceId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get auth token
      const token = await this.authService.getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Build URL
      const version = options.version || service.defaultVersion || 'v1.0';
      let url: string;
      
      if (service.baseUrl.includes('graph.microsoft.com')) {
        url = `${service.baseUrl}/${version}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
      } else {
        url = `${service.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        if (version && !endpoint.includes('api-version=')) {
          url += (endpoint.includes('?') ? '&' : '?') + `api-version=${version}`;
        }
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      };

      // Make the request
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      const duration = Date.now() - startTime;

      // Parse response
      let result: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      // Record successful call
      const call: MicrosoftServiceCall = {
        id: callId,
        serviceId,
        endpoint,
        method: method.toUpperCase(),
        timestamp: new Date(),
        duration,
        success: response.ok,
        statusCode: response.status,
        responseSize: JSON.stringify(result).length
      };

      this.serviceHistory.get(serviceId)?.push(call);
      this.emit('serviceCall', call);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${result.error?.message || result.message || 'Unknown error'}`);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Record failed call
      const call: MicrosoftServiceCall = {
        id: callId,
        serviceId,
        endpoint,
        method: method.toUpperCase(),
        timestamp: new Date(),
        duration,
        success: false,
        error: errorMessage
      };

      this.serviceHistory.get(serviceId)?.push(call);
      this.emit('serviceCall', call);

      throw error;
    }
  }

  /**
   * Get service call history
   */
  getServiceHistory(serviceId?: string): MicrosoftServiceCall[] {
    if (serviceId) {
      return this.serviceHistory.get(serviceId) || [];
    }

    // Return all history
    const allHistory: MicrosoftServiceCall[] = [];
    this.serviceHistory.forEach(history => allHistory.push(...history));
    return allHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get service statistics
   */
  getServiceStats(serviceId?: string): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageResponseTime: number;
    lastCall?: Date;
  } {
    const history = this.getServiceHistory(serviceId);
    
    const stats = {
      totalCalls: history.length,
      successfulCalls: history.filter(call => call.success).length,
      failedCalls: history.filter(call => !call.success).length,
      averageResponseTime: 0,
      lastCall: history.length > 0 ? history[0].timestamp : undefined
    };

    if (history.length > 0) {
      stats.averageResponseTime = history.reduce((sum, call) => sum + call.duration, 0) / history.length;
    }

    return stats;
  }

  /**
   * Clear service history
   */
  clearHistory(serviceId?: string): void {
    if (serviceId) {
      this.serviceHistory.set(serviceId, []);
    } else {
      this.serviceHistory.clear();
      this.getServices().forEach(service => {
        this.serviceHistory.set(service.id, []);
      });
    }
    this.emit('historyCleared', serviceId);
  }

  /**
   * Configure authentication scopes for comprehensive Microsoft services
   */
  async configureComprehensiveScopes(scopeLevel: 'recommended' | 'premium' | 'comprehensive' = 'recommended'): Promise<void> {
    let scopes: string[];

    switch (scopeLevel) {
      case 'recommended':
        scopes = MicrosoftServiceScopes.getRecommendedScopes();
        break;
      case 'premium':
        scopes = MicrosoftServiceScopes.getPremiumScopes();
        break;
      case 'comprehensive':
        scopes = MicrosoftServiceScopes.getComprehensiveScopes();
        break;
      default:
        scopes = MicrosoftServiceScopes.getRecommendedScopes();
    }

    try {
      // Add all scopes to the auth service
      for (const scope of scopes) {
        await this.authService.addScope(scope);
      }

      console.log(`Configured ${scopes.length} Microsoft service scopes at ${scopeLevel} level`);
      this.emit('scopesConfigured', { level: scopeLevel, scopeCount: scopes.length });
    } catch (error) {
      console.error('Failed to configure Microsoft service scopes:', error);
      throw error;
    }
  }

  /**
   * Check which services are supported by current authentication scopes
   */
  async checkServiceSupport(): Promise<Map<string, { supported: boolean; missingRequired: string[]; missingOptional: string[] }>> {
    const currentScopes = await this.authService.getCurrentScopes();
    const supportStatus = new Map();

    const allServiceIds = MicrosoftServiceScopes.getAllServiceScopes().map(config => config.serviceId);
    
    for (const serviceId of allServiceIds) {
      const support = MicrosoftServiceScopes.doesScopeSupportService(currentScopes, serviceId);
      supportStatus.set(serviceId, support);
    }

    return supportStatus;
  }

  /**
   * Add scopes for specific Microsoft services
   */
  async addServiceScopes(serviceIds: string[]): Promise<void> {
    const requiredScopes = MicrosoftServiceScopes.getRequiredScopesForServices(serviceIds);
    
    try {
      for (const scope of requiredScopes) {
        await this.authService.addScope(scope);
      }

      console.log(`Added scopes for ${serviceIds.length} Microsoft services`);
      this.emit('serviceScopesAdded', { serviceIds, scopeCount: requiredScopes.length });
    } catch (error) {
      console.error('Failed to add service scopes:', error);
      throw error;
    }
  }

  /**
   * Get service configurations with scope requirements
   */
  getServiceConfigurations(): ServiceScopeConfig[] {
    return MicrosoftServiceScopes.getAllServiceScopes();
  }

  /**
   * Intelligent query analysis to determine which Microsoft service should handle the request
   */
  analyzeQueryForService(query: string): { serviceId: string; confidence: number; reason: string } {
    const queryLower = query.toLowerCase();

    // Define service keywords and patterns
    const servicePatterns = [
      {
        serviceId: 'intune',
        keywords: ['device', 'mobile', 'mdm', 'mam', 'endpoint', 'compliance policy', 'configuration profile', 'app protection'],
        patterns: [/device.*(management|policy|compliance)/, /mobile.*(app|device)/, /endpoint.*(protection|management)/],
        confidence: 0.9
      },
      {
        serviceId: 'sharepoint',
        keywords: ['sharepoint', 'site', 'list', 'library', 'document', 'content type', 'web part'],
        patterns: [/sharepoint.*(site|list|library)/, /document.*(library|management)/, /content.*(type|management)/],
        confidence: 0.9
      },
      {
        serviceId: 'teams',
        keywords: ['teams', 'channel', 'meeting', 'call', 'chat', 'collaboration'],
        patterns: [/teams?.*(channel|meeting|call)/, /online.*(meeting|call)/, /collaboration.*(platform|tool)/],
        confidence: 0.9
      },
      {
        serviceId: 'log-analytics',
        keywords: ['kql', 'kusto', 'log analytics', 'query', 'workspace', 'monitoring'],
        patterns: [/kql.*query/, /log.*(analytics|query)/, /kusto.*query/, /workspace.*data/],
        confidence: 0.95
      },
      {
        serviceId: 'security',
        keywords: ['security', 'alert', 'incident', 'threat', 'defender', 'vulnerability'],
        patterns: [/security.*(alert|incident|event)/, /threat.*(indicator|intelligence)/, /defender.*(atp|endpoint)/],
        confidence: 0.9
      },
      {
        serviceId: 'azure-arm',
        keywords: ['azure', 'resource', 'subscription', 'deployment', 'vm', 'storage account'],
        patterns: [/azure.*(resource|subscription|deployment)/, /virtual.*(machine|network)/, /resource.*(group|management)/],
        confidence: 0.8
      },
      {
        serviceId: 'power-platform',
        keywords: ['power apps', 'power automate', 'power bi', 'flow', 'canvas app'],
        patterns: [/power.*(apps?|automate|bi|platform)/, /canvas.*app/, /model.*driven.*app/],
        confidence: 0.9
      }
    ];

    let bestMatch = { serviceId: 'graph', confidence: 0.3, reason: 'Default Microsoft Graph service' };

    for (const pattern of servicePatterns) {
      let matchScore = 0;
      let matchReasons = [];

      // Check keyword matches
      for (const keyword of pattern.keywords) {
        if (queryLower.includes(keyword)) {
          matchScore += 0.2;
          matchReasons.push(`keyword: ${keyword}`);
        }
      }

      // Check pattern matches
      for (const regex of pattern.patterns) {
        if (regex.test(queryLower)) {
          matchScore += 0.3;
          matchReasons.push(`pattern match`);
        }
      }

      const finalConfidence = Math.min(matchScore * pattern.confidence, 0.95);

      if (finalConfidence > bestMatch.confidence) {
        bestMatch = {
          serviceId: pattern.serviceId,
          confidence: finalConfidence,
          reason: `Matched ${matchReasons.join(', ')}`
        };
      }
    }

    return bestMatch;
  }
}