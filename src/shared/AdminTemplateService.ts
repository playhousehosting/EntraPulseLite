// Admin Template Service
// Provides pre-built query templates and workflows for M365 administration

export interface AdminTemplate {
  id: string;
  name: string;
  description: string;
  category: 'license-management' | 'security-audit' | 'compliance' | 'user-management' | 'tenant-health' | 'reporting' | 'automation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  requirements: string[];
  tags: string[];
  queries: AdminQuery[];
  postProcessing?: PostProcessingStep[];
  exportFormats?: ExportFormat[];
  schedule?: ScheduleOptions;
}

export interface AdminQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  expectedResults: string;
  resultFormat: 'table' | 'chart' | 'metric' | 'alert';
  dependencies?: string[]; // IDs of queries that must run first
  parameters?: QueryParameter[];
  validation?: ValidationRule[];
}

export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'select';
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: string[]; // For select type
  validation?: string; // Regex pattern
}

export interface PostProcessingStep {
  type: 'filter' | 'aggregate' | 'transform' | 'alert' | 'export';
  description: string;
  config: any;
}

export interface ExportFormat {
  format: 'pdf' | 'csv' | 'excel' | 'json';
  template?: string;
  options?: any;
}

export interface ScheduleOptions {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  recipients?: string[];
}

export interface ValidationRule {
  type: 'min' | 'max' | 'range' | 'pattern' | 'custom';
  value: any;
  message: string;
}

/**
 * Service for managing admin templates and workflows
 */
export class AdminTemplateService {
  private templates: Map<string, AdminTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  /**
   * Get all available templates
   */
  getTemplates(): AdminTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: AdminTemplate['category']): AdminTemplate[] {
    return this.getTemplates().filter(template => template.category === category);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): AdminTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Search templates by name, description, or tags
   */
  searchTemplates(searchTerm: string): AdminTemplate[] {
    const term = searchTerm.toLowerCase();
    return this.getTemplates().filter(template =>
      template.name.toLowerCase().includes(term) ||
      template.description.toLowerCase().includes(term) ||
      template.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  /**
   * Add custom template
   */
  addTemplate(template: AdminTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove template
   */
  removeTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Execute template workflow
   */
  async executeTemplate(templateId: string, parameters?: Record<string, any>): Promise<TemplateExecutionResult> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    console.log(`🎯 Executing template: ${template.name}`);
    
    const results: QueryResult[] = [];
    const errors: string[] = [];
    
    try {
      // Execute queries in dependency order
      const executionOrder = this.resolveDependencies(template.queries);
      
      for (const query of executionOrder) {
        try {
          console.log(`📊 Executing query: ${query.name}`);
          
          // Replace parameters in query
          const processedQuery = this.processQueryParameters(query.query, parameters);
          
          // Execute the query (this would integrate with your Graph service)
          const result = await this.executeQuery(processedQuery, query);
          
          // Validate results if validation rules exist
          if (query.validation) {
            this.validateQueryResult(result, query.validation);
          }
          
          results.push({
            queryId: query.id,
            queryName: query.name,
            data: result,
            format: query.resultFormat,
            timestamp: new Date()
          });
          
        } catch (error) {
          const errorMessage = `Query ${query.name} failed: ${error instanceof Error ? error.message : String(error)}`;
          console.error(errorMessage);
          errors.push(errorMessage);
        }
      }
      
      // Apply post-processing if defined
      let processedResults = results;
      if (template.postProcessing) {
        processedResults = await this.applyPostProcessing(results, template.postProcessing);
      }
      
      return {
        templateId,
        templateName: template.name,
        success: errors.length === 0,
        results: processedResults,
        errors,
        executionTime: new Date(),
        summary: this.generateExecutionSummary(template, processedResults, errors)
      };
      
    } catch (error) {
      console.error(`Template execution failed:`, error);
      return {
        templateId,
        templateName: template.name,
        success: false,
        results,
        errors: [error instanceof Error ? error.message : String(error)],
        executionTime: new Date(),
        summary: 'Template execution failed'
      };
    }
  }

  /**
   * Initialize default admin templates
   */
  private initializeDefaultTemplates(): void {
    // License Management Templates
    this.addTemplate(this.createLicenseAuditTemplate());
    this.addTemplate(this.createLicenseOptimizationTemplate());
    this.addTemplate(this.createUnusedLicenseTemplate());
    
    // Security Audit Templates
    this.addTemplate(this.createSecurityAuditTemplate());
    this.addTemplate(this.createPrivilegedUserAuditTemplate());
    this.addTemplate(this.createConditionalAccessAuditTemplate());
    
    // Compliance Templates
    this.addTemplate(this.createComplianceReportTemplate());
    this.addTemplate(this.createDataRetentionAuditTemplate());
    this.addTemplate(this.createGuestUserAuditTemplate());
    
    // User Management Templates
    this.addTemplate(this.createUserOnboardingTemplate());
    this.addTemplate(this.createUserOffboardingTemplate());
    this.addTemplate(this.createInactiveUserTemplate());
    
    // Tenant Health Templates
    this.addTemplate(this.createTenantHealthTemplate());
    this.addTemplate(this.createServiceHealthTemplate());
    this.addTemplate(this.createUsageAnalyticsTemplate());
    
    console.log(`✅ Initialized ${this.templates.size} default admin templates`);
  }

  // Template Creation Methods

  private createLicenseAuditTemplate(): AdminTemplate {
    return {
      id: 'license-audit-comprehensive',
      name: 'Comprehensive License Audit',
      description: 'Complete audit of all licenses, assignments, and usage across the tenant',
      category: 'license-management',
      difficulty: 'beginner',
      estimatedTime: '5-10 minutes',
      requirements: ['Directory.Read.All', 'Organization.Read.All'],
      tags: ['license', 'audit', 'compliance', 'cost-optimization'],
      queries: [
        {
          id: 'license-summary',
          name: 'License Summary',
          description: 'Get overview of all available licenses',
          query: 'GET /subscribedSkus',
          expectedResults: 'List of all subscribed SKUs with counts',
          resultFormat: 'table'
        },
        {
          id: 'license-assignments',
          name: 'License Assignments',
          description: 'Get detailed license assignments per user',
          query: 'GET /users?$select=displayName,userPrincipalName,assignedLicenses,usageLocation&$top=999',
          expectedResults: 'User license assignments',
          resultFormat: 'table',
          dependencies: ['license-summary']
        },
        {
          id: 'unused-licenses',
          name: 'Unused Licenses',
          description: 'Calculate unused license capacity',
          query: 'CALCULATE unused licenses from license-summary and license-assignments',
          expectedResults: 'Unused license counts by SKU',
          resultFormat: 'chart'
        }
      ],
      postProcessing: [
        {
          type: 'aggregate',
          description: 'Calculate license utilization percentages',
          config: { operation: 'utilization_percentage' }
        },
        {
          type: 'alert',
          description: 'Alert on licenses with <80% utilization',
          config: { threshold: 0.8, metric: 'utilization' }
        }
      ],
      exportFormats: [
        { format: 'excel', template: 'license-audit-template' },
        { format: 'pdf', template: 'executive-summary' },
        { format: 'csv' }
      ]
    };
  }

  private createSecurityAuditTemplate(): AdminTemplate {
    return {
      id: 'security-audit-comprehensive',
      name: 'Comprehensive Security Audit',
      description: 'Complete security assessment including privileged users, sign-ins, and security policies',
      category: 'security-audit',
      difficulty: 'intermediate',
      estimatedTime: '10-15 minutes',
      requirements: ['Directory.Read.All', 'AuditLog.Read.All', 'Policy.Read.All'],
      tags: ['security', 'audit', 'compliance', 'risk-assessment'],
      queries: [
        {
          id: 'privileged-users',
          name: 'Privileged Users',
          description: 'Identify all users with administrative roles',
          query: 'GET /directoryRoles?$expand=members',
          expectedResults: 'List of admin roles and their members',
          resultFormat: 'table'
        },
        {
          id: 'risky-sign-ins',
          name: 'Risky Sign-ins',
          description: 'Get recent risky sign-in events',
          query: 'GET /auditLogs/signIns?$filter=riskLevelDuringSignIn eq \'high\' or riskLevelDuringSignIn eq \'medium\'&$top=100',
          expectedResults: 'Recent risky sign-in attempts',
          resultFormat: 'table'
        },
        {
          id: 'conditional-access-policies',
          name: 'Conditional Access Policies',
          description: 'Review all conditional access policies',
          query: 'GET /identity/conditionalAccess/policies',
          expectedResults: 'Conditional access policy configuration',
          resultFormat: 'table'
        },
        {
          id: 'mfa-registration',
          name: 'MFA Registration Status',
          description: 'Check MFA registration status for all users',
          query: 'GET /reports/authenticationMethods/userRegistrationDetails',
          expectedResults: 'MFA registration status by user',
          resultFormat: 'chart'
        }
      ],
      postProcessing: [
        {
          type: 'alert',
          description: 'Alert on users without MFA',
          config: { condition: 'isMfaRegistered eq false' }
        },
        {
          type: 'alert',
          description: 'Alert on inactive conditional access policies',
          config: { condition: 'state eq \'disabled\'' }
        }
      ],
      exportFormats: [
        { format: 'pdf', template: 'security-report' },
        { format: 'excel', template: 'security-audit-detailed' }
      ]
    };
  }

  private createUserOnboardingTemplate(): AdminTemplate {
    return {
      id: 'user-onboarding-workflow',
      name: 'User Onboarding Workflow',
      description: 'Complete workflow for onboarding new users including account creation, license assignment, and group membership',
      category: 'user-management',
      difficulty: 'intermediate',
      estimatedTime: '3-5 minutes per user',
      requirements: ['User.ReadWrite.All', 'Group.ReadWrite.All', 'Directory.ReadWrite.All'],
      tags: ['onboarding', 'user-management', 'automation', 'workflow'],
      queries: [
        {
          id: 'validate-user-info',
          name: 'Validate User Information',
          description: 'Validate user information before account creation',
          query: 'VALIDATE user parameters',
          expectedResults: 'Validation results',
          resultFormat: 'metric',
          parameters: [
            {
              name: 'displayName',
              type: 'string',
              required: true,
              description: 'Full name of the user'
            },
            {
              name: 'userPrincipalName',
              type: 'email',
              required: true,
              description: 'Email address/UPN for the user'
            },
            {
              name: 'department',
              type: 'string',
              required: false,
              description: 'Department name'
            },
            {
              name: 'jobTitle',
              type: 'string',
              required: false,
              description: 'Job title'
            },
            {
              name: 'manager',
              type: 'email',
              required: false,
              description: 'Manager email address'
            },
            {
              name: 'licenseType',
              type: 'select',
              required: true,
              description: 'License to assign',
              options: ['Business Basic', 'Business Standard', 'Business Premium', 'E3', 'E5']
            }
          ]
        },
        {
          id: 'create-user-account',
          name: 'Create User Account',
          description: 'Create the user account in Azure AD',
          query: 'POST /users',
          expectedResults: 'Created user object',
          resultFormat: 'table',
          dependencies: ['validate-user-info']
        },
        {
          id: 'assign-license',
          name: 'Assign License',
          description: 'Assign the specified license to the user',
          query: 'POST /users/{userId}/assignLicense',
          expectedResults: 'License assignment result',
          resultFormat: 'metric',
          dependencies: ['create-user-account']
        },
        {
          id: 'add-to-groups',
          name: 'Add to Security Groups',
          description: 'Add user to appropriate security groups based on department',
          query: 'POST /groups/{groupId}/members/$ref',
          expectedResults: 'Group membership results',
          resultFormat: 'table',
          dependencies: ['create-user-account']
        },
        {
          id: 'setup-manager-relationship',
          name: 'Setup Manager Relationship',
          description: 'Configure manager relationship if specified',
          query: 'PUT /users/{userId}/manager/$ref',
          expectedResults: 'Manager relationship result',
          resultFormat: 'metric',
          dependencies: ['create-user-account']
        }
      ],
      postProcessing: [
        {
          type: 'export',
          description: 'Generate onboarding completion report',
          config: { format: 'pdf', template: 'onboarding-report' }
        }
      ]
    };
  }

  private createTenantHealthTemplate(): AdminTemplate {
    return {
      id: 'tenant-health-monitor',
      name: 'Tenant Health Monitor',
      description: 'Comprehensive tenant health check including service status, usage metrics, and security indicators',
      category: 'tenant-health',
      difficulty: 'beginner',
      estimatedTime: '2-3 minutes',
      requirements: ['Directory.Read.All', 'Reports.Read.All', 'ServiceHealth.Read.All'],
      tags: ['health', 'monitoring', 'dashboard', 'overview'],
      queries: [
        {
          id: 'service-health',
          name: 'Service Health',
          description: 'Check status of all M365 services',
          query: 'GET /admin/serviceAnnouncement/healthOverviews',
          expectedResults: 'Service health status',
          resultFormat: 'chart'
        },
        {
          id: 'user-activity',
          name: 'User Activity Summary',
          description: 'Get user activity metrics',
          query: 'GET /reports/getOffice365ActiveUserCounts(period=\'D7\')',
          expectedResults: '7-day user activity counts',
          resultFormat: 'chart'
        },
        {
          id: 'storage-usage',
          name: 'Storage Usage',
          description: 'Check storage usage across services',
          query: 'GET /reports/getOffice365ServicesUserCounts(period=\'D7\')',
          expectedResults: 'Storage usage by service',
          resultFormat: 'chart'
        },
        {
          id: 'security-score',
          name: 'Secure Score',
          description: 'Get current secure score and recommendations',
          query: 'GET /security/secureScores?$top=1',
          expectedResults: 'Current security score',
          resultFormat: 'metric'
        }
      ],
      schedule: {
        enabled: true,
        frequency: 'daily',
        time: '08:00',
        recipients: ['admin@tenant.com']
      }
    };
  }

  // Additional template creation methods would go here...
  private createLicenseOptimizationTemplate(): AdminTemplate {
    return {
      id: 'license-optimization',
      name: 'License Optimization Analysis',
      description: 'Identify opportunities to optimize license costs and usage',
      category: 'license-management',
      difficulty: 'intermediate',
      estimatedTime: '8-12 minutes',
      requirements: ['Directory.Read.All', 'Reports.Read.All'],
      tags: ['license', 'optimization', 'cost-reduction', 'analytics'],
      queries: [
        {
          id: 'license-usage-trends',
          name: 'License Usage Trends',
          description: 'Analyze license usage over time',
          query: 'GET /reports/getOffice365ActiveUserCounts(period=\'D30\')',
          expectedResults: '30-day license usage trends',
          resultFormat: 'chart'
        }
      ]
    };
  }

  private createUnusedLicenseTemplate(): AdminTemplate {
    return {
      id: 'unused-license-report',
      name: 'Unused License Report',
      description: 'Generate report of unused or underutilized licenses',
      category: 'license-management',
      difficulty: 'beginner',
      estimatedTime: '3-5 minutes',
      requirements: ['Directory.Read.All'],
      tags: ['license', 'unused', 'cost-savings', 'report'],
      queries: []
    };
  }

  private createPrivilegedUserAuditTemplate(): AdminTemplate {
    return {
      id: 'privileged-user-audit',
      name: 'Privileged User Audit',
      description: 'Detailed audit of all privileged users and their permissions',
      category: 'security-audit',
      difficulty: 'advanced',
      estimatedTime: '10-15 minutes',
      requirements: ['Directory.Read.All', 'RoleManagement.Read.All'],
      tags: ['security', 'privileged-access', 'audit', 'compliance'],
      queries: []
    };
  }

  private createConditionalAccessAuditTemplate(): AdminTemplate {
    return {
      id: 'conditional-access-audit',
      name: 'Conditional Access Audit',
      description: 'Review and analyze conditional access policies and their effectiveness',
      category: 'security-audit',
      difficulty: 'advanced',
      estimatedTime: '8-10 minutes',
      requirements: ['Policy.Read.All', 'AuditLog.Read.All'],
      tags: ['conditional-access', 'security', 'policy-review'],
      queries: []
    };
  }

  private createComplianceReportTemplate(): AdminTemplate {
    return {
      id: 'compliance-report',
      name: 'Compliance Status Report',
      description: 'Generate comprehensive compliance status report',
      category: 'compliance',
      difficulty: 'intermediate',
      estimatedTime: '12-15 minutes',
      requirements: ['Directory.Read.All', 'Policy.Read.All', 'AuditLog.Read.All'],
      tags: ['compliance', 'governance', 'audit', 'reporting'],
      queries: []
    };
  }

  private createDataRetentionAuditTemplate(): AdminTemplate {
    return {
      id: 'data-retention-audit',
      name: 'Data Retention Audit',
      description: 'Audit data retention policies and compliance',
      category: 'compliance',
      difficulty: 'advanced',
      estimatedTime: '15-20 minutes',
      requirements: ['Policy.Read.All', 'InformationProtectionPolicy.Read.All'],
      tags: ['data-retention', 'compliance', 'governance'],
      queries: []
    };
  }

  private createGuestUserAuditTemplate(): AdminTemplate {
    return {
      id: 'guest-user-audit',
      name: 'Guest User Audit',
      description: 'Comprehensive audit of guest users and their access',
      category: 'compliance',
      difficulty: 'intermediate',
      estimatedTime: '6-8 minutes',
      requirements: ['Directory.Read.All', 'AuditLog.Read.All'],
      tags: ['guest-users', 'external-access', 'security', 'audit'],
      queries: []
    };
  }

  private createUserOffboardingTemplate(): AdminTemplate {
    return {
      id: 'user-offboarding-workflow',
      name: 'User Offboarding Workflow',
      description: 'Complete workflow for securely offboarding users',
      category: 'user-management',
      difficulty: 'intermediate',
      estimatedTime: '5-8 minutes per user',
      requirements: ['User.ReadWrite.All', 'Group.ReadWrite.All'],
      tags: ['offboarding', 'security', 'user-management', 'workflow'],
      queries: []
    };
  }

  private createInactiveUserTemplate(): AdminTemplate {
    return {
      id: 'inactive-user-report',
      name: 'Inactive User Report',
      description: 'Identify and report on inactive user accounts',
      category: 'user-management',
      difficulty: 'beginner',
      estimatedTime: '4-6 minutes',
      requirements: ['Directory.Read.All', 'AuditLog.Read.All'],
      tags: ['inactive-users', 'cleanup', 'security', 'cost-optimization'],
      queries: []
    };
  }

  private createServiceHealthTemplate(): AdminTemplate {
    return {
      id: 'service-health-detailed',
      name: 'Detailed Service Health Report',
      description: 'Comprehensive service health and incident analysis',
      category: 'tenant-health',
      difficulty: 'beginner',
      estimatedTime: '3-4 minutes',
      requirements: ['ServiceHealth.Read.All'],
      tags: ['service-health', 'incidents', 'monitoring', 'operations'],
      queries: []
    };
  }

  private createUsageAnalyticsTemplate(): AdminTemplate {
    return {
      id: 'usage-analytics-comprehensive',
      name: 'Comprehensive Usage Analytics',
      description: 'Detailed usage analytics across all M365 services',
      category: 'tenant-health',
      difficulty: 'intermediate',
      estimatedTime: '8-12 minutes',
      requirements: ['Reports.Read.All'],
      tags: ['analytics', 'usage', 'adoption', 'insights'],
      queries: []
    };
  }

  // Helper methods

  private resolveDependencies(queries: AdminQuery[]): AdminQuery[] {
    // Simple dependency resolution - in production, use a proper topological sort
    const resolved: AdminQuery[] = [];
    const remaining = [...queries];
    
    while (remaining.length > 0) {
      const canExecute = remaining.filter(query => 
        !query.dependencies || 
        query.dependencies.every(dep => resolved.some(r => r.id === dep))
      );
      
      if (canExecute.length === 0) {
        throw new Error('Circular dependency detected in query execution order');
      }
      
      resolved.push(...canExecute);
      canExecute.forEach(query => {
        const index = remaining.indexOf(query);
        remaining.splice(index, 1);
      });
    }
    
    return resolved;
  }

  private processQueryParameters(query: string, parameters?: Record<string, any>): string {
    if (!parameters) return query;
    
    let processedQuery = query;
    Object.entries(parameters).forEach(([key, value]) => {
      processedQuery = processedQuery.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });
    
    return processedQuery;
  }

  private async executeQuery(query: string, queryConfig: AdminQuery): Promise<any> {
    try {
      // Execute actual Microsoft Graph API query
      console.log(`Executing Graph query: ${queryConfig.name} - ${query}`);
      
      // Extract endpoint from the query string if it starts with a Graph endpoint pattern
      let endpoint = 'https://graph.microsoft.com/v1.0/';
      if (query.startsWith('https://graph.microsoft.com/')) {
        endpoint = query;
      } else if (query.startsWith('/')) {
        endpoint = `https://graph.microsoft.com/v1.0${query}`;
      } else {
        endpoint = `https://graph.microsoft.com/v1.0/${query}`;
      }

      // Call the Graph service through the main process
      const result = await (window.electronAPI as any).graph.executeQuery({
        endpoint: endpoint,
        method: 'GET',
        query: queryConfig.name
      });

      if (!result.success) {
        throw new Error(result.error || 'Query execution failed');
      }

      return {
        data: result.data,
        query: queryConfig.name,
        endpoint: endpoint,
        timestamp: new Date(),
        success: true
      };
    } catch (error) {
      console.error(`Failed to execute query ${queryConfig.name}:`, error);
      throw error;
    }
  }

  private validateQueryResult(result: any, rules: ValidationRule[]): void {
    // Implement validation logic
    console.log('Validating query result:', result);
  }

  private async applyPostProcessing(results: QueryResult[], steps: PostProcessingStep[]): Promise<QueryResult[]> {
    // Implement post-processing logic
    console.log('Applying post-processing steps:', steps);
    return results;
  }

  private generateExecutionSummary(template: AdminTemplate, results: QueryResult[], errors: string[]): string {
    const successCount = results.length;
    const errorCount = errors.length;
    
    return `Template "${template.name}" executed with ${successCount} successful queries and ${errorCount} errors.`;
  }
}

// Supporting interfaces

export interface QueryResult {
  queryId: string;
  queryName: string;
  data: any;
  format: 'table' | 'chart' | 'metric' | 'alert';
  timestamp: Date;
}

export interface TemplateExecutionResult {
  templateId: string;
  templateName: string;
  success: boolean;
  results: QueryResult[];
  errors: string[];
  executionTime: Date;
  summary: string;
}