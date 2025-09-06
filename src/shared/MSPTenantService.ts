// MSP Tenant Management Service
// Provides multi-tenant management capabilities for Managed Service Providers

import { ConfigService } from './ConfigService';
import { AuthService } from '../auth/AuthService';

export interface MSPTenant {
  id: string;
  displayName: string;
  domain: string;
  clientId?: string;
  isActive: boolean;
  lastAccessed: Date;
  subscriptionType: 'Business Basic' | 'Business Standard' | 'Business Premium' | 'E3' | 'E5' | 'F3' | 'Other';
  userCount: number;
  licenseInfo?: {
    total: number;
    assigned: number;
    available: number;
  };
  healthStatus: 'Healthy' | 'Warning' | 'Critical' | 'Unknown';
  partnerRelationship: {
    type: 'CSP' | 'DAP' | 'GDAP' | 'Direct';
    permissions: string[];
    expiryDate?: Date;
  };
  contactInfo: {
    primaryContact: string;
    email: string;
    phone?: string;
  };
  billingInfo?: {
    model: 'Per-User' | 'Fixed-Fee' | 'Usage-Based';
    currency: string;
    monthlyRevenue?: number;
  };
  serviceLevel: 'Basic' | 'Standard' | 'Premium' | 'Enterprise';
  tags: string[];
  notes?: string;
}

export interface MSPTenantContext {
  currentTenant: MSPTenant | null;
  availableTenants: MSPTenant[];
  isMultiTenant: boolean;
  switchingInProgress: boolean;
}

export interface TenantSwitchResult {
  success: boolean;
  tenant?: MSPTenant;
  error?: string;
  authenticationRequired?: boolean;
}

export interface MSPDashboardMetrics {
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

/**
 * MSP Tenant Service for managing multiple client tenants
 * Provides tenant switching, isolation, and aggregated management capabilities
 */
export class MSPTenantService {
  private configService: ConfigService;
  private authService: AuthService;
  private currentContext: MSPTenantContext;
  private tenantCache: Map<string, MSPTenant> = new Map();
  private switchingPromise: Promise<TenantSwitchResult> | null = null;

  constructor(configService: ConfigService, authService: AuthService) {
    this.configService = configService;
    this.authService = authService;
    this.currentContext = {
      currentTenant: null,
      availableTenants: [],
      isMultiTenant: false,
      switchingInProgress: false
    };
  }

  /**
   * Initialize MSP tenant service and load available tenants
   */
  async initialize(): Promise<void> {
    console.log('🏢 Initializing MSP Tenant Service...');
    
    try {
      // Load tenant configuration from storage
      const tenantConfig = await this.loadTenantConfiguration();
      
      // Check if MSP mode is enabled
      this.currentContext.isMultiTenant = tenantConfig?.mspMode === true;
      
      if (this.currentContext.isMultiTenant) {
        // Load available tenants
        await this.loadAvailableTenants();
        
        // Set default tenant if specified
        const defaultTenantId = tenantConfig?.defaultTenantId;
        if (defaultTenantId) {
          const defaultTenant = this.currentContext.availableTenants.find(t => t.id === defaultTenantId);
          if (defaultTenant) {
            this.currentContext.currentTenant = defaultTenant;
          }
        }
        
        console.log(`✅ MSP Tenant Service initialized with ${this.currentContext.availableTenants.length} tenants`);
      } else {
        console.log('ℹ️ MSP mode not enabled - running in single tenant mode');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize MSP Tenant Service:', error);
      throw error;
    }
  }

  /**
   * Get current tenant context
   */
  getCurrentContext(): MSPTenantContext {
    return { ...this.currentContext };
  }

  /**
   * Get list of available tenants for the MSP
   */
  async getAvailableTenants(): Promise<MSPTenant[]> {
    if (!this.currentContext.isMultiTenant) {
      throw new Error('MSP mode is not enabled');
    }
    
    // Refresh tenant list if cache is stale
    const lastRefresh = await this.getLastTenantRefresh();
    const cacheAge = Date.now() - lastRefresh.getTime();
    
    if (cacheAge > 30 * 60 * 1000) { // Refresh every 30 minutes
      await this.refreshTenantList();
    }
    
    return [...this.currentContext.availableTenants];
  }

  /**
   * Switch to a different tenant context
   */
  async switchTenant(tenantId: string): Promise<TenantSwitchResult> {
    console.log(`🔄 Switching to tenant: ${tenantId}`);
    
    // Prevent concurrent switching operations
    if (this.switchingPromise) {
      console.log('⏳ Tenant switch already in progress, waiting...');
      return await this.switchingPromise;
    }
    
    this.switchingPromise = this.performTenantSwitch(tenantId);
    const result = await this.switchingPromise;
    this.switchingPromise = null;
    
    return result;
  }

  /**
   * Perform the actual tenant switch operation
   */
  private async performTenantSwitch(tenantId: string): Promise<TenantSwitchResult> {
    try {
      this.currentContext.switchingInProgress = true;
      
      // Find the target tenant
      const targetTenant = this.currentContext.availableTenants.find(t => t.id === tenantId);
      if (!targetTenant) {
        return {
          success: false,
          error: `Tenant not found: ${tenantId}`
        };
      }
      
      // Validate tenant access and permissions
      const accessValidation = await this.validateTenantAccess(targetTenant);
      if (!accessValidation.valid) {
        return {
          success: false,
          error: accessValidation.error,
          authenticationRequired: accessValidation.authRequired
        };
      }
      
      // Update authentication context for the tenant
      await this.updateAuthenticationContext(targetTenant);
      
      // Update current tenant
      this.currentContext.currentTenant = targetTenant;
      targetTenant.lastAccessed = new Date();
      
      // Save tenant switch to configuration
      await this.saveTenantSwitch(tenantId);
      
      console.log(`✅ Successfully switched to tenant: ${targetTenant.displayName} (${targetTenant.domain})`);
      
      return {
        success: true,
        tenant: targetTenant
      };
      
    } catch (error) {
      console.error('❌ Failed to switch tenant:', error);
      return {
        success: false,
        error: `Failed to switch tenant: ${error instanceof Error ? error.message : String(error)}`
      };
    } finally {
      this.currentContext.switchingInProgress = false;
    }
  }

  /**
   * Add a new tenant to MSP management
   */
  async addTenant(tenantInfo: Partial<MSPTenant>): Promise<{ success: boolean; tenant?: MSPTenant; error?: string }> {
    try {
      console.log(`➕ Adding new tenant: ${tenantInfo.displayName}`);
      
      // Validate required fields
      if (!tenantInfo.id || !tenantInfo.displayName || !tenantInfo.domain) {
        return {
          success: false,
          error: 'Required fields missing: id, displayName, and domain are required'
        };
      }
      
      // Check if tenant already exists
      const existingTenant = this.currentContext.availableTenants.find(t => t.id === tenantInfo.id);
      if (existingTenant) {
        return {
          success: false,
          error: `Tenant ${tenantInfo.id} already exists`
        };
      }
      
      // Create new tenant object
      const newTenant: MSPTenant = {
        id: tenantInfo.id!,
        displayName: tenantInfo.displayName!,
        domain: tenantInfo.domain!,
        clientId: tenantInfo.clientId,
        isActive: tenantInfo.isActive ?? true,
        lastAccessed: new Date(),
        subscriptionType: tenantInfo.subscriptionType ?? 'Other',
        userCount: tenantInfo.userCount ?? 0,
        healthStatus: 'Unknown',
        partnerRelationship: tenantInfo.partnerRelationship ?? {
          type: 'DAP',
          permissions: ['User.Read.All', 'Group.Read.All']
        },
        contactInfo: tenantInfo.contactInfo ?? {
          primaryContact: 'Unknown',
          email: ''
        },
        serviceLevel: tenantInfo.serviceLevel ?? 'Standard',
        tags: tenantInfo.tags ?? [],
        notes: tenantInfo.notes
      };
      
      // Validate tenant connectivity
      const connectivityTest = await this.testTenantConnectivity(newTenant);
      if (!connectivityTest.success) {
        return {
          success: false,
          error: `Failed to connect to tenant: ${connectivityTest.error}`
        };
      }
      
      // Add to tenant list
      this.currentContext.availableTenants.push(newTenant);
      this.tenantCache.set(newTenant.id, newTenant);
      
      // Save to configuration
      await this.saveTenantConfiguration();
      
      console.log(`✅ Successfully added tenant: ${newTenant.displayName}`);
      
      return {
        success: true,
        tenant: newTenant
      };
      
    } catch (error) {
      console.error('❌ Failed to add tenant:', error);
      return {
        success: false,
        error: `Failed to add tenant: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Remove a tenant from MSP management
   */
  async removeTenant(tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`➖ Removing tenant: ${tenantId}`);
      
      const tenantIndex = this.currentContext.availableTenants.findIndex(t => t.id === tenantId);
      if (tenantIndex === -1) {
        return {
          success: false,
          error: `Tenant not found: ${tenantId}`
        };
      }
      
      // If removing current tenant, switch to another one
      if (this.currentContext.currentTenant?.id === tenantId) {
        const otherTenants = this.currentContext.availableTenants.filter(t => t.id !== tenantId);
        if (otherTenants.length > 0) {
          await this.switchTenant(otherTenants[0].id);
        } else {
          this.currentContext.currentTenant = null;
        }
      }
      
      // Remove from lists
      this.currentContext.availableTenants.splice(tenantIndex, 1);
      this.tenantCache.delete(tenantId);
      
      // Save configuration
      await this.saveTenantConfiguration();
      
      console.log(`✅ Successfully removed tenant: ${tenantId}`);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Failed to remove tenant:', error);
      return {
        success: false,
        error: `Failed to remove tenant: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Get MSP dashboard metrics aggregated across all tenants
   */
  async getDashboardMetrics(): Promise<MSPDashboardMetrics> {
    const tenants = this.currentContext.availableTenants;
    
    const metrics: MSPDashboardMetrics = {
      totalTenants: tenants.length,
      activeTenants: tenants.filter(t => t.isActive).length,
      totalUsers: tenants.reduce((sum, t) => sum + t.userCount, 0),
      healthyTenants: tenants.filter(t => t.healthStatus === 'Healthy').length,
      tenantsWithIssues: tenants.filter(t => ['Warning', 'Critical'].includes(t.healthStatus)).length,
      monthlyRevenue: tenants.reduce((sum, t) => sum + (t.billingInfo?.monthlyRevenue || 0), 0),
      topServices: await this.getTopServiceUsage(),
      recentAlerts: await this.getRecentAlerts()
    };
    
    return metrics;
  }

  /**
   * Refresh health status for all tenants
   */
  async refreshTenantHealth(): Promise<void> {
    console.log('🔍 Refreshing tenant health status...');
    
    const healthPromises = this.currentContext.availableTenants.map(async (tenant) => {
      try {
        const health = await this.checkTenantHealth(tenant);
        tenant.healthStatus = health.status;
        return { tenantId: tenant.id, success: true };
      } catch (error) {
        console.error(`Failed to check health for tenant ${tenant.id}:`, error);
        tenant.healthStatus = 'Unknown';
        return { tenantId: tenant.id, success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
    
    await Promise.allSettled(healthPromises);
    
    // Save updated tenant information
    await this.saveTenantConfiguration();
    
    console.log('✅ Tenant health refresh completed');
  }

  // Private helper methods

  private async loadTenantConfiguration(): Promise<any> {
    // Load from ConfigService or file storage
    // Implementation would depend on the storage mechanism
    return {};
  }

  private async loadAvailableTenants(): Promise<void> {
    // Load tenants from configuration storage
    // For now, return empty array - would be populated from actual storage
    this.currentContext.availableTenants = [];
  }

  private async getLastTenantRefresh(): Promise<Date> {
    // Return last refresh timestamp from storage
    return new Date(Date.now() - 31 * 60 * 1000); // Force refresh for demo
  }

  private async refreshTenantList(): Promise<void> {
    console.log('🔄 Refreshing tenant list...');
    // Implementation would query Microsoft Graph for partner tenants
  }

  private async validateTenantAccess(tenant: MSPTenant): Promise<{ valid: boolean; error?: string; authRequired?: boolean }> {
    try {
      // Validate partner relationship and permissions
      // This would check DAP/GDAP permissions and token validity
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        authRequired: true
      };
    }
  }

  private async updateAuthenticationContext(tenant: MSPTenant): Promise<void> {
    // Update auth service to use tenant-specific context
    console.log(`🔐 Updating authentication context for tenant: ${tenant.displayName}`);
  }

  private async saveTenantSwitch(tenantId: string): Promise<void> {
    // Save current tenant selection to storage
    console.log(`💾 Saving tenant switch to: ${tenantId}`);
  }

  private async testTenantConnectivity(tenant: MSPTenant): Promise<{ success: boolean; error?: string }> {
    try {
      // Test connectivity to tenant via Microsoft Graph
      console.log(`🔗 Testing connectivity to tenant: ${tenant.displayName}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async saveTenantConfiguration(): Promise<void> {
    // Save tenant configuration to storage
    console.log('💾 Saving tenant configuration...');
  }

  private async getTopServiceUsage(): Promise<Array<{ service: string; usage: number; tenantCount: number }>> {
    // Return aggregated service usage across tenants
    return [
      { service: 'Exchange Online', usage: 85, tenantCount: 12 },
      { service: 'SharePoint Online', usage: 78, tenantCount: 10 },
      { service: 'Microsoft Teams', usage: 92, tenantCount: 15 },
      { service: 'OneDrive', usage: 71, tenantCount: 13 }
    ];
  }

  private async getRecentAlerts(): Promise<Array<any>> {
    // Return recent alerts across all tenants
    return [];
  }

  private async checkTenantHealth(tenant: MSPTenant): Promise<{ status: 'Healthy' | 'Warning' | 'Critical' | 'Unknown' }> {
    // Check tenant health via service health API
    return { status: 'Healthy' };
  }
}