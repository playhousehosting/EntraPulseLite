# EntraPulse Lite v{VERSION} - Download Guide

Welcome to EntraPulse Lite! This guide will help you choose the right download for your system.

## 🚀 Quick Start - Which file should I download?

### Windows Users (Recommended)
- **🎯 `EntraPulse Lite {VERSION}.exe` (Portable)** - **BEST CHOICE for most users**
  - No installation required - just download and run
  - Doesn't require administrator privileges
  - Can be run from any folder or USB drive
  - Perfect for corporate environments or restricted systems

- **📦 `EntraPulse Lite Setup {VERSION}.exe` (Installer)**
  - Traditional Windows installer
  - Installs to Program Files
  - Creates Start Menu shortcuts
  - Requires administrator privileges
  - Choose this if you prefer traditional software installation

### macOS Users
- **🍎 `EntraPulse-Lite-{VERSION}.dmg`**
  - Standard macOS disk image
  - Drag and drop to Applications folder
  - **Note**: This is an unsigned build - you may need to allow it in System Preferences → Security & Privacy

### Linux Users
- **🐧 `EntraPulse-Lite-{VERSION}.AppImage`**
  - Universal Linux application
  - Make executable and run: `chmod +x EntraPulse-Lite-{VERSION}.AppImage && ./EntraPulse-Lite-{VERSION}.AppImage`
  - Works on most Linux distributions
  - No installation required

## 📋 Release Information

**Version**: {VERSION}  
**Release Date**: {RELEASE_DATE}  
**Build Type**: {BUILD_TYPE}

### What's New in This Release
{RELEASE_NOTES}

## 🔐 Security Information

### Code Signing Status
- **Windows**: {WINDOWS_SIGNING_STATUS}
- **macOS**: Unsigned (future releases may include Apple Developer signing)
- **Linux**: Not applicable (Linux doesn't typically use code signing)

### First-Time Installation Notes

#### Windows Users
- **Signed builds**: No warnings should appear
- **Unsigned builds**: Windows SmartScreen may show a warning:
  1. Click "More info" 
  2. Click "Run anyway"
  3. This is normal for unsigned software

#### macOS Users
- First launch may show "unidentified developer" warning:
  1. Right-click the app and select "Open"
  2. Click "Open" in the dialog
  3. Or go to System Preferences → Security & Privacy → General → "Open Anyway"

#### Linux Users
- No special steps required
- Ensure the AppImage file has execute permissions

## 📁 File Details

| Platform | File | Size | Type | Description |
|----------|------|------|------|-------------|
| Windows  | `EntraPulse Lite {VERSION}.exe` | ~{PORTABLE_SIZE} | Portable | No installation required |
| Windows  | `EntraPulse Lite Setup {VERSION}.exe` | ~{INSTALLER_SIZE} | Installer | Traditional Windows installer |
| macOS    | `EntraPulse-Lite-{VERSION}.dmg` | ~{MACOS_SIZE} | Disk Image | Standard macOS application |
| Linux    | `EntraPulse-Lite-{VERSION}.AppImage` | ~{LINUX_SIZE} | AppImage | Universal Linux application |

## 🆘 Need Help?

### Installation Issues
- **Windows**: Try the portable version if the installer fails
- **macOS**: Check System Preferences → Security & Privacy if the app won't open
- **Linux**: Ensure the AppImage has execute permissions

### System Requirements
- **Windows**: Windows 10 or later (64-bit)
- **macOS**: macOS 10.15 (Catalina) or later
- **Linux**: Most modern distributions with GLIBC 2.17+

### Support
- 📖 [Documentation](https://github.com/darrenjrobinson/EntraPulseLite/docs)
- 🐛 [Report Issues](https://github.com/darrenjrobinson/EntraPulseLite/issues)
- 💬 [Discussions](https://github.com/darrenjrobinson/EntraPulseLite/discussions)

## 🔍 Verification

All release files include SHA256 checksums for verification:
- Download the `latest.yml` or related checksum files
- Compare the SHA256 hash of your downloaded file with the provided checksums

---

**Happy querying with EntraPulse Lite!** 🚀

*For technical users: All builds are created using GitHub Actions with reproducible builds. Source code and build scripts are available in the repository.*
