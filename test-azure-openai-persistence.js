const { ConfigService } = require('./dist/main.js');
const Store = require('electron-store');

// Create a test configuration service
const configService = new ConfigService();

// Test Azure OpenAI URL persistence
async function testAzureOpenAIPersistence() {
  console.log('🧪 Testing Azure OpenAI URL persistence...\n');
  
  const testUrl = 'https://posh-openai.openai.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview';
  const testConfig = {
    provider: 'azure-openai',
    model: 'gpt-4o',
    apiKey: 'test-api-key',
    baseUrl: testUrl,
    temperature: 0.7,
    maxTokens: 4000
  };
  
  try {
    // Step 1: Save the Azure OpenAI cloud provider config
    console.log('1️⃣ Saving Azure OpenAI cloud provider config...');
    console.log(`   URL: ${testUrl}`);
    configService.saveCloudProviderConfig('azure-openai', testConfig);
    
    // Step 2: Retrieve the saved config
    console.log('\n2️⃣ Retrieving saved cloud provider config...');
    const savedConfig = configService.getCloudProviderConfig('azure-openai');
    console.log(`   Retrieved URL: ${savedConfig?.baseUrl}`);
    
    // Step 3: Test the main LLM config save/load cycle
    console.log('\n3️⃣ Testing main LLM config save/load cycle...');
    const llmConfig = {
      provider: 'anthropic',
      model: 'claude-3-7-sonnet-latest',
      temperature: 0.1,
      maxTokens: 5192,
      preferLocal: false,
      cloudProviders: {
        'azure-openai': testConfig
      },
      defaultCloudProvider: 'azure-openai'
    };
    
    console.log(`   Saving LLM config with Azure OpenAI URL: ${llmConfig.cloudProviders['azure-openai'].baseUrl}`);
    configService.saveLLMConfig(llmConfig);
    
    // Step 4: Retrieve the LLM config
    console.log('\n4️⃣ Retrieving LLM config...');
    const retrievedLLMConfig = configService.getLLMConfig();
    const azureConfig = configService.getCloudProviderConfig('azure-openai');
    console.log(`   Azure OpenAI URL from LLM config: ${azureConfig?.baseUrl}`);
    
    // Step 5: Verify the URL is complete
    console.log('\n5️⃣ Verifying URL completeness...');
    if (azureConfig?.baseUrl === testUrl) {
      console.log('✅ SUCCESS: Azure OpenAI URL is correctly persisted!');
      console.log(`   Original:  ${testUrl}`);
      console.log(`   Retrieved: ${azureConfig.baseUrl}`);
    } else {
      console.log('❌ FAILURE: Azure OpenAI URL was not correctly persisted!');
      console.log(`   Original:  ${testUrl}`);
      console.log(`   Retrieved: ${azureConfig?.baseUrl || 'undefined'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testAzureOpenAIPersistence();
