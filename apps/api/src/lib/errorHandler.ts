import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

/**
 * Standard error codes
 */
export const ErrorCodes = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  
  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
};

/**
 * HTTP status code to error code mapping
 */
const StatusToErrorCode: Record<number, string> = {
  400: ErrorCodes.BAD_REQUEST,
  401: ErrorCodes.UNAUTHORIZED,
  403: ErrorCodes.FORBIDDEN,
  404: ErrorCodes.NOT_FOUND,
  409: ErrorCodes.CONFLICT,
  422: ErrorCodes.VALIDATION_ERROR,
  429: ErrorCodes.RATE_LIMITED,
  413: ErrorCodes.PAYLOAD_TOO_LARGE,
  500: ErrorCodes.INTERNAL_ERROR,
  503: ErrorCodes.SERVICE_UNAVAILABLE,
};

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  statusCode: number;
  code: string;
  details: any;
  isOperational: boolean;
  retryAfter?: number | string;

  constructor(message: string, statusCode: number = 500, code: string | null = null, details: any = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || StatusToErrorCode[statusCode] || ErrorCodes.INTERNAL_ERROR;
    this.details = details;
    this.isOperational = true; // Distinguishes operational errors from programming errors
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Factory functions for common errors
 */
export const Errors = {
  badRequest: (message = 'Bad request', details: any = null) => 
    new ApiError(message, 400, ErrorCodes.BAD_REQUEST, details),
  
  unauthorized: (message = 'Unauthorized') => 
    new ApiError(message, 401, ErrorCodes.UNAUTHORIZED),
  
  forbidden: (message = 'Forbidden') => 
    new ApiError(message, 403, ErrorCodes.FORBIDDEN),
  
  notFound: (resource = 'Resource') => 
    new ApiError(`${resource} not found`, 404, ErrorCodes.NOT_FOUND),
  
  conflict: (message = 'Resource already exists') => 
    new ApiError(message, 409, ErrorCodes.CONFLICT),
  
  validation: (errors: any) => 
    new ApiError('Validation failed', 422, ErrorCodes.VALIDATION_ERROR, errors),
  
  rateLimited: (retryAfter: number | string | null = null) => {
    const error = new ApiError('Too many requests', 429, ErrorCodes.RATE_LIMITED);
    if (retryAfter) error.retryAfter = retryAfter;
    return error;
  },
  
  internal: (message = 'Internal server error') => 
    new ApiError(message, 500, ErrorCodes.INTERNAL_ERROR),
  
  database: (message = 'Database operation failed') => 
    new ApiError(message, 500, ErrorCodes.DATABASE_ERROR),
  
  serviceUnavailable: (service = 'Service') => 
    new ApiError(`${service} is temporarily unavailable`, 503, ErrorCodes.SERVICE_UNAVAILABLE),
};

/**
 * Generate a unique request ID
 */
export function generateRequestId() {
  return `req_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Format error response
 */
export function formatErrorResponse(error: any, requestId: string | null = null) {
  const response: any = {
    error: error.message || 'An unexpected error occurred',
    code: error.code || ErrorCodes.INTERNAL_ERROR,
    timestamp: new Date().toISOString(),
  };

  if (requestId) {
    response.requestId = requestId;
  }

  if (error.details) {
    response.details = error.details;
  }

  return response;
}

/**
 * Send standardized error response
 */
export function sendError(res: Response, error: any, requestId: string | null = null) {
  const statusCode = error.statusCode || 500;
  const response = formatErrorResponse(error, requestId);
  
  // Add Retry-After header for rate limiting
  if (error.retryAfter) {
    res.set('Retry-After', String(error.retryAfter));
  }

  return void res.status(statusCode).json(response);
}

/**
 * Send standardized success response
 */
export function sendSuccess(res: Response, data: any, statusCode = 200, meta: any = null) {
  const response: any = { success: true, ...data };
  
  if (meta) {
    response.meta = meta;
  }

  return void res.status(statusCode).json(response);
}

/**
 * Send paginated response
 */
export function sendPaginated(res: Response, items: any[], total: number, page: number, pageSize: number, meta: any = null) {
  const totalPages = Math.ceil(total / pageSize);
  
  return void res.json({
    success: true,
    data: items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
    ...(meta && { meta }),
  });
}

/**
 * Async handler wrapper to catch errors
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request ID middleware
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  // @ts-ignore
  res.set('X-Request-ID', req.requestId);
  next();
}

/**
 * Global error handler middleware
 * Integrates with structured logger for consistent error tracking
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Determine error severity
  const isClientError = err.statusCode >= 400 && err.statusCode < 500;
  const isOperational = err.isOperational === true;
  
  // Log error using structured logger
  const errorContext = {
    // @ts-ignore
    requestId: req.requestId || 'unknown',
    path: req.path,
    method: req.method,
    code: err.code,
    statusCode: err.statusCode || 500,
    userId: (req as any).user?.id,
    ip: req.ip,
  };

  if (isClientError) {
    // Client errors are less severe - log as warning
    logger.warn(`Client error: ${err.message}`, {
      type: 'error',
      ...errorContext,
      error: err.message,
    });
  } else {
    // Server errors - log as error with stack trace
    logger.error(err.message, errorContext, err);
  }

  // Handle Prisma errors
  if (err.code === 'P2002') {
    // @ts-ignore
    return sendError(res, Errors.conflict('Resource already exists'), req.requestId);
  }
  
  if (err.code === 'P2025') {
    // @ts-ignore
    return sendError(res, Errors.notFound(), req.requestId);
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    // @ts-ignore
    return sendError(res, Errors.validation(err.flatten()), req.requestId);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    // @ts-ignore
    return sendError(res, Errors.unauthorized('Invalid or expired token'), req.requestId);
  }

  // Handle API errors
  if (err instanceof ApiError) {
    // @ts-ignore
    return sendError(res, err, req.requestId);
  }

  // Handle AppError-style errors (statusCode/code)
  if (typeof err.statusCode === 'number' && err.statusCode >= 400) {
    // @ts-ignore
    return sendError(res, err, req.requestId);
  }

  // Default to internal error
  const error = Errors.internal(
    process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  );
  
  // @ts-ignore
  return sendError(res, error, req.requestId);
}

/**
 * 404 handler middleware
 */
export function notFoundHandler(req: Request, res: Response) {
  // @ts-ignore
  return sendError(res, Errors.notFound('Endpoint'), req.requestId);
}

