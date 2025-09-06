import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  Grid,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  BugReport as BugReportIcon,
  Code as CodeIcon,
  Terminal as TerminalIcon,
  CloudDownload as CloudDownloadIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

interface MCPServer {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  repository: string;
  installCommand: string;
  requirements: string[];
  permissions: string[];
  configuration: {
    [key: string]: {
      type: 'string' | 'number' | 'boolean' | 'array';
      required: boolean;
      description: string;
      default?: any;
    };
  };
  status: 'not-installed' | 'downloading' | 'installing' | 'installed' | 'running' | 'stopped' | 'error';
  lastInstalled?: Date;
  size: number;
  category: string;
  tags: string[];
  documentation: string;
  examples: Array<{
    title: string;
    description: string;
    code: string;
  }>;
}

interface InstallationProgress {
  step: number;
  message: string;
  progress: number;
  logs: string[];
}

interface MCPServerInstallerProps {
  server: MCPServer;
  onInstall: (serverId: string, config: any) => Promise<void>;
  onUninstall: (serverId: string) => Promise<void>;
  onStart: (serverId: string) => Promise<void>;
  onStop: (serverId: string) => Promise<void>;
  onClose: () => void;
}

export const MCPServerInstaller: React.FC<MCPServerInstallerProps> = ({
  server,
  onInstall,
  onUninstall,
  onStart,
  onStop,
  onClose
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [configuration, setConfiguration] = useState<any>({});
  const [installationProgress, setInstallationProgress] = useState<InstallationProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [systemCheck, setSystemCheck] = useState<any>(null);

  useEffect(() => {
    // Initialize configuration with defaults
    const defaultConfig: any = {};
    Object.entries(server.configuration).forEach(([key, config]) => {
      if (config.default !== undefined) {
        defaultConfig[key] = config.default;
      }
    });
    setConfiguration(defaultConfig);
    
    // Run system compatibility check
    performSystemCheck();
  }, [server]);

  const performSystemCheck = async () => {
    try {
      const checks = {
        nodeVersion: { status: 'checking', message: 'Checking Node.js version...' },
        diskSpace: { status: 'checking', message: 'Checking available disk space...' },
        permissions: { status: 'checking', message: 'Checking file permissions...' },
        dependencies: { status: 'checking', message: 'Checking system dependencies...' }
      };
      
      setSystemCheck(checks);

      // Simulate system checks (in real implementation, these would be actual system calls)
      setTimeout(() => {
        setSystemCheck({
          nodeVersion: { 
            status: 'success', 
            message: 'Node.js v18.16.0 (Compatible)' 
          },
          diskSpace: { 
            status: 'success', 
            message: `${(server.size / 1024 / 1024).toFixed(1)}MB required, 2.5GB available` 
          },
          permissions: { 
            status: 'success', 
            message: 'Write permissions available' 
          },
          dependencies: { 
            status: 'warning', 
            message: 'Some optional dependencies missing (non-critical)' 
          }
        });
      }, 2000);
    } catch (err) {
      setError('Failed to perform system check');
    }
  };

  const handleConfigurationChange = (key: string, value: any) => {
    setConfiguration((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  const validateConfiguration = (): boolean => {
    const requiredFields = Object.entries(server.configuration)
      .filter(([_, config]) => config.required)
      .map(([key, _]) => key);

    for (const field of requiredFields) {
      if (!configuration[field] || configuration[field] === '') {
        setError(`Required field "${field}" is missing`);
        return false;
      }
    }
    return true;
  };

  const handleInstall = async () => {
    if (!validateConfiguration()) return;

    setLoading(true);
    setError(null);
    
    try {
      // Simulate installation progress
      const steps = [
        'Downloading MCP server package...',
        'Verifying package integrity...',
        'Installing dependencies...',
        'Configuring server settings...',
        'Running initial setup...',
        'Starting server...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setInstallationProgress({
          step: i + 1,
          message: steps[i],
          progress: ((i + 1) / steps.length) * 100,
          logs: [`${new Date().toISOString()}: ${steps[i]}`]
        });
        
        // Simulate step delay
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      await onInstall(server.id, configuration);
      setActiveStep(3); // Move to completion step
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setLoading(false);
      setInstallationProgress(null);
    }
  };

  const handleUninstall = async () => {
    setLoading(true);
    try {
      await onUninstall(server.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Uninstallation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleServerAction = async (action: 'start' | 'stop') => {
    setLoading(true);
    try {
      if (action === 'start') {
        await onStart(server.id);
      } else {
        await onStop(server.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`);
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = (step: number) => {
    if (step < activeStep) return <CheckCircleIcon color="success" />;
    if (step === activeStep && loading) return <SpeedIcon color="primary" />;
    return step + 1;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'checking': return 'info';
      default: return 'default';
    }
  };

  const renderConfigurationForm = () => (
    <Grid container spacing={3}>
      {Object.entries(server.configuration).map(([key, config]) => (
        <Grid item xs={12} md={6} key={key}>
          {config.type === 'string' && (
            <TextField
              fullWidth
              label={key}
              value={configuration[key] || ''}
              onChange={(e) => handleConfigurationChange(key, e.target.value)}
              required={config.required}
              helperText={config.description}
            />
          )}
          {config.type === 'number' && (
            <TextField
              fullWidth
              type="number"
              label={key}
              value={configuration[key] || ''}
              onChange={(e) => handleConfigurationChange(key, Number(e.target.value))}
              required={config.required}
              helperText={config.description}
            />
          )}
          {config.type === 'boolean' && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={configuration[key] || false}
                  onChange={(e) => handleConfigurationChange(key, e.target.checked)}
                />
              }
              label={key}
            />
          )}
        </Grid>
      ))}
    </Grid>
  );

  const renderSystemCheck = () => (
    <Grid container spacing={2}>
      {systemCheck && Object.entries(systemCheck).map(([check, result]: [string, any]) => (
        <Grid item xs={12} key={check}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {result.status === 'checking' && <SpeedIcon color="primary" />}
              {result.status === 'success' && <CheckCircleIcon color="success" />}
              {result.status === 'warning' && <WarningIcon color="warning" />}
              {result.status === 'error' && <ErrorIcon color="error" />}
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                  {check.replace(/([A-Z])/g, ' $1').trim()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {result.message}
                </Typography>
              </Box>
              
              <Chip
                label={result.status}
                color={getStatusColor(result.status)}
                size="small"
              />
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          {server.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          by {server.author} • v{server.version}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Installation" />
        <Tab label="Configuration" />
        <Tab label="Documentation" />
        <Tab label="Examples" />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          {server.status === 'not-installed' ? (
            <Stepper activeStep={activeStep} orientation="vertical">
              <Step>
                <StepLabel icon={getStepIcon(0)}>System Compatibility Check</StepLabel>
                <StepContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Verifying system requirements and compatibility
                  </Typography>
                  {renderSystemCheck()}
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(1)}
                      disabled={!systemCheck || Object.values(systemCheck).some((check: any) => check.status === 'error')}
                    >
                      Continue
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              <Step>
                <StepLabel icon={getStepIcon(1)}>Review Requirements</StepLabel>
                <StepContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Review the server requirements and permissions
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardHeader 
                          title="Requirements" 
                          titleTypographyProps={{ variant: 'subtitle2' }}
                          avatar={<InfoIcon color="primary" />}
                        />
                        <CardContent sx={{ pt: 0 }}>
                          <List dense>
                            {server.requirements.map((req, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  <CheckCircleIcon color="success" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={req} />
                              </ListItem>
                            ))}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardHeader 
                          title="Permissions" 
                          titleTypographyProps={{ variant: 'subtitle2' }}
                          avatar={<SecurityIcon color="warning" />}
                        />
                        <CardContent sx={{ pt: 0 }}>
                          <List dense>
                            {server.permissions.map((permission, index) => (
                              <ListItem key={index}>
                                <ListItemIcon>
                                  <WarningIcon color="warning" fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary={permission} />
                              </ListItem>
                            ))}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(2)}
                      sx={{ mr: 1 }}
                    >
                      Accept & Continue
                    </Button>
                    <Button onClick={() => setActiveStep(0)}>
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              <Step>
                <StepLabel icon={getStepIcon(2)}>Install Server</StepLabel>
                <StepContent>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Install and configure the MCP server
                  </Typography>
                  
                  {installationProgress && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        Step {installationProgress.step}/6: {installationProgress.message}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={installationProgress.progress} 
                        sx={{ mb: 1 }}
                      />
                      {showLogs && (
                        <Paper sx={{ p: 1, bgcolor: 'grey.100', maxHeight: 200, overflow: 'auto' }}>
                          <Typography variant="caption" component="pre">
                            {installationProgress.logs.join('\n')}
                          </Typography>
                        </Paper>
                      )}
                      <Button
                        size="small"
                        onClick={() => setShowLogs(!showLogs)}
                        startIcon={<TerminalIcon />}
                      >
                        {showLogs ? 'Hide' : 'Show'} Logs
                      </Button>
                    </Box>
                  )}

                  <Box>
                    <Button
                      variant="contained"
                      onClick={handleInstall}
                      disabled={loading}
                      startIcon={<CloudDownloadIcon />}
                      sx={{ mr: 1 }}
                    >
                      {loading ? 'Installing...' : 'Install Server'}
                    </Button>
                    <Button onClick={() => setActiveStep(1)} disabled={loading}>
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>

              <Step>
                <StepLabel icon={getStepIcon(3)}>Complete</StepLabel>
                <StepContent>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      {server.name} has been successfully installed and is ready to use!
                    </Typography>
                  </Alert>
                  
                  <Box>
                    <Button variant="contained" onClick={onClose}>
                      Done
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            </Stepper>
          ) : (
            <Card>
              <CardHeader
                title="Server Management"
                subheader={`Status: ${server.status}`}
                action={
                  <Box>
                    <Tooltip title="Refresh Status">
                      <IconButton onClick={() => performSystemCheck()}>
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Logs">
                      <IconButton onClick={() => setShowLogs(true)}>
                        <BugReportIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Installed on {server.lastInstalled?.toLocaleDateString()}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {server.status === 'stopped' && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleServerAction('start')}
                      disabled={loading}
                      startIcon={<PlayArrowIcon />}
                    >
                      Start Server
                    </Button>
                  )}
                  
                  {server.status === 'running' && (
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => handleServerAction('stop')}
                      disabled={loading}
                      startIcon={<StopIcon />}
                    >
                      Stop Server
                    </Button>
                  )}
                  
                  <Button
                    variant="outlined"
                    startIcon={<SettingsIcon />}
                    onClick={() => setActiveTab(1)}
                  >
                    Configure
                  </Button>
                  
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleUninstall}
                    disabled={loading}
                    startIcon={<DeleteIcon />}
                  >
                    Uninstall
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Card>
          <CardHeader title="Configuration" />
          <CardContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure the server settings and parameters
            </Typography>
            {renderConfigurationForm()}
          </CardContent>
          <CardActions>
            <Button variant="contained" disabled={server.status === 'not-installed'}>
              Save Configuration
            </Button>
            <Button>
              Reset to Defaults
            </Button>
          </CardActions>
        </Card>
      )}

      {activeTab === 2 && (
        <Card>
          <CardHeader title="Documentation" />
          <CardContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {server.description}
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Installation Command
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
              <Typography variant="body2" component="code">
                {server.installCommand}
              </Typography>
            </Paper>
            
            <Button
              variant="outlined"
              startIcon={<CodeIcon />}
              onClick={() => window.open(server.repository, '_blank')}
            >
              View Repository
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 3 && (
        <Card>
          <CardHeader title="Examples" />
          <CardContent>
            {server.examples.map((example, index) => (
              <Accordion key={index}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2">{example.title}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {example.description}
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                    <Typography variant="body2" component="pre">
                      {example.code}
                    </Typography>
                  </Paper>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Logs Dialog */}
      <Dialog open={showLogs} onClose={() => setShowLogs(false)} maxWidth="md" fullWidth>
        <DialogTitle>Server Logs</DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, bgcolor: 'grey.100', maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="body2" component="pre">
              {installationProgress?.logs.join('\n') || 'No logs available'}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogs(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MCPServerInstaller;