// AdvancedAnalyticsDashboard.tsx
// Comprehensive advanced analytics dashboard with predictive insights, trend analysis, and intelligent recommendations

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
  Divider,
  Avatar,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ChartIcon,
  Psychology as AIIcon,
  Speed as PerformanceIcon,
  Security as SecurityIcon,
  AttachMoney as CostIcon,
  Storage as CapacityIcon,
  Warning as RiskIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
  Insights as InsightsIcon,
  Lightbulb as RecommendationIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Assessment as ReportIcon,
  Visibility as ViewIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Computer as ComputeIcon,
  CloudQueue as CloudIcon,
  Shield as ShieldIcon,
  DataUsage as DataIcon,
  AutoGraph as ForecastIcon,
  Psychology as ModelIcon,
  Science as ScienceIcon
} from '@mui/icons-material';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, RadialBarChart, RadialBar } from 'recharts';

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

interface AdvancedAnalyticsDashboardProps {
  isVisible?: boolean;
}

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({ isVisible = true }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>({});
  const [predictions, setPredictions] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [capacityForecasts, setCapacityForecasts] = useState<any[]>([]);
  const [securityScore, setSecurityScore] = useState<any>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');

  // Dialog states
  const [predictionDialogOpen, setPredictionDialogOpen] = useState(false);
  const [recommendationDialogOpen, setRecommendationDialogOpen] = useState(false);
  const [riskDialogOpen, setRiskDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    if (isVisible) {
      loadAnalyticsData();
    }
  }, [isVisible, selectedTimeframe, selectedMetric]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Load analytics summary
      const summaryResult = await window.electronAPI.analytics.getSummary();
      if (summaryResult.success) {
        setAnalyticsData(summaryResult.data || {});
      }

      // Load predictions
      const predictionsResult = await window.electronAPI.analytics.getPredictions(selectedMetric === 'all' ? undefined : selectedMetric);
      if (predictionsResult.success) {
        setPredictions(predictionsResult.data || []);
      }

      // Load trends
      const trendsResult = await window.electronAPI.analytics.getTrends();
      if (trendsResult.success) {
        setTrends(trendsResult.data || []);
      }

      // Load recommendations
      const recommendationsResult = await window.electronAPI.analytics.getRecommendations();
      if (recommendationsResult.success) {
        setRecommendations(recommendationsResult.data || []);
      }

      // Load risks
      const risksResult = await window.electronAPI.analytics.getRisks();
      if (risksResult.success) {
        setRisks(risksResult.data || []);
      }

      // Load capacity forecasts
      const forecastsResult = await window.electronAPI.analytics.getCapacityForecasts();
      if (forecastsResult.success) {
        setCapacityForecasts(forecastsResult.data || []);
      }

      // Load security score
      const securityResult = await window.electronAPI.analytics.getSecurityScore();
      if (securityResult.success) {
        setSecurityScore(securityResult.data || null);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleGeneratePredictions = async (metricName?: string) => {
    try {
      setLoading(true);
      const result = await window.electronAPI.analytics.generatePredictions(metricName);
      if (result.success) {
        loadAnalyticsData();
      }
    } catch (error) {
      console.error('Failed to generate predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async (analysisType: string) => {
    try {
      setLoading(true);
      let result;
      switch (analysisType) {
        case 'trends':
          result = await window.electronAPI.analytics.analyzeTrends();
          break;
        case 'optimization':
          result = await window.electronAPI.analytics.generateOptimizations();
          break;
        case 'risks':
          result = await window.electronAPI.analytics.analyzeRisks();
          break;
        case 'capacity':
          result = await window.electronAPI.analytics.generateCapacityForecasts();
          break;
        case 'security':
          result = await window.electronAPI.analytics.calculateSecurityScore();
          break;
        default:
          return;
      }
      
      if (result?.success) {
        loadAnalyticsData();
      }
    } catch (error) {
      console.error(`Failed to run ${analysisType} analysis:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleImplementRecommendation = async (recommendationId: string) => {
    try {
      const result = await window.electronAPI.analytics.implementRecommendation(recommendationId);
      if (result.success) {
        loadAnalyticsData();
      }
    } catch (error) {
      console.error('Failed to implement recommendation:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUpIcon color="success" />;
      case 'decreasing': return <TrendingDownIcon color="error" />;
      case 'stable': return <ChartIcon color="info" />;
      case 'volatile': return <TimelineIcon color="warning" />;
      default: return <ChartIcon />;
    }
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatNumber = (value: number, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString();
  };

  const renderOverviewTab = () => (
    <Grid container spacing={3}>
      {/* Key Metrics Cards */}
      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(45deg, #6366F1 30%, #8B5CF6 90%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {analyticsData.overview?.metricsCount || 0}
                </Typography>
                <Typography variant="subtitle1">
                  Active Metrics
                </Typography>
              </Box>
              <DataIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {analyticsData.overview?.predictionsCount || 0} predictions generated
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(45deg, #10B981 30%, #059669 90%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {analyticsData.overview?.trendsCount || 0}
                </Typography>
                <Typography variant="subtitle1">
                  Trend Patterns
                </Typography>
              </Box>
              <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              AI-powered analysis
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(45deg, #F59E0B 30%, #D97706 90%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {analyticsData.overview?.recommendationsCount || 0}
                </Typography>
                <Typography variant="subtitle1">
                  Recommendations
                </Typography>
              </Box>
              <RecommendationIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              Optimization opportunities
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ background: 'linear-gradient(45deg, #EF4444 30%, #DC2626 90%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {analyticsData.overview?.securityScore || 0}
                </Typography>
                <Typography variant="subtitle1">
                  Security Score
                </Typography>
              </Box>
              <SecurityIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            </Box>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {risks.filter(r => r.severity === 'critical').length} critical risks
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Analytics Summary Charts */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Predictive Insights Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={generateTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Area type="monotone" dataKey="predictions" stackId="1" stroke="#6366F1" fill="#6366F1" fillOpacity={0.6} />
                <Area type="monotone" dataKey="recommendations" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="risks" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Analytics Categories
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={generateCategoryData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {generateCategoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Analytics Activity
            </Typography>
            <List>
              {analyticsData.predictions?.slice(0, 5).map((prediction: any) => (
                <ListItem key={prediction.predictionId}>
                  <ListItemIcon>
                    <ForecastIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`Prediction: ${prediction.targetMetric}`}
                    secondary={`${prediction.scenario} scenario • ${(prediction.confidence * 100).toFixed(0)}% confidence • ${formatDate(prediction.generatedAt)}`}
                  />
                  <Chip
                    label={`${formatNumber(prediction.predictedValue)} ${prediction.targetMetric.includes('cost') ? 'USD' : 'units'}`}
                    color="primary"
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPredictionsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Predictive Analytics</Typography>
        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Metric</InputLabel>
            <Select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              label="Metric"
            >
              <MenuItem value="all">All Metrics</MenuItem>
              <MenuItem value="cost">Cost Metrics</MenuItem>
              <MenuItem value="performance">Performance</MenuItem>
              <MenuItem value="security">Security</MenuItem>
              <MenuItem value="usage">Usage</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<ModelIcon />}
            onClick={() => handleGeneratePredictions()}
          >
            Generate Predictions
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {predictions.map((prediction: any) => (
          <Grid item xs={12} md={6} lg={4} key={prediction.predictionId}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Typography variant="h6">{prediction.targetMetric}</Typography>
                  <Chip
                    label={prediction.scenario}
                    color={prediction.scenario === 'optimistic' ? 'success' : prediction.scenario === 'pessimistic' ? 'error' : 'info'}
                    size="small"
                  />
                </Box>
                
                <Typography variant="h4" color="primary" gutterBottom>
                  {formatNumber(prediction.predictedValue)}
                  <Typography component="span" variant="body2" color="textSecondary">
                    {' '}in {prediction.timeframe}
                  </Typography>
                </Typography>
                
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Typography variant="body2" color="textSecondary">
                    Confidence:
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={prediction.confidence * 100}
                    sx={{ flex: 1, height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    {(prediction.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
                
                <Typography variant="subtitle2" gutterBottom>
                  Key Factors:
                </Typography>
                {prediction.factors?.slice(0, 3).map((factor: any, index: number) => (
                  <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">{factor.factor}</Typography>
                    <Chip
                      label={`${factor.impact > 0 ? '+' : ''}${(factor.impact * 100).toFixed(0)}%`}
                      size="small"
                      color={factor.impact > 0 ? 'success' : 'error'}
                    />
                  </Box>
                ))}
                
                <Box display="flex" gap={1} mt={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedItem(prediction);
                      setPredictionDialogOpen(true);
                    }}
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

  const renderTrendsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Trend Analysis</Typography>
        <Button
          variant="contained"
          startIcon={<ScienceIcon />}
          onClick={() => handleRunAnalysis('trends')}
        >
          Analyze Trends
        </Button>
      </Box>

      <Grid container spacing={3}>
        {trends.map((trend: any) => (
          <Grid item xs={12} md={6} key={trend.trendId}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography variant="h6">{trend.metricName}</Typography>
                  {getTrendIcon(trend.direction)}
                </Box>
                
                <Box display="flex" alignItems="center" gap={2} mb={2}>
                  <Chip
                    label={trend.direction}
                    color={trend.direction === 'increasing' ? 'success' : trend.direction === 'decreasing' ? 'error' : 'info'}
                  />
                  <Typography variant="body2" color="textSecondary">
                    {trend.timeframe} trend
                  </Typography>
                </Box>
                
                <Typography variant="body1" gutterBottom>
                  Magnitude: <strong>{formatNumber(trend.magnitude, 2)}</strong>
                </Typography>
                
                <Typography variant="body1" gutterBottom>
                  Confidence: <strong>{(trend.confidence * 100).toFixed(0)}%</strong>
                </Typography>
                
                <Typography variant="body1" gutterBottom>
                  Pattern: <strong>{trend.pattern}</strong>
                </Typography>
                
                {trend.anomalies && trend.anomalies.length > 0 && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {trend.anomalies.length} anomal{trend.anomalies.length === 1 ? 'y' : 'ies'} detected
                  </Alert>
                )}
                
                {trend.seasonality && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {trend.seasonality.period} seasonality detected (strength: {(trend.seasonality.strength * 100).toFixed(0)}%)
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderRecommendationsTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Optimization Recommendations</Typography>
        <Button
          variant="contained"
          startIcon={<AIIcon />}
          onClick={() => handleRunAnalysis('optimization')}
        >
          Generate Recommendations
        </Button>
      </Box>

      <Grid container spacing={3}>
        {recommendations.map((recommendation: any) => (
          <Grid item xs={12} key={recommendation.recommendationId}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box flex={1}>
                    <Typography variant="h6">{recommendation.title}</Typography>
                    <Typography variant="body2" color="textSecondary" paragraph>
                      {recommendation.description}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1}>
                    <Chip
                      label={recommendation.category}
                      color="primary"
                      size="small"
                    />
                    <Chip
                      label={recommendation.priority}
                      color={getPriorityColor(recommendation.priority) as any}
                      size="small"
                    />
                  </Box>
                </Box>
                
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={12} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Potential Savings
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {formatCurrency(recommendation.potentialSavings, recommendation.currency)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Estimated ROI
                      </Typography>
                      <Typography variant="h6">
                        {recommendation.estimatedROI?.toFixed(1)}x
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Implementation Time
                      </Typography>
                      <Typography variant="h6">
                        {recommendation.implementation?.timeline || 'TBD'}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Status
                      </Typography>
                      <Chip
                        label={recommendation.status}
                        color={recommendation.status === 'pending' ? 'warning' : 'success'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                </Grid>
                
                {recommendation.metrics && recommendation.metrics.length > 0 && (
                  <Box mb={2}>
                    <Typography variant="subtitle2" gutterBottom>
                      Impact Metrics:
                    </Typography>
                    <Grid container spacing={1}>
                      {recommendation.metrics.map((metric: any, index: number) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Box p={1} border={1} borderColor="divider" borderRadius={1}>
                            <Typography variant="caption" color="textSecondary">
                              {metric.metricName}
                            </Typography>
                            <Typography variant="body2">
                              {formatNumber(metric.currentValue)} → {formatNumber(metric.targetValue)} {metric.unit}
                            </Typography>
                            <Typography variant="caption" color="success.main">
                              +{formatNumber(metric.improvement)} improvement
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                
                <Box display="flex" gap={1}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<PlayIcon />}
                    onClick={() => handleImplementRecommendation(recommendation.recommendationId)}
                    disabled={recommendation.status !== 'pending'}
                  >
                    Implement
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => {
                      setSelectedItem(recommendation);
                      setRecommendationDialogOpen(true);
                    }}
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

  const renderRisksTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Risk Analysis</Typography>
        <Button
          variant="contained"
          startIcon={<RiskIcon />}
          onClick={() => handleRunAnalysis('risks')}
        >
          Analyze Risks
        </Button>
      </Box>

      {risks.map((risk: any) => (
        <Accordion key={risk.riskId}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box display="flex" alignItems="center" gap={2} width="100%">
              <RiskIcon color={getSeverityColor(risk.severity) as any} />
              <Box flex={1}>
                <Typography variant="subtitle1">{risk.title}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {risk.category} • {risk.status}
                </Typography>
              </Box>
              <Chip
                label={risk.severity}
                color={getSeverityColor(risk.severity) as any}
                size="small"
              />
              <Box textAlign="right">
                <Typography variant="body2">
                  Impact: {(risk.impact * 100).toFixed(0)}%
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Probability: {(risk.probability * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" paragraph>
                {risk.description}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Mitigation Steps:
              </Typography>
              <List dense>
                {risk.mitigationSteps?.map((step: string, index: number) => (
                  <ListItem key={index}>
                    <ListItemText primary={step} />
                  </ListItem>
                ))}
              </List>
              
              <Box display="flex" gap={1} mt={2}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setSelectedItem(risk);
                    setRiskDialogOpen(true);
                  }}
                >
                  Manage Risk
                </Button>
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

  const renderCapacityTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Capacity Forecasting</Typography>
        <Button
          variant="contained"
          startIcon={<ForecastIcon />}
          onClick={() => handleRunAnalysis('capacity')}
        >
          Generate Forecasts
        </Button>
      </Box>

      <Grid container spacing={3}>
        {capacityForecasts.map((forecast: any) => (
          <Grid item xs={12} md={6} key={forecast.forecastId}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {forecast.resource}
                </Typography>
                
                <Grid container spacing={2} mb={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Current Utilization
                    </Typography>
                    <Typography variant="h5">
                      {(forecast.currentUtilization * 100).toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Predicted Utilization
                    </Typography>
                    <Typography variant="h5" color={forecast.predictedUtilization > 0.8 ? 'error.main' : 'success.main'}>
                      {(forecast.predictedUtilization * 100).toFixed(1)}%
                    </Typography>
                  </Grid>
                </Grid>
                
                <LinearProgress
                  variant="determinate"
                  value={forecast.predictedUtilization * 100}
                  color={forecast.predictedUtilization > 0.8 ? 'error' : forecast.predictedUtilization > 0.6 ? 'warning' : 'success'}
                  sx={{ height: 8, borderRadius: 4, mb: 2 }}
                />
                
                <Typography variant="body2" gutterBottom>
                  Time to Capacity: <strong>{forecast.timeToCapacity} days</strong>
                </Typography>
                
                <Typography variant="body2" gutterBottom>
                  Confidence: <strong>{(forecast.confidence * 100).toFixed(0)}%</strong>
                </Typography>
                
                <Typography variant="subtitle2" gutterBottom>
                  Recommended Actions:
                </Typography>
                <List dense>
                  {forecast.recommendedActions?.slice(0, 3).map((action: string, index: number) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={action}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderSecurityTab = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Security Analytics</Typography>
        <Button
          variant="contained"
          startIcon={<SecurityIcon />}
          onClick={() => handleRunAnalysis('security')}
        >
          Update Security Score
        </Button>
      </Box>

      {securityScore && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Overall Security Score
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{
                    name: 'Security Score',
                    value: securityScore.overallScore,
                    fill: securityScore.overallScore >= 80 ? '#10B981' : securityScore.overallScore >= 60 ? '#F59E0B' : '#EF4444'
                  }]}>
                    <RadialBar dataKey="value" cornerRadius={30} fill="#8884d8" />
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="progress-label">
                      <tspan fontSize="24" fontWeight="bold">{securityScore.overallScore}</tspan>
                      <tspan fontSize="14" dx="-15" dy="20">/ 100</tspan>
                    </text>
                  </RadialBarChart>
                </ResponsiveContainer>
                <Typography variant="body2" color="textSecondary">
                  Last assessed: {formatDate(securityScore.lastAssessed)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Security Categories
                </Typography>
                {securityScore.categories?.map((category: any) => (
                  <Box key={category.name} mb={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body1">{category.name}</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {category.score}/100
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={category.score}
                      color={category.score >= 80 ? 'success' : category.score >= 60 ? 'warning' : 'error'}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          {securityScore.threats && securityScore.threats.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Threats
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Threat</TableCell>
                          <TableCell>Severity</TableCell>
                          <TableCell>Probability</TableCell>
                          <TableCell>Impact</TableCell>
                          <TableCell>Detected</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {securityScore.threats.map((threat: any) => (
                          <TableRow key={threat.threatId}>
                            <TableCell>
                              <Typography variant="subtitle2">{threat.title}</Typography>
                              <Typography variant="caption" color="textSecondary">
                                {threat.source}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={threat.severity}
                                color={getSeverityColor(threat.severity) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>{(threat.probability * 100).toFixed(0)}%</TableCell>
                            <TableCell>{(threat.impact * 100).toFixed(0)}%</TableCell>
                            <TableCell>{formatDate(threat.detectedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );

  // Helper functions for chart data
  const generateTrendData = () => {
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString(),
        predictions: Math.floor(Math.random() * 20) + 10,
        recommendations: Math.floor(Math.random() * 15) + 5,
        risks: Math.floor(Math.random() * 10) + 2
      });
    }
    return data;
  };

  const generateCategoryData = () => [
    { name: 'Performance', value: 30, color: '#6366F1' },
    { name: 'Security', value: 25, color: '#EF4444' },
    { name: 'Cost', value: 20, color: '#10B981' },
    { name: 'Usage', value: 15, color: '#F59E0B' },
    { name: 'Capacity', value: 10, color: '#8B5CF6' }
  ];

  if (!isVisible) return null;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <AnalyticsIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              Advanced Analytics
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              AI-powered insights and predictive intelligence
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Timeframe</InputLabel>
            <Select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              label="Timeframe"
            >
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
              <MenuItem value="90d">90 Days</MenuItem>
              <MenuItem value="1y">1 Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAnalyticsData}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
          >
            Settings
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Overview" icon={<InsightsIcon />} iconPosition="start" />
          <Tab label="Predictions" icon={<ForecastIcon />} iconPosition="start" />
          <Tab label="Trends" icon={<TrendingUpIcon />} iconPosition="start" />
          <Tab label="Recommendations" icon={<RecommendationIcon />} iconPosition="start" />
          <Tab label="Risks" icon={<RiskIcon />} iconPosition="start" />
          <Tab label="Capacity" icon={<CapacityIcon />} iconPosition="start" />
          <Tab label="Security" icon={<SecurityIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        {renderOverviewTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderPredictionsTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderTrendsTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {renderRecommendationsTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        {renderRisksTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={5}>
        {renderCapacityTab()}
      </TabPanel>

      <TabPanel value={activeTab} index={6}>
        {renderSecurityTab()}
      </TabPanel>

      {/* Dialogs would go here - Prediction Dialog, Recommendation Dialog, Risk Dialog */}
    </Box>
  );
};

export default AdvancedAnalyticsDashboard;