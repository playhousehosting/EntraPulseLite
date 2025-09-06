import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Menu,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  FindInPage as FindingIcon,
  Build as RemediationIcon,
  Assignment as EvidenceIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Refresh as RefreshIcon
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
      id={`compliance-tabpanel-${index}`}
      aria-labelledby={`compliance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const ComplianceDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [controls, setControls] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [remediations, setRemediations] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [newAssessmentDialog, setNewAssessmentDialog] = useState(false);
  const [selectedControl, setSelectedControl] = useState<any>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadComplianceData();
  }, [selectedFramework]);

  const loadComplianceData = async () => {
    try {
      setLoading(true);
      
      // Load compliance data from electron API
      const [
        frameworksResult,
        controlsResult,
        assessmentsResult,
        findingsResult,
        remediationsResult,
        alertsResult,
        reportsResult,
        metricsResult
      ] = await Promise.all([
        window.electronAPI.compliance.getEnabledFrameworks(),
        window.electronAPI.compliance.getControls(selectedFramework === 'all' ? undefined : selectedFramework),
        window.electronAPI.compliance.getAssessments(),
        window.electronAPI.compliance.getFindings(),
        window.electronAPI.compliance.getRemediationActions(),
        window.electronAPI.compliance.getAlerts(),
        window.electronAPI.compliance.getReports(),
        window.electronAPI.compliance.getMetrics(selectedFramework === 'all' ? undefined : selectedFramework)
      ]);

      setFrameworks(frameworksResult.data || []);
      setControls(controlsResult.data || []);
      setAssessments(assessmentsResult.data || []);
      setFindings(findingsResult.data || []);
      setRemediations(remediationsResult.data || []);
      setAlerts(alertsResult.data || []);
      setReports(reportsResult.data || []);
      setMetrics(metricsResult.data || {});
    } catch (error) {
      console.error('Failed to load compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'success';
      case 'non-compliant': return 'error';
      case 'partially-compliant': return 'warning';
      case 'pending-review': return 'info';
      default: return 'default';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const handleCreateAssessment = async (assessmentData: any) => {
    try {
      await window.electronAPI.compliance.createAssessment(assessmentData);
      setNewAssessmentDialog(false);
      loadComplianceData();
    } catch (error) {
      console.error('Failed to create assessment:', error);
    }
  };

  const handleUpdateControlStatus = async (controlId: string, status: string) => {
    try {
      await window.electronAPI.compliance.updateControlStatus(controlId, status);
      loadComplianceData();
    } catch (error) {
      console.error('Failed to update control status:', error);
    }
  };

  const handleGenerateReport = async (reportType: string, framework: string) => {
    try {
      await window.electronAPI.compliance.generateReport(reportType, framework);
      loadComplianceData();
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <SecurityIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Compliance Score</Typography>
            </Box>
            <Typography variant="h3" color="primary">
              {metrics.complianceScore || 0}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={metrics.complianceScore || 0} 
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <AssessmentIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Controls</Typography>
            </Box>
            <Typography variant="h3">
              {metrics.totalControls || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Across {frameworks.length} frameworks
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <FindingIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Active Findings</Typography>
            </Box>
            <Typography variant="h3" color="warning.main">
              {metrics.activeFindings || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Require attention
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <RemediationIcon color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">Remediations</Typography>
            </Box>
            <Typography variant="h3" color="info.main">
              {metrics.activeRemediations || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              In progress
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Status Breakdown */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Compliance Status Breakdown
            </Typography>
            {metrics.statusBreakdown && (
              <Box>
                {Object.entries(metrics.statusBreakdown).map(([status, count]) => (
                  <Box key={status} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {status.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </Typography>
                    <Chip 
                      label={String(count)} 
                      color={getStatusColor(status)} 
                      size="small" 
                    />
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Risk Breakdown */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Risk Level Distribution
            </Typography>
            {metrics.riskBreakdown && (
              <Box>
                {Object.entries(metrics.riskBreakdown).map(([risk, count]) => (
                  <Box key={risk} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {risk}
                    </Typography>
                    <Chip 
                      label={String(count)} 
                      color={getRiskColor(risk)} 
                      size="small" 
                    />
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Alerts */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Compliance Alerts
            </Typography>
            {alerts.slice(0, 5).map((alert) => (
              <Alert 
                key={alert.id} 
                severity={alert.severity === 'critical' ? 'error' : 
                         alert.severity === 'high' ? 'warning' : 'info'}
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">{alert.title}</Typography>
                <Typography variant="body2">{alert.description}</Typography>
              </Alert>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderControlsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Compliance Controls</Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Framework</InputLabel>
            <Select
              value={selectedFramework}
              label="Framework"
              onChange={(e) => setSelectedFramework(e.target.value)}
            >
              <MenuItem value="all">All Frameworks</MenuItem>
              {frameworks.map((framework) => (
                <MenuItem key={framework} value={framework}>
                  {framework}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadComplianceData}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Control ID</TableCell>
              <TableCell>Framework</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Risk Level</TableCell>
              <TableCell>Last Assessed</TableCell>
              <TableCell>Evidence</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {controls.map((control) => (
              <TableRow key={control.id}>
                <TableCell>{control.controlId}</TableCell>
                <TableCell>
                  <Chip label={control.framework} size="small" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {control.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {control.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={control.status} 
                    color={getStatusColor(control.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={control.riskLevel} 
                    color={getRiskColor(control.riskLevel)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(control.lastAssessed).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={control.evidence?.length || 0} 
                    size="small"
                    icon={<EvidenceIcon />}
                  />
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small"
                    onClick={(e) => {
                      setSelectedControl(control);
                      setAnchorEl(e.currentTarget);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleUpdateControlStatus(selectedControl?.id, 'compliant')}>
          Mark Compliant
        </MenuItem>
        <MenuItem onClick={() => handleUpdateControlStatus(selectedControl?.id, 'non-compliant')}>
          Mark Non-Compliant
        </MenuItem>
        <MenuItem onClick={() => handleUpdateControlStatus(selectedControl?.id, 'pending-review')}>
          Mark Pending Review
        </MenuItem>
      </Menu>
    </Box>
  );

  const renderAssessmentsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Compliance Assessments</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewAssessmentDialog(true)}
        >
          New Assessment
        </Button>
      </Box>

      <Grid container spacing={3}>
        {assessments.map((assessment) => (
          <Grid item xs={12} md={6} lg={4} key={assessment.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6">{assessment.name}</Typography>
                  <Chip 
                    label={assessment.status} 
                    color={assessment.status === 'completed' ? 'success' : 'info'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {assessment.description}
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <SecurityIcon sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">{assessment.framework}</Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={1}>
                  <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {new Date(assessment.startDate).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={2}>
                  <AssessmentIcon sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {assessment.controls?.length || 0} controls
                  </Typography>
                </Box>
                {assessment.overallScore > 0 && (
                  <Box>
                    <Typography variant="body2" mb={1}>
                      Overall Score: {assessment.overallScore}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={assessment.overallScore}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderRemediationsTab = () => (
    <Box>
      <Typography variant="h5" gutterBottom>
        Remediation Actions
      </Typography>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Assigned To</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Effort (Hours)</TableCell>
              <TableCell>Progress</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {remediations.map((remediation) => (
              <TableRow key={remediation.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {remediation.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {remediation.description}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={remediation.priority} 
                    color={getRiskColor(remediation.priority)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={remediation.status} 
                    color={remediation.status === 'resolved' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{remediation.assignedTo}</TableCell>
                <TableCell>
                  {new Date(remediation.dueDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{remediation.estimatedEffort}</TableCell>
                <TableCell>
                  {remediation.steps && (
                    <Box>
                      <Typography variant="caption">
                        {remediation.steps.filter((s: any) => s.completed).length} / {remediation.steps.length} steps
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={(remediation.steps.filter((s: any) => s.completed).length / remediation.steps.length) * 100}
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderReportsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Compliance Reports</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            onClick={() => handleGenerateReport('summary', selectedFramework)}
          >
            Generate Summary
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleGenerateReport('detailed', selectedFramework)}
          >
            Generate Detailed
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleGenerateReport('gap-analysis', selectedFramework)}
          >
            Gap Analysis
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {reports.map((report) => (
          <Grid item xs={12} md={6} lg={4} key={report.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {report.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {report.reportType}
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <SecurityIcon sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">{report.framework}</Typography>
                </Box>
                <Box display="flex" alignItems="center" mb={2}>
                  <ScheduleIcon sx={{ mr: 1, fontSize: 16 }} />
                  <Typography variant="body2">
                    {new Date(report.generatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Chip 
                    label={report.status} 
                    color={report.status === 'final' ? 'success' : 'warning'}
                    size="small"
                  />
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => {/* Handle download */}}
                  >
                    Download
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="400px">
        <Box textAlign="center">
          <LinearProgress sx={{ mb: 2 }} />
          <Typography>Loading compliance data...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>
        Compliance Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="compliance dashboard tabs">
          <Tab label="Overview" />
          <Tab label="Controls" />
          <Tab label="Assessments" />
          <Tab label="Remediations" />
          <Tab label="Reports" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {renderOverviewTab()}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {renderControlsTab()}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {renderAssessmentsTab()}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {renderRemediationsTab()}
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        {renderReportsTab()}
      </TabPanel>

      {/* New Assessment Dialog */}
      <Dialog 
        open={newAssessmentDialog} 
        onClose={() => setNewAssessmentDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Assessment</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Assessment Name"
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Framework</InputLabel>
              <Select defaultValue="">
                {frameworks.map((framework) => (
                  <MenuItem key={framework} value={framework}>
                    {framework}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={3}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Assessment Type</InputLabel>
              <Select defaultValue="">
                <MenuItem value="self-assessment">Self Assessment</MenuItem>
                <MenuItem value="internal-audit">Internal Audit</MenuItem>
                <MenuItem value="external-audit">External Audit</MenuItem>
                <MenuItem value="certification">Certification</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewAssessmentDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {/* Handle create */}}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ComplianceDashboard;