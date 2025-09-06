// Workflow Service
// Manages automated workflows, drag-and-drop workflow builder, and workflow execution

import EventEmitter from 'eventemitter3';

export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'data' | 'integration';
  category: 'Graph' | 'Analytics' | 'Security' | 'Email' | 'Teams' | 'Custom';
  name: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  inputs: WorkflowPort[];
  outputs: WorkflowPort[];
  config: Record<string, any>;
  status: 'idle' | 'running' | 'completed' | 'error' | 'disabled';
  lastRun?: Date;
  runCount: number;
  errorCount: number;
  metadata: Record<string, any>;
}

export interface WorkflowPort {
  id: string;
  name: string;
  type: 'data' | 'control' | 'event';
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  condition?: string;
  transformation?: string;
  metadata: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'Automation' | 'Analytics' | 'Security' | 'Compliance' | 'Custom';
  tags: string[];
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  schedule?: WorkflowSchedule;
  permissions: string[];
  created: Date;
  modified: Date;
  author: string;
  isActive: boolean;
  isTemplate: boolean;
  metadata: Record<string, any>;
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'schedule' | 'webhook' | 'event' | 'condition';
  name: string;
  config: Record<string, any>;
  isActive: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export interface WorkflowVariable {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'secret';
  value: any;
  description: string;
  isRequired: boolean;
  isSecret: boolean;
}

export interface WorkflowSchedule {
  type: 'once' | 'recurring';
  startDate: Date;
  endDate?: Date;
  cronExpression?: string;
  timezone: string;
  isActive: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  triggeredBy: string;
  triggerType: string;
  nodeExecutions: WorkflowNodeExecution[];
  variables: Record<string, any>;
  logs: WorkflowLog[];
  error?: string;
  metadata: Record<string, any>;
}

export interface WorkflowNodeExecution {
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input: any;
  output: any;
  error?: string;
  logs: string[];
}

export interface WorkflowLog {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  nodeId?: string;
  message: string;
  data?: any;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  version: string;
  workflow: Omit<WorkflowDefinition, 'id' | 'created' | 'modified' | 'author'>;
  screenshots: string[];
  documentation: string;
  rating: number;
  downloads: number;
  isOfficial: boolean;
  requirements: string[];
}

export interface WorkflowNodeType {
  type: string;
  category: string;
  name: string;
  description: string;
  icon: string;
  inputs: Omit<WorkflowPort, 'id'>[];
  outputs: Omit<WorkflowPort, 'id'>[];
  configSchema: Record<string, any>;
  examples: Array<{
    name: string;
    description: string;
    config: Record<string, any>;
  }>;
}

export class WorkflowService extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private templates: Map<string, WorkflowTemplate> = new Map();
  private nodeTypes: Map<string, WorkflowNodeType> = new Map();
  private activeExecutions: Set<string> = new Set();
  private isInitialized = false;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Load workflow definitions
      await this.loadWorkflows();
      
      // Load templates
      await this.loadTemplates();
      
      // Load node types
      await this.loadNodeTypes();
      
      // Load recent executions
      await this.loadRecentExecutions();
      
      // Initialize schedulers
      await this.initializeSchedulers();
      
      this.isInitialized = true;
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize Workflow Service:', error);
      this.emit('error', error);
    }
  }

  // Workflow Management
  async createWorkflow(definition: Partial<WorkflowDefinition>): Promise<string> {
    const id = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const workflow: WorkflowDefinition = {
      id,
      name: definition.name || 'New Workflow',
      description: definition.description || '',
      version: '1.0.0',
      category: definition.category || 'Custom',
      tags: definition.tags || [],
      nodes: definition.nodes || [],
      connections: definition.connections || [],
      triggers: definition.triggers || [],
      variables: definition.variables || [],
      schedule: definition.schedule,
      permissions: definition.permissions || [],
      created: new Date(),
      modified: new Date(),
      author: 'current-user', // TODO: Get from auth context
      isActive: definition.isActive ?? true,
      isTemplate: definition.isTemplate ?? false,
      metadata: definition.metadata || {}
    };

    this.workflows.set(id, workflow);
    
    // Save to persistent storage
    await this.saveWorkflow(workflow);
    
    this.emit('workflowCreated', { workflowId: id, workflow });
    return id;
  }

  async updateWorkflow(workflowId: string, updates: Partial<WorkflowDefinition>): Promise<boolean> {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      const updatedWorkflow = {
        ...workflow,
        ...updates,
        id: workflowId, // Ensure ID doesn't change
        modified: new Date()
      };

      this.workflows.set(workflowId, updatedWorkflow);
      
      // Save to persistent storage
      await this.saveWorkflow(updatedWorkflow);
      
      this.emit('workflowUpdated', { workflowId, workflow: updatedWorkflow });
      return true;
    } catch (error) {
      console.error(`Failed to update workflow ${workflowId}:`, error);
      return false;
    }
  }

  async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        return false;
      }

      // Stop if currently running
      if (this.activeExecutions.has(workflowId)) {
        await this.cancelExecution(workflowId);
      }

      this.workflows.delete(workflowId);
      
      // Delete from persistent storage
      await (window.electronAPI as any).workflow.deleteWorkflow(workflowId);
      
      this.emit('workflowDeleted', { workflowId });
      return true;
    } catch (error) {
      console.error(`Failed to delete workflow ${workflowId}:`, error);
      return false;
    }
  }

  async getWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    return this.workflows.get(workflowId) || null;
  }

  async getWorkflows(): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflows.values());
  }

  async searchWorkflows(query: string, category?: string): Promise<WorkflowDefinition[]> {
    const workflows = Array.from(this.workflows.values());
    return workflows.filter(workflow => {
      const matchesQuery = !query || 
        workflow.name.toLowerCase().includes(query.toLowerCase()) ||
        workflow.description.toLowerCase().includes(query.toLowerCase()) ||
        workflow.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));
      
      const matchesCategory = !category || workflow.category === category;
      
      return matchesQuery && matchesCategory;
    });
  }

  // Workflow Execution
  async executeWorkflow(workflowId: string, trigger: string = 'manual', variables: Record<string, any> = {}): Promise<string> {
    try {
      const workflow = this.workflows.get(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      if (!workflow.isActive) {
        throw new Error(`Workflow ${workflowId} is not active`);
      }

      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const execution: WorkflowExecution = {
        id: executionId,
        workflowId,
        status: 'running',
        startTime: new Date(),
        triggeredBy: 'current-user', // TODO: Get from auth context
        triggerType: trigger,
        nodeExecutions: [],
        variables: { ...workflow.variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {}), ...variables },
        logs: [],
        metadata: {}
      };

      this.executions.set(executionId, execution);
      this.activeExecutions.add(workflowId);

      this.emit('executionStarted', { executionId, workflowId, execution });

      // Execute workflow asynchronously
      this.runWorkflowExecution(execution, workflow).catch(error => {
        console.error(`Workflow execution ${executionId} failed:`, error);
        execution.status = 'failed';
        execution.error = error.message;
        execution.endTime = new Date();
        this.activeExecutions.delete(workflowId);
        this.emit('executionFailed', { executionId, workflowId, execution, error });
      });

      return executionId;
    } catch (error) {
      console.error(`Failed to start workflow execution:`, error);
      throw error;
    }
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      const execution = this.executions.get(executionId);
      if (!execution) {
        return false;
      }

      if (execution.status !== 'running') {
        return false;
      }

      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      this.activeExecutions.delete(execution.workflowId);
      
      // Cancel via IPC
      await (window.electronAPI as any).workflow.cancelExecution(executionId);
      
      this.emit('executionCancelled', { executionId, execution });
      return true;
    } catch (error) {
      console.error(`Failed to cancel execution ${executionId}:`, error);
      return false;
    }
  }

  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  async getExecutions(workflowId?: string): Promise<WorkflowExecution[]> {
    const executions = Array.from(this.executions.values());
    return workflowId ? executions.filter(e => e.workflowId === workflowId) : executions;
  }

  async getActiveExecutions(): Promise<WorkflowExecution[]> {
    return Array.from(this.executions.values()).filter(e => e.status === 'running');
  }

  // Templates
  async getTemplates(): Promise<WorkflowTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(templateId: string): Promise<WorkflowTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async createWorkflowFromTemplate(templateId: string, name: string, variables: Record<string, any> = {}): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Create workflow from template
    const workflowDefinition: Partial<WorkflowDefinition> = {
      ...template.workflow,
      name,
      variables: template.workflow.variables.map(v => ({ ...v, value: variables[v.name] || v.value })),
      isTemplate: false
    };

    return await this.createWorkflow(workflowDefinition);
  }

  // Node Types
  async getNodeTypes(): Promise<WorkflowNodeType[]> {
    return Array.from(this.nodeTypes.values());
  }

  async getNodeType(type: string): Promise<WorkflowNodeType | null> {
    return this.nodeTypes.get(type) || null;
  }

  async getNodeTypesByCategory(category: string): Promise<WorkflowNodeType[]> {
    return Array.from(this.nodeTypes.values()).filter(nt => nt.category === category);
  }

  // Workflow Validation
  async validateWorkflow(workflow: WorkflowDefinition): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for orphaned nodes
    const connectedNodes = new Set<string>();
    workflow.connections.forEach(conn => {
      connectedNodes.add(conn.sourceNodeId);
      connectedNodes.add(conn.targetNodeId);
    });

    const orphanedNodes = workflow.nodes.filter(node => 
      node.type !== 'trigger' && !connectedNodes.has(node.id)
    );

    if (orphanedNodes.length > 0) {
      errors.push(`Orphaned nodes: ${orphanedNodes.map(n => n.name).join(', ')}`);
    }

    // Check for missing triggers
    if (workflow.nodes.filter(n => n.type === 'trigger').length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Check for circular dependencies
    if (this.hasCircularDependencies(workflow)) {
      errors.push('Workflow contains circular dependencies');
    }

    // Validate node configurations
    for (const node of workflow.nodes) {
      const nodeType = this.nodeTypes.get(node.type);
      if (nodeType) {
        const configErrors = this.validateNodeConfig(node, nodeType);
        errors.push(...configErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Private methods
  private async runWorkflowExecution(execution: WorkflowExecution, workflow: WorkflowDefinition): Promise<void> {
    try {
      // Execute via IPC for actual node processing
      const result = await (window.electronAPI as any).workflow.executeWorkflow(execution.id, workflow, execution.variables);
      
      if (result.success) {
        execution.status = 'completed';
        execution.nodeExecutions = result.nodeExecutions;
        execution.logs = result.logs;
      } else {
        execution.status = 'failed';
        execution.error = result.error;
      }

      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      this.activeExecutions.delete(workflow.id);
      this.emit('executionCompleted', { executionId: execution.id, workflowId: workflow.id, execution });
    } catch (error) {
      throw error;
    }
  }

  private hasCircularDependencies(workflow: WorkflowDefinition): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingConnections = workflow.connections.filter(c => c.sourceNodeId === nodeId);
      for (const connection of outgoingConnections) {
        const targetId = connection.targetNodeId;
        if (!visited.has(targetId)) {
          if (hasCycle(targetId)) return true;
        } else if (recursionStack.has(targetId)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return true;
      }
    }

    return false;
  }

  private validateNodeConfig(node: WorkflowNode, nodeType: WorkflowNodeType): string[] {
    const errors: string[] = [];
    
    // Validate required inputs
    for (const input of nodeType.inputs) {
      if (input.required && !node.config[input.name]) {
        errors.push(`Node ${node.name}: Required input ${input.name} is missing`);
      }
    }

    return errors;
  }

  private async loadWorkflows(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).workflow.getWorkflows();
      if (result.success) {
        result.data.forEach((workflow: WorkflowDefinition) => {
          this.workflows.set(workflow.id, workflow);
        });
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).workflow.getTemplates();
      if (result.success) {
        result.data.forEach((template: WorkflowTemplate) => {
          this.templates.set(template.id, template);
        });
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  private async loadNodeTypes(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).workflow.getNodeTypes();
      if (result.success) {
        result.data.forEach((nodeType: WorkflowNodeType) => {
          this.nodeTypes.set(nodeType.type, nodeType);
        });
      }
    } catch (error) {
      console.error('Failed to load node types:', error);
    }
  }

  private async loadRecentExecutions(): Promise<void> {
    try {
      const result = await (window.electronAPI as any).workflow.getRecentExecutions();
      if (result.success) {
        result.data.forEach((execution: WorkflowExecution) => {
          this.executions.set(execution.id, execution);
        });
      }
    } catch (error) {
      console.error('Failed to load recent executions:', error);
    }
  }

  private async initializeSchedulers(): Promise<void> {
    try {
      // Initialize scheduled workflows
      const scheduledWorkflows = Array.from(this.workflows.values())
        .filter(w => w.schedule && w.schedule.isActive && w.isActive);

      for (const workflow of scheduledWorkflows) {
        await (window.electronAPI as any).workflow.scheduleWorkflow(workflow.id, workflow.schedule);
      }
    } catch (error) {
      console.error('Failed to initialize schedulers:', error);
    }
  }

  private async saveWorkflow(workflow: WorkflowDefinition): Promise<void> {
    try {
      await (window.electronAPI as any).workflow.saveWorkflow(workflow);
    } catch (error) {
      console.error(`Failed to save workflow ${workflow.id}:`, error);
      throw error;
    }
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Cancel all active executions
    for (const executionId of Array.from(this.executions.keys())) {
      const execution = this.executions.get(executionId);
      if (execution && execution.status === 'running') {
        await this.cancelExecution(executionId);
      }
    }

    // Clear all data
    this.workflows.clear();
    this.executions.clear();
    this.templates.clear();
    this.nodeTypes.clear();
    this.activeExecutions.clear();

    this.removeAllListeners();
  }
}

export default WorkflowService;