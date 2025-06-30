# Auto-Updater Setup for EntraPulse Lite

This document outlines the auto-updater implementation for EntraPulse Lite, which enables automatic distribution of new versions through GitHub Releases.

## Overview

EntraPulse Lite uses `electron-updater` to provide seamless automatic updates to users. The system checks for updates on GitHub Releases and downloads them in the background, notifying users when updates are ready to install.

## Architecture

### Main Process Components

1. **AutoUpdaterService** (`src/main/AutoUpdaterService.ts`)
   - Manages the auto-updater lifecycle
   - Handles update checking, downloading, and installation
   - Provides user notifications and controls

2. **Main Process Integration** (`src/main/main.ts`)
   - Initializes the auto-updater service
   - Sets up IPC handlers for renderer communication
   - Manages auto-updater preferences

### Renderer Process Components

1. **UpdateNotification** (`src/renderer/components/common/UpdateNotification.tsx`)
   - React component for update dialogs and notifications
   - Handles download progress and user interactions
   - Provides visual feedback for update states

2. **Settings Integration** (`src/renderer/components/EnhancedSettingsDialog.tsx`)
   - Auto-update preferences in application settings
   - Manual update checking functionality
   - Version information display

## Configuration

### Package.json Configuration

The auto-updater is configured in `package.json` under the `build.publish` section:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "darrenjrobinson",
      "repo": "EntraPulseLite"
    }
  }
}
```

### GitHub Actions Workflow

The release workflow (`.github/workflows/release.yml`) automatically:
- Builds the application for all platforms
- Creates GitHub releases with installers
- Publishes update information for the auto-updater

## Features

### Automatic Update Checking

- Checks for updates 10 seconds after application startup
- Respects user preferences for auto-updates
- Can be manually triggered from settings

### User Control

- Users can enable/disable auto-updates in settings
- Update installation requires user confirmation
- Download progress is displayed with cancel option

### Platform Support

- **Windows**: NSIS installer with automatic updates
- **macOS**: DMG with code signing support
- **Linux**: AppImage with update support

## Security

### Code Signing

- Windows: Requires code signing certificate for trusted updates
- macOS: Requires Apple Developer certificate for notarization
- Linux: SHA256 checksums for integrity verification

### Update Verification

- All updates are verified against GitHub release signatures
- Only official releases from the configured repository are accepted
- SSL/TLS encryption for all update communications

## User Experience

### Update Flow

1. **Background Check**: App checks for updates automatically
2. **Notification**: User is notified if update is available
3. **Download**: User can choose to download update immediately or later
4. **Progress**: Download progress is shown with speed and percentage
5. **Installation**: User is prompted to restart and install when ready

### Settings Management

Users can:
- Enable/disable automatic updates
- Check for updates manually
- View current version information
- See last update check timestamp

## Development

### Testing Auto-Updates

For development and testing:

1. **Development Mode**: Auto-updater is disabled in development
2. **Staging Releases**: Use beta/alpha tags for testing
3. **Local Testing**: Mock the update process with test releases

### Configuration Service Integration

Auto-update preferences are stored securely using the ConfigService:

```typescript
// Get preference
const autoUpdateEnabled = configService.getAutoUpdatePreference();

// Set preference
configService.setAutoUpdatePreference(true);
```

## Release Process

### Creating a Release

1. **Version Bump**: Update version in `package.json`
2. **Tag Creation**: Create and push a git tag (e.g., `v1.0.1`)
3. **GitHub Actions**: Workflow automatically builds and publishes
4. **Release Notes**: Add release notes to the GitHub release

### Version Format

Follow semantic versioning:
- `v1.0.0` - Major release
- `v1.0.1` - Patch release
- `v1.1.0` - Minor release
- `v1.0.0-beta.1` - Pre-release

## Troubleshooting

### Development Builds and Pre-Release Issues

**Issue**: Auto-updater shows "[object Object]" error or "Update error" on startup.

**Cause**: This is normal for development builds (beta, alpha, dev versions) when no GitHub releases exist yet.

**Solutions**:
1. **Expected Behavior**: Development builds will show update errors until the first official release is published to GitHub.
2. **Error Message**: Recent updates provide clearer error messages like "No releases available yet. This is normal for development builds."
3. **Disable Auto-Updates**: In Settings > General, disable "Check for updates automatically" for development environments.

### Common Error Scenarios

#### 404 Not Found Error
- **Cause**: GitHub repository doesn't have any releases yet
- **Resolution**: This is expected for new projects; publish first release to resolve

#### Network Connection Issues
- **Cause**: Firewall or network blocking GitHub API access
- **Resolution**: Check network connectivity and firewall settings

#### Certificate/Signing Issues
- **Cause**: Code signing verification failures
- **Resolution**: Ensure proper certificate configuration in build process

### Debug Information

Enable verbose logging for auto-updater debugging:

```typescript
// In development, check console logs for:
// 🔍 Checking for updates...
// ❌ Auto-updater error: [detailed error message]
// ℹ️ Development build detected - auto-update checking may not work until official releases are available
```

### Manual Update Testing

For testing update functionality:

1. Create a test release on GitHub
2. Bump version number in development build
3. Test update detection and download process
4. Verify installation and rollback scenarios

### Common Issues

1. **Update Check Fails**
   - Check internet connectivity
   - Verify GitHub repository access
   - Check console logs for error details

2. **Download Fails**
   - Ensure sufficient disk space
   - Check firewall/antivirus settings
   - Verify network permissions

3. **Installation Fails**
   - Close all application instances
   - Run as administrator (Windows)
   - Check file permissions

### Logs and Debugging

Auto-updater events are logged to the console:
- Update checking status
- Download progress
- Installation results
- Error details

## Future Enhancements

### Planned Features

1. **Delta Updates**: Smaller incremental updates
2. **Rollback**: Ability to rollback failed updates
3. **Channel Selection**: Stable/beta/alpha update channels
4. **Scheduled Updates**: User-configurable update schedules

### Configuration Options

Future settings may include:
- Update channel preference
- Download bandwidth limits
- Installation scheduling
- Rollback capabilities

## Best Practices

### For Releases

1. **Test Before Release**: Always test builds on target platforms
2. **Clear Release Notes**: Provide detailed changelog information
3. **Incremental Updates**: Keep update sizes reasonable
4. **Backward Compatibility**: Ensure config/data migration

### For Users

1. **Regular Updates**: Keep auto-updates enabled for security
2. **Backup Data**: Application data is preserved during updates
3. **Close Applications**: Close app before manual installation
4. **Check Network**: Ensure stable internet for downloads

## Security Considerations

### Signed Releases

All production releases should be:
- Code signed with verified certificates
- Built from tagged source code
- Distributed through official channels only

### User Privacy

The auto-updater:
- Only communicates with GitHub servers
- Does not collect usage analytics
- Respects user update preferences
- Uses encrypted connections (HTTPS)

## Support

For auto-updater issues:
- Check application logs in developer tools
- Verify GitHub repository access
- Review network connectivity
- Submit issues with detailed error logs

The auto-updater system ensures EntraPulse Lite users always have access to the latest features, security fixes, and improvements with minimal friction.
