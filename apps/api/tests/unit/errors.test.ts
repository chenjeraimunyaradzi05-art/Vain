/**
 * Error Classes Tests
 * 
 * Unit tests for custom error classes.
 */

import {
  AppError,
  BadRequestError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  InvalidCredentialsError,
  TokenExpiredError,
  AccountLockedError,
} from '../../src/lib/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');
      
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom values', () => {
      const error = new AppError('Custom error', 418, 'CUSTOM_ERROR', { foo: 'bar' });
      
      expect(error.statusCode).toBe(418);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.details).toEqual({ foo: 'bar' });
    });

    it('should serialize to JSON correctly', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR');
      const json = error.toJSON();
      
      expect(json).toEqual({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
        },
      });
    });

    it('should include details in JSON when present', () => {
      const error = new AppError('Test error', 400, 'TEST_ERROR', { field: 'value' });
      const json = error.toJSON();
      
      expect(json.error.details).toEqual({ field: 'value' });
    });
  });

  describe('BadRequestError', () => {
    it('should have correct status code and code', () => {
      const error = new BadRequestError();
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should accept custom message', () => {
      const error = new BadRequestError('Invalid input');
      
      expect(error.message).toBe('Invalid input');
    });
  });

  describe('ValidationError', () => {
    it('should have correct status code', () => {
      const error = new ValidationError();
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('should include validation details', () => {
      const error = new ValidationError('Validation failed', {
        email: ['Invalid email format'],
        password: ['Password too short'],
      });
      
      expect(error.details).toEqual({
        email: ['Invalid email format'],
        password: ['Password too short'],
      });
    });
  });

  describe('UnauthorizedError', () => {
    it('should have correct status code', () => {
      const error = new UnauthorizedError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('ForbiddenError', () => {
    it('should have correct status code', () => {
      const error = new ForbiddenError();
      
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('NotFoundError', () => {
    it('should have correct status code', () => {
      const error = new NotFoundError();
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should include resource name in message', () => {
      const error = new NotFoundError('Job');
      
      expect(error.message).toBe('Job not found');
    });
  });

  describe('ConflictError', () => {
    it('should have correct status code', () => {
      const error = new ConflictError();
      
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });
  });

  describe('RateLimitError', () => {
    it('should have correct status code', () => {
      const error = new RateLimitError();
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should include retry after', () => {
      const error = new RateLimitError(120);
      
      expect(error.retryAfter).toBe(120);
    });
  });

  describe('InternalError', () => {
    it('should have correct status code', () => {
      const error = new InternalError();
      
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('InvalidCredentialsError', () => {
    it('should have correct message', () => {
      const error = new InvalidCredentialsError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.message).toBe('Invalid email or password');
    });
  });

  describe('TokenExpiredError', () => {
    it('should have correct message', () => {
      const error = new TokenExpiredError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('TOKEN_EXPIRED');
    });
  });

  describe('AccountLockedError', () => {
    it('should have correct status code', () => {
      const error = new AccountLockedError();
      
      expect(error.statusCode).toBe(423);
      expect(error.code).toBe('ACCOUNT_LOCKED');
    });

    it('should include unlock time in message', () => {
      const unlockTime = new Date('2024-01-01T12:00:00Z');
      const error = new AccountLockedError(unlockTime);
      
      expect(error.message).toContain('2024-01-01');
    });
  });

  describe('Error inheritance', () => {
    it('should be instanceof Error', () => {
      const error = new AppError('Test');
      
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should have stack trace', () => {
      const error = new AppError('Test');
      
      expect(error.stack).toBeDefined();
      // Stack trace contains the test file location, not necessarily the error class name
      // since JavaScript Error.captureStackTrace behavior varies
      expect(error.stack).toContain('errors.test.ts');
    });
  });
});
