/**
 * Unified Rate Limiting Configuration
 * 
 * Consolidates all rate limiting into a single, configurable system.
 * Replaces: rateLimiter.ts, rateLimit.ts, and app.ts rate limiter
 */

import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// Environment checks
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test' || process.env.SES_TEST_CAPTURE === '1';
const isDevelopment = NODE_ENV === 'development';

// Rate limit multiplier - higher for tests and development for better DX
const RATE_MULTIPLIER = isTest ? 100 : isDevelopment ? 10 : 1;

/**
 * Redis client for rate limiting (production only)
 */
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  // Only use Redis if REDIS_URL is explicitly configured
  if (!isProduction || !process.env.REDIS_URL) return null;
  
  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        connectTimeout: 500,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      
      redisClient.on('error', (err) => {
        console.warn('Rate limit Redis error:', err.message);
      });
    } catch (err) {
      console.warn('Failed to connect to Redis for rate limiting, using memory store');
      return null;
    }
  }
  
  return redisClient;
}

/**
 * Rate limit tiers
 */
export const RateLimitTier = {
  // Public endpoints - anyone can access
  PUBLIC: 'public',
  // Authenticated users
  AUTHENTICATED: 'authenticated',
  // Premium/paid users
  PREMIUM: 'premium',
  // Admin users
  ADMIN: 'admin',
  // Sensitive operations (login, password reset)
  SENSITIVE: 'sensitive',
  // AI/expensive operations
  AI: 'ai',
  // File uploads
  UPLOAD: 'upload',
  // Search operations
  SEARCH: 'search',
  // WebSocket connections
  WEBSOCKET: 'websocket',
} as const;

type RateLimitTierType = typeof RateLimitTier[keyof typeof RateLimitTier];

// Read from environment variables with fallbacks
const ENV_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min default
const ENV_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2000', 10);
const ENV_AUTH_MAX = parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5000', 10);

/**
 * Rate limit configurations
 */
const RATE_CONFIGS: Record<RateLimitTierType, { windowMs: number; max: number; message: string }> = {
  public: {
    windowMs: ENV_WINDOW_MS,
    max: ENV_MAX_REQUESTS * RATE_MULTIPLIER,
    message: 'Too many requests. Please try again in 15 minutes.',
  },
  authenticated: {
    windowMs: ENV_WINDOW_MS,
    max: ENV_AUTH_MAX * RATE_MULTIPLIER,
    message: 'Rate limit exceeded. Please slow down.',
  },
  premium: {
    windowMs: ENV_WINDOW_MS,
    max: (ENV_AUTH_MAX * 2) * RATE_MULTIPLIER,
    message: 'Premium rate limit exceeded.',
  },
  admin: {
    windowMs: ENV_WINDOW_MS,
    max: (ENV_AUTH_MAX * 4) * RATE_MULTIPLIER,
    message: 'Admin rate limit exceeded.',
  },
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10 * RATE_MULTIPLIER,
    message: 'Too many attempts. Please try again in an hour.',
  },
  ai: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 * RATE_MULTIPLIER,
    message: 'AI rate limit reached. Please wait before making more AI requests.',
  },
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50 * RATE_MULTIPLIER,
    message: 'Upload limit reached. Please try again later.',
  },
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 30 * RATE_MULTIPLIER,
    message: 'Search rate limit reached. Please wait before searching again.',
  },
  websocket: {
    windowMs: 60 * 1000,
    max: 100 * RATE_MULTIPLIER,
    message: 'WebSocket connection limit reached.',
  },
};

/**
 * Generate rate limit key based on request
 */
function keyGenerator(req: Request): string {
  // Use user ID if authenticated
  const userId = (req as any).user?.id;
  if (userId) {
    return `rate:user:${userId}`;
  }
  
  // Get real IP behind proxy
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim()
    : req.ip || 'unknown';
  
  return `rate:ip:${ip}`;
}

/**
 * Determine the rate limit tier for a request
 */
function getTierForRequest(req: Request): RateLimitTierType {
  const user = (req as any).user;
  
  if (!user) {
    return RateLimitTier.PUBLIC;
  }
  
  if (user.userType === 'ADMIN' || user.role === 'ADMIN') {
    return RateLimitTier.ADMIN;
  }
  
  // Check for premium/enterprise subscription
  if (user.subscriptionTier === 'PREMIUM' || user.subscriptionTier === 'ENTERPRISE') {
    return RateLimitTier.PREMIUM;
  }
  
  return RateLimitTier.AUTHENTICATED;
}

/**
 * Create a rate limiter for a specific tier
 */
export function createRateLimiter(
  tier: RateLimitTierType,
  overrides: Partial<{ windowMs: number; max: number; message: string }> = {}
) {
  const config = { ...RATE_CONFIGS[tier], ...overrides };
  
  // Skip rate limiting in development (unless explicitly enabled)
  if (isDevelopment && process.env.ENABLE_RATE_LIMIT !== 'true') {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: 'Rate limit exceeded',
      message: config.message,
      retryAfter: Math.ceil(config.windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip: (req) => {
      // Skip health checks
      if (req.path === '/health' || req.path === '/api/health') {
        return true;
      }
      return false;
    },
    handler: (req, res) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    },
  });
}

/**
 * Smart rate limiter that auto-detects user tier
 */
export function smartRateLimiter() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip in development
    if (isDevelopment && process.env.ENABLE_RATE_LIMIT !== 'true') {
      return next();
    }
    
    const tier = getTierForRequest(req);
    const limiter = createRateLimiter(tier);
    return limiter(req, res, next);
  };
}

/**
 * Pre-configured limiters for common use cases
 */
export const limiters = {
  /** Public endpoints (jobs, courses list) */
  public: createRateLimiter(RateLimitTier.PUBLIC),
  
  /** Authenticated user endpoints */
  authenticated: createRateLimiter(RateLimitTier.AUTHENTICATED),
  
  /** Premium user endpoints */
  premium: createRateLimiter(RateLimitTier.PREMIUM),
  
  /** Admin endpoints */
  admin: createRateLimiter(RateLimitTier.ADMIN),
  
  /** Sensitive operations (login, password reset, 2FA) */
  sensitive: createRateLimiter(RateLimitTier.SENSITIVE),
  
  /** AI endpoints */
  ai: createRateLimiter(RateLimitTier.AI),
  
  /** File upload endpoints */
  upload: createRateLimiter(RateLimitTier.UPLOAD),
  
  /** Search endpoints */
  search: createRateLimiter(RateLimitTier.SEARCH),
  
  /** WebSocket connections */
  websocket: createRateLimiter(RateLimitTier.WEBSOCKET),
  
  /** Smart limiter that auto-detects tier */
  smart: smartRateLimiter(),
  
  /** Login attempts - extra strict */
  login: createRateLimiter(RateLimitTier.SENSITIVE, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5 * RATE_MULTIPLIER,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  }),
  
  /** API key endpoints */
  apiKey: createRateLimiter(RateLimitTier.AUTHENTICATED, {
    windowMs: 60 * 1000, // 1 minute
    max: 500 * RATE_MULTIPLIER,
    message: 'API rate limit exceeded.',
  }),
};

/**
 * Global rate limiter for app.ts (replaces the inline one)
 */
export function globalRateLimiter() {
  // Skip entirely in development unless explicitly enabled
  if (isDevelopment && process.env.ENABLE_RATE_LIMIT !== 'true') {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }
  
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 100000 : 5000, // Increased from 300 to 5000 for better UX
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip health checks and static assets
      return req.path === '/health' || 
             req.path === '/api/health' ||
             req.path.startsWith('/static/');
    },
  });
}

export default limiters;
