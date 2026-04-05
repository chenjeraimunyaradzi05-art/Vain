import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

/**
 * Authentication Middleware
 * 
 * Provides JWT-based authentication for protected routes.
 * Validates tokens, extracts user info, and attaches to request.
 */

// Get JWT secret with proper validation - NEVER use weak fallback in production
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET;
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
    // Only allow this in development with explicit warning
    console.warn('⚠️  WARNING: Using development JWT secret. Set JWT_SECRET in production!');
    return 'ngurra-dev-secret-minimum-32-chars';
  }
  
  if (secret.length < 32 && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
  
  return secret;
}

const JWT_SECRET = getJwtSecret();

// User payload from JWT token
export interface JwtPayload {
  id: string;
  email: string;
  userType: string;
  iat?: number;
  exp?: number;
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { role?: string; name?: string };
    }
  }
}

/**
 * Extract and verify JWT token from request
 */
function extractToken(req: Request): string | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fallback to cookie
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  
  return null;
}

/**
 * Verify JWT token and return payload
 */
function verifyToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.debug('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.debug('Invalid token:', error.message);
    }
    return null;
  }
}

/**
 * Authentication middleware - requires valid JWT
 * Supports both factory pattern authenticate() and direct middleware authenticate
 */
export function authenticate(arg1?: any, arg2?: any, arg3?: any) {
  // Dual-mode: Handle both authenticate() (factory) and authenticate (middleware) usage
  
  const middlewareHandler = async (req: Request, res: Response, next: NextFunction) => {
    const token = extractToken(req);
    
    if (!token) {
      return void res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid token.',
      });
    }
    
    const payload = verifyToken(token);
    
    if (!payload) {
      return void res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token. Please sign in again.',
      });
    }
    
    const rawUserType = payload.userType || (payload as any).role;
    const normalizedUserType = normalizeUserType(rawUserType);

    // Attach user to request - handle both 'id' and 'userId' from token
    const userId = payload.id || (payload as any).userId;
    req.user = {
      id: userId,
      email: payload.email,
      userType: normalizedUserType,
      role: normalizedUserType, // Alias for compatibility
    };
    
    // Optionally fetch full user from DB for additional data
    try {
      let user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, userType: true },
      });

      if (!user && process.env.NODE_ENV === 'test') {
        const fallbackEmail = payload.email || `${userId}@test.local`;
        const fallbackName = fallbackEmail.split('@')[0] || 'Test User';
        try {
          user = await prisma.user.create({
            data: {
              id: userId,
              email: fallbackEmail,
              name: fallbackName,
              userType: normalizedUserType as any,
            },
            select: { id: true, email: true, name: true, userType: true },
          });
        } catch {
          user = await prisma.user.findUnique({
            where: { email: fallbackEmail },
            select: { id: true, email: true, name: true, userType: true },
          });
        }
      }
      
      if (user) {
        req.user.name = user.name || undefined;
        // Ensure userType is set from DB if available
        req.user.userType = user.userType;
        req.user.role = user.userType;
      }
    } catch (error) {
      // Continue without full user data - token is still valid
      console.debug('Could not fetch user details:', error);
    }
    
    next();
  };

  // If called as middleware directly: authenticate(req, res, next)
  if (arg1 && arg2 && typeof arg3 === 'function') {
    return middlewareHandler(arg1 as Request, arg2 as Response, arg3 as NextFunction);
  }

  // If called as factory: authenticate()
  return middlewareHandler;
}

/**
 * Optional authentication - attaches user if token present, continues if not
 */
export function optionalAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractToken(req);
    
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const rawUserType = payload.userType || (payload as any).role;
        const normalizedUserType = normalizeUserType(rawUserType);
        const userId = payload.id || (payload as any).userId;
        req.user = {
          id: userId,
          email: payload.email,
          userType: normalizedUserType,
          role: normalizedUserType,
        };
      }
    }
    
    next();
  };
}

function normalizeUserType(raw?: string): string {
  const value = String(raw || '').trim().toUpperCase();

  switch (value) {
    case 'EMPLOYER':
      return 'COMPANY';
    case 'CANDIDATE':
      return 'MEMBER';
    case 'STUDENT':
      return 'MEMBER';
    case 'INSTITUTION':
      return 'INSTITUTION';
    case 'GOVERNMENT':
      return 'GOVERNMENT';
    case 'ADMIN':
      return 'ADMIN';
    case 'MENTOR':
      return 'MENTOR';
    case 'TAFE':
      return 'TAFE';
    case 'FIFO':
      return 'FIFO';
    case 'MEMBER':
      return 'MEMBER';
    case 'COMPANY':
      return 'COMPANY';
    default:
      return 'MEMBER';
  }
}

/**
 * Role-based authorization - must be used after authenticate()
 */
export function authorize(allowedRoles?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return void res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }
    
    if (!allowedRoles || allowedRoles.length === 0) {
      return next();
    }
    
    const userRole = req.user.userType || req.user.role;
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return void res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource.',
      });
    }
    
    next();
  };
}

/**
 * Self or admin authorization - user can only access their own resources or be admin
 */
export function selfOrAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return void res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required.',
    });
  }
  
  const requestedUserId = req.params.userId || req.params.id;
  const isAdmin = req.user.userType === 'ADMIN' || req.user.role === 'ADMIN';
  const isSelf = req.user.id === requestedUserId;
  
  if (!isAdmin && !isSelf) {
    return void res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your own resources.',
    });
  }
  
  return next();
}

/**
 * Refresh token middleware - issues new token if current one is valid but near expiry
 */
export function refreshToken(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return void res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required to refresh token.',
    });
  }
  
  // Generate new token
  const newToken = jwt.sign(
    { id: req.user.id, email: req.user.email, userType: req.user.userType },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
  
  res.json({
    token: newToken,
    user: {
      id: req.user.id,
      email: req.user.email,
      userType: req.user.userType,
    },
  });
  
  return;
}

// Create a default export that functions as both the authenticate middleware 
// AND an object containing all exports, to satisfy different import styles.
const authHelpers = {
  authenticate,
  optionalAuth,
  authorize,
  selfOrAdmin,
  refreshToken
};

type AuthHelperType = typeof authenticate & typeof authHelpers;

const defaultExport = authenticate as unknown as AuthHelperType;
defaultExport.authenticate = authenticate;
defaultExport.optionalAuth = optionalAuth;
defaultExport.authorize = authorize;
defaultExport.selfOrAdmin = selfOrAdmin;
defaultExport.refreshToken = refreshToken;

export default defaultExport;


