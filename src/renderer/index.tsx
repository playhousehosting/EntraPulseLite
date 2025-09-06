// Main renderer entry point for EntraPulse Lite
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { App } from './App';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'dark', // Start with dark theme
    primary: {
      main: '#0078d4', // Microsoft blue
    },
    secondary: {
      main: '#00bcf2', // Microsoft light blue
    },
    background: {
      default: '#1e1e1e',
      paper: '#2d2d30',
    },
  },
  typography: {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          '&:hover': {
            backgroundColor: '#106ebe',
          },
        },
      },
    },
  },
});

// Initialize the React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
  
  // Hide loading overlay once React app has mounted
  setTimeout(() => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }, 100);
} else {
  console.error('Root element not found');
}
