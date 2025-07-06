# 📚 EntraPulse Lite Documentation Index

This directory contains comprehensive documentation for EntraPulse Lite. Use this index to find the right document for your needs.

## 🔍 Quick Navigation

### Getting Started
- **[INSTALLATION.md](./INSTALLATION.md)** - Complete installation and setup guide
- **[CONFIGURATION.md](./CONFIGURATION.md)** - Application configuration and settings
- **[LOCAL-LLM-SETUP.md](./LOCAL-LLM-SETUP.md)** - Setting up local LLMs (Ollama, LM Studio)

### Development
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow, architecture, and best practices
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed technical architecture
- **[TESTING.md](./TESTING.md)** - Testing strategies and test execution
- **[MCP-INTEGRATION.md](./MCP-INTEGRATION.md)** - Model Context Protocol integration details (includes Microsoft Docs MCP)
- **[MICROSOFT-DOCS-MCP-INTEGRATION.md](./MICROSOFT-DOCS-MCP-INTEGRATION.md)** - Microsoft Docs MCP specific implementation details

### Critical Issues & Fixes

#### Authentication & UI State
- **[CRITICAL-UI-STATE-FIX.md](./CRITICAL-UI-STATE-FIX.md)** - 🚨 **CRITICAL** - IPC security fix for UI state sync
- **[EMERGENCY-FIX-INFINITE-LOOP.md](./EMERGENCY-FIX-INFINITE-LOOP.md)** - Emergency fixes for infinite loops
- **[INFINITE-LOOP-FIX-COMPLETE.md](./INFINITE-LOOP-FIX-COMPLETE.md)** - Complete infinite loop resolution
- **[UI-STATE-SYNCHRONIZATION-FIX.md](./UI-STATE-SYNCHRONIZATION-FIX.md)** - UI state synchronization solutions

#### Security
- **[SECURITY-FIX-UPDATE.md](./SECURITY-FIX-UPDATE.md)** - Additional security hardening

### Enhanced Features
- **[AUTO-UPDATER.md](./AUTO-UPDATER.md)** - Auto-updater system implementation and configuration
- **[ENHANCED-GRAPH-ACCESS-IMPLEMENTATION.md](./ENHANCED-GRAPH-ACCESS-IMPLEMENTATION.md)** - Enhanced Graph Access toggle implementation
- **[ENHANCED-GRAPH-ACCESS-IMPLEMENTATION-COMPLETE.md](./ENHANCED-GRAPH-ACCESS-IMPLEMENTATION-COMPLETE.md)** - Implementation completion status
- **[DUAL-AUTHENTICATION-IMPLEMENTATION.md](./DUAL-AUTHENTICATION-IMPLEMENTATION.md)** - Dual authentication system implementation

### Feature Documentation
- **[LLM-PROVIDERS.md](./LLM-PROVIDERS.md)** - LLM provider configuration and setup
- **[CLOUD-LLM-IMPLEMENTATION.md](./CLOUD-LLM-IMPLEMENTATION.md)** - Cloud LLM service implementation
- **[USER-PROFILE-IMPLEMENTATION.md](./USER-PROFILE-IMPLEMENTATION.md)** - User profile features
- **[ENTITLEMENT-MANAGEMENT.md](./ENTITLEMENT-MANAGEMENT.md)** - Microsoft Entra entitlement management
- **[PERMISSIONS.md](./PERMISSIONS.md)** - Microsoft Graph permissions handling

### Testing & Quality Assurance
- **[LLM-STATUS-MONITORING-UAT.md](./LLM-STATUS-MONITORING-UAT.md)** - LLM status monitoring tests
- **[CLOUD-LLM-QUERY-TESTS.md](./CLOUD-LLM-QUERY-TESTS.md)** - Cloud LLM query testing
- **[GUEST-ACCOUNT-QUERIES.md](./GUEST-ACCOUNT-QUERIES.md)** - Guest account testing
- **[TEST-CONNECTION-FEATURE.md](./TEST-CONNECTION-FEATURE.md)** - Connection testing features

### Troubleshooting & Support
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - 🔧 **COMPREHENSIVE** - Common issues and solutions
- **[LOKKA-TEST-IMPROVEMENTS.md](./LOKKA-TEST-IMPROVEMENTS.md)** - Lokka MCP testing improvements
- **[EXTERNAL-LOKKA-MCP.md](./EXTERNAL-LOKKA-MCP.md)** - External Lokka MCP configuration

### Project History
- **[DEVELOPMENT-HISTORY.md](./DEVELOPMENT-HISTORY.md)** - Complete development history and milestones
- **[LLM-IMPLEMENTATION-COMPLETE.md](./LLM-IMPLEMENTATION-COMPLETE.md)** - LLM implementation completion summary
- **[DOCUMENTATION-UPDATE-SUMMARY.md](./DOCUMENTATION-UPDATE-SUMMARY.md)** - Documentation update summary

### Compliance & Legal
- **[PRIVACY-POLICY.md](./PRIVACY-POLICY.md)** - Privacy policy and data handling

## 🚨 Emergency Procedures

### If you encounter critical issues:
1. **Authentication/UI State Issues**: Start with `TROUBLESHOOTING.md` → Authentication section
2. **Infinite Loops**: Check `EMERGENCY-FIX-INFINITE-LOOP.md` for immediate solutions
3. **Configuration Not Loading**: Review `CRITICAL-UI-STATE-FIX.md` for IPC security fixes
4. **Security Concerns**: Reference the "Authentication and UI State Issues" section in `TROUBLESHOOTING.md` for security model

### Test Scripts for Validation:
- `scripts/test-azure-openai-persistence.js` - Configuration persistence testing
- `scripts/test-simple-persistence.js` - Basic persistence logic testing

## 📋 Documentation Standards

All documentation follows these standards:
- ✅ **Clear problem statements** with symptoms
- ✅ **Root cause analysis** where applicable
- ✅ **Step-by-step solutions** with code examples
- ✅ **Testing procedures** for validation
- ✅ **Cross-references** to related documents

## 🤝 Contributing to Documentation

When adding new documentation:
1. Follow the established markdown format
2. Include clear headings and sections
3. Add cross-references to related documents
4. Update this index with new files
5. Include testing procedures where applicable

---

**Last Updated**: June 17, 2025  
**Project**: EntraPulse Lite  
**Version**: Latest
