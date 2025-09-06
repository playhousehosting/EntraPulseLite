// BillingService.ts
// Comprehensive MSP billing and cost management service with tenant tracking, usage-based pricing, billing alerts, and automated workflows

import { EventEmitter } from 'events';

export enum BillingModel {
  FLAT_RATE = 'flat_rate',
  USAGE_BASED = 'usage_based',
  TIERED = 'tiered',
  HYBRID = 'hybrid'
}

export enum BillingFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  CUSTOM = 'custom'
}

export enum UsageMetric {
  API_CALLS = 'api_calls',
  STORAGE_GB = 'storage_gb',
  USERS = 'users',
  LICENSES = 'licenses',
  QUERIES = 'queries',
  REPORTS = 'reports',
  AUTOMATION_RUNS = 'automation_runs',
  COMPLIANCE_CHECKS = 'compliance_checks'
}

export enum BillingStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  TRIAL = 'trial'
}

export enum AlertType {
  USAGE_THRESHOLD = 'usage_threshold',
  COST_THRESHOLD = 'cost_threshold',
  PAYMENT_DUE = 'payment_due',
  PAYMENT_OVERDUE = 'payment_overdue',
  TRIAL_EXPIRING = 'trial_expiring',
  QUOTA_EXCEEDED = 'quota_exceeded'
}

export interface BillingPlan {
  planId: string;
  name: string;
  description: string;
  billingModel: BillingModel;
  frequency: BillingFrequency;
  basePrice: number;
  currency: string;
  features: string[];
  limits: {
    [metric in UsageMetric]?: number;
  };
  overageRates: {
    [metric in UsageMetric]?: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantBilling {
  tenantId: string;
  tenantName: string;
  planId: string;
  status: BillingStatus;
  billingContact: {
    email: string;
    name: string;
    phone?: string;
  };
  paymentMethod?: {
    type: 'credit_card' | 'bank_transfer' | 'invoice';
    lastFour?: string;
    expiryDate?: string;
  };
  billingAddress: {
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  trialEndDate?: Date;
  nextBillingDate: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  autoRenewal: boolean;
  customRates?: {
    [metric in UsageMetric]?: number;
  };
  discounts?: {
    percentage?: number;
    amount?: number;
    description: string;
    validUntil?: Date;
  }[];
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecord {
  recordId: string;
  tenantId: string;
  metric: UsageMetric;
  value: number;
  unit: string;
  timestamp: Date;
  metadata?: {
    [key: string]: any;
  };
  cost?: number;
  billingPeriod: string; // YYYY-MM format
}

export interface BillingInvoice {
  invoiceId: string;
  tenantId: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  paidDate?: Date;
  periodStart: Date;
  periodEnd: Date;
  subtotal: number;
  taxes: {
    type: string;
    rate: number;
    amount: number;
  }[];
  discounts: {
    description: string;
    amount: number;
  }[];
  total: number;
  currency: string;
  lineItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    metric?: UsageMetric;
  }[];
  paymentTerms: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingAlert {
  alertId: string;
  tenantId: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  threshold?: number;
  currentValue?: number;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  actions: {
    type: 'email' | 'webhook' | 'suspend' | 'limit';
    target: string;
    executed: boolean;
    executedAt?: Date;
  }[];
}

export interface BillingReport {
  reportId: string;
  title: string;
  type: 'revenue' | 'usage' | 'cost_analysis' | 'tenant_summary';
  period: {
    start: Date;
    end: Date;
  };
  filters: {
    tenantIds?: string[];
    planIds?: string[];
    metrics?: UsageMetric[];
  };
  data: {
    summary: {
      totalRevenue: number;
      totalCosts: number;
      profitMargin: number;
      tenantCount: number;
      avgRevenuePerTenant: number;
    };
    metrics: {
      [metric in UsageMetric]?: {
        total: number;
        average: number;
        peak: number;
        cost: number;
      };
    };
    tenants: {
      tenantId: string;
      tenantName: string;
      revenue: number;
      usage: { [metric in UsageMetric]?: number };
      status: BillingStatus;
    }[];
    trends: {
      period: string;
      revenue: number;
      costs: number;
      tenantCount: number;
    }[];
  };
  generatedAt: Date;
  generatedBy: string;
}

export interface BillingConfiguration {
  defaultCurrency: string;
  taxSettings: {
    enabled: boolean;
    defaultRate: number;
    taxByLocation: boolean;
    exemptTenants: string[];
  };
  paymentTerms: {
    defaultDays: number;
    lateFeesEnabled: boolean;
    lateFeeRate: number;
    gracePeriodDays: number;
  };
  alertThresholds: {
    [type in AlertType]?: {
      enabled: boolean;
      threshold: number;
      recipients: string[];
    };
  };
  automationSettings: {
    autoGenerateInvoices: boolean;
    autoSendInvoices: boolean;
    autoSuspendOverdue: boolean;
    overdueGracePeriod: number;
    usageTrackingEnabled: boolean;
    realTimeAlerts: boolean;
  };
  integrations: {
    accountingSystem?: {
      type: 'quickbooks' | 'xero' | 'sage' | 'custom';
      credentials: any;
      syncEnabled: boolean;
    };
    paymentProcessor?: {
      type: 'stripe' | 'paypal' | 'square' | 'custom';
      credentials: any;
      autoCharge: boolean;
    };
  };
}

export class BillingService extends EventEmitter {
  private billingPlans: Map<string, BillingPlan> = new Map();
  private tenantBilling: Map<string, TenantBilling> = new Map();
  private usageRecords: UsageRecord[] = [];
  private invoices: Map<string, BillingInvoice> = new Map();
  private alerts: Map<string, BillingAlert> = new Map();
  private configuration!: BillingConfiguration;
  private usageTracking: Map<string, Map<UsageMetric, number>> = new Map(); // tenantId -> metric -> current usage

  constructor() {
    super();
    this.initializeDefaultConfiguration();
    this.initializeDefaultPlans();
    this.startUsageTracking();
  }

  private initializeDefaultConfiguration(): void {
    this.configuration = {
      defaultCurrency: 'USD',
      taxSettings: {
        enabled: true,
        defaultRate: 0.08,
        taxByLocation: false,
        exemptTenants: []
      },
      paymentTerms: {
        defaultDays: 30,
        lateFeesEnabled: true,
        lateFeeRate: 0.015,
        gracePeriodDays: 5
      },
      alertThresholds: {
        [AlertType.USAGE_THRESHOLD]: {
          enabled: true,
          threshold: 0.8,
          recipients: ['admin@company.com']
        },
        [AlertType.COST_THRESHOLD]: {
          enabled: true,
          threshold: 1000,
          recipients: ['billing@company.com']
        },
        [AlertType.PAYMENT_DUE]: {
          enabled: true,
          threshold: 7,
          recipients: ['billing@company.com']
        }
      },
      automationSettings: {
        autoGenerateInvoices: true,
        autoSendInvoices: false,
        autoSuspendOverdue: false,
        overdueGracePeriod: 30,
        usageTrackingEnabled: true,
        realTimeAlerts: true
      },
      integrations: {}
    };
  }

  private initializeDefaultPlans(): void {
    const basicPlan: BillingPlan = {
      planId: 'basic',
      name: 'Basic MSP Plan',
      description: 'Essential M365 management features for small MSPs',
      billingModel: BillingModel.FLAT_RATE,
      frequency: BillingFrequency.MONTHLY,
      basePrice: 299,
      currency: 'USD',
      features: [
        'Up to 5 tenants',
        'Basic reporting',
        'Standard support',
        'API access'
      ],
      limits: {
        [UsageMetric.API_CALLS]: 10000,
        [UsageMetric.USERS]: 500,
        [UsageMetric.QUERIES]: 1000,
        [UsageMetric.REPORTS]: 50
      },
      overageRates: {
        [UsageMetric.API_CALLS]: 0.01,
        [UsageMetric.USERS]: 2.00,
        [UsageMetric.QUERIES]: 0.50,
        [UsageMetric.REPORTS]: 5.00
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const professionalPlan: BillingPlan = {
      planId: 'professional',
      name: 'Professional MSP Plan',
      description: 'Advanced features for growing MSPs',
      billingModel: BillingModel.TIERED,
      frequency: BillingFrequency.MONTHLY,
      basePrice: 599,
      currency: 'USD',
      features: [
        'Up to 25 tenants',
        'Advanced reporting',
        'Priority support',
        'Advanced API access',
        'Automation workflows',
        'Compliance monitoring'
      ],
      limits: {
        [UsageMetric.API_CALLS]: 50000,
        [UsageMetric.USERS]: 2500,
        [UsageMetric.QUERIES]: 5000,
        [UsageMetric.REPORTS]: 250,
        [UsageMetric.AUTOMATION_RUNS]: 1000,
        [UsageMetric.COMPLIANCE_CHECKS]: 500
      },
      overageRates: {
        [UsageMetric.API_CALLS]: 0.008,
        [UsageMetric.USERS]: 1.50,
        [UsageMetric.QUERIES]: 0.30,
        [UsageMetric.REPORTS]: 3.00,
        [UsageMetric.AUTOMATION_RUNS]: 0.25,
        [UsageMetric.COMPLIANCE_CHECKS]: 1.00
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const enterprisePlan: BillingPlan = {
      planId: 'enterprise',
      name: 'Enterprise MSP Plan',
      description: 'Full-featured solution for large MSPs',
      billingModel: BillingModel.HYBRID,
      frequency: BillingFrequency.MONTHLY,
      basePrice: 1299,
      currency: 'USD',
      features: [
        'Unlimited tenants',
        'Custom reporting',
        'Dedicated support',
        'Full API access',
        'Advanced automation',
        'Full compliance suite',
        'Custom integrations',
        'White-label options'
      ],
      limits: {
        [UsageMetric.API_CALLS]: 200000,
        [UsageMetric.USERS]: 10000,
        [UsageMetric.QUERIES]: 20000,
        [UsageMetric.REPORTS]: 1000,
        [UsageMetric.AUTOMATION_RUNS]: 5000,
        [UsageMetric.COMPLIANCE_CHECKS]: 2000
      },
      overageRates: {
        [UsageMetric.API_CALLS]: 0.005,
        [UsageMetric.USERS]: 1.00,
        [UsageMetric.QUERIES]: 0.20,
        [UsageMetric.REPORTS]: 2.00,
        [UsageMetric.AUTOMATION_RUNS]: 0.15,
        [UsageMetric.COMPLIANCE_CHECKS]: 0.50
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.billingPlans.set(basicPlan.planId, basicPlan);
    this.billingPlans.set(professionalPlan.planId, professionalPlan);
    this.billingPlans.set(enterprisePlan.planId, enterprisePlan);
  }

  private startUsageTracking(): void {
    if (this.configuration.automationSettings.usageTrackingEnabled) {
      // Start background tracking
      setInterval(() => {
        this.processUsageAlerts();
      }, 60000); // Check every minute

      // Daily usage aggregation
      setInterval(() => {
        this.aggregateDailyUsage();
      }, 24 * 60 * 60 * 1000); // Every 24 hours
    }
  }

  // Billing Plan Management
  getAllPlans(): BillingPlan[] {
    return Array.from(this.billingPlans.values()).filter(plan => plan.isActive);
  }

  getPlan(planId: string): BillingPlan | undefined {
    return this.billingPlans.get(planId);
  }

  createPlan(planData: Omit<BillingPlan, 'createdAt' | 'updatedAt'>): BillingPlan {
    const plan: BillingPlan = {
      ...planData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.billingPlans.set(plan.planId, plan);
    this.emit('planCreated', plan);
    return plan;
  }

  updatePlan(planId: string, updates: Partial<BillingPlan>): boolean {
    const plan = this.billingPlans.get(planId);
    if (!plan) return false;

    const updatedPlan = {
      ...plan,
      ...updates,
      updatedAt: new Date()
    };

    this.billingPlans.set(planId, updatedPlan);
    this.emit('planUpdated', updatedPlan);
    return true;
  }

  // Tenant Billing Management
  getAllTenantBilling(): TenantBilling[] {
    return Array.from(this.tenantBilling.values());
  }

  getTenantBilling(tenantId: string): TenantBilling | undefined {
    return this.tenantBilling.get(tenantId);
  }

  createTenantBilling(billingData: Omit<TenantBilling, 'createdAt' | 'updatedAt'>): TenantBilling {
    const now = new Date();
    const billing: TenantBilling = {
      ...billingData,
      createdAt: now,
      updatedAt: now
    };

    this.tenantBilling.set(billing.tenantId, billing);
    this.usageTracking.set(billing.tenantId, new Map());
    this.emit('tenantBillingCreated', billing);
    return billing;
  }

  updateTenantBilling(tenantId: string, updates: Partial<TenantBilling>): boolean {
    const billing = this.tenantBilling.get(tenantId);
    if (!billing) return false;

    const updatedBilling = {
      ...billing,
      ...updates,
      updatedAt: new Date()
    };

    this.tenantBilling.set(tenantId, updatedBilling);
    this.emit('tenantBillingUpdated', updatedBilling);
    return true;
  }

  changeTenantPlan(tenantId: string, newPlanId: string, effectiveDate?: Date): boolean {
    const billing = this.tenantBilling.get(tenantId);
    const newPlan = this.billingPlans.get(newPlanId);
    
    if (!billing || !newPlan) return false;

    const effective = effectiveDate || new Date();
    
    // Calculate prorated charges if changing mid-period
    if (effective < billing.currentPeriodEnd) {
      this.generateProrationInvoice(tenantId, newPlanId, effective);
    }

    this.updateTenantBilling(tenantId, {
      planId: newPlanId,
      currentPeriodStart: effective,
      currentPeriodEnd: this.calculateNextBillingDate(effective, newPlan.frequency)
    });

    this.emit('tenantPlanChanged', { tenantId, oldPlan: billing.planId, newPlan: newPlanId, effectiveDate: effective });
    return true;
  }

  // Usage Tracking
  recordUsage(tenantId: string, metric: UsageMetric, value: number, metadata?: any): boolean {
    const billing = this.tenantBilling.get(tenantId);
    if (!billing) return false;

    const record: UsageRecord = {
      recordId: `${tenantId}-${metric}-${Date.now()}`,
      tenantId,
      metric,
      value,
      unit: this.getMetricUnit(metric),
      timestamp: new Date(),
      metadata,
      billingPeriod: this.formatBillingPeriod(new Date())
    };

    // Calculate cost if needed
    const plan = this.billingPlans.get(billing.planId);
    if (plan) {
      const currentUsage = this.getCurrentUsage(tenantId, metric) as number;
      record.cost = this.calculateUsageCost(plan, metric, value, currentUsage);
    }

    this.usageRecords.push(record);

    // Update current usage tracking
    const tenantUsage = this.usageTracking.get(tenantId) || new Map();
    const currentUsage = tenantUsage.get(metric) || 0;
    tenantUsage.set(metric, currentUsage + value);
    this.usageTracking.set(tenantId, tenantUsage);

    // Check for usage alerts
    this.checkUsageThresholds(tenantId, metric, currentUsage + value);

    this.emit('usageRecorded', record);
    return true;
  }

  getCurrentUsage(tenantId: string, metric?: UsageMetric): number | Map<UsageMetric, number> {
    const tenantUsage = this.usageTracking.get(tenantId);
    if (!tenantUsage) return metric ? 0 : new Map();

    if (metric) {
      return tenantUsage.get(metric) || 0;
    }
    return tenantUsage;
  }

  getUsageHistory(tenantId: string, metric?: UsageMetric, period?: { start: Date; end: Date }): UsageRecord[] {
    let records = this.usageRecords.filter(r => r.tenantId === tenantId);

    if (metric) {
      records = records.filter(r => r.metric === metric);
    }

    if (period) {
      records = records.filter(r => r.timestamp >= period.start && r.timestamp <= period.end);
    }

    return records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Invoice Management
  generateInvoice(tenantId: string, periodStart?: Date, periodEnd?: Date): BillingInvoice | null {
    const billing = this.tenantBilling.get(tenantId);
    if (!billing) return null;

    const plan = this.billingPlans.get(billing.planId);
    if (!plan) return null;

    const start = periodStart || billing.currentPeriodStart;
    const end = periodEnd || billing.currentPeriodEnd;

    const invoice: BillingInvoice = {
      invoiceId: `INV-${tenantId}-${Date.now()}`,
      tenantId,
      invoiceNumber: this.generateInvoiceNumber(),
      status: 'draft',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + this.configuration.paymentTerms.defaultDays * 24 * 60 * 60 * 1000),
      periodStart: start,
      periodEnd: end,
      subtotal: 0,
      taxes: [],
      discounts: [],
      total: 0,
      currency: plan.currency,
      lineItems: [],
      paymentTerms: `Net ${this.configuration.paymentTerms.defaultDays} days`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add base plan cost
    invoice.lineItems.push({
      description: `${plan.name} (${this.formatPeriod(start, end)})`,
      quantity: 1,
      unitPrice: plan.basePrice,
      total: plan.basePrice
    });
    invoice.subtotal += plan.basePrice;

    // Add usage-based charges
    const usageCharges = this.calculateUsageCharges(tenantId, plan, start, end);
    invoice.lineItems.push(...usageCharges.lineItems);
    invoice.subtotal += usageCharges.total;

    // Apply discounts
    if (billing.discounts) {
      for (const discount of billing.discounts) {
        if (!discount.validUntil || discount.validUntil > new Date()) {
          const discountAmount = discount.percentage 
            ? invoice.subtotal * (discount.percentage / 100)
            : discount.amount || 0;
          
          invoice.discounts.push({
            description: discount.description,
            amount: discountAmount
          });
          invoice.subtotal -= discountAmount;
        }
      }
    }

    // Calculate taxes
    if (this.configuration.taxSettings.enabled && !this.configuration.taxSettings.exemptTenants.includes(tenantId)) {
      const taxRate = this.configuration.taxSettings.defaultRate;
      const taxAmount = invoice.subtotal * taxRate;
      invoice.taxes.push({
        type: 'Sales Tax',
        rate: taxRate,
        amount: taxAmount
      });
    }

    invoice.total = invoice.subtotal + invoice.taxes.reduce((sum, tax) => sum + tax.amount, 0);

    this.invoices.set(invoice.invoiceId, invoice);
    this.emit('invoiceGenerated', invoice);

    return invoice;
  }

  getInvoices(tenantId?: string, status?: string): BillingInvoice[] {
    let invoices = Array.from(this.invoices.values());

    if (tenantId) {
      invoices = invoices.filter(inv => inv.tenantId === tenantId);
    }

    if (status) {
      invoices = invoices.filter(inv => inv.status === status);
    }

    return invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  markInvoicePaid(invoiceId: string, paidDate?: Date): boolean {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) return false;

    invoice.status = 'paid';
    invoice.paidDate = paidDate || new Date();
    invoice.updatedAt = new Date();

    this.emit('invoicePaid', invoice);
    return true;
  }

  // Alert Management
  createAlert(alertData: Omit<BillingAlert, 'alertId' | 'triggeredAt' | 'acknowledged' | 'resolved'>): BillingAlert {
    const alert: BillingAlert = {
      ...alertData,
      alertId: `ALERT-${Date.now()}`,
      triggeredAt: new Date(),
      acknowledged: false,
      resolved: false
    };

    this.alerts.set(alert.alertId, alert);
    this.processAlert(alert);
    this.emit('alertCreated', alert);

    return alert;
  }

  getAlerts(tenantId?: string, type?: AlertType, unacknowledgedOnly = false): BillingAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (tenantId) {
      alerts = alerts.filter(alert => alert.tenantId === tenantId);
    }

    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }

    if (unacknowledgedOnly) {
      alerts = alerts.filter(alert => !alert.acknowledged);
    }

    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.emit('alertAcknowledged', alert);
    return true;
  }

  // Reporting
  generateBillingReport(type: BillingReport['type'], period: { start: Date; end: Date }, filters?: any): BillingReport {
    const reportId = `RPT-${type}-${Date.now()}`;
    
    // Get relevant data
    const invoices = this.getInvoices().filter(inv => 
      inv.issueDate >= period.start && inv.issueDate <= period.end
    );
    
    const usageRecords = this.usageRecords.filter(record =>
      record.timestamp >= period.start && record.timestamp <= period.end
    );

    // Calculate summary metrics
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const totalCosts = usageRecords.reduce((sum, record) => sum + (record.cost || 0), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue) * 100 : 0;

    const uniqueTenants = new Set(invoices.map(inv => inv.tenantId));
    const tenantCount = uniqueTenants.size;
    const avgRevenuePerTenant = tenantCount > 0 ? totalRevenue / tenantCount : 0;

    // Calculate metrics
    const metrics: any = {};
    Object.values(UsageMetric).forEach(metric => {
      const metricRecords = usageRecords.filter(r => r.metric === metric);
      if (metricRecords.length > 0) {
        const total = metricRecords.reduce((sum, r) => sum + r.value, 0);
        const costs = metricRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
        metrics[metric] = {
          total,
          average: total / metricRecords.length,
          peak: Math.max(...metricRecords.map(r => r.value)),
          cost: costs
        };
      }
    });

    // Generate tenant summaries
    const tenants = Array.from(uniqueTenants).map(tenantId => {
      const tenantInvoices = invoices.filter(inv => inv.tenantId === tenantId);
      const tenantUsage = usageRecords.filter(r => r.tenantId === tenantId);
      const tenantBilling = this.tenantBilling.get(tenantId);

      const usage: any = {};
      Object.values(UsageMetric).forEach(metric => {
        const metricRecords = tenantUsage.filter(r => r.metric === metric);
        if (metricRecords.length > 0) {
          usage[metric] = metricRecords.reduce((sum, r) => sum + r.value, 0);
        }
      });

      return {
        tenantId,
        tenantName: tenantBilling?.tenantName || tenantId,
        revenue: tenantInvoices.reduce((sum, inv) => sum + inv.total, 0),
        usage,
        status: tenantBilling?.status || BillingStatus.ACTIVE
      };
    });

    const report: BillingReport = {
      reportId,
      title: `${type.replace('_', ' ').toUpperCase()} Report`,
      type,
      period,
      filters: filters || {},
      data: {
        summary: {
          totalRevenue,
          totalCosts,
          profitMargin,
          tenantCount,
          avgRevenuePerTenant
        },
        metrics,
        tenants,
        trends: [] // TODO: Implement trend analysis
      },
      generatedAt: new Date(),
      generatedBy: 'system'
    };

    this.emit('reportGenerated', report);
    return report;
  }

  // Configuration
  getConfiguration(): BillingConfiguration {
    return { ...this.configuration };
  }

  updateConfiguration(updates: Partial<BillingConfiguration>): void {
    this.configuration = {
      ...this.configuration,
      ...updates
    };
    this.emit('configurationUpdated', this.configuration);
  }

  // Export/Import
  exportBillingData(): any {
    return {
      plans: Object.fromEntries(this.billingPlans),
      tenantBilling: Object.fromEntries(this.tenantBilling),
      usageRecords: this.usageRecords,
      invoices: Object.fromEntries(this.invoices),
      alerts: Object.fromEntries(this.alerts),
      configuration: this.configuration,
      exportedAt: new Date()
    };
  }

  importBillingData(data: any): void {
    if (data.plans) {
      this.billingPlans = new Map(Object.entries(data.plans));
    }
    if (data.tenantBilling) {
      this.tenantBilling = new Map(Object.entries(data.tenantBilling));
    }
    if (data.usageRecords) {
      this.usageRecords = data.usageRecords;
    }
    if (data.invoices) {
      this.invoices = new Map(Object.entries(data.invoices));
    }
    if (data.alerts) {
      this.alerts = new Map(Object.entries(data.alerts));
    }
    if (data.configuration) {
      this.configuration = data.configuration;
    }

    this.emit('dataImported', data);
  }

  // Helper Methods
  private getMetricUnit(metric: UsageMetric): string {
    switch (metric) {
      case UsageMetric.API_CALLS: return 'calls';
      case UsageMetric.STORAGE_GB: return 'GB';
      case UsageMetric.USERS: return 'users';
      case UsageMetric.LICENSES: return 'licenses';
      case UsageMetric.QUERIES: return 'queries';
      case UsageMetric.REPORTS: return 'reports';
      case UsageMetric.AUTOMATION_RUNS: return 'runs';
      case UsageMetric.COMPLIANCE_CHECKS: return 'checks';
      default: return 'units';
    }
  }

  private formatBillingPeriod(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private calculateUsageCost(plan: BillingPlan, metric: UsageMetric, newUsage: number, currentUsage: number): number {
    const limit = plan.limits[metric] || 0;
    const overageRate = plan.overageRates[metric] || 0;
    
    const totalUsage = currentUsage + newUsage;
    
    if (totalUsage <= limit) {
      return 0; // Within plan limits
    }
    
    const overageAmount = Math.max(0, totalUsage - limit) - Math.max(0, currentUsage - limit);
    return overageAmount * overageRate;
  }

  private calculateNextBillingDate(startDate: Date, frequency: BillingFrequency): Date {
    const date = new Date(startDate);
    
    switch (frequency) {
      case BillingFrequency.MONTHLY:
        date.setMonth(date.getMonth() + 1);
        break;
      case BillingFrequency.QUARTERLY:
        date.setMonth(date.getMonth() + 3);
        break;
      case BillingFrequency.ANNUALLY:
        date.setFullYear(date.getFullYear() + 1);
        break;
      default:
        date.setMonth(date.getMonth() + 1);
    }
    
    return date;
  }

  private generateInvoiceNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const sequence = String(this.invoices.size + 1).padStart(4, '0');
    return `${year}${month}-${sequence}`;
  }

  private calculateUsageCharges(tenantId: string, plan: BillingPlan, start: Date, end: Date): { lineItems: any[]; total: number } {
    const usageRecords = this.usageRecords.filter(r => 
      r.tenantId === tenantId && r.timestamp >= start && r.timestamp <= end
    );

    const lineItems: any[] = [];
    let total = 0;

    // Group by metric
    const usageByMetric = new Map<UsageMetric, number>();
    usageRecords.forEach(record => {
      const current = usageByMetric.get(record.metric) || 0;
      usageByMetric.set(record.metric, current + record.value);
    });

    // Calculate charges for each metric
    usageByMetric.forEach((usage, metric) => {
      const limit = plan.limits[metric] || 0;
      const overageRate = plan.overageRates[metric] || 0;
      
      if (usage > limit) {
        const overage = usage - limit;
        const charge = overage * overageRate;
        
        lineItems.push({
          description: `${metric.replace('_', ' ')} overage (${overage} ${this.getMetricUnit(metric)})`,
          quantity: overage,
          unitPrice: overageRate,
          total: charge,
          metric
        });
        
        total += charge;
      }
    });

    return { lineItems, total };
  }

  private formatPeriod(start: Date, end: Date): string {
    const startStr = start.toLocaleDateString();
    const endStr = end.toLocaleDateString();
    return `${startStr} - ${endStr}`;
  }

  private checkUsageThresholds(tenantId: string, metric: UsageMetric, currentUsage: number): void {
    const billing = this.tenantBilling.get(tenantId);
    if (!billing) return;

    const plan = this.billingPlans.get(billing.planId);
    if (!plan) return;

    const limit = plan.limits[metric];
    if (!limit) return;

    const threshold = this.configuration.alertThresholds[AlertType.USAGE_THRESHOLD]?.threshold || 0.8;
    const usagePercentage = currentUsage / limit;

    if (usagePercentage >= threshold) {
      this.createAlert({
        tenantId,
        type: AlertType.USAGE_THRESHOLD,
        severity: usagePercentage >= 1 ? 'critical' : usagePercentage >= 0.9 ? 'high' : 'medium',
        title: `Usage Alert: ${metric.replace('_', ' ')}`,
        message: `${metric.replace('_', ' ')} usage is at ${Math.round(usagePercentage * 100)}% of plan limit`,
        threshold: limit * threshold,
        currentValue: currentUsage,
        actions: []
      });
    }
  }

  private processUsageAlerts(): void {
    // Process pending alerts
    const unprocessedAlerts = this.getAlerts(undefined, undefined, true);
    
    for (const alert of unprocessedAlerts) {
      this.processAlert(alert);
    }
  }

  private processAlert(alert: BillingAlert): void {
    const config = this.configuration.alertThresholds[alert.type];
    if (!config?.enabled) return;

    // Execute configured actions
    for (const action of alert.actions) {
      if (!action.executed) {
        switch (action.type) {
          case 'email':
            // TODO: Send email notification
            action.executed = true;
            action.executedAt = new Date();
            break;
          case 'webhook':
            // TODO: Send webhook notification
            action.executed = true;
            action.executedAt = new Date();
            break;
          case 'suspend':
            // TODO: Suspend tenant
            action.executed = true;
            action.executedAt = new Date();
            break;
        }
      }
    }
  }

  private aggregateDailyUsage(): void {
    // Aggregate and clean up old usage records
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Remove records older than 30 days (keep for current billing period)
    this.usageRecords = this.usageRecords.filter(record => record.timestamp >= thirtyDaysAgo);
  }

  private generateProrationInvoice(tenantId: string, newPlanId: string, effectiveDate: Date): void {
    // TODO: Implement prorated billing for plan changes
  }
}