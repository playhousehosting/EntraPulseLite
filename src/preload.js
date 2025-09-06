// Preload script for EntraPulse Lite - Electron security bridge
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Asset handling
  getAssetPath: (assetName) => {
    return ipcRenderer.invoke('app:getAssetPath', assetName);
  },
  // Open external links
  openExternal: (url) => {
    return ipcRenderer.invoke('shell:openExternal', url);
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication methods
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    getIdTokenClaims: () => ipcRenderer.invoke('auth:getIdTokenClaims'),
    requestPermissions: (permissions) => ipcRenderer.invoke('auth:requestPermissions', permissions),
    getTokenWithPermissions: (permissions) => ipcRenderer.invoke('auth:getTokenWithPermissions', permissions),
    getAuthenticationInfo: () => ipcRenderer.invoke('auth:getAuthenticationInfo'),
    getTokenPermissions: () => ipcRenderer.invoke('auth:getTokenPermissions'),
    getCurrentGraphPermissions: () => ipcRenderer.invoke('auth:getCurrentGraphPermissions'),
    getTenantInfo: () => ipcRenderer.invoke('auth:getTenantInfo'),
    clearTokenCache: () => ipcRenderer.invoke('auth:clearTokenCache'),
    forceReauthentication: () => ipcRenderer.invoke('auth:forceReauthentication'),
    testConfiguration: (config) => ipcRenderer.invoke('auth:testConfiguration', config),
  },

  // Microsoft Graph methods
  graph: {
    query: (endpoint, method, data) => ipcRenderer.invoke('graph:query', endpoint, method, data),
    getUserPhoto: (userId) => ipcRenderer.invoke('graph:getUserPhoto', userId),
    clearPhotoCache: () => ipcRenderer.invoke('graph:clearPhotoCache'),
    clearUserPhotoCache: (userId) => ipcRenderer.invoke('graph:clearUserPhotoCache', userId),
    getPhotoCacheStats: () => ipcRenderer.invoke('graph:getPhotoCacheStats'),
  },

  // Local LLM methods
  llm: {
    chat: (messages, sessionId) => ipcRenderer.invoke('llm:chat', messages, sessionId),
    isAvailable: () => ipcRenderer.invoke('llm:isAvailable'),
    isLocalAvailable: () => ipcRenderer.invoke('llm:isLocalAvailable'),
    testConnection: (config) => ipcRenderer.invoke('llm:testConnection', config),
    getAvailableModels: (config) => ipcRenderer.invoke('llm:getAvailableModels', config),
    testProviderConnection: (provider, config) => ipcRenderer.invoke('llm:testProviderConnection', provider, config),
    getProviderModels: (provider, config) => ipcRenderer.invoke('llm:getProviderModels', provider, config),
  },

  // MCP methods
  mcp: {
    call: (server, toolName, arguments_) => ipcRenderer.invoke('mcp:call', server, toolName, arguments_),
    listServers: () => ipcRenderer.invoke('mcp:listServers'),
    listTools: (server) => ipcRenderer.invoke('mcp:listTools', server),
    restartLokkaMCPServer: () => ipcRenderer.invoke('mcp:restartLokkaMCPServer'),
  },

  // MSP Tenant Management methods
  msp: {
    getTenantContext: () => ipcRenderer.invoke('msp:getTenantContext'),
    getAvailableTenants: () => ipcRenderer.invoke('msp:getAvailableTenants'),
    switchTenant: (tenantId) => ipcRenderer.invoke('msp:switchTenant', tenantId),
    addTenant: (tenantData) => ipcRenderer.invoke('msp:addTenant', tenantData),
    removeTenant: (tenantId) => ipcRenderer.invoke('msp:removeTenant', tenantId),
    getDashboardMetrics: () => ipcRenderer.invoke('msp:getDashboardMetrics'),
    refreshTenantHealth: () => ipcRenderer.invoke('msp:refreshTenantHealth'),
    updateTenant: (tenantId, updates) => ipcRenderer.invoke('msp:updateTenant', tenantId, updates),
    enableMSPMode: () => ipcRenderer.invoke('msp:enableMSPMode'),
    disableMSPMode: () => ipcRenderer.invoke('msp:disableMSPMode'),
    isMSPModeEnabled: () => ipcRenderer.invoke('msp:isMSPModeEnabled'),
  },

  // Admin Template Management methods
  adminTemplates: {
    getTemplates: () => ipcRenderer.invoke('adminTemplates:getTemplates'),
    getTemplate: (templateId) => ipcRenderer.invoke('adminTemplates:getTemplate', templateId),
    getTemplatesByCategory: (category) => ipcRenderer.invoke('adminTemplates:getTemplatesByCategory', category),
    searchTemplates: (searchTerm) => ipcRenderer.invoke('adminTemplates:searchTemplates', searchTerm),
    executeTemplate: (templateId, parameters) => ipcRenderer.invoke('adminTemplates:executeTemplate', templateId, parameters),
    addCustomTemplate: (template) => ipcRenderer.invoke('adminTemplates:addCustomTemplate', template),
    removeTemplate: (templateId) => ipcRenderer.invoke('adminTemplates:removeTemplate', templateId),
    getExecutionHistory: () => ipcRenderer.invoke('adminTemplates:getExecutionHistory'),
    exportTemplate: (templateId, format) => ipcRenderer.invoke('adminTemplates:exportTemplate', templateId, format),
    scheduleTemplate: (templateId, schedule) => ipcRenderer.invoke('adminTemplates:scheduleTemplate', templateId, schedule),
    getScheduledTemplates: () => ipcRenderer.invoke('adminTemplates:getScheduledTemplates'),
  },

  // Reporting methods
  reporting: {
    getReportTemplates: () => ipcRenderer.invoke('reporting:getReportTemplates'),
    getReportTemplate: (templateId) => ipcRenderer.invoke('reporting:getReportTemplate', templateId),
    getReportsByCategory: (category) => ipcRenderer.invoke('reporting:getReportsByCategory', category),
    searchReports: (searchTerm) => ipcRenderer.invoke('reporting:searchReports', searchTerm),
    generateReport: (templateId, format, parameters, tenantId) => ipcRenderer.invoke('reporting:generateReport', templateId, format, parameters, tenantId),
    getReportHistory: () => ipcRenderer.invoke('reporting:getReportHistory'),
    getReportResult: (reportId) => ipcRenderer.invoke('reporting:getReportResult', reportId),
    deleteReport: (reportId) => ipcRenderer.invoke('reporting:deleteReport', reportId),
    downloadReport: (reportId) => ipcRenderer.invoke('reporting:downloadReport', reportId),
    addCustomReport: (report) => ipcRenderer.invoke('reporting:addCustomReport', report),
    removeReport: (reportId) => ipcRenderer.invoke('reporting:removeReport', reportId),
    scheduleReport: (templateId, schedule) => ipcRenderer.invoke('reporting:scheduleReport', templateId, schedule),
    getScheduledReports: () => ipcRenderer.invoke('reporting:getScheduledReports'),
  },

  // RBAC Management methods
  rbac: {
    getRoles: () => ipcRenderer.invoke('rbac:getRoles'),
    getRole: (roleId) => ipcRenderer.invoke('rbac:getRole', roleId),
    createRole: (roleData) => ipcRenderer.invoke('rbac:createRole', roleData),
    updateRole: (roleId, roleData) => ipcRenderer.invoke('rbac:updateRole', roleId, roleData),
    deleteRole: (roleId) => ipcRenderer.invoke('rbac:deleteRole', roleId),
    getRoleAssignments: () => ipcRenderer.invoke('rbac:getRoleAssignments'),
    getUserRoles: (userId, tenantId) => ipcRenderer.invoke('rbac:getUserRoles', userId, tenantId),
    assignRole: (userId, role, assignedBy, tenantId, expiresAt) => ipcRenderer.invoke('rbac:assignRole', userId, role, assignedBy, tenantId, expiresAt),
    revokeRole: (userId, role, tenantId) => ipcRenderer.invoke('rbac:revokeRole', userId, role, tenantId),
    hasPermission: (userId, permission, tenantId) => ipcRenderer.invoke('rbac:hasPermission', userId, permission, tenantId),
    getUserEffectivePermissions: (userId, tenantId) => ipcRenderer.invoke('rbac:getUserEffectivePermissions', userId, tenantId),
    getAccessContext: (userId, tenantId) => ipcRenderer.invoke('rbac:getAccessContext', userId, tenantId),
    bulkAssignRole: (userIds, role, assignedBy, tenantId) => ipcRenderer.invoke('rbac:bulkAssignRole', userIds, role, assignedBy, tenantId),
    bulkRevokeRole: (userIds, role, tenantId) => ipcRenderer.invoke('rbac:bulkRevokeRole', userIds, role, tenantId),
    getPermissionMatrix: () => ipcRenderer.invoke('rbac:getPermissionMatrix'),
    exportConfiguration: () => ipcRenderer.invoke('rbac:exportConfiguration'),
    importConfiguration: () => ipcRenderer.invoke('rbac:importConfiguration'),
    getUsers: () => ipcRenderer.invoke('rbac:getUsers'),
    getTenants: () => ipcRenderer.invoke('rbac:getTenants'),
  },

  // Billing methods
  billing: {
    getPlans: () => ipcRenderer.invoke('billing:getPlans'),
    getPlan: (planId) => ipcRenderer.invoke('billing:getPlan', planId),
    createPlan: (planData) => ipcRenderer.invoke('billing:createPlan', planData),
    updatePlan: (planId, planData) => ipcRenderer.invoke('billing:updatePlan', planId, planData),
    deletePlan: (planId) => ipcRenderer.invoke('billing:deletePlan', planId),
    getTenantBilling: (tenantId) => ipcRenderer.invoke('billing:getTenantBilling', tenantId),
    createTenantBilling: (billingData) => ipcRenderer.invoke('billing:createTenantBilling', billingData),
    updateTenantBilling: (tenantId, billingData) => ipcRenderer.invoke('billing:updateTenantBilling', tenantId, billingData),
    recordUsage: (tenantId, metric, quantity, timestamp) => ipcRenderer.invoke('billing:recordUsage', tenantId, metric, quantity, timestamp),
    getCurrentUsage: (tenantId, metric) => ipcRenderer.invoke('billing:getCurrentUsage', tenantId, metric),
    getUsageHistory: (tenantId, metric, fromDate, toDate) => ipcRenderer.invoke('billing:getUsageHistory', tenantId, metric, fromDate, toDate),
    getInvoices: (tenantId) => ipcRenderer.invoke('billing:getInvoices', tenantId),
    getInvoice: (invoiceId) => ipcRenderer.invoke('billing:getInvoice', invoiceId),
    generateInvoice: (tenantId, billingPeriod) => ipcRenderer.invoke('billing:generateInvoice', tenantId, billingPeriod),
    updateInvoiceStatus: (invoiceId, status) => ipcRenderer.invoke('billing:updateInvoiceStatus', invoiceId, status),
    getAlerts: (tenantId) => ipcRenderer.invoke('billing:getAlerts', tenantId),
    createAlert: (alertData) => ipcRenderer.invoke('billing:createAlert', alertData),
    acknowledgeAlert: (alertId) => ipcRenderer.invoke('billing:acknowledgeAlert', alertId),
    deleteAlert: (alertId) => ipcRenderer.invoke('billing:deleteAlert', alertId),
    generateReport: (tenantId, reportType, fromDate, toDate) => ipcRenderer.invoke('billing:generateReport', tenantId, reportType, fromDate, toDate),
    exportData: (tenantId, dataType, format) => ipcRenderer.invoke('billing:exportData', tenantId, dataType, format),
    getBillingConfiguration: () => ipcRenderer.invoke('billing:getBillingConfiguration'),
    updateBillingConfiguration: (config) => ipcRenderer.invoke('billing:updateBillingConfiguration', config),
    testBillingService: () => ipcRenderer.invoke('billing:testBillingService'),
    resetBillingData: (tenantId) => ipcRenderer.invoke('billing:resetBillingData', tenantId),
    getUsageData: () => ipcRenderer.invoke('billing:getUsageData'),
    getSummary: () => ipcRenderer.invoke('billing:getSummary'),
  },

  // Compliance methods
  compliance: {
    getEnabledFrameworks: () => ipcRenderer.invoke('compliance:getEnabledFrameworks'),
    enableFramework: (framework) => ipcRenderer.invoke('compliance:enableFramework', framework),
    disableFramework: (framework) => ipcRenderer.invoke('compliance:disableFramework', framework),
    getControls: (framework) => ipcRenderer.invoke('compliance:getControls', framework),
    getControl: (controlId) => ipcRenderer.invoke('compliance:getControl', controlId),
    updateControlStatus: (controlId, status) => ipcRenderer.invoke('compliance:updateControlStatus', controlId, status),
    getAssessments: (framework) => ipcRenderer.invoke('compliance:getAssessments', framework),
    getAssessment: (assessmentId) => ipcRenderer.invoke('compliance:getAssessment', assessmentId),
    createAssessment: (assessmentData) => ipcRenderer.invoke('compliance:createAssessment', assessmentData),
    updateAssessment: (assessmentId, assessmentData) => ipcRenderer.invoke('compliance:updateAssessment', assessmentId, assessmentData),
    deleteAssessment: (assessmentId) => ipcRenderer.invoke('compliance:deleteAssessment', assessmentId),
    addEvidence: (controlId, evidenceData) => ipcRenderer.invoke('compliance:addEvidence', controlId, evidenceData),
    getEvidenceByControl: (controlId) => ipcRenderer.invoke('compliance:getEvidenceByControl', controlId),
    deleteEvidence: (evidenceId) => ipcRenderer.invoke('compliance:deleteEvidence', evidenceId),
    getRemediationActions: (status) => ipcRenderer.invoke('compliance:getRemediationActions', status),
    createRemediationAction: (remediationData) => ipcRenderer.invoke('compliance:createRemediationAction', remediationData),
    updateRemediationAction: (remediationId, remediationData) => ipcRenderer.invoke('compliance:updateRemediationAction', remediationId, remediationData),
    deleteRemediationAction: (remediationId) => ipcRenderer.invoke('compliance:deleteRemediationAction', remediationId),
    getFindings: (status) => ipcRenderer.invoke('compliance:getFindings', status),
    createFinding: (findingData) => ipcRenderer.invoke('compliance:createFinding', findingData),
    updateFinding: (findingId, findingData) => ipcRenderer.invoke('compliance:updateFinding', findingId, findingData),
    deleteFinding: (findingId) => ipcRenderer.invoke('compliance:deleteFinding', findingId),
    generateReport: (reportType, framework) => ipcRenderer.invoke('compliance:generateReport', reportType, framework),
    getReports: () => ipcRenderer.invoke('compliance:getReports'),
    deleteReport: (reportId) => ipcRenderer.invoke('compliance:deleteReport', reportId),
    getAlerts: (severity) => ipcRenderer.invoke('compliance:getAlerts', severity),
    createAlert: (alertData) => ipcRenderer.invoke('compliance:createAlert', alertData),
    acknowledgeAlert: (alertId) => ipcRenderer.invoke('compliance:acknowledgeAlert', alertId),
    deleteAlert: (alertId) => ipcRenderer.invoke('compliance:deleteAlert', alertId),
    getMetrics: (framework) => ipcRenderer.invoke('compliance:getMetrics', framework),
    getConfiguration: () => ipcRenderer.invoke('compliance:getConfiguration'),
    updateConfiguration: (config) => ipcRenderer.invoke('compliance:updateConfiguration', config),
  },

  // Automation Engine methods
  automation: {
    getTasks: () => ipcRenderer.invoke('automation:getTasks'),
    getTask: (taskId) => ipcRenderer.invoke('automation:getTask', taskId),
    createTask: (taskData) => ipcRenderer.invoke('automation:createTask', taskData),
    updateTask: (taskId, taskData) => ipcRenderer.invoke('automation:updateTask', taskId, taskData),
    deleteTask: (taskId) => ipcRenderer.invoke('automation:deleteTask', taskId),
    executeTask: (taskId, context) => ipcRenderer.invoke('automation:executeTask', taskId, context),
    updateTaskStatus: (taskId, status) => ipcRenderer.invoke('automation:updateTaskStatus', taskId, status),
    getWorkflows: () => ipcRenderer.invoke('automation:getWorkflows'),
    getWorkflow: (workflowId) => ipcRenderer.invoke('automation:getWorkflow', workflowId),
    createWorkflow: (workflowData) => ipcRenderer.invoke('automation:createWorkflow', workflowData),
    updateWorkflow: (workflowId, workflowData) => ipcRenderer.invoke('automation:updateWorkflow', workflowId, workflowData),
    deleteWorkflow: (workflowId) => ipcRenderer.invoke('automation:deleteWorkflow', workflowId),
    executeWorkflow: (workflowId, context) => ipcRenderer.invoke('automation:executeWorkflow', workflowId, context),
    getExecutionHistory: (taskId) => ipcRenderer.invoke('automation:getExecutionHistory', taskId),
    getRecentExecutions: () => ipcRenderer.invoke('automation:getRecentExecutions'),
    getMetrics: () => ipcRenderer.invoke('automation:getMetrics'),
    getScheduledJobs: () => ipcRenderer.invoke('automation:getScheduledJobs'),
    scheduleTask: (taskId, schedule) => ipcRenderer.invoke('automation:scheduleTask', taskId, schedule),
    unscheduleTask: (taskId) => ipcRenderer.invoke('automation:unscheduleTask', taskId),
    pauseTask: (taskId) => ipcRenderer.invoke('automation:pauseTask', taskId),
    resumeTask: (taskId) => ipcRenderer.invoke('automation:resumeTask', taskId),
    getSystemStatus: () => ipcRenderer.invoke('automation:getSystemStatus'),
    restartService: () => ipcRenderer.invoke('automation:restartService'),
    stopService: () => ipcRenderer.invoke('automation:stopService'),
    startService: () => ipcRenderer.invoke('automation:startService'),
  },

  // Analytics Engine methods
  analytics: {
    // Data Ingestion
    ingestMetricData: (metricName, dataPoints, category) => ipcRenderer.invoke('analytics:ingestMetricData', metricName, dataPoints, category),
    ingestBulkData: (metricsData) => ipcRenderer.invoke('analytics:ingestBulkData', metricsData),
    
    // Predictive Analytics
    generatePredictions: (metricName, timeframes) => ipcRenderer.invoke('analytics:generatePredictions', metricName, timeframes),
    getPredictions: (metricName) => ipcRenderer.invoke('analytics:getPredictions', metricName),
    
    // Trend Analysis
    analyzeTrends: (metricName) => ipcRenderer.invoke('analytics:analyzeTrends', metricName),
    getTrends: (category) => ipcRenderer.invoke('analytics:getTrends', category),
    
    // Optimization Recommendations
    generateOptimizations: () => ipcRenderer.invoke('analytics:generateOptimizations'),
    getRecommendations: (category) => ipcRenderer.invoke('analytics:getRecommendations', category),
    implementRecommendation: (recommendationId) => ipcRenderer.invoke('analytics:implementRecommendation', recommendationId),
    
    // Risk Analysis
    analyzeRisks: () => ipcRenderer.invoke('analytics:analyzeRisks'),
    getRisks: (category) => ipcRenderer.invoke('analytics:getRisks', category),
    
    // Capacity Forecasting
    generateCapacityForecasts: () => ipcRenderer.invoke('analytics:generateCapacityForecasts'),
    getCapacityForecasts: () => ipcRenderer.invoke('analytics:getCapacityForecasts'),
    
    // Security Analytics
    calculateSecurityScore: () => ipcRenderer.invoke('analytics:calculateSecurityScore'),
    getSecurityScore: () => ipcRenderer.invoke('analytics:getSecurityScore'),
    
    // Data Retrieval
    getMetrics: () => ipcRenderer.invoke('analytics:getMetrics'),
    getSummary: () => ipcRenderer.invoke('analytics:getSummary'),
  },

  // Configuration methods
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (config) => ipcRenderer.invoke('config:update', config),
    getLLMConfig: () => ipcRenderer.invoke('config:getLLMConfig'),
    saveLLMConfig: (config) => ipcRenderer.invoke('config:saveLLMConfig', config),
    clearModelCache: (provider) => ipcRenderer.invoke('config:clearModelCache', provider),
    getCachedModels: (provider) => ipcRenderer.invoke('config:getCachedModels', provider),
    saveCloudProviderConfig: (provider, config) => ipcRenderer.invoke('config:saveCloudProviderConfig', provider, config),
    getCloudProviderConfig: (provider) => ipcRenderer.invoke('config:getCloudProviderConfig', provider),
    getConfiguredCloudProviders: () => ipcRenderer.invoke('config:getConfiguredCloudProviders'),
    setDefaultCloudProvider: (provider) => ipcRenderer.invoke('config:setDefaultCloudProvider', provider),
    getDefaultCloudProvider: () => ipcRenderer.invoke('config:getDefaultCloudProvider'),
    removeCloudProviderConfig: (provider) => ipcRenderer.invoke('config:removeCloudProviderConfig', provider),
    getEntraConfig: () => ipcRenderer.invoke('config:getEntraConfig'),
    saveEntraConfig: (config) => ipcRenderer.invoke('config:saveEntraConfig', config),
    clearEntraConfig: () => ipcRenderer.invoke('config:clearEntraConfig'),
    // MCP Configuration methods
    getMCPConfig: () => ipcRenderer.invoke('config:getMCPConfig'),
    saveMCPConfig: (config) => ipcRenderer.invoke('config:saveMCPConfig', config),
    updateLokkaMCPConfig: (config) => ipcRenderer.invoke('config:updateLokkaMCPConfig', config),
    isLokkaMCPConfigured: () => ipcRenderer.invoke('config:isLokkaMCPConfigured'),
    // Custom MCP Server management
    getCustomMCPServers: () => ipcRenderer.invoke('config:getCustomMCPServers'),
    addCustomMCPServer: (server) => ipcRenderer.invoke('config:addCustomMCPServer', server),
    removeCustomMCPServer: (serverName) => ipcRenderer.invoke('config:removeCustomMCPServer', serverName),
    updateCustomMCPServer: (serverName, updates) => ipcRenderer.invoke('config:updateCustomMCPServer', serverName, updates),
    testMCPServerConnection: (server) => ipcRenderer.invoke('config:testMCPServerConnection', server),
    validateMCPServerConfig: (server) => ipcRenderer.invoke('config:validateMCPServerConfig', server),
  },

  // App methods
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },

  // Auto-updater methods
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('updater:downloadUpdate'),
    installUpdate: () => ipcRenderer.invoke('updater:installUpdate'),
    getCurrentVersion: () => ipcRenderer.invoke('updater:getCurrentVersion'),
    isUpdatePending: () => ipcRenderer.invoke('updater:isUpdatePending'),
    setAutoUpdateEnabled: (enabled) => ipcRenderer.invoke('updater:setAutoUpdateEnabled', enabled),
    getAutoUpdateEnabled: () => ipcRenderer.invoke('updater:getAutoUpdateEnabled'),
  },

  // Send events to main process for broadcasting
  send: (channel, data) => {
    const validChannels = ['auth:logoutBroadcast'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    } else {
      console.warn(`Invalid send channel: ${channel}`);
    }
  },

  // Event listeners for real-time updates with better memory management
  on: (channel, callback) => {
    const validChannels = [
      'auth-status-changed', 
      'chat-message', 
      'graph-api-call', 
      'config:defaultCloudProviderChanged', 
      'auth:configurationAvailable', 
      'auth:enhancedGraphAccessChanged',
      'auth:logout',
      'llm:forceStatusRefresh',
      'update:checking-for-update',
      'update:available',
      'update:not-available',
      'update:error',
      'update:download-progress',
      'update:downloaded',
      'main-debug' // Debug messages from main process
    ];
    if (validChannels.includes(channel)) {
      // Get current listener count BEFORE adding
      const beforeCount = ipcRenderer.listenerCount(channel);
      
      // Remove any existing listeners for this callback to prevent duplicates
      ipcRenderer.removeListener(channel, callback);
      
      // If we have too many listeners, do aggressive cleanup
      if (beforeCount > 25) {
        console.warn(`Too many listeners for ${channel} (${beforeCount}). Performing aggressive cleanup...`);
        // Remove all listeners and let components re-add as needed
        ipcRenderer.removeAllListeners(channel);
      }
      
      // Add the new listener
      ipcRenderer.on(channel, callback);
      
      const afterCount = ipcRenderer.listenerCount(channel);
      const currentMaxListeners = ipcRenderer.getMaxListeners();
      
      // Dynamically adjust max listeners based on current count
      if (afterCount >= currentMaxListeners - 2) {
        const newMaxListeners = Math.min(currentMaxListeners + 5, 50); // Cap at 50 listeners
        ipcRenderer.setMaxListeners(newMaxListeners);
        console.log(`Increased max listeners for channel ${channel} to ${newMaxListeners}. Current: ${afterCount}`);
      }
      
      console.log(`Added listener for ${channel}. Before: ${beforeCount}, After: ${afterCount}`);
    }
  },

  // Remove specific event listener
  removeListener: (channel, callback) => {
    const validChannels = [
      'auth-status-changed', 
      'chat-message', 
      'graph-api-call', 
      'config:defaultCloudProviderChanged', 
      'auth:configurationAvailable', 
      'auth:enhancedGraphAccessChanged',
      'llm:forceStatusRefresh',
      'update:checking-for-update',
      'update:available',
      'update:not-available',
      'update:error',
      'update:download-progress',
      'update:downloaded',
      'main-debug' // Debug messages from main process
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, callback);
    }
  },

  // Remove event listeners
  removeAllListeners: (channel) => {
    const validChannels = [
      'auth-status-changed', 
      'chat-message', 
      'graph-api-call', 
      'config:defaultCloudProviderChanged', 
      'auth:configurationAvailable', 
      'auth:enhancedGraphAccessChanged',
      'llm:forceStatusRefresh',
      'update:checking-for-update',
      'update:available',
      'update:not-available',
      'update:error',
      'update:download-progress',
      'update:downloaded',
      'main-debug' // Debug messages from main process
    ];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // Diagnostic method to check listener counts
  getListenerDiagnostics: () => {
    const validChannels = [
      'auth-status-changed', 
      'chat-message', 
      'graph-api-call', 
      'config:defaultCloudProviderChanged', 
      'auth:configurationAvailable', 
      'auth:enhancedGraphAccessChanged',
      'llm:forceStatusRefresh',
      'update:checking-for-update',
      'update:available',
      'update:not-available',
      'update:error',
      'update:download-progress',
      'update:downloaded',
      'main-debug' // Debug messages from main process
    ];
    const diagnostics = {};
    
    validChannels.forEach(channel => {
      diagnostics[channel] = {
        count: ipcRenderer.listenerCount(channel),
        maxListeners: ipcRenderer.getMaxListeners()
      };
    });
    
    return diagnostics;
  },

  // Force cleanup of listeners (aggressive cleanup)
  forceCleanupListeners: (channel) => {
    const validChannels = [
      'auth-status-changed', 
      'chat-message', 
      'graph-api-call', 
      'config:defaultCloudProviderChanged', 
      'auth:configurationAvailable', 
      'auth:enhancedGraphAccessChanged',
      'auth:logout',
      'llm:forceStatusRefresh',
      'main-debug' // Debug messages from main process
    ];
    if (validChannels.includes(channel)) {
      const beforeCount = ipcRenderer.listenerCount(channel);
      ipcRenderer.removeAllListeners(channel);
      const afterCount = ipcRenderer.listenerCount(channel);
      console.log(`Force cleaned ${channel}: ${beforeCount} -> ${afterCount} listeners`);
      return { before: beforeCount, after: afterCount };
    }
    return null;
  },
});
