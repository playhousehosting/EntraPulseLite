// AppIcon component for EntraPulse Lite
import React from 'react';
import { Box } from '@mui/material';
import { getAssetPath } from '../utils/assetUtils';

interface AppIconProps {
  size?: number | string;
  sx?: React.CSSProperties;
}

export const AppIcon: React.FC<AppIconProps> = ({ size = 64, sx = {} }) => {
  // This component displays the app logo from the assets directory
  return (
    <Box
      component="img"
      src={getAssetPath('EntraPulseLiteLogo.png')}
      alt="EntraPulse Lite"
      title="EntraPulse Lite"
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block', // Ensures proper layout
        backgroundColor: 'transparent', // Ensure background is transparent
        ...sx,
      }}
    />
  );
};