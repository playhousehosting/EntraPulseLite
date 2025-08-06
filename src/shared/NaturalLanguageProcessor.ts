// NaturalLanguageProcessor.ts
// Advanced natural language processing for complex automation commands

import { organizationalIntelligence } from './OrganizationalIntelligence';

interface ParsedCommand {
  intent: CommandIntent;
  entities: ExtractedEntity[];
  actions: ParsedAction[];
  conditions: ParsedCondition[];
  schedule?: ScheduleInfo;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  confidence: number;
  originalInput: string;
  executionPlan: ExecutionStep[];
}

interface CommandIntent {
  primary: string;
  secondary?: string;
  category: 'query' | 'automation' | 'analysis' | 'management' | 'reporting';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

interface ExtractedEntity {
  type: 'user' | 'group' | 'device' | 'app' | 'policy' | 'license' | 'tenant' | 'role' | 'location';
  value: string;
  confidence: number;
  context: string;
  attributes: Record<string, any>;
}

interface ParsedAction {
  verb: string;
  target: string;
  parameters: Record<string, any>;
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
  reversible: boolean;
}

interface ParsedCondition {
  type: 'if' | 'when' | 'where' | 'unless';
  field: string;
  operator: string;
  value: string;
  logicalOperator?: 'and' | 'or';
}

interface ScheduleInfo {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfWeek?: string;
  time?: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
}

interface ExecutionStep {
  stepId: string;
  description: string;
  service: string;
  endpoint: string;
  method: string;
  parameters: Record<string, any>;
  dependsOn: string[];
  estimated_duration: number;
  rollback?: ExecutionStep;
}

export class NaturalLanguageProcessor {
  private intentPatterns: Map<string, RegExp[]>;
  private entityPatterns: Map<string, RegExp>;
  private actionVerbs: Map<string, string[]>;
  private contextualMemory: Map<string, any>;

  constructor() {
    this.initializePatterns();
    this.contextualMemory = new Map();
  }

  private initializePatterns(): void {
    // Intent recognition patterns
    this.intentPatterns = new Map([
      ['query', [
        /\b(show|list|get|find|search|display|tell me|what|which|how many)\b/gi,
        /\b(who (is|are)|where (is|are))\b/gi
      ]],
      ['automation', [
        /\b(create|automate|set up|configure|build|generate|make)\b.*\b(workflow|automation|process|schedule)\b/gi,
        /\b(every|daily|weekly|monthly|when.*then|if.*then)\b/gi
      ]],
      ['management', [
        /\b(add|remove|delete|update|modify|change|assign|revoke|grant|disable|enable)\b/gi,
        /\b(manage|administer|control)\b/gi
      ]],
      ['analysis', [
        /\b(analyze|review|audit|assess|evaluate|compare|benchmark)\b/gi,
        /\b(insights|trends|patterns|anomalies|risks)\b/gi
      ]],
      ['reporting', [
        /\b(report|dashboard|summary|export|send|email|notify)\b/gi,
        /\b(generate.*report|create.*dashboard)\b/gi
      ]]
    ]);

    // Entity recognition patterns
    this.entityPatterns = new Map([
      ['user', /\b(users?|accounts?|employees?|people|persons?|individuals?)\b/gi],
      ['group', /\b(groups?|teams?|distribution lists?|security groups?)\b/gi],
      ['device', /\b(devices?|computers?|laptops?|phones?|tablets?|endpoints?)\b/gi],
      ['app', /\b(apps?|applications?|software|programs?|services?)\b/gi],
      ['policy', /\b(policies|policy|rules?|conditional access|compliance|configuration)\b/gi],
      ['license', /\b(licenses?|subscriptions?|plans?|SKUs?)\b/gi],
      ['role', /\b(roles?|permissions?|access|privileges?|admin|administrator)\b/gi],
      ['location', /\b(locations?|countries?|regions?|offices?|sites?)\b/gi]
    ]);

    // Action verb mappings
    this.actionVerbs = new Map([
      ['create', ['create', 'add', 'new', 'make', 'build', 'generate', 'establish']],
      ['read', ['show', 'list', 'get', 'find', 'search', 'display', 'view', 'retrieve']],
      ['update', ['update', 'modify', 'change', 'edit', 'alter', 'adjust', 'configure']],
      ['delete', ['delete', 'remove', 'destroy', 'eliminate', 'purge', 'clear']],
      ['assign', ['assign', 'grant', 'give', 'provide', 'allocate', 'distribute']],
      ['revoke', ['revoke', 'remove', 'take away', 'withdraw', 'deny', 'block']],
      ['enable', ['enable', 'activate', 'turn on', 'start', 'allow', 'permit']],
      ['disable', ['disable', 'deactivate', 'turn off', 'stop', 'prevent', 'block']],
      ['analyze', ['analyze', 'review', 'audit', 'assess', 'evaluate', 'examine', 'inspect']]
    ]);
  }

  /**
   * MAIN PROCESSING FUNCTION
   */
  async processNaturalLanguage(input: string, sessionContext?: string): Promise<ParsedCommand> {
    console.log(`🧠 Processing: "${input}"`);
    
    // Get organizational context
    const orgContext = organizationalIntelligence.getRelevantContext(input);
    
    // Extract basic components
    const intent = this.extractIntent(input);
    const entities = this.extractEntities(input);
    const actions = this.extractActions(input);
    const conditions = this.extractConditions(input);
    const schedule = this.extractSchedule(input);
    
    // Determine complexity
    const complexity = this.assessComplexity(intent, entities, actions, conditions, schedule);
    
    // Generate execution plan
    const executionPlan = await this.generateExecutionPlan(intent, entities, actions, conditions);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(intent, entities, actions);

    const parsedCommand: ParsedCommand = {
      intent,
      entities,
      actions,
      conditions,
      schedule,
      complexity,
      confidence,
      originalInput: input,
      executionPlan
    };

    // Learn from this interaction
    await organizationalIntelligence.learnFromConversation(
      'current-session',
      input,
      `Intent: ${intent.primary}, Entities: ${entities.length}, Actions: ${actions.length}`,
      confidence > 0.7 ? 'success' : 'partial'
    );

    return parsedCommand;
  }

  /**
   * INTENT EXTRACTION
   */
  private extractIntent(input: string): CommandIntent {
    const inputLower = input.toLowerCase();
    let primaryIntent = 'query'; // default
    let category: 'query' | 'automation' | 'analysis' | 'management' | 'reporting' = 'query';
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    // Check each intent pattern
    for (const [intentName, patterns] of this.intentPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(inputLower)) {
          primaryIntent = intentName;
          category = intentName as any;
          break;
        }
      }
      if (primaryIntent !== 'query') break;
    }

    // Determine urgency
    if (/\b(urgent|asap|immediately|critical|emergency|now)\b/gi.test(inputLower)) {
      urgency = 'critical';
    } else if (/\b(soon|quickly|fast|priority|important)\b/gi.test(inputLower)) {
      urgency = 'high';
    } else if (/\b(later|eventually|when possible|low priority)\b/gi.test(inputLower)) {
      urgency = 'low';
    }

    // Extract secondary intent
    let secondary: string | undefined;
    if (primaryIntent === 'automation' && /report|dashboard|notify/gi.test(inputLower)) {
      secondary = 'reporting';
    } else if (primaryIntent === 'management' && /analyze|review/gi.test(inputLower)) {
      secondary = 'analysis';
    }

    return { primary: primaryIntent, secondary, category, urgency };
  }

  /**
   * ENTITY EXTRACTION
   */
  private extractEntities(input: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const inputLower = input.toLowerCase();

    // Extract entities using patterns
    for (const [entityType, pattern] of this.entityPatterns.entries()) {
      const matches = inputLower.match(pattern);
      if (matches) {
        for (const match of matches) {
          const entity: ExtractedEntity = {
            type: entityType as any,
            value: match,
            confidence: this.calculateEntityConfidence(entityType, match, input),
            context: this.extractEntityContext(match, input),
            attributes: this.extractEntityAttributes(entityType, match, input)
          };
          entities.push(entity);
        }
      }
    }

    // Extract specific identifiers (emails, UPNs, GUIDs, etc.)
    const specificPatterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      guid: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      upn: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      department: /\b(IT|HR|Finance|Marketing|Sales|Engineering|Operations|Legal|Admin)\b/gi,
      country: /\b(US|USA|UK|Canada|Australia|Germany|France|Japan|India|Brazil)\b/gi
    };

    for (const [type, pattern] of Object.entries(specificPatterns)) {
      const matches = input.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: this.mapSpecificTypeToEntity(type) as any,
            value: match,
            confidence: 0.9,
            context: type,
            attributes: { specificType: type }
          });
        }
      }
    }

    return entities;
  }

  private calculateEntityConfidence(entityType: string, match: string, fullInput: string): number {
    let confidence = 0.7; // base confidence

    // Increase confidence for specific matches
    if (match.includes('@')) confidence += 0.2;
    if (match.length > 10) confidence += 0.1;
    if (fullInput.toLowerCase().includes(`all ${match}`)) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private extractEntityContext(match: string, fullInput: string): string {
    const words = fullInput.split(' ');
    const matchIndex = words.findIndex(word => word.toLowerCase().includes(match.toLowerCase()));
    
    if (matchIndex === -1) return '';

    // Get surrounding context (2 words before and after)
    const start = Math.max(0, matchIndex - 2);
    const end = Math.min(words.length, matchIndex + 3);
    return words.slice(start, end).join(' ');
  }

  private extractEntityAttributes(entityType: string, match: string, fullInput: string): Record<string, any> {
    const attributes: Record<string, any> = {};

    // Extract quantifiers
    const quantifierPattern = /\b(all|some|most|few|many|several|\d+)\b/gi;
    const quantifierMatch = fullInput.match(quantifierPattern);
    if (quantifierMatch) {
      attributes.quantifier = quantifierMatch[0];
    }

    // Extract filters
    if (fullInput.includes('where') || fullInput.includes('with')) {
      attributes.hasFilters = true;
    }

    // Entity-specific attributes
    switch (entityType) {
      case 'user':
        if (fullInput.includes('guest')) attributes.userType = 'guest';
        if (fullInput.includes('admin')) attributes.role = 'admin';
        if (fullInput.includes('inactive')) attributes.status = 'inactive';
        break;
      
      case 'group':
        if (fullInput.includes('security')) attributes.groupType = 'security';
        if (fullInput.includes('distribution')) attributes.groupType = 'distribution';
        break;
      
      case 'device':
        if (fullInput.includes('compliant')) attributes.complianceStatus = 'compliant';
        if (fullInput.includes('managed')) attributes.managementType = 'managed';
        break;
    }

    return attributes;
  }

  private mapSpecificTypeToEntity(specificType: string): string {
    const mapping: Record<string, string> = {
      email: 'user',
      upn: 'user',
      guid: 'app',
      department: 'group',
      country: 'location'
    };
    return mapping[specificType] || 'tenant';
  }

  /**
   * ACTION EXTRACTION
   */
  private extractActions(input: string): ParsedAction[] {
    const actions: ParsedAction[] = [];
    const inputLower = input.toLowerCase();

    // Find action verbs
    for (const [actionCategory, verbs] of this.actionVerbs.entries()) {
      for (const verb of verbs) {
        if (inputLower.includes(verb)) {
          const target = this.findActionTarget(verb, input);
          const parameters = this.extractActionParameters(verb, input);
          const dependencies = this.findActionDependencies(verb, input);

          actions.push({
            verb: actionCategory,
            target,
            parameters,
            dependencies,
            riskLevel: this.assessActionRisk(actionCategory, target),
            reversible: this.isActionReversible(actionCategory)
          });
        }
      }
    }

    return actions;
  }

  private findActionTarget(verb: string, input: string): string {
    const words = input.split(' ');
    const verbIndex = words.findIndex(word => word.toLowerCase().includes(verb.toLowerCase()));
    
    if (verbIndex === -1 || verbIndex >= words.length - 1) return 'unknown';

    // Look for target in next few words
    for (let i = verbIndex + 1; i < Math.min(words.length, verbIndex + 4); i++) {
      const word = words[i].toLowerCase();
      
      // Check against entity patterns
      for (const [entityType, pattern] of this.entityPatterns.entries()) {
        if (pattern.test(word)) {
          return entityType;
        }
      }
    }

    return words[verbIndex + 1] || 'unknown';
  }

  private extractActionParameters(verb: string, input: string): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Extract common parameters
    const paramPatterns = {
      count: /\b(\d+)\b/g,
      timeframe: /\b(last|past|next)\s+(\d+)\s+(days?|weeks?|months?|years?)\b/gi,
      location: /\bin\s+([A-Za-z\s]+)/gi,
      department: /\bin\s+(IT|HR|Finance|Marketing|Sales|Engineering|Operations|Legal|Admin)\b/gi,
      status: /\b(active|inactive|enabled|disabled|compliant|non-compliant)\b/gi
    };

    for (const [paramName, pattern] of Object.entries(paramPatterns)) {
      const matches = input.match(pattern);
      if (matches) {
        parameters[paramName] = matches[0];
      }
    }

    return parameters;
  }

  private findActionDependencies(verb: string, input: string): string[] {
    const dependencies: string[] = [];

    // Check for sequential actions
    if (input.includes('then') || input.includes('after') || input.includes('and then')) {
      dependencies.push('sequential_execution');
    }

    // Check for conditional dependencies
    if (input.includes('if') || input.includes('when') || input.includes('where')) {
      dependencies.push('conditional_execution');
    }

    return dependencies;
  }

  private assessActionRisk(action: string, target: string): 'low' | 'medium' | 'high' {
    const highRiskActions = ['delete', 'revoke', 'disable'];
    const highRiskTargets = ['user', 'policy', 'role'];

    if (highRiskActions.includes(action) && highRiskTargets.includes(target)) {
      return 'high';
    }

    if (highRiskActions.includes(action) || (action === 'assign' && target === 'role')) {
      return 'medium';
    }

    return 'low';
  }

  private isActionReversible(action: string): boolean {
    const reversibleActions = ['create', 'update', 'assign', 'enable', 'disable'];
    return reversibleActions.includes(action);
  }

  /**
   * CONDITION EXTRACTION
   */
  private extractConditions(input: string): ParsedCondition[] {
    const conditions: ParsedCondition[] = [];
    const inputLower = input.toLowerCase();

    // Conditional patterns
    const conditionalPatterns = [
      { type: 'if', pattern: /\bif\s+(.+?)\s+(then|,|\b(?:and|or)\b)/gi },
      { type: 'when', pattern: /\bwhen\s+(.+?)\s+(then|,|\b(?:and|or)\b)/gi },
      { type: 'where', pattern: /\bwhere\s+(.+?)(?:\s+(?:and|or)\b|\s*$)/gi },
      { type: 'unless', pattern: /\bunless\s+(.+?)(?:\s+(?:and|or)\b|\s*$)/gi }
    ];

    for (const { type, pattern } of conditionalPatterns) {
      const matches = [...input.matchAll(pattern)];
      
      for (const match of matches) {
        const conditionText = match[1];
        const parsedCondition = this.parseConditionText(conditionText, type as any);
        if (parsedCondition) {
          conditions.push(parsedCondition);
        }
      }
    }

    return conditions;
  }

  private parseConditionText(conditionText: string, type: ParsedCondition['type']): ParsedCondition | null {
    const conditionLower = conditionText.toLowerCase().trim();
    
    // Common condition patterns
    const patterns = [
      { field: 'status', operator: 'equals', pattern: /\b(is|are|equals?)\s+(active|inactive|enabled|disabled|compliant)/i },
      { field: 'location', operator: 'in', pattern: /\b(in|from|at)\s+([a-z\s]+)/i },
      { field: 'department', operator: 'equals', pattern: /\b(in|from)\s+(IT|HR|Finance|Marketing|Sales|Engineering)/i },
      { field: 'count', operator: 'greater_than', pattern: /\bmore than\s+(\d+)/i },
      { field: 'count', operator: 'less_than', pattern: /\bless than\s+(\d+)/i },
      { field: 'time', operator: 'within', pattern: /\bwithin\s+(\d+)\s+(days?|weeks?|months?)/i },
      { field: 'risk', operator: 'equals', pattern: /\b(high|medium|low)\s+risk/i }
    ];

    for (const pattern of patterns) {
      const match = conditionLower.match(pattern.pattern);
      if (match) {
        return {
          type,
          field: pattern.field,
          operator: pattern.operator,
          value: match[1] || match[0],
          logicalOperator: this.extractLogicalOperator(conditionText)
        };
      }
    }

    return null;
  }

  private extractLogicalOperator(text: string): 'and' | 'or' | undefined {
    if (/\band\b/i.test(text)) return 'and';
    if (/\bor\b/i.test(text)) return 'or';
    return undefined;
  }

  /**
   * SCHEDULE EXTRACTION
   */
  private extractSchedule(input: string): ScheduleInfo | undefined {
    const inputLower = input.toLowerCase();

    // Schedule patterns
    const schedulePatterns = {
      once: /\b(once|one time|single time)\b/gi,
      daily: /\b(daily|every day|each day)\b/gi,
      weekly: /\b(weekly|every week|each week)\b/gi,
      monthly: /\b(monthly|every month|each month)\b/gi,
      quarterly: /\b(quarterly|every quarter)\b/gi,
      yearly: /\b(yearly|annually|every year)\b/gi
    };

    for (const [frequency, pattern] of Object.entries(schedulePatterns)) {
      if (pattern.test(inputLower)) {
        const schedule: ScheduleInfo = {
          frequency: frequency as any
        };

        // Extract specific day
        const dayMatch = inputLower.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
        if (dayMatch) {
          schedule.dayOfWeek = dayMatch[0];
        }

        // Extract time
        const timeMatch = inputLower.match(/\bat\s+(\d{1,2}:\d{2}(?:\s?[ap]m)?|\d{1,2}\s?[ap]m)/);
        if (timeMatch) {
          schedule.time = timeMatch[1];
        }

        return schedule;
      }
    }

    return undefined;
  }

  /**
   * COMPLEXITY ASSESSMENT
   */
  private assessComplexity(
    intent: CommandIntent,
    entities: ExtractedEntity[],
    actions: ParsedAction[],
    conditions: ParsedCondition[],
    schedule?: ScheduleInfo
  ): 'simple' | 'moderate' | 'complex' | 'enterprise' {
    let complexityScore = 0;

    // Base complexity from intent
    if (intent.category === 'query') complexityScore += 1;
    else if (intent.category === 'management') complexityScore += 2;
    else if (intent.category === 'automation') complexityScore += 3;
    else if (intent.category === 'analysis') complexityScore += 4;

    // Entity complexity
    complexityScore += entities.length;
    if (entities.some(e => e.attributes.hasFilters)) complexityScore += 2;

    // Action complexity
    complexityScore += actions.length * 2;
    if (actions.some(a => a.riskLevel === 'high')) complexityScore += 3;
    if (actions.some(a => a.dependencies.length > 0)) complexityScore += 2;

    // Condition complexity
    complexityScore += conditions.length * 2;

    // Schedule complexity
    if (schedule && schedule.frequency !== 'once') complexityScore += 2;

    // Determine complexity level
    if (complexityScore <= 3) return 'simple';
    if (complexityScore <= 8) return 'moderate';
    if (complexityScore <= 15) return 'complex';
    return 'enterprise';
  }

  /**
   * EXECUTION PLAN GENERATION
   */
  private async generateExecutionPlan(
    intent: CommandIntent,
    entities: ExtractedEntity[],
    actions: ParsedAction[],
    conditions: ParsedCondition[]
  ): Promise<ExecutionStep[]> {
    const executionPlan: ExecutionStep[] = [];
    let stepId = 1;

    // Generate steps based on actions
    for (const action of actions) {
      const steps = await this.generateStepsForAction(action, entities, stepId);
      executionPlan.push(...steps);
      stepId += steps.length;
    }

    // Add validation steps
    if (actions.some(a => a.riskLevel === 'high')) {
      executionPlan.unshift({
        stepId: 'validation-1',
        description: 'Validate high-risk operation permissions and prerequisites',
        service: 'Microsoft Graph - Validation',
        endpoint: '/me/checkMemberGroups',
        method: 'POST',
        parameters: { groupIds: ['admin-role-check'] },
        dependsOn: [],
        estimated_duration: 30
      });
    }

    // Add condition checks
    for (const condition of conditions) {
      const conditionStep = this.generateConditionStep(condition, stepId++);
      if (conditionStep) {
        executionPlan.unshift(conditionStep);
      }
    }

    return executionPlan;
  }

  private async generateStepsForAction(action: ParsedAction, entities: ExtractedEntity[], startStepId: number): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = [];
    
    // Map action to Microsoft Graph operations
    const serviceMapping = this.mapActionToService(action.verb, action.target);
    
    steps.push({
      stepId: `step-${startStepId}`,
      description: `${action.verb} ${action.target} with specified parameters`,
      service: serviceMapping.service,
      endpoint: serviceMapping.endpoint,
      method: serviceMapping.method,
      parameters: this.buildActionParameters(action, entities),
      dependsOn: action.dependencies,
      estimated_duration: this.estimateStepDuration(action),
      rollback: action.reversible ? this.generateRollbackStep(action) : undefined
    });

    return steps;
  }

  private mapActionToService(verb: string, target: string): { service: string; endpoint: string; method: string } {
    const mappings: Record<string, Record<string, { service: string; endpoint: string; method: string }>> = {
      'create': {
        'user': { service: 'Microsoft Graph - Users', endpoint: '/users', method: 'POST' },
        'group': { service: 'Microsoft Graph - Groups', endpoint: '/groups', method: 'POST' },
        'device': { service: 'Microsoft Intune', endpoint: '/deviceManagement/managedDevices', method: 'POST' },
        'policy': { service: 'Microsoft Graph - Policies', endpoint: '/identity/conditionalAccess/policies', method: 'POST' }
      },
      'read': {
        'user': { service: 'Microsoft Graph - Users', endpoint: '/users', method: 'GET' },
        'group': { service: 'Microsoft Graph - Groups', endpoint: '/groups', method: 'GET' },
        'device': { service: 'Microsoft Intune', endpoint: '/deviceManagement/managedDevices', method: 'GET' },
        'policy': { service: 'Microsoft Graph - Policies', endpoint: '/identity/conditionalAccess/policies', method: 'GET' }
      },
      'update': {
        'user': { service: 'Microsoft Graph - Users', endpoint: '/users/{id}', method: 'PATCH' },
        'group': { service: 'Microsoft Graph - Groups', endpoint: '/groups/{id}', method: 'PATCH' },
        'device': { service: 'Microsoft Intune', endpoint: '/deviceManagement/managedDevices/{id}', method: 'PATCH' },
        'policy': { service: 'Microsoft Graph - Policies', endpoint: '/identity/conditionalAccess/policies/{id}', method: 'PATCH' }
      },
      'delete': {
        'user': { service: 'Microsoft Graph - Users', endpoint: '/users/{id}', method: 'DELETE' },
        'group': { service: 'Microsoft Graph - Groups', endpoint: '/groups/{id}', method: 'DELETE' },
        'device': { service: 'Microsoft Intune', endpoint: '/deviceManagement/managedDevices/{id}', method: 'DELETE' },
        'policy': { service: 'Microsoft Graph - Policies', endpoint: '/identity/conditionalAccess/policies/{id}', method: 'DELETE' }
      }
    };

    return mappings[verb]?.[target] || { 
      service: 'Microsoft Graph', 
      endpoint: `/${target}`, 
      method: verb === 'read' ? 'GET' : 'POST' 
    };
  }

  private buildActionParameters(action: ParsedAction, entities: ExtractedEntity[]): Record<string, any> {
    const parameters: Record<string, any> = { ...action.parameters };

    // Add entity-specific parameters
    entities.forEach(entity => {
      if (entity.type === 'user' && action.target === 'user') {
        parameters.userPrincipalName = entity.value;
      } else if (entity.type === 'group' && action.target === 'group') {
        parameters.displayName = entity.value;
      }
      
      // Add entity attributes as parameters
      Object.assign(parameters, entity.attributes);
    });

    return parameters;
  }

  private estimateStepDuration(action: ParsedAction): number {
    const baseDurations: Record<string, number> = {
      'read': 10,
      'create': 30,
      'update': 20,
      'delete': 15,
      'assign': 25
    };

    let duration = baseDurations[action.verb] || 20;
    
    // Adjust for risk level
    if (action.riskLevel === 'high') duration += 10;
    
    // Adjust for dependencies
    duration += action.dependencies.length * 5;

    return duration;
  }

  private generateRollbackStep(action: ParsedAction): ExecutionStep | undefined {
    const rollbackActions: Record<string, string> = {
      'create': 'delete',
      'update': 'update', // Would need to store original values
      'assign': 'revoke',
      'enable': 'disable',
      'disable': 'enable'
    };

    const rollbackVerb = rollbackActions[action.verb];
    if (!rollbackVerb) return undefined;

    return {
      stepId: `rollback-${action.verb}`,
      description: `Rollback ${action.verb} operation`,
      service: 'Microsoft Graph - Rollback',
      endpoint: '/rollback',
      method: 'POST',
      parameters: { originalAction: action },
      dependsOn: [],
      estimated_duration: 15
    };
  }

  private generateConditionStep(condition: ParsedCondition, stepId: number): ExecutionStep | null {
    // Generate validation step for condition
    return {
      stepId: `condition-${stepId}`,
      description: `Check condition: ${condition.field} ${condition.operator} ${condition.value}`,
      service: 'Microsoft Graph - Query',
      endpoint: this.mapConditionToEndpoint(condition),
      method: 'GET',
      parameters: this.buildConditionParameters(condition),
      dependsOn: [],
      estimated_duration: 10
    };
  }

  private mapConditionToEndpoint(condition: ParsedCondition): string {
    const endpointMap: Record<string, string> = {
      'status': '/users',
      'location': '/users',
      'department': '/users',
      'count': '/users/$count',
      'risk': '/identityProtection/riskyUsers'
    };

    return endpointMap[condition.field] || '/query';
  }

  private buildConditionParameters(condition: ParsedCondition): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Build filter based on condition
    if (condition.operator === 'equals') {
      parameters.$filter = `${condition.field} eq '${condition.value}'`;
    } else if (condition.operator === 'in') {
      parameters.$filter = `${condition.field} eq '${condition.value}'`;
    } else if (condition.operator === 'greater_than') {
      parameters.$filter = `${condition.field} gt ${condition.value}`;
    } else if (condition.operator === 'less_than') {
      parameters.$filter = `${condition.field} lt ${condition.value}`;
    }

    return parameters;
  }

  /**
   * CONFIDENCE CALCULATION
   */
  private calculateConfidence(intent: CommandIntent, entities: ExtractedEntity[], actions: ParsedAction[]): number {
    let confidence = 0.5; // base confidence

    // Intent confidence
    if (intent.primary !== 'query') confidence += 0.1;
    if (intent.urgency === 'critical') confidence += 0.1;

    // Entity confidence
    const avgEntityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / (entities.length || 1);
    confidence += avgEntityConfidence * 0.3;

    // Action confidence
    if (actions.length > 0) {
      confidence += 0.2;
      if (actions.every(a => a.riskLevel !== 'high')) confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * PUBLIC METHODS
   */
  public async createAutomationWorkflow(parsedCommand: ParsedCommand): Promise<string> {
    // Convert parsed command to automation workflow
    const workflow = await organizationalIntelligence.parseAutomationRequest(parsedCommand.originalInput);
    
    return `Created automation workflow: ${workflow.name} with ${workflow.generatedSteps.length} steps`;
  }

  public getParsingInsights(parsedCommand: ParsedCommand): string[] {
    const insights: string[] = [];

    if (parsedCommand.complexity === 'enterprise') {
      insights.push('This is a complex enterprise-level operation that may require approval.');
    }

    if (parsedCommand.actions.some(a => a.riskLevel === 'high')) {
      insights.push('High-risk operations detected. Additional validation recommended.');
    }

    if (parsedCommand.schedule) {
      insights.push(`Scheduled operation: ${parsedCommand.schedule.frequency}`);
    }

    if (parsedCommand.confidence < 0.7) {
      insights.push('Low confidence parsing. Please verify the interpretation is correct.');
    }

    return insights;
  }
}

// Singleton instance
export const naturalLanguageProcessor = new NaturalLanguageProcessor();