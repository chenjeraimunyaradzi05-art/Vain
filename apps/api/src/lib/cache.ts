/**
 * Cache Utilities
 * 
 * Redis-backed caching with fallback to in-memory cache
 */

import Redis from 'ioredis';
import { logger } from './logger';

/**
 * Cache options
 */
export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Cache key prefix */
  prefix?: string;
}

/**
 * In-memory cache fallback
 */
class MemoryCache {
  private cache: Map<string, { value: unknown; expires: number }> = new Map();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (item.expires && Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expires = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
    this.cache.set(key, { value, expires });
  }
  
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
  
  async delPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    let count = 0;
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    return count;
  }
  
  async flush(): Promise<void> {
    this.cache.clear();
  }
  
  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }
  
  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (item.expires && now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Cache service
 */
class CacheService {
  private redis: Redis | null = null;
  private memory: MemoryCache;
  private prefix: string;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    this.memory = new MemoryCache();
    this.prefix = process.env.CACHE_PREFIX || 'gimbi:';
    
    // Try to connect to Redis
    this.initRedis();
    
    // Cleanup memory cache periodically
    this.cleanupInterval = setInterval(() => {
      this.memory.cleanup();
    }, 60000); // Every minute
  }
  
  private initRedis(): void {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger?.info('Redis URL not configured, using in-memory cache');
      return;
    }
    
    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            logger?.warn('Redis connection failed, falling back to memory cache');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        lazyConnect: true,
      });
      
      this.redis.on('error', (err) => {
        logger?.error('Redis error:', err);
      });
      
      this.redis.on('connect', () => {
        logger?.info('Redis connected');
      });
    } catch (error) {
      logger?.warn('Failed to initialize Redis, using in-memory cache');
    }
  }
  
  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.prefix}${key}`;
  }
  
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);
    
    if (this.redis) {
      try {
        const value = await this.redis.get(fullKey);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        logger?.warn('Redis get error, using memory cache:', error);
      }
    }
    
    return this.memory.get<T>(fullKey);
  }
  
  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = options?.ttl || 3600; // Default 1 hour
    
    if (this.redis) {
      try {
        await this.redis.set(fullKey, JSON.stringify(value), 'EX', ttl);
        return;
      } catch (error) {
        logger?.warn('Redis set error, using memory cache:', error);
      }
    }
    
    await this.memory.set(fullKey, value, ttl);
  }
  
  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    const fullKey = this.buildKey(key);
    
    if (this.redis) {
      try {
        await this.redis.del(fullKey);
        return;
      } catch (error) {
        logger?.warn('Redis del error:', error);
      }
    }
    
    await this.memory.del(fullKey);
  }
  
  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<number> {
    const fullPattern = this.buildKey(pattern);
    
    if (this.redis) {
      try {
        const keys = await this.redis.keys(fullPattern);
        if (keys.length > 0) {
          return await this.redis.del(...keys);
        }
        return 0;
      } catch (error) {
        logger?.warn('Redis delPattern error:', error);
      }
    }
    
    return this.memory.delPattern(fullPattern);
  }
  
  /**
   * Get or set value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cached = await this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const value = await fn();
    await this.set(key, value, options);
    return value;
  }
  
  /**
   * Invalidate cache entries
   */
  async invalidate(keys: string[]): Promise<void> {
    await Promise.all(keys.map(key => this.del(key)));
  }
  
  /**
   * Flush all cache entries
   */
  async flush(): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${this.prefix}*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
        return;
      } catch (error) {
        logger?.warn('Redis flush error:', error);
      }
    }
    
    await this.memory.flush();
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    type: 'redis' | 'memory';
    keys: number;
    memoryUsage?: number;
  }> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`${this.prefix}*`);
        const info = await this.redis.info('memory');
        const usedMemory = parseInt(
          info.match(/used_memory:(\d+)/)?.[1] || '0',
          10
        );
        
        return {
          type: 'redis',
          keys: keys.length,
          memoryUsage: usedMemory,
        };
      } catch (error) {
        logger?.warn('Redis stats error:', error);
      }
    }
    
    const keys = await this.memory.keys(`${this.prefix}*`);
    return {
      type: 'memory',
      keys: keys.length,
    };
  }
  
  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
export const cache = new CacheService();

/**
 * Cache key builders for common patterns
 */
export const cacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:${id}:profile`,
  userSession: (id: string) => `user:${id}:session`,
  
  job: (id: string) => `job:${id}`,
  jobsList: (params: string) => `jobs:list:${params}`,
  jobsSearch: (query: string) => `jobs:search:${query}`,
  
  application: (id: string) => `application:${id}`,
  userApplications: (userId: string) => `user:${userId}:applications`,
  
  mentor: (id: string) => `mentor:${id}`,
  mentorsList: () => 'mentors:list',
  
  settings: (key: string) => `settings:${key}`,
  
  // Invalidation patterns
  patterns: {
    user: (id: string) => `user:${id}:*`,
    jobs: () => 'jobs:*',
    applications: () => 'application:*',
  },
};

export default cache;

export {};
