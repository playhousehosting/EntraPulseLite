// Error handler unit tests

import { MCPErrorHandler, ErrorCode } from '../../mcp/utils';

describe('MCPErrorHandler', () => {
  test('should create error with the correct structure', () => {
    const error = MCPErrorHandler.createError(
      ErrorCode.BAD_REQUEST, 
      'Invalid parameter'
    );
    
    expect(error).toHaveProperty('code', 400);
    expect(error).toHaveProperty('message', 'Invalid parameter');
  });
  
  test('should create error with additional data', () => {
    const data = { field: 'username', value: '' };
    const error = MCPErrorHandler.createError(
      ErrorCode.BAD_REQUEST, 
      'Invalid parameter',
      data
    );
    
    expect(error).toHaveProperty('data', data);
  });
  
  test('should handle Error objects', () => {
    const originalError = new Error('Something went wrong');
    const mcpError = MCPErrorHandler.handleError(originalError, 'test context');
    
    expect(mcpError).toHaveProperty('code', 500); // Default to internal server error
    expect(mcpError).toHaveProperty('message', 'Something went wrong');
    expect(mcpError.data).toHaveProperty('context', 'test context');
  });
  
  test('should preserve existing MCP errors', () => {
    const existingError = {
      code: 404,
      message: 'Resource not found'
    };
    
    const mcpError = MCPErrorHandler.handleError(existingError, 'test context');
    
    expect(mcpError).toBe(existingError);
  });
  
  test('should detect not found errors from message', () => {
    const error = new Error('The requested resource was not found');
    const mcpError = MCPErrorHandler.handleError(error, 'test context');
    
    expect(mcpError.code).toBe(ErrorCode.NOT_FOUND);
  });
  
  test('should detect unauthorized errors from message', () => {
    const error = new Error('Unauthorized: Token expired');
    const mcpError = MCPErrorHandler.handleError(error, 'test context');
    
    expect(mcpError.code).toBe(ErrorCode.UNAUTHORIZED);
  });
  
  test('should detect bad request errors from message', () => {
    const error = new Error('Invalid parameter: id is required');
    const mcpError = MCPErrorHandler.handleError(error, 'test context');
    
    expect(mcpError.code).toBe(ErrorCode.BAD_REQUEST);
  });
  
  test('should detect forbidden errors from message', () => {
    const error = new Error('You do not have permission to access this resource');
    const mcpError = MCPErrorHandler.handleError(error, 'test context');
    
    expect(mcpError.code).toBe(ErrorCode.FORBIDDEN);
  });
  
  test('should handle null or undefined errors', () => {
    const mcpError = MCPErrorHandler.handleError(null, 'test context');
    
    expect(mcpError.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
    expect(mcpError.message).toBe('An unknown error occurred');
  });
});
