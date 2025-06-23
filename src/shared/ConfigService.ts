// ConfigService.ts
// Secure configuration management service with user-context awareness

import Store from 'electron-store';
import { LLMConfig, CloudLLMProviderConfig, EntraConfig } from '../types';

interface UserConfigSchema {
  llm: LLMConfig;
  lastUsedProvider: string;
  entraConfig?: EntraConfig;
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
  private currentUserKey?: string;
  private isAuthenticationVerified: boolean = false; // Security flag to prevent data exposure
  private isServiceLevelAccess: boolean = false; // Flag for trusted main process access

  constructor() {
    this.store = new Store({
      name: 'entrapulse-lite-config',
      encryptionKey: 'entrapulse-lite-secret-key-2025', // In production, this should be generated or from env
      defaults: {        application: {
          llm: {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            apiKey: '',
            baseUrl: '',
            temperature: 0.2,
            maxTokens: 4096,
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
  }  /**
   * Set service-level access for the main process (trusted environment)
   * @param hasAccess True if this is the main process or other trusted context
   */
  setServiceLevelAccess(hasAccess: boolean): void {
    this.isServiceLevelAccess = hasAccess;
    console.log(`[ConfigService] Service level access set to: ${hasAccess}`);
  }

  /**
   * Verify that authentication has occurred before exposing sensitive data
   * @param isAuthenticated True if user is authenticated
   */
  setAuthenticationVerified(isAuthenticated: boolean): void {
    this.isAuthenticationVerified = isAuthenticated;
    console.log(`[ConfigService] Authentication verified set to: ${isAuthenticated}`);
  }

  /**
   * Set the authentication context
   * @param mode Authentication mode (client-credentials for admin, interactive for users)
   * @param userInfo User information for interactive mode
   */
  setAuthenticationContext(mode: 'client-credentials' | 'interactive', userInfo?: { id: string, email?: string }) {
    console.log(`[ConfigService] setAuthenticationContext called - Mode: ${mode}, UserInfo:`, userInfo ? 'Yes' : 'No');
    console.log(`[ConfigService] Previous context - Mode: ${this.currentAuthMode}, UserKey: ${this.currentUserKey}`);
    
    // Only allow setting authentication context if authentication is verified
    if (!this.isAuthenticationVerified) {
      console.log(`[ConfigService] 🔒 Authentication context change blocked - authentication not verified`);
      return;
    }this.currentAuthMode = mode;
    this.store.set('currentAuthMode', mode);

    if (mode === 'interactive' && userInfo) {
      // Create a unique key for this user (using their ID)
      this.currentUserKey = `user_${userInfo.id}`;
      this.store.set('currentUserKey', this.currentUserKey);

      // Initialize user config if it doesn't exist
      const users = this.store.get('users');
      if (!users[this.currentUserKey]) {
        console.log(`[ConfigService] Creating new user config for ${this.currentUserKey}`);
        users[this.currentUserKey] = {          llm: {
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            apiKey: '',
            baseUrl: '',
            temperature: 0.2,
            maxTokens: 4096,
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
    
    console.log(`[ConfigService] New context - Mode: ${this.currentAuthMode}, UserKey: ${this.currentUserKey}`);
  }  /**
   * Get the current user configuration context
   */
  private getCurrentContext(): UserConfigSchema {
    try {      console.log(`[ConfigService] getCurrentContext - Mode: ${this.currentAuthMode}, UserKey: ${this.currentUserKey}`);
      
      // Security check: If authentication is not verified AND this is not service-level access, return safe defaults
      if (!this.isAuthenticationVerified && !this.isServiceLevelAccess) {
        console.log(`[ConfigService] 🔒 Authentication not verified and no service access - returning safe defaults`);
        return this.getDefaultUserConfig();
      }
      
      if (this.currentAuthMode === 'client-credentials') {
        const config = this.store.get('application');
        console.log(`[ConfigService] Using application config - Has cloudProviders:`, !!config?.llm?.cloudProviders);
        return config || this.getDefaultUserConfig();
      } else if (this.currentAuthMode === 'interactive' && this.currentUserKey) {
        const users = this.store.get('users');
        if (users && users[this.currentUserKey]) {
          console.log(`[ConfigService] Using user config for ${this.currentUserKey} - Has cloudProviders:`, !!users[this.currentUserKey]?.llm?.cloudProviders);
          return users[this.currentUserKey];
        }
        // Fallback to application config
        const appConfig = this.store.get('application');
        console.log(`[ConfigService] Fallback to application config - Has cloudProviders:`, !!appConfig?.llm?.cloudProviders);
        return appConfig || this.getDefaultUserConfig();
      }
      // Default fallback
      const config = this.store.get('application');
      console.log(`[ConfigService] Default fallback to application config - Has cloudProviders:`, !!config?.llm?.cloudProviders);
      return config || this.getDefaultUserConfig();
    } catch (error) {
      // If store access fails, return default configuration
      console.warn('Store access error, falling back to defaults:', error);
      return this.getDefaultUserConfig();
    }
  }
  /**
   * Get default user configuration - safe defaults with no sensitive data
   */
  private getDefaultUserConfig(): UserConfigSchema {
    return {
      llm: {
        provider: 'anthropic' as const,
        model: 'claude-3-5-sonnet-20241022',
        apiKey: '', // Always empty for security
        baseUrl: '',
        temperature: 0.2,
        maxTokens: 4096,
        organization: '',
        preferLocal: true, // Prefer local for security
        // No cloudProviders - prevents exposure of sensitive data
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
  }  /**
   * Get the current LLM configuration (context-aware)
   */  getLLMConfig(): LLMConfig {
    try {
      const context = this.getCurrentContext();
      const config = context?.llm || this.getDefaultUserConfig().llm;
      
      console.log('[ConfigService] getLLMConfig - Retrieved config:', {
        provider: config.provider,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        preferLocal: config.preferLocal,
        hasCloudProviders: !!config.cloudProviders
      });
      
      // Add debugging for Azure OpenAI specifically
      if (config.cloudProviders?.['azure-openai']) {
        console.log(`[ConfigService] getLLMConfig - Azure OpenAI found:`, {
          hasApiKey: !!config.cloudProviders['azure-openai'].apiKey,
          model: config.cloudProviders['azure-openai'].model,
          baseUrl: config.cloudProviders['azure-openai'].baseUrl
        });
      } else {
        console.log(`[ConfigService] getLLMConfig - No Azure OpenAI config found`);
      }
      
      return config;
    } catch (error) {
      console.warn('Error getting LLM config, falling back to defaults:', error);
      return this.getDefaultUserConfig().llm;
    }
  }
  /**
   * Save LLM configuration securely (context-aware)
   */  saveLLMConfig(config: LLMConfig): void {
    console.log('[ConfigService] saveLLMConfig - Input config:', {
      provider: config.provider,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      preferLocal: config.preferLocal,
      hasCloudProviders: !!config.cloudProviders,
      cloudProviderKeys: config.cloudProviders ? Object.keys(config.cloudProviders) : 'none',
      inputDefaultProvider: config.defaultCloudProvider
    });
    
    const currentContext = this.getCurrentContext();
    
    // Preserve existing cloud providers when saving LLM config
    const existingLlmConfig = currentContext.llm || {};
    const preservedCloudProviders = existingLlmConfig.cloudProviders;
    const preservedDefaultCloudProvider = existingLlmConfig.defaultCloudProvider;
    
    console.log('[ConfigService] saveLLMConfig - Existing config:', {
      existingModel: existingLlmConfig.model,
      existingTemperature: existingLlmConfig.temperature,
      existingMaxTokens: existingLlmConfig.maxTokens,
      existingPreferLocal: existingLlmConfig.preferLocal,
      hasExistingCloudProviders: !!preservedCloudProviders,
      existingProviderKeys: preservedCloudProviders ? Object.keys(preservedCloudProviders) : 'none',
      existingDefaultProvider: preservedDefaultCloudProvider
    });    // Merge cloud providers: prioritize incoming config over existing config
    let finalCloudProviders: LLMConfig['cloudProviders'] = {};
    
    if (config.cloudProviders && Object.keys(config.cloudProviders).length > 0) {
      // If incoming config has cloud providers, use them (preserving existing ones that aren't overwritten)
      
      // First add preserved configs
      if (preservedCloudProviders) {
        Object.entries(preservedCloudProviders).forEach(([key, value]) => {
          if (value) {
            const providerKey = key as 'openai' | 'anthropic' | 'gemini' | 'azure-openai';
            // Use JSON stringify/parse for deep copy to avoid reference issues
            finalCloudProviders![providerKey] = JSON.parse(JSON.stringify(value));
          }
        });
      }
      
      // Then add new configs (overriding existing ones)
      Object.entries(config.cloudProviders).forEach(([key, value]) => {
        if (value) {
          const providerKey = key as 'openai' | 'anthropic' | 'gemini' | 'azure-openai';
          // Use JSON stringify/parse for deep copy to avoid reference issues
          finalCloudProviders![providerKey] = JSON.parse(JSON.stringify(value));
            // Special handling for Azure OpenAI
          if (key === 'azure-openai' && value.baseUrl && finalCloudProviders && finalCloudProviders[providerKey]) {
            // Explicitly set the baseUrl again to ensure it's preserved exactly as provided
            finalCloudProviders[providerKey].baseUrl = value.baseUrl;
            console.log(`[ConfigService] saveLLMConfig - Azure OpenAI URL being preserved: ${finalCloudProviders[providerKey].baseUrl}`);
          }
        }
      });
    } else {
      // If incoming config has no cloud providers, create a deep copy of existing ones
      if (preservedCloudProviders) {
        Object.entries(preservedCloudProviders).forEach(([key, value]) => {
          if (value) {
            const providerKey = key as 'openai' | 'anthropic' | 'gemini' | 'azure-openai';
            // Use JSON stringify/parse for deep copy to avoid reference issues
            finalCloudProviders![providerKey] = JSON.parse(JSON.stringify(value));
          }
        });
      } else {
        // If there are no cloud providers at all, set to undefined
        finalCloudProviders = undefined;
      }
    }

    // Determine the final default cloud provider
    let finalDefaultCloudProvider;
    if (config.defaultCloudProvider) {
      // If incoming config explicitly sets a default provider, use it (if it exists in the merged config)
      if (finalCloudProviders && finalCloudProviders[config.defaultCloudProvider]) {
        finalDefaultCloudProvider = config.defaultCloudProvider;
        console.log('[ConfigService] saveLLMConfig - Using incoming default provider:', config.defaultCloudProvider);
      } else {
        // Incoming default provider doesn't exist in cloud providers, keep existing
        finalDefaultCloudProvider = preservedDefaultCloudProvider;
        console.log('[ConfigService] saveLLMConfig - Incoming default provider not found, keeping existing:', preservedDefaultCloudProvider);
      }
    } else {
      // No incoming default provider specified, keep existing
      finalDefaultCloudProvider = preservedDefaultCloudProvider;
      console.log('[ConfigService] saveLLMConfig - No incoming default provider, keeping existing:', preservedDefaultCloudProvider);
    }

    // Create the final configuration, ensuring all values are preserved
    currentContext.llm = {
      ...config,
      // Use the merged cloud provider configurations
      cloudProviders: finalCloudProviders,
      // Use the determined default cloud provider
      defaultCloudProvider: finalDefaultCloudProvider
    };
    currentContext.lastUsedProvider = config.provider;
    
    console.log('[ConfigService] saveLLMConfig - Final config being saved:', {
      provider: currentContext.llm.provider,
      model: currentContext.llm.model,
      temperature: currentContext.llm.temperature,
      maxTokens: currentContext.llm.maxTokens,
      preferLocal: currentContext.llm.preferLocal,
      hasCloudProviders: !!currentContext.llm.cloudProviders,
      finalProviderKeys: currentContext.llm.cloudProviders ? Object.keys(currentContext.llm.cloudProviders) : 'none',
      finalDefaultProvider: currentContext.llm.defaultCloudProvider
    });
    
    this.saveCurrentContext(currentContext);
    
    // Verify the save worked by reading it back
    const verifyContext = this.getCurrentContext();
    console.log('[ConfigService] saveLLMConfig - Verification read back:', {
      provider: verifyContext.llm?.provider,
      model: verifyContext.llm?.model,
      temperature: verifyContext.llm?.temperature,
      maxTokens: verifyContext.llm?.maxTokens,
      preferLocal: verifyContext.llm?.preferLocal
    });
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
  }  /**
   * Save a cloud provider configuration
   */  saveCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai', config: CloudLLMProviderConfig): void {
    console.log(`[ConfigService] Saving cloud provider config for ${provider}:`, {
      hasApiKey: !!config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      authMode: this.currentAuthMode,
      userKey: this.currentUserKey
    });
    
    // Special handling for Azure OpenAI to ensure the full URL is saved
    if (provider === 'azure-openai' && config.baseUrl) {
      // Make sure we're saving the complete URL (not just the base)
      console.log(`[ConfigService] Azure OpenAI URL before save: "${config.baseUrl}"`);
      
      // Validate the URL has the essential components
      if (!config.baseUrl.includes('/chat/completions') || 
          !config.baseUrl.includes('api-version=') ||
          !config.baseUrl.includes('/deployments/')) {
        console.warn(`[ConfigService] Warning: Azure OpenAI URL may not be complete: ${config.baseUrl}`);
      }
    }
    
    const currentConfig = this.getLLMConfig();
    
    // Initialize cloudProviders if it doesn't exist
    if (!currentConfig.cloudProviders) {
      currentConfig.cloudProviders = {};
    }
    
    // Create a deep copy of the config to avoid potential reference issues
    const configCopy: CloudLLMProviderConfig = JSON.parse(JSON.stringify({
      ...config,
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      organization: config.organization
    }));
    
    // Extra protection for Azure OpenAI URL to ensure it's not truncated
    if (provider === 'azure-openai' && config.baseUrl) {
      // Explicitly set the baseUrl again to ensure it's preserved exactly as provided
      configCopy.baseUrl = config.baseUrl;
      console.log(`[ConfigService] Azure OpenAI URL explicitly preserved as: "${configCopy.baseUrl}"`);
    }
    
    // Save the cloud provider config - ensure it's a completely new object
    currentConfig.cloudProviders[provider] = configCopy;
    
    // If this is the first cloud provider or no default is set, make it the default
    if (!currentConfig.defaultCloudProvider) {
      currentConfig.defaultCloudProvider = provider;
    }
    
    console.log(`[ConfigService] Before saving, cloudProviders:`, Object.keys(currentConfig.cloudProviders));
    console.log(`[ConfigService] Default provider:`, currentConfig.defaultCloudProvider);
    
    if (provider === 'azure-openai' && currentConfig.cloudProviders[provider]) {
      console.log(`[ConfigService] Azure OpenAI config being saved:`, {
        baseUrl: currentConfig.cloudProviders[provider].baseUrl,
        model: currentConfig.cloudProviders[provider].model,
        hasApiKey: !!currentConfig.cloudProviders[provider].apiKey
      });
    }
    
    this.saveLLMConfig(currentConfig);
    
    // Verify the save
    const savedConfig = this.getLLMConfig();
    console.log(`[ConfigService] After saving, verification - cloudProviders:`, Object.keys(savedConfig.cloudProviders || {}));
    console.log(`[ConfigService] After saving, verification - ${provider} config exists:`, !!savedConfig.cloudProviders?.[provider]);
    
    if (provider === 'azure-openai' && savedConfig.cloudProviders?.[provider]) {
      console.log(`[ConfigService] Azure OpenAI verified saved URL: "${savedConfig.cloudProviders[provider].baseUrl}"`);
    }
  }/**
   * Get a specific cloud provider configuration
   */  getCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'): CloudLLMProviderConfig | null {
    console.log(`[ConfigService] Getting cloud provider config for ${provider}`);
    
    const config = this.getLLMConfig();
    const result = config.cloudProviders?.[provider] || null;
    
    console.log(`[ConfigService] Found ${provider} config:`, !!result);
    if (result && provider === 'azure-openai') {
      console.log(`[ConfigService] Azure OpenAI config details:`, {
        hasApiKey: !!result.apiKey,
        model: result.model,
        baseUrl: result.baseUrl
      });
      
      // Add enhanced logging for Azure OpenAI endpoint URL
      if (result.baseUrl) {
        console.log(`[ConfigService] Azure OpenAI loaded full URL: "${result.baseUrl}"`);
        
        // Check URL format
        if (!result.baseUrl.includes('/chat/completions')) {
          console.warn('[ConfigService] Warning: Azure OpenAI URL is missing /chat/completions path');
        }
        if (!result.baseUrl.includes('api-version=')) {
          console.warn('[ConfigService] Warning: Azure OpenAI URL is missing api-version parameter');
        }
        if (!result.baseUrl.includes('/deployments/')) {
          console.warn('[ConfigService] Warning: Azure OpenAI URL is missing /deployments/ path');
        }
      } else {
        console.warn('[ConfigService] Warning: Azure OpenAI config missing baseUrl');
      }
    }
    
    // Create a deep copy to avoid reference issues
    return result ? { ...result } : null;
  }
  /**
   * Get all configured cloud providers
   */  getConfiguredCloudProviders(): Array<{ provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'; config: CloudLLMProviderConfig }> {
    const config = this.getLLMConfig();
    const providers: Array<{ provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'; config: CloudLLMProviderConfig }> = [];
    
    if (config.cloudProviders) {
      Object.entries(config.cloudProviders).forEach(([provider, providerConfig]) => {
        if (providerConfig) {
          // Create a deep copy of the config
          const configCopy: CloudLLMProviderConfig = {
            ...providerConfig,
            provider: providerConfig.provider,
            model: providerConfig.model,
            apiKey: providerConfig.apiKey,
            baseUrl: providerConfig.baseUrl,
            temperature: providerConfig.temperature,
            maxTokens: providerConfig.maxTokens,
            organization: providerConfig.organization
          };
          
          providers.push({
            provider: provider as 'openai' | 'anthropic' | 'gemini' | 'azure-openai',
            config: configCopy
          });
          
          // Special debug logging for Azure OpenAI
          if (provider === 'azure-openai') {
            console.log(`[ConfigService] getConfiguredCloudProviders - Azure OpenAI loaded:`, {
              baseUrl: configCopy.baseUrl,
              model: configCopy.model,
              hasApiKey: !!configCopy.apiKey
            });
          }
        }
      });
    }
    
    return providers;
  }
  /**
   * Set the default cloud provider
   */  setDefaultCloudProvider(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'): void {
    const config = this.getLLMConfig();
    
    // Verify the provider is configured
    if (!config.cloudProviders?.[provider]) {
      throw new Error(`Cloud provider ${provider} is not configured`);
    }
    
    // Set the default cloud provider
    config.defaultCloudProvider = provider;
    
    // Also update the main provider field to match the default
    // This ensures consistency between the default and the active provider
    config.provider = provider;
    
    // If switching to a cloud provider, update the model to match the cloud provider's model
    if (config.cloudProviders[provider]?.model) {
      config.model = config.cloudProviders[provider].model;
    }
    
    console.log(`[ConfigService] Set default cloud provider: ${provider}, updated main provider to match`);
    
    this.saveLLMConfig(config);
  }
  /**
   * Get the default cloud provider configuration
   */
  getDefaultCloudProvider(): { provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'; config: CloudLLMProviderConfig } | null {
    const config = this.getLLMConfig();
    const defaultProvider = config.defaultCloudProvider;
    
    if (!defaultProvider || !config.cloudProviders?.[defaultProvider]) {
      return null;
    }
    
    return {
      provider: defaultProvider,
      config: config.cloudProviders[defaultProvider]
    };
  }
  /**
   * Remove a cloud provider configuration
   */
  removeCloudProviderConfig(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'): void {
    const config = this.getLLMConfig();
    
    if (config.cloudProviders?.[provider]) {
      delete config.cloudProviders[provider];
      
      // If this was the default provider, choose a new default
      if (config.defaultCloudProvider === provider) {
        const remainingProviders = Object.keys(config.cloudProviders) as Array<'openai' | 'anthropic' | 'gemini' | 'azure-openai'>;
        config.defaultCloudProvider = remainingProviders.length > 0 ? remainingProviders[0] : undefined;
      }
      
      this.saveLLMConfig(config);
    }
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
          provider: 'anthropic',          model: 'claude-3-5-sonnet-20241022',
          apiKey: '',
          baseUrl: '',
          temperature: 0.2,
          maxTokens: 4096,
          organization: ''
        },
        lastUsedProvider: 'anthropic',
        modelCache: {}
      };
      this.store.set('application', defaultAppConfig);
    }
  }

  /**
   * Get Entra application configuration
   * @returns Current Entra configuration or null if not set
   */
  getEntraConfig(): EntraConfig | null {
    if (!this.isAuthenticationVerified) {
      console.log('[ConfigService] 🔒 Access to Entra config blocked - authentication not verified');
      return null;
    }

    const config = this.getCurrentContext();
    return config.entraConfig || null;
  }

  /**
   * Save Entra application configuration
   * @param entraConfig Entra configuration to save
   */  saveEntraConfig(entraConfig: EntraConfig): void {
    if (!this.isAuthenticationVerified) {
      console.log('[ConfigService] 🔒 Save Entra config blocked - authentication not verified');
      return;
    }

    console.log('[ConfigService] saveEntraConfig - Input config:', {
      clientId: entraConfig.clientId ? '[REDACTED]' : 'none',
      tenantId: entraConfig.tenantId ? '[REDACTED]' : 'none',
      hasClientSecret: !!entraConfig.clientSecret,
      useApplicationCredentials: entraConfig.useApplicationCredentials
    });

    const currentConfig = this.getCurrentContext();
    currentConfig.entraConfig = entraConfig;
    this.saveCurrentContext(currentConfig);

    // Update authentication context based on new config
    this.updateAuthenticationContext();

    console.log('[ConfigService] saveEntraConfig - Configuration saved successfully');
  }
  /**
   * Clear Entra application configuration
   */
  clearEntraConfig(): void {
    if (!this.isAuthenticationVerified) {
      console.log('[ConfigService] 🔒 Clear Entra config blocked - authentication not verified');
      return;
    }

    const currentConfig = this.getCurrentContext();
    delete currentConfig.entraConfig;
    this.saveCurrentContext(currentConfig);

    console.log('[ConfigService] clearEntraConfig - Configuration cleared successfully');
  }

  /**
   * Get the user's authentication preference (token vs application credentials)
   */
  getAuthenticationPreference(): 'user-token' | 'application-credentials' {
    const entraConfig = this.getEntraConfig();
    const hasClientCredentials = entraConfig?.clientSecret && entraConfig?.clientId && entraConfig?.tenantId;
    
    if (entraConfig?.useApplicationCredentials && hasClientCredentials) {
      return 'application-credentials';
    }
    return 'user-token';
  }

  /**
   * Update authentication context based on Entra configuration
   */
  updateAuthenticationContext(): void {
    const entraConfig = this.getEntraConfig();
    const hasClientCredentials = entraConfig?.clientSecret && entraConfig?.clientId && entraConfig?.tenantId;
    const useAppCredentials = entraConfig?.useApplicationCredentials && hasClientCredentials;
    
    const authMode = useAppCredentials ? 'client-credentials' : 'interactive';
    this.setAuthenticationContext(authMode);
    
    console.log('[ConfigService] Updated authentication context:', {
      mode: authMode,
      useApplicationCredentials: useAppCredentials,
      hasClientCredentials
    });
  }
}
