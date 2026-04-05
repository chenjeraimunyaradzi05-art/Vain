"use strict";
/**
 * Enhanced Rate Limiting Middleware
 * 
 * Provides tiered rate limits based on:
 * - Endpoint type (public/authenticated/admin)
 * - User type (member/company/admin)
 * - Subscription tier (free/pro/enterprise)
 */

const rateLimit = require('express-rate-limit');

// Redis is optional - only import if REDIS_URL is set and we want to use it
let redisClient: any = null;
let RedisStore: any = null;

// Only attempt Redis connection in production with REDIS_URL
const shouldUseRedis = process.env.REDIS_URL && process.env.NODE_ENV === 'production';

if (shouldUseRedis) {
  try {
    const Redis = require('ioredis');
    const redisModule = require('rate-limit-redis');
    RedisStore = redisModule.RedisStore;
    
    redisClient = new Redis(process.env.REDIS_URL, {
      connectTimeout: 2000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times: number) => {
        if (times > 2) return null; // Stop retrying after 2 attempts
        return Math.min(times * 100, 500);
      },
    });
    
    redisClient.on('error', (err: Error) => {
      console.warn('⚠️  Redis rate-limit client error (falling back to memory):', err.message);
      redisClient = null;
    });
    
    redisClient.on('ready', () => {
      console.log('✅ Redis connected for rate limiting');
    });
  } catch (err: any) {
    console.warn('⚠️  Redis not available for rate limiting, using memory store:', err.message);
    redisClient = null;
  }
} else {
  console.log('ℹ️  Using in-memory rate limiting (Redis disabled in development)');
}

const isE2E = process.env.NODE_ENV === 'test' || process.env.SES_TEST_CAPTURE === '1';

// E2E tests get very high limits to avoid flakiness
const E2E_MULTIPLIER = isE2E ? 50 : 1;

/**
 * Rate limit configurations by endpoint type
 */
const RATE_LIMITS = {
  // Public endpoints (login, registration, job listings)
  public: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000 * E2E_MULTIPLIER, // Increased significantly for general browsing
    message: { error: 'Too many requests. Please try again in 15 minutes.' }
  },
  
  // Authenticated user endpoints
  authenticated: {
    windowMs: 15 * 60 * 1000,
    max: 10000 * E2E_MULTIPLIER, // Significant increase for active sessions
    message: { error: 'Rate limit exceeded. Please slow down.' }
  },
  
  // Sensitive endpoints (password reset, verification)
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20 * E2E_MULTIPLIER, // Keeping strict, but slightly more lenient than 10
    message: { error: 'Too many attempts. Please try again in an hour.' }
  },
  
  // AI endpoints (expensive operations)
  ai: {
    windowMs: 60 * 1000, // 1 minute
    max: 100 * E2E_MULTIPLIER, // Increased for power users
    message: { error: 'AI rate limit reached. Please wait before making more AI requests.' }
  },
  
  // File uploads
  uploads: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100 * E2E_MULTIPLIER,
    message: { error: 'Upload limit reached. Please try again later.' }
  },
  
  // Admin endpoints
  admin: {
    windowMs: 15 * 60 * 1000,
    max: 5000 * E2E_MULTIPLIER,
    message: { error: 'Admin rate limit exceeded.' }
  },
  
  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 120 * E2E_MULTIPLIER, // 2 per second averge
    message: { error: 'Search rate limit reached. Please wait before searching again.' }
  }
};

/**
 * Create a rate limiter for a specific endpoint type
 * @param {string} type - One of: public, authenticated, sensitive, ai, uploads, admin, search
 * @param {Object} overrides - Optional config overrides
 */
function createRateLimiter(type: string, overrides = {}) {
  const config = RATE_LIMITS[type] || RATE_LIMITS.public;
  
  // Only use Redis store if Redis client is available, connected, and not in test mode
  const useRedisStore = !isE2E && redisClient && RedisStore;
  
  return rateLimit({
    ...config,
    ...overrides,
    standardHeaders: true,
    legacyHeaders: false,
    // Use MemoryStore if Redis not configured or in tests
    store: useRedisStore ? new RedisStore({
      sendCommand: (...args: any[]) => redisClient.call(...args),
    }) : undefined,
    // Use IP + user ID for authenticated endpoints
    keyGenerator: (req) => {
      const userId = req.user?.id || req.user?.userId || '';
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      return userId ? `${ip}-${userId}` : ip;
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/') return true;
      return false;
    }
  });
}

/**
 * Subscription-aware rate limiter
 * Increases limits based on subscription tier
 */
function subscriptionAwareRateLimiter(baseType = 'authenticated') {
  return (req, res, next) => {
    const subscription = req.subscription || {};
    const tier = subscription.tier || 'FREE';
    
    // Multipliers by tier
    const tierMultipliers = {
      FREE: 1,
      STARTER: 1.5,
      PRO: 2,
      ENTERPRISE: 5
    };
    
    const multiplier = tierMultipliers[tier] || 1;
    const baseConfig = RATE_LIMITS[baseType] || RATE_LIMITS.authenticated;
    
    const limiter = rateLimit({
      ...baseConfig,
      max: Math.floor(baseConfig.max * multiplier),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        const userId = req.user?.id || req.user?.userId || '';
        const ip = req.ip || 'unknown';
        return userId ? `${ip}-${userId}` : ip;
      }
    });
    
    return limiter(req, res, next);
  };
}

// Pre-configured limiters for common use cases
const limiters = {
  public: createRateLimiter('public'),
  authenticated: createRateLimiter('authenticated'),
  sensitive: createRateLimiter('sensitive'),
  ai: createRateLimiter('ai'),
  uploads: createRateLimiter('uploads'),
  admin: createRateLimiter('admin'),
  search: createRateLimiter('search')
};

export {
  createRateLimiter,
  subscriptionAwareRateLimiter,
  limiters,
  RATE_LIMITS
};

