// Test script to demonstrate conversation context management
import { ConversationContextManager } from '../src/shared/ConversationContextManager';

async function testConversationContext() {
  const contextManager = new ConversationContextManager();
  const sessionId = 'test-session-123';

  console.log('🧪 Testing Conversation Context Management');
  console.log('==========================================');

  // Simulate first question
  const query1 = "What is the API to get user group memberships?";
  const response1 = "Use the GET /users/{id}/transitiveMemberOf endpoint to get user group memberships including nested groups.";
  
  contextManager.addTurn(sessionId, query1, response1);
  console.log(`\n📝 Added Turn 1:`);
  console.log(`Q: ${query1}`);
  console.log(`A: ${response1.substring(0, 100)}...`);

  // Simulate follow-up question
  const query2 = "What about authentication though?";
  const formattedContext = contextManager.getFormattedContext(sessionId, query2);
  
  console.log(`\n📝 Follow-up Question: ${query2}`);
  console.log(`\n📋 Context Generated:`);
  console.log('---');
  console.log(formattedContext);
  console.log('---');

  // Add the follow-up response
  const response2 = "For authentication to Microsoft Graph, you need to use OAuth 2.0 tokens with appropriate permissions like User.Read.All or GroupMember.Read.All.";
  contextManager.addTurn(sessionId, query2, response2);

  // Test related context
  const relatedContext = contextManager.getRelatedContext(sessionId, "authentication permissions");
  console.log(`\n🔗 Related Context for "authentication permissions":`);
  relatedContext.forEach((context, index) => {
    console.log(`${index + 1}. ${context.substring(0, 150)}...`);
  });

  // Show stats
  const stats = contextManager.getStats();
  console.log(`\n📊 Context Manager Stats:`);
  console.log(`- Active Contexts: ${stats.activeContexts}`);
  console.log(`- Total Turns: ${stats.totalTurns}`);
  console.log(`- Avg Turns per Context: ${stats.avgTurnsPerContext.toFixed(1)}`);

  console.log('\n✅ Conversation context test completed!');
}

// Run the test
testConversationContext().catch(console.error);
