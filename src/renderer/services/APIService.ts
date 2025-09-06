// API Service
// Manages third-party API integrations, API management console, and service connections

import EventEmitter from 'eventemitter3';

export interface APIEndpoint {
  id: string;
  name: string;
  description: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  authentication: APIAuthentication;
  parameters: APIParameter[];
  requestBody?: APIRequestBody;
  responses: APIResponse[];
  rateLimit?: APIRateLimit;
  timeout: number;
  retries: number;
  tags: string[];
  category: string;
  isActive: boolean;
  lastTested?: Date;
  testStatus?: 'success' | 'failure' | 'unknown';
  metadata: Record<string, any>;
}

export interface APIAuthentication {
  type: 'none' | 'apikey' | 'bearer' | 'basic' | 'oauth2' | 'custom';
  config: Record<string, any>;
  credentials?: {
    key?: string;
    secret?: string;
    token?: string;
    username?: string;
    password?: string;
  };
  isValid: boolean;
  expiresAt?: Date;
}

export interface APIParameter {
  name: string;
  type: 'query' | 'path' | 'header';
  dataType: 'string' | 'number' | 'boolean' | 'array';
  required: boolean;
  description: string;
  defaultValue?: any;
  enum?: string[];
  pattern?: string;
}

export interface APIRequestBody {
  contentType: string;
  schema: Record<string, any>;
  example?: any;
  required: boolean;
}

export interface APIResponse {
  statusCode: number;
  description: string;
  schema?: Record<string, any>;
  example?: any;
  headers?: Record<string, string>;
}

export interface APIRateLimit {
  requests: number;
  period: number; // in seconds
  burst?: number;
  resetTime?: Date;
  remaining?: number;
}

export interface APIConnection {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  endpoints: string[]; // endpoint IDs
  authentication: APIAuthentication;
  defaultHeaders: Record<string, string>;
  timeout: number;
  retries: number;
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastConnected?: Date;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface APICall {
  id: string;
  endpointId: string;
  connectionId?: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  parameters: Record<string, any>;
  requestBody?: any;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  statusCode?: number;
  response?: any;
  error?: string;
  success: boolean;
  userId: string;
  metadata: Record<string, any>;
}

export interface APIService_Definition {
  id: string;
  name: string;
  description: string;
  version: string;
  provider: string;
  category: 'Microsoft' | 'Google' | 'AWS' | 'Custom' | 'Webhook' | 'Database' | 'Other';
  logoUrl?: string;
  documentation?: string;
  supportUrl?: string;
  connections: APIConnection[];
  endpoints: APIEndpoint[];
  webhooks: APIWebhook[];
  authentication: APIAuthentication;
  quotas: APIQuota[];
  isOfficial: boolean;
  isActive: boolean;
  installed: boolean;
  installDate?: Date;
  lastUpdated: Date;
  metadata: Record<string, any>;
}

export interface APIWebhook {
  id: string;
  name: string;
  description: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
  metadata: Record<string, any>;
}

export interface APIQuota {
  type: 'requests' | 'data' | 'compute';
  limit: number;
  period: 'minute' | 'hour' | 'day' | 'month';
  used: number;
  resetTime: Date;
  warningThreshold: number;
}

export interface APIMarketplaceItem {
  id: string;
  service: APIService_Definition;
  rating: number;
  downloads: number;
  reviews: Array<{
    userId: string;
    rating: number;
    comment: string;
    date: Date;
  }>;
  pricing: {
    type: 'Free' | 'Paid' | 'Freemium' | 'Usage';
    amount?: number;
    currency?: string;
    interval?: 'Monthly' | 'Yearly' | 'Per-call';
  };
  screenshots: string[];
  featured: boolean;
  tags: string[];
}

export interface APITestResult {
  endpointId: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  response?: any;
  error?: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface APIAnalytics {
  endpointId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  errorRate: number;
  topErrors: Array<{
    error: string;
    count: number;
  }>;
  rateLimitHits: number;
  dataTransferred: number;
  timeline: Array<{
    timestamp: Date;
    calls: number;
    errors: number;
    responseTime: number;
  }>;
}

export class APIService extends EventEmitter {
  private services: Map<string, APIService_Definition> = new Map();
  private connections: Map<string, APIConnection> = new Map();
  private endpoints: Map<string, APIEndpoint> = new Map();
  private marketplaceItems: Map<string, APIMarketplaceItem> = new Map();
  private callHistory: Map<string, APICall> = new Map();
  private testResults: Map<string, APITestResult[]> = new Map();
  private analytics: Map<string, APIAnalytics> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load installed services
      await this.loadServices();
      
      // Load connections
      await this.loadConnections();
      
      // Load endpoints
      await this.loadEndpoints();
      
      // Load marketplace
      await this.loadMarketplace();
      
      // Load call history
      await this.loadCallHistory();
      
      // Initialize analytics
      await this.initializeAnalytics();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize API Service:', error);
      this.emit('error', error);
    }
  }

  // Service Management
  async getServices(): Promise<APIService_Definition[]> {
    return Array.from(this.services.values());
  }

  async getService(serviceId: string): Promise<APIService_Definition | null> {
    return this.services.get(serviceId) || null;
  }

  async installService(serviceId: string): Promise<boolean> {
    try {
      const marketplaceItem = this.marketplaceItems.get(serviceId);
      if (!marketplaceItem) {
        throw new Error(`Service ${serviceId} not found in marketplace`);
      }

      const service = { ...marketplaceItem.service };
      service.installed = true;
      service.installDate = new Date();

      this.services.set(serviceId, service);

      // Install via IPC
      await (window.electronAPI as any).api.installService(serviceId, service);

      this.emit('serviceInstalled', { serviceId, service });
      return true;
    } catch (error) {
      console.error(`Failed to install service ${serviceId}:`, error);
      return false;
    }
  }

  async uninstallService(serviceId: string): Promise<boolean> {
    try {
      const service = this.services.get(serviceId);
      if (!service) {
        return false;
      }

      // Disconnect all connections
      const serviceConnections = Array.from(this.connections.values())
        .filter(conn => service.connections.some(sc => sc.id === conn.id));

      for (const connection of serviceConnections) {
        await this.disconnectAPI(connection.id);
      }

      this.services.delete(serviceId);

      // Uninstall via IPC
      await (window.electronAPI as any).api.uninstallService(serviceId);

      this.emit('serviceUninstalled', { serviceId });
      return true;
    } catch (error) {
      console.error(`Failed to uninstall service ${serviceId}:`, error);
      return false;
    }
  }

  // Connection Management
  async createConnection(connectionData: Partial<APIConnection>): Promise<string> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const connection: APIConnection = {
      id,
      name: connectionData.name || 'New Connection',
      description: connectionData.description || '',
      baseUrl: connectionData.baseUrl || '',
      endpoints: connectionData.endpoints || [],
      authentication: connectionData.authentication || { type: 'none', config: {}, isValid: false },
      defaultHeaders: connectionData.defaultHeaders || {},
      timeout: connectionData.timeout || 30000,
      retries: connectionData.retries || 3,
      status: 'disconnected',
      isActive: connectionData.isActive ?? true,
      metadata: connectionData.metadata || {}
    };

    this.connections.set(id, connection);
    
    // Save via IPC
    await (window.electronAPI as any).api.saveConnection(connection);
    
    this.emit('connectionCreated', { connectionId: id, connection });
    return id;
  }

  async updateConnection(connectionId: string, updates: Partial<APIConnection>): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      const updatedConnection = { ...connection, ...updates, id: connectionId };
      this.connections.set(connectionId, updatedConnection);
      
      // Save via IPC
      await (window.electronAPI as any).api.saveConnection(updatedConnection);
      
      this.emit('connectionUpdated', { connectionId, connection: updatedConnection });
      return true;
    } catch (error) {
      console.error(`Failed to update connection ${connectionId}:`, error);
      return false;
    }
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return false;
      }

      // Disconnect if connected
      if (connection.status === 'connected') {
        await this.disconnectAPI(connectionId);
      }

      this.connections.delete(connectionId);
      
      // Delete via IPC
      await (window.electronAPI as any).api.deleteConnection(connectionId);
      
      this.emit('connectionDeleted', { connectionId });
      return true;
    } catch (error) {
      console.error(`Failed to delete connection ${connectionId}:`, error);
      return false;
    }
  }

  async getConnections(): Promise<APIConnection[]> {
    return Array.from(this.connections.values());
  }

  async getConnection(connectionId: string): Promise<APIConnection | null> {
    return this.connections.get(connectionId) || null;
  }

  // API Operations
  async connectAPI(connectionId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      connection.status = 'testing';
      this.connections.set(connectionId, connection);

      // Test connection via IPC
      const result = await (window.electronAPI as any).api.testConnection(connectionId);
      
      if (result.success) {
        connection.status = 'connected';
        connection.lastConnected = new Date();
      } else {
        connection.status = 'error';
        throw new Error(result.error);
      }

      this.connections.set(connectionId, connection);
      this.emit('connectionEstablished', { connectionId, connection });
      return true;
    } catch (error) {
      console.error(`Failed to connect API ${connectionId}:`, error);
      const connection = this.connections.get(connectionId);
      if (connection) {
        connection.status = 'error';
        this.connections.set(connectionId, connection);
      }
      this.emit('connectionError', { connectionId, error });
      return false;
    }
  }

  async disconnectAPI(connectionId: string): Promise<boolean> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        return false;
      }

      connection.status = 'disconnected';
      this.connections.set(connectionId, connection);

      // Disconnect via IPC
      await (window.electronAPI as any).api.disconnectAPI(connectionId);

      this.emit('connectionClosed', { connectionId, connection });
      return true;
    } catch (error) {
      console.error(`Failed to disconnect API ${connectionId}:`, error);
      return false;
    }
  }

  async callAPI(endpointId: string, parameters: Record<string, any> = {}, requestBody?: any): Promise<APICall> {
    try {
      const endpoint = this.endpoints.get(endpointId);
      if (!endpoint) {
        throw new Error(`Endpoint ${endpointId} not found`);
      }

      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const call: APICall = {
        id: callId,
        endpointId,
        method: endpoint.method,
        url: endpoint.url,
        headers: endpoint.headers,
        parameters,
        requestBody,
        startTime: new Date(),
        success: false,
        userId: 'current-user', // TODO: Get from auth context
        metadata: {}
      };

      // Execute call via IPC
      const result = await (window.electronAPI as any).api.executeCall(call, endpoint);
      
      call.endTime = new Date();
      call.duration = call.endTime.getTime() - call.startTime.getTime();
      call.statusCode = result.statusCode;
      call.response = result.response;
      call.success = result.success;
      call.error = result.error;

      this.callHistory.set(callId, call);
      
      // Update analytics
      await this.updateAnalytics(endpointId, call);
      
      this.emit('apiCallCompleted', { callId, call });
      return call;
    } catch (error) {
      console.error(`Failed to call API endpoint ${endpointId}:`, error);
      throw error;
    }
  }

  // Endpoint Management
  async createEndpoint(endpointData: Partial<APIEndpoint>): Promise<string> {
    const id = `endpoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const endpoint: APIEndpoint = {
      id,
      name: endpointData.name || 'New Endpoint',
      description: endpointData.description || '',
      url: endpointData.url || '',
      method: endpointData.method || 'GET',
      headers: endpointData.headers || {},
      authentication: endpointData.authentication || { type: 'none', config: {}, isValid: false },
      parameters: endpointData.parameters || [],
      requestBody: endpointData.requestBody,
      responses: endpointData.responses || [],
      timeout: endpointData.timeout || 30000,
      retries: endpointData.retries || 3,
      tags: endpointData.tags || [],
      category: endpointData.category || 'Custom',
      isActive: endpointData.isActive ?? true,
      metadata: endpointData.metadata || {}
    };

    this.endpoints.set(id, endpoint);
    
    // Save via IPC
    await (window.electronAPI as any).api.saveEndpoint(endpoint);
    
    this.emit('endpointCreated', { endpointId: id, endpoint });
    return id;
  }

  async getEndpoints(): Promise<APIEndpoint[]> {
    return Array.from(this.endpoints.values());
  }

  async getEndpoint(endpointId: string): Promise<APIEndpoint | null> {
    return this.endpoints.get(endpointId) || null;
  }

  async testEndpoint(endpointId: string, parameters: Record<string, any> = {}): Promise<APITestResult> {
    try {
      const endpoint = this.endpoints.get(endpointId);
      if (!endpoint) {
        throw new Error(`Endpoint ${endpointId} not found`);
      }

      const startTime = Date.now();
      
      // Test via IPC
      const result = await (window.electronAPI as any).api.testEndpoint(endpointId, parameters);
      
      const responseTime = Date.now() - startTime;
      
      const testResult: APITestResult = {
        endpointId,
        success: result.success,
        statusCode: result.statusCode,
        responseTime,
        response: result.response,
        error: result.error,
        timestamp: new Date(),
        metadata: {}
      };

      // Store test result
      if (!this.testResults.has(endpointId)) {
        this.testResults.set(endpointId, []);
      }
      this.testResults.get(endpointId)!.push(testResult);

      // Update endpoint test status
      endpoint.lastTested = new Date();
      endpoint.testStatus = result.success ? 'success' : 'failure';
      this.endpoints.set(endpointId, endpoint);

      this.emit('endpointTested', { endpointId, testResult });
      return testResult;
    } catch (error) {
      console.error(`Failed to test endpoint ${endpointId}:`, error);
      throw error;
    }
  }

  // Marketplace
  async getMarketplace(): Promise<APIMarketplaceItem[]> {
    return Array.from(this.marketplaceItems.values());
  }

  async searchMarketplace(query: string, category?: string): Promise<APIMarketplaceItem[]> {
    const items = Array.from(this.marketplaceItems.values());
    return items.filter(item => {
      const matchesQuery = !query || 
        item.service.name.toLowerCase().includes(query.toLowerCase()) ||
        item.service.description.toLowerCase().includes(query.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = !category || item.service.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }

  // Analytics
  async getAnalytics(endpointId: string, period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<APIAnalytics | null> {
    return this.analytics.get(`${endpointId}_${period}`) || null;
  }

  async getCallHistory(endpointId?: string, limit: number = 100): Promise<APICall[]> {
    const calls = Array.from(this.callHistory.values());
    const filtered = endpointId ? calls.filter(c => c.endpointId === endpointId) : calls;
    return filtered.slice(0, limit).sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  // Private methods
  private async updateAnalytics(endpointId: string, call: APICall): Promise<void> {
    // Update analytics for different periods
    const periods: Array<'hour' | 'day' | 'week' | 'month'> = ['hour', 'day', 'week', 'month'];
    
    for (const period of periods) {
      const key = `${endpointId}_${period}`;
      let analytics = this.analytics.get(key);
      
      if (!analytics) {
        analytics = {
          endpointId,
          period,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          averageResponseTime: 0,
          errorRate: 0,
          topErrors: [],
          rateLimitHits: 0,
          dataTransferred: 0,
          timeline: []
        };
      }

      analytics.totalCalls++;
      if (call.success) {
        analytics.successfulCalls++;
      } else {
        analytics.failedCalls++;
        if (call.error) {
          const existingError = analytics.topErrors.find(e => e.error === call.error);
          if (existingError) {
            existingError.count++;
          } else {
            analytics.topErrors.push({ error: call.error, count: 1 });
          }
        }
      }

      if (call.duration) {
        analytics.averageResponseTime = (analytics.averageResponseTime + call.duration) / 2;
      }

      analytics.errorRate = analytics.failedCalls / analytics.totalCalls;

      this.analytics.set(key, analytics);
    }
  }

  private async loadServices(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).api.getServices();
      if (result.success) {
        result.data.forEach((service: APIService_Definition) => {
          this.services.set(service.id, service);
        });
      }
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  }

  private async loadConnections(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).api.getConnections();
      if (result.success) {
        result.data.forEach((connection: APIConnection) => {
          this.connections.set(connection.id, connection);
        });
      }
    } catch (error) {
      console.error('Failed to load connections:', error);
    }
  }

  private async loadEndpoints(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).api.getEndpoints();
      if (result.success) {
        result.data.forEach((endpoint: APIEndpoint) => {
          this.endpoints.set(endpoint.id, endpoint);
        });
      }
    } catch (error) {
      console.error('Failed to load endpoints:', error);
    }
  }

  private async loadMarketplace(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).api.getMarketplace();
      if (result.success) {
        result.data.forEach((item: APIMarketplaceItem) => {
          this.marketplaceItems.set(item.id, item);
        });
      }
    } catch (error) {
      console.error('Failed to load marketplace:', error);
    }
  }

  private async loadCallHistory(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).api.getCallHistory();
      if (result.success) {
        result.data.forEach((call: APICall) => {
          this.callHistory.set(call.id, call);
        });
      }
    } catch (error) {
      console.error('Failed to load call history:', error);
    }
  }

  private async initializeAnalytics(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).api.getAnalytics();
      if (result.success) {
        result.data.forEach((analytics: APIAnalytics) => {
          const key = `${analytics.endpointId}_${analytics.period}`;
          this.analytics.set(key, analytics);
        });
      }
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Disconnect all active connections
    const activeConnections = Array.from(this.connections.values())
      .filter(conn => conn.status === 'connected');

    for (const connection of activeConnections) {
      await this.disconnectAPI(connection.id);
    }

    // Clear all data
    this.services.clear();
    this.connections.clear();
    this.endpoints.clear();
    this.marketplaceItems.clear();
    this.callHistory.clear();
    this.testResults.clear();
    this.analytics.clear();

    this.removeAllListeners();
  }
}

export default APIService;