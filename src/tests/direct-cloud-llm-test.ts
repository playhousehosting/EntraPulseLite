// Direct test script for Cloud LLM Query Execution without Jest
// This script tests the integration between Cloud LLM services and Lokka MCP

import { EnhancedLLMService } from '../llm/EnhancedLLMService';
import { ChatMessage, LLMConfig } from '../types';

// Mock AuthService for testing
class MockAuthService {
  constructor() {}
  async getToken() { 
    return 'mock-token';
  }
  isAuthenticated() {
    return true;
  }
}

async function testCloudLLMQueryExecution() {
  console.log('Starting Cloud LLM Query Execution test');
  
  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable not set');
    console.log('Please set it using:');
    console.log('$env:ANTHROPIC_API_KEY = "your-api-key"');
    process.exit(1);
  }
  
  // Initialize the services
  const authService = new MockAuthService() as any;
  
  // Configure the LLM to use Anthropic
  const llmConfig: LLMConfig = {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-haiku-20240307',
    temperature: 0.7,
    maxTokens: 2048
  };
  
  console.log('Initializing EnhancedLLMService with Anthropic provider');
  const llmService = new EnhancedLLMService(llmConfig, authService);
  
  try {
    // Test basic availability
    const available = await llmService.isAvailable();
    console.log(`LLM Service Available: ${available}`);
    
    if (!available) {
      console.error('LLM Service is not available, check your API key and network connection');
      process.exit(1);
    }
    
    // Test a query that should use the Microsoft Graph API
    const testQuery = 'Show me a list of users in my tenant';
    console.log(`Sending test query: "${testQuery}"`);
    
    const messages: ChatMessage[] = [
      { 
        id: 'test-user-1',
        role: 'user', 
        content: testQuery,
        timestamp: new Date()
      }
    ];
    
    const response = await llmService.enhancedChat(messages);
    
    console.log('\n=== TEST RESULTS ===\n');
    console.log('Query Analysis:', response.analysis);
    console.log('\nMCP Results:', JSON.stringify(response.mcpResults, null, 2));
    
    // Check if the response contains execute_query tags
    const hasExecuteQueryTags = response.finalResponse.includes('<execute_query>');
    console.log(`\nResponse contains execute_query tags: ${hasExecuteQueryTags}`);
    
    // Check if the response contains query results
    const hasQueryResults = response.finalResponse.includes('**Query Result:**');
    console.log(`Response contains query results: ${hasQueryResults}`);
    
    console.log('\n=== FINAL RESPONSE ===\n');
    console.log(response.finalResponse);
    
    return true;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  } finally {
    // Clean up
    await llmService.shutdown();
    console.log('\nTest completed and resources cleaned up');
  }
}

// Run the test and exit with appropriate code
testCloudLLMQueryExecution()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Error running test:', err);
    process.exit(1);
  });
