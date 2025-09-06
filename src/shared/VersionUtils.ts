/**
 * Version utilities for reading app version from package.json
 */

import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Get the current application version from package.json
 */
export function getAppVersion(): string {
  try {
    // In production, use electron's app.getVersion()
    if (app.isPackaged) {
      return app.getVersion();
    }
    
    // In development, read from package.json
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.warn('Failed to get app version:', error);
    // Fallback version
    return '1.0.0-beta.3';
  }
}

/**
 * Get version for renderer process (via IPC)
 */
export function exposeVersionToRenderer() {
  ipcMain.handle('app:getVersion', () => {
    return getAppVersion();
  });
}
