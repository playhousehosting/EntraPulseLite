import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Button,
  IconButton,
  Grid,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip,
  Badge,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  Api as ApiIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon,
  VpnKey as KeyIcon,
  CloudSync as CloudSyncIcon,
  Assessment as AssessmentIcon,
  Create as CreateIcon,
  ImportExport as ImportExportIcon,
  Share as ShareIcon
} from '@mui/icons-material';

interface APIConnection {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  authType: 'none' | 'apikey' | 'bearer' | 'oauth2' | 'basic';
  authConfig: {
    [key: string]: any;
  };
  headers: { [key: string]: string };
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastTested: Date;
  responseTime?: number;
  endpoints: APIEndpoint[];
  tags: string[];
  version: string;
  documentation?: string;
  rateLimits?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  usage: {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageResponseTime: number;
    lastCall?: Date;
  };
}

interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  parameters: Array<{
    name: string;
    type: 'query' | 'path' | 'header' | 'body';
    dataType: string;
    required: boolean;
    description: string;
  }>;
  responseSchema: any;
  examples: Array<{
    name: string;
    request: any;
    response: any;
  }>;
  lastCalled?: Date;
  callCount: number;
  averageResponseTime: number;
}

interface APITestResult {
  success: boolean;
  statusCode?: number;
  responseTime: number;
  response?: any;
  error?: string;
  timestamp: Date;
}

interface APIManagementConsoleProps {
  connections: APIConnection[];
  onCreateConnection: (connection: Omit<APIConnection, 'id'>) => void;
  onUpdateConnection: (connection: APIConnection) => void;
  onDeleteConnection: (connectionId: string) => void;
  onTestConnection: (connectionId: string) => Promise<APITestResult>;
  onCallEndpoint: (connectionId: string, endpointId: string, params: any) => Promise<APITestResult>;
}

export const APIManagementConsole: React.FC<APIManagementConsoleProps> = ({
  connections,
  onCreateConnection,
  onUpdateConnection,
  onDeleteConnection,
  onTestConnection,
  onCallEndpoint
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedConnection, setSelectedConnection] = useState<APIConnection | null>(null);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testResults, setTestResults] = useState<APITestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newConnection, setNewConnection] = useState<Partial<APIConnection>>({
    name: '',
    description: '',
    baseUrl: '',
    authType: 'none',
    authConfig: {},
    headers: {},
    endpoints: [],
    tags: [],
    version: '1.0'
  });

  const authTypes = [
    { value: 'none', label: 'No Authentication' },
    { value: 'apikey', label: 'API Key' },
    { value: 'bearer', label: 'Bearer Token' },
    { value: 'oauth2', label: 'OAuth 2.0' },
    { value: 'basic', label: 'Basic Authentication' }
  ];

  const handleCreateConnection = () => {
    setNewConnection({
      name: '',
      description: '',
      baseUrl: '',
      authType: 'none',
      authConfig: {},
      headers: {},
      endpoints: [],
      tags: [],
      version: '1.0'
    });
    setConnectionDialogOpen(true);
  };

  const handleSaveConnection = () => {
    if (!newConnection.name || !newConnection.baseUrl) {
      setError('Name and Base URL are required');
      return;
    }

    const connection: Omit<APIConnection, 'id'> = {
      ...newConnection as APIConnection,
      status: 'disconnected',
      lastTested: new Date(),
      usage: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageResponseTime: 0
      }
    };

    onCreateConnection(connection);
    setConnectionDialogOpen(false);
  };

  const handleTestConnection = async (connection: APIConnection) => {
    setLoading(true);
    try {
      const result = await onTestConnection(connection.id);
      setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
      
      // Update connection status
      const updatedConnection = {
        ...connection,
        status: result.success ? 'connected' as const : 'error' as const,
        lastTested: new Date(),
        responseTime: result.responseTime
      };
      onUpdateConnection(updatedConnection);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'error': return 'error';
      case 'testing': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon color="success" />;
      case 'error': return <ErrorIcon color="error" />;
      case 'testing': return <SpeedIcon color="warning" />;
      default: return <WarningIcon color="disabled" />;
    }
  };

  const renderConnectionCard = (connection: APIConnection) => (
    <Card key={connection.id} sx={{ height: '100%' }}>
      <CardHeader
        avatar={getStatusIcon(connection.status)}
        title={connection.name}
        subheader={
          <Box>
            <Typography variant="caption" color="text.secondary">
              {connection.baseUrl}
            </Typography>
            <br />
            <Typography variant="caption" color="text.secondary">
              {connection.endpoints.length} endpoints • v{connection.version}
            </Typography>
          </Box>
        }
        action={
          <Box>
            <Tooltip title="Test Connection">
              <IconButton
                onClick={() => handleTestConnection(connection)}
                disabled={loading}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton onClick={() => setSelectedConnection(connection)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      
      <CardContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {connection.description}
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {connection.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Total Calls
            </Typography>
            <Typography variant="h6">
              {connection.usage.totalCalls.toLocaleString()}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Success Rate
            </Typography>
            <Typography variant="h6">
              {connection.usage.totalCalls > 0 
                ? Math.round((connection.usage.successfulCalls / connection.usage.totalCalls) * 100) 
                : 0}%
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Avg Response
            </Typography>
            <Typography variant="body2">
              {connection.usage.averageResponseTime}ms
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Last Tested
            </Typography>
            <Typography variant="body2">
              {connection.lastTested.toLocaleDateString()}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
      
      <CardActions>
        <Button
          size="small"
          onClick={() => {
            setSelectedConnection(connection);
            setTestDialogOpen(true);
          }}
          startIcon={<PlayArrowIcon />}
        >
          Test Endpoints
        </Button>
        <Button
          size="small"
          onClick={() => setSelectedConnection(connection)}
          startIcon={<SettingsIcon />}
        >
          Configure
        </Button>
      </CardActions>
    </Card>
  );

  const renderConnectionForm = () => (
    <Dialog
      open={connectionDialogOpen}
      onClose={() => setConnectionDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Create API Connection</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Connection Name"
              value={newConnection.name}
              onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Version"
              value={newConnection.version}
              onChange={(e) => setNewConnection(prev => ({ ...prev, version: e.target.value }))}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={newConnection.description}
              onChange={(e) => setNewConnection(prev => ({ ...prev, description: e.target.value }))}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Base URL"
              placeholder="https://api.example.com"
              value={newConnection.baseUrl}
              onChange={(e) => setNewConnection(prev => ({ ...prev, baseUrl: e.target.value }))}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Authentication Type</InputLabel>
              <Select
                value={newConnection.authType}
                onChange={(e) => setNewConnection(prev => ({ ...prev, authType: e.target.value as any }))}
                label="Authentication Type"
              >
                {authTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          {newConnection.authType === 'apikey' && (
            <>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="API Key Header"
                  placeholder="X-API-Key"
                  value={newConnection.authConfig?.header || ''}
                  onChange={(e) => setNewConnection(prev => ({
                    ...prev,
                    authConfig: { ...prev.authConfig, header: e.target.value }
                  }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="API Key"
                  value={newConnection.authConfig?.key || ''}
                  onChange={(e) => setNewConnection(prev => ({
                    ...prev,
                    authConfig: { ...prev.authConfig, key: e.target.value }
                  }))}
                />
              </Grid>
            </>
          )}
          
          {newConnection.authType === 'bearer' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="password"
                label="Bearer Token"
                value={newConnection.authConfig?.token || ''}
                onChange={(e) => setNewConnection(prev => ({
                  ...prev,
                  authConfig: { ...prev.authConfig, token: e.target.value }
                }))}
              />
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setConnectionDialogOpen(false)}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSaveConnection}>
          Create Connection
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderAnalyticsDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="primary">
              {connections.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Connections
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="success.main">
              {connections.filter(c => c.status === 'connected').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Connections
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="info.main">
              {connections.reduce((sum, c) => sum + c.usage.totalCalls, 0).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total API Calls
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography variant="h4" color="warning.main">
              {connections.reduce((sum, c) => sum + c.usage.averageResponseTime, 0) / connections.length || 0}ms
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Avg Response Time
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Card>
          <CardHeader title="Recent Test Results" />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response Time</TableCell>
                    <TableCell>Status Code</TableCell>
                    <TableCell>Result</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {testResults.slice(0, 10).map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {result.timestamp.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={result.success ? 'Success' : 'Failed'}
                          color={result.success ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{result.responseTime}ms</TableCell>
                      <TableCell>{result.statusCode || 'N/A'}</TableCell>
                      <TableCell>
                        {result.error || 'OK'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderEndpointTester = () => (
    <Dialog
      open={testDialogOpen}
      onClose={() => setTestDialogOpen(false)}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        API Endpoint Tester - {selectedConnection?.name}
      </DialogTitle>
      <DialogContent>
        {selectedConnection && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Base URL: {selectedConnection.baseUrl}
            </Typography>
            
            {selectedConnection.endpoints.length === 0 ? (
              <Alert severity="info">
                No endpoints defined for this connection. Add endpoints to test them.
              </Alert>
            ) : (
              <List>
                {selectedConnection.endpoints.map((endpoint) => (
                  <ListItem key={endpoint.id}>
                    <ListItemIcon>
                      <Chip
                        label={endpoint.method}
                        color={
                          endpoint.method === 'GET' ? 'primary' :
                          endpoint.method === 'POST' ? 'success' :
                          endpoint.method === 'PUT' ? 'warning' :
                          endpoint.method === 'DELETE' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={endpoint.path}
                      secondary={endpoint.description}
                    />
                    <Button
                      size="small"
                      onClick={() => onCallEndpoint(selectedConnection.id, endpoint.id, {})}
                      startIcon={<PlayArrowIcon />}
                    >
                      Test
                    </Button>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setTestDialogOpen(false)}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <ApiIcon sx={{ mr: 2 }} />
          API Management Console
        </Typography>
        <Button
          variant="contained"
          onClick={handleCreateConnection}
          startIcon={<AddIcon />}
        >
          Add Connection
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Connections" icon={<ApiIcon />} />
        <Tab label="Analytics" icon={<AssessmentIcon />} />
        <Tab label="Documentation" icon={<DescriptionIcon />} />
      </Tabs>

      {/* Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {connections.map((connection) => (
            <Grid item xs={12} md={6} lg={4} key={connection.id}>
              {renderConnectionCard(connection)}
            </Grid>
          ))}
          
          {connections.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <ApiIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No API connections configured
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Get started by creating your first API connection
                </Typography>
                <Button
                  variant="contained"
                  onClick={handleCreateConnection}
                  startIcon={<AddIcon />}
                >
                  Create Connection
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {activeTab === 1 && renderAnalyticsDashboard()}

      {activeTab === 2 && (
        <Card>
          <CardHeader title="API Documentation" />
          <CardContent>
            <Typography variant="body1" paragraph>
              The API Management Console allows you to configure, test, and monitor external API connections.
            </Typography>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Getting Started</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">
                  1. Click "Add Connection" to create a new API connection<br />
                  2. Configure authentication and connection details<br />
                  3. Test the connection to verify it works<br />
                  4. Add endpoints to test specific API calls<br />
                  5. Monitor usage and performance in the Analytics tab
                </Typography>
              </AccordionDetails>
            </Accordion>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Authentication Types</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="API Key"
                      secondary="Include API key in request headers"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Bearer Token"
                      secondary="Include bearer token in Authorization header"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="OAuth 2.0"
                      secondary="Use OAuth 2.0 flow for authentication"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Basic Auth"
                      secondary="Username and password authentication"
                    />
                  </ListItem>
                </List>
              </AccordionDetails>
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {renderConnectionForm()}
      {renderEndpointTester()}

      {/* Speed Dial */}
      <SpeedDial
        ariaLabel="API Management Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
      >
        <SpeedDialAction
          icon={<CreateIcon />}
          tooltipTitle="Create Connection"
          onClick={handleCreateConnection}
        />
        <SpeedDialAction
          icon={<ImportExportIcon />}
          tooltipTitle="Import/Export"
          onClick={() => {}}
        />
        <SpeedDialAction
          icon={<ShareIcon />}
          tooltipTitle="Share Configuration"
          onClick={() => {}}
        />
      </SpeedDial>
    </Box>
  );
};

export default APIManagementConsole;