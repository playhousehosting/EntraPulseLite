// AutomationDashboard.tsx
// Comprehensive automation engine dashboard for workflow and task management

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  LinearProgress,
  Avatar,
  Divider,
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Badge
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Timeline as TimelineIcon,
  AutoAwesome as AutomationIcon,
  Assignment as TaskIcon,
  AccountTree as WorkflowIcon,
  History as HistoryIcon,
  TrendingUp as MetricsIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Speed as PerformanceIcon,
  Security as SecurityIcon,
  Person as UserIcon,
  Group as GroupIcon,
  Email as EmailIcon,
  Assessment as ReportIcon,
  Backup as BackupIcon,
  CleaningServices as CleanupIcon
} from '@mui/icons-material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface AutomationTask {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  successCount: number;
  failureCount: number;
  schedule?: any;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  status: string;
  taskCount: number;
  lastExecutionAt?: Date;
  executionCount: number;
  successRate: number;
}

interface ExecutionResult {
  id: string;
  timestamp: Date;
  success: boolean;
  duration: number;
  message?: string;
}

interface AutomationMetrics {
  totalTasks: number;
  activeTasks: number;
  totalWorkflows: number;
  activeWorkflows: number;
  scheduledJobs: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
}

const AutomationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [metrics, setMetrics] = useState<AutomationMetrics>({
    totalTasks: 0,
    activeTasks: 0,
    totalWorkflows: 0,
    activeWorkflows: 0,
    scheduledJobs: 0,
    totalExecutions: 0,
    successRate: 0,
    avgExecutionTime: 0
  });
  const [executions, setExecutions] = useState<ExecutionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<AutomationTask | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<AutomationWorkflow | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [workflowDialogOpen, setWorkflowDialogOpen] = useState(false);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false);
  const [newWorkflowDialogOpen, setNewWorkflowDialogOpen] = useState(false);

  // Load automation data
  const loadAutomationData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load tasks
      const tasksData = await window.electronAPI.automation.getTasks();
      setTasks(tasksData || []);

      // Load workflows
      const workflowsData = await window.electronAPI.automation.getWorkflows();
      setWorkflows(workflowsData || []);

      // Load metrics
      const metricsData = await window.electronAPI.automation.getMetrics();
      setMetrics(metricsData || {
        totalTasks: 0,
        activeTasks: 0,
        totalWorkflows: 0,
        activeWorkflows: 0,
        scheduledJobs: 0,
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTime: 0
      });

      // Load recent executions
      const executionsData = await window.electronAPI.automation.getRecentExecutions();
      setExecutions(executionsData || []);

    } catch (error) {
      console.error('Failed to load automation data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAutomationData();
    const interval = setInterval(loadAutomationData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadAutomationData]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleExecuteTask = async (taskId: string) => {
    try {
      await window.electronAPI.automation.executeTask(taskId);
      await loadAutomationData();
    } catch (error) {
      console.error('Failed to execute task:', error);
    }
  };

  const handleExecuteWorkflow = async (workflowId: string) => {
    try {
      await window.electronAPI.automation.executeWorkflow(workflowId);
      await loadAutomationData();
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await window.electronAPI.automation.updateTaskStatus(taskId, newStatus);
      await loadAutomationData();
    } catch (error) {
      console.error('Failed to toggle task status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'failed': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTaskTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'user_lifecycle': return <UserIcon />;
      case 'compliance_check': return <SecurityIcon />;
      case 'policy_enforcement': return <SecurityIcon />;
      case 'reporting': return <ReportIcon />;
      case 'backup': return <BackupIcon />;
      case 'cleanup': return <CleanupIcon />;
      case 'notification': return <EmailIcon />;
      default: return <TaskIcon />;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Metrics Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Total Tasks
                </Typography>
                <Typography variant="h5" component="div">
                  {metrics.totalTasks}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {metrics.activeTasks} active
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <TaskIcon />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Workflows
                </Typography>
                <Typography variant="h5" component="div">
                  {metrics.totalWorkflows}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {metrics.activeWorkflows} active
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <WorkflowIcon />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Success Rate
                </Typography>
                <Typography variant="h5" component="div">
                  {(metrics.successRate * 100).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {metrics.totalExecutions} executions
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <PerformanceIcon />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  Avg Duration
                </Typography>
                <Typography variant="h5" component="div">
                  {formatDuration(metrics.avgExecutionTime)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {metrics.scheduledJobs} scheduled
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: 'info.main' }}>
                <ScheduleIcon />
              </Avatar>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Executions */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Executions
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {executions.slice(0, 10).map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell>
                        {execution.timestamp.toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label="Task"
                          color="primary"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={execution.success ? <SuccessIcon /> : <ErrorIcon />}
                          label={execution.success ? 'Success' : 'Failed'}
                          color={execution.success ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{formatDuration(execution.duration)}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {execution.message || 'No message'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* System Status */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Status
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <AutomationIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Automation Engine"
                  secondary="Running"
                />
                <ListItemSecondaryAction>
                  <Chip size="small" label="Online" color="success" />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <ScheduleIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Scheduler"
                  secondary={`${metrics.scheduledJobs} jobs`}
                />
                <ListItemSecondaryAction>
                  <Chip size="small" label="Active" color="info" />
                </ListItemSecondaryAction>
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <MetricsIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Monitoring"
                  secondary="Real-time"
                />
                <ListItemSecondaryAction>
                  <Chip size="small" label="Enabled" color="success" />
                </ListItemSecondaryAction>
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTasksTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Automation Tasks ({tasks.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewTaskDialogOpen(true)}
        >
          Create Task
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell>Success Rate</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTaskTypeIcon(task.type)}
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {task.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {task.description}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={task.type.replace('_', ' ')}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={task.status}
                    color={getStatusColor(task.status) as any}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={task.priority}
                    color={getPriorityColor(task.priority) as any}
                  />
                </TableCell>
                <TableCell>
                  {task.lastRunAt ? task.lastRunAt.toLocaleString() : 'Never'}
                </TableCell>
                <TableCell>
                  {task.runCount > 0 ? 
                    `${((task.successCount / task.runCount) * 100).toFixed(1)}% (${task.successCount}/${task.runCount})` : 
                    'No runs'
                  }
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Execute Now">
                      <IconButton
                        size="small"
                        onClick={() => handleExecuteTask(task.id)}
                        color="primary"
                      >
                        <PlayIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={task.status === 'active' ? 'Pause' : 'Resume'}>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        color={task.status === 'active' ? 'warning' : 'success'}
                      >
                        {task.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedTask(task);
                          setTaskDialogOpen(true);
                        }}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderWorkflowsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Automation Workflows ({workflows.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewWorkflowDialogOpen(true)}
        >
          Create Workflow
        </Button>
      </Box>

      <Grid container spacing={3}>
        {workflows.map((workflow) => (
          <Grid item xs={12} md={6} lg={4} key={workflow.id}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6" gutterBottom>
                    {workflow.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={workflow.status}
                    color={getStatusColor(workflow.status) as any}
                  />
                </Box>
                
                <Typography variant="body2" color="textSecondary" mb={2}>
                  {workflow.description}
                </Typography>

                <Box mb={2}>
                  <Typography variant="body2">
                    <strong>Tasks:</strong> {workflow.taskCount}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Executions:</strong> {workflow.executionCount}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Success Rate:</strong> {(workflow.successRate * 100).toFixed(1)}%
                  </Typography>
                  {workflow.lastExecutionAt && (
                    <Typography variant="body2">
                      <strong>Last Run:</strong> {workflow.lastExecutionAt.toLocaleString()}
                    </Typography>
                  )}
                </Box>

                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayIcon />}
                    onClick={() => handleExecuteWorkflow(workflow.id)}
                  >
                    Execute
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedWorkflow(workflow);
                      setWorkflowDialogOpen(true);
                    }}
                  >
                    Details
                  </Button>
                  <IconButton size="small">
                    <EditIcon />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderSchedulesTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Scheduled Jobs ({metrics.scheduledJobs})
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This section shows all scheduled automation tasks and workflows. You can view upcoming executions and modify schedules.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Next Run</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks
              .filter(task => task.schedule && task.status === 'active')
              .map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.name}</TableCell>
                  <TableCell>
                    <Chip size="small" label="Task" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {task.schedule?.type || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {task.nextRunAt ? task.nextRunAt.toLocaleString() : 'Not scheduled'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={task.status}
                      color={getStatusColor(task.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" color="primary">
                        <ScheduleIcon />
                      </IconButton>
                      <IconButton size="small">
                        <EditIcon />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderMetricsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Automation Performance Metrics
        </Typography>
      </Grid>

      {/* Performance Charts Placeholder */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Execution Success Rate
            </Typography>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h4" color="success.main">
                {(metrics.successRate * 100).toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={metrics.successRate * 100}
              color="success"
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="body2" color="textSecondary" mt={1}>
              Based on {metrics.totalExecutions} total executions
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Average Execution Time
            </Typography>
            <Box display="flex" alignItems="center" mb={2}>
              <Typography variant="h4" color="info.main">
                {formatDuration(metrics.avgExecutionTime)}
              </Typography>
            </Box>
            <Typography variant="body2" color="textSecondary">
              Across all automation tasks and workflows
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Detailed Metrics */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary">
                    {metrics.totalTasks}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Tasks
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h5" color="secondary">
                    {metrics.activeTasks}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Active Tasks
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h5" color="success.main">
                    {metrics.totalWorkflows}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Workflows
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h5" color="info.main">
                    {metrics.scheduledJobs}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Scheduled Jobs
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Automation Engine
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAutomationData}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
          >
            Settings
          </Button>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              icon={<AutomationIcon />} 
              label="Overview" 
              iconPosition="start"
            />
            <Tab 
              icon={<TaskIcon />} 
              label="Tasks" 
              iconPosition="start"
            />
            <Tab 
              icon={<WorkflowIcon />} 
              label="Workflows" 
              iconPosition="start"
            />
            <Tab 
              icon={<ScheduleIcon />} 
              label="Schedules" 
              iconPosition="start"
            />
            <Tab 
              icon={<MetricsIcon />} 
              label="Metrics" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {renderOverviewTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderTasksTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderWorkflowsTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderSchedulesTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          {renderMetricsTab()}
        </TabPanel>
      </Card>

      {/* Task Details Dialog */}
      <Dialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedTask && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                {getTaskTypeIcon(selectedTask.type)}
                Task Details: {selectedTask.name}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    {selectedTask.description}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Status & Priority
                  </Typography>
                  <Stack direction="row" spacing={1} mb={1}>
                    <Chip
                      size="small"
                      label={selectedTask.status}
                      color={getStatusColor(selectedTask.status) as any}
                    />
                    <Chip
                      size="small"
                      label={selectedTask.priority}
                      color={getPriorityColor(selectedTask.priority) as any}
                    />
                  </Stack>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Execution Statistics
                  </Typography>
                  <Box display="flex" gap={3}>
                    <Typography variant="body2">
                      <strong>Total Runs:</strong> {selectedTask.runCount}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Successful:</strong> {selectedTask.successCount}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Failed:</strong> {selectedTask.failureCount}
                    </Typography>
                    {selectedTask.lastRunAt && (
                      <Typography variant="body2">
                        <strong>Last Run:</strong> {selectedTask.lastRunAt.toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setTaskDialogOpen(false)}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={() => {
                  handleExecuteTask(selectedTask.id);
                  setTaskDialogOpen(false);
                }}
              >
                Execute Now
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog
        open={newTaskDialogOpen}
        onClose={() => setNewTaskDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Automation Task</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Task creation interface would be implemented here with form fields for task configuration.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTaskDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained">
            Create Task
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Workflow Dialog */}
      <Dialog
        open={newWorkflowDialogOpen}
        onClose={() => setNewWorkflowDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Create New Automation Workflow</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Workflow creation interface would be implemented here with visual workflow designer.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewWorkflowDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained">
            Create Workflow
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AutomationDashboard;