// Auto-updater service for EntraPulse Lite
import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { ConfigService } from '../shared/ConfigService';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;
  private configService: ConfigService;
  private updateDownloaded = false;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.setupAutoUpdater();
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  private setupAutoUpdater(): void {
    // Configure update server (GitHub releases)
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'darrenjrobinson',
      repo: 'EntraPulseLite'
    });

    // Auto-updater event handlers
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 Checking for updates...');
      this.sendToRenderer('update:checking-for-update');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('✅ Update available:', info);
      this.sendToRenderer('update:available', info);
      
      // Show notification to user
      this.showUpdateNotification(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('✅ Update not available. Current version is latest:', info);
      this.sendToRenderer('update:not-available', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('❌ Auto-updater error:', err);
      
      // Better error message handling
      let errorMessage = 'Unknown update error';
      if (err && typeof err === 'object') {
        if (err.message) {
          errorMessage = err.message;
        } else if (err.toString && err.toString() !== '[object Object]') {
          errorMessage = err.toString();
        } else {
          errorMessage = 'Failed to check for updates. This may be normal for pre-release builds.';
        }
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Check if this is a 404 error (no releases available)
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorMessage = 'No releases available yet. This is normal for development builds.';
        console.log('ℹ️ Auto-updater: No releases found in repository - this is expected for development builds');
      }
      
      this.sendToRenderer('update:error', errorMessage);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
      console.log('📥 Download progress:', message);
      this.sendToRenderer('update:download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ Update downloaded:', info);
      this.updateDownloaded = true;
      this.sendToRenderer('update:downloaded', info);
      
      // Show install notification
      this.showInstallUpdateDialog();
    });
  }

  private sendToRenderer(event: string, data?: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(event, data);
    }
  }

  private showUpdateNotification(info: any): void {
    if (!this.mainWindow) return;

    const options = {
      type: 'info' as const,
      title: 'Update Available',
      message: `EntraPulse Lite ${info.version} is available`,
      detail: 'A new version of EntraPulse Lite is available. Would you like to download it now?',
      buttons: ['Download', 'Later'],
      defaultId: 0,
      cancelId: 1
    };

    dialog.showMessageBox(this.mainWindow, options).then((result) => {
      if (result.response === 0) {
        // User chose to download
        this.downloadUpdate();
      }
    });
  }

  private showInstallUpdateDialog(): void {
    if (!this.mainWindow) return;

    const options = {
      type: 'info' as const,
      title: 'Update Ready',
      message: 'Update downloaded successfully',
      detail: 'EntraPulse Lite will restart to apply the update. Save any important work before proceeding.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    };

    dialog.showMessageBox(this.mainWindow, options).then((result) => {
      if (result.response === 0) {
        // User chose to restart
        this.installUpdate();
      }
    });
  }

  // Public methods for manual update checking
  async checkForUpdates(): Promise<void> {
    try {
      console.log('🔍 Checking for updates...');
      await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      console.error('Error checking for updates:', error);
      
      // Handle common error scenarios gracefully
      let errorMessage = 'Failed to check for updates';
      if (error && typeof error === 'object' && (error as any).message) {
        const msg = (error as any).message;
        if (msg.includes('404') || msg.includes('Not Found')) {
          errorMessage = 'No releases available yet. This is normal for development builds.';
          console.log('ℹ️ No releases found - expected for development builds');
        } else {
          errorMessage = msg;
        }
      }
      
      this.sendToRenderer('update:error', errorMessage);
    }
  }

  downloadUpdate(): void {
    try {
      autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Error downloading update:', error);
    }
  }

  installUpdate(): void {
    if (this.updateDownloaded) {
      autoUpdater.quitAndInstall();
    } else {
      console.warn('No update downloaded to install');
    }
  }

  // Check for updates on app startup (with delay)
  checkForUpdatesOnStartup(): void {
    // Check user preference for auto-updates
    const autoUpdateEnabled = this.configService.getAutoUpdatePreference();
    
    if (autoUpdateEnabled !== false) { // Default to true unless explicitly disabled
      // For beta/development builds, be more conservative about update checking
      const currentVersion = this.getCurrentVersion();
      const isDevelopmentBuild = currentVersion.includes('beta') || currentVersion.includes('dev') || currentVersion.includes('alpha');
      
      if (isDevelopmentBuild) {
        console.log('ℹ️ Development build detected - auto-update checking may not work until official releases are available');
      }
      
      // Wait 10 seconds after startup before checking for updates
      setTimeout(() => {
        this.checkForUpdates();
      }, 10000);
    }
  }

  // Get current version
  getCurrentVersion(): string {
    return autoUpdater.currentVersion?.version || '1.0.0-beta.1';
  }

  // Check if update is pending
  isUpdatePending(): boolean {
    return this.updateDownloaded;
  }

  // Enable/disable auto-updates
  setAutoUpdateEnabled(enabled: boolean): void {
    this.configService.setAutoUpdatePreference(enabled);
  }

  getAutoUpdateEnabled(): boolean {
    return this.configService.getAutoUpdatePreference() !== false;
  }
}
