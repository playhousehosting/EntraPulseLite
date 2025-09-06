// Template Manager React Component
// UI for managing and executing admin templates

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Badge,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Schedule as ScheduleIcon,
  GetApp as ExportIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Star as StarIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  AccessTime as TimeIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Build as BuildIcon
} from '@mui/icons-material';
import { AdminTemplate, AdminTemplateService, TemplateExecutionResult, QueryParameter } from '../../shared/AdminTemplateService';

interface TemplateManagerProps {
  isVisible: boolean;
}

type TabValue = 'browse' | 'running' | 'results' | 'schedule';

interface ExecutionState {
  isRunning: boolean;
  currentTemplate?: string;
  progress: number;
  message: string;
}

interface FilterState {
  category: string;
  difficulty: string;
  searchTerm: string;
  tags: string[];
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ isVisible }) => {
  const [templateService] = useState(() => new AdminTemplateService());
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<TabValue>('browse');
  const [executionState, setExecutionState] = useState<ExecutionState>({
    isRunning: false,
    progress: 0,
    message: ''
  });
  const [executionResults, setExecutionResults] = useState<TemplateExecutionResult[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTemplate | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'info' | 'success' | 'error' | 'warning' });
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    difficulty: '',
    searchTerm: '',
    tags: []
  });

  // Load templates on component mount
  useEffect(() => {
    const loadedTemplates = templateService.getTemplates();
    setTemplates(loadedTemplates);
  }, [templateService]);

  // Filter templates based on current filters
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    if (filters.searchTerm) {
      filtered = templateService.searchTemplates(filters.searchTerm);
    }

    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }

    if (filters.difficulty) {
      filtered = filtered.filter(t => t.difficulty === filters.difficulty);
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter(t => 
        filters.tags.some(tag => t.tags.includes(tag))
      );
    }

    return filtered;
  }, [templates, filters, templateService]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, AdminTemplate[]> = {};
    filteredTemplates.forEach(template => {
      if (!grouped[template.category]) {
        grouped[template.category] = [];
      }
      grouped[template.category].push(template);
    });
    return grouped;
  }, [filteredTemplates]);

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'license-management': return <BusinessIcon />;
      case 'security-audit': return <SecurityIcon />;
      case 'compliance': return <AssignmentIcon />;
      case 'user-management': return <DashboardIcon />;
      case 'tenant-health': return <AnalyticsIcon />;
      case 'reporting': return <AnalyticsIcon />;
      case 'automation': return <BuildIcon />;
      default: return <InfoIcon />;
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      default: return 'default';
    }
  };

  // Handle template execution
  const handleExecuteTemplate = async (template: AdminTemplate) => {
    const hasParameters = template.queries.some((q: any) => q.parameters && q.parameters.length > 0);
    
    if (hasParameters) {
      setSelectedTemplate(template);
      setParameterValues({});
      setExecuteDialogOpen(true);
      return;
    }

    await executeTemplate(template, {});
  };

  // Execute template with parameters
  const executeTemplate = async (template: AdminTemplate, parameters: Record<string, any>) => {
    setExecutionState({
      isRunning: true,
      currentTemplate: template.name,
      progress: 0,
      message: 'Initializing template execution...'
    });

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExecutionState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
          message: `Executing ${template.name}...`
        }));
      }, 500);

      const result = await templateService.executeTemplate(template.id, parameters);
      
      clearInterval(progressInterval);
      
      setExecutionState({
        isRunning: false,
        progress: 100,
        message: result.success ? 'Execution completed successfully' : 'Execution completed with errors'
      });

      setExecutionResults(prev => [result, ...prev]);
      setActiveTab('results');
      
      setSnackbar({
        open: true,
        message: result.success ? 'Template executed successfully!' : 'Template execution completed with errors',
        severity: result.success ? 'success' : 'warning'
      });

    } catch (error) {
      setExecutionState({
        isRunning: false,
        progress: 0,
        message: 'Execution failed'
      });
      
      setSnackbar({
        open: true,
        message: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    }
  };

  // Handle parameter dialog confirmation
  const handleParameterDialogConfirm = () => {
    if (selectedTemplate) {
      executeTemplate(selectedTemplate, parameterValues);
      setExecuteDialogOpen(false);
      setSelectedTemplate(null);
    }
  };

  // Render template card
  const renderTemplateCard = (template: AdminTemplate) => (
    <Card key={template.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
          <Typography variant="h6" component="div" gutterBottom>
            {template.name}
          </Typography>
          <Chip 
            label={template.difficulty} 
            size="small" 
            color={getDifficultyColor(template.difficulty) as any}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {template.description}
        </Typography>
        
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <TimeIcon fontSize="small" color="action" />
          <Typography variant="caption">{template.estimatedTime}</Typography>
        </Box>
        
        <Box display="flex" gap={0.5} mb={1} flexWrap="wrap">
          {template.tags.slice(0, 3).map((tag: string) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
          {template.tags.length > 3 && (
            <Chip label={`+${template.tags.length - 3} more`} size="small" variant="outlined" />
          )}
        </Box>
        
        <Typography variant="caption" color="text.secondary">
          {template.queries.length} queries • {template.requirements.length} permissions required
        </Typography>
      </CardContent>
      
      <CardActions>
        <Button 
          size="small" 
          startIcon={<PlayIcon />}
          onClick={() => handleExecuteTemplate(template)}
          disabled={executionState.isRunning}
        >
          Execute
        </Button>
        <Tooltip title="View Details">
          <IconButton size="small" onClick={() => setSelectedTemplate(template)}>
            <InfoIcon />
          </IconButton>
        </Tooltip>
        {template.schedule && (
          <Tooltip title="Scheduled Template">
            <IconButton size="small">
              <ScheduleIcon />
            </IconButton>
          </Tooltip>
        )}
      </CardActions>
    </Card>
  );

  // Render execution results
  const renderExecutionResults = () => (
    <Box>
      {executionResults.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          No execution results yet. Execute a template to see results here.
        </Typography>
      ) : (
        executionResults.map((result, index) => (
          <Accordion key={index} defaultExpanded={index === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                {result.success ? (
                  <CheckIcon color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
                <Box flexGrow={1}>
                  <Typography variant="h6">{result.templateName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {result.executionTime.toLocaleString()} • {result.results.length} queries
                  </Typography>
                </Box>
                <Chip 
                  label={result.success ? 'Success' : 'Errors'} 
                  color={result.success ? 'success' : 'error'}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <Typography variant="body2" gutterBottom>
                  {result.summary}
                </Typography>
                
                {result.errors.length > 0 && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Errors:</Typography>
                    <List dense>
                      {result.errors.map((error: string, i: number) => (
                        <ListItem key={i}>
                          <ListItemText primary={error} />
                        </ListItem>
                      ))}
                    </List>
                  </Alert>
                )}
                
                <Typography variant="subtitle2" gutterBottom>Query Results:</Typography>
                <List>
                  {result.results.map((queryResult: any, i: number) => (
                    <ListItem key={i}>
                      <ListItemIcon>
                        <CheckIcon color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={queryResult.queryName}
                        secondary={`Format: ${queryResult.format} • ${queryResult.timestamp.toLocaleTimeString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );

  // Render parameter dialog
  const renderParameterDialog = () => {
    if (!selectedTemplate) return null;

    const allParameters = selectedTemplate.queries
      .flatMap((q: any) => q.parameters || [])
      .filter((param: any, index: number, self: any[]) => 
        self.findIndex((p: any) => p.name === param.name) === index
      );

    return (
      <Dialog 
        open={executeDialogOpen} 
        onClose={() => setExecuteDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Execute Template: {selectedTemplate.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {selectedTemplate.description}
          </Typography>
          
          <Box mt={2}>
            {allParameters.map((param) => (
              <Box key={param.name} mb={2}>
                {param.type === 'select' ? (
                  <FormControl fullWidth>
                    <InputLabel>{param.description}</InputLabel>
                    <Select
                      value={parameterValues[param.name] || ''}
                      onChange={(e) => setParameterValues(prev => ({
                        ...prev,
                        [param.name]: e.target.value
                      }))}
                    >
                      {param.options?.map((option: string) => (
                        <MenuItem key={option} value={option}>{option}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    fullWidth
                    label={param.description}
                    type={param.type === 'email' ? 'email' : param.type === 'number' ? 'number' : 'text'}
                    required={param.required}
                    value={parameterValues[param.name] || ''}
                    onChange={(e) => setParameterValues(prev => ({
                      ...prev,
                      [param.name]: e.target.value
                    }))}
                  />
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecuteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleParameterDialogConfirm}
            variant="contained"
            disabled={allParameters.some((p: any) => p.required && !parameterValues[p.name])}
          >
            Execute
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  if (!isVisible) return null;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Admin Template Manager
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        Pre-built workflows and templates for common M365 administration tasks
      </Typography>

      {/* Execution Progress */}
      {executionState.isRunning && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Executing: {executionState.currentTemplate}
          </Typography>
          <LinearProgress variant="determinate" value={executionState.progress} sx={{ mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {executionState.message}
          </Typography>
        </Paper>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab 
          label={
            <Badge badgeContent={filteredTemplates.length} color="primary">
              Browse Templates
            </Badge>
          } 
          value="browse" 
        />
        <Tab 
          label="Running" 
          value="running"
          disabled={!executionState.isRunning}
        />
        <Tab 
          label={
            <Badge badgeContent={executionResults.length} color="secondary">
              Results
            </Badge>
          } 
          value="results" 
        />
        <Tab label="Scheduled" value="schedule" />
      </Tabs>

      {/* Browse Templates Tab */}
      {activeTab === 'browse' && (
        <Box>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="Search templates..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    <MenuItem value="license-management">License Management</MenuItem>
                    <MenuItem value="security-audit">Security Audit</MenuItem>
                    <MenuItem value="compliance">Compliance</MenuItem>
                    <MenuItem value="user-management">User Management</MenuItem>
                    <MenuItem value="tenant-health">Tenant Health</MenuItem>
                    <MenuItem value="reporting">Reporting</MenuItem>
                    <MenuItem value="automation">Automation</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select
                    value={filters.difficulty}
                    onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    <MenuItem value="beginner">Beginner</MenuItem>
                    <MenuItem value="intermediate">Intermediate</MenuItem>
                    <MenuItem value="advanced">Advanced</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<FilterIcon />}
                  onClick={() => setFilters({ category: '', difficulty: '', searchTerm: '', tags: [] })}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Template Categories */}
          {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
            <Box key={category} mb={4}>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                {getCategoryIcon(category)}
                <Typography variant="h5" component="h2">
                  {category.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Typography>
                <Chip label={categoryTemplates.length} size="small" />
              </Box>
              
              <Grid container spacing={3}>
                {categoryTemplates.map(template => (
                  <Grid item xs={12} md={6} lg={4} key={template.id}>
                    {renderTemplateCard(template)}
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && renderExecutionResults()}

      {/* Running Tab */}
      {activeTab === 'running' && executionState.isRunning && (
        <Box textAlign="center" py={4}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {executionState.currentTemplate}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {executionState.message}
          </Typography>
          <LinearProgress variant="determinate" value={executionState.progress} sx={{ mt: 2, maxWidth: 400, mx: 'auto' }} />
        </Box>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'schedule' && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Scheduled Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Scheduled template execution coming soon...
          </Typography>
        </Box>
      )}

      {/* Parameter Dialog */}
      {renderParameterDialog()}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};