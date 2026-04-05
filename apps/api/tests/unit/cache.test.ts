import { cache, cacheKeys } from '../../src/lib/cache';

describe('Cache Utilities', () => {
  beforeEach(async () => {
    await cache.flush();
  });

  describe('Basic Operations', () => {
    it('should set and get a value', async () => {
      await cache.set('test-key', { name: 'test', value: 123 });
      const result = await cache.get<{ name: string; value: number }>('test-key');

      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('non-existent');

      expect(result).toBeNull();
    });

    it('should delete a value', async () => {
      await cache.set('test-key', 'value');
      await cache.del('test-key');
      const result = await cache.get('test-key');

      expect(result).toBeNull();
    });

    it('should handle different data types', async () => {
      // String
      await cache.set('string', 'hello');
      expect(await cache.get('string')).toBe('hello');

      // Number
      await cache.set('number', 42);
      expect(await cache.get('number')).toBe(42);

      // Array
      await cache.set('array', [1, 2, 3]);
      expect(await cache.get('array')).toEqual([1, 2, 3]);

      // Object
      await cache.set('object', { a: 1, b: { c: 2 } });
      expect(await cache.get('object')).toEqual({ a: 1, b: { c: 2 } });

      // Boolean
      await cache.set('boolean', true);
      expect(await cache.get('boolean')).toBe(true);

      // Null
      await cache.set('null', null);
      expect(await cache.get('null')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    // Note: Fake timers don't work with Redis TTL since Redis handles expiration server-side
    // These tests only work reliably with in-memory cache
    it('should expire values after TTL', async () => {
      await cache.set('expiring', 'value', { ttl: 1 }); // 1 second

      // Value should exist immediately
      expect(await cache.get('expiring')).toBe('value');

      // Wait for actual TTL expiration (real time)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Value should be expired
      expect(await cache.get('expiring')).toBeNull();
    }, 5000); // Increase timeout for this test

    it('should not expire values without TTL', async () => {
      vi.useFakeTimers();

      await cache.set('persistent', 'value'); // Default TTL

      vi.advanceTimersByTime(60000); // 1 minute

      // Value should still exist
      expect(await cache.get('persistent')).toBe('value');

      vi.useRealTimers();
    });
  });

  describe('getOrSet (Cache-Aside Pattern)', () => {
    it('should return cached value if exists', async () => {
      const mockFn = vi.fn().mockResolvedValue('new-value');

      await cache.set('cached', 'existing-value');
      const result = await cache.getOrSet('cached', mockFn);

      expect(result).toBe('existing-value');
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should call function and cache if value does not exist', async () => {
      const mockFn = vi.fn().mockResolvedValue('computed-value');

      const result = await cache.getOrSet('new-key', mockFn);

      expect(result).toBe('computed-value');
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Should be cached now
      const cachedResult = await cache.get('new-key');
      expect(cachedResult).toBe('computed-value');
    });

    it('should use provided TTL', async () => {
      const mockFn = vi.fn().mockResolvedValue('value');

      await cache.getOrSet('ttl-key', mockFn, { ttl: 1 });

      // Wait for actual TTL expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      expect(await cache.get('ttl-key')).toBeNull();
    }, 5000); // Increase timeout for this test
  });

  describe('Pattern Deletion', () => {
    it('should delete keys matching pattern', async () => {
      await cache.set('user:1:profile', 'profile1');
      await cache.set('user:1:settings', 'settings1');
      await cache.set('user:2:profile', 'profile2');
      await cache.set('job:1', 'job1');

      const deleted = await cache.delPattern('user:1:*');

      expect(deleted).toBe(2);
      expect(await cache.get('user:1:profile')).toBeNull();
      expect(await cache.get('user:1:settings')).toBeNull();
      expect(await cache.get('user:2:profile')).toBe('profile2');
      expect(await cache.get('job:1')).toBe('job1');
    });
  });

  describe('Invalidation', () => {
    it('should invalidate multiple keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      await cache.invalidate(['key1', 'key3']);

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBe('value2');
      expect(await cache.get('key3')).toBeNull();
    });
  });

  describe('Flush', () => {
    it('should clear all cache entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.set('key3', 'value3');

      await cache.flush();

      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
      expect(await cache.get('key3')).toBeNull();
    });
  });

  describe('Cache Key Builders', () => {
    it('should build user keys', () => {
      expect(cacheKeys.user('123')).toBe('user:123');
      expect(cacheKeys.userProfile('123')).toBe('user:123:profile');
      expect(cacheKeys.userSession('123')).toBe('user:123:session');
    });

    it('should build job keys', () => {
      expect(cacheKeys.job('456')).toBe('job:456');
      expect(cacheKeys.jobsList('page=1')).toBe('jobs:list:page=1');
      expect(cacheKeys.jobsSearch('developer')).toBe('jobs:search:developer');
    });

    it('should build application keys', () => {
      expect(cacheKeys.application('789')).toBe('application:789');
      expect(cacheKeys.userApplications('123')).toBe('user:123:applications');
    });

    it('should build pattern keys', () => {
      expect(cacheKeys.patterns.user('123')).toBe('user:123:*');
      expect(cacheKeys.patterns.jobs()).toBe('jobs:*');
      expect(cacheKeys.patterns.applications()).toBe('application:*');
    });
  });

  describe('Cache Stats', () => {
    it('should return cache statistics', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      const stats = await cache.getStats();

      expect(stats).toBeDefined();
      // Cache type depends on whether Redis is available
      expect(['memory', 'redis']).toContain(stats.type);
      expect(stats.keys).toBeGreaterThanOrEqual(2);
    });
  });
});
