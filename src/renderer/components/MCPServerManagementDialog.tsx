// MCPServerManagementDialog.tsx
// Dialog for managing custom MCP servers

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon
} from '@mui/icons-material';
import { MCPServerConfig } from '../../types';

interface MCPServerManagementDialogProps {
  open: boolean;
  onClose: () => void;
}

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
      id={`mcp-tabpanel-${index}`}
      aria-labelledby={`mcp-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const MCPServerManagementDialog: React.FC<MCPServerManagementDialogProps> = ({
  open,
  onClose
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [builtInServers, setBuiltInServers] = useState<MCPServerConfig[]>([]);
  const [customServers, setCustomServers] = useState<MCPServerConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<Record<string, 'running' | 'stopped' | 'error'>>({});
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newServer, setNewServer] = useState<Partial<MCPServerConfig>>({
    name: '',
    type: 'custom-stdio',
    port: 0,
    enabled: true,
    command: '',
    args: [],
    displayName: '',
    description: ''
  });

  useEffect(() => {
    if (open) {
      loadServers();
    }
  }, [open]);

  const loadServers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load built-in servers (from config)
      const mcpConfig = await window.electronAPI.config.getMCPConfig();
      const builtIns: MCPServerConfig[] = [
        {
          name: 'external-lokka',
          type: 'external-lokka',
          port: 0,
          enabled: mcpConfig.lokka?.enabled ?? false,
          isBuiltIn: true,
          displayName: 'Lokka (Microsoft Graph)',
          description: 'Microsoft Graph API access via Lokka MCP server',
          category: 'builtin'
        },
        {
          name: 'fetch',
          type: 'fetch',
          port: 3002,
          enabled: mcpConfig.fetch?.enabled ?? true,
          isBuiltIn: true,
          displayName: 'Fetch',
          description: 'Web content fetching and documentation retrieval',
          category: 'builtin'
        },
        {
          name: 'microsoft-docs',
          type: 'microsoft-docs',
          port: 0,
          enabled: mcpConfig.microsoftDocs?.enabled ?? true,
          isBuiltIn: true,
          displayName: 'Microsoft Docs',
          description: 'Microsoft Learn documentation and official docs',
          category: 'builtin'
        }
      ];

      // Load custom servers
      const customServerList = await window.electronAPI.config.getCustomMCPServers();

      setBuiltInServers(builtIns);
      setCustomServers(customServerList);

      // Check server status
      const statusCheck: Record<string, 'running' | 'stopped' | 'error'> = {};
      for (const server of [...builtIns, ...customServerList]) {
        if (server.enabled) {
          statusCheck[server.name] = 'running'; // Simplified for now
        } else {
          statusCheck[server.name] = 'stopped';
        }
      }
      setServerStatus(statusCheck);

    } catch (err) {
      setError(`Failed to load MCP servers: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleToggleServer = async (serverName: string, enabled: boolean, isBuiltIn: boolean) => {
    try {
      if (isBuiltIn) {
        // Handle built-in server toggle
        const mcpConfig = await window.electronAPI.config.getMCPConfig();
        switch (serverName) {
          case 'external-lokka':
            await window.electronAPI.config.updateLokkaMCPConfig({ enabled });
            break;
          case 'fetch':
            await window.electronAPI.config.saveMCPConfig({
              ...mcpConfig,
              fetch: { enabled }
            });
            break;
          case 'microsoft-docs':
            await window.electronAPI.config.saveMCPConfig({
              ...mcpConfig,
              microsoftDocs: { enabled }
            });
            break;
        }
      } else {
        // Handle custom server toggle
        await window.electronAPI.config.updateCustomMCPServer(serverName, { enabled });
      }

      // Reload servers to reflect changes
      await loadServers();
    } catch (err) {
      setError(`Failed to toggle server: ${err}`);
    }
  };

  const handleDeleteCustomServer = async (serverName: string) => {
    if (window.confirm(`Are you sure you want to delete the MCP server "${serverName}"?`)) {
      try {
        const result = await window.electronAPI.config.removeCustomMCPServer(serverName);
        if (result.success) {
          await loadServers();
        } else {
          setError(result.error || 'Failed to delete server');
        }
      } catch (err) {
        setError(`Failed to delete server: ${err}`);
      }
    }
  };

  const handleTestConnection = async (server: MCPServerConfig) => {
    try {
      setError(null);
      const result = await window.electronAPI.config.testMCPServerConnection(server);
      if (result.success) {
        alert(`Connection successful! Found ${result.tools?.length || 0} tools.`);
      } else {
        alert(`Connection failed: ${result.error}`);
      }
    } catch (err) {
      setError(`Test failed: ${err}`);
    }
  };

  const handleAddCustomServer = async () => {
    try {
      setError(null);
      
      // Validate the server configuration
      const validation = await window.electronAPI.config.validateMCPServerConfig(newServer as MCPServerConfig);
      if (!validation.valid) {
        setError(`Configuration invalid: ${validation.errors.join(', ')}`);
        return;
      }
      
      // Add the server
      const result = await window.electronAPI.config.addCustomMCPServer(newServer as MCPServerConfig);
      if (result.success) {
        // Reset form and close dialog
        setNewServer({
          name: '',
          type: 'custom-stdio',
          port: 0,
          enabled: true,
          command: '',
          args: [],
          displayName: '',
          description: ''
        });
        setAddDialogOpen(false);
        
        // Reload servers to show the new one
        await loadServers();
      } else {
        setError(result.error || 'Failed to add server');
      }
    } catch (err) {
      setError(`Failed to add server: ${err}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const ServerCard: React.FC<{ server: MCPServerConfig; isBuiltIn: boolean }> = ({ server, isBuiltIn }) => (
    <Card sx={{ mb: 2 }} variant="outlined">
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            {getStatusIcon(serverStatus[server.name])}
            <Typography variant="h6">
              {server.displayName || server.name}
            </Typography>
            <Chip 
              label={isBuiltIn ? 'Built-in' : 'Custom'} 
              size="small" 
              color={isBuiltIn ? 'primary' : 'secondary'}
            />
            <Chip 
              label={server.type} 
              size="small" 
              variant="outlined"
            />
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={server.enabled}
                onChange={(e) => handleToggleServer(server.name, e.target.checked, isBuiltIn)}
              />
            }
            label="Enabled"
          />
        </Box>
        
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {server.description || 'No description available'}
        </Typography>

        {server.command && (
          <Typography variant="caption" display="block">
            Command: {server.command} {server.args?.join(' ')}
          </Typography>
        )}

        {server.url && (
          <Typography variant="caption" display="block">
            URL: {server.url}
          </Typography>
        )}
      </CardContent>

      <CardActions>
        <Button 
          size="small" 
          startIcon={<PlayIcon />}
          onClick={() => handleTestConnection(server)}
          disabled={!server.enabled}
        >
          Test Connection
        </Button>
        
        {!isBuiltIn && (
          <>
            <Button 
              size="small" 
              startIcon={<EditIcon />}
              disabled // TODO: Implement edit functionality
            >
              Edit
            </Button>
            <Button 
              size="small" 
              startIcon={<DeleteIcon />}
              color="error"
              onClick={() => handleDeleteCustomServer(server.name)}
            >
              Delete
            </Button>
          </>
        )}
      </CardActions>
    </Card>
  );

  return (
    <>
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          <Typography variant="h6">MCP Server Management</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label={`Built-in Servers (${builtInServers.length})`} />
            <Tab label={`Custom Servers (${customServers.length})`} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Built-in MCP servers provided by DynamicEndpoint Assistant
          </Typography>
          {builtInServers.map((server) => (
            <ServerCard key={server.name} server={server} isBuiltIn={true} />
          ))}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="textSecondary">
              Custom MCP servers configured by you
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddDialogOpen(true)}
            >
              Add Custom Server
            </Button>
          </Box>
          
          {customServers.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="textSecondary">
                No custom MCP servers configured.
              </Typography>
              <Typography variant="caption" display="block" mt={1}>
                Add custom servers to extend DynamicEndpoint Assistant's capabilities.
              </Typography>
            </Box>
          ) : (
            customServers.map((server) => (
              <ServerCard key={server.name} server={server} isBuiltIn={false} />
            ))
          )}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>

    {/* Add Custom Server Dialog */}
    <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Add Custom MCP Server</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Server Name"
            value={newServer.name || ''}
            onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
            required
            helperText="Unique identifier for the server"
          />
          
          <TextField
            label="Display Name"
            value={newServer.displayName || ''}
            onChange={(e) => setNewServer({ ...newServer, displayName: e.target.value })}
            helperText="User-friendly name shown in the UI"
          />
          
          <TextField
            label="Description"
            value={newServer.description || ''}
            onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
            multiline
            rows={2}
            helperText="Brief description of what this server does"
          />
          
          <FormControl>
            <InputLabel>Server Type</InputLabel>
            <Select
              value={newServer.type || 'custom-stdio'}
              onChange={(e) => setNewServer({ ...newServer, type: e.target.value as any })}
            >
              <MenuItem value="custom-stdio">STDIO (Command Line)</MenuItem>
              <MenuItem value="custom-http">HTTP Server</MenuItem>
            </Select>
          </FormControl>
          
          {newServer.type === 'custom-stdio' && (
            <>
              <TextField
                label="Command"
                value={newServer.command || ''}
                onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                required
                helperText="Command to execute (e.g., 'npx', 'node', 'python')"
              />
              
              <TextField
                label="Arguments"
                value={newServer.args?.join(' ') || ''}
                onChange={(e) => setNewServer({ 
                  ...newServer, 
                  args: e.target.value.split(' ').filter(arg => arg.trim()) 
                })}
                helperText="Space-separated command arguments"
              />
            </>
          )}
          
          {newServer.type === 'custom-http' && (
            <TextField
              label="Server URL"
              value={newServer.url || ''}
              onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
              required
              helperText="HTTP endpoint URL (e.g., http://localhost:3000)"
            />
          )}
          
          <FormControlLabel
            control={
              <Switch
                checked={newServer.enabled || false}
                onChange={(e) => setNewServer({ ...newServer, enabled: e.target.checked })}
              />
            }
            label="Enable server after adding"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
        <Button 
          onClick={handleAddCustomServer}
          variant="contained"
          disabled={!newServer.name || (!newServer.command && !newServer.url)}
        >
          Add Server
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};