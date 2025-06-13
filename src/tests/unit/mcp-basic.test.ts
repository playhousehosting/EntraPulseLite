// Unit tests for MCPClient
import { MCPClient } from '../../mcp/clients/MCPClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MCPClient', () => {
  let mcpClient: MCPClient;  const testConfig = {
    name: 'TestServer',
    type: 'external-lokka',
    port: 3000,
    enabled: true,
    command: 'npx',
    args: ['-y', '@merill/lokka'],
    url: 'http://localhost:3000/mcp'
  };

  beforeEach(() => {
    // Pass an array of configs as the constructor expects
    mcpClient = new MCPClient([testConfig]);
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with provided configuration', () => {
      expect(mcpClient).toBeInstanceOf(MCPClient);
    });
  });
});
