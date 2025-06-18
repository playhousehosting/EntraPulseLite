# LLM Provider Configuration Synchronization Fix

## Issue Description
The application was experiencing a configuration mismatch where:
- The UI displayed Azure OpenAI as the "Default Provider" (indicated by blue star)
- But the actual LLM service was using Anthropic for chat requests
- Console logs showed `provider: 'anthropic'` while Azure OpenAI was configured as default

## Root Cause Analysis
The issue occurred due to inconsistency between two configuration fields:
1. **Main provider field** (`config.llm.provider`): Used by LLM service for actual requests
2. **Default cloud provider field** (`config.llm.defaultCloudProvider`): Used by UI to show default status

### The Problem Flow:
1. User sets Azure OpenAI as default provider via UI
2. `defaultCloudProvider` field gets set to `'azure-openai'`
3. However, the main `provider` field remained as `'anthropic'`
4. LLM service initialization logic falls back to stored config when `getDefaultCloudProvider()` returns null
5. This happens because the main provider and default provider are inconsistent

## Solution Implemented

### 1. Enhanced `setDefaultCloudProvider` Method
Updated the method in `ConfigService.ts` to maintain consistency:

```typescript
setDefaultCloudProvider(provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'): void {
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
```

### 2. Configuration Inconsistency Detection
Added logic in `main.ts` during service initialization to detect and fix existing inconsistencies:

```typescript
// Check for configuration inconsistency and fix it
if (this.config.llm.defaultCloudProvider && this.config.llm.provider !== this.config.llm.defaultCloudProvider) {
  console.log(`[Main] Configuration inconsistency detected: main provider (${this.config.llm.provider}) != default provider (${this.config.llm.defaultCloudProvider})`);
  console.log(`[Main] Fixing configuration: setting main provider to match default provider`);
  
  // Fix the inconsistency by updating the main provider to match the default
  const fixedConfig = this.configService.getLLMConfig();
  const defaultProvider = fixedConfig.defaultCloudProvider;
  
  if (defaultProvider) {
    fixedConfig.provider = defaultProvider as 'openai' | 'anthropic' | 'gemini' | 'azure-openai' | 'ollama' | 'lmstudio';
    
    // Update model to match the cloud provider's model if available
    if (fixedConfig.cloudProviders?.[defaultProvider]?.model) {
      fixedConfig.model = fixedConfig.cloudProviders[defaultProvider].model;
    }
    
    this.configService.saveLLMConfig(fixedConfig);
    this.config.llm = fixedConfig; // Update local config object
    
    console.log(`[Main] ✅ Configuration fixed: main provider now set to ${fixedConfig.provider}`);
  }
}
```

### 3. Enhanced Debug Logging
Added comprehensive logging to track the configuration state:

```typescript
console.log('[Main] Default cloud provider debug:', {
  defaultCloudProvider: defaultCloudProvider,
  currentLLMConfig: {
    provider: this.config.llm.provider,
    model: this.config.llm.model,
    hasCloudProviders: !!this.config.llm.cloudProviders,
    cloudProviderKeys: this.config.llm.cloudProviders ? Object.keys(this.config.llm.cloudProviders) : [],
    defaultCloudProviderField: this.config.llm.defaultCloudProvider
  }
});
```

## Expected Results

### Before Fix:
```
[ConfigService] getLLMConfig - Retrieved config: {
  provider: 'anthropic',
  model: 'claude-3-7-sonnet-latest',
  defaultCloudProvider: 'azure-openai'
}
⚠️ No default cloud provider configured, using stored LLM config
basicChat called with provider: anthropic
```

### After Fix:
```
[Main] Configuration inconsistency detected: main provider (anthropic) != default provider (azure-openai)
[Main] ✅ Configuration fixed: main provider now set to azure-openai
🔄 Using default cloud provider for LLM: azure-openai Model: gpt-4o
basicChat called with provider: azure-openai
```

## Verification Steps
1. **Check UI**: Azure OpenAI should show blue star (default provider)
2. **Check Logs**: LLM requests should use `provider: azure-openai`
3. **Configuration Consistency**: `provider` field should match `defaultCloudProvider` field
4. **Model Selection**: Model should match the cloud provider's configured model

## Long-term Prevention
- The enhanced `setDefaultCloudProvider` method ensures future changes maintain consistency
- Startup detection logic fixes any legacy configuration inconsistencies
- Debug logging helps identify configuration issues during development

## Impact
This fix ensures that:
- The UI accurately reflects the actually used LLM provider
- User expectations align with actual behavior
- Configuration state remains consistent across application restarts
- No unexpected provider switching occurs during runtime
