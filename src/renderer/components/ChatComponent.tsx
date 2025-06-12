// Main Chat component for EntraPulse Lite
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  CircularProgress,
  Alert,  Divider,
  IconButton,
  Tooltip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Timeline as TraceIcon,
  Shield as ShieldIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Api as ApiIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { getAssetPath } from '../utils/assetUtils';
import { ChatMessage, User, AuthToken, EnhancedLLMResponse, QueryAnalysis } from '../../types';
import { AppIcon } from './AppIcon';
import { UserProfileAvatar } from './UserProfileAvatar';

interface ChatComponentProps {}

export const ChatComponent: React.FC<ChatComponentProps> = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<AuthToken | null>(null);
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);  const [currentPermissions, setCurrentPermissions] = useState<string[]>(['User.Read']);
  const [authMode, setAuthMode] = useState<'client-credentials' | 'interactive' | null>(null);
  const [permissionSource, setPermissionSource] = useState<'actual' | 'configured' | 'default'>('default');
  const [permissionRequests, setPermissionRequests] = useState<string[]>([]);
  const [useRedirectFlow, setUseRedirectFlow] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());

  useEffect(() => {
    initializeApp();
  }, []);
  // We don't need this useEffect anymore as the UserProfileAvatar component handles photo loading
  // But we keep the state for shared use cases
  useEffect(() => {
    // No-op - photo loading handled by UserProfileAvatar component
  }, [user]);// We're now using the UserProfileAvatar component to handle photos
  const handlePhotoLoaded = (photoUrl: string | null) => {
    if (photoUrl && user) {
      setUserPhotoUrl(photoUrl);
      // Update user object to include photoUrl for other components
      setUser(prevUser => prevUser ? { ...prevUser, photoUrl } : null);
    }
  };  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing EntraPulse Lite...');
      
      // Check authentication status first
      const token = await window.electronAPI.auth.getToken();
      if (token) {
        setAuthToken(token);
        console.log('✅ Found existing authentication token');
        
        const currentUser = await window.electronAPI.auth.getCurrentUser();
        setUser(currentUser);
        console.log('✅ Retrieved current user:', currentUser?.displayName);
      }

      // Get authentication information (including permissions)
      const authInfo = await window.electronAPI.auth.getAuthenticationInfo();
      if (authInfo) {
        console.log('📋 Authentication Info received:', authInfo);
        setAuthMode(authInfo.mode);
        
        // Set permissions based on authentication mode and what's available
        if (authInfo.actualPermissions && authInfo.actualPermissions.length > 0) {
          console.log('✅ Using actual permissions from token:', authInfo.actualPermissions);
          setCurrentPermissions(authInfo.actualPermissions);
          setPermissionSource('actual');
        } else if (authInfo.permissions && authInfo.permissions.length > 0) {
          console.log('⚠️ Using configured permissions (no actual permissions found):', authInfo.permissions);
          setCurrentPermissions(authInfo.permissions);
          setPermissionSource('configured');
        } else {
          console.log('⚠️ No permissions found, using default');
          setCurrentPermissions(['User.Read']);
          setPermissionSource('default');
        }
      } else {
        console.log('❌ No authentication info available');
      }

      // Check LLM availability
      const available = await window.electronAPI.llm.isAvailable();
      setLlmAvailable(available);
      console.log('🤖 LLM availability:', available);

      // Add welcome message if authenticated and LLM is available
      if (token && available) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: `Welcome to EntraPulse Lite! I'm your Microsoft Entra assistant. I can help you query your Microsoft Graph data, understand identity concepts, and analyze your directory structure. What would you like to explore?`,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        console.log('✅ Welcome message added');
      }
    } catch (error) {
      console.error('❌ Failed to initialize app:', error);
      setError('Failed to initialize application');
    }
  };const handleLogin = async () => {
    try {
      setIsLoading(true);
      // Pass the redirect flow preference to the login function
      // The actual implementation will need to be added to AuthService
      const token = await window.electronAPI.auth.login(useRedirectFlow);
      setAuthToken(token);
      const currentUser = await window.electronAPI.auth.getCurrentUser();
      setUser(currentUser);
      setError(null);
      
      // Note: No need to explicitly call fetchUserPhoto here, as it will be triggered by the useEffect
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };  const handleLogout = async () => {
    try {
      if (authMode === 'client-credentials') {
        // For client credentials, just clear the UI state
        setAuthToken(null);
        setUser(null);
        setUserPhotoUrl(null);
        setMessages([]);
        setError('Application is configured for automatic authentication with client credentials. Restart the application to re-authenticate.');
      } else {
        // For interactive mode, perform actual logout
        await window.electronAPI.auth.logout();
        setAuthToken(null);
        setUser(null);
        setUserPhotoUrl(null);
        setMessages([]);
        setCurrentPermissions(['User.Read']); // Reset to basic permissions
      }
    } catch (error) {
      console.error('Logout failed:', error);
      setError('Logout failed');
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);    try {
      // Send message to enhanced LLM service
      const enhancedResponse = await window.electronAPI.llm.chat([...messages, userMessage]);
      
      // Handle both enhanced response format and backward compatibility
      let content: string;
      let metadata: any = {
        llmProvider: 'ollama', // This would come from config
        model: 'codellama:7b', // This would come from config
      };

      if (typeof enhancedResponse === 'string') {
        // Fallback for basic string response
        content = enhancedResponse;
      } else if (enhancedResponse && typeof enhancedResponse === 'object' && 'finalResponse' in enhancedResponse) {
        // Enhanced response format
        const typedResponse = enhancedResponse as EnhancedLLMResponse;
        content = typedResponse.finalResponse;
        metadata = {
          ...metadata,
          queryAnalysis: typedResponse.analysis,
          mcpResults: typedResponse.mcpResults,
          traceData: typedResponse.traceData,
        };
      } else {
        // Fallback
        content = 'Sorry, I received an unexpected response format.';
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content,
        timestamp: new Date(),
        metadata,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };  const requestPermissions = async (permissions: string[]) => {
    try {
      setIsLoading(true);
      const token = await window.electronAPI.auth.requestPermissions(permissions);
      if (token) {
        setAuthToken(token);
        setCurrentPermissions(prev => [...new Set([...prev, ...permissions])]);
        setError(null);
        
        // Add a system message about the permission grant
        const systemMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `✅ Permissions granted: ${permissions.join(', ')}. You can now access additional Microsoft Graph resources.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, systemMessage]);
      } else {
        setError('Permission request was denied or failed');
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setError('Failed to request permissions');
    } finally {
      setIsLoading(false);
    }
  };
  const testGraphQuery = async (endpoint: string, requiredPermissions: string[]) => {
    try {
      setIsLoading(true);
      
      // Check if we have the required permissions
      const hasPermissions = requiredPermissions.every(perm => currentPermissions.includes(perm));
      
      if (!hasPermissions) {
        const missingPermissions = requiredPermissions.filter(perm => !currentPermissions.includes(perm));
        setPermissionRequests(missingPermissions);
        
        const systemMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Missing permissions for ${endpoint}: ${missingPermissions.join(', ')}. Would you like to request these permissions?`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, systemMessage]);
        return;
      }      // Make the Graph API call
      const result = await window.electronAPI.graph.query(endpoint, 'GET');
      
      const systemMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Successfully queried ${endpoint}:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, systemMessage]);
      
    } catch (error: any) {
      console.error('Graph query failed:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Failed to query ${endpoint}: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };  const toggleTraceExpansion = (messageId: string) => {
    setExpandedTraces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const checkAuthenticationStatus = async () => {
    try {
      console.log('🔄 Refreshing authentication status and permissions...');
      
      // Get updated authentication information
      const authInfo = await window.electronAPI.auth.getAuthenticationInfo();
      if (authInfo) {
        console.log('Updated Authentication Info:', authInfo);
        setAuthMode(authInfo.mode);
        
        // Set permissions based on authentication mode
        if (authInfo.mode === 'client-credentials') {
          // For client credentials flow, prefer actual permissions from token if available
          if (authInfo.actualPermissions && authInfo.actualPermissions.length > 0) {
            setCurrentPermissions(authInfo.actualPermissions);
            setPermissionSource('actual');
            console.log('Using actual permissions from token:', authInfo.actualPermissions);
          } else {
            setCurrentPermissions(authInfo.permissions);
            setPermissionSource('configured');
            console.log('Using configured permissions:', authInfo.permissions);
          }
        } else {
          // For interactive flow, also use actual permissions from token if available
          if (authInfo.actualPermissions && authInfo.actualPermissions.length > 0) {
            setCurrentPermissions(authInfo.actualPermissions);
            setPermissionSource('actual');
            console.log('Using actual permissions from interactive token:', authInfo.actualPermissions);
          } else {
            setCurrentPermissions(authInfo.permissions);
            setPermissionSource('configured');
            console.log('Using configured permissions for interactive:', authInfo.permissions);
          }
        }
      }

      // Check and update authentication token
      const token = await window.electronAPI.auth.getToken();
      if (token) {
        setAuthToken(token);
        const currentUser = await window.electronAPI.auth.getCurrentUser();
        setUser(currentUser);
        console.log('✅ Authentication status refreshed successfully');
      } else {
        console.log('❌ No valid token found after refresh');
        setAuthToken(null);
        setUser(null);
        setUserPhotoUrl(null);
      }
    } catch (error) {
      console.error('Failed to refresh authentication status:', error);
      throw error; // Re-throw to let the caller handle it
    }
  };

  if (!authToken) {
    return (
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'linear-gradient(145deg, #1a202c 0%, #2d3748 100%)' 
            : 'linear-gradient(145deg, #e6f2ff 0%, #f0f7ff 100%)',
          padding: 2,
        }}
      >        <Card 
          elevation={8}
          sx={{
            maxWidth: 500,
            width: '100%',
            borderRadius: 2,
            overflow: 'visible',
            position: 'relative',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >          {/* App Logo */}          <Box
            sx={{
              position: 'relative',
              marginBottom: 3,
              display: 'flex',
              justifyContent: 'center',
              width: '90%',
            }}          >            <AppIcon 
              size={100} 
              sx={{ 
                margin: '10px 0',
                filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.15))',
              }} 
            />
          </Box>
          
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Welcome to EntraPulse Lite
          </Typography>
          
          <Typography variant="body1" align="center" color="textSecondary" paragraph>
            Sign in with your Microsoft Entra ID account to access intelligent insights and analysis of your identity environment.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          {!llmAvailable && (
            <Alert severity="warning" sx={{ width: '100%', mt: 1 }}>
              Local LLM is not available. Please make sure Ollama or LM Studio is running.
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<LoginIcon />}
            onClick={handleLogin}
            disabled={isLoading}
            sx={{ 
              mt: 2,
              py: 1.5,
              borderRadius: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign in with Microsoft'}
          </Button>
          
          <Box sx={{ mt: 2, width: '100%' }}>
            <FormControlLabel
              control={
                <Checkbox 
                  size="small" 
                  checked={useRedirectFlow}
                  onChange={(e) => setUseRedirectFlow(e.target.checked)}
                />
              }
              label="Use redirect flow (mobile-friendly)"
            />
          </Box>
            <Typography variant="caption" align="center" sx={{ mt: 1 }}>
            By signing in, you agree to our terms of service and privacy policy.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 1 }}>
            <ShieldIcon sx={{ fontSize: 14, color: 'primary.main' }} />
            <Typography variant="caption" align="center" sx={{ fontWeight: 'medium' }}>
              Secured by Microsoft Entra ID
            </Typography>
          </Box>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >          <Box display="flex" alignItems="center" gap={2}>          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AppIcon 
              size={28} 
              sx={{ 
                backgroundColor: 'transparent',
                padding: 0
              }} 
            />
            <Typography variant="h6">EntraPulse Lite</Typography>
          </Box>          {!llmAvailable && (
            <Chip 
              label="Local LLM Offline" 
              color="warning" 
              size="small" 
            />
          )}
        </Box>
          <Box display="flex" alignItems="center" gap={1}>          {user && <UserProfileAvatar user={user} />}
          <Tooltip title="Settings">
            <IconButton>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Sign out">
            <IconButton onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <List>
          {messages.map((message) => (
            <ListItem key={message.id} alignItems="flex-start" sx={{ mb: 2 }}>              <Box sx={{ mr: 2, mt: 0.5 }}>
                {message.role === 'user' ? 
                  (user ? 
                    <UserProfileAvatar user={user} size={40} showName={false} /> : 
                    <Avatar><PersonIcon /></Avatar>
                  ) : 
                  <Avatar sx={{ bgcolor: 'secondary.main' }}><BotIcon /></Avatar>
                }
              </Box>
              <Box sx={{ flex: 1 }}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="subtitle2">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>                      {message.metadata?.graphApiCalls && (
                        <Tooltip title="Graph API calls made">
                          <Chip
                            icon={<TraceIcon />}
                            label={message.metadata.graphApiCalls.length}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                      {message.metadata?.traceData && (
                        <Tooltip title="Show MCP trace data">
                          <Chip
                            icon={<ApiIcon />}
                            label="MCP Trace"
                            size="small"
                            variant="outlined"
                            onClick={() => toggleTraceExpansion(message.id)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </Tooltip>
                      )}
                      {message.metadata?.queryAnalysis && (
                        <Tooltip title="Query analysis">
                          <Chip
                            icon={<PsychologyIcon />}
                            label={`${Math.round(message.metadata.queryAnalysis.confidence * 100)}%`}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        </Tooltip>
                      )}
                    </Box>
                  }                  secondary={
                    <>
                      <Typography
                        variant="body1"
                        component="div"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {message.content}
                      </Typography>
                      
                      {/* Enhanced trace data display */}
                      {message.metadata?.traceData && expandedTraces.has(message.id) && (
                        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <ApiIcon fontSize="small" />
                            <Typography variant="subtitle2">MCP Integration Trace</Typography>
                            <IconButton 
                              size="small" 
                              onClick={() => toggleTraceExpansion(message.id)}
                            >
                              <ExpandLessIcon />
                            </IconButton>
                          </Box>
                          
                          {/* Query Analysis */}
                          {message.metadata.queryAnalysis && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" color="primary" gutterBottom>
                                Query Analysis (Confidence: {Math.round(message.metadata.queryAnalysis.confidence * 100)}%)
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                {message.metadata.queryAnalysis.reasoning}
                              </Typography>
                              <Box display="flex" gap={1} flexWrap="wrap">
                                {message.metadata.queryAnalysis.needsFetchMcp && (
                                  <Chip label="Fetch MCP" size="small" color="info" />
                                )}
                                {message.metadata.queryAnalysis.needsLokkaMcp && (
                                  <Chip label="Lokka MCP" size="small" color="success" />
                                )}
                              </Box>
                            </Box>
                          )}
                          
                          {/* Execution Steps */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="primary" gutterBottom>
                              Execution Steps
                            </Typography>
                            {message.metadata.traceData.steps.map((step, index) => (
                              <Typography key={index} variant="body2" sx={{ fontSize: '0.85rem', mb: 0.5 }}>
                                {index + 1}. {step}
                              </Typography>
                            ))}
                          </Box>
                          
                          {/* Timing Information */}
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="caption" color="primary" gutterBottom>
                              Performance
                            </Typography>
                            <Box display="flex" gap={2} flexWrap="wrap">
                              {Object.entries(message.metadata.traceData.timing).map(([key, value]) => (
                                <Chip 
                                  key={key} 
                                  label={`${key}: ${value}ms`} 
                                  size="small" 
                                  variant="outlined" 
                                />
                              ))}
                            </Box>
                          </Box>
                          
                          {/* MCP Results */}
                          {message.metadata.mcpResults && (
                            <Box>
                              <Typography variant="caption" color="primary" gutterBottom>
                                MCP Results
                              </Typography>
                              {message.metadata.mcpResults.fetchResult && (
                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                    Fetch MCP: {JSON.stringify(message.metadata.mcpResults.fetchResult, null, 2).substring(0, 200)}...
                                  </Typography>
                                </Box>
                              )}
                              {message.metadata.mcpResults.lokkaResult && (
                                <Box>
                                  <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                                    Lokka MCP: {JSON.stringify(message.metadata.mcpResults.lokkaResult, null, 2).substring(0, 200)}...
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          )}
                          
                          {/* Errors */}
                          {message.metadata.traceData.errors && message.metadata.traceData.errors.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" color="error" gutterBottom>
                                Errors
                              </Typography>
                              {message.metadata.traceData.errors.map((error, index) => (
                                <Alert key={index} severity="warning" sx={{ mt: 1 }}>
                                  {error}
                                </Alert>
                              ))}
                            </Box>
                          )}
                        </Box>
                      )}
                    </>
                  }
                />
              </Box>
            </ListItem>
          ))}
          {isLoading && (
            <ListItem>
              <Avatar sx={{ mr: 2 }}>
                <BotIcon />
              </Avatar>
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="textSecondary">
                  Assistant is thinking...
                </Typography>
              </Box>
            </ListItem>
          )}
        </List>
      </Box>

      {error && (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      )}      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={!llmAvailable 
              ? "LLM is offline - configure a local LLM service to enable chat..." 
              : "Ask about your Microsoft Entra environment..."
            }
            disabled={isLoading}
            variant="outlined"
            size="small"
            helperText={!llmAvailable ? "Configure Ollama, LM Studio, or other local LLM to enable chat functionality" : ""}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || !llmAvailable}
            sx={{ minWidth: 60 }}
          >
            <SendIcon />
          </Button>
        </Box>
      </Box>{/* Permissions Status Panel */}
      <Box sx={{ p: 2, backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        {/* Authentication Mode Display */}
        {authMode && (
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Typography variant="subtitle2">Authentication Mode:</Typography>
            <Chip 
              label={authMode === 'client-credentials' ? 'Application (Client Credentials)' : 'Interactive (User Login)'}
              size="small"
              color={authMode === 'client-credentials' ? 'success' : 'info'}
              variant="filled"
            />
          </Box>
        )}
          <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="subtitle2" gutterBottom>Current Permissions:</Typography>
          {permissionSource === 'actual' && (
            <Chip 
              label="From Token" 
              size="small" 
              color="success" 
              variant="outlined"
            />
          )}
          {permissionSource === 'configured' && (
            <Chip 
              label="Configured" 
              size="small" 
              color="warning" 
              variant="outlined"
            />
          )}
        </Box>
        <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
          {currentPermissions.map((permission) => (
            <Chip 
              key={permission}
              label={permission}
              size="small"
              color="primary"
              variant="outlined"
            />
          ))}
        </Box>
        
        {/* Quick Test Buttons */}
        <Typography variant="subtitle2" gutterBottom>Quick Tests:</Typography>
        <Box display="flex" flexWrap="wrap" gap={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => testGraphQuery('/me', ['User.Read'])}
            disabled={isLoading}
          >
            Get My Profile
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => testGraphQuery('/users', ['User.ReadBasic.All'])}
            disabled={isLoading}
          >
            List Users
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => testGraphQuery('/groups', ['Group.Read.All'])}
            disabled={isLoading}
          >
            List Groups
          </Button>          <Button
            size="small"
            variant="outlined"
            onClick={() => testGraphQuery('/applications', ['Application.Read.All'])}
            disabled={isLoading}
          >
            List Applications
          </Button>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={async () => {
              try {
                setIsLoading(true);
                console.log('🔄 Clearing token cache and forcing reauthentication...');
                const result = await window.electronAPI.auth.forceReauthentication();
                if (result) {
                  console.log('✅ Reauthentication successful, refreshing permissions...');
                  // Refresh the authentication info to get new permissions
                  await checkAuthenticationStatus();
                }
              } catch (error) {
                console.error('Failed to refresh permissions:', error);
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
          >
            Refresh Permissions
          </Button>
        </Box>
        
        {/* Permission Request Buttons */}
        {permissionRequests.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" gutterBottom>Grant Required Permissions:</Typography>
            <Button
              size="small"
              variant="contained"
              onClick={() => requestPermissions(permissionRequests)}
              disabled={isLoading}
            >
              Grant {permissionRequests.join(', ')}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};
