// MCP Error Handler utility for improved error handling and reporting

import { MCPError } from '../types';

export enum ErrorCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503
}

export class MCPErrorHandler {
  /**
   * Create a standardized MCP error object
   * @param code Error code
   * @param message Error message
   * @param data Additional error data
   * @returns MCP error object
   */
  static createError(code: ErrorCode, message: string, data?: any): MCPError {
    return {
      code,
      message,
      data
    };
  }

  /**
   * Handle and log an error
   * @param error Error object
   * @param context Context information for logging
   * @returns Standardized MCP error
   */
  static handleError(error: Error | MCPError | any, context: string): MCPError {
    // Log the error with context
    console.error(`Error in ${context}:`, error);
    
    // If it's already an MCPError, return it
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return error as MCPError;
    }

    // Default to internal server error
    let code = ErrorCode.INTERNAL_SERVER_ERROR;
    let message = error?.message || 'An unknown error occurred';
    
    // Try to determine the appropriate error code
    if (error?.message) {
      const msg = error.message.toLowerCase();
      if (msg.includes('not found') || msg.includes('does not exist')) {
        code = ErrorCode.NOT_FOUND;
      } else if (msg.includes('permission') || msg.includes('access') || msg.includes('forbidden')) {
        code = ErrorCode.FORBIDDEN;
      } else if (msg.includes('unauthorized') || msg.includes('unauthenticated') || msg.includes('token')) {
        code = ErrorCode.UNAUTHORIZED;
      } else if (msg.includes('invalid') || msg.includes('required') || msg.includes('missing')) {
        code = ErrorCode.BAD_REQUEST;
      }
    }
    
    return {
      code,
      message,
      data: {
        context,
        stack: error?.stack,
        originalError: error
      }
    };
  }
}

export default MCPErrorHandler;
