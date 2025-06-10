// Test script to verify MCP server initialization
const { MCPServerManager } = require('./dist/main.js');

async function testMCPInitialization() {
  console.log('Testing MCP Server Initialization...');
  
  // Mock config for testing
  const testConfig = [
    {
      name: 'test-server',
      type: 'fetch',
      port: 3002,
      enabled: true
    }
  ];
  
  try {
    // Create a new MCPServerManager
    const manager = new MCPServerManager(testConfig);
    
    // Check if singleton instance is set
    console.log('Singleton instance exists:', MCPServerManager.instance !== null);
    
    // Check if servers are initialized
    const servers = manager.getAllServers();
    console.log('Number of servers initialized:', servers.size);
    
    // Test stop functionality
    await manager.stopAllServers();
    console.log('Stop all servers completed successfully');
    
    console.log('✅ MCP initialization test passed!');
  } catch (error) {
    console.error('❌ MCP initialization test failed:', error);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testMCPInitialization();
}

module.exports = { testMCPInitialization };
