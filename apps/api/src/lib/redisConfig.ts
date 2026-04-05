/**
 * Redis Configuration (Steps 57-58)
 * 
 * Secure Redis configuration with:
 * - TLS connection support
 * - TTL management for all keys
 * - Connection pooling
 * - Error handling
 */

import Redis, { RedisOptions } from 'ioredis';
import { logger } from './logger';

// Default TTL values for different key types (in seconds)
export const REDIS_TTL = {
  // Session data
  session: 24 * 60 * 60, // 24 hours
  refreshToken: 7 * 24 * 60 * 60, // 7 days
  accessToken: 15 * 60, // 15 minutes
  
  // Rate limiting
  rateLimit: 60, // 1 minute window
  loginAttempts: 15 * 60, // 15 minutes
  
  // Caching
  userCache: 5 * 60, // 5 minutes
  jobCache: 10 * 60, // 10 minutes
  searchCache: 60, // 1 minute
  
  // Security
  passwordReset: 60 * 60, // 1 hour
  emailVerification: 24 * 60 * 60, // 24 hours
  twoFactorCode: 5 * 60, // 5 minutes
  csrfToken: 60 * 60, // 1 hour
  
  // Idempotency
  idempotencyKey: 24 * 60 * 60, // 24 hours
  
  // Locks
  distributedLock: 30, // 30 seconds
  
  // Feature flags
  featureFlags: 5 * 60, // 5 minutes
  
  // Maintenance
  maintenanceFlag: 0, // No expiry (manual)
} as const;

// Key prefixes for organization
export const REDIS_KEYS = {
  session: (userId: string) => `session:${userId}`,
  refreshToken: (tokenId: string) => `refresh:${tokenId}`,
  rateLimit: (ip: string, endpoint: string) => `rate:${ip}:${endpoint}`,
  loginAttempts: (ip: string) => `login:attempts:${ip}`,
  passwordReset: (token: string) => `pwd:reset:${token}`,
  emailVerification: (token: string) => `email:verify:${token}`,
  twoFactorCode: (userId: string) => `2fa:${userId}`,
  userCache: (userId: string) => `cache:user:${userId}`,
  jobCache: (jobId: string) => `cache:job:${jobId}`,
  idempotency: (key: string) => `idempotency:${key}`,
  lock: (resource: string) => `lock:${resource}`,
  maintenance: () => 'system:maintenance',
} as const;

/**
 * Create Redis connection with secure defaults
 */
export function createRedisClient(options: Partial<RedisOptions> = {}): Redis {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    logger.warn('REDIS_URL not configured, some features will be unavailable');
    // Return a mock or throw based on requirements
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  const defaultOptions: RedisOptions = {
    // TLS configuration (Step 57)
    tls: isProduction && redisUrl?.startsWith('rediss://') ? {} : undefined,
    
    // Connection settings
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis connection failed after 10 retries');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000); // Exponential backoff, max 3s
    },
    
    // Timeouts
    connectTimeout: 10000, // 10 seconds
    commandTimeout: 5000, // 5 seconds per command
    
    // Connection pooling
    enableReadyCheck: true,
    lazyConnect: false,
    
    // Security
    password: process.env.REDIS_PASSWORD,
    
    // Performance
    enableOfflineQueue: true,
    
    ...options,
  };
  
  const redis = redisUrl 
    ? new Redis(redisUrl, defaultOptions)
    : new Redis(defaultOptions);
  
  // Event handlers
  redis.on('connect', () => {
    logger.info('Redis connected');
  });
  
  redis.on('ready', () => {
    logger.info('Redis ready');
  });
  
  redis.on('error', (error) => {
    logger.error('Redis error', { error: error.message });
  });
  
  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });
  
  redis.on('reconnecting', (delay: number) => {
    logger.info('Redis reconnecting', { delay });
  });
  
  return redis;
}

/**
 * Wrapper for setting keys with mandatory TTL (Step 58)
 */
export class SafeRedis {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  /**
   * Set a key with required TTL
   * This ensures no keys are stored indefinitely
   */
  async setWithTTL(key: string, value: string, ttlSeconds: number): Promise<'OK'> {
    if (ttlSeconds <= 0) {
      throw new Error('TTL must be greater than 0');
    }
    return this.redis.setex(key, ttlSeconds, value);
  }
  
  /**
   * Set a key with TTL only if it doesn't exist
   */
  async setNXWithTTL(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }
  
  /**
   * Get a key and refresh its TTL
   */
  async getAndRefresh(key: string, ttlSeconds: number): Promise<string | null> {
    const value = await this.redis.get(key);
    if (value) {
      await this.redis.expire(key, ttlSeconds);
    }
    return value;
  }
  
  /**
   * Set JSON data with TTL
   */
  async setJSON<T>(key: string, data: T, ttlSeconds: number): Promise<'OK'> {
    return this.setWithTTL(key, JSON.stringify(data), ttlSeconds);
  }
  
  /**
   * Get JSON data
   */
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  
  /**
   * Increment with auto-expire
   */
  async incrWithTTL(key: string, ttlSeconds: number): Promise<number> {
    const value = await this.redis.incr(key);
    if (value === 1) {
      // First increment, set TTL
      await this.redis.expire(key, ttlSeconds);
    }
    return value;
  }
  
  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }
  
  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }
  
  /**
   * Get TTL of a key
   */
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }
  
  /**
   * Scan for keys matching pattern (use carefully)
   */
  async scanKeys(pattern: string, count: number = 100): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const [nextCursor, foundKeys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count
      );
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');
    
    return keys;
  }
  
  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
  
  /**
   * Graceful disconnect
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
  
  /**
   * Get underlying Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redis;
  }
}

// Singleton instance
let redisInstance: SafeRedis | null = null;

export function getRedis(): SafeRedis {
  if (!redisInstance) {
    const client = createRedisClient();
    redisInstance = new SafeRedis(client);
  }
  return redisInstance;
}

export default {
  createRedisClient,
  SafeRedis,
  getRedis,
  REDIS_TTL,
  REDIS_KEYS,
};

export {};
