// TypeScript definitions for electronAPI exposed via preload script

interface AuthAPI {
  login(useRedirectFlow?: boolean): Promise<any>;
  logout(): Promise<void>;
  getToken(): Promise<any>;
  getCurrentUser(): Promise<any>;
  getIdTokenClaims(): Promise<any | null>;
  requestPermissions(permissions: string[]): Promise<any>;
  getTokenWithPermissions(permissions: string[]): Promise<any>;
  getAuthenticationInfo(): Promise<any>;
  clearTokenCache(): Promise<void>;
  forceReauthentication(): Promise<any>;
  testConfiguration(config: any): Promise<{ success: boolean; error?: string; details?: any }>;
}

interface GraphAPI {
  query(endpoint: string, method: string, data?: any): Promise<any>;
  getUserPhoto(userId?: string): Promise<string | null>;
  clearPhotoCache(): Promise<{ success: boolean; error?: string }>;
  clearUserPhotoCache(userId: string): Promise<{ success: boolean; error?: string }>;
  getPhotoCacheStats(): Promise<{ size: number; maxSize: number; entries: Array<{ userId: string; hasPhoto: boolean; age: number }> } | null>;
}

interface LLMAPI {
  chat(messages: any[]): Promise<any>;
  isAvailable(): Promise<boolean>;
  testConnection(config: any): Promise<boolean>;
  getAvailableModels(config: any): Promise<string[]>;
  testProviderConnection(provider: string, config: any): Promise<boolean>;
  getProviderModels(provider: string, config: any): Promise<string[]>;
}

interface MCPAPI {
  call(server: string, toolName: string, arguments_: any): Promise<any>;
  listServers(): Promise<string[]>;
  listTools(server: string): Promise<any[]>;
}

interface MSPTenant {
  id: string;
  displayName: string;
  domain: string;
  isActive: boolean;
  lastAccessed: Date;
  subscriptionType: string;
  userCount: number;
  healthStatus: 'Healthy' | 'Warning' | 'Critical' | 'Unknown';
  partnerRelationship: {
    type: 'CSP' | 'DAP' | 'GDAP' | 'Direct';
    permissions: string[];
  };
  contactInfo: {
    primaryContact: string;
    email: string;
  };
  serviceLevel: 'Basic' | 'Standard' | 'Premium' | 'Enterprise';
  tags: string[];
}

interface MSPTenantContext {
  currentTenant: MSPTenant | null;
  availableTenants: MSPTenant[];
  isMultiTenant: boolean;
  switchingInProgress: boolean;
}

interface MSPDashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  healthyTenants: number;
  tenantsWithIssues: number;
  monthlyRevenue: number;
  topServices: Array<{
    service: string;
    usage: number;
    tenantCount: number;
  }>;
  recentAlerts: Array<{
    tenantId: string;
    tenantName: string;
    alertType: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    message: string;
    timestamp: Date;
  }>;
}

interface MSPAPI {
  getTenantContext(): Promise<{ success: boolean; data?: MSPTenantContext; error?: string }>;
  getAvailableTenants(): Promise<{ success: boolean; data?: MSPTenant[]; error?: string }>;
  switchTenant(tenantId: string): Promise<{ success: boolean; data?: { tenant: MSPTenant }; error?: string }>;
  addTenant(tenantData: Partial<MSPTenant>): Promise<{ success: boolean; data?: { tenant: MSPTenant }; error?: string }>;
  removeTenant(tenantId: string): Promise<{ success: boolean; error?: string }>;
  getDashboardMetrics(): Promise<{ success: boolean; data?: MSPDashboardMetrics; error?: string }>;
  refreshTenantHealth(): Promise<{ success: boolean; error?: string }>;
  updateTenant(tenantId: string, updates: Partial<MSPTenant>): Promise<{ success: boolean; data?: MSPTenant; error?: string }>;
  enableMSPMode(): Promise<{ success: boolean; error?: string }>;
  disableMSPMode(): Promise<{ success: boolean; error?: string }>;
  isMSPModeEnabled(): Promise<{ success: boolean; data?: boolean; error?: string }>;
}

interface AdminTemplateAPI {
  getTemplates(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getTemplate(templateId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  getTemplatesByCategory(category: string): Promise<{ success: boolean; data?: any[]; error?: string }>;
  searchTemplates(searchTerm: string): Promise<{ success: boolean; data?: any[]; error?: string }>;
  executeTemplate(templateId: string, parameters?: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }>;
  addCustomTemplate(template: any): Promise<{ success: boolean; error?: string }>;
  removeTemplate(templateId: string): Promise<{ success: boolean; error?: string }>;
  getExecutionHistory(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  exportTemplate(templateId: string, format: string): Promise<{ success: boolean; data?: any; error?: string }>;
  scheduleTemplate(templateId: string, schedule: any): Promise<{ success: boolean; error?: string }>;
  getScheduledTemplates(): Promise<{ success: boolean; data?: any[]; error?: string }>;
}

interface ReportingAPI {
  getReportTemplates(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getReportTemplate(templateId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  getReportsByCategory(category: string): Promise<{ success: boolean; data?: any[]; error?: string }>;
  searchReports(searchTerm: string): Promise<{ success: boolean; data?: any[]; error?: string }>;
  generateReport(templateId: string, format: string, parameters?: Record<string, any>, tenantId?: string): Promise<{ success: boolean; data?: any; error?: string }>;
  getReportHistory(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getReportResult(reportId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  deleteReport(reportId: string): Promise<{ success: boolean; error?: string }>;
  downloadReport(reportId: string): Promise<{ success: boolean; filePath?: string; error?: string }>;
  addCustomReport(report: any): Promise<{ success: boolean; error?: string }>;
  removeReport(reportId: string): Promise<{ success: boolean; error?: string }>;
  scheduleReport(templateId: string, schedule: any): Promise<{ success: boolean; error?: string }>;
  getScheduledReports(): Promise<{ success: boolean; data?: any[]; error?: string }>;
}

interface RBACAPI {
  getRoles(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getRole(roleId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  createRole(roleData: any): Promise<{ success: boolean; data?: any; error?: string }>;
  updateRole(roleId: string, roleData: any): Promise<{ success: boolean; data?: any; error?: string }>;
  deleteRole(roleId: string): Promise<{ success: boolean; error?: string }>;
  getRoleAssignments(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getUserRoles(userId: string, tenantId?: string): Promise<{ success: boolean; data?: any[]; error?: string }>;
  assignRole(userId: string, role: string, assignedBy: string, tenantId?: string, expiresAt?: Date): Promise<{ success: boolean; error?: string }>;
  revokeRole(userId: string, role: string, tenantId?: string): Promise<{ success: boolean; error?: string }>;
  hasPermission(userId: string, permission: string, tenantId?: string): Promise<{ success: boolean; data?: boolean; error?: string }>;
  getUserEffectivePermissions(userId: string, tenantId?: string): Promise<{ success: boolean; data?: string[]; error?: string }>;
  getAccessContext(userId: string, tenantId?: string): Promise<{ success: boolean; data?: any; error?: string }>;
  bulkAssignRole(userIds: string[], role: string, assignedBy: string, tenantId?: string): Promise<{ success: boolean; data?: any; error?: string }>;
  bulkRevokeRole(userIds: string[], role: string, tenantId?: string): Promise<{ success: boolean; data?: any; error?: string }>;
  getPermissionMatrix(): Promise<{ success: boolean; data?: any; error?: string }>;
  exportConfiguration(): Promise<{ success: boolean; filePath?: string; error?: string }>;
  importConfiguration(): Promise<{ success: boolean; error?: string }>;
  getUsers(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getTenants(): Promise<{ success: boolean; data?: any[]; error?: string }>;
}

interface ConfigAPI {
  get(): Promise<any>;
  update(config: any): Promise<void>;
  getLLMConfig(): Promise<any>;
  saveLLMConfig(config: any): Promise<void>;
  clearModelCache(provider?: string): Promise<void>;
  getCachedModels(provider: string): Promise<string[]>;
  saveCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai', config: any): Promise<void>;
  getCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'): Promise<any>;
  getConfiguredCloudProviders(): Promise<Array<{ provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'; config: any }>>;
  setDefaultCloudProvider(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'): Promise<void>;
  getDefaultCloudProvider(): Promise<{ provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'; config: any } | null>;
  removeCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'): Promise<void>;
  getEntraConfig(): Promise<any>;
  saveEntraConfig(config: any): Promise<void>;
  clearEntraConfig(): Promise<void>;
}

interface UpdaterAPI {
  checkForUpdates(): Promise<{ success: boolean; error?: string }>;
  downloadUpdate(): Promise<{ success: boolean; error?: string }>;
  installUpdate(): Promise<{ success: boolean; error?: string }>;
  getCurrentVersion(): Promise<string>;
  isUpdatePending(): Promise<boolean>;
  setAutoUpdateEnabled(enabled: boolean): Promise<{ success: boolean; error?: string }>;
  getAutoUpdateEnabled(): Promise<boolean>;
}

interface BillingAPI {
  getPlans(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getPlan(planId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  createPlan(planData: any): Promise<{ success: boolean; data?: any; error?: string }>;
  updatePlan(planId: string, updates: any): Promise<{ success: boolean; error?: string }>;
  getTenantBilling(): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getTenantBillingById(tenantId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  createTenantBilling(billingData: any): Promise<{ success: boolean; data?: any; error?: string }>;
  updateTenantBilling(tenantId: string, updates: any): Promise<{ success: boolean; error?: string }>;
  changeTenantPlan(tenantId: string, newPlanId: string, effectiveDate?: Date): Promise<{ success: boolean; error?: string }>;
  recordUsage(tenantId: string, metric: string, value: number, metadata?: any): Promise<{ success: boolean; error?: string }>;
  getCurrentUsage(tenantId: string, metric?: string): Promise<{ success: boolean; data?: any; error?: string }>;
  getUsageHistory(tenantId: string, metric?: string, period?: { start: Date; end: Date }): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getInvoices(tenantId?: string, status?: string): Promise<{ success: boolean; data?: any[]; error?: string }>;
  getInvoice(invoiceId: string): Promise<{ success: boolean; data?: any; error?: string }>;
  generateInvoice(tenantId: string, periodStart?: Date, periodEnd?: Date): Promise<{ success: boolean; data?: any; error?: string }>;
  markInvoicePaid(invoiceId: string, paidDate?: Date): Promise<{ success: boolean; error?: string }>;
  getAlerts(tenantId?: string, type?: string, unacknowledgedOnly?: boolean): Promise<{ success: boolean; data?: any[]; error?: string }>;
  createAlert(alertData: any): Promise<{ success: boolean; data?: any; error?: string }>;
  acknowledgeAlert(alertId: string): Promise<{ success: boolean; error?: string }>;
  generateReport(type: string, period: { start: Date; end: Date }, filters?: any): Promise<{ success: boolean; data?: any; error?: string }>;
  getConfiguration(): Promise<{ success: boolean; data?: any; error?: string }>;
  updateConfiguration(updates: any): Promise<{ success: boolean; error?: string }>;
  exportBillingData(): Promise<{ success: boolean; data?: any; error?: string }>;
  importBillingData(data: any): Promise<{ success: boolean; error?: string }>;
  getUsageData(): Promise<{ success: boolean; data?: any; error?: string }>;
  getSummary(): Promise<{ success: boolean; data?: any; error?: string }>;
}

interface ElectronAPI {
  auth: AuthAPI;
  graph: GraphAPI;
  llm: LLMAPI;
  mcp: MCPAPI;
  msp: MSPAPI;
  adminTemplates: AdminTemplateAPI;
  reporting: ReportingAPI;
  rbac: RBACAPI;
  billing: BillingAPI;
  config: ConfigAPI;
  updater: UpdaterAPI;
  on(channel: string, callback: (...args: any[]) => void): void;
  removeAllListeners(channel: string): void;
}

interface ElectronWindow {
  getAssetPath(assetName: string): Promise<string>;
  openExternal(url: string): Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    electron: ElectronWindow;
  }
}

export {};
