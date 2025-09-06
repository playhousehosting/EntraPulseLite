import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Checkbox,
  FormControlLabel,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Divider,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  GetApp as DownloadIcon,
  Schedule as ScheduleIcon,
  History as HistoryIcon,
  Assessment as ReportIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  TextSnippet as CsvIcon,
  Code as JsonIcon,
  Web as HtmlIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon
} from '@mui/icons-material';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  format: string[];
  parameters: ReportParameter[];
  queries: ReportQuery[];
  postProcessing?: string[];
  scheduling?: ReportSchedule;
}

interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';
  required: boolean;
  defaultValue?: any;
  options?: string[];
  description: string;
}

interface ReportQuery {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: string;
  parameters?: Record<string, any>;
  transformation?: string;
}

interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
  enabled: boolean;
  recipients: string[];
}

interface ReportResult {
  id: string;
  templateId: string;
  name: string;
  format: string;
  generatedAt: Date;
  parameters: Record<string, any>;
  filePath: string;
  data: any;
  metadata: {
    recordCount: number;
    executionTime: number;
    tenant?: string;
    size: number;
  };
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
      id={`reporting-tabpanel-${index}`}
      aria-labelledby={`reporting-tab-${index}`}
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

export const ReportingDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportResult[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ReportTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog states
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [reportParameters, setReportParameters] = useState<Record<string, any>>({});
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  const categories = [
    'all',
    'compliance',
    'security',
    'licensing',
    'user_management',
    'tenant_health',
    'performance',
    'cost_optimization',
    'msp_billing',
    'audit',
    'custom'
  ];

  const formatIcons: Record<string, React.ReactElement> = {
    pdf: <PdfIcon />,
    xlsx: <ExcelIcon />,
    csv: <CsvIcon />,
    json: <JsonIcon />,
    html: <HtmlIcon />
  };

  useEffect(() => {
    loadReportTemplates();
    loadReportHistory();
  }, []);

  useEffect(() => {
    filterTemplates();
  }, [reportTemplates, selectedCategory, searchTerm]);

  const loadReportTemplates = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.reporting.getReportTemplates();
      if (result.success) {
        setReportTemplates(result.data);
      } else {
        setError(result.error || 'Failed to load report templates');
      }
    } catch (error) {
      setError('Error loading report templates');
      console.error('Error loading report templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReportHistory = async () => {
    try {
      const result = await window.electronAPI.reporting.getReportHistory();
      if (result.success) {
        setReportHistory(result.data);
      } else {
        console.error('Failed to load report history:', result.error);
      }
    } catch (error) {
      console.error('Error loading report history:', error);
    }
  };

  const filterTemplates = () => {
    let filtered = reportTemplates;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(term) ||
        template.description.toLowerCase().includes(term)
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleGenerateReport = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setReportParameters({});
    setSelectedFormat(template.format[0] || '');
    setGenerateDialogOpen(true);
  };

  const handleParameterChange = (paramName: string, value: any) => {
    setReportParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };

  const executeReportGeneration = async () => {
    if (!selectedTemplate || !selectedFormat) return;

    try {
      setLoading(true);
      setError(null);

      const result = await window.electronAPI.reporting.generateReport(
        selectedTemplate.id,
        {
          format: selectedFormat,
          parameters: reportParameters
        }
      );

      if (result.success) {
        setSuccess(`Report "${selectedTemplate.name}" generated successfully!`);
        setGenerateDialogOpen(false);
        loadReportHistory(); // Refresh history
      } else {
        setError(result.error || 'Failed to generate report');
      }
    } catch (error) {
      setError('Error generating report');
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (report: ReportResult) => {
    try {
      const result = await window.electronAPI.reporting.downloadReport(report.id);
      if (!result.success) {
        setError(result.error || 'Failed to download report');
      }
    } catch (error) {
      setError('Error downloading report');
      console.error('Error downloading report:', error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const result = await window.electronAPI.reporting.deleteReport(reportId);
      if (result.success) {
        setSuccess('Report deleted successfully');
        loadReportHistory();
      } else {
        setError(result.error || 'Failed to delete report');
      }
    } catch (error) {
      setError('Error deleting report');
      console.error('Error deleting report:', error);
    }
  };

  const renderParameterInput = (parameter: ReportParameter) => {
    const value = reportParameters[parameter.name] || parameter.defaultValue || '';

    switch (parameter.type) {
      case 'string':
        return (
          <TextField
            fullWidth
            label={parameter.name}
            value={value}
            onChange={(e) => handleParameterChange(parameter.name, e.target.value)}
            required={parameter.required}
            helperText={parameter.description}
            margin="normal"
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={parameter.name}
            value={value}
            onChange={(e) => handleParameterChange(parameter.name, Number(e.target.value))}
            required={parameter.required}
            helperText={parameter.description}
            margin="normal"
          />
        );

      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={value}
                onChange={(e) => handleParameterChange(parameter.name, e.target.checked)}
              />
            }
            label={parameter.name}
          />
        );

      case 'select':
        return (
          <FormControl fullWidth margin="normal" required={parameter.required}>
            <InputLabel>{parameter.name}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleParameterChange(parameter.name, e.target.value)}
              label={parameter.name}
            >
              {parameter.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <FormControl fullWidth margin="normal" required={parameter.required}>
            <InputLabel>{parameter.name}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => handleParameterChange(parameter.name, e.target.value)}
              label={parameter.name}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((item) => (
                    <Chip key={item} label={item} size="small" />
                  ))}
                </Box>
              )}
            >
              {parameter.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            label={parameter.name}
            value={value}
            onChange={(e) => handleParameterChange(parameter.name, e.target.value)}
            required={parameter.required}
            helperText={parameter.description}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Alerts */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
          <Tab icon={<ReportIcon />} label="Report Templates" />
          <Tab icon={<HistoryIcon />} label="Report History" />
          <Tab icon={<ScheduleIcon />} label="Scheduled Reports" />
        </Tabs>
      </Box>

      {/* Report Templates Tab */}
      <TabPanel value={currentTab} index={0}>
        {/* Filters */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1 }} />
            }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Category"
            >
              {categories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category.replace('_', ' ').toUpperCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => {/* TODO: Add custom report dialog */}}
          >
            Custom Report
          </Button>
        </Box>

        {/* Report Templates Grid */}
        <Grid container spacing={3}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} md={6} lg={4} key={template.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {template.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {template.description}
                  </Typography>
                  <Chip
                    label={template.category.replace('_', ' ')}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    {template.format.map((format) => (
                      <Tooltip key={format} title={format.toUpperCase()}>
                        <Chip
                          icon={formatIcons[format]}
                          label={format}
                          size="small"
                          variant="outlined"
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </CardContent>
                <Divider />
                <Box sx={{ p: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<RunIcon />}
                    onClick={() => handleGenerateReport(template)}
                  >
                    Generate Report
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredTemplates.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No report templates found matching your criteria.
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Report History Tab */}
      <TabPanel value={currentTab} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Report Name</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Generated</TableCell>
                <TableCell>Records</TableCell>
                <TableCell>Execution Time</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportHistory.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.name}</TableCell>
                  <TableCell>
                    <Chip
                      icon={formatIcons[report.format]}
                      label={report.format.toUpperCase()}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(report.generatedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>{report.metadata.recordCount}</TableCell>
                  <TableCell>{report.metadata.executionTime}ms</TableCell>
                  <TableCell>
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadReport(report)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {reportHistory.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No reports have been generated yet.
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Scheduled Reports Tab */}
      <TabPanel value={currentTab} index={2}>
        <Typography variant="body1" color="text.secondary">
          Scheduled reports functionality coming soon...
        </Typography>
      </TabPanel>

      {/* Generate Report Dialog */}
      <Dialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Generate Report: {selectedTemplate?.name}
        </DialogTitle>
        <DialogContent>
          {selectedTemplate && (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                {selectedTemplate.description}
              </Typography>

              {/* Format Selection */}
              <FormControl fullWidth margin="normal" required>
                <InputLabel>Output Format</InputLabel>
                <Select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  label="Output Format"
                >
                  {selectedTemplate.format.map((format) => (
                    <MenuItem key={format} value={format}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {formatIcons[format]}
                        {format.toUpperCase()}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Parameters */}
              {selectedTemplate.parameters.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Parameters
                  </Typography>
                  {selectedTemplate.parameters.map((parameter) => (
                    <Box key={parameter.name}>
                      {renderParameterInput(parameter)}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={executeReportGeneration}
            disabled={loading || !selectedFormat}
          >
            Generate Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};