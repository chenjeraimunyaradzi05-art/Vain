/**
 * CSRF Protection Middleware
 * 
 * Provides Cross-Site Request Forgery protection for sensitive endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from './logger';

// CSRF token configuration
const CSRF_CONFIG = {
  // Token cookie name
  cookieName: 'csrf_token',
  
  // Token header name
  headerName: 'X-CSRF-Token',
  
  // Token validity period (24 hours)
  maxAge: 24 * 60 * 60 * 1000,
  
  // Secret for signing tokens
  secret: process.env.CSRF_SECRET || process.env.JWT_SECRET || 'csrf-secret-change-me',
  
  // Methods that require CSRF protection
  protectedMethods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  
  // Paths to exclude from CSRF protection
  excludePaths: [
    '/api/auth/login',
    '/api/auth/register',
    '/api/webhooks/',
    '/health',
    '/.well-known/',
  ],
};

/**
 * Generate a CSRF token
 */
export function generateCsrfToken(sessionId: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(16).toString('hex');
  const data = `${sessionId}:${timestamp}:${random}`;
  
  const hmac = crypto.createHmac('sha256', CSRF_CONFIG.secret);
  hmac.update(data);
  const signature = hmac.digest('hex');
  
  return `${data}:${signature}`;
}

/**
 * Verify a CSRF token
 */
export function verifyCsrfToken(token: string, sessionId: string): boolean {
  if (!token) return false;

  const parts = token.split(':');
  if (parts.length !== 4) return false;

  const [tokenSessionId, timestamp, _random, signature] = parts;
  
  // Check session ID matches
  if (tokenSessionId !== sessionId) return false;

  // Check token hasn't expired
  const tokenTime = parseInt(timestamp, 36);
  if (Date.now() - tokenTime > CSRF_CONFIG.maxAge) return false;

  // Verify signature
  const data = parts.slice(0, 3).join(':');
  const hmac = crypto.createHmac('sha256', CSRF_CONFIG.secret);
  hmac.update(data);
  const expectedSignature = hmac.digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Check if path is excluded from CSRF protection
 */
function isExcludedPath(path: string): boolean {
  return CSRF_CONFIG.excludePaths.some(excluded => 
    path.startsWith(excluded) || path === excluded
  );
}

/**
 * CSRF protection middleware
 */
export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip non-protected methods
    if (!CSRF_CONFIG.protectedMethods.includes(req.method)) {
      return next();
    }

    // Skip excluded paths
    if (isExcludedPath(req.path)) {
      return next();
    }

    // Skip if API key auth (machine-to-machine)
    if ((req as any).isApiKeyAuth) {
      return next();
    }

    // Get session ID (from session or user ID)
    const sessionId = (req as any).sessionId || (req as any).user?.id || 'anonymous';

    // Get token from header or body
    const token = 
      req.headers[CSRF_CONFIG.headerName.toLowerCase()] as string ||
      req.body?._csrf;

    if (!token) {
      logger.warn('CSRF token missing', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return void res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required',
        },
      });
    }

    if (!verifyCsrfToken(token, sessionId)) {
      logger.warn('CSRF token invalid', {
        path: req.path,
        method: req.method,
        ip: req.ip,
      });

      return void res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
        },
      });
    }

    next();
  };
}

/**
 * Middleware to attach CSRF token to response
 */
export function csrfTokenProvider() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get session ID
    const sessionId = (req as any).sessionId || (req as any).user?.id || 'anonymous';

    // Generate new token
    const token = generateCsrfToken(sessionId);

    // Set token in cookie
    res.cookie(CSRF_CONFIG.cookieName, token, {
      httpOnly: false, // Needs to be readable by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_CONFIG.maxAge,
    });

    // Also attach to response locals for server-side rendering
    res.locals.csrfToken = token;

    next();
  };
}

/**
 * Get CSRF token for client
 */
export function getCsrfTokenRoute() {
  return (req: Request, res: Response) => {
    const sessionId = (req as any).sessionId || (req as any).user?.id || 'anonymous';
    const token = generateCsrfToken(sessionId);

    res.cookie(CSRF_CONFIG.cookieName, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_CONFIG.maxAge,
    });

    res.json({
      success: true,
      data: { token },
    });
  };
}

export default csrfProtection;

export {};

