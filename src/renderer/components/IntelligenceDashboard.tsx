// IntelligenceDashboard.tsx
// Revolutionary AI-powered intelligence dashboard showing organizational insights, predictions, and automation opportunities

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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Divider,
  Avatar,
  Tab,
  Tabs
} from '@mui/material';
import {
  Psychology as BrainIcon,
  TrendingUp as TrendingUpIcon,
  AutoAwesome as PredictionIcon,
  Settings as AutomationIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon,
  Insights as InsightsIcon,
  Warning as WarningIcon,
  CheckCircle as SuccessIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Policy as PolicyIcon,
  Apps as AppsIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Settings as SettingsIcon,
  ArrowBack as ArrowBackIcon,
  Chat as ChatIcon
} from '@mui/icons-material';
import { organizationalIntelligence } from '../../shared/OrganizationalIntelligence';

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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface IntelligenceDashboardProps {
  onNavigateToChat?: () => void;
}

export const IntelligenceDashboard: React.FC<IntelligenceDashboardProps> = ({ 
  onNavigateToChat 
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [predictionDialogOpen, setPredictionDialogOpen] = useState(false);

  useEffect(() => {
    loadInsights();
    
    // Set up auto-refresh if enabled
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(loadInsights, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await organizationalIntelligence.generateInsights();
      setInsights(data);
    } catch (error) {
      console.error('Failed to load intelligence insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const handlePredictionClick = (prediction: any) => {
    setSelectedPrediction(prediction);
    setPredictionDialogOpen(true);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  const renderOverviewTab = () => {
    if (!insights) return <Typography>Loading insights...</Typography>;

    const criticalPredictions = insights.predictions.filter((p: any) => p.impactLevel === 'critical').length;
    const automationOpportunities = insights.automationOpportunities.length;
    const businessProcesses = insights.businessProcesses.length;

    return (
      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" color="white">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {insights.predictions.length}
                  </Typography>
                  <Typography variant="subtitle1">
                    Active Predictions
                  </Typography>
                </Box>
                <PredictionIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
              {criticalPredictions > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {criticalPredictions} critical prediction{criticalPredictions > 1 ? 's' : ''}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', background: 'linear-gradient(45deg, #FF6B6B 30%, #4ECDC4 90%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" color="white">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {automationOpportunities}
                  </Typography>
                  <Typography variant="subtitle1">
                    Automation Workflows
                  </Typography>
                </Box>
                <AutomationIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                Ready to implement
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', background: 'linear-gradient(45deg, #9C27B0 30%, #E91E63 90%)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" color="white">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {businessProcesses}
                  </Typography>
                  <Typography variant="subtitle1">
                    Business Processes
                  </Typography>
                </Box>
                <TimelineIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                Identified from usage patterns
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Insights */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🧠 Recent AI Insights
              </Typography>
              <List>
                {insights.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <InsightsIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={suggestion} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderPredictionsTab = () => {
    if (!insights?.predictions?.length) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🔮 Predictive Intelligence
            </Typography>
            <Typography color="textSecondary">
              Claude is learning your organization's patterns. Predictions will appear as more data is collected.
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Grid container spacing={3}>
        {insights.predictions.map((prediction: any, index: number) => (
          <Grid item xs={12} md={6} key={prediction.insightId}>
            <Card 
              sx={{ 
                height: '100%',
                cursor: 'pointer',
                '&:hover': { elevation: 4 }
              }}
              onClick={() => handlePredictionClick(prediction)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Chip 
                    label={prediction.type} 
                    color="primary" 
                    size="small"
                    icon={
                      prediction.type === 'security' ? <SecurityIcon /> :
                      prediction.type === 'productivity' ? <TrendingUpIcon /> :
                      <InsightsIcon />
                    }
                  />
                  <Chip 
                    label={`${Math.round(prediction.confidence * 100)}%`}
                    color={getConfidenceColor(prediction.confidence) as any}
                    size="small"
                  />
                </Box>
                
                <Typography variant="h6" gutterBottom>
                  {prediction.prediction.length > 80 ? 
                    `${prediction.prediction.substring(0, 80)}...` : 
                    prediction.prediction
                  }
                </Typography>
                
                <Box display="flex" alignItems="center" gap={1} mt={2}>
                  <Chip 
                    label={prediction.impactLevel}
                    color={getImpactColor(prediction.impactLevel) as any}
                    size="small"
                  />
                  <Typography variant="caption" color="textSecondary">
                    {prediction.timeframe}
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  {prediction.recommendedActions.length} recommended action{prediction.recommendedActions.length > 1 ? 's' : ''}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderAutomationTab = () => {
    if (!insights?.automationOpportunities?.length) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🤖 Automation Opportunities
            </Typography>
            <Typography color="textSecondary">
              No automation workflows detected yet. Start using the system and Claude will identify automation opportunities.
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Grid container spacing={3}>
        {insights.automationOpportunities.map((workflow: any, index: number) => (
          <Grid item xs={12} md={6} key={workflow.workflowId}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">
                    {workflow.name}
                  </Typography>
                  <Chip 
                    label={workflow.status}
                    color={workflow.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  {workflow.description}
                </Typography>
                
                <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                  <Chip label={`${workflow.generatedSteps.length} steps`} size="small" />
                  <Chip label={`${workflow.services.length} services`} size="small" />
                  {workflow.successRate > 0 && (
                    <Chip 
                      label={`${Math.round(workflow.successRate * 100)}% success`}
                      color="success"
                      size="small"
                    />
                  )}
                </Box>
                
                <Button
                  variant="outlined"
                  startIcon={<PlayIcon />}
                  size="small"
                  onClick={() => {/* TODO: Implement workflow execution */}}
                >
                  Execute Workflow
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderBusinessProcessesTab = () => {
    if (!insights?.businessProcesses?.length) {
      return (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📊 Business Process Intelligence
            </Typography>
            <Typography color="textSecondary">
              Claude is analyzing your usage patterns to identify business processes. Check back soon for insights.
            </Typography>
          </CardContent>
        </Card>
      );
    }

    return (
      <Grid container spacing={3}>
        {insights.businessProcesses.map((process: any, index: number) => (
          <Grid item xs={12} key={process.processId}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between" mb={2}>
                  <Typography variant="h6">
                    {process.name}
                  </Typography>
                  <IconButton
                    onClick={() => toggleCardExpansion(process.processId)}
                    size="small"
                  >
                    {expandedCards.has(process.processId) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>
                
                <Typography variant="body2" color="textSecondary" paragraph>
                  {process.description}
                </Typography>
                
                <Box display="flex" gap={1} mb={2}>
                  <Chip label={process.frequency} color="primary" size="small" />
                  <Chip label={`${process.steps.length} steps`} size="small" />
                  <Chip label={`${process.stakeholders.length} stakeholder${process.stakeholders.length > 1 ? 's' : ''}`} size="small" />
                </Box>
                
                <Collapse in={expandedCards.has(process.processId)}>
                  <Box mt={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Process Steps:
                    </Typography>
                    <List dense>
                      {process.steps.map((step: any, stepIndex: number) => (
                        <ListItem key={step.stepId}>
                          <ListItemIcon>
                            {step.automatable ? <AutomationIcon color="success" /> : <SettingsIcon />}
                          </ListItemIcon>
                          <ListItemText
                            primary={step.description}
                            secondary={`${step.estimatedTime} minutes • ${step.requiredRoles.join(', ')}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                    
                    {process.automationOpportunities.length > 0 && (
                      <Box mt={2}>
                        <Typography variant="subtitle2" gutterBottom color="success.main">
                          💡 Automation Opportunities:
                        </Typography>
                        {process.automationOpportunities.map((opp: any, oppIndex: number) => (
                          <Alert key={oppIndex} severity="info" sx={{ mb: 1 }}>
                            {opp.description} (Est. {opp.estimatedTimeSavings} min savings)
                          </Alert>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <BrainIcon />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              Claude Intelligence
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              AI-powered organizational insights and automation
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          {onNavigateToChat && (
            <Tooltip title="Back to Chat">
              <Button
                variant="outlined"
                startIcon={<ChatIcon />}
                onClick={onNavigateToChat}
                sx={{ mr: 1 }}
              >
                Chat
              </Button>
            </Tooltip>
          )}
          <Tooltip title={autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"}>
            <IconButton
              onClick={() => setAutoRefresh(!autoRefresh)}
              color={autoRefresh ? "primary" : "default"}
            >
              {autoRefresh ? <PauseIcon /> : <PlayIcon />}
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadInsights}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Main Content */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              icon={<InsightsIcon />} 
              label="Overview" 
              iconPosition="start"
            />
            <Tab 
              icon={<PredictionIcon />} 
              label="Predictions" 
              iconPosition="start"
            />
            <Tab 
              icon={<AutomationIcon />} 
              label="Automation" 
              iconPosition="start"
            />
            <Tab 
              icon={<TimelineIcon />} 
              label="Business Processes" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          {renderOverviewTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderPredictionsTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderAutomationTab()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderBusinessProcessesTab()}
        </TabPanel>
      </Card>

      {/* Prediction Detail Dialog */}
      <Dialog
        open={predictionDialogOpen}
        onClose={() => setPredictionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedPrediction && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center" gap={1}>
                <PredictionIcon color="primary" />
                Prediction Details
                <Chip 
                  label={`${Math.round(selectedPrediction.confidence * 100)}% confidence`}
                  color={getConfidenceColor(selectedPrediction.confidence) as any}
                  size="small"
                />
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="h6" gutterBottom>
                {selectedPrediction.prediction}
              </Typography>
              
              <Box display="flex" gap={1} mb={3}>
                <Chip label={selectedPrediction.type} color="primary" />
                <Chip label={selectedPrediction.impactLevel} color={getImpactColor(selectedPrediction.impactLevel) as any} />
                <Chip label={selectedPrediction.timeframe} variant="outlined" />
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>
                Recommended Actions:
              </Typography>
              <List>
                {selectedPrediction.recommendedActions.map((action: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary={action} />
                  </ListItem>
                ))}
              </List>
              
              {selectedPrediction.dataPoints && selectedPrediction.dataPoints.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Supporting Data Points:
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Based on {selectedPrediction.dataPoints.length} data points collected from your organization
                  </Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPredictionDialogOpen(false)}>
                Close
              </Button>
              <Button variant="contained" onClick={() => {
                // TODO: Implement action implementation
                setPredictionDialogOpen(false);
              }}>
                Implement Actions
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};