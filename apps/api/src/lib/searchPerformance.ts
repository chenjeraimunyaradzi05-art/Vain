// @ts-nocheck
'use strict';

/**
 * Search Performance Optimization
 * Step 40: Caching, query optimization, and performance monitoring
 * 
 * Provides:
 * - Search result caching
 * - Query optimization strategies
 * - Timeout handling
 * - Slow query monitoring
 * - Cache invalidation strategies
 */

const logger = require('./logger');
const redisCache = require('./redisCache');

// Configuration
const CONFIG = {
  // Cache TTLs in seconds
  SEARCH_CACHE_TTL: 300,       // 5 minutes for search results
  FACET_CACHE_TTL: 600,        // 10 minutes for facets
  SUGGESTION_CACHE_TTL: 1800,  // 30 minutes for suggestions
  POPULAR_CACHE_TTL: 3600,     // 1 hour for popular searches
  
  // Timeouts
  SEARCH_TIMEOUT_MS: 5000,     // 5 second search timeout
  FALLBACK_TIMEOUT_MS: 2000,   // 2 second fallback timeout
  
  // Thresholds
  SLOW_QUERY_THRESHOLD_MS: 500, // Log queries slower than 500ms
  MAX_RESULTS_PER_PAGE: 100,
  DEFAULT_PAGE_SIZE: 20,
  
  // Cache warming
  WARM_CACHE_ON_STARTUP: true,
  POPULAR_QUERIES_TO_WARM: 20
};

/**
 * Search with caching and performance optimization
 * @param {Function} searchFn - The actual search function
 * @param {string} cacheKey - Cache key for this search
 * @param {object} options - Search options
 */
async function cachedSearch(searchFn, cacheKey, options = {}) {
  const {
    bypassCache = false,
    ttl = CONFIG.SEARCH_CACHE_TTL,
    timeout = CONFIG.SEARCH_TIMEOUT_MS
  } = options;

  const startTime = Date.now();

  // Check cache first
  if (!bypassCache) {
    try {
      const cached = await redisCache.get(cacheKey);
      if (cached) {
        return {
          ...cached,
          fromCache: true,
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
      // Cache miss or error, continue with search
    }
  }

  // Execute search with timeout
  try {
    const result = await withTimeout(searchFn(), timeout);
    const duration = Date.now() - startTime;

    // Log slow queries
    if (duration > CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow search query', { 
        cacheKey, 
        duration,
        resultCount: result.total || result.results?.length
      });
    }

    // Cache successful results
    if (result && !result.error) {
      await redisCache.set(cacheKey, result, ttl).catch(() => {});
    }

    return {
      ...result,
      fromCache: false,
      duration
    };
  } catch (error) {
    if (error.message === 'TIMEOUT') {
      logger.error('Search timeout', { cacheKey, timeout });
      return { 
        results: [], 
        total: 0, 
        error: 'Search timed out',
        timeout: true 
      };
    }
    throw error;
  }
}

/**
 * Execute a promise with timeout
 */
function withTimeout(promise, timeoutMs) {
  let timeoutId;
  
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Generate a cache key for a search
 * @param {string} prefix - Cache key prefix (e.g., 'search:jobs')
 * @param {object} params - Search parameters
 */
function generateCacheKey(prefix, params) {
  // Sort and stringify params for consistent keys
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

  const paramsString = JSON.stringify(sortedParams);
  const hash = simpleHash(paramsString);
  
  return `${prefix}:${hash}`;
}

/**
 * Simple hash function for cache keys
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Optimize search query parameters
 * @param {object} params - Raw search parameters
 * @param {string} indexType - Type of content being searched
 */
function optimizeQuery(params, indexType) {
  const optimized = { ...params };

  // Limit page size
  if (optimized.size > CONFIG.MAX_RESULTS_PER_PAGE) {
    optimized.size = CONFIG.MAX_RESULTS_PER_PAGE;
  }
  if (!optimized.size) {
    optimized.size = CONFIG.DEFAULT_PAGE_SIZE;
  }

  // Normalize pagination
  if (optimized.page && !optimized.from) {
    optimized.from = (optimized.page - 1) * optimized.size;
    delete optimized.page;
  }

  // Trim and normalize query
  if (optimized.query) {
    optimized.query = optimized.query.trim().slice(0, 500);
    
    // Remove special characters that might cause issues
    optimized.query = optimized.query.replace(/[<>]/g, '');
  }

  // Remove empty filters
  if (optimized.filters) {
    Object.keys(optimized.filters).forEach(key => {
      const value = optimized.filters[key];
      if (value === undefined || value === null || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        delete optimized.filters[key];
      }
    });
  }

  // Apply index-specific optimizations
  switch (indexType) {
    case 'jobs':
      // Always filter active jobs
      optimized.filters = optimized.filters || {};
      if (!optimized.filters.hasOwnProperty('isActive')) {
        optimized.filters.isActive = true;
      }
      break;
      
    case 'mentors':
      // Only show active mentors
      optimized.filters = optimized.filters || {};
      if (!optimized.filters.hasOwnProperty('isActive')) {
        optimized.filters.isActive = true;
      }
      break;
  }

  return optimized;
}

/**
 * Invalidate cache for a specific index
 * @param {string} indexType - Type of content
 * @param {string} documentId - Optional specific document ID
 */
async function invalidateCache(indexType, documentId = null) {
  try {
    if (documentId) {
      // Invalidate specific document caches
      await redisCache.delPattern(`search:${indexType}:*`);
      await redisCache.delPattern(`similar:${indexType}:${documentId}*`);
    } else {
      // Invalidate all caches for this index type
      await redisCache.delPattern(`search:${indexType}:*`);
      await redisCache.delPattern(`facets:${indexType}:*`);
      await redisCache.delPattern(`suggestions:${indexType}:*`);
    }
    
    logger.info('Cache invalidated', { indexType, documentId });
  } catch (error) {
    logger.error('Cache invalidation error', { indexType, error: error.message });
  }
}

/**
 * Warm cache with popular searches
 * @param {Function} searchFn - Search function to use
 * @param {string} indexType - Content type
 */
async function warmCache(searchFn, indexType) {
  if (!CONFIG.WARM_CACHE_ON_STARTUP) return;

  try {
    // Get popular searches
    const { prisma } = require('../db');
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const popularQueries = await prisma.searchLog.groupBy({
      by: ['query'],
      where: {
        indexType,
        createdAt: { gte: lastWeek },
        resultCount: { gt: 0 }
      },
      _count: true,
      orderBy: { _count: { query: 'desc' } },
      take: CONFIG.POPULAR_QUERIES_TO_WARM
    });

    // Warm cache for each popular query
    for (const { query } of popularQueries) {
      if (!query) continue;
      
      const cacheKey = generateCacheKey(`search:${indexType}`, { query });
      
      try {
        const result = await withTimeout(
          searchFn({ query, size: CONFIG.DEFAULT_PAGE_SIZE }),
          CONFIG.FALLBACK_TIMEOUT_MS
        );
        
        if (result && !result.error) {
          await redisCache.set(cacheKey, result, CONFIG.SEARCH_CACHE_TTL);
        }
      } catch (error) {
        // Skip failed queries
      }
    }

    logger.info('Cache warmed', { indexType, queries: popularQueries.length });
  } catch (error) {
    logger.warn('Cache warming failed', { indexType, error: error.message });
  }
}

/**
 * Monitor search performance metrics
 */
class SearchPerformanceMonitor {
  constructor() {
    this.metrics = {
      totalSearches: 0,
      cacheHits: 0,
      cacheMisses: 0,
      timeouts: 0,
      errors: 0,
      totalDuration: 0,
      slowQueries: 0
    };
    this.queryLog = [];
    this.maxLogSize = 1000;
  }

  /**
   * Record a search execution
   */
  record(searchInfo) {
    const { 
      query, 
      indexType, 
      duration, 
      fromCache, 
      resultCount, 
      error,
      timeout 
    } = searchInfo;

    this.metrics.totalSearches++;
    
    if (fromCache) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    if (timeout) {
      this.metrics.timeouts++;
    }
    
    if (error) {
      this.metrics.errors++;
    }
    
    this.metrics.totalDuration += duration;
    
    if (duration > CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      this.metrics.slowQueries++;
    }

    // Log query details
    if (this.queryLog.length >= this.maxLogSize) {
      this.queryLog.shift();
    }
    
    this.queryLog.push({
      query,
      indexType,
      duration,
      fromCache,
      resultCount,
      timestamp: new Date()
    });
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const total = this.metrics.totalSearches;
    
    return {
      totalSearches: total,
      cacheHitRate: total > 0 
        ? Math.round((this.metrics.cacheHits / total) * 100) 
        : 0,
      averageDuration: total > 0 
        ? Math.round(this.metrics.totalDuration / total) 
        : 0,
      timeoutRate: total > 0 
        ? Math.round((this.metrics.timeouts / total) * 100) 
        : 0,
      errorRate: total > 0 
        ? Math.round((this.metrics.errors / total) * 100) 
        : 0,
      slowQueryRate: total > 0 
        ? Math.round((this.metrics.slowQueries / total) * 100) 
        : 0
    };
  }

  /**
   * Get recent slow queries
   */
  getSlowQueries(limit = 10) {
    return this.queryLog
      .filter(q => q.duration > CONFIG.SLOW_QUERY_THRESHOLD_MS)
      .slice(-limit)
      .reverse();
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      totalSearches: 0,
      cacheHits: 0,
      cacheMisses: 0,
      timeouts: 0,
      errors: 0,
      totalDuration: 0,
      slowQueries: 0
    };
    this.queryLog = [];
  }
}

// Singleton monitor instance
const performanceMonitor = new SearchPerformanceMonitor();

/**
 * Prefetch related searches to improve perceived performance
 * @param {string} query - Current search query
 * @param {string} indexType - Content type
 * @param {Function} searchFn - Search function
 */
async function prefetchRelated(query, indexType, searchFn) {
  if (!query || query.length < 3) return;

  // Prefetch variations in background
  const variations = generateQueryVariations(query);
  
  setImmediate(async () => {
    for (const variation of variations.slice(0, 3)) {
      const cacheKey = generateCacheKey(`search:${indexType}`, { query: variation });
      
      // Only prefetch if not cached
      const exists = await redisCache.exists(cacheKey);
      if (!exists) {
        try {
          const result = await withTimeout(
            searchFn({ query: variation, size: 10 }),
            CONFIG.FALLBACK_TIMEOUT_MS
          );
          if (result && !result.error) {
            await redisCache.set(cacheKey, result, CONFIG.SEARCH_CACHE_TTL);
          }
        } catch (error) {
          // Silent fail for prefetch
        }
      }
    }
  });
}

/**
 * Generate query variations for prefetching
 */
function generateQueryVariations(query) {
  const variations = [];
  const words = query.toLowerCase().split(/\s+/);
  
  // Add individual words
  words.forEach(word => {
    if (word.length >= 3) {
      variations.push(word);
    }
  });
  
  // Add without last word (for autocomplete-style prefetch)
  if (words.length > 1) {
    variations.push(words.slice(0, -1).join(' '));
  }
  
  return [...new Set(variations)];
}
