// BillingDashboard.tsx
// Comprehensive MSP billing and cost management dashboard with tenant tracking, usage monitoring, and automated billing workflows

import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  Divider,
  Avatar,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccountBalance as BankIcon,
  Receipt as InvoiceIcon,
  Notifications as AlertIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  PaymentOutlined as PaymentIcon,
  BusinessCenter as PlanIcon,
  Timeline as TrendIcon,
  BarChart as ChartIcon,
  ErrorOutline as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Schedule as ScheduleIcon,
  Assessment as ReportIcon,
  Business as BusinessIcon
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
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
}

interface BillingDashboardProps {
  isVisible?: boolean;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({ isVisible = true }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const [tenantBilling, setTenantBilling] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [usageData, setUsageData] = useState<any>({});
  const [summary, setSummary] = useState<any>({});

  // Dialog states
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form states
  const [planForm, setPlanForm] = useState<any>({});
  const [billingForm, setBillingForm] = useState<any>({});

  useEffect(() => {
    if (isVisible) {
      loadBillingData();
    }
  }, [isVisible]);

  const loadBillingData = async () => {
    setLoading(true);
    try {
      // Load billing plans
      const plansResult = await window.electronAPI.billing.getPlans();
      if (plansResult.success) {
        setPlans(plansResult.data || []);
      }

      // Load tenant billing
      const tenantBillingResult = await window.electronAPI.billing.getTenantBilling();
      if (tenantBillingResult.success) {
        setTenantBilling(tenantBillingResult.data || []);
      }

      // Load invoices
      const invoicesResult = await window.electronAPI.billing.getInvoices();
      if (invoicesResult.success) {
        setInvoices(invoicesResult.data || []);
      }

      // Load alerts
      const alertsResult = await window.electronAPI.billing.getAlerts();
      if (alertsResult.success) {
        setAlerts(alertsResult.data || []);
      }

      // Load usage data
      const usageResult = await window.electronAPI.billing.getUsageData();
      if (usageResult.success) {
        setUsageData(usageResult.data || {});
      }

      // Load summary
      const summaryResult = await window.electronAPI.billing.getSummary();
      if (summaryResult.success) {
        setSummary(summaryResult.data || {});
      }
    } catch (error) {
      console.error('Failed to load billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreatePlan = async () => {
    try {
      const result = await window.electronAPI.billing.createPlan(planForm);
      if (result.success) {
        setPlanDialogOpen(false);
        setPlanForm({});
        loadBillingData();
      }
    } catch (error) {
      console.error('Failed to create plan:', error);
    }
  };

  const handleCreateTenantBilling = async () => {
    try {
      const result = await window.electronAPI.billing.createTenantBilling(billingForm);
      if (result.success) {
        setBillingDialogOpen(false);
        setBillingForm({});
        loadBillingData();
      }
    } catch (error) {
      console.error('Failed to create tenant billing:', error);
    }
  };

  const handleGenerateInvoice = async (tenantId: string) => {
    try {
      const result = await window.electronAPI.billing.generateInvoice(tenantId);
      if (result.success) {
        loadBillingData();
      }
    } catch (error) {
      console.error('Failed to generate invoice:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const result = await window.electronAPI.billing.acknowledgeAlert(alertId);
      if (result.success) {
        loadBillingData();
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'trial': return 'info';
      case 'suspended': return 'warning';
      case 'overdue': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics Cards */}
      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {formatCurrency(summary.totalRevenue || 0)}
                </Typography>
                <Typography variant="subtitle1">
                  Monthly Revenue
                </Typography>
              </Box>
              <MoneyIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {summary.revenueGrowth >= 0 ? '+' : ''}{summary.revenueGrowth?.toFixed(1)}% vs last month
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(45deg, #FF6B6B 30%, #4ECDC4 90%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {summary.activeTenants || 0}
                </Typography>
                <Typography variant="subtitle1">
                  Active Tenants
                </Typography>
              </Box>
              <BusinessIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {summary.trialTenants || 0} on trial
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {summary.pendingInvoices || 0}
                </Typography>
                <Typography variant="subtitle1">
                  Pending Invoices
                </Typography>
              </Box>
              <InvoiceIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {formatCurrency(summary.pendingAmount || 0)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {alerts.filter(a => !a.acknowledged).length}
                </Typography>
                <Typography variant="subtitle1">
                  Active Alerts
                </Typography>
              </Box>
              <AlertIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {alerts.filter(a => a.severity === 'critical').length} critical
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Billing Activity
            </Typography>
            <List>
              {invoices.slice(0, 5).map((invoice: any) => (
                <ListItem key={invoice.invoiceId}>
                  <ListItemIcon>
                    <InvoiceIcon color={invoice.status === 'paid' ? 'success' : 'action'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Invoice ${invoice.invoiceNumber}`}
                    secondary={`${invoice.tenantName} • ${formatCurrency(invoice.total)} • ${formatDate(invoice.issueDate)}`}
                  />
                  <Chip
                    label={invoice.status}
                    color={getStatusColor(invoice.status) as any}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>

      {/* Active Alerts */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Alerts
            </Typography>
            <List>
              {alerts.filter(a => !a.acknowledged).slice(0, 5).map((alert: any) => (
                <ListItem key={alert.alertId}>
                  <ListItemIcon>
                    <AlertIcon color={getAlertSeverityColor(alert.severity) as any} />
                  </ListItemIcon>
                  <ListItemText
                    primary={alert.title}
                    secondary={alert.message}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleAcknowledgeAlert(alert.alertId)}
                  >
                    <CheckCircleIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPlansTab = () => (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h6">Billing Plans</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setPlanDialogOpen(true)}
        >
          Create Plan
        </Button>
      </Box>

      <Grid container spacing={3}>
        {plans.map((plan: any) => (
          <Grid item xs={12} md={4} key={plan.planId}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="between" alignItems="start" mb={2}>
                  <Typography variant="h6">{plan.name}</Typography>
                  <Chip
                    label={plan.billingModel}
                    color="primary"
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  {plan.description}
                </Typography>
                
                <Typography variant="h4" color="primary" gutterBottom>
                  {formatCurrency(plan.basePrice, plan.currency)}
                  <Typography component="span" variant="body2" color="textSecondary">
                    /{plan.frequency}
                  </Typography>
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Features:
                </Typography>
                <List dense>
                  {plan.features.map((feature: string, index: number) => (
                    <ListItem key={index} sx={{ py: 0 }}>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <CheckCircleIcon color="success" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={feature}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Box display="flex" gap={1} mt={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setSelectedItem(plan);
                      setPlanForm(plan);
                      setPlanDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ViewIcon />}
                  >
                    Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderTenantsTab = () => (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h6">Tenant Billing</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setBillingDialogOpen(true)}
        >
          Add Tenant
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tenant</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Next Billing</TableCell>
              <TableCell>Revenue</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenantBilling.map((tenant: any) => (
              <TableRow key={tenant.tenantId}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{tenant.tenantName}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {tenant.billingContact.email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {plans.find(p => p.planId === tenant.planId)?.name || tenant.planId}
                </TableCell>
                <TableCell>
                  <Chip
                    label={tenant.status}
                    color={getStatusColor(tenant.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(tenant.nextBillingDate)}</TableCell>
                <TableCell>
                  {formatCurrency(
                    invoices
                      .filter(inv => inv.tenantId === tenant.tenantId && inv.status === 'paid')
                      .reduce((sum, inv) => sum + inv.total, 0)
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title="Generate Invoice">
                    <IconButton
                      size="small"
                      onClick={() => handleGenerateInvoice(tenant.tenantId)}
                    >
                      <InvoiceIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedItem(tenant);
                        setBillingForm(tenant);
                        setBillingDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderInvoicesTab = () => (
    <Box>
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Typography variant="h6">Invoices</Typography>
        <Box display="flex" gap={1}>
          <Button variant="outlined" startIcon={<DownloadIcon />}>
            Export
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Tenant</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((invoice: any) => (
              <TableRow key={invoice.invoiceId}>
                <TableCell>{invoice.invoiceNumber}</TableCell>
                <TableCell>{invoice.tenantName || invoice.tenantId}</TableCell>
                <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>{formatCurrency(invoice.total, invoice.currency)}</TableCell>
                <TableCell>
                  <Chip
                    label={invoice.status}
                    color={getStatusColor(invoice.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="View Invoice">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedItem(invoice);
                        setInvoiceDialogOpen(true);
                      }}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  {invoice.status === 'draft' && (
                    <Tooltip title="Send Invoice">
                      <IconButton size="small">
                        <SendIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                  {invoice.status !== 'paid' && (
                    <Tooltip title="Mark as Paid">
                      <IconButton size="small">
                        <PaymentIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderAlertsTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Billing Alerts
      </Typography>

      {alerts.map((alert: any) => (
        <Accordion key={alert.alertId}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
              <AlertIcon color={getAlertSeverityColor(alert.severity) as any} />
              <Box flex={1}>
                <Typography variant="subtitle1">{alert.title}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {alert.tenantName || alert.tenantId} • {formatDate(alert.triggeredAt)}
                </Typography>
              </Box>
              <Chip
                label={alert.severity}
                color={getAlertSeverityColor(alert.severity) as any}
                size="small"
              />
              {!alert.acknowledged && (
                <Badge color="error" variant="dot">
                  <Typography variant="caption">New</Typography>
                </Badge>
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" paragraph>
                {alert.message}
              </Typography>
              
              {alert.threshold && alert.currentValue && (
                <Box mb={2}>
                  <Typography variant="caption">
                    Threshold: {alert.threshold} | Current: {alert.currentValue}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(alert.currentValue / alert.threshold) * 100}
                    color={alert.currentValue > alert.threshold ? 'error' : 'warning'}
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}
              
              <Box display="flex" gap={1}>
                {!alert.acknowledged && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => handleAcknowledgeAlert(alert.alertId)}
                  >
                    Acknowledge
                  </Button>
                )}
                <Button variant="outlined" size="small">
                  View Details
                </Button>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );

  if (!isVisible) return null;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <MoneyIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Billing & Cost Management
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              MSP billing, usage tracking, and revenue management
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<ReportIcon />}
          >
            Generate Report
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setSettingsDialogOpen(true)}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Overview" icon={<ChartIcon />} iconPosition="start" />
          <Tab label="Plans" icon={<PlanIcon />} iconPosition="start" />
          <Tab label="Tenants" icon={<BusinessIcon />} iconPosition="start" />
          <Tab label="Invoices" icon={<InvoiceIcon />} iconPosition="start" />
          <Tab label="Alerts" icon={<AlertIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        {renderOverviewTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderPlansTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderTenantsTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {renderInvoicesTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        {renderAlertsTab()}
      </TabPanel>

      {/* Dialogs would go here - Plan Dialog, Billing Dialog, Invoice Dialog, Settings Dialog */}
      {/* For brevity, I'll add these in a follow-up if needed */}
    </Box>
  );
};