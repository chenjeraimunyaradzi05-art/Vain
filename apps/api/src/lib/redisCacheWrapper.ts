/**
 * Redis Cache Wrapper
 * 
 * Provides a unified interface for Redis caching operations
 * with fallback to in-memory caching when Redis is unavailable.
 */

import * as cache from './redisCache';

export interface RedisCacheInterface {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  del(key: string): Promise<void>;
  increment(key: string, amount?: number): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  listPush(key: string, value: unknown, maxLength?: number): Promise<void>;
  listRange<T>(key: string, start: number, stop: number): Promise<T[]>;
  listLength(key: string): Promise<number>;
  listRemove(key: string, value: string): Promise<void>;
  setAdd(key: string, value: string): Promise<void>;
  setRemove(key: string, value: string): Promise<void>;
  setMembers(key: string): Promise<string[]>;
  setIsMember(key: string, value: string): Promise<boolean>;
  zadd(key: string, score: number, member: string): Promise<void>;
  zrem(key: string, member: string): Promise<void>;
  zrange(key: string, start: number, stop: number): Promise<string[]>;
  zrevrange(key: string, start: number, stop: number): Promise<string[]>;
  zrangebyscore(key: string, min: number, max: number): Promise<string[]>;
  zremrangebyscore(key: string, min: number, max: number): Promise<void>;
  zrevrangewithscores(key: string, start: number, stop: number): Promise<Array<[string, number]>>;
  zincrby(key: string, increment: number, member: string): Promise<number>;
  zcard(key: string): Promise<number>;
}

// In-memory store for list/set operations
const memoryLists = new Map<string, unknown[]>();
const memorySets = new Map<string, Set<string>>();
const memorySortedSets = new Map<string, Map<string, number>>();
const memoryCounters = new Map<string, number>();

export const redisCache: RedisCacheInterface = {
  async get<T>(key: string): Promise<T | null> {
    return cache.get(key);
  },

  async set(key: string, value: unknown, ttlSeconds: number = 300): Promise<void> {
    await cache.set(key, value, ttlSeconds);
  },

  async delete(key: string): Promise<void> {
    await cache.del(key);
  },

  async del(key: string): Promise<void> {
    await cache.del(key);
  },

  async increment(key: string, amount: number = 1): Promise<number> {
    const client = cache.getClient();
    if (client) {
      return await client.incrby(key, amount);
    }
    // Memory fallback
    const current = memoryCounters.get(key) || 0;
    const newValue = current + amount;
    memoryCounters.set(key, newValue);
    return newValue;
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const client = cache.getClient();
    if (client) {
      await client.expire(key, ttlSeconds);
    }
    // Memory cache handles expiry in get/set
  },

  async listPush(key: string, value: unknown, maxLength?: number): Promise<void> {
    const client = cache.getClient();
    if (client) {
      await client.lpush(key, JSON.stringify(value));
      if (maxLength) {
        await client.ltrim(key, 0, maxLength - 1);
      }
    } else {
      // Memory fallback
      let list = memoryLists.get(key) || [];
      list.unshift(value);
      if (maxLength) {
        list = list.slice(0, maxLength);
      }
      memoryLists.set(key, list);
    }
  },

  async listRange<T>(key: string, start: number, stop: number): Promise<T[]> {
    const client = cache.getClient();
    if (client) {
      const items = await client.lrange(key, start, stop);
      return items.map(item => JSON.parse(item)) as T[];
    }
    // Memory fallback
    const list = memoryLists.get(key) || [];
    return list.slice(start, stop + 1) as T[];
  },

  async listLength(key: string): Promise<number> {
    const client = cache.getClient();
    if (client) {
      return await client.llen(key);
    }
    return memoryLists.get(key)?.length || 0;
  },

  async listRemove(key: string, value: string): Promise<void> {
    const client = cache.getClient();
    if (client) {
      await client.lrem(key, 0, value);
    } else {
      const list = memoryLists.get(key) || [];
      memoryLists.set(key, list.filter(item => item !== value));
    }
  },

  async setAdd(key: string, value: string): Promise<void> {
    const client = cache.getClient();
    if (client) {
      await client.sadd(key, value);
    } else {
      let set = memorySets.get(key);
      if (!set) {
        set = new Set();
        memorySets.set(key, set);
      }
      set.add(value);
    }
  },

  async setRemove(key: string, value: string): Promise<void> {
    const client = cache.getClient();
    if (client) {
      await client.srem(key, value);
    } else {
      memorySets.get(key)?.delete(value);
    }
  },

  async setMembers(key: string): Promise<string[]> {
    const client = cache.getClient();
    if (client) {
      return await client.smembers(key);
    }
    const set = memorySets.get(key);
    return set ? Array.from(set) : [];
  },

  async setIsMember(key: string, value: string): Promise<boolean> {
    const client = cache.getClient();
    if (client) {
      return (await client.sismember(key, value)) === 1;
    }
    return memorySets.get(key)?.has(value) || false;
  },

  async zadd(key: string, score: number, member: string): Promise<void> {
    const client = cache.getClient();
    if (client) {
      await client.zadd(key, score, member);
    } else {
      let sortedSet = memorySortedSets.get(key);
      if (!sortedSet) {
        sortedSet = new Map();
        memorySortedSets.set(key, sortedSet);
      }
      sortedSet.set(member, score);
    }
  },

  async zrem(key: string, member: string): Promise<void> {
    const client = cache.getClient();
    if (client) {
      await client.zrem(key, member);
    } else {
      memorySortedSets.get(key)?.delete(member);
    }
  },

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = cache.getClient();
    if (client) {
      return await client.zrange(key, start, stop);
    }
    // Memory fallback
    const sortedSet = memorySortedSets.get(key);
    if (!sortedSet) return [];
    const sorted = Array.from(sortedSet.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member);
    return sorted.slice(start, stop === -1 ? undefined : stop + 1);
  },

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    const client = cache.getClient();
    if (client) {
      return await client.zrevrange(key, start, stop);
    }
    const sortedSet = memorySortedSets.get(key);
    if (!sortedSet) return [];
    const sorted = Array.from(sortedSet.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([member]) => member);
    return sorted.slice(start, stop === -1 ? undefined : stop + 1);
  },

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    const client = cache.getClient();
    if (client) {
      return await client.zrangebyscore(key, min, max);
    }
    const sortedSet = memorySortedSets.get(key);
    if (!sortedSet) return [];
    return Array.from(sortedSet.entries())
      .filter(([, score]) => score >= min && score <= max)
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member);
  },

  async zremrangebyscore(key: string, min: number, max: number): Promise<void> {
    const client = cache.getClient();
    if (client) {
      await client.zremrangebyscore(key, min, max);
      return;
    }
    const sortedSet = memorySortedSets.get(key);
    if (!sortedSet) return;
    for (const [member, score] of Array.from(sortedSet.entries())) {
      if (score >= min && score <= max) {
        sortedSet.delete(member);
      }
    }
  },

  async zrevrangewithscores(key: string, start: number, stop: number): Promise<Array<[string, number]>> {
    const client = cache.getClient();
    if (client) {
      const result = await client.zrevrange(key, start, stop, 'WITHSCORES');
      const pairs: Array<[string, number]> = [];
      for (let i = 0; i < result.length; i += 2) {
        pairs.push([result[i], parseFloat(result[i + 1])]);
      }
      return pairs;
    }
    const sortedSet = memorySortedSets.get(key);
    if (!sortedSet) return [];
    return Array.from(sortedSet.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(start, stop === -1 ? undefined : stop + 1);
  },

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    const client = cache.getClient();
    if (client) {
      const result = await client.zincrby(key, increment, member);
      return parseFloat(result);
    }
    let sortedSet = memorySortedSets.get(key);
    if (!sortedSet) {
      sortedSet = new Map();
      memorySortedSets.set(key, sortedSet);
    }
    const current = sortedSet.get(member) || 0;
    const newScore = current + increment;
    sortedSet.set(member, newScore);
    return newScore;
  },

  async zcard(key: string): Promise<number> {
    const client = cache.getClient();
    if (client) {
      return await client.zcard(key);
    }
    return memorySortedSets.get(key)?.size || 0;
  },
};

export default redisCache;
