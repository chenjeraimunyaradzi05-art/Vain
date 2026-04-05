/**
 * Retry Utilities Tests
 * 
 * Unit tests for retry and circuit breaker functionality.
 */

import {
  retry,
  withRetry,
  sleep,
  retryableErrors,
  CircuitBreaker,
  withTimeout,
  batchWithConcurrency,
} from '../../src/lib/retry';

describe('Retry Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await promise;
      // If we get here, the promise resolved
      expect(true).toBe(true);
    });
  });

  describe('retry', () => {
    it('should return immediately on success', async () => {
      vi.useRealTimers();
      
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn, { maxRetries: 3 });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      vi.useRealTimers();
      
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const result = await retry(fn, { 
        maxRetries: 3,
        initialDelay: 10,
      });
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      vi.useRealTimers();
      
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));
      
      await expect(
        retry(fn, { maxRetries: 2, initialDelay: 10 })
      ).rejects.toThrow('always fails');
      
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should call onRetry callback', async () => {
      vi.useRealTimers();
      
      const onRetry = vi.fn();
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      await retry(fn, {
        maxRetries: 3,
        initialDelay: 10,
        onRetry,
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should not retry non-retryable errors', async () => {
      vi.useRealTimers();
      
      const error = new Error('not retryable');
      const fn = vi.fn().mockRejectedValue(error);
      const isRetryable = vi.fn().mockReturnValue(false);
      
      await expect(
        retry(fn, { maxRetries: 3, isRetryable, initialDelay: 10 })
      ).rejects.toThrow();
      
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('withRetry', () => {
    it('should create a retryable function', async () => {
      vi.useRealTimers();
      
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      const retryableFn = withRetry(fn, { maxRetries: 2, initialDelay: 10 });
      const result = await retryableFn();
      
      expect(result).toBe('success');
    });
  });

  describe('retryableErrors', () => {
    it('should identify network errors', () => {
      const error = new Error('Network error');
      (error as any).code = 'ECONNRESET';
      
      expect(retryableErrors.isNetworkError(error)).toBe(true);
    });

    it('should identify server errors', () => {
      const error = new Error('Server error');
      (error as any).status = 500;
      
      expect(retryableErrors.isServerError(error)).toBe(true);
    });

    it('should identify rate limit errors', () => {
      const error = new Error('Rate limited');
      (error as any).status = 429;
      
      expect(retryableErrors.isRateLimitError(error)).toBe(true);
    });

    it('should combine checks in isRetryable', () => {
      const error = new Error('Server error');
      (error as any).status = 503;
      
      expect(retryableErrors.isRetryable(error)).toBe(true);
    });
  });

  describe('CircuitBreaker', () => {
    it('should start in closed state', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 1000,
      });
      
      expect(breaker.getState()).toBe('closed');
    });

    it('should open after failure threshold', async () => {
      vi.useRealTimers();
      
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 1000,
      });
      
      const failingFn = () => Promise.reject(new Error('fail'));
      
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      await expect(breaker.execute(failingFn)).rejects.toThrow();
      
      expect(breaker.getState()).toBe('open');
    });

    it('should reject immediately when open', async () => {
      vi.useRealTimers();
      
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 10000,
      });
      
      const failingFn = () => Promise.reject(new Error('fail'));
      
      await expect(breaker.execute(failingFn)).rejects.toThrow('fail');
      await expect(breaker.execute(() => Promise.resolve('success'))).rejects.toThrow('Circuit breaker is open');
    });

    it('should reset on manual reset', async () => {
      vi.useRealTimers();
      
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 10000,
      });
      
      await expect(breaker.execute(() => Promise.reject(new Error()))).rejects.toThrow();
      expect(breaker.getState()).toBe('open');
      
      breaker.reset();
      expect(breaker.getState()).toBe('closed');
    });

    it('should call onStateChange callback', async () => {
      vi.useRealTimers();
      
      const onStateChange = vi.fn();
      const breaker = new CircuitBreaker({
        failureThreshold: 1,
        resetTimeout: 1000,
        onStateChange,
      });
      
      await expect(breaker.execute(() => Promise.reject(new Error()))).rejects.toThrow();
      
      expect(onStateChange).toHaveBeenCalledWith('open');
    });
  });

  describe('withTimeout', () => {
    it('should return result if within timeout', async () => {
      vi.useRealTimers();
      
      const result = await withTimeout(
        Promise.resolve('success'),
        1000
      );
      
      expect(result).toBe('success');
    });

    it('should throw on timeout', async () => {
      vi.useRealTimers();
      
      const slowPromise = new Promise(resolve => setTimeout(resolve, 1000));
      
      await expect(
        withTimeout(slowPromise, 10, 'Timed out')
      ).rejects.toThrow('Timed out');
    });
  });

  describe('batchWithConcurrency', () => {
    it('should process all items', async () => {
      vi.useRealTimers();
      
      const items = [1, 2, 3, 4, 5];
      const results = await batchWithConcurrency(
        items,
        async (n) => n * 2,
        2
      );
      
      expect(results).toHaveLength(5);
      expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10]);
    });
  });
});
