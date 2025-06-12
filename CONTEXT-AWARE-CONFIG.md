# Context-Aware Configuration System

## Overview

The EntraPulse Lite application now features a secure, context-aware configuration system that handles different authentication modes and user contexts properly.

## Authentication Contexts

### 1. **Application/Admin Mode (Client Credentials)**
- **When**: The app runs with `CLIENT_ID`, `CLIENT_SECRET`, and `TENANT_ID` configured
- **Storage Location**: Application-level configuration (`application` key in store)
- **API Keys**: Stored securely for system-wide access
- **Use Case**: IT administrators managing tenant-wide operations

### 2. **Interactive User Mode** 
- **When**: Users sign in interactively (not implemented yet, but architecture ready)
- **Storage Location**: User-specific configuration (`users.user_{userId}` key in store)
- **API Keys**: Isolated per user account
- **Use Case**: Individual users with their own LLM configurations

## Features

### 🔐 **Secure Storage**
- Uses `electron-store` with encryption key
- API keys stored encrypted on disk
- Separate configuration contexts prevent cross-contamination

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
  application: {           // Admin/Client Credentials mode
    llm: { ... },
    modelCache: { ... }
  },
  users: {
    "user_12345": {        // Individual user configurations
      llm: { ... },
      modelCache: { ... }
    }
  },
  currentAuthMode: "client-credentials" | "interactive",
  currentUserKey: "user_12345" | undefined
}
```

### Key Methods
- `setAuthenticationContext(mode, userInfo?)` - Switch contexts
- `getLLMConfig()` - Get context-aware configuration
- `saveLLMConfig(config)` - Save to appropriate context
- `getCachedModels(provider)` - Context-aware model cache
- `clearModelCache(provider?)` - Clear cache for current context

## Benefits

1. **🔒 Security**: API keys are isolated by authentication context
2. **👥 Multi-User Ready**: Architecture supports future interactive authentication
3. **⚡ Performance**: Intelligent caching reduces API calls
4. **🧹 Clean Separation**: No cross-contamination between admin and user configs
5. **💾 Persistence**: Configuration survives app restarts

## Current Status

- ✅ **Application/Admin Mode**: Fully implemented and tested
- ✅ **Secure Storage**: Encrypted configuration with electron-store
- ✅ **Model Caching**: 24-hour cache with deduplication
- ✅ **Context Management**: Automatic switching based on auth mode
- 🚧 **Interactive Mode**: Architecture ready, implementation pending

## Usage

When the app starts in client credentials mode (current default), all LLM configurations including API keys are stored in the application context. If/when interactive authentication is implemented, each user will have their own isolated configuration space.

The SettingsDialog now includes cache management controls, and duplicate models are properly handled through both API-level deduplication and intelligent caching.
