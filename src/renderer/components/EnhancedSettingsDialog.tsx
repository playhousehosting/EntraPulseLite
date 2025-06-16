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
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import { LLMConfig, CloudLLMProviderConfig } from '../../types';

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
}) => {
  const [config, setConfig] = useState<LLMConfig>(currentConfig);
  const [cloudProviders, setCloudProviders] = useState<CloudProviderState[]>([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [isLoadingModels, setIsLoadingModels] = useState<Record<string, boolean>>({});
  const [modelFetchError, setModelFetchError] = useState<Record<string, string>>({});
  const [defaultCloudProvider, setDefaultCloudProvider] = useState<'openai' | 'anthropic' | 'gemini' | 'azure-openai' | null>(null);

  useEffect(() => {
    setConfig(currentConfig);
    loadCloudProviders();
  }, [currentConfig, open]);  const loadCloudProviders = async () => {
    try {
      const electronAPI = window.electronAPI as any; // Temporary type assertion
      const configured = await electronAPI.config.getConfiguredCloudProviders();
      const defaultProvider = await electronAPI.config.getDefaultCloudProvider();
      
      setDefaultCloudProvider(defaultProvider?.provider || null);
      
      const providers: CloudProviderState[] = configured.map((item: { provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai'; config: CloudLLMProviderConfig }) => ({
        provider: item.provider,
        config: item.config,
        isDefault: item.provider === defaultProvider?.provider
      }));
      
      setCloudProviders(providers);
    } catch (error) {
      console.error('Failed to load cloud providers:', error);
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
  };  const handleSaveCloudProvider = async (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai', providerConfig: CloudLLMProviderConfig) => {
    try {
      console.log('🔄 Saving cloud provider config:', { provider, config: { ...providerConfig, apiKey: '[REDACTED]' } });
      
      const electronAPI = window.electronAPI as any; // Temporary type assertion
      await electronAPI.config.saveCloudProviderConfig(provider, providerConfig);
      
      console.log('✅ Cloud provider config saved successfully');
      
      // Refresh the cloud providers list
      await loadCloudProviders();
      
      // Auto-fetch models if API key is provided
      if (providerConfig.apiKey) {
        await fetchAvailableModels(provider, providerConfig.apiKey);
      }    } catch (error) {
      console.error('❌ Failed to save cloud provider config:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to save ${provider} configuration: ${errorMessage}`);
    }
  };

  const handleSetDefaultProvider = async (provider: 'openai' | 'anthropic' | 'gemini' | 'azure-openai') => {
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
  };
  const handleTestConnection = async (config: CloudLLMProviderConfig): Promise<boolean> => {
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
  };  const handleSave = () => {
    let finalConfig = { ...config };
    
    console.log('[EnhancedSettingsDialog] handleSave - Original config:', {
      provider: config.provider,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      preferLocal: config.preferLocal,
      model: config.model
    });
    
    // For local providers (ollama, lmstudio), use the config as-is
    if (config.provider === 'ollama' || config.provider === 'lmstudio') {
      finalConfig = {
        ...config,
        // Ensure these values are preserved for local providers
        temperature: config.temperature || 0.2,
        maxTokens: config.maxTokens || 4096,
        preferLocal: config.preferLocal || false
      };
    } else {
      // For cloud providers, merge with cloud provider configuration but prioritize user settings
      if (defaultCloudProvider && config.provider === defaultCloudProvider) {
        const cloudProviderConfig = cloudProviders.find(p => p.provider === defaultCloudProvider)?.config;
        if (cloudProviderConfig) {
          finalConfig = {
            ...finalConfig,
            // Use cloud provider credentials
            apiKey: cloudProviderConfig.apiKey,
            baseUrl: cloudProviderConfig.baseUrl,
            organization: cloudProviderConfig.organization,
            // Prioritize user-modified values, fallback to cloud provider or defaults
            model: config.model || cloudProviderConfig.model,
            temperature: config.temperature !== undefined ? config.temperature : (cloudProviderConfig.temperature || 0.2),
            maxTokens: config.maxTokens !== undefined ? config.maxTokens : (cloudProviderConfig.maxTokens || 4096),
            preferLocal: config.preferLocal !== undefined ? config.preferLocal : false
          };
        }
      }
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
      defaultCloudProvider: finalConfig.defaultCloudProvider
    });

    onSave(finalConfig);
    onClose();
  };

  const isLocalProvider = config.provider === 'ollama' || config.provider === 'lmstudio';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>LLM Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
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
          </FormControl>

          {/* Local LLM Configuration */}
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
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Model Name"
                      value={config.model}
                      onChange={(e) => setConfig({ ...config, model: e.target.value })}
                      placeholder={config.provider === 'ollama' ? 'codellama:7b' : 'gpt-4'}
                      helperText="The model name as it appears in your local LLM service"
                    />
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
          </Accordion>

          {/* Advanced Settings */}
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
                  />
                </Grid>                <Grid item xs={12}>
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
  };
  const handleSave = () => {
    // Validation for Azure OpenAI
    if (provider === 'azure-openai') {
      if (!localConfig.baseUrl || localConfig.baseUrl.trim() === '') {
        alert('Azure OpenAI endpoint URL is required');
        return;
      }
      if (!localConfig.baseUrl.includes('openai.azure.com')) {
        alert('Please enter a valid Azure OpenAI endpoint URL (should contain "openai.azure.com")');
        return;
      }
    }
    
    // Validation for API key
    if (!localConfig.apiKey || localConfig.apiKey.trim() === '') {
      alert('API Key is required');
      return;
    }
    
    onSave(localConfig);
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
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
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
        )}

        {provider === 'azure-openai' && (
          <TextField
            fullWidth
            label="Azure OpenAI Endpoint"
            value={localConfig.baseUrl || ''}
            onChange={(e) => setLocalConfig({ ...localConfig, baseUrl: e.target.value })}
            placeholder="https://your-resource.openai.azure.com/"
            size="small"
            sx={{ mb: 1 }}
            required
            helperText="Your Azure OpenAI resource endpoint URL"
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
