// Main Chat component for EntraPulseLite
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
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
  Timeline as TraceIcon,
} from '@mui/icons-material';
import { ChatMessage, User, AuthToken } from '../../types';

interface ChatComponentProps {}

export const ChatComponent: React.FC<ChatComponentProps> = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<AuthToken | null>(null);
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check authentication status
      const token = await window.electronAPI.auth.getToken();
      if (token) {
        setAuthToken(token);
        const currentUser = await window.electronAPI.auth.getCurrentUser();
        setUser(currentUser);
      }

      // Check LLM availability
      const available = await window.electronAPI.llm.isAvailable();
      setLlmAvailable(available);

      // Add welcome message
      if (token && available) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: `Welcome to EntraPulseLite! I'm your Microsoft Entra assistant. I can help you query your Microsoft Graph data, understand identity concepts, and analyze your directory structure. What would you like to explore?`,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError('Failed to initialize application');
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const token = await window.electronAPI.auth.login();
      setAuthToken(token);
      const currentUser = await window.electronAPI.auth.getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (error) {
      console.error('Login failed:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.auth.logout();
      setAuthToken(null);
      setUser(null);
      setMessages([]);
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
    setError(null);

    try {
      // Send message to LLM
      const response = await window.electronAPI.llm.chat([...messages, userMessage]);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        metadata: {
          llmProvider: 'ollama', // This would come from config
          model: 'llama2', // This would come from config
        },
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
  };

  if (!authToken) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          gap={3}
        >
          <Typography variant="h3" component="h1" gutterBottom>
            EntraPulseLite
          </Typography>
          <Typography variant="h6" color="textSecondary" textAlign="center">
            Your Microsoft Entra assistant powered by local LLM
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          {!llmAvailable && (
            <Alert severity="warning" sx={{ width: '100%' }}>
              Local LLM is not available. Please make sure Ollama or LM Studio is running.
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<LoginIcon />}
            onClick={handleLogin}
            disabled={isLoading}
            sx={{ minWidth: 200 }}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign in with Microsoft'}
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">EntraPulseLite</Typography>
          {!llmAvailable && (
            <Chip 
              label="LLM Offline" 
              color="warning" 
              size="small" 
            />
          )}
        </Box>
        
        <Box display="flex" alignItems="center" gap={1}>
          {user && (
            <Typography variant="body2" color="textSecondary">
              {user.displayName}
            </Typography>
          )}
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
            <ListItem key={message.id} alignItems="flex-start" sx={{ mb: 2 }}>
              <Avatar sx={{ mr: 2, mt: 0.5 }}>
                {message.role === 'user' ? <PersonIcon /> : <BotIcon />}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="subtitle2">
                        {message.role === 'user' ? 'You' : 'Assistant'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {message.timestamp.toLocaleTimeString()}
                      </Typography>
                      {message.metadata?.graphApiCalls && (
                        <Tooltip title="Graph API calls made">
                          <Chip
                            icon={<TraceIcon />}
                            label={message.metadata.graphApiCalls.length}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body1"
                      component="div"
                      sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {message.content}
                    </Typography>
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
      )}

      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your Microsoft Entra environment..."
            disabled={isLoading || !llmAvailable}
            variant="outlined"
            size="small"
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
      </Box>
    </Box>
  );
};
