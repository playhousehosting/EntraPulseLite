const fs = require('fs');

// Fix lokka-mcp-integration.test.ts
const integrationFile = 'src/tests/integration/lokka-mcp-integration.test.ts';
let integrationContent = fs.readFileSync(integrationFile, 'utf8');

// Fix all the jest.Mock casting issues
integrationContent = integrationContent.replace(/\(PersistentLokkaMCPClient as jest\.Mock\)/g, '(PersistentLokkaMCPClient as unknown as jest.Mock)');
integrationContent = integrationContent.replace(/\(ManagedLokkaMCPClient as jest\.Mock\)/g, '(ManagedLokkaMCPClient as unknown as jest.Mock)');
integrationContent = integrationContent.replace(/\(EnhancedStdioMCPClient as jest\.Mock\)/g, '(EnhancedStdioMCPClient as unknown as jest.Mock)');
integrationContent = integrationContent.replace(/\(StdioMCPClient as jest\.Mock\)/g, '(StdioMCPClient as unknown as jest.Mock)');

fs.writeFileSync(integrationFile, integrationContent);
console.log('Fixed mocking issues in lokka-mcp-integration.test.ts');
