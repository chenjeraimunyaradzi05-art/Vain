// @ts-nocheck
"use strict";

/**
 * Redis-Backed Rate Limiter (Step 2)
 * 
 * Distributed rate limiting using Redis with sliding window algorithm.
 * Falls back to in-memory rate limiting when Redis is unavailable.
 */

// Try to import ioredis, fallback gracefully
let Redis = null;
let redis = null;

const REDIS_URL = process.env.REDIS_URL;

// Rate limit configurations by endpoint type
const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - strict limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 attempts per window (slightly increased)
    message: 'Too many authentication attempts. Please try again later.',
    keyPrefix: 'rl:auth:',
  },
  // AI endpoints - limited to prevent abuse
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 requests per hour
    message: 'AI request limit reached. Please try again later.',
    keyPrefix: 'rl:ai:',
  },
  // Standard API endpoints
  api: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10000, // 10000 requests per hour (~2.7/sec avg)
    message: 'Rate limit exceeded. Please slow down.',
    keyPrefix: 'rl:api:',
  },
  // Search endpoints - moderate limits
  search: {
    windowMs: 60 * 1000, // 1 minute
    max: 120, // 120 searches per minute (2/sec)
    message: 'Too many search requests. Please slow down.',
    keyPrefix: 'rl:search:',
  },
  // Upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 uploads per hour
    message: 'Upload limit reached. Please try again later.',
    keyPrefix: 'rl:upload:',
  },
  // Sensitive operations (password reset, etc.)
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 attempts per hour
    message: 'Too many attempts. Please try again later.',
    keyPrefix: 'rl:sensitive:',
  },
  // Enterprise tier - higher limits
  enterprise: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50000, // 50,000 requests per hour
    message: 'Rate limit exceeded. Contact support for limit increase.',
    keyPrefix: 'rl:enterprise:',
  },
};

// In-memory fallback storage
const memoryStore = new Map();

/**
 * Initialize Redis connection for rate limiting
 */
async function initRateLimitRedis() {
  if (!REDIS_URL) {
    console.log('[RateLimit] Redis URL not configured, using in-memory store');
    return false;
  }

  try {
    Redis = (await import('ioredis')).default;
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      keyPrefix: 'ngurra:',
    });

    redis.on('error', (err) => {
      console.error('[RateLimit] Redis error:', err.message);
    });

    console.log('[RateLimit] Redis rate limiter initialized');
    return true;
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Redis:', error.message);
    redis = null;
    return false;
  }
}

/**
 * Get rate limit key from request
 * @param {Request} req - Express request
 * @param {string} prefix - Key prefix
 * @returns {string} Rate limit key
 */
function getRateLimitKey(req, prefix) {
  // Use authenticated user ID if available, otherwise IP
  const identifier = req.user?.id || req.ip || req.connection?.remoteAddress || 'unknown';
  return `${prefix}${identifier}`;
}

/**
 * Sliding window rate limiter using Redis
 * @param {string} key - Rate limit key
 * @param {number} windowMs - Window size in milliseconds
 * @param {number} max - Maximum requests per window
 * @returns {Promise<{ allowed: boolean, remaining: number, resetTime: number }>}
 */
async function checkRateLimitRedis(key, windowMs, max) {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set for sliding window
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry on the key
    pipeline.pexpire(key, windowMs);

    const results = await pipeline.exec();
    const currentCount = results[1][1];

    const allowed = currentCount < max;
    const remaining = Math.max(0, max - currentCount - 1);
    const resetTime = now + windowMs;

    return { allowed, remaining, resetTime, current: currentCount + 1 };
  } catch (error) {
    console.error('[RateLimit] Redis error, falling back to memory:', error.message);
    return checkRateLimitMemory(key, windowMs, max);
  }
}

/**
 * In-memory sliding window rate limiter fallback
 */
function checkRateLimitMemory(key, windowMs, max) {
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Remove old entries
  record.timestamps = record.timestamps.filter(ts => ts > windowStart);

  const currentCount = record.timestamps.length;
  const allowed = currentCount < max;

  if (allowed) {
    record.timestamps.push(now);
  }

  const remaining = Math.max(0, max - record.timestamps.length);
  const resetTime = now + windowMs;

  // Clean up old entries periodically
  if (memoryStore.size > 10000) {
    const cutoff = now - (60 * 60 * 1000); // 1 hour
    for (const [k, v] of memoryStore.entries()) {
      if (v.timestamps.every(ts => ts < cutoff)) {
        memoryStore.delete(k);
      }
    }
  }

  return { allowed, remaining, resetTime, current: record.timestamps.length };
}

/**
 * Check rate limit
 */
async function checkRateLimit(key, windowMs, max) {
  if (redis) {
    return checkRateLimitRedis(key, windowMs, max);
  }
  return checkRateLimitMemory(key, windowMs, max);
}

/**
 * Create rate limiter middleware
 * @param {string} type - Rate limit type (auth, ai, api, search, upload, sensitive, enterprise)
 * @param {object} overrides - Override default config
 * @returns {Function} Express middleware
 */
function createRateLimiter(type = 'api', overrides = {}) {
  const config = { ...RATE_LIMIT_CONFIGS[type], ...overrides };

  return async (req, res, next) => {
    try {
      const key = getRateLimitKey(req, config.keyPrefix);
      const result = await checkRateLimit(key, config.windowMs, config.max);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': config.max,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000),
        'X-RateLimit-Policy': `${config.max};w=${Math.ceil(config.windowMs / 1000)}`,
      });

      if (!result.allowed) {
        res.set('Retry-After', Math.ceil(config.windowMs / 1000));
        return void res.status(429).json({
          error: 'rate_limited',
          message: config.message,
          retryAfter: Math.ceil(config.windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      console.error('[RateLimit] Error:', error);
      // On error, allow the request but log it
      next();
    }
  };
}

/**
 * Skip rate limiting for certain conditions
 * @param {Function} skipFn - Function that returns true to skip rate limiting
 * @returns {Function} Middleware
 */
function skipIf(skipFn) {
  return (middleware) => {
    return (req, res, next) => {
      if (skipFn(req)) {
        return next();
      }
      return middleware(req, res, next);
    };
  };
}

/**
 * Rate limit by specific key (e.g., API key, user ID)
 * @param {Function} keyFn - Function to extract key from request
 * @param {string} type - Rate limit type
 * @param {object} overrides - Config overrides
 */
function rateLimitByKey(keyFn, type = 'api', overrides = {}) {
  const config = { ...RATE_LIMIT_CONFIGS[type], ...overrides };

  return async (req, res, next) => {
    try {
      const customKey = keyFn(req);
      if (!customKey) {
        return next();
      }

      const key = `${config.keyPrefix}${customKey}`;
      const result = await checkRateLimit(key, config.windowMs, config.max);

      res.set({
        'X-RateLimit-Limit': config.max,
        'X-RateLimit-Remaining': result.remaining,
        'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000),
      });

      if (!result.allowed) {
        res.set('Retry-After', Math.ceil(config.windowMs / 1000));
        return void res.status(429).json({
          error: 'rate_limited',
          message: config.message,
          retryAfter: Math.ceil(config.windowMs / 1000),
        });
      }

      next();
    } catch (error) {
      console.error('[RateLimit] Error:', error);
      next();
    }
  };
}

/**
 * Admin endpoint to check rate limit status
 * @param {string} identifier - User ID or IP
 * @param {string} type - Rate limit type
 */
async function getRateLimitStatus(identifier, type = 'api') {
  const config = RATE_LIMIT_CONFIGS[type];
  const key = `${config.keyPrefix}${identifier}`;
  
  if (redis) {
    try {
      const now = Date.now();
      const windowStart = now - config.windowMs;
      const count = await redis.zcount(key, windowStart, now);
      return {
        identifier,
        type,
        current: count,
        limit: config.max,
        remaining: Math.max(0, config.max - count),
        windowMs: config.windowMs,
      };
    } catch (error) {
      console.error('[RateLimit] Status check error:', error);
    }
  }

  // Memory fallback
  const record = memoryStore.get(key);
  const count = record?.timestamps?.length || 0;
  return {
    identifier,
    type,
    current: count,
    limit: config.max,
    remaining: Math.max(0, config.max - count),
    windowMs: config.windowMs,
  };
}

/**
 * Reset rate limit for a specific identifier
 * @param {string} identifier - User ID or IP
 * @param {string} type - Rate limit type
 */
async function resetRateLimit(identifier, type = 'api') {
  const config = RATE_LIMIT_CONFIGS[type];
  const key = `${config.keyPrefix}${identifier}`;

  if (redis) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error('[RateLimit] Reset error:', error);
    }
  }

  memoryStore.delete(key);
  return true;
}

// Pre-built middleware instances
const rateLimiters = {
  auth: createRateLimiter('auth'),
  ai: createRateLimiter('ai'),
  api: createRateLimiter('api'),
  search: createRateLimiter('search'),
  upload: createRateLimiter('upload'),
  sensitive: createRateLimiter('sensitive'),
  enterprise: createRateLimiter('enterprise'),
};

