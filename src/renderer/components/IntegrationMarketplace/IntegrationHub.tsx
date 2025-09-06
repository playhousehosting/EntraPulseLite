import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Grid,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Badge,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Store as StoreIcon,
  Extension as ExtensionIcon,
  AccountTree as WorkflowIcon,
  Api as ApiIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

import { IntegrationMarketplace } from './IntegrationMarketplace';
import MCPServerInstaller from './MCPServerInstaller';
import WorkflowBuilder from './WorkflowBuilder';
import APIManagementConsole from './APIManagementConsole';

interface IntegrationStats {
  totalIntegrations: number;
  activeConnections: number;
  runningWorkflows: number;
  recentActivity: Array<{
    id: string;
    type: 'install' | 'update' | 'execute' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

interface IntegrationHubProps {
  // No navigation props needed - navigation handled internally
}

export const IntegrationHub: React.FC<IntegrationHubProps> = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState<IntegrationStats>({
    totalIntegrations: 12,
    activeConnections: 8,
    runningWorkflows: 3,
    recentActivity: [
      {
        id: '1',
        type: 'install',
        message: 'Microsoft Graph MCP Server installed successfully',
        timestamp: new Date(Date.now() - 1000 * 60 * 5)
      },
      {
        id: '2',
        type: 'execute',
        message: 'User Analytics workflow completed',
        timestamp: new Date(Date.now() - 1000 * 60 * 15)
      },
      {
        id: '3',
        type: 'update',
        message: 'Salesforce API connection updated',
        timestamp: new Date(Date.now() - 1000 * 60 * 30)
      }
    ]
  });

  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'info',
      title: 'New Integration Available',
      message: 'Microsoft Teams MCP Server v2.1 is now available',
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'warning',
      title: 'Workflow Needs Attention',
      message: 'Email Notification workflow has failed 3 times',
      timestamp: new Date(Date.now() - 1000 * 60 * 10)
    }
  ]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'install':
      case 'execute':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'update':
        return <WarningIcon color="warning" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      default:
        return <CheckCircleIcon color="primary" fontSize="small" />;
    }
  };

  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* Quick Stats */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardHeader 
            title="Integration Overview"
            avatar={<StoreIcon color="primary" />}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Total Integrations
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {stats.totalIntegrations}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Active Connections
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {stats.activeConnections}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Running Workflows
                  </Typography>
                  <Typography variant="h6" color="info.main">
                    {stats.runningWorkflows}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardHeader 
            title="Quick Actions"
            avatar={<AddIcon color="primary" />}
          />
          <CardContent>
            <Grid container spacing={1}>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ExtensionIcon />}
                  onClick={() => setActiveTab(1)}
                >
                  Browse Marketplace
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<WorkflowIcon />}
                  onClick={() => setActiveTab(2)}
                >
                  Create Workflow
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ApiIcon />}
                  onClick={() => setActiveTab(3)}
                >
                  Add API Connection
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setShowSettings(true)}
                >
                  Integration Settings
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Notifications */}
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardHeader 
            title="Notifications"
            avatar={
              <Badge badgeContent={notifications.length} color="error">
                <NotificationsIcon color="primary" />
              </Badge>
            }
          />
          <CardContent>
            <List dense>
              {notifications.slice(0, 3).map((notification) => (
                <ListItem key={notification.id} sx={{ px: 0 }}>
                  <ListItemIcon>
                    {notification.type === 'warning' ? (
                      <WarningIcon color="warning" fontSize="small" />
                    ) : (
                      <CheckCircleIcon color="info" fontSize="small" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.title}
                    secondary={notification.message}
                    secondaryTypographyProps={{
                      variant: 'caption',
                      noWrap: true
                    }}
                  />
                </ListItem>
              ))}
            </List>
            {notifications.length > 3 && (
              <Button size="small" sx={{ mt: 1 }}>
                View All ({notifications.length})
              </Button>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader 
            title="Recent Activity"
            avatar={<TimelineIcon color="primary" />}
          />
          <CardContent>
            <List>
              {stats.recentActivity.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      {getActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.message}
                      secondary={activity.timestamp.toLocaleString()}
                    />
                    <Chip
                      label={activity.type}
                      size="small"
                      color={
                        activity.type === 'error' ? 'error' :
                        activity.type === 'update' ? 'warning' :
                        'primary'
                      }
                      variant="outlined"
                    />
                  </ListItem>
                  {index < stats.recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* System Status */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader 
            title="System Status"
            avatar={<AssessmentIcon color="primary" />}
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    MCP Servers
                  </Typography>
                  <Chip label="Online" color="success" size="small" />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    Workflow Engine
                  </Typography>
                  <Chip label="Running" color="success" size="small" />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    API Gateway
                  </Typography>
                  <Chip label="Healthy" color="success" size="small" />
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">
                    Database
                  </Typography>
                  <Chip label="Connected" color="success" size="small" />
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderMarketplace = () => (
    <IntegrationMarketplace />
  );

  const renderWorkflows = () => (
    <WorkflowBuilder
      onSave={(workflow) => {
        console.log('Saving workflow:', workflow);
      }}
      onExecute={(workflowId) => {
        console.log('Executing workflow:', workflowId);
      }}
      onClose={() => setActiveTab(0)}
    />
  );

  const renderAPIConsole = () => (
    <APIManagementConsole
      connections={[]}
      onCreateConnection={(connection) => {
        console.log('Creating connection:', connection);
      }}
      onUpdateConnection={(connection) => {
        console.log('Updating connection:', connection);
      }}
      onDeleteConnection={(connectionId) => {
        console.log('Deleting connection:', connectionId);
      }}
      onTestConnection={async (connectionId) => {
        console.log('Testing connection:', connectionId);
        return {
          success: true,
          responseTime: 250,
          timestamp: new Date()
        };
      }}
      onCallEndpoint={async (connectionId, endpointId, params) => {
        console.log('Calling endpoint:', { connectionId, endpointId, params });
        return {
          success: true,
          responseTime: 150,
          statusCode: 200,
          timestamp: new Date()
        };
      }}
    />
  );

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 3, pb: 0 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ExtensionIcon sx={{ mr: 2 }} />
          Integration Hub
        </Typography>
        
        {/* Navigation Tabs */}
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Overview" icon={<AssessmentIcon />} />
          <Tab label="Marketplace" icon={<StoreIcon />} />
          <Tab label="Workflows" icon={<WorkflowIcon />} />
          <Tab label="API Console" icon={<ApiIcon />} />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        {activeTab === 0 && renderOverview()}
        {activeTab === 1 && renderMarketplace()}
        {activeTab === 2 && renderWorkflows()}
        {activeTab === 3 && renderAPIConsole()}
      </Box>

      {/* Integration Settings Dialog */}
      <Dialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Integration Settings</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                MCP Server Configuration
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Configure Model Context Protocol servers for enhanced integrations
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                  Manage MCP Servers
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Workflow Engine Settings
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Configure workflow execution and scheduling options
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                  Configure Workflows
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                API Connection Defaults
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Set default timeouts, retry policies, and authentication settings
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                  Configure API Defaults
                </Button>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Security & Permissions
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Manage integration security policies and user permissions
                </Typography>
                <Button variant="outlined" size="small" sx={{ mt: 1 }}>
                  Security Settings
                </Button>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSettings(false)}>
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setShowSettings(false);
              // TODO: Save settings
            }}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IntegrationHub;