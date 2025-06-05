import React, { useEffect, useState } from 'react';
import { Avatar, Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { User } from '../../types';

interface UserProfileAvatarProps {
  user: User | null;
  size?: number;
  showName?: boolean;
  onPhotoLoaded?: (photoUrl: string | null) => void;
}

/**
 * A component for displaying user profile information including avatar and name
 * This is a reusable component for Microsoft account profile display
 */
export const UserProfileAvatar: React.FC<UserProfileAvatarProps> = ({
  user,
  size = 32,
  showName = true,
  onPhotoLoaded
}) => {
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    
    // If the user already has a photo URL, use it directly
    if (user.photoUrl) {
      setPhotoUrl(user.photoUrl);
      if (onPhotoLoaded) onPhotoLoaded(user.photoUrl);
      return;
    }
    
    // Otherwise fetch the photo
    fetchUserPhoto();
    
    // We don't want to include onPhotoLoaded in the dependency array as it would cause
    // unnecessary re-fetches if the parent component re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  const fetchUserPhoto = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log(`UserProfileAvatar: Fetching photo for user ${user.displayName} (${user.id})`);
      
      // Use the email for better reliability in photo lookup
      const lookupId = user.mail || user.userPrincipalName || user.id;
      const url = await window.electronAPI.graph.getUserPhoto(lookupId);
      
      if (url) {
        console.log('UserProfileAvatar: Photo retrieved successfully');
        setPhotoUrl(url);
        if (onPhotoLoaded) onPhotoLoaded(url);
      } else {
        console.log('UserProfileAvatar: No photo available for user');
        setPhotoUrl(null);
        if (onPhotoLoaded) onPhotoLoaded(null);
      }
    } catch (error) {
      console.error('UserProfileAvatar: Failed to load user photo:', error);
      setPhotoUrl(null);
      if (onPhotoLoaded) onPhotoLoaded(null);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Box display="flex" alignItems="center" gap={1}>
      <Tooltip title={(user.jobTitle || user.mail || user.userPrincipalName || '')}>
        <Avatar 
          src={photoUrl || undefined} 
          alt={user.displayName || ''}
          sx={{ 
            width: size, 
            height: size,
            bgcolor: !photoUrl ? 'primary.main' : undefined,
            position: 'relative'
          }}
        >
          {loading ? (
            <CircularProgress size={size * 0.7} />
          ) : !photoUrl && user.displayName ? (
            user.displayName.charAt(0).toUpperCase()
          ) : (
            <PersonIcon />
          )}
        </Avatar>
      </Tooltip>
      
      {showName && (
        <Typography variant="body2" color="textSecondary">
          {user.displayName || user.mail || user.userPrincipalName || 'User'}
        </Typography>
      )}
    </Box>
  );
};
