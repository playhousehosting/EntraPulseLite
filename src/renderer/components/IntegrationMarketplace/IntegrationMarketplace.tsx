// Integration Marketplace - Phase 10
// Comprehensive marketplace for MCP servers, workflows, and API integrations with advanced features

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Container,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Grid,
  Button,
  Chip,
  Rating,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Badge,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Menu,
  MenuList,
  Paper,
  Popper,
  ClickAwayListener,
  Grow,
  Stack,
  LinearProgress,
  Tooltip,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  Store as StoreIcon,
  Extension as ExtensionIcon,
  AccountTree as WorkflowIcon,
  Api as ApiIcon,
  Settings as SettingsIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  CloudDownload as CloudDownloadIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Star as StarIcon,
  Verified as VerifiedIcon,
  Code as CodeIcon,
  Build as BuildIcon,
  Link as LinkIcon,
  Timeline as TimelineIcon,
  Create as CreateIcon,
  ImportExport as ImportExportIcon,
  Publish as PublishIcon,
  GetApp as GetAppIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  LocalOffer as LocalOfferIcon,
  Schedule as ScheduleIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';

// Import services
import MCPService, { 
  MCPServer, 
  MCPMarketplaceItem, 
  MCPConnection 
} from '../../services/MCPService';
import WorkflowService, { 
  WorkflowTemplate 
} from '../../services/WorkflowService';
import APIService from '../../services/APIService';
import type { APIMarketplaceItem } from '../../services/APIService';

// Enhanced marketplace interfaces
interface EnhancedMarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: 'mcp-server' | 'workflow' | 'api-service' | 'template' | 'integration';
  type: 'official' | 'community' | 'premium' | 'beta' | 'deprecated';
  icon: React.ReactNode;
  status: 'installed' | 'available' | 'updating' | 'error' | 'running' | 'stopped';
  version: string;
  latestVersion?: string;
  author: string;
  organization?: string;
  rating: number;
  reviewCount: number;
  downloads: number;
  tags: string[];
  features: string[];
  requirements: string[];
  screenshots: string[];
  documentation: string;
  sourceUrl?: string;
  supportUrl?: string;
  license: string;
  pricing: {
    type: 'free' | 'paid' | 'freemium' | 'subscription';
    amount?: number;
    currency?: string;
  };
  config?: any;
  metadata: Record<string, any>;
  created: Date;
  updated: Date;
  featured: boolean;
  verified: boolean;
}

interface MarketplaceFilters {
  search: string;
  category: string;
  type: string;
  pricing: string;
  rating: number;
  sortBy: 'name' | 'rating' | 'downloads' | 'updated' | 'created';
  sortOrder: 'asc' | 'desc';
}

export const IntegrationMarketplace: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [marketplaceItems, setMarketplaceItems] = useState<EnhancedMarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MarketplaceFilters>({
    search: '',
    category: 'all',
    type: 'all',
    pricing: 'all',
    rating: 0,
    sortBy: 'downloads',
    sortOrder: 'desc'
  });
  const [selectedItem, setSelectedItem] = useState<EnhancedMarketplaceItem | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // Service instances
  const [mcpService] = useState(() => new MCPService());
  const [workflowService] = useState(() => new WorkflowService());
  const [apiService] = useState(() => new APIService());
  
  // Load marketplace items on component mount
  useEffect(() => {
    loadMarketplaceItems();
  }, []);

  const loadMarketplaceItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load from all services
      const [mcpItems, workflowTemplates, apiItems] = await Promise.all([
        mcpService.getMarketplace(),
        workflowService.getTemplates(),
        apiService.getMarketplace()
      ]);

      // Convert to enhanced marketplace items
      const enhancedItems: EnhancedMarketplaceItem[] = [
        // MCP Servers
        ...mcpItems.map((item: MCPMarketplaceItem) => ({
          id: item.id,
          name: item.server?.name || 'Unknown',
          description: item.server?.description || 'No description',
          category: 'mcp-server' as const,
          type: item.server?.isOfficial ? 'official' as const : 'community' as const,
          icon: <ExtensionIcon />,
          status: item.server?.status === 'Running' ? 'running' as const : 
                  item.server?.status === 'Installed' ? 'installed' as const :
                  item.server?.status === 'Stopped' ? 'stopped' as const : 'available' as const,
          version: item.server?.version || '1.0.0',
          author: item.server?.author || 'Unknown',
          rating: item.server?.rating || 0,
          reviewCount: item.reviews?.length || 0,
          downloads: item.server?.downloads || 0,
          tags: item.tags || [],
          features: item.server?.capabilities || [],
          requirements: item.server?.dependencies || [],
          screenshots: item.screenshots || [],
          documentation: item.documentation || '',
          sourceUrl: item.sourceUrl,
          supportUrl: item.supportUrl,
          license: item.licenseType || 'Unknown',
          pricing: {
            type: item.pricing?.type?.toLowerCase() as any || 'free',
            amount: item.pricing?.amount || 0,
            currency: item.pricing?.currency || 'USD'
          },
          metadata: item.server?.config || {},
          created: new Date(item.server?.lastUpdated || Date.now()),
          updated: new Date(item.server?.lastUpdated || Date.now()),
          featured: item.featured || false,
          verified: item.server?.isOfficial || false
        })),
        
        // Workflow Templates
        ...workflowTemplates.map((template: WorkflowTemplate) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          category: 'workflow' as const,
          type: template.isOfficial ? 'official' as const : 'community' as const,
          icon: <WorkflowIcon />,
          status: 'available' as const,
          version: template.version || '1.0.0',
          author: template.author || 'Unknown',
          rating: template.rating || 0,
          reviewCount: 0,
          downloads: template.downloads || 0,
          tags: template.tags || [],
          features: [],
          requirements: template.requirements || [],
          screenshots: template.screenshots || [],
          documentation: template.documentation || '',
          license: 'MIT',
          pricing: { type: 'free' as const },
          metadata: template.workflow || {},
          created: new Date(),
          updated: new Date(),
          featured: template.isOfficial || false,
          verified: template.isOfficial || false
        })),
        
        // API Services
        ...apiItems.map((item: APIMarketplaceItem) => ({
          id: item.id,
          name: item.service?.name || 'Unknown',
          description: item.service?.description || 'No description',
          category: 'api-service' as const,
          type: item.service?.isOfficial ? 'official' as const : 'community' as const,
          icon: <ApiIcon />,
          status: item.service?.isActive ? 'available' as const : 'stopped' as const,
          version: item.service?.version || '1.0.0',
          author: item.service?.provider || 'Unknown',
          rating: item.rating || 0,
          reviewCount: item.reviews?.length || 0,
          downloads: item.downloads || 0,
          tags: item.tags || [],
          features: [],
          requirements: [],
          screenshots: item.screenshots || [],
          documentation: '',
          license: 'Various',
          pricing: {
            type: item.pricing?.type?.toLowerCase() as any || 'free',
            amount: item.pricing?.amount || 0,
            currency: item.pricing?.currency || 'USD'
          },
          metadata: {},
          created: new Date(),
          updated: new Date(),
          featured: item.featured || false,
          verified: item.service?.isOfficial || false
        }))
      ];
      
      setMarketplaceItems(enhancedItems);
    } catch (err) {
      setError('Failed to load marketplace items: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    loadMarketplaceItems();
  };

  const handleFilterChange = (key: keyof MarketplaceFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleInstall = async (itemId: string) => {
    try {
      const item = marketplaceItems.find(i => i.id === itemId);
      if (!item) return;

      // Update status to updating
      setMarketplaceItems(prev => 
        prev.map(i => 
          i.id === itemId ? { ...i, status: 'updating' } : i
        )
      );
      
      let success = false;
      
      // Install based on category
      switch (item.category) {
        case 'mcp-server':
          success = await mcpService.installServer(itemId, { autoStart: true });
          break;
        case 'workflow':
          const workflowId = await workflowService.createWorkflowFromTemplate(itemId, item.name);
          success = !!workflowId;
          break;
        case 'api-service':
          success = await apiService.installService(itemId);
          break;
      }
      
      if (success) {
        // Update status to installed
        setMarketplaceItems(prev => 
          prev.map(i => 
            i.id === itemId ? { ...i, status: 'installed' } : i
          )
        );
      } else {
        throw new Error('Installation failed');
      }
    } catch (err) {
      setError('Failed to install item: ' + (err instanceof Error ? err.message : String(err)));
      
      // Revert status on error
      setMarketplaceItems(prev => 
        prev.map(i => 
          i.id === itemId ? { ...i, status: 'available' } : i
        )
      );
    }
  };

  const handleUninstall = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to uninstall this item?')) {
      return;
    }
    
    try {
      const item = marketplaceItems.find(i => i.id === itemId);
      if (!item) return;

      let success = false;
      
      // Uninstall based on category
      switch (item.category) {
        case 'mcp-server':
          success = await mcpService.uninstallServer(itemId);
          break;
        case 'workflow':
          // Workflows created from templates can't be "uninstalled" from here
          success = true;
          break;
        case 'api-service':
          success = await apiService.uninstallService(itemId);
          break;
      }
      
      if (success) {
        // Update status to available
        setMarketplaceItems(prev => 
          prev.map(i => 
            i.id === itemId ? { ...i, status: 'available' } : i
          )
        );
      }
    } catch (err) {
      setError('Failed to uninstall item: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleStart = async (itemId: string) => {
    try {
      const item = marketplaceItems.find(i => i.id === itemId);
      if (!item) return;

      if (item.category === 'mcp-server') {
        const success = await mcpService.startServer(itemId);
        if (success) {
          setMarketplaceItems(prev => 
            prev.map(i => 
              i.id === itemId ? { ...i, status: 'running' } : i
            )
          );
        }
      }
    } catch (err) {
      setError('Failed to start item: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleStop = async (itemId: string) => {
    try {
      const item = marketplaceItems.find(i => i.id === itemId);
      if (!item) return;

      if (item.category === 'mcp-server') {
        const success = await mcpService.stopServer(itemId);
        if (success) {
          setMarketplaceItems(prev => 
            prev.map(i => 
              i.id === itemId ? { ...i, status: 'installed' } : i
            )
          );
        }
      }
    } catch (err) {
      setError('Failed to stop item: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleViewDetails = (item: EnhancedMarketplaceItem) => {
    setSelectedItem(item);
    setDetailsDialogOpen(true);
  };

  // Apply filters and sorting
  const filteredItems = marketplaceItems
    .filter(item => {
      // Text search
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !item.description.toLowerCase().includes(filters.search.toLowerCase()) &&
          !item.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))) {
        return false;
      }

      // Category filter
      switch (activeTab) {
        case 0: break; // All items
        case 1: if (item.category !== 'mcp-server') return false; break;
        case 2: if (item.category !== 'workflow') return false; break;
        case 3: if (item.category !== 'api-service') return false; break;
        default: break;
      }

      // Additional filters
      if (filters.category !== 'all' && item.category !== filters.category) return false;
      if (filters.type !== 'all' && item.type !== filters.type) return false;
      if (filters.pricing !== 'all' && item.pricing.type !== filters.pricing) return false;
      if (filters.rating > 0 && item.rating < filters.rating) return false;

      return true;
    })
    .sort((a, b) => {
      const { sortBy, sortOrder } = filters;
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'updated':
          comparison = a.updated.getTime() - b.updated.getTime();
          break;
        case 'created':
          comparison = a.created.getTime() - b.created.getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'installed': return <CheckCircleIcon color="success" />;
      case 'running': return <PlayIcon color="primary" />;
      case 'stopped': return <StopIcon color="action" />;
      case 'updating': return <CircularProgress size={16} />;
      case 'error': return <ErrorIcon color="error" />;
      default: return null;
    }
  };

  const getStatusActions = (item: EnhancedMarketplaceItem) => {
    switch (item.status) {
      case 'available':
        return (
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={() => handleInstall(item.id)}
            variant="contained"
          >
            Install
          </Button>
        );
      case 'installed':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {item.category === 'mcp-server' && (
              <Button
                size="small"
                startIcon={<PlayIcon />}
                onClick={() => handleStart(item.id)}
                variant="outlined"
              >
                Start
              </Button>
            )}
            <Button
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => handleUninstall(item.id)}
              color="error"
              variant="outlined"
            >
              Remove
            </Button>
          </Box>
        );
      case 'running':
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<StopIcon />}
              onClick={() => handleStop(item.id)}
              variant="outlined"
            >
              Stop
            </Button>
            <Button
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => handleUninstall(item.id)}
              color="error"
              variant="outlined"
            >
              Remove
            </Button>
          </Box>
        );
      case 'updating':
        return (
          <Button size="small" disabled>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            Installing...
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <StoreIcon sx={{ mr: 2 }} />
          Integration Marketplace
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <IconButton>
            <SettingsIcon />
          </IconButton>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search integrations..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="official">Official</MenuItem>
                  <MenuItem value="community">Community</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                  <MenuItem value="beta">Beta</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Pricing</InputLabel>
                <Select
                  value={filters.pricing}
                  onChange={(e) => handleFilterChange('pricing', e.target.value)}
                  label="Pricing"
                >
                  <MenuItem value="all">All Pricing</MenuItem>
                  <MenuItem value="free">Free</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="freemium">Freemium</MenuItem>
                  <MenuItem value="subscription">Subscription</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="downloads">Downloads</MenuItem>
                  <MenuItem value="rating">Rating</MenuItem>
                  <MenuItem value="name">Name</MenuItem>
                  <MenuItem value="updated">Updated</MenuItem>
                  <MenuItem value="created">Created</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Rating</InputLabel>
                <Select
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                  label="Rating"
                >
                  <MenuItem value={0}>All Ratings</MenuItem>
                  <MenuItem value={4}>4+ Stars</MenuItem>
                  <MenuItem value={3}>3+ Stars</MenuItem>
                  <MenuItem value={2}>2+ Stars</MenuItem>
                  <MenuItem value={1}>1+ Stars</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Category Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab 
          label={`All Integrations (${marketplaceItems.length})`} 
          icon={<StoreIcon />} 
        />
        <Tab 
          label={`MCP Servers (${marketplaceItems.filter(i => i.category === 'mcp-server').length})`} 
          icon={<ExtensionIcon />} 
        />
        <Tab 
          label={`Workflows (${marketplaceItems.filter(i => i.category === 'workflow').length})`} 
          icon={<WorkflowIcon />} 
        />
        <Tab 
          label={`API Services (${marketplaceItems.filter(i => i.category === 'api-service').length})`} 
          icon={<ApiIcon />} 
        />
      </Tabs>
      
      {/* Results */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Showing {filteredItems.length} of {marketplaceItems.length} integrations
          </Typography>
          
          <Grid container spacing={3}>
            {filteredItems.map((item) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    position: 'relative',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                >
                  {/* Featured badge */}
                  {item.featured && (
                    <Chip
                      label="Featured"
                      color="primary"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 1
                      }}
                    />
                  )}
                  
                  <CardHeader 
                    avatar={
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {item.icon}
                      </Avatar>
                    }
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h6" noWrap>
                          {item.name}
                        </Typography>
                        {item.verified && (
                          <VerifiedIcon color="primary" fontSize="small" />
                        )}
                      </Box>
                    }
                    subheader={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          by {item.author}
                        </Typography>
                        {getStatusIcon(item.status)}
                      </Box>
                    }
                    sx={{ pb: 1 }}
                  />
                  
                  <CardContent sx={{ flexGrow: 1, pt: 0 }}>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {item.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Rating value={item.rating} precision={0.1} size="small" readOnly />
                        <Typography variant="caption" color="text.secondary">
                          ({item.reviewCount})
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {item.downloads.toLocaleString()} downloads
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {item.tags.slice(0, 3).map((tag: string) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                      {item.tags.length > 3 && (
                        <Chip
                          label={`+${item.tags.length - 3}`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        v{item.version}
                      </Typography>
                      <Chip
                        label={item.type}
                        size="small"
                        color={
                          item.type === 'official' ? 'primary' :
                          item.type === 'premium' ? 'secondary' :
                          'default'
                        }
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                  
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                      <Button
                        size="small"
                        onClick={() => handleViewDetails(item)}
                        startIcon={<InfoIcon />}
                      >
                        Details
                      </Button>
                      {getStatusActions(item)}
                    </Box>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          {filteredItems.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                No integrations found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search criteria or filters
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Speed Dial for Actions */}
      <SpeedDial
        ariaLabel="Integration Actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        icon={<SpeedDialIcon />}
        open={speedDialOpen}
        onOpen={() => setSpeedDialOpen(true)}
        onClose={() => setSpeedDialOpen(false)}
      >
        <SpeedDialAction
          icon={<CreateIcon />}
          tooltipTitle="Create Custom Integration"
          onClick={() => {}}
        />
        <SpeedDialAction
          icon={<ImportExportIcon />}
          tooltipTitle="Import Integration"
          onClick={() => {}}
        />
        <SpeedDialAction
          icon={<PublishIcon />}
          tooltipTitle="Publish to Marketplace"
          onClick={() => {}}
        />
      </SpeedDial>

      {/* Item Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedItem && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {selectedItem.icon}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedItem.name}
                    {selectedItem.verified && (
                      <VerifiedIcon color="primary" fontSize="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    by {selectedItem.author} • v{selectedItem.version}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedItem.description}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Rating value={selectedItem.rating} precision={0.1} readOnly />
                <Typography variant="body2">
                  {selectedItem.rating}/5 ({selectedItem.reviewCount} reviews)
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedItem.downloads.toLocaleString()} downloads
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Category
                  </Typography>
                  <Chip label={selectedItem.category} variant="outlined" />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    License
                  </Typography>
                  <Typography variant="body2">{selectedItem.license}</Typography>
                </Grid>
                
                {selectedItem.features.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Features
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {selectedItem.features.map((feature, index) => (
                        <Chip key={index} label={feature} size="small" />
                      ))}
                    </Box>
                  </Grid>
                )}
                
                {selectedItem.requirements.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Requirements
                    </Typography>
                    <List dense>
                      {selectedItem.requirements.map((req, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={req} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedItem.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions>
              <Button onClick={() => setDetailsDialogOpen(false)}>
                Close
              </Button>
              {selectedItem.sourceUrl && (
                <Button
                  startIcon={<CodeIcon />}
                  onClick={() => window.open(selectedItem.sourceUrl, '_blank')}
                >
                  Source Code
                </Button>
              )}
              {selectedItem.supportUrl && (
                <Button
                  startIcon={<LinkIcon />}
                  onClick={() => window.open(selectedItem.supportUrl, '_blank')}
                >
                  Support
                </Button>
              )}
              {getStatusActions(selectedItem)}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default IntegrationMarketplace;