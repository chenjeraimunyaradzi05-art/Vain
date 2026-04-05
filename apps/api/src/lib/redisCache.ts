import Redis, { Redis as RedisClient } from 'ioredis';
// import { Store } from 'express-session';

let redis: RedisClient | null = null;

const memoryCache = new Map<string, any>();
const memoryCacheTTL = new Map<string, number>();

export async function initRedis(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('[Cache] Redis URL not configured, using in-memory cache');
    return false;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      // retryDelayOnFailover: 100,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    await redis.connect();
    
    redis.on('error', (err) => {
      console.error('[Cache] Redis error:', err.message);
    });

    redis.on('connect', () => {
      console.log('[Cache] Redis connected');
    });

    console.log('[Cache] Redis initialized');
    return true;
  } catch (error: any) {
    console.error('[Cache] Failed to initialize Redis:', error.message);
    console.log('[Cache] Falling back to in-memory cache');
    redis = null;
    return false;
  }
}

export async function get(key: string): Promise<any> {
  try {
    if (redis) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    }

    const ttl = memoryCacheTTL.get(key);
    if (ttl && Date.now() > ttl) {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
      return null;
    }
    return memoryCache.get(key) || null;
  } catch (error: any) {
    console.error('[Cache] Get error:', error.message);
    return null;
  }
}

export async function set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    
    if (redis) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      memoryCache.set(key, value);
      memoryCacheTTL.set(key, Date.now() + (ttlSeconds * 1000));
      
      // Cleanup memory cache if it gets too big
      if (memoryCache.size > 10000) {
        const oldestKey = memoryCache.keys().next().value;
        if (oldestKey) {
            memoryCache.delete(oldestKey);
            memoryCacheTTL.delete(oldestKey);
        }
      }
    }
  } catch (error: any) {
    console.error('[Cache] Set error:', error.message);
  }
}

export async function del(key: string): Promise<void> {
  try {
    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
      memoryCacheTTL.delete(key);
    }
  } catch (error: any) {
    console.error('[Cache] Delete error:', error.message);
  }
}

/**
 * Delete all keys matching a pattern (e.g., "jobs:*")
 * @param pattern - Redis glob pattern to match keys
 */
export async function delPattern(pattern: string): Promise<void> {
  try {
    if (redis) {
      // Use SCAN to find matching keys (more efficient than KEYS)
      let cursor = '0';
      do {
        const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== '0');
    } else {
      // For memory cache, iterate and delete matching keys
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const key of memoryCache.keys()) {
        if (regex.test(key)) {
          memoryCache.delete(key);
          memoryCacheTTL.delete(key);
        }
      }
    }
    console.log(`[Cache] Deleted keys matching pattern: ${pattern}`);
  } catch (error: any) {
    console.error('[Cache] Delete pattern error:', error.message);
  }
}

export async function flush(): Promise<void> {
  try {
    if (redis) {
      await redis.flushall();
    } else {
      memoryCache.clear();
      memoryCacheTTL.clear();
    }
  } catch (error: any) {
    console.error('[Cache] Flush error:', error.message);
  }
}

export function getClient(): RedisClient | null {
  return redis;
}

/*
// Redis Session Store implementation
export class RedisSessionStore extends Store {
    prefix: string;
    ttl: number;

    constructor(options: { prefix?: string; ttl?: number } = {}) {
        super();
        this.prefix = options.prefix || 'sess:';
        this.ttl = options.ttl || 86400; // 24 hours
    }

    get = (sid: string, cb: (err: any, session?: any) => void) => {
        get(this.prefix + sid)
            .then((data) => cb(null, data))
            .catch((err) => cb(err));
    };

    set = (sid: string, session: any, cb?: (err?: any) => void) => {
        set(this.prefix + sid, session, this.ttl)
            .then(() => cb && cb())
            .catch((err) => cb && cb(err));
    };

    destroy = (sid: string, cb?: (err?: any) => void) => {
        del(this.prefix + sid)
            .then(() => cb && cb())
            .catch((err) => cb && cb(err));
    };

    touch = (sid: string, session: any, cb?: (err?: any) => void) => {
        set(this.prefix + sid, session, this.ttl)
            .then(() => cb && cb())
            .catch((err) => cb && cb(err));
    };
}
*/
