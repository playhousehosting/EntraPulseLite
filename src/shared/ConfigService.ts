// ConfigService.ts
// Secure configuration management service with user-context awareness

import Store from 'electron-store';
import { LLMConfig } from '../types';

interface UserConfigSchema {
  llm: LLMConfig;
  lastUsedProvider: string;
  modelCache: {
    [provider: string]: {
      models: string[];
      lastFetched: string;
      cacheExpiry: number; // 24 hours in milliseconds
    };
  };
}

interface AppConfigSchema {
  // Global application settings (admin/client-credentials mode)
  application: UserConfigSchema;
  
  // User-specific configurations (interactive mode)
  users: {
    [userKey: string]: UserConfigSchema;
  };
  
  // Metadata
  currentAuthMode: 'client-credentials' | 'interactive';
  currentUserKey?: string;
}

export class ConfigService {
  private store: any; // Use any to avoid type conflicts with electron-store
  private currentAuthMode: 'client-credentials' | 'interactive' = 'client-credentials';
  private currentUserKey?: string;  constructor() {
    this.store = new Store({
      name: 'entrapulse-lite-config',
      encryptionKey: 'entrapulse-lite-secret-key-2025', // In production, this should be generated or from env
      defaults: {
        application: {
          llm: {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            apiKey: '',
            baseUrl: '',
            temperature: 0.2,
            maxTokens: 2048,
            organization: ''
          },
          lastUsedProvider: 'anthropic',
          modelCache: {}
        },
        users: {},
        currentAuthMode: 'client-credentials'
      }
    });

    // Load current context from store
    this.currentAuthMode = this.store.get('currentAuthMode');
    this.currentUserKey = this.store.get('currentUserKey');
  }

  /**
   * Set the authentication context
   * @param mode Authentication mode (client-credentials for admin, interactive for users)
   * @param userInfo User information for interactive mode
   */
  setAuthenticationContext(mode: 'client-credentials' | 'interactive', userInfo?: { id: string, email?: string }) {
    this.currentAuthMode = mode;
    this.store.set('currentAuthMode', mode);

    if (mode === 'interactive' && userInfo) {
      // Create a unique key for this user (using their ID)
      this.currentUserKey = `user_${userInfo.id}`;
      this.store.set('currentUserKey', this.currentUserKey);

      // Initialize user config if it doesn't exist
      const users = this.store.get('users');
      if (!users[this.currentUserKey]) {
        users[this.currentUserKey] = {
          llm: {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            apiKey: '',
            baseUrl: '',
            temperature: 0.2,
            maxTokens: 2048,
            organization: ''
          },
          lastUsedProvider: 'anthropic',
          modelCache: {}
        };
        this.store.set('users', users);
      }
    } else if (mode === 'client-credentials') {
      this.currentUserKey = undefined;
      this.store.delete('currentUserKey');
    }
  }
  /**
   * Get the current user configuration context
   */
  private getCurrentContext(): UserConfigSchema {
    try {
      if (this.currentAuthMode === 'client-credentials') {
        const config = this.store.get('application');
        return config || this.getDefaultUserConfig();
      } else if (this.currentAuthMode === 'interactive' && this.currentUserKey) {
        const users = this.store.get('users');
        if (users && users[this.currentUserKey]) {
          return users[this.currentUserKey];
        }
        // Fallback to application config
        const appConfig = this.store.get('application');
        return appConfig || this.getDefaultUserConfig();
      }
      // Default fallback
      const config = this.store.get('application');
      return config || this.getDefaultUserConfig();
    } catch (error) {
      // If store access fails, return default configuration
      console.warn('Store access error, falling back to defaults:', error);
      return this.getDefaultUserConfig();
    }
  }

  /**
   * Get default user configuration
   */
  private getDefaultUserConfig(): UserConfigSchema {
    return {
      llm: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: '',
        baseUrl: '',
        temperature: 0.2,
        maxTokens: 2048,
        organization: ''
      },
      lastUsedProvider: 'anthropic',
      modelCache: {}
    };
  }
  /**
   * Save the current user configuration context
   */
  private saveCurrentContext(config: UserConfigSchema): void {
    try {
      if (this.currentAuthMode === 'client-credentials') {
        this.store.set('application', config);
      } else if (this.currentAuthMode === 'interactive' && this.currentUserKey) {
        const users = this.store.get('users') || {};
        users[this.currentUserKey] = config;
        this.store.set('users', users);
      } else {
        // Fallback to application config
        this.store.set('application', config);
      }
    } catch (error) {
      console.warn('Error saving configuration:', error);
      // In a real application, you might want to throw this error or handle it differently
      // For now, we'll just log it to maintain the expected behavior
    }
  }
  /**
   * Get the current LLM configuration (context-aware)
   */
  getLLMConfig(): LLMConfig {
    try {
      const context = this.getCurrentContext();
      return context?.llm || this.getDefaultUserConfig().llm;
    } catch (error) {
      console.warn('Error getting LLM config, falling back to defaults:', error);
      return this.getDefaultUserConfig().llm;
    }
  }

  /**
   * Save LLM configuration securely (context-aware)
   */
  saveLLMConfig(config: LLMConfig): void {
    const currentContext = this.getCurrentContext();
    currentContext.llm = config;
    currentContext.lastUsedProvider = config.provider;
    this.saveCurrentContext(currentContext);
  }

  /**
   * Get cached models for a provider (context-aware)
   */
  getCachedModels(provider: string): string[] | null {
    const context = this.getCurrentContext();
    const cache = context.modelCache;
    const providerCache = cache[provider];
    
    if (!providerCache) {
      return null;
    }

    // Check if cache is expired (24 hours)
    const now = Date.now();
    const cacheAge = now - new Date(providerCache.lastFetched).getTime();
    const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

    if (cacheAge > cacheExpiry) {
      // Cache expired, remove it
      delete cache[provider];
      this.saveCurrentContext(context);
      return null;
    }

    return providerCache.models;
  }

  /**
   * Cache models for a provider (context-aware)
   */
  cacheModels(provider: string, models: string[]): void {
    const context = this.getCurrentContext();
    const cache = context.modelCache;
    cache[provider] = {
      models: [...new Set(models)], // Remove duplicates
      lastFetched: new Date().toISOString(),
      cacheExpiry: 24 * 60 * 60 * 1000 // 24 hours
    };
    this.saveCurrentContext(context);
  }

  /**
   * Clear model cache for a specific provider (context-aware)
   */
  clearModelCache(provider?: string): void {
    const context = this.getCurrentContext();
    if (provider) {
      delete context.modelCache[provider];
    } else {
      // Clear all caches
      context.modelCache = {};
    }
    this.saveCurrentContext(context);
  }

  /**
   * Get the last used provider (context-aware)
   */
  getLastUsedProvider(): string {
    return this.getCurrentContext().lastUsedProvider;
  }

  /**
   * Check if API key exists for a provider (context-aware)
   */
  hasApiKey(provider: string): boolean {
    const config = this.getLLMConfig();
    return config.provider === provider && !!config.apiKey && config.apiKey.trim().length > 0;
  }

  /**
   * Get authentication context information
   */
  getAuthenticationContext(): { mode: 'client-credentials' | 'interactive', userKey?: string } {
    return {
      mode: this.currentAuthMode,
      userKey: this.currentUserKey
    };
  }
  /**
   * Backup configuration to file (for debugging) - sanitized
   */
  exportConfig(): any {
    // Get the current store data
    const appConfig = {
      application: this.store.get('application'),
      users: this.store.get('users'),
      currentAuthMode: this.store.get('currentAuthMode'),
      currentUserKey: this.store.get('currentUserKey')
    };
    
    // Sanitize API keys for export
    const sanitized = JSON.parse(JSON.stringify(appConfig));
    
    // Sanitize application config
    if (sanitized.application?.llm?.apiKey) {
      sanitized.application.llm.apiKey = '[REDACTED]';
    }
    
    // Sanitize user configs
    if (sanitized.users) {
      Object.keys(sanitized.users).forEach(userKey => {
        if (sanitized.users[userKey]?.llm?.apiKey) {
          sanitized.users[userKey].llm.apiKey = '[REDACTED]';
        }
      });
    }
    
    return sanitized;
  }

  /**
   * Clear all stored configuration (reset to defaults)
   */
  resetConfig(): void {
    this.store.clear();
    this.currentAuthMode = 'client-credentials';
    this.currentUserKey = undefined;
  }
  /**
   * Clear configuration for current user only
   */
  resetCurrentUserConfig(): void {
    if (this.currentAuthMode === 'interactive' && this.currentUserKey) {
      const users = this.store.get('users');
      delete users[this.currentUserKey];
      this.store.set('users', users);
    } else {
      // Reset application config to defaults
      const defaultAppConfig: UserConfigSchema = {
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          apiKey: '',
          baseUrl: '',
          temperature: 0.2,
          maxTokens: 2048,
          organization: ''
        },
        lastUsedProvider: 'anthropic',
        modelCache: {}
      };
      this.store.set('application', defaultAppConfig);
    }
  }
}
