/**
 * Test script to verify the enhanced debugging in ExternalLokkaMCPStdioServer
 * This tests the enhanced debugging logic we just added.
 */

const { ExternalLokkaMCPStdioServer } = require('../dist/main.js');

console.log('🧪 Testing enhanced Lokka MCP debugging...');

// Mock the necessary services for testing
const mockConfigService = {
  getAuthenticationPreference: () => 'user-token'
};

const mockAuthService = {
  getToken: async () => ({
    accessToken: 'test-token-' + Math.random().toString(36).substring(7),
    expiresOn: new Date(Date.now() + 3600000) // 1 hour from now
  })
};

const mockConfig = {
  name: 'external-lokka',
  type: 'stdio',
  command: 'npx',
  args: ['--yes', '@merill/lokka@latest'],
  env: {}
};

async function testEnhancedDebugging() {
  try {
    console.log('Creating ExternalLokkaMCPStdioServer instance...');
    
    const server = new ExternalLokkaMCPStdioServer(
      mockConfig,
      mockConfigService,
      mockAuthService
    );

    console.log('Starting server with enhanced debugging...');
    await server.startServer();
    
    console.log('✅ Test completed successfully');
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Full error:', error);
  }
}

// Only run if this script is executed directly
if (require.main === module) {
  testEnhancedDebugging();
}

module.exports = { testEnhancedDebugging };
