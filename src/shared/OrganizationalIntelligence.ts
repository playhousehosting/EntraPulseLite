// OrganizationalIntelligence.ts
// Core intelligence system that learns and remembers organizational context

interface OrganizationalContext {
  tenantInfo: {
    id: string;
    name: string;
    domain: string;
    industry?: string;
    size?: 'small' | 'medium' | 'large' | 'enterprise';
    regions: string[];
  };
  userPatterns: Map<string, UserPattern>;
  groupStructure: Map<string, GroupInfo>;
  businessProcesses: Map<string, BusinessProcess>;
  conversationHistory: ConversationMemory[];
  predictions: PredictiveInsight[];
  automations: AutomationWorkflow[];
}

interface UserPattern {
  userId: string;
  displayName: string;
  role: string;
  department: string;
  signInPatterns: {
    typicalHours: { start: number; end: number };
    commonLocations: string[];
    deviceTypes: string[];
    riskProfile: 'low' | 'medium' | 'high';
  };
  accessPatterns: {
    frequentlyUsedApps: string[];
    resourceAccess: string[];
    permissionLevel: string;
  };
  behaviorAnalysis: {
    lastActive: Date;
    productivityScore?: number;
    securityRiskScore?: number;
    licenseUtilization: number;
  };
}

interface GroupInfo {
  groupId: string;
  displayName: string;
  groupType: 'Security' | 'Distribution' | 'Microsoft365';
  purpose: string;
  memberCount: number;
  membershipPatterns: {
    averageTenure: number;
    turnoverRate: number;
    roleDistribution: Record<string, number>;
  };
  associatedPolicies: string[];
  businessFunction: string;
}

interface BusinessProcess {
  processId: string;
  name: string;
  description: string;
  steps: ProcessStep[];
  triggers: ProcessTrigger[];
  stakeholders: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc';
  automationOpportunities: AutomationOpportunity[];
}

interface ProcessStep {
  stepId: string;
  description: string;
  requiredRoles: string[];
  estimatedTime: number;
  automatable: boolean;
  dependencies: string[];
}

interface ProcessTrigger {
  type: 'schedule' | 'event' | 'condition';
  value: string;
  description: string;
}

interface AutomationOpportunity {
  type: 'full' | 'partial';
  confidence: number;
  estimatedTimeSavings: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  description: string;
}

interface ConversationMemory {
  sessionId: string;
  timestamp: Date;
  userQuery: string;
  context: string;
  outcome: 'success' | 'partial' | 'failed';
  learnings: string[];
  relatedEntities: string[];
}

interface PredictiveInsight {
  insightId: string;
  type: 'security' | 'performance' | 'compliance' | 'cost' | 'productivity';
  prediction: string;
  confidence: number;
  timeframe: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
  dataPoints: any[];
}

interface AutomationWorkflow {
  workflowId: string;
  name: string;
  description: string;
  naturalLanguageInput: string;
  generatedSteps: WorkflowStep[];
  services: string[];
  schedule?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  successRate: number;
  lastRun?: Date;
}

interface WorkflowStep {
  stepId: string;
  service: string;
  action: string;
  parameters: Record<string, any>;
  conditions?: string[];
  errorHandling: string;
}

export class OrganizationalIntelligence {
  private context: OrganizationalContext;
  private learning: boolean = true;

  constructor() {
    this.context = {
      tenantInfo: {
        id: '',
        name: '',
        domain: '',
        regions: []
      },
      userPatterns: new Map(),
      groupStructure: new Map(),
      businessProcesses: new Map(),
      conversationHistory: [],
      predictions: [],
      automations: []
    };
    this.loadPersistedContext();
  }

  /**
   * CORE INTELLIGENCE FUNCTIONS
   */

  // Learn from user interactions
  async learnFromConversation(sessionId: string, userQuery: string, context: string, outcome: string): Promise<void> {
    if (!this.learning) return;

    const memory: ConversationMemory = {
      sessionId,
      timestamp: new Date(),
      userQuery,
      context,
      outcome: outcome as any,
      learnings: this.extractLearnings(userQuery, context, outcome),
      relatedEntities: this.identifyEntities(userQuery, context)
    };

    this.context.conversationHistory.push(memory);

    // Analyze patterns and update organizational understanding
    await this.analyzeConversationPatterns();
    await this.persistContext();
  }

  // Extract learning insights from interactions
  private extractLearnings(query: string, context: string, outcome: string): string[] {
    const learnings: string[] = [];

    // Identify user preferences
    if (query.toLowerCase().includes('dashboard') || query.toLowerCase().includes('visualize')) {
      learnings.push('user_prefers_visual_data');
    }

    // Identify common workflows
    if (query.toLowerCase().includes('bulk') || query.toLowerCase().includes('all users')) {
      learnings.push('user_performs_bulk_operations');
    }

    // Identify automation opportunities
    if (query.toLowerCase().includes('every week') || query.toLowerCase().includes('daily')) {
      learnings.push('potential_automation_opportunity');
    }

    // Learn from failures
    if (outcome === 'failed') {
      learnings.push(`failed_query_pattern: ${query.substring(0, 50)}`);
    }

    return learnings;
  }

  // Identify entities mentioned in conversations
  private identifyEntities(query: string, context: string): string[] {
    const entities: string[] = [];
    
    // Common Microsoft 365 entities
    const entityPatterns = {
      users: /\b(user|users|account|accounts)\b/gi,
      groups: /\b(group|groups|team|teams)\b/gi,
      apps: /\b(app|apps|application|applications)\b/gi,
      policies: /\b(policy|policies|conditional access|ca)\b/gi,
      licenses: /\b(license|licenses|subscription|subscriptions)\b/gi
    };

    for (const [entity, pattern] of Object.entries(entityPatterns)) {
      if (pattern.test(query) || pattern.test(context)) {
        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * PREDICTIVE ANALYTICS
   */

  // Generate predictions based on learned patterns
  async generatePredictions(): Promise<PredictiveInsight[]> {
    const predictions: PredictiveInsight[] = [];

    // Analyze conversation patterns for predictions
    const recentConversations = this.context.conversationHistory
      .filter(conv => conv.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Last 30 days

    // Predict common user needs
    const queryPatterns = this.analyzeQueryPatterns(recentConversations);
    
    if (queryPatterns.userManagement > 5) {
      predictions.push({
        insightId: `pred-${Date.now()}-1`,
        type: 'productivity',
        prediction: 'High user management activity detected. Consider implementing bulk user operations automation.',
        confidence: 0.8,
        timeframe: 'next 7 days',
        impactLevel: 'medium',
        recommendedActions: [
          'Set up bulk user creation templates',
          'Create automated onboarding workflows',
          'Implement user lifecycle automation'
        ],
        dataPoints: queryPatterns
      });
    }

    // Predict security risks
    const securityQueries = recentConversations.filter(conv => 
      conv.userQuery.toLowerCase().includes('security') || 
      conv.userQuery.toLowerCase().includes('risk') ||
      conv.userQuery.toLowerCase().includes('conditional access')
    );

    if (securityQueries.length > 3) {
      predictions.push({
        insightId: `pred-${Date.now()}-2`,
        type: 'security',
        prediction: 'Increased security-related queries suggest potential security review needed.',
        confidence: 0.75,
        timeframe: 'next 14 days',
        impactLevel: 'high',
        recommendedActions: [
          'Conduct comprehensive security assessment',
          'Review conditional access policies',
          'Analyze user risk scores'
        ],
        dataPoints: securityQueries.map(q => ({ query: q.userQuery, timestamp: q.timestamp }))
      });
    }

    this.context.predictions = predictions;
    await this.persistContext();

    return predictions;
  }

  private analyzeQueryPatterns(conversations: ConversationMemory[]): Record<string, number> {
    const patterns = {
      userManagement: 0,
      groupManagement: 0,
      securityQueries: 0,
      reportingRequests: 0,
      bulkOperations: 0
    };

    conversations.forEach(conv => {
      const query = conv.userQuery.toLowerCase();
      
      if (query.includes('user') || query.includes('account')) patterns.userManagement++;
      if (query.includes('group') || query.includes('team')) patterns.groupManagement++;
      if (query.includes('security') || query.includes('risk') || query.includes('conditional')) patterns.securityQueries++;
      if (query.includes('report') || query.includes('dashboard') || query.includes('show')) patterns.reportingRequests++;
      if (query.includes('bulk') || query.includes('all')) patterns.bulkOperations++;
    });

    return patterns;
  }

  /**
   * NATURAL LANGUAGE AUTOMATION
   */

  // Parse natural language into automation workflows
  async parseAutomationRequest(naturalLanguageInput: string): Promise<AutomationWorkflow> {
    const workflowId = `workflow-${Date.now()}`;
    
    // Extract automation components
    const components = this.extractAutomationComponents(naturalLanguageInput);
    const steps = await this.generateWorkflowSteps(components);

    const workflow: AutomationWorkflow = {
      workflowId,
      name: this.generateWorkflowName(naturalLanguageInput),
      description: naturalLanguageInput,
      naturalLanguageInput,
      generatedSteps: steps,
      services: this.identifyRequiredServices(steps),
      schedule: components.schedule,
      status: 'draft',
      successRate: 0
    };

    this.context.automations.push(workflow);
    await this.persistContext();

    return workflow;
  }

  private extractAutomationComponents(input: string): any {
    const components: any = {
      triggers: [],
      actions: [],
      conditions: [],
      schedule: null,
      targets: []
    };

    // Extract schedule information
    const schedulePatterns = {
      daily: /\b(daily|every day)\b/gi,
      weekly: /\b(weekly|every week|fridays?)\b/gi,
      monthly: /\b(monthly|every month)\b/gi
    };

    for (const [schedule, pattern] of Object.entries(schedulePatterns)) {
      if (pattern.test(input)) {
        components.schedule = schedule;
        break;
      }
    }

    // Extract action verbs
    const actionPatterns = {
      create: /\b(create|add|new)\b/gi,
      update: /\b(update|modify|change)\b/gi,
      delete: /\b(delete|remove|disable)\b/gi,
      assign: /\b(assign|grant|give)\b/gi,
      report: /\b(report|email|notify|send)\b/gi
    };

    for (const [action, pattern] of Object.entries(actionPatterns)) {
      if (pattern.test(input)) {
        components.actions.push(action);
      }
    }

    // Extract targets
    const targetPatterns = {
      users: /\b(users?|accounts?|employees?)\b/gi,
      groups: /\b(groups?|teams?)\b/gi,
      devices: /\b(devices?|computers?)\b/gi,
      policies: /\b(policies|rules)\b/gi
    };

    for (const [target, pattern] of Object.entries(targetPatterns)) {
      if (pattern.test(input)) {
        components.targets.push(target);
      }
    }

    return components;
  }

  private async generateWorkflowSteps(components: any): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];
    let stepId = 1;

    // Generate steps based on identified components
    for (const action of components.actions) {
      for (const target of components.targets) {
        const step: WorkflowStep = {
          stepId: `step-${stepId++}`,
          service: this.mapTargetToService(target),
          action: this.mapActionToAPI(action, target),
          parameters: this.generateDefaultParameters(action, target),
          conditions: components.conditions,
          errorHandling: 'log_and_continue'
        };
        steps.push(step);
      }
    }

    return steps;
  }

  private mapTargetToService(target: string): string {
    const serviceMap: Record<string, string> = {
      'users': 'Microsoft Graph - Users',
      'groups': 'Microsoft Graph - Groups',
      'devices': 'Microsoft Intune',
      'policies': 'Microsoft Graph - Policies'
    };
    return serviceMap[target] || 'Microsoft Graph';
  }

  private mapActionToAPI(action: string, target: string): string {
    const actionMap: Record<string, Record<string, string>> = {
      'create': {
        'users': 'POST /users',
        'groups': 'POST /groups',
        'devices': 'POST /deviceManagement/managedDevices',
        'policies': 'POST /identity/conditionalAccess/policies'
      },
      'update': {
        'users': 'PATCH /users/{id}',
        'groups': 'PATCH /groups/{id}',
        'devices': 'PATCH /deviceManagement/managedDevices/{id}',
        'policies': 'PATCH /identity/conditionalAccess/policies/{id}'
      },
      'delete': {
        'users': 'DELETE /users/{id}',
        'groups': 'DELETE /groups/{id}',
        'devices': 'DELETE /deviceManagement/managedDevices/{id}',
        'policies': 'DELETE /identity/conditionalAccess/policies/{id}'
      }
    };

    return actionMap[action]?.[target] || `${action.toUpperCase()} /${target}`;
  }

  private generateDefaultParameters(action: string, target: string): Record<string, any> {
    // Generate sensible default parameters based on action and target
    const defaults: Record<string, any> = {};
    
    if (action === 'create' && target === 'users') {
      defaults.accountEnabled = true;
      defaults.passwordProfile = { forceChangePasswordNextSignIn: true };
      defaults.usageLocation = 'US';
    }

    return defaults;
  }

  private generateWorkflowName(input: string): string {
    // Generate a concise workflow name from natural language input
    const words = input.split(' ').slice(0, 5);
    return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  private identifyRequiredServices(steps: WorkflowStep[]): string[] {
    const services = new Set<string>();
    steps.forEach(step => services.add(step.service));
    return Array.from(services);
  }

  /**
   * CONTEXT MANAGEMENT
   */

  // Get relevant context for current conversation
  getRelevantContext(query: string): string {
    const relevantMemories = this.context.conversationHistory
      .filter(memory => {
        const queryWords = query.toLowerCase().split(' ');
        const memoryText = memory.userQuery.toLowerCase();
        return queryWords.some(word => memoryText.includes(word));
      })
      .slice(-5); // Last 5 relevant conversations

    const contextParts = [];

    if (relevantMemories.length > 0) {
      contextParts.push('Previous related conversations:');
      relevantMemories.forEach(memory => {
        contextParts.push(`- ${memory.userQuery} (${memory.outcome})`);
      });
    }

    // Add current predictions
    const relevantPredictions = this.context.predictions
      .filter(pred => pred.confidence > 0.7)
      .slice(0, 3);

    if (relevantPredictions.length > 0) {
      contextParts.push('\nRelevant predictions:');
      relevantPredictions.forEach(pred => {
        contextParts.push(`- ${pred.prediction} (${Math.round(pred.confidence * 100)}% confidence)`);
      });
    }

    return contextParts.join('\n');
  }

  // Suggest proactive actions based on learned patterns
  getProactiveSuggestions(): string[] {
    const suggestions: string[] = [];
    
    // Analyze recent activity patterns
    const recentActivity = this.context.conversationHistory
      .filter(conv => conv.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    const commonPatterns = this.analyzeQueryPatterns(recentActivity);

    if (commonPatterns.userManagement > 3) {
      suggestions.push('You\'ve been working with users frequently. Would you like me to create a bulk user management dashboard?');
    }

    if (commonPatterns.securityQueries > 2) {
      suggestions.push('I noticed security is a focus. Shall I run a comprehensive security assessment of your tenant?');
    }

    if (commonPatterns.reportingRequests > 2) {
      suggestions.push('You\'ve requested several reports. Would you like me to set up automated weekly reporting?');
    }

    return suggestions;
  }

  /**
   * PERSISTENCE
   */

  private async persistContext(): Promise<void> {
    try {
      const contextData = {
        tenantInfo: this.context.tenantInfo,
        userPatterns: Array.from(this.context.userPatterns.entries()),
        groupStructure: Array.from(this.context.groupStructure.entries()),
        businessProcesses: Array.from(this.context.businessProcesses.entries()),
        conversationHistory: this.context.conversationHistory.slice(-100), // Keep last 100 conversations
        predictions: this.context.predictions.slice(-20), // Keep last 20 predictions
        automations: this.context.automations
      };

      localStorage.setItem('organizationalIntelligence', JSON.stringify(contextData));
    } catch (error) {
      console.warn('Failed to persist organizational context:', error);
    }
  }

  private loadPersistedContext(): void {
    try {
      const stored = localStorage.getItem('organizationalIntelligence');
      if (stored) {
        const contextData = JSON.parse(stored);
        
        this.context.tenantInfo = contextData.tenantInfo || this.context.tenantInfo;
        this.context.userPatterns = new Map(contextData.userPatterns || []);
        this.context.groupStructure = new Map(contextData.groupStructure || []);
        this.context.businessProcesses = new Map(contextData.businessProcesses || []);
        this.context.conversationHistory = contextData.conversationHistory || [];
        this.context.predictions = contextData.predictions || [];
        this.context.automations = contextData.automations || [];
      }
    } catch (error) {
      console.warn('Failed to load organizational context:', error);
    }
  }

  /**
   * ANALYSIS & INSIGHTS
   */

  async analyzeConversationPatterns(): Promise<void> {
    // Analyze patterns in user interactions to identify business processes
    const conversations = this.context.conversationHistory;
    
    if (conversations.length < 5) return; // Need minimum data

    // Identify recurring themes
    const themes = this.identifyRecurringThemes(conversations);
    
    // Generate business process insights
    for (const theme of themes) {
      if (theme.frequency > 3) {
        const processId = `process-${theme.name.toLowerCase().replace(/\s+/g, '-')}`;
        
        if (!this.context.businessProcesses.has(processId)) {
          const businessProcess: BusinessProcess = {
            processId,
            name: theme.name,
            description: `Recurring process identified from user interactions`,
            steps: this.inferProcessSteps(theme.queries),
            triggers: [{ type: 'adhoc', value: 'user_initiated', description: 'User manually initiates process' }],
            stakeholders: ['current_user'],
            frequency: this.inferFrequency(theme.timestamps),
            automationOpportunities: this.identifyAutomationOpportunities(theme.queries)
          };

          this.context.businessProcesses.set(processId, businessProcess);
        }
      }
    }
  }

  private identifyRecurringThemes(conversations: ConversationMemory[]): any[] {
    const themes: Record<string, any> = {};

    conversations.forEach(conv => {
      const query = conv.userQuery.toLowerCase();
      
      // Identify theme categories
      if (query.includes('user') || query.includes('account')) {
        const theme = 'User Management';
        if (!themes[theme]) themes[theme] = { name: theme, queries: [], timestamps: [], frequency: 0 };
        themes[theme].queries.push(conv.userQuery);
        themes[theme].timestamps.push(conv.timestamp);
        themes[theme].frequency++;
      }

      if (query.includes('group') || query.includes('team')) {
        const theme = 'Group Management';
        if (!themes[theme]) themes[theme] = { name: theme, queries: [], timestamps: [], frequency: 0 };
        themes[theme].queries.push(conv.userQuery);
        themes[theme].timestamps.push(conv.timestamp);
        themes[theme].frequency++;
      }

      if (query.includes('policy') || query.includes('conditional access')) {
        const theme = 'Policy Management';
        if (!themes[theme]) themes[theme] = { name: theme, queries: [], timestamps: [], frequency: 0 };
        themes[theme].queries.push(conv.userQuery);
        themes[theme].timestamps.push(conv.timestamp);
        themes[theme].frequency++;
      }
    });

    return Object.values(themes);
  }

  private inferProcessSteps(queries: string[]): ProcessStep[] {
    const steps: ProcessStep[] = [];
    let stepId = 1;

    // Analyze query patterns to infer process steps
    const uniqueActions = [...new Set(queries.map(q => this.extractPrimaryAction(q)))];

    uniqueActions.forEach(action => {
      steps.push({
        stepId: `step-${stepId++}`,
        description: action,
        requiredRoles: ['Administrator'],
        estimatedTime: 5, // 5 minutes default
        automatable: this.isActionAutomatable(action),
        dependencies: []
      });
    });

    return steps;
  }

  private extractPrimaryAction(query: string): string {
    const actions = [
      { pattern: /create|add|new/gi, action: 'Create resource' },
      { pattern: /update|modify|change/gi, action: 'Update configuration' },
      { pattern: /delete|remove/gi, action: 'Remove resource' },
      { pattern: /list|show|get/gi, action: 'View information' },
      { pattern: /assign|grant/gi, action: 'Assign permissions' }
    ];

    for (const { pattern, action } of actions) {
      if (pattern.test(query)) {
        return action;
      }
    }

    return 'General administration';
  }

  private isActionAutomatable(action: string): boolean {
    const automatableActions = ['Create resource', 'Update configuration', 'Assign permissions'];
    return automatableActions.includes(action);
  }

  private inferFrequency(timestamps: Date[]): 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'adhoc' {
    if (timestamps.length < 2) return 'adhoc';

    const intervals = [];
    for (let i = 1; i < timestamps.length; i++) {
      const interval = timestamps[i].getTime() - timestamps[i-1].getTime();
      intervals.push(interval);
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const avgDays = avgInterval / (1000 * 60 * 60 * 24);

    if (avgDays <= 1) return 'daily';
    if (avgDays <= 7) return 'weekly';
    if (avgDays <= 30) return 'monthly';
    if (avgDays <= 90) return 'quarterly';
    return 'adhoc';
  }

  private identifyAutomationOpportunities(queries: string[]): AutomationOpportunity[] {
    const opportunities: AutomationOpportunity[] = [];

    const repetitivePatterns = this.findRepetitivePatterns(queries);
    
    for (const pattern of repetitivePatterns) {
      opportunities.push({
        type: pattern.complexity === 'low' ? 'full' : 'partial',
        confidence: pattern.frequency > 3 ? 0.8 : 0.6,
        estimatedTimeSavings: pattern.frequency * 10, // 10 minutes per occurrence
        implementationComplexity: pattern.complexity,
        description: `Automate repetitive ${pattern.action} operations`
      });
    }

    return opportunities;
  }

  private findRepetitivePatterns(queries: string[]): any[] {
    const patterns: any[] = [];
    const actionCounts: Record<string, number> = {};

    queries.forEach(query => {
      const action = this.extractPrimaryAction(query);
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    for (const [action, frequency] of Object.entries(actionCounts)) {
      if (frequency > 2) {
        patterns.push({
          action,
          frequency,
          complexity: this.assessComplexity(action)
        });
      }
    }

    return patterns;
  }

  private assessComplexity(action: string): 'low' | 'medium' | 'high' {
    const complexityMap: Record<string, 'low' | 'medium' | 'high'> = {
      'View information': 'low',
      'Create resource': 'medium',
      'Update configuration': 'medium',
      'Remove resource': 'high',
      'Assign permissions': 'high',
      'General administration': 'medium'
    };

    return complexityMap[action] || 'medium';
  }

  /**
   * PUBLIC API METHODS
   */

  public async initialize(): Promise<void> {
    await this.generatePredictions();
  }

  public enableLearning(): void {
    this.learning = true;
  }

  public disableLearning(): void {
    this.learning = false;
  }

  public getContext(): OrganizationalContext {
    return { ...this.context };
  }

  public async generateInsights(): Promise<{
    predictions: PredictiveInsight[];
    suggestions: string[];
    automationOpportunities: AutomationWorkflow[];
    businessProcesses: BusinessProcess[];
  }> {
    await this.generatePredictions();

    return {
      predictions: this.context.predictions,
      suggestions: this.getProactiveSuggestions(),
      automationOpportunities: this.context.automations,
      businessProcesses: Array.from(this.context.businessProcesses.values())
    };
  }
}

// Singleton instance
export const organizationalIntelligence = new OrganizationalIntelligence();