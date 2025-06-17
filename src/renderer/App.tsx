// Main App component for EntraPulse Lite
import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Switch, FormControlLabel, Tooltip } from '@mui/material';
import { Settings as SettingsIcon, Brightness4, Brightness7, Info as InfoIcon } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ChatComponent } from './components/ChatComponent';
import { AppIcon } from './components/AppIcon';
import { SettingsDialog } from './components/SettingsDialog';
import { EnhancedSettingsDialog } from './components/EnhancedSettingsDialog';
import { AboutDialog } from './components/AboutDialog';
import { LLMConfig } from '../types';
import { VERSION } from '../shared/version';
import { LLMStatusProvider, useLLMStatus } from './context/LLMStatusContext';

// Inner App component that uses LLM status context
const AppContent: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'openai', // Default to cloud for better initial experience
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
    apiKey: '',
    preferLocal: false
  });

  // Access LLM status context
  const { forceCheck } = useLLMStatus();

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
  });  useEffect(() => {
    // Check authentication status on app load
    checkAuthStatus();
    // Load saved LLM configuration
    loadLLMConfig();    // Listen for authentication configuration availability
    const handleConfigurationAvailable = (event: any, data: any) => {
      console.log('🔄 [App.tsx] Configuration available - reloading LLM config and forcing status check');
      // Reload configuration now that authentication is verified
      loadLLMConfig();
      // Also update authentication status
      checkAuthStatus();
      // Force LLM status check through the context
      forceCheck();
    };

    // Add the IPC listener using the exposed API
    const electronAPI = window.electronAPI as any;
    if (electronAPI?.on) {
      electronAPI.on('auth:configurationAvailable', handleConfigurationAvailable);
    }

    // Cleanup function to remove the listener
    return () => {
      if (electronAPI?.removeListener) {
        electronAPI.removeListener('auth:configurationAvailable', handleConfigurationAvailable);      }
    };
  }, [forceCheck]);

  const checkAuthStatus = async () => {
    try {
      const token = await window.electronAPI?.auth?.getToken();
      setIsAuthenticated(!!token);
    } catch (error) {
      console.log('Not authenticated:', error);
      setIsAuthenticated(false);
    }
  };  const loadLLMConfig = async () => {
    try {
      const savedConfig = await window.electronAPI?.config?.getLLMConfig();
      if (savedConfig) {
        setLlmConfig(savedConfig);
        console.log('🔍 [App.tsx] LLM config updated:', savedConfig?.provider);
      }    } catch (error) {
      console.log('🔍 [App.tsx] No LLM config available:', error);
    }
  };

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleSettings = () => {
    setSettingsOpen(true);
  };

  const handleAboutOpen = () => {
    setAboutOpen(true);
  };

  const handleAboutClose = () => {
    setAboutOpen(false);
  };

  const handleSaveSettings = async (newConfig: LLMConfig) => {
    try {
      console.log('[App] handleSaveSettings - Received config:', {
        provider: newConfig.provider,
        temperature: newConfig.temperature,
        maxTokens: newConfig.maxTokens,
        preferLocal: newConfig.preferLocal,
        model: newConfig.model
      });
      
      await window.electronAPI?.config?.saveLLMConfig(newConfig);
      setLlmConfig(newConfig);
      
      console.log('[App] handleSaveSettings - Configuration saved successfully');
      console.log('[App] handleSaveSettings - Updated state with:', {
        provider: newConfig.provider,
        temperature: newConfig.temperature,
        maxTokens: newConfig.maxTokens,
        preferLocal: newConfig.preferLocal,
        model: newConfig.model
      });
    } catch (error) {
      console.error('Failed to save LLM configuration:', error);
    }  };
  
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        bgcolor: 'background.default' 
      }}>
        {/* App Bar */}
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AppIcon size={32} sx={{ marginRight: 1 }} />
              <Box>
                <Typography variant="h6" component="div">
                  EntraPulse Lite
                </Typography>
                <Tooltip title="Application Version">
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      opacity: 0.7, 
                      fontSize: '0.6rem',
                      lineHeight: 1,
                      display: 'block',
                      marginTop: '-3px'
                    }}
                  >
                    v{VERSION}
                  </Typography>
                </Tooltip>
              </Box>
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
            
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              onClick={() => setAboutOpen(true)}
              sx={{ ml: 1 }}
            >
              <InfoIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <ChatComponent />
        </Box>

        {/* Settings Dialog */}
        <EnhancedSettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          currentConfig={llmConfig}
          onSave={handleSaveSettings}
        />

        {/* About Dialog */}
        <AboutDialog
          open={aboutOpen}
          onClose={handleAboutClose}
        />
      </Box>
    </ThemeProvider>
  );
};

// Main App component that provides LLM status context
export const App: React.FC = () => {
  return (
    <LLMStatusProvider pollingInterval={15000}> {/* Poll every 15 seconds to prevent overload */}
      <AppContent />
    </LLMStatusProvider>
  );
};
