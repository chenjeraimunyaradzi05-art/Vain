/**
 * Rate Limiter with Redis Backend
 * 
 * Advanced rate limiting with sliding window algorithm
 * and support for different limit tiers.
 */

import Redis from 'ioredis';
import type { Request, Response, NextFunction } from 'express';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return redis;
}

/**
 * Sliding window rate limiter using Redis
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const client = getRedisClient();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const fullKey = `${config.keyPrefix}:${key}`;

  try {
    // Use Redis transaction for atomic operations
    const pipeline = client.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(fullKey, 0, windowStart);
    
    // Count current entries
    pipeline.zcard(fullKey);
    
    // Add current request
    pipeline.zadd(fullKey, now, `${now}-${Math.random()}`);
    
    // Set expiry
    pipeline.pexpire(fullKey, config.windowMs);

    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const currentCount = (results[1][1] as number) + 1;
    const remaining = Math.max(0, config.max - currentCount);
    const resetTime = now + config.windowMs;

    return {
      allowed: currentCount <= config.max,
      remaining,
      resetTime,
      totalHits: currentCount,
    };
  } catch (error) {
    // Fallback: allow request if Redis fails (fail-open)
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: config.max,
      resetTime: now + config.windowMs,
      totalHits: 0,
    };
  }
}

/**
 * Express middleware for rate limiting
 */
export function rateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const defaults: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    keyPrefix: 'ratelimit',
    message: 'Too many requests, please try again later.',
    statusCode: 429,
    headers: true,
  };

  const finalConfig = { ...defaults, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = getClientIdentifier(req);
    const result = await checkRateLimit(key, finalConfig);

    if (finalConfig.headers) {
      res.setHeader('X-RateLimit-Limit', finalConfig.max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    }

    if (!result.allowed) {
      res.setHeader('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
      return void res.status(finalConfig.statusCode || 429).json({
        error: finalConfig.message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    next();
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: Request): string {
  // Try API key first
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return `api:${apiKey.substring(0, 16)}`;
  }

  // Try authenticated user
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP
  const ip = 
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection.remoteAddress ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Rate limit tiers
 */
export const rateLimitTiers = {
  // Very strict - for auth endpoints
  auth: rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    keyPrefix: 'ratelimit:auth',
    message: 'Too many login attempts. Please try again in 15 minutes.',
  }),

  // Strict - for sensitive operations
  strict: rateLimitMiddleware({
    windowMs: 60 * 1000,
    max: 10,
    keyPrefix: 'ratelimit:strict',
  }),

  // Standard - for normal API usage
  standard: rateLimitMiddleware({
    windowMs: 60 * 1000,
    max: 100,
    keyPrefix: 'ratelimit:standard',
  }),

  // Relaxed - for public endpoints
  relaxed: rateLimitMiddleware({
    windowMs: 60 * 1000,
    max: 200,
    keyPrefix: 'ratelimit:relaxed',
  }),

  // Enterprise - for API key holders
  enterprise: rateLimitMiddleware({
    windowMs: 60 * 1000,
    max: 1000,
    keyPrefix: 'ratelimit:enterprise',
  }),
};

/**
 * Adaptive rate limiting based on server load
 */
export async function adaptiveRateLimit(
  key: string,
  baseConfig: RateLimitConfig
): Promise<RateLimitResult> {
  // Get current server load (simplified)
  const load = process.cpuUsage();
  const loadFactor = (load.user + load.system) / 1000000; // Normalize

  // Reduce limits under high load
  let adjustedMax = baseConfig.max;
  if (loadFactor > 0.8) {
    adjustedMax = Math.floor(baseConfig.max * 0.5);
  } else if (loadFactor > 0.6) {
    adjustedMax = Math.floor(baseConfig.max * 0.75);
  }

  return checkRateLimit(key, { ...baseConfig, max: adjustedMax });
}

/**
 * Token bucket rate limiter (alternative algorithm)
 */
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryConsume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const newTokens = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

export default {
  checkRateLimit,
  rateLimitMiddleware,
  rateLimitTiers,
  adaptiveRateLimit,
  TokenBucket,
};

export {};

