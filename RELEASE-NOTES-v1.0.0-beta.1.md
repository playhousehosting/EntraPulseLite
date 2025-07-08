# EntraPulse Lite v1.0.0-beta.1 Release Notes

## 🎉 First Beta Release

Welcome to the first beta release of EntraPulse Lite! This release represents a major milestone in bringing natural language Microsoft Graph API querying to the community.

## ✨ Key Features

- **Enhanced Graph Access**: Hybrid authentication mode combining user tokens with application credentials
- **Progressive Authentication**: Request permissions as needed during conversations
- **Multi-Provider LLM Support**: Local (Ollama, LM Studio) and cloud (OpenAI, Anthropic, Google Gemini, Azure OpenAI) models
- **Built-in MCP Servers**: Lokka MCP for Microsoft Graph, Microsoft Docs MCP for documentation
- **Modern Chat Interface**: Copy code blocks, manage conversations, trace visualization
- **Real-time LLM Monitoring**: Dynamic status tracking and availability checking

## 🔒 Important Security Notice for Windows Users

**You may see a Windows Defender SmartScreen warning when running this beta release.**

This is **expected behavior** because beta releases are unsigned. To install:

1. Download the installer from GitHub Releases
2. When Windows shows "Windows protected your PC":
   - Click **"More info"**
   - Click **"Run anyway"**
3. Proceed with normal installation

**Why this happens:**
- Beta builds are unsigned for faster development iteration
- Windows SmartScreen warns about unsigned executables as a security precaution
- The software is safe - this is just a protection for unsigned applications

## 📦 Download Options

- **Windows**: `EntraPulse Lite Setup 1.0.0-beta.1.exe` (unsigned, will show SmartScreen warning)
- **macOS**: `EntraPulse Lite-1.0.0-beta.1.dmg` and `EntraPulse Lite-1.0.0-beta.1-mac.zip`
- **Linux**: `EntraPulse Lite_1.0.0-beta.1_amd64.deb`, `EntraPulse Lite-1.0.0-beta.1.AppImage`, and `EntraPulse Lite-1.0.0-beta.1.tar.gz`

## 🐛 Known Issues

- Windows Defender SmartScreen warning (expected for unsigned builds)
- First-time LLM connection may take a few seconds to establish
- Some Graph API operations require enhanced permissions (application will guide you)

## 🚀 Getting Started

1. Download the appropriate installer for your platform
2. Install and launch EntraPulse Lite
3. Sign in with your Microsoft work/school account
4. Configure your preferred LLM provider (local or cloud)
5. Start asking questions about your Microsoft Graph data!

## 🤝 Feedback and Support

This is a beta release - your feedback is invaluable! Please report issues, suggestions, and feature requests on our [GitHub Issues](https://github.com/yourusername/EntraPulseLite/issues) page.

## 🔄 Future Releases

- Stable v1.0.0 release with code signing (eliminates Windows warnings)
- Additional MCP server integrations
- Enhanced permission management
- Performance optimizations

Thank you for testing EntraPulse Lite! Your feedback helps make this tool better for the entire community.
