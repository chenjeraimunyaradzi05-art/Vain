"use strict";
/**
 * API Response Caching Middleware
 * 
 * In-memory caching for frequently accessed, rarely changing data.
 * For production, this should be replaced with Redis.
 */

// Simple in-memory cache (replace with Redis in production)
const cache = new Map();

// Cache configuration
const CACHE_CONFIG = {
  // Job listings - cache for 2 minutes
  jobs: { ttl: 2 * 60 * 1000 },
  
  // Course listings - cache for 5 minutes
  courses: { ttl: 5 * 60 * 1000 },
  
  // Public company profiles - cache for 10 minutes
  companies: { ttl: 10 * 60 * 1000 },
  
  // Leaderboard - cache for 5 minutes
  leaderboard: { ttl: 5 * 60 * 1000 },
  
  // Events - cache for 2 minutes
  events: { ttl: 2 * 60 * 1000 },
  
  // Forums/topics - cache for 1 minute
  forums: { ttl: 60 * 1000 },
  
  // Advisory council - cache for 15 minutes
  advisory: { ttl: 15 * 60 * 1000 },
  
  // Default - cache for 1 minute
  default: { ttl: 60 * 1000 }
};

/**
 * Generate cache key from request
 */
function getCacheKey(req, prefix = '') {
  const path = req.originalUrl || req.url;
  const userId = req.user?.id || 'anonymous';
  // For public endpoints, don't include user ID
  const isPublic = !req.user;
  return isPublic ? `${prefix}:public:${path}` : `${prefix}:${userId}:${path}`;
}

/**
 * Get cached response
 */
function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Store response in cache
 */
function setInCache(key, data, ttl) {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
    createdAt: Date.now()
  });
  
  // Limit cache size to prevent memory issues
  if (cache.size > 10000) {
    // Remove oldest 20% of entries
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toRemove = entries.slice(0, Math.floor(entries.length * 0.2));
    toRemove.forEach(([key]) => cache.delete(key));
  }
}

/**
 * Clear cache entries matching a pattern
 */
function invalidateCache(pattern) {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Caching middleware factory
 * @param {string} cacheType - One of the keys in CACHE_CONFIG
 * @param {Object} options - Additional options
 */
function cacheMiddleware(cacheType = 'default', options: any = {}) {
  const config = CACHE_CONFIG[cacheType] || CACHE_CONFIG.default;
  const ttl = options.ttl || config.ttl;
  const publicOnly = options.publicOnly !== false; // Default: only cache for unauthenticated requests
  
  return (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Skip caching for authenticated users if publicOnly
    if (publicOnly && req.user) {
      return next();
    }
    
    const key = getCacheKey(req, cacheType);
    const cachedData = getFromCache(key);
    
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-TTL', ttl.toString());
      return void res.json(cachedData);
    }
    
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to cache the response
    res.json = (data) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setInCache(key, data, ttl);
        res.set('X-Cache', 'MISS');
      }
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Middleware to invalidate cache on mutations
 * Use after POST/PUT/DELETE operations
 */
function invalidateCacheMiddleware(patterns) {
  return (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    res.json = (data) => {
      // Invalidate cache on successful mutation
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => invalidateCache(pattern));
      }
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Clear all cache
 */
function clearAllCache() {
  cache.clear();
}

/**
 * Get cache stats
 */
function getCacheStats() {
  let validEntries = 0;
  let expiredEntries = 0;
  const now = Date.now();
  
  for (const entry of cache.values()) {
    if (now > entry.expiresAt) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  }
  
  return {
    totalEntries: cache.size,
    validEntries,
    expiredEntries,
    cacheTypes: Object.keys(CACHE_CONFIG)
  };
}

export {
  cacheMiddleware,
  invalidateCacheMiddleware,
  invalidateCache,
  clearAllCache,
  getCacheStats,
  CACHE_CONFIG
};


