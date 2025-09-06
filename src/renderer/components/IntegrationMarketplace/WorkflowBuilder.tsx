import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Alert,
  Fab,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  DragIndicator as DragIndicatorIcon,
  AccountTree as WorkflowIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Storage as DatabaseIcon,
  Api as ApiIcon,
  Functions as FunctionIcon,
  FilterAlt as FilterIcon,
  Transform as TransformIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Timeline as TimelineIcon,
  BugReport as BugReportIcon
} from '@mui/icons-material';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'transform' | 'output';
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  inputs: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  configuration: { [key: string]: any };
  position: { x: number; y: number };
  connections: Array<{
    outputPort: string;
    targetNodeId: string;
    targetPort: string;
  }>;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  nodes: WorkflowNode[];
  variables: { [key: string]: any };
  triggers: string[];
  status: 'draft' | 'active' | 'paused' | 'error';
  createdAt: Date;
  lastModified: Date;
  lastRun?: Date;
  executionCount: number;
}

interface WorkflowBuilderProps {
  workflow?: WorkflowDefinition;
  onSave: (workflow: WorkflowDefinition) => void;
  onExecute: (workflowId: string) => void;
  onClose: () => void;
}

const NODE_TYPES = {
  triggers: [
    {
      type: 'schedule',
      name: 'Schedule Trigger',
      description: 'Execute workflow on a schedule',
      icon: <ScheduleIcon />,
      category: 'triggers'
    },
    {
      type: 'webhook',
      name: 'Webhook Trigger',
      description: 'Execute workflow when webhook is called',
      icon: <ApiIcon />,
      category: 'triggers'
    },
    {
      type: 'email',
      name: 'Email Trigger',
      description: 'Execute workflow when email is received',
      icon: <EmailIcon />,
      category: 'triggers'
    }
  ],
  actions: [
    {
      type: 'api-call',
      name: 'API Call',
      description: 'Make HTTP request to external API',
      icon: <ApiIcon />,
      category: 'actions'
    },
    {
      type: 'database-query',
      name: 'Database Query',
      description: 'Execute database query',
      icon: <DatabaseIcon />,
      category: 'actions'
    },
    {
      type: 'send-email',
      name: 'Send Email',
      description: 'Send email notification',
      icon: <EmailIcon />,
      category: 'actions'
    }
  ],
  conditions: [
    {
      type: 'if-condition',
      name: 'If Condition',
      description: 'Conditional logic branching',
      icon: <FilterIcon />,
      category: 'conditions'
    }
  ],
  transforms: [
    {
      type: 'data-transform',
      name: 'Data Transform',
      description: 'Transform and manipulate data',
      icon: <TransformIcon />,
      category: 'transforms'
    },
    {
      type: 'javascript',
      name: 'JavaScript Function',
      description: 'Execute custom JavaScript code',
      icon: <FunctionIcon />,
      category: 'transforms'
    }
  ]
};

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  workflow: initialWorkflow,
  onSave,
  onExecute,
  onClose
}) => {
  const [workflow, setWorkflow] = useState<WorkflowDefinition>(
    initialWorkflow || {
      id: `workflow-${Date.now()}`,
      name: 'New Workflow',
      description: '',
      version: '1.0.0',
      nodes: [],
      variables: {},
      triggers: [],
      status: 'draft',
      createdAt: new Date(),
      lastModified: new Date(),
      executionCount: 0
    }
  );

  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'design' | 'preview' | 'debug'>('design');
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleAddNode = (nodeType: any) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: nodeType.category.slice(0, -1) as any, // Remove 's' from category
      name: nodeType.name,
      description: nodeType.description,
      icon: nodeType.icon,
      category: nodeType.category,
      inputs: getDefaultInputs(nodeType.type),
      outputs: getDefaultOutputs(nodeType.type),
      configuration: {},
      position: { x: 100 + workflow.nodes.length * 50, y: 100 + workflow.nodes.length * 50 },
      connections: []
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      lastModified: new Date()
    }));
  };

  const getDefaultInputs = (nodeType: string) => {
    switch (nodeType) {
      case 'schedule':
        return [
          { name: 'cron', type: 'string', required: true, description: 'Cron expression' },
          { name: 'timezone', type: 'string', required: false, description: 'Timezone' }
        ];
      case 'api-call':
        return [
          { name: 'url', type: 'string', required: true, description: 'API endpoint URL' },
          { name: 'method', type: 'string', required: true, description: 'HTTP method' },
          { name: 'headers', type: 'object', required: false, description: 'Request headers' },
          { name: 'body', type: 'object', required: false, description: 'Request body' }
        ];
      default:
        return [];
    }
  };

  const getDefaultOutputs = (nodeType: string) => {
    switch (nodeType) {
      case 'api-call':
        return [
          { name: 'response', type: 'object', description: 'API response data' },
          { name: 'status', type: 'number', description: 'HTTP status code' }
        ];
      case 'database-query':
        return [
          { name: 'result', type: 'array', description: 'Query results' },
          { name: 'rowCount', type: 'number', description: 'Number of rows affected' }
        ];
      default:
        return [
          { name: 'output', type: 'any', description: 'Node output' }
        ];
    }
  };

  const handleNodeSelect = (node: WorkflowNode) => {
    setSelectedNode(node);
    setConfigDialogOpen(true);
  };

  const handleNodeDelete = (nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      lastModified: new Date()
    }));
  };

  const handleNodeUpdate = (updatedNode: WorkflowNode) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      ),
      lastModified: new Date()
    }));
  };

  const handleSave = () => {
    onSave(workflow);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionLogs([]);
    
    try {
      // Simulate workflow execution
      const logs = [
        `[${new Date().toISOString()}] Starting workflow execution: ${workflow.name}`,
        `[${new Date().toISOString()}] Validating workflow structure...`,
        `[${new Date().toISOString()}] Found ${workflow.nodes.length} nodes to execute`,
      ];

      for (let i = 0; i < workflow.nodes.length; i++) {
        const node = workflow.nodes[i];
        logs.push(`[${new Date().toISOString()}] Executing node: ${node.name}`);
        setExecutionLogs([...logs]);
        
        // Simulate execution delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        logs.push(`[${new Date().toISOString()}] Node ${node.name} completed successfully`);
        setExecutionLogs([...logs]);
      }

      logs.push(`[${new Date().toISOString()}] Workflow execution completed successfully`);
      setExecutionLogs([...logs]);

      setWorkflow(prev => ({
        ...prev,
        lastRun: new Date(),
        executionCount: prev.executionCount + 1
      }));

      await onExecute(workflow.id);
    } catch (error) {
      setExecutionLogs(prev => [
        ...prev,
        `[${new Date().toISOString()}] ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const renderNodeList = () => (
    <Box sx={{ width: 300, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Workflow Nodes
      </Typography>
      
      {Object.entries(NODE_TYPES).map(([category, nodes]) => (
        <Accordion key={category} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
              {category}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <List dense>
              {nodes.map((nodeType) => (
                <ListItem
                  key={nodeType.type}
                  button
                  onClick={() => handleAddNode(nodeType)}
                >
                  <ListItemIcon>
                    {nodeType.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={nodeType.name}
                    secondary={nodeType.description}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  const renderCanvas = () => (
    <Box
      sx={{
        flexGrow: 1,
        height: 'calc(100vh - 200px)',
        position: 'relative',
        overflow: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'grey.50'
      }}
    >
      {workflow.nodes.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'text.secondary'
          }}
        >
          <WorkflowIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6">No nodes in workflow</Typography>
          <Typography variant="body2">
            Drag and drop nodes from the sidebar to get started
          </Typography>
        </Box>
      ) : (
        <Box sx={{ position: 'relative', minHeight: '100%', minWidth: '100%' }}>
          {workflow.nodes.map((node) => (
            <Paper
              key={node.id}
              sx={{
                position: 'absolute',
                left: node.position.x,
                top: node.position.y,
                width: 200,
                cursor: 'move',
                '&:hover': {
                  boxShadow: 4
                }
              }}
              onClick={() => handleNodeSelect(node)}
            >
              <CardHeader
                avatar={node.icon}
                title={
                  <Typography variant="subtitle2" noWrap>
                    {node.name}
                  </Typography>
                }
                subheader={
                  <Chip
                    label={node.type}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                }
                action={
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeDelete(node.id);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                sx={{ pb: 1 }}
              />
              <CardContent sx={{ pt: 0 }}>
                <Typography variant="caption" color="text.secondary">
                  {node.description}
                </Typography>
                
                {/* Connection points */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {node.inputs.map((input) => (
                      <Box
                        key={input.name}
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          cursor: 'crosshair'
                        }}
                        title={input.description}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {node.outputs.map((output) => (
                      <Box
                        key={output.name}
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: 'secondary.main',
                          cursor: 'crosshair'
                        }}
                        title={output.description}
                      />
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderNodeConfiguration = () => (
    <Dialog
      open={configDialogOpen}
      onClose={() => setConfigDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      {selectedNode && (
        <>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {selectedNode.icon}
              <Typography variant="h6">{selectedNode.name}</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Node Name"
                  value={selectedNode.name}
                  onChange={(e) => 
                    handleNodeUpdate({ ...selectedNode, name: e.target.value })
                  }
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Description"
                  value={selectedNode.description}
                  onChange={(e) => 
                    handleNodeUpdate({ ...selectedNode, description: e.target.value })
                  }
                />
              </Grid>
              
              {selectedNode.inputs.map((input) => (
                <Grid item xs={12} key={input.name}>
                  <TextField
                    fullWidth
                    label={input.name}
                    required={input.required}
                    helperText={input.description}
                    value={selectedNode.configuration[input.name] || ''}
                    onChange={(e) => {
                      const updatedNode = {
                        ...selectedNode,
                        configuration: {
                          ...selectedNode.configuration,
                          [input.name]: e.target.value
                        }
                      };
                      handleNodeUpdate(updatedNode);
                    }}
                  />
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => setConfigDialogOpen(false)}
            >
              Save Configuration
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          '& .MuiDrawer-paper': {
            position: 'relative',
            whiteSpace: 'nowrap',
            width: 300
          }
        }}
      >
        {renderNodeList()}
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => setDrawerOpen(!drawerOpen)}>
              <DragIndicatorIcon />
            </IconButton>
            <TextField
              size="small"
              value={workflow.name}
              onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
              sx={{ minWidth: 200 }}
            />
            <Chip
              label={workflow.status}
              color={workflow.status === 'active' ? 'success' : 'default'}
              size="small"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="design">
                <SettingsIcon />
              </ToggleButton>
              <ToggleButton value="preview">
                <VisibilityIcon />
              </ToggleButton>
              <ToggleButton value="debug">
                <BugReportIcon />
              </ToggleButton>
            </ToggleButtonGroup>

            <Button
              variant="outlined"
              onClick={handleSave}
              startIcon={<SaveIcon />}
            >
              Save
            </Button>
            
            <Button
              variant="contained"
              onClick={handleExecute}
              disabled={isExecuting || workflow.nodes.length === 0}
              startIcon={isExecuting ? <StopIcon /> : <PlayArrowIcon />}
            >
              {isExecuting ? 'Running...' : 'Execute'}
            </Button>
            
            <Button onClick={onClose}>
              Close
            </Button>
          </Box>
        </Box>

        {/* Canvas */}
        {viewMode === 'design' && renderCanvas()}
        
        {viewMode === 'preview' && (
          <Paper sx={{ p: 3, flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Workflow Preview
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {workflow.description || 'No description provided'}
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader title="Workflow Information" />
                  <CardContent>
                    <Typography variant="body2">
                      <strong>Version:</strong> {workflow.version}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong> {workflow.status}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Nodes:</strong> {workflow.nodes.length}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Executions:</strong> {workflow.executionCount}
                    </Typography>
                    {workflow.lastRun && (
                      <Typography variant="body2">
                        <strong>Last Run:</strong> {workflow.lastRun.toLocaleString()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardHeader title="Node Summary" />
                  <CardContent>
                    <List dense>
                      {workflow.nodes.map((node) => (
                        <ListItem key={node.id}>
                          <ListItemIcon>
                            {node.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={node.name}
                            secondary={node.type}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}
        
        {viewMode === 'debug' && (
          <Paper sx={{ p: 3, flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Execution Logs
            </Typography>
            
            <Paper
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                maxHeight: 400,
                overflow: 'auto',
                fontFamily: 'monospace'
              }}
            >
              {executionLogs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No execution logs available. Run the workflow to see logs.
                </Typography>
              ) : (
                executionLogs.map((log, index) => (
                  <Typography key={index} variant="body2" component="div">
                    {log}
                  </Typography>
                ))
              )}
            </Paper>
          </Paper>
        )}
      </Box>

      {/* Node Configuration Dialog */}
      {renderNodeConfiguration()}

      {/* FAB for quick actions */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setDrawerOpen(!drawerOpen)}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default WorkflowBuilder;