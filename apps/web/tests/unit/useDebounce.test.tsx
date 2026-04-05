/**
 * useDebounce Hook Tests
 * Unit tests for debouncing and throttling hooks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useDebounce, 
  useDebouncedCallback, 
  useThrottle, 
  useThrottledCallback,
} from '@/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));
      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });

      // Value should not change immediately
      expect(result.current).toBe('initial');

      // Advance time
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('updated');
    });

    it('should reset timer on rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'a' } }
      );

      rerender({ value: 'ab' });
      act(() => { vi.advanceTimersByTime(200); });
      
      rerender({ value: 'abc' });
      act(() => { vi.advanceTimersByTime(200); });
      
      rerender({ value: 'abcd' });
      act(() => { vi.advanceTimersByTime(200); });

      // Still waiting
      expect(result.current).toBe('a');

      // Advance past delay
      act(() => { vi.advanceTimersByTime(500); });

      // Should have final value
      expect(result.current).toBe('abcd');
    });

    it('should handle number values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 0 } }
      );

      rerender({ value: 42 });

      act(() => { vi.advanceTimersByTime(300); });

      expect(result.current).toBe(42);
    });

    it('should handle object values', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: { count: 0 } } }
      );

      rerender({ value: { count: 5 } });

      act(() => { vi.advanceTimersByTime(300); });

      expect(result.current).toEqual({ count: 5 });
    });

    it('should cleanup on unmount', () => {
      const { rerender, unmount } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      
      // Unmount before debounce completes
      unmount();

      // Should not throw
      act(() => { vi.advanceTimersByTime(500); });
    });
  });

  describe('delay changes', () => {
    it('should use updated delay', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'updated', delay: 1000 });

      act(() => { vi.advanceTimersByTime(500); });
      expect(result.current).toBe('initial');

      act(() => { vi.advanceTimersByTime(500); });
      expect(result.current).toBe('updated');
    });
  });
});

describe('useDebouncedCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should debounce callback execution', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      act(() => { result.current('arg1'); });
      act(() => { result.current('arg2'); });
      act(() => { result.current('arg3'); });

      // Callback should not be called yet
      expect(callback).not.toHaveBeenCalled();

      act(() => { vi.advanceTimersByTime(500); });

      // Callback should be called once with last args
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('arg3');
    });

    it('should preserve arguments', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => { result.current('a', 1, true); });
      act(() => { vi.advanceTimersByTime(300); });

      expect(callback).toHaveBeenCalledWith('a', 1, true);
    });

    it('should handle multiple separate calls', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 200));

      act(() => { result.current('first'); });
      act(() => { vi.advanceTimersByTime(200); });

      expect(callback).toHaveBeenCalledWith('first');

      act(() => { result.current('second'); });
      act(() => { vi.advanceTimersByTime(200); });

      expect(callback).toHaveBeenCalledWith('second');
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancel', () => {
    it('should cancel pending execution', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      act(() => { result.current('value'); });
      
      // Cancel before execution
      act(() => { result.current.cancel(); });
      act(() => { vi.advanceTimersByTime(500); });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('flush', () => {
    it('should immediately execute pending callback', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      act(() => { result.current('value'); });
      
      expect(callback).not.toHaveBeenCalled();

      // Flush immediately
      act(() => { result.current.flush(); });

      expect(callback).toHaveBeenCalledWith('value');
    });

    it('should not execute again after flush', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 500));

      act(() => { result.current('value'); });
      act(() => { result.current.flush(); });
      act(() => { vi.advanceTimersByTime(500); });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('maxWait option', () => {
    it('should execute after maxWait even with continuous calls', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, 500, { maxWait: 1000 })
      );

      // Continuous calls
      for (let i = 0; i < 10; i++) {
        act(() => { 
          result.current(`call-${i}`);
          vi.advanceTimersByTime(200);
        });
      }

      // Should have executed at maxWait intervals
      expect(callback.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('leading option', () => {
    it('should execute immediately on first call when leading is true', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, 500, { leading: true })
      );

      act(() => { result.current('first'); });

      // Should execute immediately
      expect(callback).toHaveBeenCalledWith('first');
    });

    it('should not execute again during wait period', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => 
        useDebouncedCallback(callback, 500, { leading: true, trailing: false })
      );

      act(() => { result.current('first'); });
      act(() => { result.current('second'); });
      act(() => { result.current('third'); });
      act(() => { vi.advanceTimersByTime(500); });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should throttle value updates', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottle(value, 500),
        { initialProps: { value: 0 } }
      );

      expect(result.current).toBe(0);

      // Rapid updates
      rerender({ value: 1 });
      rerender({ value: 2 });
      rerender({ value: 3 });

      // First update should apply
      expect(result.current).toBe(1);

      // Advance time
      act(() => { vi.advanceTimersByTime(500); });

      // Should have latest value
      expect(result.current).toBe(3);
    });

    it('should allow updates after throttle period', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useThrottle(value, 300),
        { initialProps: { value: 'a' } }
      );

      rerender({ value: 'b' });
      expect(result.current).toBe('b');

      act(() => { vi.advanceTimersByTime(300); });

      rerender({ value: 'c' });
      expect(result.current).toBe('c');
    });
  });
});

describe('useThrottledCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should throttle callback execution', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 500));

      act(() => { result.current('a'); });
      act(() => { result.current('b'); });
      act(() => { result.current('c'); });

      // First call should execute immediately
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('a');

      // Wait for throttle period
      act(() => { vi.advanceTimersByTime(500); });

      // Trailing call should execute
      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenLastCalledWith('c');
    });

    it('should preserve this context', () => {
      const obj = {
        value: 42,
        method: vi.fn(function(this: any) { return this.value; }),
      };

      const { result } = renderHook(() => 
        useThrottledCallback(obj.method.bind(obj), 500)
      );

      act(() => { result.current(); });

      expect(obj.method).toHaveBeenCalled();
    });
  });

  describe('scroll handler example', () => {
    it('should work as scroll handler', () => {
      const onScroll = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(onScroll, 100));

      // Simulate rapid scroll events
      for (let i = 0; i < 50; i++) {
        act(() => { 
          result.current({ scrollTop: i * 10 });
          vi.advanceTimersByTime(10);
        });
      }

      // Should be throttled - not 50 calls
      expect(onScroll.mock.calls.length).toBeLessThan(50);
      expect(onScroll.mock.calls.length).toBeGreaterThan(3);
    });
  });

  describe('cancel', () => {
    it('should cancel pending trailing call', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 500));

      act(() => { result.current('first'); });
      act(() => { result.current('second'); });

      expect(callback).toHaveBeenCalledTimes(1);

      // Cancel trailing call
      act(() => { result.current.cancel(); });
      act(() => { vi.advanceTimersByTime(500); });

      // Trailing should not have executed
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Search input example', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce search query', () => {
    const onSearch = vi.fn();
    
    const { result, rerender } = renderHook(
      ({ query }) => {
        const debouncedQuery = useDebounce(query, 300);
        
        // Simulate effect that calls onSearch
        if (debouncedQuery) {
          onSearch(debouncedQuery);
        }
        
        return debouncedQuery;
      },
      { initialProps: { query: '' } }
    );

    // User types "react"
    rerender({ query: 'r' });
    rerender({ query: 're' });
    rerender({ query: 'rea' });
    rerender({ query: 'reac' });
    rerender({ query: 'react' });

    // No search yet
    expect(onSearch).not.toHaveBeenCalled();

    // Wait for debounce
    act(() => { vi.advanceTimersByTime(300); });

    // Should search for final value
    expect(result.current).toBe('react');
  });
});

describe('Window resize example', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throttle resize handler', () => {
    const onResize = vi.fn();
    const { result } = renderHook(() => useThrottledCallback(onResize, 100));

    // Simulate resize events
    for (let i = 0; i < 20; i++) {
      act(() => { 
        result.current({ width: 800 + i, height: 600 });
        vi.advanceTimersByTime(16); // ~60fps
      });
    }

    // Should be significantly throttled
    expect(onResize.mock.calls.length).toBeLessThan(10);
  });
});
