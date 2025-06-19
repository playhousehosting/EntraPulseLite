// Unit tests for LLMService
import { LLMService } from '../../llm/LLMService';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LLMService', () => {
  let llmService: LLMService;
  describe('Ollama Provider', () => {
    beforeEach(() => {
      llmService = new LLMService({
        provider: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama2'
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should initialize with correct configuration', () => {
      expect(llmService).toBeInstanceOf(LLMService);
    });

    it('should make a proper request to Ollama API', async () => {
      // Mock successful Ollama response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          message: {
            content: 'This is a test response'
          }
        }
      });      const messages = [
        { 
          id: '1', 
          role: 'user' as 'user', 
          content: 'Hello, this is a test',
          timestamp: new Date()
        }
      ];
      const response = await llmService.chat(messages);
      
      // Just verify it was called with the right endpoint and contains our model
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(mockedAxios.post.mock.calls[0][0]).toBe('http://localhost:11434/api/chat');
      expect(mockedAxios.post.mock.calls[0][1]).toHaveProperty('model', 'llama2');
      
      expect(response).toBe('This is a test response');
    });

    it('should handle API errors gracefully', async () => {
      // Mock failed response
      mockedAxios.post.mockRejectedValueOnce(new Error('API Error'));      const messages = [
        { 
          id: '2', 
          role: 'user' as 'user', 
          content: 'Hello, this is a test',
          timestamp: new Date()
        }
      ];

      await expect(llmService.chat(messages)).rejects.toThrow();
    });
  });

  describe('LM Studio Provider', () => {
    beforeEach(() => {
      llmService = new LLMService({
        provider: 'lmstudio',
        baseUrl: 'http://localhost:1234',
        model: 'gpt4'
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should make a proper request to LM Studio API', async () => {
      // Mock successful LM Studio response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: 'LM Studio response'
              }
            }
          ]
        }
      });      const messages = [
        { 
          id: '3', 
          role: 'user' as 'user', 
          content: 'Hello LM Studio',
          timestamp: new Date()
        }
      ];

      const response = await llmService.chat(messages);
      
      expect(mockedAxios.post).toHaveBeenCalled();
      expect(response).toBe('LM Studio response');
    });
  });
  describe('Unsupported Provider', () => {
    it('should throw error for unsupported provider', async () => {
      const invalidService = new LLMService({
        provider: 'unsupported' as any,
        baseUrl: 'http://example.com',
        model: 'test'
      });      const messages = [
        { 
          id: '4', 
          role: 'user' as 'user', 
          content: 'Hello',
          timestamp: new Date()
        }
      ];

      await expect(invalidService.chat(messages)).rejects.toThrow('Failed to communicate with unsupported');
    });
  });
});
