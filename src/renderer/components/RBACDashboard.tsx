import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Alert,
  IconButton,
  Tooltip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Autocomplete,
  Avatar,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  History as HistoryIcon,
  FileDownload as ExportIcon,
  Upload as ImportIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { Role, Permission, RoleDefinition, RoleAssignment, UserRole } from '../../shared/RBACService';

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
      id={`rbac-tabpanel-${index}`}
      aria-labelledby={`rbac-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

interface RoleDialogData {
  id?: Role;
  name: string;
  description: string;
  permissions: Permission[];
  tenantScoped: boolean;
  canAssignTo: Role[];
}

interface AssignmentDialogData {
  userId: string;
  userEmail: string;
  userName: string;
  role: Role;
  tenantId?: string;
  expiresAt?: Date;
}

export const RBACDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);

  // Dialog data
  const [roleDialogData, setRoleDialogData] = useState<RoleDialogData>({
    name: '',
    description: '',
    permissions: [],
    tenantScoped: false,
    canAssignTo: []
  });
  const [assignmentDialogData, setAssignmentDialogData] = useState<AssignmentDialogData>({
    userId: '',
    userEmail: '',
    userName: '',
    role: Role.READ_ONLY
  });

  // Filter states
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, assignmentsData, usersData, tenantsData] = await Promise.all([
        window.electronAPI.rbac.getRoles(),
        window.electronAPI.rbac.getRoleAssignments(),
        window.electronAPI.rbac.getUsers(),
        window.electronAPI.rbac.getTenants()
      ]);

      setRoles(rolesData);
      setAssignments(assignmentsData);
      setUsers(usersData);
      setTenants(tenantsData);
    } catch (error) {
      console.error('Failed to load RBAC data:', error);
      setError('Failed to load RBAC data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Role Management
  const handleCreateRole = () => {
    setRoleDialogData({
      name: '',
      description: '',
      permissions: [],
      tenantScoped: false,
      canAssignTo: []
    });
    setRoleDialogOpen(true);
  };

  const handleEditRole = (role: RoleDefinition) => {
    setRoleDialogData({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions,
      tenantScoped: role.tenantScoped,
      canAssignTo: role.canAssignTo || []
    });
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      if (roleDialogData.id) {
        await window.electronAPI.rbac.updateRole(roleDialogData.id, roleDialogData);
      } else {
        await window.electronAPI.rbac.createRole(roleDialogData);
      }
      setRoleDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to save role:', error);
      setError('Failed to save role. Please try again.');
    }
  };

  const handleDeleteRole = async (roleId: Role) => {
    if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      try {
        await window.electronAPI.rbac.deleteRole(roleId);
        loadData();
      } catch (error) {
        console.error('Failed to delete role:', error);
        setError('Failed to delete role. Please try again.');
      }
    }
  };

  // Assignment Management
  const handleAssignRole = () => {
    setAssignmentDialogData({
      userId: '',
      userEmail: '',
      userName: '',
      role: Role.READ_ONLY
    });
    setAssignmentDialogOpen(true);
  };

  const handleSaveAssignment = async () => {
    try {
      await window.electronAPI.rbac.assignRole(
        assignmentDialogData.userId,
        assignmentDialogData.role,
        'current_user', // Would be replaced with actual current user
        assignmentDialogData.tenantId,
        assignmentDialogData.expiresAt
      );
      setAssignmentDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to assign role:', error);
      setError('Failed to assign role. Please try again.');
    }
  };

  const handleRevokeAssignment = async (assignment: RoleAssignment) => {
    if (window.confirm('Are you sure you want to revoke this role assignment?')) {
      try {
        await window.electronAPI.rbac.revokeRole(
          assignment.userId,
          assignment.role,
          assignment.tenantId
        );
        loadData();
      } catch (error) {
        console.error('Failed to revoke role:', error);
        setError('Failed to revoke role. Please try again.');
      }
    }
  };

  // Bulk Operations
  const handleBulkAssign = async () => {
    setBulkAssignDialogOpen(true);
  };

  // Export/Import
  const handleExportConfiguration = async () => {
    try {
      await window.electronAPI.rbac.exportConfiguration();
    } catch (error) {
      console.error('Failed to export configuration:', error);
      setError('Failed to export configuration. Please try again.');
    }
  };

  const handleImportConfiguration = async () => {
    try {
      await window.electronAPI.rbac.importConfiguration();
      loadData();
    } catch (error) {
      console.error('Failed to import configuration:', error);
      setError('Failed to import configuration. Please try again.');
    }
  };

  // Utility functions
  const getRoleIcon = (role: Role) => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return <AdminIcon color="error" />;
      case Role.MSP_ADMIN:
        return <SecurityIcon color="warning" />;
      case Role.TENANT_ADMIN:
        return <GroupIcon color="primary" />;
      case Role.TENANT_USER:
        return <PersonIcon color="info" />;
      case Role.READ_ONLY:
        return <ViewIcon color="action" />;
      default:
        return <AssignmentIcon />;
    }
  };

  const getRoleColor = (role: Role): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (role) {
      case Role.SUPER_ADMIN:
        return 'error';
      case Role.MSP_ADMIN:
        return 'warning';
      case Role.TENANT_ADMIN:
        return 'primary';
      case Role.TENANT_USER:
        return 'info';
      case Role.READ_ONLY:
        return 'default';
      default:
        return 'secondary';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    if (roleFilter !== 'all' && assignment.role !== roleFilter) return false;
    if (tenantFilter !== 'all' && assignment.tenantId !== tenantFilter) return false;
    if (statusFilter !== 'all') {
      const isActive = assignment.isActive;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
    }
    return true;
  });

  return (
    <Box sx={{ width: '100%' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Role-Based Access Control
        </Typography>
        <Box>
          <Button
            startIcon={<ExportIcon />}
            onClick={handleExportConfiguration}
            sx={{ mr: 1 }}
          >
            Export
          </Button>
          <Button
            startIcon={<ImportIcon />}
            onClick={handleImportConfiguration}
            sx={{ mr: 1 }}
          >
            Import
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAssignRole}
          >
            Assign Role
          </Button>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Role Assignments" icon={<AssignmentIcon />} />
          <Tab label="Role Definitions" icon={<SecurityIcon />} />
          <Tab label="Permission Matrix" icon={<ViewIcon />} />
          <Tab label="Audit Log" icon={<HistoryIcon />} />
        </Tabs>
      </Box>

      {/* Role Assignments Tab */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Role</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  {(Object.values(Role) as Role[]).map((role: Role) => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Tenant</InputLabel>
                <Select
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                >
                  <MenuItem value="all">All Tenants</MenuItem>
                  {tenants.map(tenant => (
                    <MenuItem key={tenant.id} value={tenant.id}>{tenant.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleBulkAssign}
              >
                Bulk Assign
              </Button>
            </Grid>
          </Grid>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Tenant</TableCell>
                <TableCell>Assigned By</TableCell>
                <TableCell>Assigned At</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2, width: 32, height: 32 }}>
                        {assignment.userName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {assignment.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {assignment.userEmail}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getRoleIcon(assignment.role)}
                      label={assignment.role}
                      color={getRoleColor(assignment.role)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {assignment.tenantName || 'Global'}
                  </TableCell>
                  <TableCell>{assignment.assignedBy}</TableCell>
                  <TableCell>
                    {assignment.assignedAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {assignment.expiresAt ? assignment.expiresAt.toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={assignment.isActive ? 'Active' : 'Inactive'}
                      color={assignment.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleRevokeAssignment(assignment)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Role Definitions Tab */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateRole}
          >
            Create Custom Role
          </Button>
        </Box>

        <Grid container spacing={3}>
          {roles.map((role) => (
            <Grid item xs={12} md={6} lg={4} key={role.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getRoleIcon(role.id)}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {role.name}
                      </Typography>
                    </Box>
                    {!role.isSystemRole && (
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleEditRole(role)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRole(role.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {role.description}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip
                      label={role.isSystemRole ? 'System Role' : 'Custom Role'}
                      color={role.isSystemRole ? 'primary' : 'secondary'}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    <Chip
                      label={role.tenantScoped ? 'Tenant Scoped' : 'Global'}
                      color={role.tenantScoped ? 'info' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {role.permissions.length} permission(s)
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Permission Matrix Tab */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Permission Matrix
        </Typography>
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Permission</TableCell>
                {(Object.values(Role) as Role[]).map((role: Role) => (
                  <TableCell key={role} align="center">
                    {role}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(Object.values(Permission) as Permission[]).map((permission: Permission) => (
                <TableRow key={permission}>
                  <TableCell component="th" scope="row">
                    {permission}
                  </TableCell>
                  {(Object.values(Role) as Role[]).map((role: Role) => {
                    const roleDefinition = roles.find(r => r.id === role);
                    const hasPermission = roleDefinition?.permissions.includes(permission);
                    return (
                      <TableCell key={role} align="center">
                        {hasPermission ? '✓' : '—'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Audit Log Tab */}
      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Role Assignment Audit Log
        </Typography>
        <Alert severity="info">
          Audit log functionality coming soon. This will show all role assignment changes, including who made the changes and when.
        </Alert>
      </TabPanel>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {roleDialogData.id ? 'Edit Role' : 'Create Role'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Role Name"
                value={roleDialogData.name}
                onChange={(e) => setRoleDialogData({...roleDialogData, name: e.target.value})}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={roleDialogData.tenantScoped}
                    onChange={(e) => setRoleDialogData({...roleDialogData, tenantScoped: e.target.checked})}
                  />
                }
                label="Tenant Scoped"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={roleDialogData.description}
                onChange={(e) => setRoleDialogData({...roleDialogData, description: e.target.value})}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={Object.values(Permission)}
                value={roleDialogData.permissions}
                onChange={(event, newValue) => setRoleDialogData({...roleDialogData, permissions: newValue})}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Permissions"
                    placeholder="Select permissions"
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveRole} variant="contained">
            {roleDialogData.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={assignmentDialogOpen} onClose={() => setAssignmentDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Assign Role</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={users}
                getOptionLabel={(option) => `${option.displayName} (${option.userPrincipalName})`}
                value={users.find(u => u.id === assignmentDialogData.userId) || null}
                onChange={(event, newValue) => setAssignmentDialogData({
                  ...assignmentDialogData,
                  userId: newValue?.id || '',
                  userEmail: newValue?.userPrincipalName || '',
                  userName: newValue?.displayName || ''
                })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="User"
                    placeholder="Select user"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={assignmentDialogData.role}
                  onChange={(e) => setAssignmentDialogData({...assignmentDialogData, role: e.target.value as Role})}
                >
                  {(Object.values(Role) as Role[]).map((role: Role) => (
                    <MenuItem key={role} value={role}>{role}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={tenants}
                getOptionLabel={(option) => option.displayName}
                value={tenants.find(t => t.id === assignmentDialogData.tenantId) || null}
                onChange={(event, newValue) => setAssignmentDialogData({
                  ...assignmentDialogData,
                  tenantId: newValue?.id || undefined
                })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tenant (Optional)"
                    placeholder="Select tenant"
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Expires At (Optional)"
                type="datetime-local"
                value={assignmentDialogData.expiresAt ? assignmentDialogData.expiresAt.toISOString().slice(0, 16) : ''}
                onChange={(e) => setAssignmentDialogData({
                  ...assignmentDialogData,
                  expiresAt: e.target.value ? new Date(e.target.value) : undefined
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveAssignment} variant="contained">
            Assign Role
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};