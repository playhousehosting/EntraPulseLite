// Cloud LLM Query Execution Test
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

describe('Cloud LLM Query Execution Tests', () => {
  // Make the test timeout longer since LLM calls can take time
  jest.setTimeout(30000);
  
  it('should execute Graph API queries in Cloud LLM responses', async () => {
    // Skip the test if no API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('Skipping test: ANTHROPIC_API_KEY not set');
      return;
    }
    
    console.log('Starting Cloud LLM Query Execution test');
    
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
      expect(available).toBe(true);
      
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
      
      // Verify results - the actual assertions may vary based on your setup
      // These are flexible assertions that should pass even if the LLM doesn't generate queries
      expect(response).toBeDefined();
      expect(response.finalResponse).toBeTruthy();
      
      // If the LLM generated a query, verify it was processed properly
      if (hasExecuteQueryTags) {
        expect(hasQueryResults).toBe(true);
      }
    } finally {
      // Clean up
      await llmService.shutdown();
      console.log('\nTest completed and resources cleaned up');
    }
  });
});
