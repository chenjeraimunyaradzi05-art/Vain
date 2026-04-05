// @ts-nocheck
/**
 * Base Controller
 * 
 * Provides common functionality for all controllers including
 * standardized response formatting and error handling.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Base controller with common utilities
 */
export abstract class BaseController {
  /**
   * Send success response
   */
  protected success<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
    };
    return void res.status(statusCode).json(response);
  }

  /**
   * Send paginated success response
   */
  protected successWithPagination<T>(
    res: Response,
    data: T,
    meta: { page: number; pageSize: number; total: number },
    message?: string
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta: {
        ...meta,
        totalPages: Math.ceil(meta.total / meta.pageSize),
      },
    };
    return void res.status(200).json(response);
  }

  /**
   * Send error response
   */
  protected error(res: Response, message: string, statusCode = 400, details?: any): Response {
    const response: ApiResponse = {
      success: false,
      error: message,
      ...(details && { details }),
    };
    return void res.status(statusCode).json(response);
  }

  /**
   * Send not found response
   */
  protected notFound(res: Response, resource = 'Resource'): Response {
    return this.error(res, `${resource} not found`, 404);
  }

  /**
   * Send unauthorized response
   */
  protected unauthorized(res: Response, message = 'Unauthorized'): Response {
    return this.error(res, message, 401);
  }

  /**
   * Send forbidden response
   */
  protected forbidden(res: Response, message = 'Forbidden'): Response {
    return this.error(res, message, 403);
  }

  /**
   * Handle controller errors
   */
  protected handleError(error: unknown, res: Response, context: string): Response {
    // Log the error
    logger.error(`Controller error in ${context}:`, error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return this.error(res, 'Validation failed', 400, error.flatten().fieldErrors);
    }

    // Handle known error types
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('not found')) {
        return this.notFound(res);
      }
      if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
        return this.unauthorized(res, error.message);
      }
      if (error.message.includes('forbidden') || error.message.includes('Forbidden')) {
        return this.forbidden(res, error.message);
      }

      // Generic error - don't expose internal details in production
      const message = process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : error.message;
      
      return this.error(res, message, 500);
    }

    // Unknown error type
    return this.error(res, 'An unexpected error occurred', 500);
  }

  /**
   * Extract user from request (after authentication)
   */
  protected getUser(req: Request): { id: string; email: string; userType: string } | null {
    return (req as any).user || null;
  }

  /**
   * Require authenticated user or throw
   */
  protected requireUser(req: Request): { id: string; email: string; userType: string } {
    const user = this.getUser(req);
    if (!user) {
      throw new Error('Unauthorized: Authentication required');
    }
    return user;
  }

  /**
   * Parse pagination params from query
   */
  protected getPagination(req: Request): { page: number; pageSize: number; skip: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const skip = (page - 1) * pageSize;
    return { page, pageSize, skip };
  }
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default BaseController;

