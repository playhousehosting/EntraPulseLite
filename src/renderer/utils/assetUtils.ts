/**
 * Utility functions for handling assets in the renderer process
 */

// Import the logo to ensure it's bundled correctly by webpack
import entraPulseLogo from '../../../assets/EntraPulseLiteLogo.png';

// Map of pre-imported assets
const preImportedAssets: Record<string, string> = {
  'EntraPulseLiteLogo.png': entraPulseLogo,
};

/**
 * Gets the correct path for an asset in the rendered Electron app
 * This handles different path contexts between development and production
 */
export const getAssetPath = (assetName: string): string => {
  // Return pre-imported asset if available
  if (preImportedAssets[assetName]) {
    return preImportedAssets[assetName];
  }

  // Fallback to static paths for any other assets
  try {
    if (process.env.NODE_ENV === 'production') {
      return `file://${window.electron.getAssetPath(assetName)}`;
    } else {
      return `../../../assets/${assetName}`;
    }
  } catch (e) {
    console.error(`Failed to load asset: ${assetName}`, e);
    return '';
  }
};