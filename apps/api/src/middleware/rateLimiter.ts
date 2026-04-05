// @ts-nocheck
/**
 * Enhanced Rate Limiting Middleware
 * 
 * Provides tiered rate limiting based on user type,
 * with support for Redis-backed distributed limiting.
 */

const rateLimit = require('express-rate-limit');

// In-memory store for development
const memoryStore = new Map();

/**
 * Memory-based rate limit store (development)
 */
class MemoryRateLimitStore {
  hits: Map<string, number>;
  resetTimes: Map<string, number>;

  constructor() {
    this.hits = new Map();
    this.resetTimes = new Map();
    
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async increment(key) {
    const now = Date.now();
    const resetTime = this.resetTimes.get(key) || now + 60000;
    
    if (now > resetTime) {
      this.hits.set(key, 1);
      this.resetTimes.set(key, now + 60000);
      return { totalHits: 1, resetTime: new Date(now + 60000) };
    }

    const hits = (this.hits.get(key) || 0) + 1;
    this.hits.set(key, hits);
    
    return { totalHits: hits, resetTime: new Date(resetTime) };
  }

  async decrement(key) {
    const hits = Math.max(0, (this.hits.get(key) || 1) - 1);
    this.hits.set(key, hits);
  }

  async resetKey(key) {
    this.hits.delete(key);
    this.resetTimes.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, resetTime] of this.resetTimes) {
      if (now > resetTime) {
        this.hits.delete(key);
        this.resetTimes.delete(key);
      }
    }
  }
}

/**
 * Redis-based rate limit store (production)
 */
class RedisRateLimitStore {
  client: any;
  prefix: string;

  constructor(redisClient: any, prefix = 'rl:') {
    this.client = redisClient;
    this.prefix = prefix;
  }

  async increment(key) {
    const now = Date.now();
    const fullKey = `${this.prefix}${key}`;
    
    const multi = this.client.multi();
    multi.incr(fullKey);
    multi.pttl(fullKey);
    
    const results = await multi.exec();
    const hits = results[0][1];
    const ttl = results[1][1];
    
    // Set expiry if new key
    if (ttl === -1) {
      await this.client.pexpire(fullKey, 60000);
    }

    const resetTime = ttl > 0 ? now + ttl : now + 60000;
    return { totalHits: hits, resetTime: new Date(resetTime) };
  }

  async decrement(key) {
    const fullKey = `${this.prefix}${key}`;
    await this.client.decr(fullKey);
  }

  async resetKey(key) {
    const fullKey = `${this.prefix}${key}`;
    await this.client.del(fullKey);
  }
}

/**
 * Rate limit tiers by user type
 */
const RATE_LIMIT_TIERS = {
  anonymous: {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many requests. Please try again later.',
  },
  authenticated: {
    windowMs: 60 * 1000,
    max: 100,
    message: 'Rate limit exceeded. Please slow down.',
  },
  premium: {
    windowMs: 60 * 1000,
    max: 300,
    message: 'Rate limit exceeded.',
  },
  admin: {
    windowMs: 60 * 1000,
    max: 1000,
    message: 'Admin rate limit exceeded.',
  },
  api: {
    windowMs: 60 * 1000,
    max: 500,
    message: 'API rate limit exceeded.',
  },
};

/**
 * Endpoint-specific rate limits
 */
const ENDPOINT_LIMITS = {
  '/upload': { windowMs: 60 * 1000, max: 10 },
  '/search': { windowMs: 60 * 1000, max: 60 },
  '/recommendations': { windowMs: 60 * 1000, max: 20 },
};

/**
 * Get rate limit key for request
 */
function getKeyGenerator(req) {
  // Use user ID if authenticated, otherwise IP
  if (req.user?.id) {
    return `user:${req.user.id}`;
  }
  
  // Get real IP behind proxy
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
  return `ip:${ip}`;
}

/**
 * Get tier for request
 */
function getTier(req) {
  if (!req.user) return 'anonymous';
  
  if (req.user.role === 'admin') return 'admin';
  if (req.user.isPremium) return 'premium';
  if (req.headers['x-api-key']) return 'api';
  
  return 'authenticated';
}

/**
 * Create tiered rate limiter
 */
function createTieredRateLimiter(store = null) {
  const limitStore = store || new MemoryRateLimitStore();

  return (req, res, next) => {
    const tier = getTier(req);
    const config = RATE_LIMIT_TIERS[tier];
    
    // Check for endpoint-specific limits
    const path = req.path.toLowerCase();
    const endpointConfig = ENDPOINT_LIMITS[path];
    
    const finalConfig = endpointConfig || config;
    
    const limiter = rateLimit({
      windowMs: finalConfig.windowMs,
      max: finalConfig.max,
      message: {
        error: finalConfig.message,
        retryAfter: Math.ceil(finalConfig.windowMs / 1000),
      },
      keyGenerator: getKeyGenerator,
      handler: (req, res) => {
        res.status(429).json({
          error: finalConfig.message,
          retryAfter: Math.ceil(finalConfig.windowMs / 1000),
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    limiter(req, res, next);
  };
}

/**
 * Strict rate limiter for sensitive endpoints
 */
function strictRateLimiter(maxRequests = 5, windowMs = 15 * 60 * 1000) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    skipSuccessfulRequests: false,
    keyGenerator: getKeyGenerator,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many attempts. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Sliding window rate limiter
 */
function slidingWindowLimiter(options: any = {}) {
  const {
    maxRequests = 100,
    windowMs = 60000,
    store = null,
  } = options;

  const windowStore = store || new Map();

  return async (req, res, next) => {
    const key = getKeyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create window
    let requests = windowStore.get(key) || [];
    
    // Remove old requests
    requests = requests.filter(time => time > windowStart);
    
    if (requests.length >= maxRequests) {
      const oldestRequest = Math.min(...requests);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil((oldestRequest + windowMs) / 1000));
      res.setHeader('Retry-After', retryAfter);
      
      return void res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter,
      });
    }

    // Add current request
    requests.push(now);
    windowStore.set(key, requests);

    // Set headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - requests.length);
    res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));

    next();
  };
}

/**
 * Token bucket rate limiter
 */
function tokenBucketLimiter(options: any = {}) {
  const {
    bucketSize = 100,
    refillRate = 10, // tokens per second
    store = null,
  } = options;

  const buckets = store || new Map();

  return async (req, res, next) => {
    const key = getKeyGenerator(req);
    const now = Date.now();

    // Get or create bucket
    let bucket = buckets.get(key) || {
      tokens: bucketSize,
      lastRefill: now,
    };

    // Refill tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    const refill = Math.floor(elapsed * refillRate);
    bucket.tokens = Math.min(bucketSize, bucket.tokens + refill);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const waitTime = Math.ceil((1 - bucket.tokens) / refillRate);
      
      res.setHeader('X-RateLimit-Limit', bucketSize);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', waitTime);
      
      return void res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: waitTime,
      });
    }

    // Consume token
    bucket.tokens -= 1;
    buckets.set(key, bucket);

    res.setHeader('X-RateLimit-Limit', bucketSize);
    res.setHeader('X-RateLimit-Remaining', Math.floor(bucket.tokens));

    next();
  };
}

/**
 * Rate limit bypass for trusted IPs
 */
function bypassTrustedIPs(trustedIPs = []) {
  return (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;
    
    if (trustedIPs.includes(ip)) {
      req.skipRateLimit = true;
    }
    
    next();
  };
}

