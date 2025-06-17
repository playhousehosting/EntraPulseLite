// Debug script to test Azure OpenAI configuration persistence
try {
  const Store = require('electron-store').default || require('electron-store');
  
  console.log('Store constructor:', Store);
  
  // Use the same store configuration as ConfigService
  const store = new Store({
    name: 'entrapulse-lite-config',
    encryptionKey: 'entrapulse-lite-secret-key-2025'
  });

console.log('=== Azure OpenAI Config Debug ===\n');

// 1. Check current store contents
console.log('1. Current store contents:');
const allData = store.store;
console.log(JSON.stringify(allData, null, 2));
console.log('\n');

// 2. Check authentication context
console.log('2. Authentication context:');
console.log('Current auth mode:', store.get('currentAuthMode'));
console.log('Current user key:', store.get('currentUserKey'));
console.log('\n');

// 3. Check application config
console.log('3. Application config:');
const appConfig = store.get('application');
console.log('Application LLM config:', JSON.stringify(appConfig?.llm, null, 2));
console.log('Cloud providers:', JSON.stringify(appConfig?.llm?.cloudProviders, null, 2));
console.log('Default cloud provider:', appConfig?.llm?.defaultCloudProvider);
console.log('\n');

// 4. Check users config
console.log('4. Users config:');
const users = store.get('users');
if (users && Object.keys(users).length > 0) {
  Object.entries(users).forEach(([userKey, userConfig]) => {
    console.log(`User ${userKey}:`);
    console.log('  LLM config:', JSON.stringify(userConfig?.llm, null, 2));
    console.log('  Cloud providers:', JSON.stringify(userConfig?.llm?.cloudProviders, null, 2));
    console.log('  Default cloud provider:', userConfig?.llm?.defaultCloudProvider);
    console.log('');
  });
} else {
  console.log('No user configurations found');
}
console.log('\n');

// 5. Test saving Azure OpenAI config
console.log('5. Testing Azure OpenAI config save...');
try {
  // Simulate saving Azure OpenAI config to application context
  const currentAppConfig = store.get('application') || {
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

  // Initialize cloudProviders if it doesn't exist
  if (!currentAppConfig.llm.cloudProviders) {
    currentAppConfig.llm.cloudProviders = {};
  }

  // Add Azure OpenAI config
  currentAppConfig.llm.cloudProviders['azure-openai'] = {
    provider: 'azure-openai',
    model: 'gpt-4o',
    apiKey: 'test-azure-api-key',
    baseUrl: 'https://test-resource.openai.azure.com/',
    temperature: 0.7,
    maxTokens: 2048
  };

  // Set as default
  currentAppConfig.llm.defaultCloudProvider = 'azure-openai';

  // Save to store
  store.set('application', currentAppConfig);
  
  console.log('Azure OpenAI config saved successfully!');
  
  // 6. Verify the save
  console.log('\n6. Verifying save...');
  const savedConfig = store.get('application');
  console.log('Saved cloud providers:', JSON.stringify(savedConfig?.llm?.cloudProviders, null, 2));
  console.log('Saved default provider:', savedConfig?.llm?.defaultCloudProvider);
  
} catch (error) {
  console.error('Error saving Azure OpenAI config:', error);
}

console.log('\n=== Debug Complete ===');

} catch (error) {
  console.error('Error in debug script:', error);
  console.error('Stack trace:', error.stack);
}
