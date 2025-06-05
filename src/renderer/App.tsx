// Main App component for EntraPulseLite
import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Switch, FormControlLabel } from '@mui/material';
import { Settings as SettingsIcon, Brightness4, Brightness7 } from '@mui/icons-material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ChatComponent } from './components/ChatComponent';

export const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const handleThemeToggle = () => {
    setDarkMode(!darkMode);
  };

  const handleSettings = () => {
    // TODO: Open settings dialog
    console.log('Settings clicked');
  };

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
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              EntraPulseLite
            </Typography>
            
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
        </AppBar>

        {/* Main Content */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <ChatComponent />
        </Box>
      </Box>
    </ThemeProvider>
  );
};
