import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  format: ReportFormat[];
  parameters: ReportParameter[];
  queries: ReportQuery[];
  postProcessing?: string[];
  scheduling?: ReportSchedule;
}

export interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  description: string;
}

export interface ReportQuery {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  parameters?: Record<string, any>;
  transformation?: string;
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  enabled: boolean;
  recipients: string[];
}

export enum ReportCategory {
  COMPLIANCE = 'compliance',
  SECURITY = 'security',
  LICENSING = 'licensing',
  USER_MANAGEMENT = 'user_management',
  TENANT_HEALTH = 'tenant_health',
  PERFORMANCE = 'performance',
  COST_OPTIMIZATION = 'cost_optimization',
  MSP_BILLING = 'msp_billing',
  AUDIT = 'audit',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  EXCEL = 'xlsx',
  JSON = 'json',
  HTML = 'html'
}

export interface ReportResult {
  id: string;
  templateId: string;
  name: string;
  format: ReportFormat;
  generatedAt: Date;
  parameters: Record<string, any>;
  filePath: string;
  data: any;
  metadata: {
    recordCount: number;
    executionTime: number;
    tenant?: string;
    size: number;
  };
}

export class ReportingService {
  private reports: Map<string, ReportTemplate> = new Map();
  private reportHistory: ReportResult[] = [];

  constructor() {
    this.initializeDefaultReports();
  }

  private initializeDefaultReports(): void {
    const defaultReports: ReportTemplate[] = [
      {
        id: 'security-compliance-report',
        name: 'Security Compliance Report',
        description: 'Comprehensive security and compliance assessment',
        category: ReportCategory.COMPLIANCE,
        format: [ReportFormat.PDF, ReportFormat.EXCEL],
        parameters: [
          {
            name: 'tenantId',
            type: 'select',
            required: false,
            description: 'Target tenant (leave empty for all tenants)'
          },
          {
            name: 'includeRecommendations',
            type: 'boolean',
            required: false,
            defaultValue: true,
            description: 'Include security recommendations'
          }
        ],
        queries: [
          {
            id: 'conditional-access-policies',
            name: 'Conditional Access Policies',
            description: 'All conditional access policies and their status',
            endpoint: '/identity/conditionalAccess/policies',
            method: 'GET'
          },
          {
            id: 'mfa-status',
            name: 'MFA Status',
            description: 'Multi-factor authentication status by user',
            endpoint: '/reports/authenticationMethods/userRegistrationDetails',
            method: 'GET'
          },
          {
            id: 'privileged-roles',
            name: 'Privileged Role Assignments',
            description: 'All privileged role assignments',
            endpoint: '/directoryRoles',
            method: 'GET'
          }
        ],
        postProcessing: ['security-score-calculation', 'compliance-rating']
      },
      {
        id: 'license-usage-report',
        name: 'License Usage Report',
        description: 'Detailed licensing and usage analytics',
        category: ReportCategory.LICENSING,
        format: [ReportFormat.CSV, ReportFormat.EXCEL, ReportFormat.PDF],
        parameters: [
          {
            name: 'tenantId',
            type: 'select',
            required: false,
            description: 'Target tenant (leave empty for all tenants)'
          },
          {
            name: 'period',
            type: 'select',
            required: true,
            defaultValue: '30',
            options: ['7', '30', '90', '365'],
            description: 'Reporting period (days)'
          }
        ],
        queries: [
          {
            id: 'subscription-sku',
            name: 'Subscription SKUs',
            description: 'All subscription SKUs and quantities',
            endpoint: '/subscribedSkus',
            method: 'GET'
          },
          {
            id: 'user-licenses',
            name: 'User License Assignments',
            description: 'License assignments per user',
            endpoint: '/users',
            method: 'GET',
            parameters: { '$select': 'displayName,userPrincipalName,assignedLicenses' }
          }
        ],
        postProcessing: ['license-optimization-analysis', 'cost-calculation']
      },
      {
        id: 'user-activity-report',
        name: 'User Activity Report',
        description: 'User activity and productivity metrics',
        category: ReportCategory.USER_MANAGEMENT,
        format: [ReportFormat.CSV, ReportFormat.EXCEL],
        parameters: [
          {
            name: 'tenantId',
            type: 'select',
            required: false,
            description: 'Target tenant (leave empty for all tenants)'
          },
          {
            name: 'period',
            type: 'select',
            required: true,
            defaultValue: '30',
            options: ['7', '30', '90'],
            description: 'Activity period (days)'
          },
          {
            name: 'includeInactiveUsers',
            type: 'boolean',
            required: false,
            defaultValue: true,
            description: 'Include inactive users in report'
          }
        ],
        queries: [
          {
            id: 'user-signin-logs',
            name: 'User Sign-in Activity',
            description: 'Recent user sign-in activity',
            endpoint: '/auditLogs/signIns',
            method: 'GET'
          },
          {
            id: 'user-list',
            name: 'User Directory',
            description: 'All users with basic information',
            endpoint: '/users',
            method: 'GET',
            parameters: { '$select': 'displayName,userPrincipalName,createdDateTime,lastSignInDateTime' }
          }
        ],
        postProcessing: ['activity-analysis', 'inactive-user-identification']
      },
      {
        id: 'tenant-health-report',
        name: 'Tenant Health Report',
        description: 'Overall tenant health and configuration assessment',
        category: ReportCategory.TENANT_HEALTH,
        format: [ReportFormat.PDF, ReportFormat.HTML],
        parameters: [
          {
            name: 'tenantId',
            type: 'select',
            required: false,
            description: 'Target tenant (leave empty for all tenants)'
          },
          {
            name: 'includePerformanceMetrics',
            type: 'boolean',
            required: false,
            defaultValue: true,
            description: 'Include performance metrics'
          }
        ],
        queries: [
          {
            id: 'organization-info',
            name: 'Organization Information',
            description: 'Basic organization details and settings',
            endpoint: '/organization',
            method: 'GET'
          },
          {
            id: 'service-health',
            name: 'Service Health',
            description: 'Current service health status',
            endpoint: '/admin/serviceAnnouncement/healthOverviews',
            method: 'GET'
          },
          {
            id: 'domains',
            name: 'Domains',
            description: 'All domains and their verification status',
            endpoint: '/domains',
            method: 'GET'
          }
        ],
        postProcessing: ['health-score-calculation', 'configuration-recommendations']
      },
      {
        id: 'msp-billing-report',
        name: 'MSP Billing Report',
        description: 'Comprehensive billing report for MSP clients',
        category: ReportCategory.MSP_BILLING,
        format: [ReportFormat.PDF, ReportFormat.EXCEL, ReportFormat.CSV],
        parameters: [
          {
            name: 'billingPeriod',
            type: 'select',
            required: true,
            options: ['current', 'previous', 'custom'],
            description: 'Billing period'
          },
          {
            name: 'includeUsageDetails',
            type: 'boolean',
            required: false,
            defaultValue: true,
            description: 'Include detailed usage metrics'
          },
          {
            name: 'groupByTenant',
            type: 'boolean',
            required: false,
            defaultValue: true,
            description: 'Group costs by tenant'
          }
        ],
        queries: [
          {
            id: 'tenant-usage',
            name: 'Tenant Usage Metrics',
            description: 'Usage metrics per tenant for billing',
            endpoint: '/reports/getOffice365ActiveUserDetail',
            method: 'GET'
          }
        ],
        postProcessing: ['billing-calculation', 'cost-allocation', 'invoice-generation']
      },
      {
        id: 'audit-log-report',
        name: 'Audit Log Report',
        description: 'Comprehensive audit trail and activity log',
        category: ReportCategory.AUDIT,
        format: [ReportFormat.CSV, ReportFormat.EXCEL, ReportFormat.JSON],
        parameters: [
          {
            name: 'tenantId',
            type: 'select',
            required: false,
            description: 'Target tenant (leave empty for all tenants)'
          },
          {
            name: 'activityType',
            type: 'multiselect',
            required: false,
            options: ['signIn', 'userManagement', 'applicationManagement', 'directoryManagement'],
            description: 'Types of activities to include'
          },
          {
            name: 'dateRange',
            type: 'select',
            required: true,
            defaultValue: '30',
            options: ['7', '30', '90'],
            description: 'Date range (days)'
          }
        ],
        queries: [
          {
            id: 'audit-logs',
            name: 'Directory Audit Logs',
            description: 'All directory audit logs',
            endpoint: '/auditLogs/directoryAudits',
            method: 'GET'
          },
          {
            id: 'signin-logs',
            name: 'Sign-in Logs',
            description: 'User sign-in audit logs',
            endpoint: '/auditLogs/signIns',
            method: 'GET'
          }
        ],
        postProcessing: ['risk-analysis', 'anomaly-detection']
      }
    ];

    defaultReports.forEach(report => {
      this.reports.set(report.id, report);
    });
  }

  getReportTemplates(): ReportTemplate[] {
    return Array.from(this.reports.values());
  }

  getReportTemplate(id: string): ReportTemplate | undefined {
    return this.reports.get(id);
  }

  getReportsByCategory(category: ReportCategory): ReportTemplate[] {
    return Array.from(this.reports.values()).filter(report => report.category === category);
  }

  addCustomReport(report: ReportTemplate): void {
    this.reports.set(report.id, report);
  }

  removeReport(id: string): boolean {
    return this.reports.delete(id);
  }

  async generateReport(
    templateId: string,
    format: ReportFormat,
    parameters: Record<string, any> = {},
    tenantId?: string
  ): Promise<ReportResult> {
    const template = this.reports.get(templateId);
    if (!template) {
      throw new Error(`Report template not found: ${templateId}`);
    }

    const startTime = Date.now();
    const reportId = `${templateId}-${Date.now()}`;
    
    try {
      // Execute queries and collect data
      const reportData = await this.executeReportQueries(template, parameters, tenantId);
      
      // Apply post-processing
      const processedData = await this.applyPostProcessing(template, reportData, parameters);
      
      // Generate the report file
      const filePath = await this.generateReportFile(template, format, processedData, parameters, reportId);
      
      const executionTime = Date.now() - startTime;
      
      const result: ReportResult = {
        id: reportId,
        templateId,
        name: template.name,
        format,
        generatedAt: new Date(),
        parameters,
        filePath,
        data: processedData,
        metadata: {
          recordCount: this.countRecords(processedData),
          executionTime,
          tenant: tenantId,
          size: 0 // Will be calculated after file creation
        }
      };

      this.reportHistory.push(result);
      return result;
      
    } catch (error) {
      console.error(`Error generating report ${templateId}:`, error);
      throw error;
    }
  }

  private async executeReportQueries(
    template: ReportTemplate,
    parameters: Record<string, any>,
    tenantId?: string
  ): Promise<any> {
    const results: Record<string, any> = {};
    
    for (const query of template.queries) {
      try {
        // In a real implementation, this would use the enhanced MCP server
        // to execute the actual Graph API queries
        console.log(`Executing query: ${query.name} on endpoint: ${query.endpoint}`);
        
        // Placeholder for actual query execution
        results[query.id] = {
          query: query.name,
          endpoint: query.endpoint,
          data: [], // Would contain actual query results
          timestamp: new Date().toISOString()
        };
        
      } catch (error) {
        console.error(`Error executing query ${query.id}:`, error);
        results[query.id] = {
          query: query.name,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return results;
  }

  private async applyPostProcessing(
    template: ReportTemplate,
    data: any,
    parameters: Record<string, any>
  ): Promise<any> {
    if (!template.postProcessing) {
      return data;
    }

    let processedData = { ...data };

    for (const processor of template.postProcessing) {
      switch (processor) {
        case 'security-score-calculation':
          processedData.securityScore = this.calculateSecurityScore(processedData);
          break;
        case 'compliance-rating':
          processedData.complianceRating = this.calculateComplianceRating(processedData);
          break;
        case 'license-optimization-analysis':
          processedData.optimization = this.analyzeLicenseOptimization(processedData);
          break;
        case 'cost-calculation':
          processedData.costs = this.calculateCosts(processedData);
          break;
        case 'activity-analysis':
          processedData.activitySummary = this.analyzeActivity(processedData);
          break;
        case 'health-score-calculation':
          processedData.healthScore = this.calculateHealthScore(processedData);
          break;
        case 'billing-calculation':
          processedData.billing = this.calculateBilling(processedData, parameters);
          break;
        case 'risk-analysis':
          processedData.riskAssessment = this.analyzeRisk(processedData);
          break;
        default:
          console.warn(`Unknown post-processor: ${processor}`);
      }
    }

    return processedData;
  }

  private async generateReportFile(
    template: ReportTemplate,
    format: ReportFormat,
    data: any,
    parameters: Record<string, any>,
    reportId: string
  ): Promise<string> {
    const reportsDir = join(app.getPath('documents'), 'EntraPulseLite', 'Reports');
    await mkdir(reportsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${template.name.replace(/\s+/g, '-')}-${timestamp}.${format}`;
    const filePath = join(reportsDir, fileName);

    switch (format) {
      case ReportFormat.JSON:
        await writeFile(filePath, JSON.stringify(data, null, 2));
        break;
      case ReportFormat.CSV:
        const csvContent = this.convertToCSV(data);
        await writeFile(filePath, csvContent);
        break;
      case ReportFormat.HTML:
        const htmlContent = this.convertToHTML(template, data, parameters);
        await writeFile(filePath, htmlContent);
        break;
      case ReportFormat.PDF:
        // In a real implementation, this would use a PDF generation library
        const pdfPlaceholder = `PDF Report: ${template.name}\nGenerated: ${new Date().toISOString()}\n\nData: ${JSON.stringify(data, null, 2)}`;
        await writeFile(filePath, pdfPlaceholder);
        break;
      case ReportFormat.EXCEL:
        // In a real implementation, this would use an Excel library like ExcelJS
        const excelPlaceholder = `Excel Report: ${template.name}\nGenerated: ${new Date().toISOString()}\n\nData: ${JSON.stringify(data, null, 2)}`;
        await writeFile(filePath, excelPlaceholder);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return filePath;
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in a real implementation, this would be more sophisticated
    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      
      const headers = Object.keys(data[0]);
      const csvHeaders = headers.join(',');
      const csvRows = data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      );
      
      return [csvHeaders, ...csvRows].join('\n');
    }
    
    return JSON.stringify(data);
  }

  private convertToHTML(template: ReportTemplate, data: any, parameters: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${template.name}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #007acc; padding-bottom: 10px; margin-bottom: 20px; }
        .section { margin: 20px 0; }
        .data-table { border-collapse: collapse; width: 100%; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .data-table th { background-color: #f2f2f2; }
        .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${template.name}</h1>
        <p><strong>Generated:</strong> ${timestamp}</p>
        <p><strong>Description:</strong> ${template.description}</p>
    </div>
    
    <div class="section">
        <h2>Report Parameters</h2>
        <ul>
            ${Object.entries(parameters).map(([key, value]) => 
              `<li><strong>${key}:</strong> ${value}</li>`
            ).join('')}
        </ul>
    </div>
    
    <div class="section">
        <h2>Report Data</h2>
        <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
</body>
</html>`;
  }

  private countRecords(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).length;
    }
    return 1;
  }

  // Post-processing helper methods
  private calculateSecurityScore(data: any): number {
    // Placeholder security score calculation
    return Math.floor(Math.random() * 100);
  }

  private calculateComplianceRating(data: any): string {
    const score = this.calculateSecurityScore(data);
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Improvement';
  }

  private analyzeLicenseOptimization(data: any): any {
    return {
      unusedLicenses: 0,
      overProvisionedUsers: 0,
      costOptimizationOpportunities: [],
      recommendations: []
    };
  }

  private calculateCosts(data: any): any {
    return {
      totalMonthlyCost: 0,
      costPerUser: 0,
      breakdown: {},
      trends: []
    };
  }

  private analyzeActivity(data: any): any {
    return {
      activeUsers: 0,
      inactiveUsers: 0,
      averageSignIns: 0,
      topApplications: []
    };
  }

  private calculateHealthScore(data: any): number {
    return Math.floor(Math.random() * 100);
  }

  private calculateBilling(data: any, parameters: Record<string, any>): any {
    return {
      billingPeriod: parameters.billingPeriod || 'current',
      totalAmount: 0,
      tenantBreakdown: {},
      usageMetrics: {}
    };
  }

  private analyzeRisk(data: any): any {
    return {
      riskLevel: 'Low',
      riskFactors: [],
      recommendations: [],
      anomalies: []
    };
  }

  getReportHistory(): ReportResult[] {
    return this.reportHistory.slice().sort((a, b) => 
      b.generatedAt.getTime() - a.generatedAt.getTime()
    );
  }

  getReportResult(id: string): ReportResult | undefined {
    return this.reportHistory.find(report => report.id === id);
  }

  deleteReport(id: string): boolean {
    const index = this.reportHistory.findIndex(report => report.id === id);
    if (index !== -1) {
      this.reportHistory.splice(index, 1);
      return true;
    }
    return false;
  }

  searchReports(searchTerm: string): ReportTemplate[] {
    const term = searchTerm.toLowerCase();
    return Array.from(this.reports.values()).filter(report =>
      report.name.toLowerCase().includes(term) ||
      report.description.toLowerCase().includes(term) ||
      report.category.toLowerCase().includes(term)
    );
  }

  downloadReport(reportId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const report = this.getReportResult(reportId);
      if (!report) {
        return Promise.resolve({ success: false, error: 'Report not found' });
      }

      // Create downloadable data
      const downloadData = {
        id: report.id,
        templateId: report.templateId,
        name: report.name,
        parameters: report.parameters,
        data: report.data,
        generatedAt: report.generatedAt,
        format: report.format,
        metadata: report.metadata
      };

      return Promise.resolve({ success: true, data: downloadData });
    } catch (error) {
      return Promise.resolve({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}