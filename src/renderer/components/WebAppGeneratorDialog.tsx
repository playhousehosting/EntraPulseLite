// WebAppGeneratorDialog.tsx
// Dialog for generating web applications from data

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Code as CodeIcon,
  Dashboard as DashboardIcon,
  Web as WebIcon,
  DataObject as DataIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Download as DownloadIcon,
  PlayArrow as RunIcon,
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { WebAppConfig, WebAppTemplate, WebAppComponent, WebAppGenerationRequest } from '../../types/artifacts';
import { WebAppGenerator } from '../../shared/WebAppGenerator';

interface WebAppGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (artifact: any) => void;
  initialData?: any;
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
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

export const WebAppGeneratorDialog: React.FC<WebAppGeneratorDialogProps> = ({
  open,
  onClose,
  onGenerate,
  initialData
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration state
  const [config, setConfig] = useState<WebAppConfig>({
    framework: 'streamlit',
    title: 'My Web App',
    description: '',
    features: [],
    components: [],
    styling: {
      theme: 'light',
      primaryColor: '#1f77b4'
    }
  });

  // Data and templates
  const [data, setData] = useState<any>(initialData || {});
  const [templates, setTemplates] = useState<WebAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadTemplates();
      if (initialData) {
        setData(initialData);
        inferConfigFromData(initialData);
      }
    }
  }, [open, initialData]);

  const loadTemplates = () => {
    const availableTemplates = WebAppGenerator.getTemplates();
    setTemplates(availableTemplates);
  };

  const inferConfigFromData = (inputData: any) => {
    if (!inputData) return;

    const components: WebAppComponent[] = [];
    
    if (Array.isArray(inputData) && inputData.length > 0) {
      const firstItem = inputData[0];
      const numericFields = Object.keys(firstItem).filter(key => 
        typeof firstItem[key] === 'number'
      );
      
      if (numericFields.length > 0) {
        components.push({
          id: 'chart-1',
          type: 'chart',
          title: 'Data Visualization',
          config: { chartType: 'bar' }
        });
      }

      components.push({
        id: 'table-1',
        type: 'table',
        title: 'Data Table',
        config: {}
      });

      if (numericFields.length > 0) {
        components.push({
          id: 'metrics-1',
          type: 'metric',
          title: 'Key Metrics',
          config: {}
        });
      }
    }

    setConfig(prev => ({
      ...prev,
      components,
      title: `${typeof inputData === 'object' ? 'Data' : 'Generated'} Dashboard`
    }));
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFrameworkChange = (framework: WebAppConfig['framework']) => {
    setConfig(prev => ({ ...prev, framework }));
    
    // Load framework-specific templates
    const frameworkTemplates = WebAppGenerator.getTemplates(framework);
    setTemplates(frameworkTemplates);
    setSelectedTemplate('');
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      
      // Apply template configuration
      const templateComponents = generateTemplateComponents(template);
      setConfig(prev => ({
        ...prev,
        title: template.name,
        description: template.description,
        components: templateComponents,
        features: template.features
      }));
    }
  };

  const generateTemplateComponents = (template: WebAppTemplate): WebAppComponent[] => {
    switch (template.category) {
      case 'dashboard':
        return [
          { id: 'metrics', type: 'metric', title: 'Key Metrics', config: {} },
          { id: 'chart1', type: 'chart', title: 'Main Chart', config: { chartType: 'bar' } },
          { id: 'chart2', type: 'chart', title: 'Secondary Chart', config: { chartType: 'line' } },
          { id: 'table', type: 'table', title: 'Data Table', config: {} }
        ];
      
      case 'report':
        return [
          { id: 'text', type: 'text', title: 'Report Header', config: {} },
          { id: 'chart', type: 'chart', title: 'Analysis Chart', config: { chartType: 'bar' } },
          { id: 'table', type: 'table', title: 'Detailed Data', config: {} }
        ];
      
      case 'form':
        return [
          { id: 'form', type: 'form', title: 'Data Input Form', config: {} },
          { id: 'chart', type: 'chart', title: 'Results Visualization', config: {} }
        ];
      
      default:
        return [
          { id: 'chart', type: 'chart', title: 'Chart', config: {} },
          { id: 'table', type: 'table', title: 'Table', config: {} }
        ];
    }
  };

  const addComponent = (type: WebAppComponent['type']) => {
    const newComponent: WebAppComponent = {
      id: `${type}-${Date.now()}`,
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Component`,
      config: {}
    };

    setConfig(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }));
  };

  const removeComponent = (componentId: string) => {
    setConfig(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== componentId)
    }));
  };

  const updateComponent = (componentId: string, updates: Partial<WebAppComponent>) => {
    setConfig(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === componentId ? { ...c, ...updates } : c
      )
    }));
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError(null);

      const request: WebAppGenerationRequest = {
        data,
        config,
        template: selectedTemplate,
        customizations: {}
      };

      const artifact = await WebAppGenerator.generateWebApp(request);
      onGenerate(artifact);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate web app');
    } finally {
      setLoading(false);
    }
  };

  const renderDataTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Data Source
      </Typography>
      
      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Data Source Type</InputLabel>
        <Select
          value={config.dataSource?.type || 'json'}
          onChange={(e) => setConfig(prev => ({
            ...prev,
            dataSource: { ...prev.dataSource, type: e.target.value as any }
          }))}
        >
          <MenuItem value="json">JSON Data</MenuItem>
          <MenuItem value="csv">CSV Data</MenuItem>
          <MenuItem value="api">API Endpoint</MenuItem>
          <MenuItem value="database">Database Query</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        multiline
        rows={8}
        label="Data (JSON format)"
        value={typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            setData(parsed);
          } catch {
            setData(e.target.value);
          }
        }}
        sx={{ mb: 2 }}
      />

      <Alert severity="info">
        Provide your data in JSON format. The generator will automatically detect data types and suggest appropriate visualizations.
      </Alert>
    </Box>
  );

  const renderConfigTab = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="App Title"
            value={config.title}
            onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={config.description}
            onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Framework</InputLabel>
            <Select
              value={config.framework}
              onChange={(e) => handleFrameworkChange(e.target.value as any)}
            >
              <MenuItem value="streamlit">
                <Box display="flex" alignItems="center" gap={1}>
                  <CodeIcon fontSize="small" />
                  Streamlit (Python)
                </Box>
              </MenuItem>
              <MenuItem value="html">
                <Box display="flex" alignItems="center" gap={1}>
                  <WebIcon fontSize="small" />
                  HTML Dashboard
                </Box>
              </MenuItem>
              <MenuItem value="react">
                <Box display="flex" alignItems="center" gap={1}>
                  <DashboardIcon fontSize="small" />
                  React App
                </Box>
              </MenuItem>
              <MenuItem value="nextjs">
                <Box display="flex" alignItems="center" gap={1}>
                  <WebIcon fontSize="small" />
                  Next.js App
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="subtitle1" gutterBottom>
            Styling Options
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={config.styling?.theme === 'dark'}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  styling: { ...prev.styling, theme: e.target.checked ? 'dark' : 'light' }
                }))}
              />
            }
            label="Dark Theme"
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Primary Color"
            type="color"
            value={config.styling?.primaryColor || '#1f77b4'}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              styling: { ...prev.styling, primaryColor: e.target.value }
            }))}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Custom CSS (optional)"
            value={config.styling?.customCSS || ''}
            onChange={(e) => setConfig(prev => ({
              ...prev,
              styling: { ...prev.styling, customCSS: e.target.value }
            }))}
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderTemplatesTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Choose a Template
      </Typography>
      
      <Grid container spacing={2}>
        {templates.map((template) => (
          <Grid item xs={12} md={6} key={template.id}>
            <Card 
              variant={selectedTemplate === template.id ? 'elevation' : 'outlined'}
              sx={{ 
                cursor: 'pointer',
                border: selectedTemplate === template.id ? '2px solid' : undefined,
                borderColor: selectedTemplate === template.id ? 'primary.main' : undefined
              }}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {template.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {template.description}
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {template.features.map((feature) => (
                    <Chip key={feature} label={feature} size="small" />
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedTemplate && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Template selected: {templates.find(t => t.id === selectedTemplate)?.name}
        </Alert>
      )}
    </Box>
  );

  const renderComponentsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Components
        </Typography>
        <Box>
          {['chart', 'table', 'metric', 'text', 'form'].map((type) => (
            <Tooltip key={type} title={`Add ${type}`}>
              <IconButton 
                size="small" 
                onClick={() => addComponent(type as WebAppComponent['type'])}
                sx={{ ml: 1 }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Box>

      <List>
        {config.components.map((component, index) => (
          <ListItem key={component.id} divider>
            <ListItemIcon>
              <DataIcon />
            </ListItemIcon>
            <ListItemText
              primary={
                <TextField
                  value={component.title}
                  onChange={(e) => updateComponent(component.id, { title: e.target.value })}
                  size="small"
                  variant="outlined"
                />
              }
              secondary={`Type: ${component.type}`}
            />
            <IconButton 
              edge="end" 
              onClick={() => removeComponent(component.id)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>

      {config.components.length === 0 && (
        <Alert severity="info">
          No components added yet. Use the + buttons above to add components to your web app.
        </Alert>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Generate Web Application
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab icon={<DataIcon />} label="Data" />
            <Tab icon={<SettingsIcon />} label="Configuration" />
            <Tab icon={<WebIcon />} label="Templates" />
            <Tab icon={<DashboardIcon />} label="Components" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {renderDataTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderConfigTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderTemplatesTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderComponentsTab()}
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading || !config.title || config.components.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <RunIcon />}
        >
          {loading ? 'Generating...' : 'Generate Web App'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};