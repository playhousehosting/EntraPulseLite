import React, { useEffect, useState, useRef } from 'react';
import { Avatar, Box, CircularProgress, Tooltip, Typography } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { User } from '../../types';

interface UserProfileAvatarProps {
  user: User | null;
  size?: number;
  showName?: boolean;
  onPhotoLoaded?: (photoUrl: string | null) => void;
}

// Session-level cache to avoid repeated fetches within the same session
const sessionPhotoCache = new Map<string, { photoUrl: string | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for session cache

// Utility functions for session cache management
export const clearSessionPhotoCache = () => {
  sessionPhotoCache.clear();
  console.log('[UserProfileAvatar] Session cache cleared');
};

export const clearUserSessionCache = (userKey: string) => {
  sessionPhotoCache.delete(userKey);
  console.log(`[UserProfileAvatar] Session cache cleared for user: ${userKey}`);
};

export const getSessionCacheStats = () => {
  const now = Date.now();
  return {
    size: sessionPhotoCache.size,
    entries: Array.from(sessionPhotoCache.entries()).map(([userKey, cached]) => ({
      userKey,
      hasPhoto: cached.photoUrl !== null,
      age: now - cached.timestamp
    }))
  };
};

/**
 * A component for displaying user profile information including avatar and name
 * This is a reusable component for Microsoft account profile display with session-level caching
 */
export const UserProfileAvatar: React.FC<UserProfileAvatarProps> = ({
  user,
  size = 32,
  showName = true,
  onPhotoLoaded
}) => {
  const [loading, setLoading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get cache key for the user
  const getCacheKey = (user: User): string => {
    return user.mail || user.userPrincipalName || user.id;
  };

  // Check session cache
  const getFromSessionCache = (cacheKey: string): string | null | undefined => {
    const cached = sessionPhotoCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`[UserProfileAvatar] Using session cache for: ${cacheKey}`);
      return cached.photoUrl;
    }
    
    // Remove expired cache
    if (cached) {
      sessionPhotoCache.delete(cacheKey);
    }
    
    return undefined; // Not in cache or expired
  };

  // Store in session cache
  const storeInSessionCache = (cacheKey: string, photoUrl: string | null): void => {
    sessionPhotoCache.set(cacheKey, { photoUrl, timestamp: Date.now() });
    console.log(`[UserProfileAvatar] Cached result for: ${cacheKey} (${photoUrl ? 'with photo' : 'no photo'})`);
  };  useEffect(() => {
    // Cancel any ongoing fetch when user changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!user) {
      setPhotoUrl(null);
      return;
    }
    
    const cacheKey = getCacheKey(user);
    
    // Priority 1: Check if the user object already has a photo URL
    if (user.photoUrl) {
      console.log(`[UserProfileAvatar] Using photoUrl from user object for: ${user.displayName}`);
      setPhotoUrl(user.photoUrl);
      if (onPhotoLoaded) onPhotoLoaded(user.photoUrl);
      return;
    }
    
    // Priority 2: Check session cache
    const cachedPhoto = getFromSessionCache(cacheKey);
    if (cachedPhoto !== undefined) {
      setPhotoUrl(cachedPhoto);
      if (onPhotoLoaded) onPhotoLoaded(cachedPhoto);
      return;
    }
    
    // Priority 3: Fetch from server
    console.log(`[UserProfileAvatar] Cache miss, fetching photo for: ${user.displayName} (${cacheKey})`);
    fetchUserPhoto();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    
    // We don't want to include onPhotoLoaded in the dependency array as it would cause
    // unnecessary re-fetches if the parent component re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserPhoto = async () => {
    if (!user) return;
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const cacheKey = getCacheKey(user);
    
    try {
      setLoading(true);
      console.log(`[UserProfileAvatar] Fetching photo for user ${user.displayName} (${user.id})`);
      
      // Use the email for better reliability in photo lookup
      const lookupId = user.mail || user.userPrincipalName || user.id;
      const url = await window.electronAPI.graph.getUserPhoto(lookupId);
      
      // Check if this request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log(`[UserProfileAvatar] Fetch aborted for: ${cacheKey}`);
        return;
      }
      
      if (url) {
        console.log('[UserProfileAvatar] Photo retrieved successfully');
        setPhotoUrl(url);
        storeInSessionCache(cacheKey, url);
        if (onPhotoLoaded) onPhotoLoaded(url);
      } else {
        console.log('[UserProfileAvatar] No photo available for user');
        setPhotoUrl(null);
        storeInSessionCache(cacheKey, null);
        if (onPhotoLoaded) onPhotoLoaded(null);
      }
    } catch (error) {
      // Check if this was an abort, which is normal
      if (abortControllerRef.current?.signal.aborted) {
        console.log(`[UserProfileAvatar] Fetch aborted for: ${cacheKey}`);
        return;
      }
      
      console.error('[UserProfileAvatar] Failed to load user photo:', error);
      setPhotoUrl(null);
      storeInSessionCache(cacheKey, null);
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
