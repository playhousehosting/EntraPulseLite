/**
 * Type definitions for static assets
 */

// React JSX namespace for react-markdown compatibility
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [tagName: string]: any;
    }
  }
}

// Image file declarations
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

// Global electron window interface
interface Window {
  electron: {
    getAssetPath: (assetName: string) => string;
    openExternal: (url: string) => Promise<boolean>;
  };
  electronAPI: {
    auth: {
      login: (useRedirectFlow?: boolean) => Promise<any>;
      logout: () => Promise<void>;
      getToken: () => Promise<any>;
      getCurrentUser: () => Promise<any>;      requestPermissions: (permissions: string[]) => Promise<any>;
      getTokenWithPermissions: (permissions: string[]) => Promise<any>;
      clearTokenCache: () => Promise<{ success: boolean }>;
      forceReauthentication: () => Promise<any>;
      getAuthenticationInfo: () => Promise<{
        mode: 'client-credentials' | 'interactive';
        permissions: string[];
        actualPermissions?: string[];
        isAuthenticated: boolean;
        clientId: string;
        tenantId: string;
      }>;
    };    graph: {
      query: (endpoint: string, method?: string, data?: any) => Promise<any>;
      getUserPhoto: (userId?: string) => Promise<any>;
      clearPhotoCache: () => Promise<{ success: boolean; error?: string }>;
      clearUserPhotoCache: (userId: string) => Promise<{ success: boolean; error?: string }>;
      getPhotoCacheStats: () => Promise<{ size: number; maxSize: number; entries: Array<{ userId: string; hasPhoto: boolean; age: number }> } | null>;
    };
    llm: {
      chat: (messages: any[], sessionId?: string) => Promise<any>;
      isAvailable: () => Promise<boolean>;
      testConnection: (config: any) => Promise<any>;
      getAvailableModels: (config: any) => Promise<string[]>;
      testProviderConnection: (provider: string, config: any) => Promise<any>;
      getProviderModels: (provider: string, config: any) => Promise<string[]>;
    };
    mcp: {
      call: (server: string, toolName: string, arguments_: any) => Promise<any>;
      listServers: () => Promise<string[]>;
      listTools: (server: string) => Promise<any[]>;
    };
    config: {
      get: () => Promise<any>;
      update: (config: any) => Promise<any>;
      getLLMConfig: () => Promise<any>;
      saveLLMConfig: (config: any) => Promise<any>;
      clearModelCache: (provider?: string) => Promise<{ success: boolean }>;
      getCachedModels: (provider: string) => Promise<string[]>;
    };
    debug: {
      checkMCPServerHealth: () => Promise<any>;
      debugMCP: () => Promise<any>;
    };
    app: {
      getVersion: () => Promise<string>;
    };
    updater: {
      checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => Promise<{ success: boolean; error?: string }>;
      getCurrentVersion: () => Promise<string>;
      isUpdatePending: () => Promise<boolean>;
      setAutoUpdateEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      getAutoUpdateEnabled: () => Promise<boolean>;
    };
    msp: {
      getTenantContext: () => Promise<{ success: boolean; data?: any; error?: string }>;
      getDashboardMetrics: () => Promise<{ success: boolean; data?: any; error?: string }>;
      switchTenant: (tenantId: string) => Promise<{ success: boolean; error?: string }>;
      addTenant: (tenantData: any) => Promise<{ success: boolean; error?: string }>;
      removeTenant: (tenantId: string) => Promise<{ success: boolean; error?: string }>;
      updateTenant: (tenantId: string, tenantData: any) => Promise<{ success: boolean; error?: string }>;
      getTenants: () => Promise<{ success: boolean; data?: any[]; error?: string }>;
      getTenant: (tenantId: string) => Promise<{ success: boolean; data?: any; error?: string }>;
      refreshTenantData: (tenantId: string) => Promise<{ success: boolean; error?: string }>;
    };
    adminTemplates: {
      getTemplates: () => Promise<any>;
      getTemplate: (templateId: string) => Promise<any>;
      executeTemplate: (templateId: string, parameters: any) => Promise<any>;
      createTemplate: (templateData: any) => Promise<any>;
      updateTemplate: (templateId: string, templateData: any) => Promise<any>;
      deleteTemplate: (templateId: string) => Promise<any>;
      getTemplateHistory: (templateId: string) => Promise<any>;
      exportTemplate: (templateId: string) => Promise<any>;
      importTemplate: (templateData: any) => Promise<any>;
    };
    reporting: {
      generateReport: (type: string, options: any) => Promise<any>;
      getReports: () => Promise<any>;
      getReport: (reportId: string) => Promise<any>;
      deleteReport: (reportId: string) => Promise<any>;
      exportReport: (reportId: string, format: string) => Promise<any>;
      scheduleReport: (reportData: any) => Promise<any>;
      getScheduledReports: () => Promise<any>;
      updateScheduledReport: (reportId: string, reportData: any) => Promise<any>;
      deleteScheduledReport: (reportId: string) => Promise<any>;
      getReportTemplates: () => Promise<any>;
      getReportHistory: () => Promise<any>;
      downloadReport: (reportId: string) => Promise<any>;
    };
    rbac: {
      getRoles: () => Promise<any>;
      getRole: (roleId: string) => Promise<any>;
      createRole: (roleData: any) => Promise<any>;
      updateRole: (roleId: string, roleData: any) => Promise<any>;
      deleteRole: (roleId: string) => Promise<any>;
      getRoleAssignments: () => Promise<any>;
      getUserRoles: (userId: string, tenantId?: string) => Promise<any>;
      assignRole: (userId: string, role: string, assignedBy: string, tenantId?: string, expiresAt?: Date) => Promise<any>;
      revokeRole: (userId: string, role: string, tenantId?: string) => Promise<any>;
      hasPermission: (userId: string, permission: string, tenantId?: string) => Promise<any>;
      getUserEffectivePermissions: (userId: string, tenantId?: string) => Promise<any>;
      getAccessContext: (userId: string, tenantId?: string) => Promise<any>;
      bulkAssignRole: (userIds: string[], role: string, assignedBy: string, tenantId?: string) => Promise<any>;
      bulkRevokeRole: (userIds: string[], role: string, tenantId?: string) => Promise<any>;
      getPermissionMatrix: () => Promise<any>;
      exportConfiguration: () => Promise<any>;
      importConfiguration: () => Promise<any>;
      getUsers: () => Promise<any>;
      getTenants: () => Promise<any>;
    };
    billing: {
      getPlans: () => Promise<any>;
      getPlan: (planId: string) => Promise<any>;
      createPlan: (planData: any) => Promise<any>;
      updatePlan: (planId: string, planData: any) => Promise<any>;
      deletePlan: (planId: string) => Promise<any>;
      getTenantBilling: (tenantId?: string) => Promise<any>;
      createTenantBilling: (billingData: any) => Promise<any>;
      updateTenantBilling: (tenantId: string, billingData: any) => Promise<any>;
      recordUsage: (tenantId: string, metric: string, quantity: number, timestamp?: Date) => Promise<any>;
      getCurrentUsage: (tenantId: string, metric?: string) => Promise<any>;
      getUsageHistory: (tenantId: string, metric?: string, fromDate?: Date, toDate?: Date) => Promise<any>;
      getInvoices: (tenantId?: string) => Promise<any>;
      getInvoice: (invoiceId: string) => Promise<any>;
      generateInvoice: (tenantId: string, billingPeriod?: any) => Promise<any>;
      updateInvoiceStatus: (invoiceId: string, status: string) => Promise<any>;
      getAlerts: (tenantId?: string) => Promise<any>;
      createAlert: (alertData: any) => Promise<any>;
      acknowledgeAlert: (alertId: string) => Promise<any>;
      deleteAlert: (alertId: string) => Promise<any>;
      generateReport: (tenantId?: string, reportType?: string, fromDate?: Date, toDate?: Date) => Promise<any>;
      exportData: (tenantId: string, dataType: string, format: string) => Promise<any>;
      getBillingConfiguration: () => Promise<any>;
      updateBillingConfiguration: (config: any) => Promise<any>;
      testBillingService: () => Promise<any>;
      resetBillingData: (tenantId: string) => Promise<any>;
      getUsageData: () => Promise<any>;
      getSummary: () => Promise<any>;
    };
    compliance: {
      getEnabledFrameworks: () => Promise<any>;
      enableFramework: (framework: string) => Promise<any>;
      disableFramework: (framework: string) => Promise<any>;
      getControls: (framework?: string) => Promise<any>;
      getControl: (controlId: string) => Promise<any>;
      updateControlStatus: (controlId: string, status: string) => Promise<any>;
      getAssessments: (framework?: string) => Promise<any>;
      getAssessment: (assessmentId: string) => Promise<any>;
      createAssessment: (assessmentData: any) => Promise<any>;
      updateAssessment: (assessmentId: string, assessmentData: any) => Promise<any>;
      deleteAssessment: (assessmentId: string) => Promise<any>;
      addEvidence: (controlId: string, evidenceData: any) => Promise<any>;
      getEvidenceByControl: (controlId: string) => Promise<any>;
      deleteEvidence: (evidenceId: string) => Promise<any>;
      getRemediationActions: (status?: string) => Promise<any>;
      createRemediationAction: (remediationData: any) => Promise<any>;
      updateRemediationAction: (remediationId: string, remediationData: any) => Promise<any>;
      deleteRemediationAction: (remediationId: string) => Promise<any>;
      getFindings: (status?: string) => Promise<any>;
      createFinding: (findingData: any) => Promise<any>;
      updateFinding: (findingId: string, findingData: any) => Promise<any>;
      deleteFinding: (findingId: string) => Promise<any>;
      generateReport: (reportType: string, framework?: string) => Promise<any>;
      getReports: () => Promise<any>;
      deleteReport: (reportId: string) => Promise<any>;
      getAlerts: (severity?: string) => Promise<any>;
      createAlert: (alertData: any) => Promise<any>;
      acknowledgeAlert: (alertId: string) => Promise<any>;
      deleteAlert: (alertId: string) => Promise<any>;
      getMetrics: (framework?: string) => Promise<any>;
      getConfiguration: () => Promise<any>;
      updateConfiguration: (config: any) => Promise<any>;
    };
    automation: {
      getTasks: () => Promise<any>;
      getTask: (taskId: string) => Promise<any>;
      createTask: (taskData: any) => Promise<any>;
      updateTask: (taskId: string, taskData: any) => Promise<any>;
      deleteTask: (taskId: string) => Promise<any>;
      executeTask: (taskId: string, context?: any) => Promise<any>;
      updateTaskStatus: (taskId: string, status: string) => Promise<any>;
      getWorkflows: () => Promise<any>;
      getWorkflow: (workflowId: string) => Promise<any>;
      createWorkflow: (workflowData: any) => Promise<any>;
      updateWorkflow: (workflowId: string, workflowData: any) => Promise<any>;
      deleteWorkflow: (workflowId: string) => Promise<any>;
      executeWorkflow: (workflowId: string, context?: any) => Promise<any>;
      getExecutionHistory: (taskId: string) => Promise<any>;
      getRecentExecutions: () => Promise<any>;
      getMetrics: () => Promise<any>;
      getScheduledJobs: () => Promise<any>;
      scheduleTask: (taskId: string, schedule: any) => Promise<any>;
      unscheduleTask: (taskId: string) => Promise<any>;
      pauseTask: (taskId: string) => Promise<any>;
      resumeTask: (taskId: string) => Promise<any>;
      getSystemStatus: () => Promise<any>;
      restartService: () => Promise<any>;
      stopService: () => Promise<any>;
      startService: () => Promise<any>;
    };
    analytics: {
      // Data Ingestion
      ingestMetricData: (metricName: string, dataPoints: any[], category: string) => Promise<any>;
      ingestBulkData: (metricsData: any[]) => Promise<any>;
      
      // Predictive Analytics
      generatePredictions: (metricName?: string, timeframes?: string[]) => Promise<any>;
      getPredictions: (metricName?: string) => Promise<any>;
      
      // Trend Analysis
      analyzeTrends: (metricName?: string) => Promise<any>;
      getTrends: (category?: string) => Promise<any>;
      
      // Optimization Recommendations
      generateOptimizations: () => Promise<any>;
      getRecommendations: (category?: string) => Promise<any>;
      implementRecommendation: (recommendationId: string) => Promise<any>;
      
      // Risk Analysis
      analyzeRisks: () => Promise<any>;
      getRisks: (category?: string) => Promise<any>;
      
      // Capacity Forecasting
      generateCapacityForecasts: () => Promise<any>;
      getCapacityForecasts: () => Promise<any>;
      
      // Security Analytics
      calculateSecurityScore: () => Promise<any>;
      getSecurityScore: () => Promise<any>;
      
      // Data Retrieval
      getMetrics: () => Promise<any>;
      getSummary: () => Promise<any>;
    };
    on: (channel: string, callback: (...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
}
