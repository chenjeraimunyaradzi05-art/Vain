/**
 * Request Logging Middleware
 * 
 * Structured logging for all HTTP requests with timing and context.
 */

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface RequestLogData {
  requestId: string;
  method: string;
  path: string;
  query: Record<string, unknown>;
  ip: string;
  userAgent: string;
  userId?: string;
  duration?: number;
  statusCode?: number;
  contentLength?: number;
  error?: string;
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now().toString(36)}${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection.remoteAddress ||
    'unknown'
  );
}

/**
 * Sanitize path to remove sensitive data
 */
function sanitizePath(path: string): string {
  // Replace UUIDs with placeholder
  return path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
}

/**
 * Request logging middleware
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Attach request ID to request and response
    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    // Build initial log data
    const logData: RequestLogData = {
      requestId,
      method: req.method,
      path: sanitizePath(req.path),
      query: req.query as Record<string, unknown>,
      ip: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
    };

    // Log request start
    if (process.env.LOG_REQUESTS === 'true') {
      console.log(JSON.stringify({
        type: 'request',
        timestamp: new Date().toISOString(),
        ...logData,
      }));
    }

    // Capture response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      logData.duration = duration;
      logData.statusCode = res.statusCode;
      logData.contentLength = parseInt(res.get('content-length') || '0', 10);
      logData.userId = (req as any).user?.id;

      // Log level based on status code
      const level = res.statusCode >= 500 ? 'error' : 
                    res.statusCode >= 400 ? 'warn' : 
                    'info';

      console.log(JSON.stringify({
        type: 'response',
        level,
        timestamp: new Date().toISOString(),
        ...logData,
      }));

      // Track slow requests
      if (duration > 1000) {
        console.warn(JSON.stringify({
          type: 'slow_request',
          timestamp: new Date().toISOString(),
          ...logData,
        }));
      }
    });

    // Handle errors
    res.on('error', (error) => {
      logData.error = error.message;
      console.error(JSON.stringify({
        type: 'request_error',
        timestamp: new Date().toISOString(),
        ...logData,
        stack: error.stack,
      }));
    });

    next();
  };
}

/**
 * Morgan-style format for development
 */
export function devLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const status = res.statusCode;
      const color = status >= 500 ? '\x1b[31m' : 
                    status >= 400 ? '\x1b[33m' :
                    status >= 300 ? '\x1b[36m' :
                    '\x1b[32m';
      const reset = '\x1b[0m';

      console.log(
        `${color}${req.method}${reset} ${req.path} ${color}${status}${reset} ${duration}ms`
      );
    });

    next();
  };
}

export default requestLogger;

export {};
