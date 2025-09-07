# Building Distributable Versions

This guide shows you how to create executable files that can be shared and run without requiring npm, Node.js, or terminal access.

## Quick Start

### Build All Distribution Formats
```bash
npm run dist
```

This creates:
- **Portable EXE** - Single executable file, no installation needed
- **NSIS Installer** - Traditional Windows installer with shortcuts
- **MSI Installer** - Microsoft Installer format for enterprise deployment

### Build Specific Formats

```bash
# Portable executable only (recommended for sharing)
npm run dist:portable

# NSIS installer only
npm run dist:installer

# MSI installer only  
npm run dist:msi

# Clean build (removes old files first)
npm run dist:clean

# Show help
npm run dist:help
```

## Distribution Options

### 1. Portable EXE (Recommended for Sharing)
- **File**: `DynamicEndpoint Assistant-X.X.X-portable.exe`
- **Size**: ~200-300 MB
- **Usage**: Just share the .exe file - no installation needed
- **Benefits**: 
  - Works on any Windows machine
  - No admin rights required
  - Self-contained with all dependencies
  - Can run from USB drive

### 2. NSIS Installer
- **File**: `DynamicEndpoint Assistant-X.X.X-installer.exe`
- **Size**: ~150-200 MB
- **Usage**: Run installer, creates desktop/start menu shortcuts
- **Benefits**:
  - Professional installation experience
  - Automatic updates support
  - Easy uninstall
  - Windows integration

### 3. MSI Installer
- **File**: `DynamicEndpoint Assistant-X.X.X-installer.msi`
- **Size**: ~150-200 MB
- **Usage**: Run MSI for enterprise deployment
- **Benefits**:
  - Group Policy deployment
  - Enterprise management
  - System administrator control

## Output Location

All built files are saved in the `dist-release` folder:

```
dist-release/
├── DynamicEndpoint Assistant-1.0.0-portable.exe
├── DynamicEndpoint Assistant-1.0.0-installer.exe
└── DynamicEndpoint Assistant-1.0.0-installer.msi
```

## Sharing Your Application

### For End Users (Recommended)
1. Build portable version: `npm run dist:portable`
2. Share the `.exe` file from `dist-release/`
3. Recipients just double-click to run - no installation needed!

### For IT Departments
1. Build all formats: `npm run dist`
2. Provide MSI for automated deployment
3. NSIS installer for user-initiated installation

## System Requirements

**Built applications require:**
- Windows 10/11 (64-bit)
- No additional software needed
- ~500 MB disk space when running

**Building requires:**
- Node.js 18+ 
- npm
- Windows development environment

## Troubleshooting

### "App won't start"
- Ensure Windows Defender isn't blocking the executable
- Try "Run as Administrator" if needed
- Check antivirus software settings

### "Build fails"
- Run `npm install` first
- Try `npm run dist:clean` then `npm run dist`
- Ensure you have enough disk space (2+ GB free)

### "File too large"
- This is normal for Electron apps (includes Node.js runtime)
- Portable version includes all dependencies for convenience
- Consider using installer versions for smaller download

## Advanced Options

### Custom Build Configuration
Edit `electron-builder-distribution.json` to customize:
- Output file names
- Installer options
- Icon and branding
- Target architectures

### Signing (Optional)
For production distribution, consider code signing:
```bash
npm run build:signed
```

### Publishing to GitHub Releases
```bash
npm run release:unsigned:publish
```

## Success! 🎉

Your application is now ready for distribution. Users can run it without any technical setup - just like any other Windows application!