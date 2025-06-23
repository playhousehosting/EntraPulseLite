# Context-Aware Configuration System

## Overview

The EntraPulse Lite application features a secure, context-aware configuration system that handles dual authentication modes seamlessly. Users can switch between authentication modes at runtime without requiring application restart.

## Authentication Modes

### 1. **User Token Mode (Default)**
- **Authentication**: Delegated user permissions via interactive login
- **Storage Location**: User-specific configuration (`users.user_{userId}` key in store)
- **API Keys**: Isolated per user account
- **Use Case**: Individual users with personal LLM configurations
- **Permissions**: Progressive permission model starting with `User.Read`

### 2. **Application Credentials Mode**
- **Authentication**: Client credentials flow using app registration
- **Storage Location**: Application-level configuration (`application` key in store)
- **API Keys**: Stored securely for system-wide access
- **Use Case**: IT administrators, enterprise scenarios, enhanced permissions
- **Configuration**: Requires `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID`

### 🔄 **Runtime Mode Switching**
Users can switch between authentication modes in Settings → Entra Configuration:
- Toggle between "Use User Token" and "Use Application Credentials"
- Automatic MCP server restart when switching modes
- Configuration context automatically switches
- No application restart required

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
  application: {           // Application Credentials mode
    llm: { ... },
    modelCache: { ... },
    statusMonitoring: {    // LLM Status Monitoring settings
      pollingInterval: 5000,
      lastCheckTime: "2023-11-01T12:00:00Z",
      localLLMAvailable: true
    },
    entra: {              // Application-level Entra config
      clientId: "...",
      clientSecret: "...",
      tenantId: "...",
      useApplicationCredentials: true
    }
  },
  users: {
    "user_12345": {        // User Token mode configurations
      llm: { ... },
      modelCache: { ... },
      entra: {             // User-specific preferences
        useApplicationCredentials: false
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

1. **🔒 Security**: API keys are isolated by authentication context
2. **👥 Dual Authentication**: Support for both user token and application credentials modes
3. **⚡ Performance**: Intelligent caching reduces API calls
4. **🔄 Runtime Switching**: Switch authentication modes without restart
5. **🧹 Clean Separation**: No cross-contamination between auth mode configs
6. **💾 Persistence**: Configuration survives app restarts
7. **🎯 Progressive Permissions**: Smart permission requests in user token mode

## Current Status

- ✅ **User Token Mode**: Fully implemented with progressive permissions
- ✅ **Application Credentials Mode**: Full client credentials support
- ✅ **Runtime Mode Switching**: Toggle between modes in UI
- ✅ **Secure Storage**: Encrypted configuration with electron-store
- ✅ **Model Caching**: 24-hour cache with deduplication
- ✅ **Context Management**: Automatic switching based on auth mode
- ✅ **MCP Integration**: Dynamic authentication for Lokka MCP server

## Usage

### Initial Setup
1. Start the application (defaults to User Token Mode)
2. Sign in with your Microsoft account
3. Optionally switch to Application Credentials Mode in Settings

### Switching Authentication Modes
1. Go to Settings → Entra Configuration
2. Toggle "Use Application Credentials" on/off
3. If enabling: Enter Client ID, Client Secret, and Tenant ID
4. If disabling: Keep credentials for future use or clear them
5. MCP servers automatically restart with new authentication mode

The SettingsDialog now includes cache management controls, and duplicate models are properly handled through both API-level deduplication and intelligent caching.
