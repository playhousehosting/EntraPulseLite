# Context-Aware Configuration System

## Overview

The EntraPulse Lite application features a secure, context-aware configuration system that handles dual authentication modes seamlessly. Users can switch between authentication modes at runtime without requiring application restart.

## Authentication Modes

### 1. **User Token Mode (Default)**
- **Authentication**: Delegated user permissions via interactive login
- **Storage Location**: User-specific configuration (`users.user_{userId}` key in store)
- **API Keys**: Isolated per user account
- **Use Case**: Individual users with personal LLM configurations
- **Permissions**: Basic delegated permissions for standard Microsoft Graph access

### 2. **Enhanced Graph Access Mode**  
- **Authentication**: Delegated permissions using Microsoft Graph PowerShell client ID
- **Storage Location**: User-specific configuration with enhanced Graph access flag
- **Client ID**: Pre-configured Microsoft Graph PowerShell application (`14d82eec-204b-4c2f-b7e8-296a70dab67e`)
- **Use Case**: Users requiring comprehensive Microsoft Graph permissions
- **Permissions**: Extensive delegated permissions for mail, calendar, files, directory, and more

### 🔄 **Runtime Mode Switching**
Users can switch between authentication modes in Settings → Entra Application Settings:
- Toggle between "Custom Application" and "Enhanced Graph Access"
- Automatic MCP server restart when switching modes
- Configuration context automatically switches
- No application restart required
- **Authentication**: Uses the Microsoft Graph PowerShell application (`14d82eec-204b-4c2f-b7e0-296602dcde65`) with delegated user permissions
- **Use Case**: Users who want broader Graph API permissions without needing their own app registration
- **Configuration**: Requires user sign-in AND tenant ID only (no client secret needed)
- **Behavior**: Uses Microsoft Graph PowerShell client ID for authentication, providing enhanced permissions
- **Toggle Control**: Available in Settings → Entra Configuration as a separate option

## Features

### 🔐 **Secure Storage**
- Uses `electron-store` with encryption key
- API keys stored encrypted on disk
- Separate configuration contexts prevent cross-contamination

### 📊 **Real-time LLM Status Monitoring**
- Background polling for LLM availability
- Configurable polling interval
- Context-aware status updates
- UI integration with real-time status indicators

### 📦 **Model Caching**
- 24-hour cache for fetched models
- Cache-aware to prevent duplicate API calls
- Context-specific caches (app vs user)

### 🔄 **Automatic Context Switching**
- Configuration automatically switches based on authentication mode
- Seamless transition between admin and user contexts
- Persistent storage across app restarts

## Technical Implementation

### Configuration Structure
```typescript
{
  users: {                 // User-specific configurations
    user_[userId]: {
      llm: { ... },
      modelCache: { ... },
      enhancedGraphAccess: boolean,  // Enhanced Graph Access flag
      statusMonitoring: {    // LLM Status Monitoring settings
        pollingInterval: 5000,
        lastCheckTime: "2023-11-01T12:00:00Z",
        localLLMAvailable: true
      },
    entra: {              // Application-level Entra config
      clientId: "...",
      clientSecret: "...",
      tenantId: "...",
      useApplicationCredentials: true,
      enhancedGraphAccess: false  // NEW: Enhanced Graph Access toggle
    }
  },
  users: {
    "user_12345": {        // User Token mode configurations
      llm: { ... },
      modelCache: { ... },
      entra: {             // User-specific preferences
        useApplicationCredentials: false,
        enhancedGraphAccess: false  // NEW: Per-user Enhanced Graph Access preference
      }
    }
  },
  currentAuthMode: "user-token" | "application-credentials",
  currentUserKey: "user_12345" | undefined
}
```

### Key Methods
- `setAuthenticationContext(mode, userInfo?)` - Switch contexts
- `getAuthenticationPreference()` - Get current auth mode preference
- `updateAuthenticationContext(config)` - Update auth context from Entra config
- `getLLMConfig()` - Get context-aware configuration
- `saveLLMConfig(config)` - Save to appropriate context
- `getCachedModels(provider)` - Context-aware model cache
- `clearModelCache(provider?)` - Clear cache for current context

## Benefits

1. **🔒 Security**: API keys are isolated by authentication context, all access uses delegated permissions
2. **👥 Dual Authentication**: Support for both Custom Application and Enhanced Graph Access modes
3. **⚡ Performance**: Intelligent caching reduces API calls
4. **🔄 Runtime Switching**: Switch authentication modes without restart
5. **🧹 Clean Separation**: No cross-contamination between auth mode configs
6. **💾 Persistence**: Configuration survives app restarts
7. **🎯 User Context**: All API calls respect user permissions and organizational access

## Current Status

- ✅ **Custom Application Mode**: User's own app registration with delegated permissions
- ✅ **Enhanced Graph Access**: Microsoft Graph PowerShell client with comprehensive delegated permissions
- ✅ **Runtime Mode Switching**: Toggle between modes in UI
- ✅ **Secure Storage**: Encrypted configuration with electron-store
- ✅ **Model Caching**: 24-hour cache with deduplication
- ✅ **Context Management**: Automatic switching based on auth mode
- ✅ **MCP Integration**: Dynamic authentication for Lokka MCP server

## Usage

### Initial Setup
1. Start the application (defaults to Custom Application Mode)
2. Sign in with your Microsoft account
3. Optionally enable Enhanced Graph Access Mode in Settings

### Switching Authentication Modes
1. Go to Settings → Entra Application Settings
2. Toggle "Enhanced Graph Access (Microsoft Graph PowerShell)" on/off
3. If enabling Enhanced Graph Access: Only Tenant ID is required
4. If using Custom Application: Enter Client ID and Tenant ID
5. MCP servers automatically restart with new authentication mode
6. All modes use delegated permissions with user context

The SettingsDialog now includes cache management controls, permission visibility, and duplicate models are properly handled through both API-level deduplication and intelligent caching.
