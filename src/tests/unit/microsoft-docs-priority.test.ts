// Test to verify Microsoft Docs MCP is prioritized for Microsoft-related queries
import { EnhancedLLMService } from '../../llm/EnhancedLLMService';
import { LLMConfig } from '../../types';
import { AuthService } from '../../auth/AuthService';
import { MCPClient } from '../../mcp/clients/MCPClient';

// Mock dependencies
jest.mock('../../auth/AuthService');
jest.mock('../../mcp/clients/MCPClient');

describe('Microsoft Docs MCP Priority Tests', () => {
  let enhancedLLMService: EnhancedLLMService;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockMCPClient: jest.Mocked<MCPClient>;

  beforeEach(() => {
    // Mock AuthService
    mockAuthService = new AuthService({} as any) as jest.Mocked<AuthService>;
    
    // Mock MCPClient
    mockMCPClient = new MCPClient([], undefined) as jest.Mocked<MCPClient>;
    mockMCPClient.callTool = jest.fn();
      // Create LLM config
    const llmConfig: LLMConfig = {
      provider: 'ollama',
      model: 'test-model',
      baseUrl: 'http://localhost:11434',
      apiKey: 'test-key'
    };

    // Create Enhanced LLM Service - pass undefined for MCPClient to use fallback
    enhancedLLMService = new EnhancedLLMService(llmConfig, mockAuthService, undefined);
    
    // Mock the MCPClient after creation
    (enhancedLLMService as any).mcpClient = mockMCPClient;
  });

  describe('Microsoft-related queries should use Microsoft Docs MCP', () => {
    const microsoftQueries = [
      'What permissions does User.Read give me?',
      'How do I authenticate to Microsoft Graph?',
      'Tell me about Azure Active Directory',
      'What are the latest Graph API features?',
      'How do I configure authentication?',
      'Explain Microsoft Entra',
      'Azure documentation',
      'Office 365 permissions',
      'PowerShell for Graph API',
      'Microsoft Teams API'
    ];

    microsoftQueries.forEach(query => {
      test(`"${query}" should prioritize Microsoft Docs MCP`, async () => {
        // Mock the analysis to return Microsoft Docs MCP preference
        const mockAnalysis = {
          needsFetchMcp: false,
          needsLokkaMcp: false,
          needsMicrosoftDocsMcp: true,
          documentationQuery: query,
          confidence: 0.9,
          reasoning: 'Microsoft-related query detected'
        };

        // Mock the private method using any to access it
        const analyzeQuerySpy = jest.spyOn(enhancedLLMService as any, 'analyzeQuery')
          .mockResolvedValue(mockAnalysis);
        
        const generateFinalResponseSpy = jest.spyOn(enhancedLLMService as any, 'generateFinalResponse')
          .mockResolvedValue('Mocked response');

        const messages = [{
          id: 'test-1',
          role: 'user' as const,
          content: query,
          timestamp: new Date()
        }];

        const result = await enhancedLLMService.enhancedChat(messages);

        // Verify Microsoft Docs MCP was called
        expect(mockMCPClient.callTool).toHaveBeenCalledWith(
          'microsoft-docs', 
          'microsoft_docs_search',
          expect.objectContaining({
            question: expect.any(String)
          })
        );

        // Verify Fetch MCP was NOT called for Microsoft content
        expect(mockMCPClient.callTool).not.toHaveBeenCalledWith(
          'fetch',
          expect.any(String),
          expect.any(Object)
        );

        expect(result.analysis.needsMicrosoftDocsMcp).toBe(true);
        expect(result.analysis.needsFetchMcp).toBe(false);

        analyzeQuerySpy.mockRestore();
        generateFinalResponseSpy.mockRestore();
      });
    });
  });

  describe('Non-Microsoft queries should use Fetch MCP', () => {
    const nonMicrosoftQueries = [
      'What is the weather in Seattle?',
      'Latest technology news',
      'Stock price of Apple',
      'General web search about cats'
    ];

    nonMicrosoftQueries.forEach(query => {
      test(`"${query}" should use Fetch MCP, not Microsoft Docs`, async () => {
        // Mock the analysis to return Fetch MCP preference  
        const mockAnalysis = {
          needsFetchMcp: true,
          needsLokkaMcp: false,
          needsMicrosoftDocsMcp: false,
          documentationQuery: query,
          confidence: 0.8,
          reasoning: 'Non-Microsoft query detected'
        };

        const analyzeQuerySpy = jest.spyOn(enhancedLLMService as any, 'analyzeQuery')
          .mockResolvedValue(mockAnalysis);
        
        const generateFinalResponseSpy = jest.spyOn(enhancedLLMService as any, 'generateFinalResponse')
          .mockResolvedValue('Mocked response');

        const messages = [{
          id: 'test-1',
          role: 'user' as const,
          content: query,
          timestamp: new Date()
        }];

        const result = await enhancedLLMService.enhancedChat(messages);

        // Verify Fetch MCP was called for non-Microsoft content
        expect(mockMCPClient.callTool).toHaveBeenCalledWith(
          'fetch',
          'fetch',
          expect.any(Object)
        );

        // Verify Microsoft Docs MCP was NOT called for non-Microsoft content
        expect(mockMCPClient.callTool).not.toHaveBeenCalledWith(
          'microsoft-docs',
          expect.any(String),
          expect.any(Object)
        );

        expect(result.analysis.needsFetchMcp).toBe(true);
        expect(result.analysis.needsMicrosoftDocsMcp).toBe(false);

        analyzeQuerySpy.mockRestore();
        generateFinalResponseSpy.mockRestore();
      });
    });
  });

  describe('Heuristic Analysis Priority', () => {
    test('should prioritize Microsoft Docs MCP in heuristic analysis', () => {
      // Test the heuristic analysis directly
      const heuristicAnalysis = (enhancedLLMService as any).heuristicAnalysis;

      const microsoftQuery = 'How do I authenticate to Azure AD?';
      const result = heuristicAnalysis(microsoftQuery);

      expect(result.needsMicrosoftDocsMcp).toBe(true);
      expect(result.needsFetchMcp).toBe(false);
      expect(result.reasoning).toContain('prioritizing Microsoft Docs MCP');
    });

    test('should use Fetch MCP for non-Microsoft queries in heuristic analysis', () => {
      const heuristicAnalysis = (enhancedLLMService as any).heuristicAnalysis;

      const nonMicrosoftQuery = 'What is the weather today?';
      const result = heuristicAnalysis(nonMicrosoftQuery);

      expect(result.needsFetchMcp).toBe(true);
      expect(result.needsMicrosoftDocsMcp).toBe(false);
    });
  });
});
