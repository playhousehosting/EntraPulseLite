import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
  Alert,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  CircularProgress,
  Chip,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Paper,
  Radio,
  RadioGroup
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import { LLMConfig, CloudLLMProviderConfig, EntraConfig } from '../../types';

interface EnhancedSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  currentConfig: LLMConfig;
  onSave: (config: LLMConfig) => void;
}

interface CloudProviderState {
  provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai';
  config: CloudLLMProviderConfig;
  isDefault: boolean;
}

export const EnhancedSettingsDialog: React.FC<EnhancedSettingsDialogProps> = ({
  open,
  onClose,
  currentConfig,
  onSave
}) => {  const [config, setConfig] = useState<LLMConfig>(currentConfig);
  const [cloudProviders, setCloudProviders] = useState<CloudProviderState[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; details?: any } | null>(null);
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [isLoadingModels, setIsLoadingModels] = useState<Record<string, boolean>>({});
  const [modelFetchError, setModelFetchError] = useState<Record<string, string>>({});
  const [defaultCloudProvider, setDefaultCloudProvider] = useState<'openai' | 'anthropic' | 'gemini' | 'azure-openai' | null>(null);
  const [entraConfig, setEntraConfig] = useState<EntraConfig | null>(null);
  const [isLoadingEntraConfig, setIsLoadingEntraConfig] = useState(false);
  useEffect(() => {
    setConfig(currentConfig);
  }, [currentConfig]);
  useEffect(() => {
    if (open) {
      loadCloudProviders();
      loadEntraConfig();
    }
  }, [open]); // Only reload when dialog opens, not on every config change

  const loadCloudProviders = async () => {
    try {
      const electronAPI = window.electronAPI as any; // Temporary type assertion
      const configured = await electronAPI.config.getConfiguredCloudProviders();
      const defaultProvider = await electronAPI.config.getDefaultCloudProvider();
      
      setDefaultCloudProvider(defaultProvider?.provider || null);
      
      console.log('📋 [CloudProviders] Loading configured providers:', configured.map((p: { provider: string }) => p.provider));
      
      const providers: CloudProviderState[] = configured.map((item: { provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'; config: CloudLLMProviderConfig }) => {
        // Make a deep copy of the config
        const configCopy = { ...item.config };
        
        // Add enhanced logging for Azure OpenAI
        if (item.provider === 'azure-openai') {
          const baseUrl = item.config.baseUrl || '';
          console.log('🔍 [Azure OpenAI Debug] Loaded config:', {
            baseUrl: baseUrl,
            model: item.config.model,
            hasApiKey: !!item.config.apiKey,
            isValid: baseUrl.includes('/chat/completions') && baseUrl.includes('api-version=') && baseUrl.includes('/deployments/')
          });
          
          // Check URL format completeness
          const issues = [];
          if (!baseUrl.includes('/chat/completions')) {
            issues.push('missing /chat/completions path');
          }
          if (!baseUrl.includes('api-version=')) {
            issues.push('missing api-version parameter');
          }
          if (!baseUrl.includes('/deployments/')) {
            issues.push('missing /deployments/ path');
          }
          
          if (issues.length > 0) {
            console.warn(`⚠️ [Azure OpenAI Debug] URL has issues: ${issues.join(', ')}`);
          } else {
            console.log('✅ [Azure OpenAI Debug] URL format is correct');
          }
        }
        
        return {
          provider: item.provider,
          config: configCopy,
          isDefault: item.provider === defaultProvider?.provider
        };
      });
      
      setCloudProviders(providers);
    } catch (error) {
      console.error('Failed to load cloud providers:', error);
    }
  };

  const loadEntraConfig = async () => {
    try {
      setIsLoadingEntraConfig(true);
      const electronAPI = window.electronAPI as any;
      const config = await electronAPI.config.getEntraConfig();
      setEntraConfig(config);
      console.log('📋 [EntraConfig] Loaded Entra config:', config ? 'Yes' : 'No');
    } catch (error) {
      console.error('❌ Failed to load Entra config:', error);
      setEntraConfig(null);
    } finally {
      setIsLoadingEntraConfig(false);
    }
  };

  const handleSaveCloudProvider = async (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai', providerConfig: CloudLLMProviderConfig) => {
    try {
      // Enhanced logging for Azure OpenAI
      if (provider === 'azure-openai') {
        console.log('🔄 [Azure OpenAI Debug] Saving Azure OpenAI config:', { 
          baseUrl: providerConfig.baseUrl,
          model: providerConfig.model,
          hasApiKey: !!providerConfig.apiKey,
          hasCorrectUrlFormat: providerConfig.baseUrl?.includes('/chat/completions') && providerConfig.baseUrl?.includes('api-version=')
        });
      } else {
        console.log('🔄 Saving cloud provider config:', { provider, config: { ...providerConfig, apiKey: '[REDACTED]' } });
      }
      
      const electronAPI = window.electronAPI as any; // Temporary type assertion      // For Azure OpenAI, enforce URL format before saving
      if (provider === 'azure-openai') {
        // Validate and fix URL if needed
        if (providerConfig.baseUrl) {
          // Trim whitespace and normalize URL
          const cleanUrl = providerConfig.baseUrl.trim();
          console.log(`🔍 [Azure OpenAI Debug] Processing URL for save: "${cleanUrl}"`);
          
          // Check if URL has all required components
          const hasDeploymentPath = cleanUrl.includes('/deployments/');
          const hasChatCompletions = cleanUrl.includes('/chat/completions');
          const hasApiVersion = cleanUrl.includes('api-version=');
          const isAzureUrl = cleanUrl.includes('openai.azure.com');
          
          if (!isAzureUrl) {
            alert('Invalid Azure OpenAI URL. Must contain "openai.azure.com"');
            return;
          }
          
          // If URL is incomplete, build complete URL
          if (!hasDeploymentPath || !hasChatCompletions || !hasApiVersion) {
            console.log(`🔧 [Azure OpenAI Debug] URL is incomplete, building complete version...`);
            
            // Start with base URL (remove trailing slashes)
            let baseEndpoint = cleanUrl.replace(/\/+$/, '');
            
            // Remove any existing incomplete paths to start fresh
            if (baseEndpoint.includes('/openai/deployments/')) {
              baseEndpoint = baseEndpoint.split('/openai/deployments/')[0];
            } else if (baseEndpoint.includes('/openai/')) {
              baseEndpoint = baseEndpoint.split('/openai/')[0];
            }
            
            // Build complete URL with all required components
            const completeUrl = `${baseEndpoint}/openai/deployments/${providerConfig.model}/chat/completions?api-version=2025-01-01-preview`;
            
            console.log(`🔧 [Azure OpenAI Debug] Built complete URL: "${completeUrl}"`);
            
            // Confirm with user
            const userConfirm = confirm(`To ensure proper functionality, the Azure OpenAI endpoint URL will be formatted as:\n\n${completeUrl}\n\nContinue with this URL?`);
            
            if (!userConfirm) {
              console.log(`❌ [Azure OpenAI Debug] User cancelled URL modification`);
              return;
            }
            
            // Update the URL with complete version
            providerConfig.baseUrl = completeUrl;
          } else {
            console.log(`✅ [Azure OpenAI Debug] URL is already correctly formatted: ${cleanUrl}`);
            // Ensure we use the cleaned URL
            providerConfig.baseUrl = cleanUrl;
          }
          
          // Final verification log
          console.log(`✅ [Azure OpenAI Debug] Final URL being saved: "${providerConfig.baseUrl}"`);
        } else {
          alert('Azure OpenAI endpoint URL is required');
          return;
        }
      }
      
      await electronAPI.config.saveCloudProviderConfig(provider, providerConfig);
      
      console.log('✅ Cloud provider config saved successfully');
      
      // Refresh the cloud providers list
      await loadCloudProviders();
      
      // Auto-fetch models if API key is provided
      if (providerConfig.apiKey) {
        await fetchAvailableModels(provider, providerConfig.apiKey);
      }} catch (error) {
      console.error('❌ Failed to save cloud provider config:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to save ${provider} configuration: ${errorMessage}`);
    }
  };

  const handleSaveEntraConfig = async (newEntraConfig: EntraConfig) => {
    try {
      setIsLoadingEntraConfig(true);
      const electronAPI = window.electronAPI as any;
      
      console.log('🔄 Saving Entra config:', {
        clientId: newEntraConfig.clientId ? '[REDACTED]' : 'none',
        tenantId: newEntraConfig.tenantId ? '[REDACTED]' : 'none',
        hasClientSecret: !!newEntraConfig.clientSecret
      });

      await electronAPI.config.saveEntraConfig(newEntraConfig);
      setEntraConfig(newEntraConfig);
      
      console.log('✅ Entra config saved successfully');
    } catch (error) {
      console.error('❌ Failed to save Entra config:', error);
      throw error;
    } finally {
      setIsLoadingEntraConfig(false);
    }
  };

  const handleClearEntraConfig = async () => {
    try {
      setIsLoadingEntraConfig(true);
      const electronAPI = window.electronAPI as any;
      await electronAPI.config.clearEntraConfig();
      setEntraConfig(null);
      
      console.log('✅ Entra config cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear Entra config:', error);
      throw error;
    } finally {
      setIsLoadingEntraConfig(false);
    }
  };

  const fetchAvailableModels = async (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai', apiKey: string) => {
    if (provider === 'gemini') {
      // Gemini models are predefined
      setAvailableModels(prev => ({
        ...prev,
        [provider]: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']
      }));
      return;
    }

    if (provider === 'azure-openai') {
      // Azure OpenAI models are typically predefined by the Azure deployment
      setAvailableModels(prev => ({
        ...prev,
        [provider]: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-35-turbo']
      }));
      return;
    }

    if (!apiKey) {
      setAvailableModels(prev => ({ ...prev, [provider]: [] }));
      return;
    }

    setIsLoadingModels(prev => ({ ...prev, [provider]: true }));
    setModelFetchError(prev => ({ ...prev, [provider]: '' }));
    
    try {
      const tempConfig: LLMConfig = {
        ...config,
        provider,
        apiKey
      };

      const models = await window.electronAPI.llm.getAvailableModels?.(tempConfig) || [];
      const uniqueModels = [...new Set(models)].sort();
      setAvailableModels(prev => ({ ...prev, [provider]: uniqueModels }));
      
      if (uniqueModels.length === 0) {
        setModelFetchError(prev => ({ ...prev, [provider]: 'No models found. Please check your API key.' }));
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
      setModelFetchError(prev => ({ ...prev, [provider]: 'Failed to fetch models. Please check your API key and try again.' }));
      setAvailableModels(prev => ({ ...prev, [provider]: [] }));
    } finally {
      setIsLoadingModels(prev => ({ ...prev, [provider]: false }));
    }
  };  const handleSetDefaultProvider = async (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
    try {
      const electronAPI = window.electronAPI as any; // Temporary type assertion
      await electronAPI.config.setDefaultCloudProvider(provider);
      setDefaultCloudProvider(provider);
      
      // Update local state
      setCloudProviders(prev => prev.map(p => ({
        ...p,
        isDefault: p.provider === provider
      })));
    } catch (error) {
      console.error('Failed to set default provider:', error);
    }
  };
  const handleRemoveProvider = async (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
    try {
      const electronAPI = window.electronAPI as any; // Temporary type assertion
      await electronAPI.config.removeCloudProviderConfig(provider);
      await loadCloudProviders();
    } catch (error) {
      console.error('Failed to remove provider:', error);
    }
  };  const handleTestConnection = async (config: CloudLLMProviderConfig): Promise<boolean> => {
    try {
      // Create a temporary LLMConfig for testing
      const testConfig = {
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseUrl: config.baseUrl, // Include baseUrl for Azure OpenAI and other providers that need it
        organization: config.organization,
        temperature: config.temperature,
        maxTokens: config.maxTokens
      };

      const success = await window.electronAPI.llm.testConnection(testConfig);
      return success;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  const handleTestLocalConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setTestResult(null);
    
    try {
      // Create a test config for the local LLM
      const testConfig = {
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
        apiKey: '', // Local LLMs typically don't need API keys
        temperature: config.temperature,
        maxTokens: config.maxTokens
      };

      const success = await window.electronAPI.llm.testConnection(testConfig);
      
      if (success) {
        setConnectionStatus('success');
        setTestResult({ success: true });
      } else {
        setConnectionStatus('error');
        setTestResult({ 
          success: false, 
          error: `Failed to connect to ${config.provider}. Please check that the service is running and the URL is correct.` 
        });
      }
    } catch (error) {
      console.error('Local LLM connection test failed:', error);
      setConnectionStatus('error');
      setTestResult({ 
        success: false, 
        error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });    } finally {
      setIsTestingConnection(false);
    }
  };

  const fetchLocalModels = async () => {
    if (!config.baseUrl) {
      setModelFetchError({ ...modelFetchError, local: 'Base URL is required to fetch models' });
      return;
    }

    setIsLoadingModels({ ...isLoadingModels, local: true });
    setModelFetchError({ ...modelFetchError, local: '' });

    try {
      const testConfig = {
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: config.model // This is for the connection test
      };

      const models = await window.electronAPI.llm.getAvailableModels(testConfig);
      setAvailableModels({ ...availableModels, local: models });
      
      if (models.length === 0) {
        setModelFetchError({ 
          ...modelFetchError, 
          local: `No models found. Make sure ${config.provider} is running and has models installed.` 
        });
      }
    } catch (error) {
      console.error('Failed to fetch local models:', error);
      setModelFetchError({ 
        ...modelFetchError, 
        local: `Failed to fetch models: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsLoadingModels({ ...isLoadingModels, local: false });
    }
  };
  
  const getProviderDisplayName = (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic (Claude)';
      case 'gemini': return 'Google Gemini';
      case 'azure-openai': return 'Azure OpenAI';
      default: return provider;
    }
  };

  const getDefaultModel = (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
    switch (provider) {
      case 'openai': return 'gpt-4o-mini';
      case 'anthropic': return 'claude-3-5-sonnet-20241022';
      case 'gemini': return 'gemini-1.5-flash';
      case 'azure-openai': return 'gpt-4o';
      default: return '';
    }
  };  const handleSave = async () => {
    let finalConfig = { ...config };
    
    console.log('[EnhancedSettingsDialog] handleSave - Original config:', {
      provider: config.provider,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      preferLocal: config.preferLocal,
      model: config.model,
      hasCloudProviders: !!config.cloudProviders,
      cloudProviderKeys: config.cloudProviders ? Object.keys(config.cloudProviders) : 'none'
    });
    
    // Get current cloud provider configurations to include in final config
    const electronAPI = window.electronAPI as any;
    const currentCloudProviders = await electronAPI.config.getConfiguredCloudProviders();
    
    // Convert to the cloudProviders format
    const cloudProvidersConfig: Record<string, CloudLLMProviderConfig> = {};
    currentCloudProviders.forEach((item: { provider: string; config: CloudLLMProviderConfig }) => {
      cloudProvidersConfig[item.provider] = { ...item.config };
    });
    
    console.log('[EnhancedSettingsDialog] handleSave - Current cloud providers:', {
      providers: Object.keys(cloudProvidersConfig),
      azureOpenAIUrl: cloudProvidersConfig['azure-openai']?.baseUrl
    });
    
    // For local providers (ollama, lmstudio), use the config as-is
    if (config.provider === 'ollama' || config.provider === 'lmstudio') {
      finalConfig = {
        ...config,
        // Ensure these values are preserved for local providers
        temperature: config.temperature || 0.2,
        maxTokens: config.maxTokens || 4096,
        preferLocal: config.preferLocal || false,
        // Include current cloud providers
        cloudProviders: cloudProvidersConfig
      };
    } else {
      // For cloud providers, DON'T set root-level baseUrl/apiKey
      // The cloud provider configs should remain in the cloudProviders section
      finalConfig = {
        ...config,
        // Remove any root-level cloud provider credentials
        baseUrl: undefined,
        apiKey: undefined,
        organization: undefined,
        // Keep user settings
        temperature: config.temperature || 0.2,
        maxTokens: config.maxTokens || 4096,
        preferLocal: config.preferLocal || false,
        // Include current cloud providers
        cloudProviders: cloudProvidersConfig
      };
    }

    // Always include the current default cloud provider
    if (defaultCloudProvider) {
      finalConfig.defaultCloudProvider = defaultCloudProvider;
    }

    console.log('[EnhancedSettingsDialog] handleSave - Final config being saved:', {
      provider: finalConfig.provider,
      temperature: finalConfig.temperature,
      maxTokens: finalConfig.maxTokens,
      preferLocal: finalConfig.preferLocal,
      model: finalConfig.model,
      defaultCloudProvider: finalConfig.defaultCloudProvider,
      hasRootLevelBaseUrl: !!finalConfig.baseUrl,
      hasRootLevelApiKey: !!finalConfig.apiKey,
      hasCloudProviders: !!finalConfig.cloudProviders,
      cloudProviderKeys: finalConfig.cloudProviders ? Object.keys(finalConfig.cloudProviders) : 'none',
      azureOpenAIUrl: finalConfig.cloudProviders?.['azure-openai']?.baseUrl
    });    onSave(finalConfig);
    onClose();
  };

  const isLocalProvider = config.provider === 'ollama' || config.provider === 'lmstudio';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>LLM Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Entra Application Settings */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Entra Application Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Configure your Microsoft Entra application registration details. These settings are secure and stored locally encrypted.
                </Typography>
              </Box>
              
              {isLoadingEntraConfig ? (
                <Box display="flex" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <EntraConfigForm
                  config={entraConfig}
                  onSave={handleSaveEntraConfig}
                  onClear={handleClearEntraConfig}
                />
              )}
            </AccordionDetails>
          </Accordion>

          {/* Provider Selection */}
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>LLM Provider</InputLabel>
            <Select
              value={config.provider}
              label="LLM Provider"              onChange={(e) => {
                const newProvider = e.target.value as LLMConfig['provider'];
                
                // If selecting a cloud provider that's the default, preserve its configuration
                if (newProvider === defaultCloudProvider) {
                  const cloudProviderConfig = cloudProviders.find(p => p.provider === defaultCloudProvider)?.config;
                  if (cloudProviderConfig) {
                    setConfig({
                      ...config,
                      provider: newProvider,
                      model: cloudProviderConfig.model || getDefaultModel(newProvider as any) || config.model,
                      baseUrl: cloudProviderConfig.baseUrl,
                      apiKey: cloudProviderConfig.apiKey,
                      organization: cloudProviderConfig.organization,
                      temperature: cloudProviderConfig.temperature || config.temperature,
                      maxTokens: cloudProviderConfig.maxTokens || config.maxTokens
                    });
                  } else {
                    // Fallback if no cloud provider config found
                    setConfig({
                      ...config,
                      provider: newProvider,
                      model: getDefaultModel(newProvider as any) || config.model,
                      baseUrl: undefined,
                      apiKey: undefined,
                      organization: undefined
                    });
                  }
                } else {
                  // For local providers or other cases
                  setConfig({
                    ...config,
                    provider: newProvider,
                    model: getDefaultModel(newProvider as any) || config.model,
                    baseUrl: newProvider === 'ollama' ? 'http://localhost:11434' : 
                             newProvider === 'lmstudio' ? 'http://localhost:1234' : undefined,
                    apiKey: undefined,
                    organization: undefined
                  });
                }
              }}
            >
              <MenuItem value="ollama">
                <Box display="flex" alignItems="center" gap={1}>
                  <ComputerIcon fontSize="small" />
                  Ollama (Local)
                </Box>
              </MenuItem>
              <MenuItem value="lmstudio">
                <Box display="flex" alignItems="center" gap={1}>
                  <ComputerIcon fontSize="small" />
                  LM Studio (Local)
                </Box>
              </MenuItem>
              {defaultCloudProvider && (
                <MenuItem value={defaultCloudProvider}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CloudIcon fontSize="small" />
                    {getProviderDisplayName(defaultCloudProvider)} (Default Cloud)
                    <StarIcon fontSize="small" color="primary" />
                  </Box>
                </MenuItem>
              )}
            </Select>
          </FormControl>          {/* Local LLM Configuration */}
          {isLocalProvider && (
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Local LLM Configuration</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Base URL"
                      value={config.baseUrl || ''}
                      onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                      placeholder={config.provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
                      helperText={config.provider === 'ollama' ? 'Default Ollama API endpoint' : 'Default LM Studio API endpoint'}
                    />
                  </Grid>                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Model Name"
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      placeholder={config.provider === 'ollama' ? 'codellama:7b' : 'gpt-4'}
                      helperText="The model name as it appears in your local LLM service"
                    />
                    
                    {/* Fetch Models Button */}
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => fetchLocalModels()}
                        disabled={!config.baseUrl || isLoadingModels['local']}
                        startIcon={isLoadingModels['local'] ? <CircularProgress size={16} /> : undefined}
                      >
                        {isLoadingModels['local'] ? 'Fetching...' : 'Fetch Available Models'}
                      </Button>
                      
                      {availableModels['local'] && availableModels['local'].length > 0 && (
                        <Typography variant="caption" color="textSecondary">
                          Found {availableModels['local'].length} models
                        </Typography>
                      )}
                    </Box>
                    
                    {/* Available Models List */}
                    {availableModels['local'] && availableModels['local'].length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="textSecondary" gutterBottom>
                          Available models (click to select):
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {availableModels['local'].map((modelName) => (
                            <Chip
                              key={modelName}
                              label={modelName}
                              size="small"
                              clickable
                              color={config.model === modelName ? "primary" : "default"}
                              onClick={() => setConfig({ ...config, model: modelName })}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {modelFetchError['local'] && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          {modelFetchError['local']}
                        </Typography>
                      </Alert>
                    )}
                  </Grid>
                  
                  {/* Test Connection for Local LLM */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Button
                        variant="outlined"
                        onClick={() => handleTestLocalConnection()}
                        disabled={isTestingConnection || !config.baseUrl || !config.model}
                        startIcon={isTestingConnection ? <CircularProgress size={16} /> : undefined}
                      >
                        {isTestingConnection ? 'Testing...' : 'Test Connection'}
                      </Button>
                      
                      {connectionStatus === 'success' && (
                        <Chip label="Connection Successful" color="success" size="small" />
                      )}
                      {connectionStatus === 'error' && (
                        <Chip label="Connection Failed" color="error" size="small" />
                      )}
                    </Box>
                    
                    {testResult && !testResult.success && testResult.error && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          {testResult.error}
                        </Typography>
                      </Alert>
                    )}
                  </Grid>
                  
                  {/* Prefer Local LLM Toggle */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.preferLocal || false}
                          onChange={(e) => setConfig({ ...config, preferLocal: e.target.checked })}
                        />
                      }
                      label="Prefer Local LLM when available"
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, ml: 4 }}>
                      Use local models when both local and cloud are configured
                    </Typography>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Cloud LLM Management */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Cloud LLM Providers</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Configure multiple cloud LLM providers and set one as default. The default provider will appear in the main dropdown.
                </Typography>
                
                {defaultCloudProvider && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Current default: <strong>{getProviderDisplayName(defaultCloudProvider)}</strong>
                    </Typography>
                  </Alert>
                )}
              </Box>              {/* Cloud Provider Cards */}
              <Grid container spacing={2}>
                {(['openai', 'anthropic', 'gemini', 'azure-openai'] as const).map((provider) => {
                  const existingProvider = cloudProviders.find(p => p.provider === provider);
                  const isConfigured = !!existingProvider;
                  const isDefault = existingProvider?.isDefault || false;

                  return (
                    <Grid item xs={12} md={6} key={provider}>
                      <CloudProviderCard
                        provider={provider}
                        config={existingProvider?.config}
                        isConfigured={isConfigured}
                        isDefault={isDefault}
                        models={availableModels[provider] || []}
                        isLoadingModels={isLoadingModels[provider] || false}
                        modelFetchError={modelFetchError[provider] || ''}
                        onSave={(config: CloudLLMProviderConfig) => handleSaveCloudProvider(provider, config)}
                        onSetDefault={() => handleSetDefaultProvider(provider)}
                        onRemove={() => handleRemoveProvider(provider)}
                        onFetchModels={(apiKey: string) => fetchAvailableModels(provider, apiKey)}
                        onTestConnection={handleTestConnection}
                      />
                    </Grid>
                  );
                })}
              </Grid>
            </AccordionDetails>
          </Accordion>          {/* Advanced Settings */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Advanced Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Temperature"
                    type="number"
                    value={config.temperature || 0.2}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    inputProps={{ min: 0, max: 2, step: 0.1 }}
                    helperText="Controls randomness (0.0 to 2.0)"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Max Tokens"
                    type="number"                    value={config.maxTokens || 4096}
                    onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                    inputProps={{ min: 1, max: 8192 }}
                    helperText="Maximum response length"
                  />                </Grid>                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.preferLocal || false}
                        onChange={(e) => setConfig({ ...config, preferLocal: e.target.checked })}
                      />
                    }
                    label="Prefer Local LLM when available"
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, ml: 4 }}>
                    Use local models when both local and cloud are configured.
                    {config.provider === 'ollama' || config.provider === 'lmstudio' ? 
                      ' (Also available in Local LLM Configuration above)' : ''}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Cloud Provider Card Component
interface CloudProviderCardProps {
  provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai';
  config?: CloudLLMProviderConfig;
  isConfigured: boolean;
  isDefault: boolean;
  models: string[];
  isLoadingModels: boolean;
  modelFetchError: string;
  onSave: (config: CloudLLMProviderConfig) => void;
  onSetDefault: () => void;
  onRemove: () => void;
  onFetchModels: (apiKey: string) => void;
  onTestConnection: (config: CloudLLMProviderConfig) => Promise<boolean>;
}

const CloudProviderCard: React.FC<CloudProviderCardProps> = ({
  provider,
  config,
  isConfigured,
  isDefault,
  models,
  isLoadingModels,
  modelFetchError,
  onSave,
  onSetDefault,
  onRemove,
  onFetchModels,
  onTestConnection
}) => {  const [localConfig, setLocalConfig] = useState<CloudLLMProviderConfig>(
    config || {
      provider,
      model: provider === 'openai' ? 'gpt-4o-mini' : 
             provider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 
             provider === 'gemini' ? 'gemini-1.5-flash' :
             provider === 'azure-openai' ? 'gpt-4o' : 'gpt-4o-mini',      apiKey: '',
      temperature: 0.2,
      maxTokens: 4096,
      baseUrl: provider === 'azure-openai' ? '' : undefined
    }
  );

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; details?: any } | null>(null);

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);
  const getProviderDisplayName = (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
    switch (provider) {
      case 'openai': return 'OpenAI';
      case 'anthropic': return 'Anthropic (Claude)';
      case 'gemini': return 'Google Gemini';
      case 'azure-openai': return 'Azure OpenAI';
      default: return provider;
    }
  };  const handleSave = () => {
    // Validation for Azure OpenAI
    if (provider === 'azure-openai') {
      if (!localConfig.baseUrl || localConfig.baseUrl.trim() === '') {
        alert('Azure OpenAI endpoint URL is required');
        return;
      }
      
      // Validate the URL has the correct format
      if (!localConfig.baseUrl.includes('openai.azure.com')) {
        alert('Please enter a valid Azure OpenAI endpoint URL (should contain "openai.azure.com")');
        return;
      }
      
      // Validate it has the required chat/completions path and API version
      if (!localConfig.baseUrl.includes('/chat/completions') || !localConfig.baseUrl.includes('api-version=')) {
        alert('Please enter the full Azure OpenAI endpoint URL including deployment name and API version.\n\nFormat: https://your-resource.openai.azure.com/openai/deployments/your-deployment-name/chat/completions?api-version=2025-01-01-preview');
        return;
      }
      
      // Validate it has the deployment name
      if (!localConfig.baseUrl.includes('/deployments/')) {
        alert('Please enter a valid Azure OpenAI endpoint URL with deployment name.\n\nFormat: https://your-resource.openai.azure.com/openai/deployments/your-deployment-name/chat/completions?api-version=2025-01-01-preview');
        return;
      }
    }
    
    // Validation for API key
    if (!localConfig.apiKey || localConfig.apiKey.trim() === '') {
      alert('API Key is required');
      return;
    }
      // For Azure OpenAI, make a final check and fix of the URL
    if (provider === 'azure-openai' && localConfig.baseUrl) {
      // Add deep logging
      console.log(`🔍 [Azure OpenAI Debug] Final save - processing URL: "${localConfig.baseUrl}"`);
      
      // Always trim the URL to avoid whitespace issues
      const cleanUrl = localConfig.baseUrl.trim();
      
      // Validate URL format
      const isAzureUrl = cleanUrl.includes('openai.azure.com');
      const hasDeploymentPath = cleanUrl.includes('/deployments/');
      const hasChatCompletions = cleanUrl.includes('/chat/completions');
      const hasApiVersion = cleanUrl.includes('api-version=');
      
      if (!isAzureUrl) {
        alert('Invalid Azure OpenAI URL. Must contain "openai.azure.com"');
        return;
      }
      
      // Ensure URL is complete
      if (!hasDeploymentPath || !hasChatCompletions || !hasApiVersion) {
        console.log(`🔧 [Azure OpenAI Debug] URL needs completion during final save`);
        
        // Start with base URL (remove trailing slashes)
        let baseEndpoint = cleanUrl.replace(/\/+$/, '');
        
        // Remove any existing incomplete paths to start fresh
        if (baseEndpoint.includes('/openai/deployments/')) {
          baseEndpoint = baseEndpoint.split('/openai/deployments/')[0];
        } else if (baseEndpoint.includes('/openai/')) {
          baseEndpoint = baseEndpoint.split('/openai/')[0];
        }
        
        // Build complete URL
        const completeUrl = `${baseEndpoint}/openai/deployments/${localConfig.model}/chat/completions?api-version=2025-01-01-preview`;
        
        console.log(`🔧 [Azure OpenAI Debug] Final save - built complete URL: "${completeUrl}"`);
        
        // Ask user to confirm modified URL
        const userConfirm = confirm(`To ensure proper functionality, the endpoint URL will be formatted as:\n\n${completeUrl}\n\nContinue with this URL?`);
        
        if (!userConfirm) {
          console.log('❌ [Azure OpenAI Debug] User cancelled URL modification in final save');
          return;
        }
        
        // Update the URL
        localConfig.baseUrl = completeUrl;
      } else {
        // URL is already complete, just ensure it's clean
        localConfig.baseUrl = cleanUrl;
      }
      
      // Create a deep copy to ensure we're not saving a reference
      const configToSave = JSON.parse(JSON.stringify({
        provider: localConfig.provider,
        model: localConfig.model,
        apiKey: localConfig.apiKey,
        baseUrl: localConfig.baseUrl,
        temperature: localConfig.temperature,
        maxTokens: localConfig.maxTokens,
        organization: localConfig.organization
      }));
      
      console.log(`✅ [Azure OpenAI Debug] Final URL being saved in main save: "${configToSave.baseUrl}"`);
      onSave(configToSave);
      return;
    }
    
    // For non-Azure OpenAI providers
    onSave({...localConfig});
  };
  const handleApiKeyChange = (apiKey: string) => {
    setLocalConfig({ ...localConfig, apiKey });
    if (apiKey && apiKey.length > 10) {
      onFetchModels(apiKey);
    }
  };

  const handleTestConnection = async () => {
    if (!localConfig.apiKey) {
      setConnectionStatus('error');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const success = await onTestConnection(localConfig);
      setConnectionStatus(success ? 'success' : 'error');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Paper elevation={isDefault ? 3 : 1} sx={{ p: 2, border: isDefault ? 2 : 1, borderColor: isDefault ? 'primary.main' : 'divider' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>        <Box display="flex" alignItems="center" gap={1}>
          <CloudIcon color={isConfigured ? 'primary' : 'disabled'} />
          <Typography variant="h6">{getProviderDisplayName(provider)}</Typography>
          {isDefault && <StarIcon color="primary" fontSize="small" />}
        </Box>
        
        <Box display="flex" gap={1}>
          {isConfigured && !isDefault && (
            <Tooltip title="Set as Default">
              <IconButton size="small" onClick={onSetDefault}>
                <StarBorderIcon />
              </IconButton>
            </Tooltip>
          )}
          {isConfigured && (
            <Tooltip title="Remove Configuration">
              <IconButton size="small" onClick={onRemove} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>        <TextField
          fullWidth
          label="API Key"
          type="password"
          value={localConfig.apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder={provider === 'openai' ? 'sk-...' : 
                      provider === 'anthropic' ? 'sk-ant-...' : 
                      provider === 'gemini' ? 'AI...' :
                      provider === 'azure-openai' ? 'your-azure-api-key' : 'API Key'}
          size="small"
          sx={{ mb: 1 }}
        />
          {provider === 'openai' && (
          <TextField
            fullWidth
            label="Organization ID (Optional)"
            value={localConfig.organization || ''}
            onChange={(e) => setLocalConfig({ ...localConfig, organization: e.target.value })}
            placeholder="org-..."
            size="small"
            sx={{ mb: 1 }}
          />
        )}        {provider === 'azure-openai' && (
          <TextField
            fullWidth
            label="Azure OpenAI Endpoint"
            value={localConfig.baseUrl || ''}
            onChange={(e) => {
              const newUrl = e.target.value;
              console.log(`🔍 [Azure OpenAI Debug] URL input changed: "${newUrl}"`);
              setLocalConfig({ ...localConfig, baseUrl: newUrl });
            }}
            onBlur={(e) => {
              // Validate and auto-correct URL on blur
              const url = e.target.value.trim();
              if (url && !url.includes('/chat/completions')) {
                console.log(`⚠️ [Azure OpenAI Debug] Incomplete URL detected on blur: "${url}"`);
                
                // Auto-suggest complete URL format
                const isAzureUrl = url.includes('openai.azure.com');
                if (isAzureUrl && localConfig.model) {
                  let correctedUrl = url.replace(/\/+$/, ''); // Remove trailing slashes
                  
                  // Add missing components
                  if (!correctedUrl.includes('/deployments/')) {
                    correctedUrl = `${correctedUrl}/openai/deployments/${localConfig.model}`;
                  }
                  if (!correctedUrl.includes('/chat/completions')) {
                    correctedUrl = `${correctedUrl}/chat/completions`;
                  }
                  if (!correctedUrl.includes('api-version=')) {
                    const separator = correctedUrl.includes('?') ? '&' : '?';
                    correctedUrl = `${correctedUrl}${separator}api-version=2025-01-01-preview`;
                  }
                  
                  console.log(`🔧 [Azure OpenAI Debug] Auto-correcting URL to: "${correctedUrl}"`);
                  setLocalConfig({ ...localConfig, baseUrl: correctedUrl });
                }
              }
            }}
            placeholder="https://your-resource.openai.azure.com/openai/deployments/your-deployment-name/chat/completions?api-version=2025-01-01-preview"
            size="small"
            sx={{ mb: 1 }}
            required
            helperText="Full Azure OpenAI endpoint URL including deployment name and api-version (e.g., https://your-resource.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview)"
          />
        )}

        {models.length > 0 ? (
          <FormControl fullWidth size="small">
            <InputLabel>Model</InputLabel>
            <Select
              value={localConfig.model}
              label="Model"
              onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
              disabled={isLoadingModels}
            >
              {models.map((model) => (
                <MenuItem key={model} value={model}>
                  {model}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <TextField
            fullWidth
            label="Model"
            value={localConfig.model}
            onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
            size="small"
            helperText={modelFetchError || (isLoadingModels ? 'Loading models...' : 'Enter API key to load models')}
            error={!!modelFetchError}
          />
        )}

        {isLoadingModels && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            <Typography variant="caption" color="textSecondary">
              Fetching available models...
            </Typography>
          </Box>
        )}
      </Box>      <Box display="flex" gap={1} justifyContent="flex-end" flexWrap="wrap">
        <Button 
          size="small" 
          onClick={handleTestConnection} 
          variant="outlined"
          disabled={!localConfig.apiKey || isTestingConnection}
          color={connectionStatus === 'success' ? 'success' : connectionStatus === 'error' ? 'error' : 'primary'}
        >
          {isTestingConnection ? (
            <CircularProgress size={16} />
          ) : connectionStatus === 'success' ? (
            'Connection OK'
          ) : connectionStatus === 'error' ? (
            'Test Failed'
          ) : (
            'Test Connection'
          )}
        </Button>
        <Button size="small" onClick={handleSave} variant="contained">
          {isConfigured ? 'Update' : 'Save'}
        </Button>
        {isConfigured && !isDefault && (
          <Button size="small" onClick={onSetDefault} variant="outlined">
            Set as Default
          </Button>
        )}
      </Box>
      
      {isDefault && (
        <Chip
          label="Default Provider"
          color="primary"
          size="small"
          icon={<StarIcon />}
          sx={{ mt: 1 }}
        />
      )}
    </Paper>
  );
};

interface EntraConfigFormProps {
  config: EntraConfig | null;
  onSave: (config: EntraConfig) => Promise<void>;
  onClear: () => Promise<void>;
}

const EntraConfigForm: React.FC<EntraConfigFormProps> = ({ config, onSave, onClear }) => {  const [localConfig, setLocalConfig] = useState<EntraConfig>({
    clientId: '',
    tenantId: '',
    clientSecret: '',
    useApplicationCredentials: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; details?: any } | null>(null);

  useEffect(() => {
    // Only update local config if the user is not actively editing
    // This prevents the form from being cleared when background processes reload config
    if (config && !isUserEditing) {
      setLocalConfig(config);
    }
  }, [config, isUserEditing]);
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(localConfig);
      // Successfully saved - no longer editing
      setIsUserEditing(false);
    } catch (error) {
      console.error('Failed to save Entra config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsSaving(true);
      await onClear();      setLocalConfig({
        clientId: '',
        tenantId: '',
        clientSecret: '',
        useApplicationCredentials: false
      });
      // Successfully cleared - no longer editing
      setIsUserEditing(false);
    } catch (error) {
      console.error('Failed to clear Entra config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof EntraConfig, value: string) => {
    setLocalConfig({ ...localConfig, [field]: value });
    // Mark as user editing when any input changes
    setIsUserEditing(true);
    // Clear any previous test results when config changes
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    try {
      setIsTestingConnection(true);
      setTestResult(null);
      
      console.log('🧪 Testing Entra application configuration...');
      
      // Validate that we have the minimum required fields
      if (!localConfig.clientId.trim() || !localConfig.tenantId.trim()) {
        setTestResult({
          success: false,
          error: 'Client ID and Tenant ID are required for testing'
        });
        return;
      }

      const electronAPI = window.electronAPI as any;
      const result = await electronAPI.auth.testConfiguration(localConfig);
      
      console.log('🧪 Test result:', result);
      setTestResult(result);
      
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const isConfigured = !!(config?.clientId && config?.tenantId);
  return (
    <Grid container spacing={2}>
      {/* Authentication Mode Selection */}
      <Grid item xs={12}>
        <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="h6" gutterBottom>
            Authentication Mode
          </Typography>
          
          <FormControl component="fieldset">
            <RadioGroup
              value={localConfig.useApplicationCredentials ? 'application-credentials' : 'user-token'}
              onChange={(e) => {
                const newMode = e.target.value === 'application-credentials';
                
                if (newMode && (!localConfig.clientSecret?.trim() || !localConfig.clientId?.trim() || !localConfig.tenantId?.trim())) {
                  // For now, just show a warning - don't block the change
                  console.warn('Client credentials mode requires Client ID, Tenant ID, and Client Secret');
                }

                setLocalConfig({
                  ...localConfig,
                  useApplicationCredentials: newMode
                });
                setIsUserEditing(true);
                setTestResult(null); // Clear test results when mode changes
              }}
            >
              <FormControlLabel
                value="user-token"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      User Token (Delegated Permissions)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Query Microsoft Graph with your user permissions. Access your profile, email, calendar, and other user-scoped data.
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="application-credentials"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      Application Credentials (App Permissions)
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Query Microsoft Graph with application permissions. Access organization-wide data like audit logs, sign-in logs, and directory information.
                    </Typography>
                  </Box>
                }
                disabled={!localConfig.clientSecret?.trim() || !localConfig.clientId?.trim() || !localConfig.tenantId?.trim()}
              />
            </RadioGroup>
          </FormControl>

          {localConfig.useApplicationCredentials && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <strong>Application Permissions Required:</strong> Ensure your Entra application has the necessary application permissions configured for the data you want to access (e.g., AuditLog.Read.All, Directory.Read.All).
            </Alert>
          )}
        </Box>
      </Grid>

      <Grid item xs={12}><TextField
          fullWidth
          label="Client ID"
          value={localConfig.clientId}
          onChange={(e) => handleInputChange('clientId', e.target.value)}
          placeholder="Enter your Azure app registration Client ID"
          helperText="The Application (client) ID from your Azure app registration"
          disabled={isSaving}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Tenant ID"
          value={localConfig.tenantId}
          onChange={(e) => handleInputChange('tenantId', e.target.value)}
          placeholder="Enter your Azure Directory (tenant) ID"
          helperText="The Directory (tenant) ID from your Azure app registration"
          disabled={isSaving}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Client Secret (Optional)"
          type="password"
          value={localConfig.clientSecret || ''}
          onChange={(e) => handleInputChange('clientSecret', e.target.value)}
          placeholder="Enter your Azure app client secret (optional)"
          helperText="Required only for client credentials flow (advanced scenarios)"
          disabled={isSaving}
        />
      </Grid>      <Grid item xs={12}>
        <Box display="flex" gap={1} justifyContent="flex-end">
          {isConfigured && (
            <Button 
              onClick={handleClear}
              disabled={isSaving || isTestingConnection}
              color="error"
            >
              Clear Configuration
            </Button>
          )}
          <Button 
            onClick={handleTestConnection}
            disabled={isSaving || isTestingConnection || !localConfig.clientId.trim() || !localConfig.tenantId.trim()}
            variant="outlined"
          >
            {isTestingConnection ? <CircularProgress size={20} /> : 'Test Connection'}
          </Button>
          <Button 
            onClick={handleSave}
            variant="contained"
            disabled={isSaving || isTestingConnection || !localConfig.clientId.trim() || !localConfig.tenantId.trim()}
          >
            {isSaving ? <CircularProgress size={20} /> : (isConfigured ? 'Update' : 'Save')}
          </Button>
        </Box>
      </Grid>
      {testResult && (
        <Grid item xs={12}>
          <Alert 
            severity={testResult.success ? 'success' : 'error'}
            onClose={() => setTestResult(null)}
          >
            {testResult.success ? (
              <>
                <strong>Connection Test Successful!</strong>
                {testResult.details && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {testResult.details.tokenType === 'client_credentials' 
                      ? 'Client credentials flow verified. Authentication is working correctly.'
                      : testResult.details.tokenType === 'interactive'
                      ? 'Interactive authentication verified with cached tokens.'
                      : testResult.details.message || 'Configuration is valid for authentication.'}
                  </Typography>
                )}
              </>
            ) : (
              <>
                <strong>Connection Test Failed</strong>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {testResult.error}
                </Typography>
              </>
            )}
          </Alert>
        </Grid>
      )}
      {isConfigured && (
        <Grid item xs={12}>
          <Alert severity="success">
            Entra configuration is set and ready to use.
          </Alert>
        </Grid>
      )}
      {!localConfig.clientSecret && (
        <Grid item xs={12}>
          <Alert severity="warning">
            <strong>Note:</strong> The Lokka MCP server for Microsoft Graph queries requires a Client Secret. 
            Without a Client Secret, you can still authenticate interactively, but Graph queries through the AI assistant will not work.
            To enable full functionality, please provide a Client Secret from your Azure app registration.
          </Alert>
        </Grid>
      )}
    </Grid>  );
};
