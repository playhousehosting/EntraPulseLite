// Main App component for EntraPulse Lite
import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Switch, FormControlLabel } from '@mui/material';
import { Settings as SettingsIcon, Brightness4, Brightness7 } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ChatComponent } from './components/ChatComponent';
import { AppIcon } from './components/AppIcon';
import { SettingsDialog } from './components/SettingsDialog';
import { LLMConfig } from '../types';

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'openai', // Default to cloud for better initial experience
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    apiKey: '',
    preferLocal: false
  });

  // Create dynamic theme based on mode
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#0078d4',
      },
      secondary: {
        main: '#00bcf2',
      },
      background: {
        default: darkMode ? '#1e1e1e' : '#ffffff',
        paper: darkMode ? '#2d2d30' : '#f5f5f5',
      },
    },
    typography: {
      fontFamily: 'Segoe UI, system-ui, sans-serif',
    },
  });
  useEffect(() => {
    // Check authentication status on app load
    checkAuthStatus();
    // Load saved LLM configuration
    loadLLMConfig();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await window.electronAPI?.auth?.getToken();
      setIsAuthenticated(!!token);
    } catch (error) {
      console.log('Not authenticated:', error);
      setIsAuthenticated(false);
    }
  };

  const loadLLMConfig = async () => {
    try {
      const savedConfig = await window.electronAPI?.config?.getLLMConfig();
      if (savedConfig) {
        setLlmConfig(savedConfig);
      }
    } catch (error) {
      console.log('No saved LLM config, using defaults:', error);
    }
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  const handleSaveSettings = async (newConfig: LLMConfig) => {
    try {
      await window.electronAPI?.config?.saveLLMConfig(newConfig);
      setLlmConfig(newConfig);
      console.log('LLM configuration saved:', newConfig.provider);
    } catch (error) {
      console.error('Failed to save LLM configuration:', error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        bgcolor: 'background.default' 
      }}>        {/* App Bar */}        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AppIcon size={32} sx={{ marginRight: 1 }} />
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                EntraPulse Lite
              </Typography>
            </Box>
            
            <Box sx={{ flexGrow: 1 }} />
            
            <FormControlLabel
              control={
                <Switch 
                  checked={darkMode} 
                  onChange={handleThemeToggle}
                  icon={<Brightness7 />}
                  checkedIcon={<Brightness4 />}
                />
              }
              label=""
              sx={{ mr: 1 }}
            />
            
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              onClick={handleSettings}
            >
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>        {/* Main Content */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <ChatComponent />
        </Box>

        {/* Settings Dialog */}
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          currentConfig={llmConfig}
          onSave={handleSaveSettings}
        />
      </Box>
    </ThemeProvider>
  );
};
