/**
 * useFetch Hook Tests
 * Unit tests for data fetching hooks
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFetch, useMutation, usePolling, fetchWithRetry } from '@/hooks/useFetch';

// Mock fetch
global.fetch = vi.fn();

describe('useFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should fetch data on mount', async () => {
      const { result } = renderHook(() => useFetch('/api/test'));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({ data: 'test' });
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() => useFetch('/api/not-found'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeDefined();
    });

    it('should handle network error', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  describe('options', () => {
    it('should skip fetch when skip option is true', async () => {
      const { result } = renderHook(() => useFetch('/api/test', { skip: true }));

      // Should not be loading
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should include headers', async () => {
      renderHook(() => useFetch('/api/test', {
        headers: { 'X-Custom-Header': 'value' },
      }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/test',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Custom-Header': 'value',
            }),
          })
        );
      });
    });

    it('should use different HTTP methods', async () => {
      renderHook(() => useFetch('/api/test', { method: 'POST' }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/test',
          expect.objectContaining({ method: 'POST' })
        );
      });
    });

    it('should include request body', async () => {
      renderHook(() => useFetch('/api/test', {
        method: 'POST',
        body: { name: 'test' },
      }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/test',
          expect.objectContaining({
            body: JSON.stringify({ name: 'test' }),
          })
        );
      });
    });
  });

  describe('refetch', () => {
    it('should refetch data when called', async () => {
      const { result } = renderHook(() => useFetch('/api/test'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Update mock response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'updated' }),
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual({ data: 'updated' });
    });
  });

  describe('dependency changes', () => {
    it('should refetch when URL changes', async () => {
      const { result, rerender } = renderHook(
        ({ url }) => useFetch(url),
        { initialProps: { url: '/api/test1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      rerender({ url: '/api/test2' });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/test2', expect.anything());
      });
    });
  });

  describe('caching', () => {
    it('should cache data when enabled', async () => {
      const { result, rerender } = renderHook(
        () => useFetch('/api/test', { cache: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Unmount and remount
      rerender();

      // Should use cached data
      expect(result.current.data).toEqual({ data: 'test' });
    });
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  describe('basic functionality', () => {
    it('should not fetch on mount', () => {
      renderHook(() => useMutation('/api/test'));
      
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should mutate when called', async () => {
      const { result } = renderHook(() => useMutation('/api/test'));

      await act(async () => {
        await result.current.mutate({ name: 'test' });
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );

      expect(result.current.data).toEqual({ success: true });
    });

    it('should track loading state', async () => {
      let resolveFetch: any;
      (global.fetch as any).mockImplementation(() => 
        new Promise(r => { resolveFetch = r; })
      );

      const { result } = renderHook(() => useMutation('/api/test'));

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.mutate({ data: 'test' });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      });

      const { result } = renderHook(() => useMutation('/api/test'));

      await act(async () => {
        try {
          await result.current.mutate({ data: 'invalid' });
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('callbacks', () => {
    it('should call onSuccess callback', async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() => 
        useMutation('/api/test', { onSuccess })
      );

      await act(async () => {
        await result.current.mutate({ data: 'test' });
      });

      expect(onSuccess).toHaveBeenCalledWith({ success: true });
    });

    it('should call onError callback', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      
      const onError = vi.fn();
      const { result } = renderHook(() => 
        useMutation('/api/test', { onError })
      );

      await act(async () => {
        try {
          await result.current.mutate({ data: 'test' });
        } catch (e) {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset state', async () => {
      const { result } = renderHook(() => useMutation('/api/test'));

      await act(async () => {
        await result.current.mutate({ data: 'test' });
      });

      expect(result.current.data).toBeDefined();

      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });
});

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 1 }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should poll at specified interval', async () => {
    renderHook(() => usePolling('/api/status', { interval: 5000 }));

    // Initial fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Advance by interval
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);

    // Advance again
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should stop polling when disabled', async () => {
    const { rerender } = renderHook(
      ({ enabled }) => usePolling('/api/status', { interval: 5000, enabled }),
      { initialProps: { enabled: true } }
    );

    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Disable polling
    rerender({ enabled: false });

    // Advance time - should not poll
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch successfully on first try', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'success' }),
    });

    const result = await fetchWithRetry('/api/test');

    expect(result).toEqual({ data: 'success' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure', async () => {
    (global.fetch as any)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
      });

    const result = await fetchWithRetry('/api/test', { maxRetries: 3, delay: 0 });

    expect(result).toEqual({ data: 'success' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('should throw after max retries', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Persistent error'));

    await expect(
      fetchWithRetry('/api/test', { maxRetries: 2, delay: 0 })
    ).rejects.toThrow('Persistent error');

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 4xx errors', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Bad request' }),
    });

    await expect(
      fetchWithRetry('/api/test', { maxRetries: 3, delay: 0 })
    ).rejects.toThrow();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 5xx errors', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
      });

    const result = await fetchWithRetry('/api/test', { maxRetries: 3, delay: 0 });

    expect(result).toEqual({ data: 'success' });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
