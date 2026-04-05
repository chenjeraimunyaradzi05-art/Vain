/**
 * Application Error Classes
 * 
 * Structured error handling for the API with proper HTTP status codes
 * and error codes.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: Record<string, any>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

// ==========================================
// Client Errors (4xx)
// ==========================================

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: Record<string, any>) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: Record<string, string[]>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(maxSize: string = '10MB') {
    super(`Request payload too large. Maximum size is ${maxSize}`, 413, 'PAYLOAD_TOO_LARGE');
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string = 'Unable to process request', details?: Record<string, any>) {
    super(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }
}

// ==========================================
// Server Errors (5xx)
// ==========================================

export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(message || `External service error: ${service}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

// ==========================================
// Domain-Specific Errors
// ==========================================

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_FAILED');
  }
}

export class TokenExpiredError extends AppError {
  constructor() {
    super('Token has expired', 401, 'TOKEN_EXPIRED');
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }
}

export class AccountLockedError extends AppError {
  constructor(unlockTime?: Date) {
    const message = unlockTime 
      ? `Account locked until ${unlockTime.toISOString()}`
      : 'Account is locked due to too many failed login attempts';
    super(message, 423, 'ACCOUNT_LOCKED');
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super('Please verify your email address to continue', 403, 'EMAIL_NOT_VERIFIED');
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(requiredPermission?: string) {
    const message = requiredPermission
      ? `Insufficient permissions. Required: ${requiredPermission}`
      : 'Insufficient permissions for this action';
    super(message, 403, 'INSUFFICIENT_PERMISSIONS');
  }
}

export class ResourceExhaustedError extends AppError {
  constructor(resource: string) {
    super(`${resource} limit reached`, 429, 'RESOURCE_EXHAUSTED');
  }
}

export class SubscriptionRequiredError extends AppError {
  constructor(feature: string) {
    super(`Subscription required to access ${feature}`, 402, 'SUBSCRIPTION_REQUIRED');
  }
}

// ==========================================
// Error Handler Middleware
// ==========================================

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log error
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('Server error', {
        code: err.code,
        message: err.message,
        path: req.path,
        method: req.method,
        userId: (req as any).user?.id,
      }, err);
    } else {
      logger.warn('Client error', {
        code: err.code,
        message: err.message,
        path: req.path,
        method: req.method,
      });
    }
  } else {
    logger.error('Unexpected error', {
      message: err.message,
      path: req.path,
      method: req.method,
    }, err);
  }

  // Handle rate limit errors
  if (err instanceof RateLimitError) {
    res.setHeader('Retry-After', err.retryAfter.toString());
  }

  // Send response
  if (err instanceof AppError) {
    res.status(err.statusCode).json(err.toJSON());
  } else {
    // Unknown errors - don't leak details in production
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred'
          : err.message,
      },
    });
  }
}

// ==========================================
// Async Handler Wrapper
// ==========================================

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default AppError;

export {};
