// ChatHistoryDialog.tsx
// Dialog for viewing and managing chat history

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Alert
} from '@mui/material';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Chat as ChatIcon,
  Schedule as TimeIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { ChatSession } from '../../types';

interface ChatHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  onLoadSession: (session: ChatSession) => void;
  currentSessionId?: string;
}

export const ChatHistoryDialog: React.FC<ChatHistoryDialogProps> = ({
  open,
  onClose,
  onLoadSession,
  currentSessionId
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ element: HTMLElement; sessionId: string } | null>(null);

  useEffect(() => {
    if (open) {
      loadChatHistory();
    }
  }, [open]);

  useEffect(() => {
    // Filter sessions based on search query
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = sessions.filter(session => 
        session.title.toLowerCase().includes(query) ||
        session.summary?.toLowerCase().includes(query) ||
        session.messages.some(msg => 
          msg.content.toLowerCase().includes(query) && msg.role === 'user'
        )
      );
      setFilteredSessions(filtered);
    }
  }, [searchQuery, sessions]);

  const loadChatHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load chat sessions from storage
      const chatHistory = localStorage.getItem('dynamicEndpoint_chatHistory');
      if (chatHistory) {
        const parsed = JSON.parse(chatHistory);
        const sessions = parsed.map((session: any) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        
        // Sort by most recent first
        sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        setSessions(sessions);
      } else {
        setSessions([]);
      }
    } catch (err) {
      setError(`Failed to load chat history: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      
      // Save updated history to localStorage
      localStorage.setItem('dynamicEndpoint_chatHistory', JSON.stringify(updatedSessions));
      
      setMenuAnchor(null);
    } catch (err) {
      setError(`Failed to delete session: ${err}`);
    }
  };

  const handleLoadSession = (session: ChatSession) => {
    onLoadSession(session);
    onClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, sessionId: string) => {
    setMenuAnchor({ element: event.currentTarget, sessionId });
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getSessionPreview = (session: ChatSession) => {
    const userMessages = session.messages.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'No messages';
    
    const firstMessage = userMessages[0].content;
    return firstMessage.length > 100 ? 
      firstMessage.substring(0, 100) + '...' : 
      firstMessage;
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon />
              <Typography variant="h6">Chat History</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton onClick={loadChatHistory} disabled={loading}>
                <RefreshIcon />
              </IconButton>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <Typography variant="body2" color="textSecondary">
                Loading chat history...
              </Typography>
            </Box>
          ) : filteredSessions.length === 0 ? (
            <Box textAlign="center" py={4}>
              <ChatIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {searchQuery ? 'No matches found' : 'No chat history'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Start a conversation to see your chat history here'
                }
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredSessions.map((session, index) => (
                <React.Fragment key={session.id}>
                  <ListItem
                    button
                    onClick={() => handleLoadSession(session)}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: session.id === currentSessionId ? 'action.selected' : 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  >
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      <ChatIcon />
                    </Avatar>
                    
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1" noWrap>
                            {session.title}
                          </Typography>
                          {session.id === currentSessionId && (
                            <Chip label="Active" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary" noWrap>
                            {getSessionPreview(session)}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                            <TimeIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" color="textSecondary">
                              {formatRelativeTime(session.updatedAt)}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              • {session.messages.filter(m => m.role === 'user').length} messages
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, session.id)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < filteredSessions.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor?.element}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem 
          onClick={() => {
            if (menuAnchor) {
              handleDeleteSession(menuAnchor.sessionId);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} />
          Delete Chat
        </MenuItem>
      </Menu>
    </>
  );
};