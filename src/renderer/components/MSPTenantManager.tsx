// MSP Tenant Management UI Component
// Provides user interface for managing multiple tenants in MSP mode

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  Grid, 
  Typography, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Box, 
  Chip, 
  Alert, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Settings as SettingsIcon,
  AccountBalance as AccountBalanceIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

// MSP API types are defined in assets.d.ts global interface

interface MSPTenant {
  id: string;
  displayName: string;
  domain: string;
  isActive: boolean;
  lastAccessed: Date;
  subscriptionType: string;
  userCount: number;
  healthStatus: 'Healthy' | 'Warning' | 'Critical' | 'Unknown';
  partnerRelationship: {
    type: 'CSP' | 'DAP' | 'GDAP' | 'Direct';
    permissions: string[];
  };
  contactInfo: {
    primaryContact: string;
    email: string;
  };
  serviceLevel: 'Basic' | 'Standard' | 'Premium' | 'Enterprise';
  tags: string[];
}

interface MSPDashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  healthyTenants: number;
  tenantsWithIssues: number;
  monthlyRevenue: number;
  topServices: Array<{
    service: string;
    usage: number;
    tenantCount: number;
  }>;
  recentAlerts: Array<{
    tenantId: string;
    tenantName: string;
    alertType: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    message: string;
    timestamp: Date;
  }>;
}

export const MSPTenantManager: React.FC = () => {
  const [currentTenant, setCurrentTenant] = useState<MSPTenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<MSPTenant[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<MSPDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [switchingTenant, setSwitchingTenant] = useState(false);
  const [addTenantDialogOpen, setAddTenantDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load tenant data on component mount
  useEffect(() => {
    loadTenantData();
    loadDashboardMetrics();
  }, []);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call MSP service to get tenant context
      const response = await (window.electronAPI as any).msp.getTenantContext();
      
      if (response.success) {
        setCurrentTenant(response.data.currentTenant);
        setAvailableTenants(response.data.availableTenants);
      } else {
        setError('Failed to load tenant data: ' + response.error);
      }
    } catch (err) {
      setError('Failed to load tenant data: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardMetrics = async () => {
    try {
      const response = await (window.electronAPI as any).msp.getDashboardMetrics();
      
      if (response.success) {
        setDashboardMetrics(response.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    }
  };

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      setSwitchingTenant(true);
      setError(null);
      
      const response = await (window.electronAPI as any).msp.switchTenant(tenantId);
      
      if (response.success) {
        setCurrentTenant(response.data.tenant);
        setSuccess(`Successfully switched to ${response.data.tenant.displayName}`);
        
        // Reload metrics for new tenant context
        await loadDashboardMetrics();
      } else {
        setError('Failed to switch tenant: ' + response.error);
      }
    } catch (err) {
      setError('Failed to switch tenant: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSwitchingTenant(false);
    }
  };

  const handleAddTenant = async (tenantData: Partial<MSPTenant>) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await (window.electronAPI as any).msp.addTenant(tenantData);
      
      if (response.success) {
        setSuccess(`Successfully added tenant: ${response.data.tenant.displayName}`);
        await loadTenantData();
        setAddTenantDialogOpen(false);
      } else {
        setError('Failed to add tenant: ' + response.error);
      }
    } catch (err) {
      setError('Failed to add tenant: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to remove this tenant from management?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await (window.electronAPI as any).msp.removeTenant(tenantId);
      
      if (response.success) {
        setSuccess('Tenant removed successfully');
        await loadTenantData();
      } else {
        setError('Failed to remove tenant: ' + response.error);
      }
    } catch (err) {
      setError('Failed to remove tenant: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshHealth = async () => {
    try {
      setLoading(true);
      const response = await (window.electronAPI as any).msp.refreshTenantHealth();
      
      if (response.success) {
        setSuccess('Tenant health status refreshed');
        await loadTenantData();
        await loadDashboardMetrics();
      } else {
        setError('Failed to refresh tenant health: ' + response.error);
      }
    } catch (err) {
      setError('Failed to refresh tenant health: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'Healthy':
        return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'Warning':
        return <WarningIcon sx={{ color: '#ff9800' }} />;
      case 'Critical':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:
        return <ErrorIcon sx={{ color: '#9e9e9e' }} />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return '#4caf50';
      case 'Warning': return '#ff9800';
      case 'Critical': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <BusinessIcon sx={{ mr: 2 }} />
          MSP Tenant Management
        </Typography>
        
        {/* Current Tenant Selector */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 300 }}>
            <InputLabel>Current Tenant</InputLabel>
            <Select
              value={currentTenant?.id || ''}
              onChange={(e) => handleTenantSwitch(e.target.value)}
              disabled={switchingTenant || loading}
              label="Current Tenant"
            >
              {availableTenants.map((tenant) => (
                <MenuItem key={tenant.id} value={tenant.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getHealthStatusIcon(tenant.healthStatus)}
                    <Typography>{tenant.displayName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({tenant.domain})
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {switchingTenant && <CircularProgress size={24} />}
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddTenantDialogOpen(true)}
            disabled={loading}
          >
            Add Tenant
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshHealth}
            disabled={loading}
          >
            Refresh Health
          </Button>
        </Box>

        {/* Status Messages */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}
      </Box>

      {/* Dashboard Metrics */}
      {dashboardMetrics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Tenants
                    </Typography>
                    <Typography variant="h4">
                      {dashboardMetrics.totalTenants}
                    </Typography>
                  </Box>
                  <BusinessIcon sx={{ fontSize: 40, color: '#1976d2' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Users
                    </Typography>
                    <Typography variant="h4">
                      {dashboardMetrics.totalUsers.toLocaleString()}
                    </Typography>
                  </Box>
                  <PeopleIcon sx={{ fontSize: 40, color: '#388e3c' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Healthy Tenants
                    </Typography>
                    <Typography variant="h4">
                      {dashboardMetrics.healthyTenants}
                    </Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Monthly Revenue
                    </Typography>
                    <Typography variant="h4">
                      ${dashboardMetrics.monthlyRevenue.toLocaleString()}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ fontSize: 40, color: '#ff9800' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tenant List */}
      <Card>
        <CardHeader 
          title="Managed Tenants"
          action={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadTenantData}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        />
        <CardContent>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Tenant</TableCell>
                  <TableCell>Health</TableCell>
                  <TableCell>Users</TableCell>
                  <TableCell>Subscription</TableCell>
                  <TableCell>Service Level</TableCell>
                  <TableCell>Last Accessed</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {tenant.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tenant.domain}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          {tenant.tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getHealthStatusIcon(tenant.healthStatus)}
                        <Typography
                          variant="caption"
                          sx={{ color: getHealthStatusColor(tenant.healthStatus) }}
                        >
                          {tenant.healthStatus}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {tenant.userCount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {tenant.subscriptionType}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tenant.serviceLevel}
                        color={
                          tenant.serviceLevel === 'Enterprise' ? 'primary' :
                          tenant.serviceLevel === 'Premium' ? 'secondary' :
                          'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(tenant.lastAccessed).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Edit Tenant">
                          <IconButton size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove Tenant">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRemoveTenant(tenant.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Add Tenant Dialog */}
      <AddTenantDialog
        open={addTenantDialogOpen}
        onClose={() => setAddTenantDialogOpen(false)}
        onAdd={handleAddTenant}
      />
    </Box>
  );
};

// Add Tenant Dialog Component
interface AddTenantDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (tenantData: Partial<MSPTenant>) => void;
}

const AddTenantDialog: React.FC<AddTenantDialogProps> = ({ open, onClose, onAdd }) => {
  const [tenantData, setTenantData] = useState<Partial<MSPTenant>>({
    displayName: '',
    domain: '',
    subscriptionType: 'Business Standard',
    serviceLevel: 'Standard',
    partnerRelationship: {
      type: 'DAP',
      permissions: ['User.Read.All', 'Group.Read.All']
    },
    contactInfo: {
      primaryContact: '',
      email: ''
    },
    tags: []
  });

  const handleSubmit = () => {
    if (!tenantData.displayName || !tenantData.domain) {
      alert('Please fill in required fields');
      return;
    }
    
    onAdd(tenantData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Tenant</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Tenant Name *"
              value={tenantData.displayName || ''}
              onChange={(e) => setTenantData({ ...tenantData, displayName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Domain *"
              value={tenantData.domain || ''}
              onChange={(e) => setTenantData({ ...tenantData, domain: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Subscription Type</InputLabel>
              <Select
                value={tenantData.subscriptionType || ''}
                onChange={(e) => setTenantData({ ...tenantData, subscriptionType: e.target.value })}
                label="Subscription Type"
              >
                <MenuItem value="Business Basic">Business Basic</MenuItem>
                <MenuItem value="Business Standard">Business Standard</MenuItem>
                <MenuItem value="Business Premium">Business Premium</MenuItem>
                <MenuItem value="E3">E3</MenuItem>
                <MenuItem value="E5">E5</MenuItem>
                <MenuItem value="F3">F3</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Service Level</InputLabel>
              <Select
                value={tenantData.serviceLevel || ''}
                onChange={(e) => setTenantData({ ...tenantData, serviceLevel: e.target.value as any })}
                label="Service Level"
              >
                <MenuItem value="Basic">Basic</MenuItem>
                <MenuItem value="Standard">Standard</MenuItem>
                <MenuItem value="Premium">Premium</MenuItem>
                <MenuItem value="Enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Primary Contact"
              value={tenantData.contactInfo?.primaryContact || ''}
              onChange={(e) => setTenantData({ 
                ...tenantData, 
                contactInfo: { 
                  ...tenantData.contactInfo!, 
                  primaryContact: e.target.value 
                }
              })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Contact Email"
              type="email"
              value={tenantData.contactInfo?.email || ''}
              onChange={(e) => setTenantData({ 
                ...tenantData, 
                contactInfo: { 
                  ...tenantData.contactInfo!, 
                  email: e.target.value 
                }
              })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">
          Add Tenant
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MSPTenantManager;