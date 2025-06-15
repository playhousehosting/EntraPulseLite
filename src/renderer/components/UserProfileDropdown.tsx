// UserProfileDropdown.tsx
// User profile dropdown component for displaying logged-in user details

import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  MenuList,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Box,
  Chip,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { User, AuthToken } from '../../types';
import { UserProfileAvatar } from './UserProfileAvatar';

interface UserProfileDropdownProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  user: User | null;
  authToken: AuthToken | null;
}

interface IDTokenClaims {
  sub?: string;
  aud?: string;
  iss?: string;
  iat?: number;
  exp?: number;
  name?: string;
  preferred_username?: string;
  email?: string;
  tid?: string;
  oid?: string;
  roles?: string[];
  groups?: string[];
  upn?: string;
  unique_name?: string;
  family_name?: string;
  given_name?: string;
  ipaddr?: string;
  onprem_sid?: string;
  ver?: string;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({
  anchorEl,
  open,
  onClose,
  user,
  authToken,
}) => {
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [idTokenClaims, setIdTokenClaims] = useState<IDTokenClaims | null>(null);
  useEffect(() => {
    if (authToken?.idToken) {
      // Use server-side ID token parsing for better security
      fetchIdTokenClaims();
    }
  }, [authToken]);

  const fetchIdTokenClaims = async () => {
    try {
      const claims = await window.electronAPI.auth.getIdTokenClaims();
      setIdTokenClaims(claims);
      console.log('Fetched ID token claims:', claims);
    } catch (error) {
      console.error('Failed to fetch ID token claims:', error);
      setIdTokenClaims(null);
    }
  };

  const parseIdToken = (idToken: string) => {
    // This method is now deprecated in favor of server-side parsing
    // Keeping for fallback compatibility
    try {
      // ID tokens are JWT format: header.payload.signature
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        console.warn('Invalid ID token format');
        return;
      }

      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
      const claims = JSON.parse(decodedPayload) as IDTokenClaims;
      
      setIdTokenClaims(claims);
      console.log('Parsed ID token claims (fallback):', claims);
    } catch (error) {
      console.error('Failed to parse ID token:', error);
      setIdTokenClaims(null);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard:', text);
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const handleDetailsClick = () => {
    setDetailsDialogOpen(true);
    onClose(); // Close the dropdown
  };

  const userDisplayName = user?.displayName || idTokenClaims?.name || 'User';
  const userEmail = user?.mail || user?.userPrincipalName || idTokenClaims?.preferred_username || idTokenClaims?.email || idTokenClaims?.upn;
  const jobTitle = user?.jobTitle;
  const department = user?.department;

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            minWidth: 320,
            maxWidth: 400,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2 }}>
          {/* User Avatar and Basic Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {user ? (
              <UserProfileAvatar user={user} size={56} showName={false} />
            ) : (
              <Avatar sx={{ width: 56, height: 56 }}>
                <PersonIcon />
              </Avatar>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {userDisplayName}
              </Typography>
              {userEmail && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                    {userEmail}
                  </Typography>
                  <Tooltip title="Copy email">
                    <IconButton 
                      size="small" 
                      onClick={() => handleCopyToClipboard(userEmail)}
                      sx={{ ml: 0.5 }}
                    >
                      <CopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              {jobTitle && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <BadgeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {jobTitle}
                  </Typography>
                </Box>
              )}
              {department && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {department}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* Quick Info Chips */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {idTokenClaims?.tid && (
              <Chip
                label={`Tenant: ${idTokenClaims.tid.substring(0, 8)}...`}
                size="small"
                variant="outlined"
                icon={<SecurityIcon />}
              />
            )}
            {authToken?.scopes && (
              <Chip
                label={`${authToken.scopes.length} Permissions`}
                size="small"
                variant="outlined"
                icon={<SecurityIcon />}
              />
            )}
          </Box>
        </Box>

        <Divider />

        <MenuList dense>
          <MenuItem onClick={handleDetailsClick}>
            <ListItemIcon>
              <InfoIcon />
            </ListItemIcon>
            <ListItemText>
              <Typography variant="body2">View Full Details</Typography>
            </ListItemText>
          </MenuItem>
        </MenuList>
      </Menu>

      {/* Detailed Information Dialog */}
      <Dialog 
        open={detailsDialogOpen} 
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { maxHeight: '80vh' }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">User Account Details</Typography>
            <IconButton onClick={() => setDetailsDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {/* Graph API User Profile */}
          {user && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon /> Microsoft Graph Profile
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, '& > *': { py: 0.5 } }}>
                <Typography variant="body2" color="text.secondary">Display Name:</Typography>
                <Typography variant="body2">{user.displayName}</Typography>
                
                <Typography variant="body2" color="text.secondary">Email:</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{user.mail}</Typography>
                
                <Typography variant="body2" color="text.secondary">User Principal Name:</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{user.userPrincipalName}</Typography>
                
                <Typography variant="body2" color="text.secondary">Object ID:</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{user.id}</Typography>
                
                {user.jobTitle && (
                  <>
                    <Typography variant="body2" color="text.secondary">Job Title:</Typography>
                    <Typography variant="body2">{user.jobTitle}</Typography>
                  </>
                )}
                
                {user.department && (
                  <>
                    <Typography variant="body2" color="text.secondary">Department:</Typography>
                    <Typography variant="body2">{user.department}</Typography>
                  </>
                )}
              </Box>
            </Paper>
          )}

          {/* ID Token Claims */}
          {idTokenClaims && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon /> ID Token Claims
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, '& > *': { py: 0.5 } }}>
                {idTokenClaims.aud && (
                  <>
                    <Typography variant="body2" color="text.secondary">Audience:</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{idTokenClaims.aud}</Typography>
                  </>
                )}
                
                {idTokenClaims.iss && (
                  <>
                    <Typography variant="body2" color="text.secondary">Issuer:</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{idTokenClaims.iss}</Typography>
                  </>
                )}
                
                {idTokenClaims.tid && (
                  <>
                    <Typography variant="body2" color="text.secondary">Tenant ID:</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{idTokenClaims.tid}</Typography>
                  </>
                )}
                
                {idTokenClaims.oid && (
                  <>
                    <Typography variant="body2" color="text.secondary">Object ID:</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{idTokenClaims.oid}</Typography>
                  </>
                )}
                
                {idTokenClaims.iat && (
                  <>
                    <Typography variant="body2" color="text.secondary">Issued At:</Typography>
                    <Typography variant="body2">{formatDate(idTokenClaims.iat)}</Typography>
                  </>
                )}
                
                {idTokenClaims.exp && (
                  <>
                    <Typography variant="body2" color="text.secondary">Expires At:</Typography>
                    <Typography variant="body2">{formatDate(idTokenClaims.exp)}</Typography>
                  </>
                )}
                
                {idTokenClaims.ipaddr && (
                  <>
                    <Typography variant="body2" color="text.secondary">IP Address:</Typography>
                    <Typography variant="body2">{idTokenClaims.ipaddr}</Typography>
                  </>
                )}
                
                {idTokenClaims.ver && (
                  <>
                    <Typography variant="body2" color="text.secondary">Token Version:</Typography>
                    <Typography variant="body2">{idTokenClaims.ver}</Typography>
                  </>
                )}
              </Box>
            </Paper>
          )}

          {/* Authentication Token Info */}
          {authToken && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon /> Authentication Info
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1, '& > *': { py: 0.5 } }}>
                <Typography variant="body2" color="text.secondary">Expires On:</Typography>
                <Typography variant="body2">{authToken.expiresOn.toLocaleString()}</Typography>
                
                <Typography variant="body2" color="text.secondary">Scopes:</Typography>
                <Box>
                  {authToken.scopes.map((scope, index) => (
                    <Chip 
                      key={index} 
                      label={scope} 
                      size="small" 
                      variant="outlined" 
                      sx={{ mr: 0.5, mb: 0.5 }} 
                    />
                  ))}
                </Box>
                
                {authToken.clientId && (
                  <>
                    <Typography variant="body2" color="text.secondary">Client ID:</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{authToken.clientId}</Typography>
                  </>
                )}
                
                {authToken.tenantId && (
                  <>
                    <Typography variant="body2" color="text.secondary">Tenant ID:</Typography>
                    <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{authToken.tenantId}</Typography>
                  </>
                )}
              </Box>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
