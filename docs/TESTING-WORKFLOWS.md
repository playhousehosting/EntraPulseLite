# Testing GitHub Actions Workflows

This document provides guidance on testing the updated GitHub Actions workflows for EntraPulse Lite.

## Prerequisites

### GitHub Secrets Setup

Before testing signed builds, you need to set up the following GitHub Secrets:

1. **WIN_CSC_LINK**: The base64-encoded .pfx certificate
   - Use the content from `DarrenJRobinson-CodeSigning-base64.txt`
   - Navigate to: GitHub repo → Settings → Secrets and variables → Actions → New repository secret
   - Name: `WIN_CSC_LINK`
   - Value: The base64 string from the text file

2. **WIN_CSC_KEY_PASSWORD**: The password for the .pfx certificate
   - Name: `WIN_CSC_KEY_PASSWORD`
   - Value: Your certificate password

### Certificate File Cleanup

After setting up the secrets, you can safely delete the local certificate files:
```powershell
Remove-Item "DarrenJRobinson-CodeSigning.pfx" -ErrorAction SilentlyContinue
Remove-Item "DarrenJRobinson-CodeSigning-base64.txt" -ErrorAction SilentlyContinue
```

## Available Workflows

### 1. Manual Release (Windows Signed)
- **File**: `.github/workflows/manual-release.yml`
- **Trigger**: Manual dispatch
- **Platform**: Windows only
- **Signing**: Yes (requires secrets)
- **Use Case**: Quick manual testing of Windows builds

### 2. Beta Release Signed (Windows)
- **File**: `.github/workflows/beta-release-signed.yml`
- **Trigger**: Push to branch matching `beta/*`
- **Platform**: Windows only
- **Signing**: Yes (requires secrets)
- **Use Case**: Beta releases with code signing

### 3. Beta Release Unsigned (Windows)
- **File**: `.github/workflows/beta-release-unsigned.yml`
- **Trigger**: Push to branch matching `beta-unsigned/*`
- **Platform**: Windows only
- **Signing**: No
- **Use Case**: Testing without code signing requirements

### 4. Multi-Platform Production Release
- **File**: `.github/workflows/release-multiplatform-signed.yml`
- **Trigger**: Push to tags matching `v*.*.*`
- **Platforms**: Windows (signed), macOS (unsigned), Linux (unsigned)
- **Use Case**: Production releases

## Testing Strategy

### Phase 1: Manual Testing
1. Test the manual release workflow first:
   ```bash
   # Navigate to GitHub repo → Actions → Manual Release → Run workflow
   ```

### Phase 2: Beta Branch Testing
1. Create a beta branch and test signed builds:
   ```bash
   git checkout -b beta/test-signed-workflow
   git push origin beta/test-signed-workflow
   ```

2. Create a beta unsigned branch and test unsigned builds:
   ```bash
   git checkout -b beta-unsigned/test-unsigned-workflow
   git push origin beta-unsigned/test-unsigned-workflow
   ```

### Phase 3: Production Release Testing
1. Create a test tag for multi-platform release:
   ```bash
   git tag v1.0.0-beta.2
   git push origin v1.0.0-beta.2
   ```

## Expected Outputs

### Signed Builds
- **Installer**: `EntraPulse Lite Setup x.x.x.exe` (signed)
- **Portable**: `EntraPulse Lite x.x.x.exe` (signed)
- **Verification**: Right-click → Properties → Digital Signatures tab should show valid signature

### Unsigned Builds
- **Installer**: `EntraPulse Lite Setup x.x.x.exe` (unsigned)
- **Portable**: `EntraPulse Lite x.x.x.exe` (unsigned)
- **Note**: Windows SmartScreen may show warnings

### Multi-Platform Builds
- **Windows**: Signed executables
- **macOS**: `.dmg` file (unsigned)
- **Linux**: `.AppImage` file (unsigned)

## Verification Checklist

### Build Verification
- [ ] Workflow completes successfully
- [ ] All expected artifacts are generated
- [ ] File sizes are reasonable (>50MB for installer)
- [ ] Assets are properly copied (check app icons)

### Functional Verification
- [ ] App launches without errors
- [ ] Authentication works correctly
- [ ] LLM integration functions
- [ ] MCP servers connect properly
- [ ] UI renders correctly

### Security Verification
- [ ] Signed builds have valid digital signatures
- [ ] Certificate details are correct
- [ ] No security warnings on signed builds

## Troubleshooting

### Common Issues

1. **Code Signing Failures**
   - Verify GitHub Secrets are set correctly
   - Check certificate password is correct
   - Ensure base64 encoding is valid

2. **Asset Loading Issues**
   - Verify `copy-assets.js` runs during build
   - Check asset paths in built application
   - Confirm icons appear in system tray

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs for specific errors

### Getting Help

If you encounter issues:
1. Check the workflow logs in GitHub Actions
2. Review the `dist-release` folder for build artifacts
3. Test locally with `npm run build` and `npm run make`
4. Consult the main documentation files

## Security Notes

- Never commit certificate files to the repository
- Use GitHub Secrets for all sensitive data
- Regularly rotate certificates before expiration
- Monitor workflow logs for security issues
