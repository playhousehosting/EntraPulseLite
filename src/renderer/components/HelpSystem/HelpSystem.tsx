// Comprehensive Help System for EntraPulse Lite
// Professional documentation and feature guide for users

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tab,
  Tabs,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Button,
  TextField,
  InputAdornment,
  Divider,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Link,
  Breadcrumbs
} from '@mui/material';
import {
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  MenuBook as GuideIcon,
  VideoLibrary as VideoIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Api as ApiIcon,
  Extension as ExtensionIcon,
  AccountTree as WorkflowIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Psychology as AIIcon,
  Chat as ChatIcon,
  Hub as IntegrationIcon,
  CloudUpload as CloudIcon,
  Storage as DataIcon,
  Verified as VerifiedIcon,
  Lightbulb as TipIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckIcon,
  Launch as LaunchIcon,
  GetApp as DownloadIcon,
  School as TutorialIcon,
  Support as SupportIcon,
  QuestionAnswer as FAQIcon,
  BugReport as BugIcon,
  Feedback as FeedbackIcon
} from '@mui/icons-material';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  articles: HelpArticle[];
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  relatedArticles?: string[];
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  url: string;
  category: string;
}

export const HelpSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSection, setSelectedSection] = useState<string>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('overview');
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);

  const helpSections: HelpSection[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <TutorialIcon />,
      description: 'Learn the basics of EntraPulse Lite',
      articles: [
        {
          id: 'overview',
          title: 'EntraPulse Lite Overview',
          content: `EntraPulse Lite is a powerful desktop application that provides natural language querying of Microsoft Graph APIs through local and cloud LLM integration.

## Key Features:
- **Microsoft Authentication**: Secure login with your Entra ID account
- **Natural Language Queries**: Ask questions about your Microsoft environment in plain English
- **Local & Cloud LLM Support**: Use Ollama, LM Studio, or cloud providers like OpenAI, Anthropic
- **Integration Hub**: Connect with MCP servers, create workflows, and manage APIs
- **Intelligence Dashboard**: Advanced analytics and insights for your environment
- **Multi-Tenant Support**: Manage multiple Microsoft tenants (MSP mode)

## Getting Started:
1. Launch EntraPulse Lite
2. Sign in with your Microsoft account
3. Configure your preferred LLM provider
4. Start asking questions about your environment!`,
          category: 'basics',
          tags: ['overview', 'features', 'introduction'],
          difficulty: 'Beginner',
          estimatedTime: '5 minutes'
        },
        {
          id: 'first-setup',
          title: 'Initial Setup and Configuration',
          content: `Follow these steps to get EntraPulse Lite running for the first time:

## 1. Microsoft Authentication
- Click "Sign in with Microsoft" on the welcome screen
- Enter your Entra ID credentials
- Grant permissions when prompted
- You'll be redirected back to the application

## 2. LLM Configuration
- Click the Settings button (⚙️) in the top-right
- Choose your preferred LLM provider:
  - **Local**: Ollama or LM Studio for privacy
  - **Cloud**: OpenAI, Anthropic, Azure OpenAI for power
- Enter your API keys if using cloud providers
- Test your configuration

## 3. First Query
- Return to the chat interface
- Try asking: "How many users are in my tenant?"
- Or: "Show me recent sign-in activity"
- The AI will query Microsoft Graph and provide insights

## Tips for Success:
- Start with simple queries to understand the system
- Use natural language - the AI understands context
- Check the trace visualization to see how queries are processed`,
          category: 'setup',
          tags: ['setup', 'configuration', 'authentication', 'llm'],
          difficulty: 'Beginner',
          estimatedTime: '10 minutes'
        }
      ]
    },
    {
      id: 'chat-interface',
      title: 'Chat Interface',
      icon: <ChatIcon />,
      description: 'Master the conversational AI interface',
      articles: [
        {
          id: 'natural-language',
          title: 'Natural Language Queries',
          content: `The chat interface is the heart of EntraPulse Lite. Here's how to use it effectively:

## Query Types:
- **User Management**: "Show me disabled users", "Who has admin roles?"
- **Security Analysis**: "Find risky sign-ins", "Show conditional access policies"
- **Licensing**: "How many E5 licenses are unused?", "Show license assignment"
- **Applications**: "List all registered apps", "Which apps have high privileges?"
- **Groups**: "Show all security groups", "Who's in the HR group?"

## Advanced Techniques:
- **Follow-up questions**: "Show more details about that user"
- **Filtering**: "Only show users created in the last 30 days"
- **Comparisons**: "Compare this month's sign-ins to last month"
- **Exports**: "Export this data to CSV"

## Trace Visualization:
- View the MCP trace to understand how queries are processed
- See which Graph API endpoints are called
- Debug issues by examining the request/response flow
- Learn about the underlying Microsoft Graph structure`,
          category: 'interface',
          tags: ['chat', 'queries', 'natural-language', 'trace'],
          difficulty: 'Beginner',
          estimatedTime: '15 minutes'
        },
        {
          id: 'advanced-queries',
          title: 'Advanced Query Techniques',
          content: `Take your queries to the next level with these advanced techniques:

## Complex Filtering:
- "Show users who haven't signed in for 90+ days AND have admin roles"
- "Find applications with delegated permissions but no assigned users"
- "List groups with more than 100 members created in 2024"

## Data Analysis:
- "What's the trend in sign-in failures over the last 30 days?"
- "Which applications are most frequently used?"
- "Show me licensing utilization by department"

## Conditional Logic:
- "If there are any guest users, show their last sign-in dates"
- "Check if any admin accounts are missing MFA, then show remediation steps"

## Multi-Step Workflows:
- "First, identify stale user accounts, then check their group memberships, and finally suggest cleanup actions"
- "Analyze our conditional access policies, identify gaps, and recommend improvements"

## Performance Tips:
- Use specific timeframes to limit data scope
- Request summaries for large datasets
- Break complex requests into smaller parts`,
          category: 'advanced',
          tags: ['advanced', 'filtering', 'analysis', 'workflows'],
          difficulty: 'Advanced',
          estimatedTime: '20 minutes'
        }
      ]
    },
    {
      id: 'integration-hub',
      title: 'Integration Hub',
      icon: <IntegrationIcon />,
      description: 'Connect with external services and create workflows',
      articles: [
        {
          id: 'mcp-servers',
          title: 'MCP Server Marketplace',
          content: `The MCP (Model Context Protocol) Server Marketplace allows you to extend EntraPulse Lite with additional capabilities:

## What are MCP Servers?
MCP servers are external services that provide additional tools and data sources to the AI. They can:
- Connect to third-party APIs (Salesforce, ServiceNow, etc.)
- Provide specialized analysis tools
- Access external databases
- Integrate with on-premises systems

## Installing MCP Servers:
1. Navigate to Integration Hub → Marketplace
2. Browse available servers by category
3. Read server descriptions and reviews
4. Click "Install" on desired servers
5. Configure connection settings
6. Test the connection

## Popular MCP Servers:
- **Microsoft Graph Extended**: Additional Graph API capabilities
- **Salesforce Connector**: CRM data integration
- **ServiceNow Integration**: ITSM workflows
- **Azure Resource Manager**: Azure infrastructure management
- **GitHub Integration**: Repository and issue management

## Managing Installed Servers:
- View connection status in the dashboard
- Update server configurations
- Monitor usage and performance
- Troubleshoot connection issues`,
          category: 'marketplace',
          tags: ['mcp', 'servers', 'marketplace', 'installation'],
          difficulty: 'Intermediate',
          estimatedTime: '15 minutes'
        },
        {
          id: 'workflow-builder',
          title: 'Workflow Builder',
          content: `Create automated workflows to streamline your IT operations:

## Workflow Components:
- **Triggers**: Time-based, event-driven, or manual
- **Actions**: Microsoft Graph operations, external API calls
- **Conditions**: Logic gates and decision points
- **Notifications**: Email, Teams, webhooks

## Creating a Workflow:
1. Go to Integration Hub → Workflow Builder
2. Choose a template or start from scratch
3. Drag and drop components
4. Configure each step:
   - Set triggers and conditions
   - Map data between steps
   - Configure error handling
5. Test the workflow
6. Deploy and monitor

## Example Workflows:
- **User Onboarding**: Create user → Assign licenses → Add to groups → Send welcome email
- **Security Monitoring**: Check for risky sign-ins → Investigate → Block if necessary → Notify admin
- **License Management**: Monitor usage → Identify unused licenses → Generate reports → Recommend actions
- **Compliance Reporting**: Gather audit data → Generate reports → Distribute to stakeholders

## Best Practices:
- Start with simple workflows
- Include error handling and notifications
- Test thoroughly before deployment
- Monitor performance and adjust as needed`,
          category: 'workflows',
          tags: ['workflows', 'automation', 'builder', 'templates'],
          difficulty: 'Intermediate',
          estimatedTime: '25 minutes'
        },
        {
          id: 'api-management',
          title: 'API Management Console',
          content: `Manage and monitor all your API connections in one place:

## API Connection Types:
- **Microsoft Graph**: Core identity and productivity APIs
- **Third-party Services**: CRM, ITSM, HR systems
- **Custom APIs**: Your organization's internal services
- **Webhook Endpoints**: Incoming event notifications

## Managing Connections:
1. Navigate to Integration Hub → API Management
2. View all active connections
3. Monitor connection health and performance
4. Configure authentication and permissions
5. Set up rate limiting and quotas
6. Review audit logs and usage analytics

## Security Features:
- **OAuth 2.0 / OpenID Connect**: Secure authentication flows
- **API Key Management**: Centralized key storage and rotation
- **Permission Scopes**: Granular access control
- **Audit Logging**: Complete activity tracking
- **Rate Limiting**: Prevent API abuse

## Monitoring and Analytics:
- Real-time connection status
- Request/response metrics
- Error rates and patterns
- Performance benchmarks
- Usage trends and forecasting

## Troubleshooting:
- Connection health checks
- Error log analysis
- Performance diagnostics
- Configuration validation`,
          category: 'api-management',
          tags: ['api', 'management', 'monitoring', 'security'],
          difficulty: 'Advanced',
          estimatedTime: '20 minutes'
        }
      ]
    },
    {
      id: 'intelligence-dashboard',
      title: 'Intelligence Dashboard',
      icon: <DashboardIcon />,
      description: 'Advanced analytics and insights',
      articles: [
        {
          id: 'dashboard-overview',
          title: 'Dashboard Overview',
          content: `The Intelligence Dashboard provides advanced analytics and insights about your Microsoft environment:

## Dashboard Sections:
- **Executive Summary**: High-level metrics and KPIs
- **Security Posture**: Risk assessment and recommendations
- **User Analytics**: Activity patterns and trends
- **Application Insights**: Usage and performance metrics
- **License Optimization**: Utilization and cost analysis

## Key Metrics:
- **User Activity**: Sign-in patterns, device usage, location analytics
- **Security Score**: Conditional access effectiveness, MFA adoption
- **Application Health**: Performance, errors, adoption rates
- **Compliance Status**: Policy adherence, audit findings
- **Cost Optimization**: License usage, recommendations

## Interactive Features:
- **Drill-down Analysis**: Click on metrics for detailed views
- **Time Range Selection**: Analyze different periods
- **Custom Filters**: Focus on specific users, apps, or departments
- **Export Options**: Generate reports in various formats

## Automated Insights:
- **Anomaly Detection**: Unusual patterns and behaviors
- **Trend Analysis**: Predictive insights and forecasts
- **Risk Assessment**: Security vulnerabilities and recommendations
- **Optimization Suggestions**: Cost and performance improvements`,
          category: 'analytics',
          tags: ['dashboard', 'analytics', 'insights', 'metrics'],
          difficulty: 'Intermediate',
          estimatedTime: '15 minutes'
        }
      ]
    },
    {
      id: 'settings-config',
      title: 'Settings & Configuration',
      icon: <SettingsIcon />,
      description: 'Customize EntraPulse Lite to your needs',
      articles: [
        {
          id: 'llm-configuration',
          title: 'LLM Provider Configuration',
          content: `Configure your preferred Large Language Model provider for optimal performance:

## Local LLM Options:
### Ollama
- **Installation**: Download from ollama.ai
- **Models**: llama2, mistral, codellama, and more
- **Benefits**: Complete privacy, no internet required
- **Setup**: Install Ollama → Download model → Configure endpoint

### LM Studio
- **Installation**: Download from lmstudio.ai
- **Models**: Wide selection of open-source models
- **Benefits**: User-friendly interface, model management
- **Setup**: Install LM Studio → Load model → Start server

## Cloud LLM Options:
### OpenAI
- **Models**: GPT-4, GPT-3.5 Turbo, GPT-4 Turbo
- **Benefits**: High performance, latest features
- **Setup**: Get API key → Configure in settings
- **Cost**: Pay-per-use pricing

### Anthropic Claude
- **Models**: Claude 3 Opus, Sonnet, Haiku
- **Benefits**: Strong reasoning, large context window
- **Setup**: Get API key → Configure in settings
- **Cost**: Competitive pricing, generous free tier

### Azure OpenAI
- **Models**: GPT-4, GPT-3.5, with enterprise features
- **Benefits**: Enterprise-grade security, compliance
- **Setup**: Azure subscription → Deploy model → Configure endpoint

## Configuration Tips:
- **Temperature**: Lower (0.1-0.3) for precise answers, higher (0.7-1.0) for creative responses
- **Max Tokens**: 4096 for detailed responses, 1024 for concise answers
- **Model Selection**: GPT-4 for complex analysis, GPT-3.5 for simple queries`,
          category: 'configuration',
          tags: ['llm', 'configuration', 'local', 'cloud', 'setup'],
          difficulty: 'Intermediate',
          estimatedTime: '20 minutes'
        },
        {
          id: 'authentication-config',
          title: 'Authentication Configuration',
          content: `Configure Microsoft authentication for different scenarios:

## Authentication Modes:
### Basic User Token (Default)
- **Use Case**: Single tenant, standard permissions
- **Setup**: Sign in with any Microsoft account
- **Permissions**: Based on your user account rights
- **Benefits**: Quick setup, no admin required

### Custom App Registration
- **Use Case**: Enhanced permissions, production deployments
- **Setup**: Register app in Azure AD → Configure permissions → Use custom app
- **Permissions**: Configurable application permissions
- **Benefits**: More control, audit trail

### Graph PowerShell App
- **Use Case**: PowerShell compatibility, scripting scenarios
- **Setup**: Use Microsoft Graph PowerShell app ID
- **Permissions**: PowerShell-equivalent permissions
- **Benefits**: Familiar to PowerShell users

## Multi-Tenant (MSP) Configuration:
- **Partner Center Integration**: Connect with Partner Center
- **Delegated Administration**: Access customer tenants
- **Permission Management**: Granular access control
- **Tenant Switching**: Easy tenant context switching

## Security Best Practices:
- **Least Privilege**: Request only necessary permissions
- **Regular Rotation**: Update credentials periodically
- **Audit Logging**: Monitor authentication events
- **Conditional Access**: Apply additional security policies`,
          category: 'authentication',
          tags: ['authentication', 'entra', 'azure-ad', 'permissions'],
          difficulty: 'Advanced',
          estimatedTime: '25 minutes'
        }
      ]
    }
  ];

  const videoTutorials: VideoTutorial[] = [
    {
      id: 'intro',
      title: 'EntraPulse Lite Introduction',
      description: 'Get started with EntraPulse Lite in under 10 minutes',
      duration: '8:32',
      thumbnail: '/assets/video-thumbnails/intro.jpg',
      url: 'https://example.com/videos/intro',
      category: 'Getting Started'
    },
    {
      id: 'chat-basics',
      title: 'Mastering the Chat Interface',
      description: 'Learn advanced query techniques and trace visualization',
      duration: '12:45',
      thumbnail: '/assets/video-thumbnails/chat.jpg',
      url: 'https://example.com/videos/chat',
      category: 'Chat Interface'
    },
    {
      id: 'integration-hub',
      title: 'Integration Hub Deep Dive',
      description: 'Explore MCP servers, workflows, and API management',
      duration: '18:20',
      thumbnail: '/assets/video-thumbnails/integration.jpg',
      url: 'https://example.com/videos/integration',
      category: 'Integration'
    }
  ];

  const faqs = [
    {
      question: 'What permissions does EntraPulse Lite need?',
      answer: 'EntraPulse Lite requires read permissions for Microsoft Graph APIs to query your tenant information. The exact permissions depend on your usage, but typically include User.Read.All, Group.Read.All, and AuditLog.Read.All.'
    },
    {
      question: 'Can I use EntraPulse Lite with multiple tenants?',
      answer: 'Yes! EntraPulse Lite supports multi-tenant scenarios through MSP mode. You can switch between different customer tenants and manage them from a single interface.'
    },
    {
      question: 'Is my data secure when using cloud LLM providers?',
      answer: 'When using cloud providers, your queries are sent to their servers for processing. For maximum privacy, consider using local LLM options like Ollama or LM Studio, which process everything locally.'
    },
    {
      question: 'How do I troubleshoot LLM connection issues?',
      answer: 'Check the LLM status indicator in the top-right corner. Verify your API keys, network connectivity, and service availability. Local LLM users should ensure the service is running and accessible.'
    },
    {
      question: 'Can I export query results?',
      answer: 'Yes! Most query results can be exported to CSV, Excel, or JSON formats. Use natural language commands like "export this to CSV" or use the export buttons in the interface.'
    }
  ];

  const currentSection = helpSections.find(s => s.id === selectedSection);
  const filteredArticles = currentSection?.articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const playVideo = (video: VideoTutorial) => {
    setSelectedVideo(video);
    setVideoDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom>
          <HelpIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          EntraPulse Lite Help Center
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Everything you need to master EntraPulse Lite
        </Typography>
        
        {/* Search */}
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search help articles, features, and guides..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ maxWidth: 600 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Main Tabs */}
      <Tabs value={activeTab} onChange={handleTabChange} centered sx={{ mb: 4 }}>
        <Tab icon={<GuideIcon />} label="User Guide" />
        <Tab icon={<VideoIcon />} label="Video Tutorials" />
        <Tab icon={<FAQIcon />} label="FAQ" />
        <Tab icon={<SupportIcon />} label="Support" />
      </Tabs>

      {/* User Guide Tab */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Sidebar */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardHeader title="Help Topics" />
              <CardContent sx={{ p: 0 }}>
                <List>
                  {helpSections.map((section) => (
                    <ListItem
                      key={section.id}
                      button
                      selected={selectedSection === section.id}
                      onClick={() => setSelectedSection(section.id)}
                    >
                      <ListItemIcon>{section.icon}</ListItemIcon>
                      <ListItemText
                        primary={section.title}
                        secondary={section.description}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            {currentSection && (
              <Box>
                <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  {currentSection.icon}
                  <Box sx={{ ml: 2 }}>{currentSection.title}</Box>
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {currentSection.description}
                </Typography>

                {/* Articles */}
                {filteredArticles.map((article) => (
                  <Accordion
                    key={article.id}
                    expanded={expandedAccordion === article.id}
                    onChange={handleAccordionChange(article.id)}
                    sx={{ mb: 2 }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6">{article.title}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Chip
                              label={article.difficulty}
                              size="small"
                              color={
                                article.difficulty === 'Beginner' ? 'success' :
                                article.difficulty === 'Intermediate' ? 'warning' : 'error'
                              }
                            />
                            <Chip label={article.estimatedTime} size="small" variant="outlined" />
                          </Box>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography
                        component="div"
                        sx={{
                          whiteSpace: 'pre-line',
                          '& h2': { fontSize: '1.25rem', fontWeight: 600, mt: 2, mb: 1 },
                          '& h3': { fontSize: '1.1rem', fontWeight: 600, mt: 1.5, mb: 0.5 },
                          '& ul': { pl: 2 },
                          '& li': { mb: 0.5 }
                        }}
                      >
                        {article.content}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {article.tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}

                {filteredArticles.length === 0 && searchQuery && (
                  <Alert severity="info">
                    No articles found matching "{searchQuery}". Try different search terms.
                  </Alert>
                )}
              </Box>
            )}
          </Grid>
        </Grid>
      )}

      {/* Video Tutorials Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          {videoTutorials.map((video) => (
            <Grid item xs={12} sm={6} md={4} key={video.id}>
              <Card>
                <Box
                  sx={{
                    height: 200,
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => playVideo(video)}
                >
                  <IconButton size="large" sx={{ color: 'white', fontSize: '3rem' }}>
                    <VideoIcon fontSize="inherit" />
                  </IconButton>
                </Box>
                <CardContent>
                  <Typography variant="h6" gutterBottom>{video.title}</Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {video.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip label={video.category} size="small" />
                    <Typography variant="caption">{video.duration}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* FAQ Tab */}
      {activeTab === 2 && (
        <Box>
          {faqs.map((faq, index) => (
            <Accordion key={index} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>{faq.answer}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}

      {/* Support Tab */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="Need More Help?"
                avatar={<Avatar><SupportIcon /></Avatar>}
              />
              <CardContent>
                <Typography paragraph>
                  Can't find what you're looking for? We're here to help!
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><BugIcon /></ListItemIcon>
                    <ListItemText
                      primary="Report a Bug"
                      secondary="Found an issue? Let us know so we can fix it."
                    />
                    <Button variant="outlined" size="small">Report</Button>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><FeedbackIcon /></ListItemIcon>
                    <ListItemText
                      primary="Send Feedback"
                      secondary="Share your thoughts and suggestions for improvement."
                    />
                    <Button variant="outlined" size="small">Feedback</Button>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><LaunchIcon /></ListItemIcon>
                    <ListItemText
                      primary="Documentation"
                      secondary="Comprehensive technical documentation and API reference."
                    />
                    <Button variant="outlined" size="small">Docs</Button>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="System Information"
                avatar={<Avatar><InfoIcon /></Avatar>}
              />
              <CardContent>
                <Typography paragraph>
                  Current system details for troubleshooting:
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Version</TableCell>
                        <TableCell>v1.0.0-beta.3</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Platform</TableCell>
                        <TableCell>Windows</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Node.js</TableCell>
                        <TableCell>v22.18.0</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Electron</TableCell>
                        <TableCell>v36.8.1</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Video Dialog */}
      <Dialog
        open={videoDialogOpen}
        onClose={() => setVideoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedVideo && (
          <>
            <DialogTitle>{selectedVideo.title}</DialogTitle>
            <DialogContent>
              <Typography paragraph>{selectedVideo.description}</Typography>
              <Alert severity="info">
                Video tutorials are coming soon! This is a placeholder for the actual video player.
              </Alert>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setVideoDialogOpen(false)}>Close</Button>
              <Button variant="contained" startIcon={<LaunchIcon />}>
                Open in Browser
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default HelpSystem;