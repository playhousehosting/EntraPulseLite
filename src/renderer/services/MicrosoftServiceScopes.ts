// MicrosoftServiceScopes.ts
// Comprehensive scope definitions for all Microsoft services

export interface ServiceScopeConfig {
  serviceId: string;
  serviceName: string;
  requiredScopes: string[];
  optionalScopes: string[];
  description: string;
}

export class MicrosoftServiceScopes {
  private static scopeConfigs: ServiceScopeConfig[] = [
    {
      serviceId: 'graph',
      serviceName: 'Microsoft Graph',
      requiredScopes: [
        'User.Read',
        'User.ReadBasic.All'
      ],
      optionalScopes: [
        'User.ReadWrite.All',
        'Group.Read.All',
        'Group.ReadWrite.All',
        'Mail.Read',
        'Mail.ReadWrite',
        'Mail.Send',
        'Calendars.Read',
        'Calendars.ReadWrite',
        'Files.Read',
        'Files.ReadWrite',
        'Files.ReadWrite.All',
        'Sites.Read.All',
        'Sites.ReadWrite.All',
        'Directory.Read.All',
        'Directory.ReadWrite.All',
        'Application.Read.All',
        'ServiceHealth.Read.All'
      ],
      description: 'Core Microsoft 365 services including users, groups, mail, calendar, and files'
    },
    {
      serviceId: 'intune',
      serviceName: 'Microsoft Intune',
      requiredScopes: [
        'DeviceManagementConfiguration.Read.All'
      ],
      optionalScopes: [
        'DeviceManagementConfiguration.ReadWrite.All',
        'DeviceManagementApps.Read.All',
        'DeviceManagementApps.ReadWrite.All',
        'DeviceManagementManagedDevices.Read.All',
        'DeviceManagementManagedDevices.ReadWrite.All',
        'DeviceManagementServiceConfig.Read.All',
        'DeviceManagementServiceConfig.ReadWrite.All'
      ],
      description: 'Device management, mobile application management, and endpoint protection'
    },
    {
      serviceId: 'sharepoint',
      serviceName: 'SharePoint Online',
      requiredScopes: [
        'Sites.Read.All'
      ],
      optionalScopes: [
        'Sites.ReadWrite.All',
        'Sites.Manage.All',
        'Sites.FullControl.All',
        'TermStore.Read.All',
        'TermStore.ReadWrite.All'
      ],
      description: 'SharePoint sites, lists, libraries, and content management'
    },
    {
      serviceId: 'teams',
      serviceName: 'Microsoft Teams',
      requiredScopes: [
        'Team.ReadBasic.All'
      ],
      optionalScopes: [
        'Team.Read.All',
        'Team.ReadWrite.All',
        'Channel.ReadBasic.All',
        'Channel.Read.All',
        'Channel.ReadWrite.All',
        'CallRecords.Read.All',
        'OnlineMeetings.Read.All',
        'OnlineMeetings.ReadWrite.All'
      ],
      description: 'Teams, channels, meetings, calls, and collaboration features'
    },
    {
      serviceId: 'azure-arm',
      serviceName: 'Azure Resource Manager',
      requiredScopes: [
        'https://management.azure.com/user_impersonation'
      ],
      optionalScopes: [],
      description: 'Azure resource management, subscriptions, and deployments'
    },
    {
      serviceId: 'log-analytics',
      serviceName: 'Azure Log Analytics',
      requiredScopes: [
        'https://api.loganalytics.io/Data.Read'
      ],
      optionalScopes: [],
      description: 'Log queries using KQL, workspace data, and monitoring insights'
    },
    {
      serviceId: 'security',
      serviceName: 'Microsoft Security',
      requiredScopes: [
        'SecurityEvents.Read.All'
      ],
      optionalScopes: [
        'SecurityEvents.ReadWrite.All',
        'ThreatIndicators.ReadWrite.OwnedBy',
        'SecurityAlert.Read.All',
        'SecurityIncident.Read.All',
        'InformationProtectionPolicy.Read'
      ],
      description: 'Security events, alerts, incidents, and threat indicators'
    },
    {
      serviceId: 'power-platform',
      serviceName: 'Power Platform',
      requiredScopes: [
        'https://service.powerapps.com/user'
      ],
      optionalScopes: [
        'https://api.powerbi.com/User.Read'
      ],
      description: 'Power Apps, Power Automate, Power BI, and Power Pages'
    },
    {
      serviceId: 'exchange-online',
      serviceName: 'Exchange Online',
      requiredScopes: [
        'https://outlook.office365.com/PowerShell-LiveId'
      ],
      optionalScopes: [],
      description: 'Advanced Exchange Online management capabilities'
    }
  ];

  /**
   * Get scope configuration for a specific service
   */
  static getServiceScopes(serviceId: string): ServiceScopeConfig | null {
    return this.scopeConfigs.find(config => config.serviceId === serviceId) || null;
  }

  /**
   * Get all service scope configurations
   */
  static getAllServiceScopes(): ServiceScopeConfig[] {
    return [...this.scopeConfigs];
  }

  /**
   * Get required scopes for multiple services
   */
  static getRequiredScopesForServices(serviceIds: string[]): string[] {
    const scopes = new Set<string>();
    
    serviceIds.forEach(serviceId => {
      const config = this.getServiceScopes(serviceId);
      if (config) {
        config.requiredScopes.forEach(scope => scopes.add(scope));
      }
    });

    return Array.from(scopes);
  }

  /**
   * Get all scopes (required + optional) for multiple services
   */
  static getAllScopesForServices(serviceIds: string[]): string[] {
    const scopes = new Set<string>();
    
    serviceIds.forEach(serviceId => {
      const config = this.getServiceScopes(serviceId);
      if (config) {
        [...config.requiredScopes, ...config.optionalScopes].forEach(scope => scopes.add(scope));
      }
    });

    return Array.from(scopes);
  }

  /**
   * Get comprehensive scopes for maximum Microsoft service access
   */
  static getComprehensiveScopes(): string[] {
    const allScopes = new Set<string>();
    
    this.scopeConfigs.forEach(config => {
      [...config.requiredScopes, ...config.optionalScopes].forEach(scope => allScopes.add(scope));
    });

    return Array.from(allScopes);
  }

  /**
   * Check if current scopes support a specific service
   */
  static doesScopeSupportService(currentScopes: string[], serviceId: string): {
    supported: boolean;
    missingRequired: string[];
    missingOptional: string[];
  } {
    const config = this.getServiceScopes(serviceId);
    if (!config) {
      return { supported: false, missingRequired: [], missingOptional: [] };
    }

    const currentScopeSet = new Set(currentScopes);
    
    const missingRequired = config.requiredScopes.filter(scope => !currentScopeSet.has(scope));
    const missingOptional = config.optionalScopes.filter(scope => !currentScopeSet.has(scope));
    
    return {
      supported: missingRequired.length === 0,
      missingRequired,
      missingOptional
    };
  }

  /**
   * Get recommended scopes for a balanced set of Microsoft service access
   */
  static getRecommendedScopes(): string[] {
    return [
      // Core Graph API scopes
      'User.Read',
      'User.ReadBasic.All',
      'Group.Read.All',
      'Mail.Read',
      'Calendars.Read',
      'Files.Read',
      'Sites.Read.All',
      'Directory.Read.All',
      
      // Basic device management
      'DeviceManagementConfiguration.Read.All',
      'DeviceManagementManagedDevices.Read.All',
      
      // Teams basics
      'Team.ReadBasic.All',
      'Channel.ReadBasic.All',
      
      // Security basics
      'SecurityEvents.Read.All',
      
      // Azure basics
      'https://management.azure.com/user_impersonation',
      'https://api.loganalytics.io/Data.Read'
    ];
  }

  /**
   * Get premium scopes for advanced Microsoft service access
   */
  static getPremiumScopes(): string[] {
    return [
      // Full Graph API access
      'User.ReadWrite.All',
      'Group.ReadWrite.All',
      'Mail.ReadWrite',
      'Mail.Send',
      'Calendars.ReadWrite',
      'Files.ReadWrite.All',
      'Sites.ReadWrite.All',
      'Directory.ReadWrite.All',
      'Application.Read.All',
      
      // Full device management
      'DeviceManagementConfiguration.ReadWrite.All',
      'DeviceManagementApps.ReadWrite.All',
      'DeviceManagementManagedDevices.ReadWrite.All',
      
      // Full Teams access
      'Team.ReadWrite.All',
      'Channel.ReadWrite.All',
      'CallRecords.Read.All',
      'OnlineMeetings.ReadWrite.All',
      
      // Advanced security
      'SecurityEvents.ReadWrite.All',
      'ThreatIndicators.ReadWrite.OwnedBy',
      'InformationProtectionPolicy.Read',
      
      // Power Platform
      'https://service.powerapps.com/user',
      'https://api.powerbi.com/User.Read',
      
      // Exchange Online
      'https://outlook.office365.com/PowerShell-LiveId'
    ];
  }
}

export default MicrosoftServiceScopes;