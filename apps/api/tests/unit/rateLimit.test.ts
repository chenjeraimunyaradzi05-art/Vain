/**
 * Rate Limit Tests
 */

import { TokenBucket } from '../../src/lib/rateLimit';

describe('TokenBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should allow requests within capacity', () => {
    const bucket = new TokenBucket(10, 1);
    
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.getAvailableTokens()).toBe(8);
  });

  it('should deny requests when empty', () => {
    const bucket = new TokenBucket(3, 1);
    
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(true);
    expect(bucket.tryConsume(1)).toBe(false);
  });

  it('should refill over time', () => {
    const bucket = new TokenBucket(10, 2); // 2 tokens per second
    
    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      bucket.tryConsume(1);
    }
    
    expect(bucket.getAvailableTokens()).toBe(0);
    
    // Advance 2 seconds (should refill 4 tokens)
    vi.advanceTimersByTime(2000);
    
    expect(bucket.getAvailableTokens()).toBe(4);
  });

  it('should not exceed capacity', () => {
    const bucket = new TokenBucket(10, 5);
    
    // Advance a lot of time
    vi.advanceTimersByTime(10000);
    
    expect(bucket.getAvailableTokens()).toBe(10);
  });

  it('should allow consuming multiple tokens', () => {
    const bucket = new TokenBucket(10, 1);
    
    expect(bucket.tryConsume(5)).toBe(true);
    expect(bucket.getAvailableTokens()).toBe(5);
    
    expect(bucket.tryConsume(6)).toBe(false);
    expect(bucket.getAvailableTokens()).toBe(5);
  });
});

describe('Rate Limit Middleware', () => {
  it('should export rate limit tiers', async () => {
    const { rateLimitTiers } = await import('../../src/lib/rateLimit');
    
    expect(rateLimitTiers).toHaveProperty('auth');
    expect(rateLimitTiers).toHaveProperty('strict');
    expect(rateLimitTiers).toHaveProperty('standard');
    expect(rateLimitTiers).toHaveProperty('relaxed');
    expect(rateLimitTiers).toHaveProperty('enterprise');
  });
});
