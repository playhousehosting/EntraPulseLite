// Mock data for testing Microsoft Graph responses

export const mockUser = {
  id: '12345678-1234-1234-1234-123456789012',
  displayName: 'Test User',
  mail: 'testuser@contoso.com',
  userPrincipalName: 'testuser@contoso.com',
  jobTitle: 'Software Engineer',
  department: 'Engineering',
};

export const mockUsers = {
  '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#users',
  value: [
    mockUser,
    {
      id: '12345678-1234-1234-1234-123456789013',
      displayName: 'Another User',
      mail: 'anotheruser@contoso.com',
      userPrincipalName: 'anotheruser@contoso.com',
      jobTitle: 'Product Manager',
      department: 'Product',
    },
  ],
};

export const mockGroups = {
  '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#groups',
  value: [
    {
      id: '87654321-4321-4321-4321-210987654321',
      displayName: 'Engineering Team',
      description: 'Engineering team group',
      mailEnabled: true,
      securityEnabled: true,
    },
  ],
};

export const mockApplications = {
  '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#applications',
  value: [
    {
      id: '11111111-1111-1111-1111-111111111111',
      appId: '22222222-2222-2222-2222-222222222222',
      displayName: 'Test Application',
      description: 'Test application for unit tests',
    },
  ],
};

export const mockAuthToken = {
  accessToken: 'mock-access-token',
  idToken: 'mock-id-token',
  expiresOn: new Date(Date.now() + 3600000), // 1 hour from now
  scopes: ['User.Read', 'User.ReadBasic.All'],
};

export const mockChatMessages = [
  {
    id: '1',
    role: 'user' as const,
    content: 'Show me all users in the Engineering department',
    timestamp: new Date(),
  },
  {
    id: '2',
    role: 'assistant' as const,
    content: 'I found 5 users in the Engineering department...',
    timestamp: new Date(),
    metadata: {
      graphApiCalls: [
        {
          endpoint: '/users?$filter=department eq \'Engineering\'',
          method: 'GET' as const,
          timestamp: new Date(),
          duration: 250,
          status: 200,
        },
      ],
      llmProvider: 'ollama',
      model: 'llama2',
    },
  },
];

export const mockLLMConfig = {
  provider: 'ollama' as const,
  baseUrl: 'http://localhost:11434',
  model: 'llama2',
  temperature: 0.2,
  maxTokens: 2048,
};

export const mockMCPServers = [
  {
    name: 'external-lokka',
    type: 'external-lokka' as const,
    port: 3003,
    enabled: true,
    command: 'npx',
    args: ['-y', '@merill/lokka'],
  },
  {
    name: 'fetch',
    type: 'fetch' as const,
    port: 3002,
    enabled: true,
  },
];

export const mockAppConfig = {
  auth: {
    clientId: 'test-client-id',
    tenantId: 'test-tenant-id',
    scopes: ['User.Read', 'User.ReadBasic.All', 'Directory.Read.All'],
  },
  llm: mockLLMConfig,
  mcpServers: mockMCPServers,
  features: {
    enablePremiumFeatures: false,
    enableTelemetry: false,
  },
};
