/**
 * Rate Limiting Middleware
 * 
 * Advanced rate limiting with:
 * - IP-based limiting for anonymous users
 * - User-based limiting for authenticated users
 * - Sliding window algorithm
 * - Tiered limits based on user role
 * - Endpoint-specific limits
 * - Distributed rate limiting via Redis
 * - Graceful degradation
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

// Types
export interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
  keyPrefix?: string;    // Redis key prefix
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  handler?: (req: Request, res: Response) => void;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  retryAfter: number;
}

export interface RateLimitTier {
  anonymous: RateLimitConfig;
  authenticated: RateLimitConfig;
  premium: RateLimitConfig;
  admin: RateLimitConfig;
}

// Default configurations
const DEFAULT_LIMITS: RateLimitTier = {
  anonymous: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  authenticated: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 500,
  },
  premium: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 2000,
  },
  admin: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10000,
  },
};

// Endpoint-specific limits
const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  // File uploads - stricter
  'POST:/upload': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 50,
  },
  // Search endpoints
  'GET:/search': {
    windowMs: 60 * 1000,
    maxRequests: 30, // 30 searches per minute
  },
  // AI endpoints
  'POST:/ai/*': {
    windowMs: 60 * 1000,
    maxRequests: 10, // 10 AI requests per minute
  },
  // Messaging
  'POST:/messages': {
    windowMs: 60 * 1000,
    maxRequests: 60, // 1 message per second average
  },
};

// Whitelisted IPs (for monitoring, health checks, etc.)
const WHITELISTED_IPS = new Set([
  '127.0.0.1',
  '::1',
  // Add monitoring IPs
]);

// Whitelisted paths
const WHITELISTED_PATHS = new Set([
  '/health',
  '/ready',
  '/metrics',
]);

class RateLimiter {
  private static instance: RateLimiter;
  private useRedis: boolean = true;
  private localStore: Map<string, { count: number; resetTime: number }> = new Map();

  private constructor() {
    // Check if Redis is available
    this.checkRedisConnection();
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check Redis connection
   */
  private async checkRedisConnection(): Promise<void> {
    try {
      await redisCache.set('rate_limit:ping', 'pong', 10);
      this.useRedis = true;
    } catch (error) {
      logger.warn('Redis not available for rate limiting, using local store');
      this.useRedis = false;
    }
  }

  /**
   * Create rate limiting middleware
   */
  createMiddleware(config?: Partial<RateLimitConfig>) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check whitelists
        if (this.shouldSkip(req)) {
          return next();
        }

        // Determine the applicable rate limit
        const limitConfig = this.getApplicableLimit(req, config);
        
        // Generate key
        const key = this.generateKey(req, limitConfig);

        // Check rate limit
        const result = await this.checkLimit(key, limitConfig);

        // Set headers
        this.setHeaders(res, result);

        // Check if limited
        if (result.remaining < 0) {
          logger.warn('Rate limit exceeded', {
            key,
            ip: this.getClientIP(req),
            path: req.path,
            userId: (req as any).user?.id,
          });

          // Call custom handler or default
          if (limitConfig.handler) {
            return limitConfig.handler(req, res);
          }

          return void res.status(429).json({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: result.retryAfter,
            resetTime: result.resetTime.toISOString(),
          });
        }

        next();
      } catch (error) {
        // On error, allow the request (fail open)
        logger.error('Rate limiting error', { error });
        next();
      }
    };
  }

  /**
   * Check if request should skip rate limiting
   */
  private shouldSkip(req: Request): boolean {
    // Whitelisted paths
    if (WHITELISTED_PATHS.has(req.path)) {
      return true;
    }

    // Whitelisted IPs
    const clientIP = this.getClientIP(req);
    if (WHITELISTED_IPS.has(clientIP)) {
      return true;
    }

    return false;
  }

  /**
   * Get applicable rate limit config
   */
  private getApplicableLimit(
    req: Request,
    customConfig?: Partial<RateLimitConfig>
  ): RateLimitConfig {
    // Check endpoint-specific limits first
    const endpointKey = `${req.method}:${req.path}`;
    if (ENDPOINT_LIMITS[endpointKey]) {
      return { ...DEFAULT_LIMITS.authenticated, ...ENDPOINT_LIMITS[endpointKey] };
    }

    // Check wildcard endpoint limits
    for (const [pattern, config] of Object.entries(ENDPOINT_LIMITS)) {
      if (pattern.includes('*')) {
        const regexPattern = pattern.replace('*', '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        if (regex.test(endpointKey)) {
          return { ...DEFAULT_LIMITS.authenticated, ...config };
        }
      }
    }

    // User-based limits
    const user = (req as any).user;
    if (user) {
      if (user.role === 'admin') {
        return { ...DEFAULT_LIMITS.admin, ...customConfig };
      }
      if (user.subscription === 'premium') {
        return { ...DEFAULT_LIMITS.premium, ...customConfig };
      }
      return { ...DEFAULT_LIMITS.authenticated, ...customConfig };
    }

    // Anonymous limits
    return { ...DEFAULT_LIMITS.anonymous, ...customConfig };
  }

  /**
   * Generate rate limit key
   */
  private generateKey(req: Request, config: RateLimitConfig): string {
    // Custom key generator
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    const prefix = config.keyPrefix || 'rl';
    const user = (req as any).user;

    // User-based key for authenticated users
    if (user) {
      return `${prefix}:user:${user.id}:${req.method}:${req.path}`;
    }

    // IP-based key for anonymous users
    const ip = this.getClientIP(req);
    return `${prefix}:ip:${ip}:${req.method}:${req.path}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    // Check common headers for proxied requests
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
      return ips[0].trim();
    }

    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      return typeof realIP === 'string' ? realIP : realIP[0];
    }

    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Check rate limit (sliding window algorithm)
   */
  private async checkLimit(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    if (this.useRedis) {
      return this.checkLimitRedis(key, config, now, windowStart);
    }

    return this.checkLimitLocal(key, config, now);
  }

  /**
   * Check limit using Redis (distributed)
   */
  private async checkLimitRedis(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): Promise<RateLimitInfo> {
    // Use sorted set for sliding window
    const redisKey = `rate_limit:${key}`;

    try {
      // Remove old entries
      await redisCache.zremrangebyscore(redisKey, 0, windowStart);

      // Count current requests
      const current = await redisCache.zcard(redisKey) || 0;

      // Add current request
      await redisCache.zadd(redisKey, now, `${now}:${Math.random()}`);

      // Set expiry
      await redisCache.expire(redisKey, Math.ceil(config.windowMs / 1000));

      const remaining = config.maxRequests - current - 1;
      const resetTime = new Date(now + config.windowMs);

      return {
        limit: config.maxRequests,
        current: current + 1,
        remaining,
        resetTime,
        retryAfter: remaining < 0 ? Math.ceil(config.windowMs / 1000) : 0,
      };
    } catch (error) {
      // Fallback to local on Redis error
      logger.error('Redis rate limit error, falling back to local', { error });
      return this.checkLimitLocal(key, config, now);
    }
  }

  /**
   * Check limit using local memory (single instance)
   */
  private checkLimitLocal(
    key: string,
    config: RateLimitConfig,
    now: number
  ): RateLimitInfo {
    const stored = this.localStore.get(key);

    // Window expired or new key
    if (!stored || stored.resetTime <= now) {
      const resetTime = now + config.windowMs;
      this.localStore.set(key, { count: 1, resetTime });

      return {
        limit: config.maxRequests,
        current: 1,
        remaining: config.maxRequests - 1,
        resetTime: new Date(resetTime),
        retryAfter: 0,
      };
    }

    // Increment counter
    stored.count++;
    const remaining = config.maxRequests - stored.count;

    return {
      limit: config.maxRequests,
      current: stored.count,
      remaining,
      resetTime: new Date(stored.resetTime),
      retryAfter: remaining < 0 ? Math.ceil((stored.resetTime - now) / 1000) : 0,
    };
  }

  /**
   * Set rate limit headers
   */
  private setHeaders(res: Response, info: RateLimitInfo): void {
    res.setHeader('X-RateLimit-Limit', info.limit);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, info.remaining));
    res.setHeader('X-RateLimit-Reset', Math.ceil(info.resetTime.getTime() / 1000));

    if (info.remaining < 0) {
      res.setHeader('Retry-After', info.retryAfter);
    }
  }

  /**
   * Clean up local store (for memory management)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.localStore.entries()) {
      if (value.resetTime <= now) {
        this.localStore.delete(key);
      }
    }
  }

  /**
   * Get current usage for a key
   */
  async getUsage(req: Request): Promise<RateLimitInfo | null> {
    const config = this.getApplicableLimit(req);
    const key = this.generateKey(req, config);

    if (this.useRedis) {
      const redisKey = `rate_limit:${key}`;
      const count = await redisCache.zcard(redisKey) || 0;
      
      return {
        limit: config.maxRequests,
        current: count,
        remaining: config.maxRequests - count,
        resetTime: new Date(Date.now() + config.windowMs),
        retryAfter: 0,
      };
    }

    const stored = this.localStore.get(key);
    if (!stored) return null;

    return {
      limit: config.maxRequests,
      current: stored.count,
      remaining: config.maxRequests - stored.count,
      resetTime: new Date(stored.resetTime),
      retryAfter: 0,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(req: Request): Promise<void> {
    const config = this.getApplicableLimit(req);
    const key = this.generateKey(req, config);

    if (this.useRedis) {
      await redisCache.delete(`rate_limit:${key}`);
    } else {
      this.localStore.delete(key);
    }

    logger.info('Rate limit reset', { key });
  }

  /**
   * Block a specific IP
   */
  async blockIP(ip: string, durationMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const key = `rate_limit:blocked:${ip}`;
    await redisCache.set(key, 'blocked', Math.ceil(durationMs / 1000));
    logger.warn('IP blocked', { ip, duration: durationMs });
  }

  /**
   * Unblock a specific IP
   */
  async unblockIP(ip: string): Promise<void> {
    await redisCache.delete(`rate_limit:blocked:${ip}`);
    logger.info('IP unblocked', { ip });
  }

  /**
   * Check if IP is blocked
   */
  async isIPBlocked(ip: string): Promise<boolean> {
    const key = `rate_limit:blocked:${ip}`;
    const blocked = await redisCache.get(key);
    return !!blocked;
  }
}

// Create singleton
export const rateLimiter = RateLimiter.getInstance();

// Export middleware factory
export const createRateLimiter = (config?: Partial<RateLimitConfig>) => {
  return rateLimiter.createMiddleware(config);
};

// Pre-configured middlewares
export const defaultRateLimiter = rateLimiter.createMiddleware();

export const strictRateLimiter = rateLimiter.createMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 10,
});

export const relaxedRateLimiter = rateLimiter.createMiddleware({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

export const authRateLimiter = rateLimiter.createMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'auth',
});

export const uploadRateLimiter = rateLimiter.createMiddleware({
  windowMs: 60 * 60 * 1000,
  maxRequests: 20,
  keyPrefix: 'upload',
});

// Cleanup interval (every 5 minutes)
setInterval(() => {
  rateLimiter.cleanup();
}, 5 * 60 * 1000);

// Blocked IP check middleware
export const blockedIPMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || '';
    if (await rateLimiter.isIPBlocked(ip)) {
      return void res.status(403).json({
        error: 'Forbidden',
        message: 'Your IP has been blocked. Please contact support.',
      });
    }
    next();
  } catch (error) {
    next();
  }
};

