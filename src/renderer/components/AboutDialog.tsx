import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Link,
  Box,
  Divider
} from '@mui/material';
import ShieldIcon from '@mui/icons-material/Shield';
import GitHubIcon from '@mui/icons-material/GitHub';
import InfoIcon from '@mui/icons-material/Info';
import SecurityIcon from '@mui/icons-material/Security';
import { VERSION } from '../../shared/version';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({
  open,
  onClose
}) => {
  const version = VERSION; // Using centralized version from shared/version.ts// Use dialog instead of opening external file
  const handleOpenPrivacyPolicy = () => {
    window.alert('Privacy Policy: EntraPulse Lite processes data only with your permissions. No data is stored externally or in the cloud. All processing happens locally when using local LLMs, and the app only accesses Entra data and services you have permission to view through Microsoft Graph.');
  };

  const handleOpenGitHub = () => {
    // Just show a message for now since we need to configure the IPC properly
    window.alert('GitHub Repository: https://github.com/darrenjrobinson/EntraPulseLite');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <ShieldIcon color="primary" />
          <Typography variant="h6">About EntraPulse Lite</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="body1">
            EntraPulse Lite is a freemium desktop application that provides natural language querying of Microsoft Graph APIs through local LLM integration.
          </Typography>
          
          <Box>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Version: {version}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A lightweight derivative of the EntraPulse project.
            </Typography>
          </Box>
          
          <Divider />
          
          <Box>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <SecurityIcon fontSize="small" color="primary" />
              Privacy Information
            </Typography>
            <Typography variant="body2" paragraph>
              EntraPulse Lite processes data with the permissions you authorize. All processing happens locally when using local LLMs.
            </Typography>
            <Typography variant="body2">
              • No data is stored externally
              <br />
              • Authentication tokens are stored securely locally
              <br />
              • Your queries and results remain private
              <br />
              • Only accesses Entra data and services you have permission to view
            </Typography>
            <Button 
              sx={{ mt: 1 }}
              size="small" 
              onClick={handleOpenPrivacyPolicy}
              startIcon={<InfoIcon />}
            >
              View Privacy Policy
            </Button>
          </Box>
          
          <Divider />
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            <Button
              variant="outlined"
              startIcon={<GitHubIcon />}
              onClick={handleOpenGitHub}
              size="small"
            >
              GitHub Repository
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
