/**
 * usePagination Hook Tests
 * Unit tests for pagination hooks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  usePagination, 
  useInfiniteScroll, 
  useCursorPagination,
  getPageRange,
} from '@/hooks/usePagination';

describe('usePagination', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.totalPages).toBe(10);
    });

    it('should accept initial page', () => {
      const { result } = renderHook(() => 
        usePagination({ totalItems: 100, initialPage: 5 })
      );

      expect(result.current.currentPage).toBe(5);
    });

    it('should accept custom page size', () => {
      const { result } = renderHook(() => 
        usePagination({ totalItems: 100, pageSize: 25 })
      );

      expect(result.current.pageSize).toBe(25);
      expect(result.current.totalPages).toBe(4);
    });

    it('should handle empty data', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 0 }));

      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.hasNext).toBe(false);
      expect(result.current.hasPrev).toBe(false);
    });
  });

  describe('navigation', () => {
    it('should go to next page', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(2);
    });

    it('should go to previous page', () => {
      const { result } = renderHook(() => 
        usePagination({ totalItems: 100, initialPage: 5 })
      );

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.currentPage).toBe(4);
    });

    it('should go to specific page', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      act(() => {
        result.current.goToPage(7);
      });

      expect(result.current.currentPage).toBe(7);
    });

    it('should go to first page', () => {
      const { result } = renderHook(() => 
        usePagination({ totalItems: 100, initialPage: 5 })
      );

      act(() => {
        result.current.firstPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should go to last page', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      act(() => {
        result.current.lastPage();
      });

      expect(result.current.currentPage).toBe(10);
    });

    it('should not go past first page', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      act(() => {
        result.current.prevPage();
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should not go past last page', () => {
      const { result } = renderHook(() => 
        usePagination({ totalItems: 100, initialPage: 10 })
      );

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(10);
    });

    it('should clamp invalid page numbers', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      act(() => {
        result.current.goToPage(100);
      });

      expect(result.current.currentPage).toBe(10);

      act(() => {
        result.current.goToPage(-5);
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('state flags', () => {
    it('should report hasNext correctly', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      expect(result.current.hasNext).toBe(true);

      act(() => {
        result.current.goToPage(10);
      });

      expect(result.current.hasNext).toBe(false);
    });

    it('should report hasPrev correctly', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      expect(result.current.hasPrev).toBe(false);

      act(() => {
        result.current.nextPage();
      });

      expect(result.current.hasPrev).toBe(true);
    });
  });

  describe('slice indices', () => {
    it('should calculate start and end indices', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      expect(result.current.startIndex).toBe(0);
      expect(result.current.endIndex).toBe(10);

      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.startIndex).toBe(20);
      expect(result.current.endIndex).toBe(30);
    });

    it('should handle last page correctly', () => {
      const { result } = renderHook(() => 
        usePagination({ totalItems: 95, pageSize: 10 })
      );

      act(() => {
        result.current.lastPage();
      });

      expect(result.current.startIndex).toBe(90);
      expect(result.current.endIndex).toBe(95);
    });
  });

  describe('page size change', () => {
    it('should update page size', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      act(() => {
        result.current.setPageSize(20);
      });

      expect(result.current.pageSize).toBe(20);
      expect(result.current.totalPages).toBe(5);
    });

    it('should reset to page 1 when page size changes', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      act(() => {
        result.current.goToPage(5);
      });

      act(() => {
        result.current.setPageSize(25);
      });

      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('page numbers for UI', () => {
    it('should generate page numbers', () => {
      const { result } = renderHook(() => usePagination({ totalItems: 100 }));

      expect(result.current.pageNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    it('should generate visible page numbers with ellipsis', () => {
      const { result } = renderHook(() => 
        usePagination({ totalItems: 1000, initialPage: 50 })
      );

      // Visible pages around current page
      expect(result.current.visiblePages).toContain(50);
      expect(result.current.visiblePages).toContain(49);
      expect(result.current.visiblePages).toContain(51);
    });
  });

  describe('total items change', () => {
    it('should recalculate when total items changes', () => {
      const { result, rerender } = renderHook(
        ({ total }) => usePagination({ totalItems: total }),
        { initialProps: { total: 100 } }
      );

      expect(result.current.totalPages).toBe(10);

      rerender({ total: 50 });

      expect(result.current.totalPages).toBe(5);
    });

    it('should adjust current page if exceeds new total', () => {
      const { result, rerender } = renderHook(
        ({ total }) => usePagination({ totalItems: total, initialPage: 10 }),
        { initialProps: { total: 100 } }
      );

      expect(result.current.currentPage).toBe(10);

      rerender({ total: 30 }); // Only 3 pages now

      expect(result.current.currentPage).toBe(3);
    });
  });

  describe('callback', () => {
    it('should call onChange when page changes', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => 
        usePagination({ totalItems: 100, onChange })
      );

      act(() => {
        result.current.nextPage();
      });

      expect(onChange).toHaveBeenCalledWith({
        page: 2,
        pageSize: 10,
        startIndex: 10,
        endIndex: 20,
      });
    });
  });
});

describe('useInfiniteScroll', () => {
  const mockFetchPage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPage.mockResolvedValue({
      items: Array(10).fill({ id: 1 }),
      hasMore: true,
    });
  });

  describe('initialization', () => {
    it('should fetch first page on mount', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useInfiniteScroll({ fetchPage: mockFetchPage })
      );

      await waitForNextUpdate?.();

      expect(mockFetchPage).toHaveBeenCalledWith(1);
      expect(result.current.items.length).toBe(10);
    });

    it('should set loading state correctly', () => {
      const { result } = renderHook(() => 
        useInfiniteScroll({ fetchPage: mockFetchPage })
      );

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('load more', () => {
    it('should load next page', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useInfiniteScroll({ fetchPage: mockFetchPage })
      );

      await waitForNextUpdate?.();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockFetchPage).toHaveBeenCalledWith(2);
      expect(result.current.items.length).toBe(20);
    });

    it('should not load more when no more items', async () => {
      mockFetchPage.mockResolvedValue({
        items: Array(5).fill({ id: 1 }),
        hasMore: false,
      });

      const { result, waitForNextUpdate } = renderHook(() => 
        useInfiniteScroll({ fetchPage: mockFetchPage })
      );

      await waitForNextUpdate?.();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(mockFetchPage).toHaveBeenCalledTimes(1);
    });

    it('should track hasMore state', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useInfiniteScroll({ fetchPage: mockFetchPage })
      );

      await waitForNextUpdate?.();

      expect(result.current.hasMore).toBe(true);

      mockFetchPage.mockResolvedValue({
        items: Array(5).fill({ id: 1 }),
        hasMore: false,
      });

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to initial state', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useInfiniteScroll({ fetchPage: mockFetchPage })
      );

      await waitForNextUpdate?.();

      await act(async () => {
        await result.current.loadMore();
      });

      expect(result.current.items.length).toBe(20);

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.items.length).toBe(10);
      expect(result.current.page).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle fetch errors', async () => {
      mockFetchPage.mockRejectedValue(new Error('Network error'));

      const { result, waitForNextUpdate } = renderHook(() => 
        useInfiniteScroll({ fetchPage: mockFetchPage })
      );

      await waitForNextUpdate?.();

      expect(result.current.error).toBeDefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should retry on error', async () => {
      mockFetchPage
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ items: [{ id: 1 }], hasMore: false });

      const { result, waitForNextUpdate } = renderHook(() => 
        useInfiniteScroll({ fetchPage: mockFetchPage })
      );

      await waitForNextUpdate?.();

      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.items.length).toBe(1);
      expect(result.current.error).toBeNull();
    });
  });
});

describe('useCursorPagination', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      items: Array(10).fill({ id: '123' }),
      nextCursor: 'cursor_abc',
      prevCursor: null,
    });
  });

  describe('initialization', () => {
    it('should fetch first page', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useCursorPagination({ fetch: mockFetch })
      );

      await waitForNextUpdate?.();

      expect(mockFetch).toHaveBeenCalledWith({ cursor: null, direction: 'next' });
      expect(result.current.items.length).toBe(10);
    });
  });

  describe('navigation', () => {
    it('should fetch next cursor', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useCursorPagination({ fetch: mockFetch })
      );

      await waitForNextUpdate?.();

      mockFetch.mockResolvedValue({
        items: Array(10).fill({ id: '456' }),
        nextCursor: 'cursor_def',
        prevCursor: 'cursor_abc',
      });

      await act(async () => {
        await result.current.fetchNext();
      });

      expect(mockFetch).toHaveBeenCalledWith({
        cursor: 'cursor_abc',
        direction: 'next',
      });
    });

    it('should fetch previous cursor', async () => {
      mockFetch.mockResolvedValue({
        items: Array(10).fill({ id: '123' }),
        nextCursor: 'cursor_abc',
        prevCursor: 'cursor_prev',
      });

      const { result, waitForNextUpdate } = renderHook(() => 
        useCursorPagination({ fetch: mockFetch })
      );

      await waitForNextUpdate?.();

      await act(async () => {
        await result.current.fetchPrev();
      });

      expect(mockFetch).toHaveBeenCalledWith({
        cursor: 'cursor_prev',
        direction: 'prev',
      });
    });

    it('should track hasNext and hasPrev', async () => {
      const { result, waitForNextUpdate } = renderHook(() => 
        useCursorPagination({ fetch: mockFetch })
      );

      await waitForNextUpdate?.();

      expect(result.current.hasNext).toBe(true);
      expect(result.current.hasPrev).toBe(false);
    });
  });
});

describe('getPageRange', () => {
  it('should return all pages when total is small', () => {
    const range = getPageRange({ current: 3, total: 5, visible: 7 });
    expect(range).toEqual([1, 2, 3, 4, 5]);
  });

  it('should show ellipsis at end', () => {
    const range = getPageRange({ current: 2, total: 20, visible: 7 });
    expect(range).toEqual([1, 2, 3, 4, 5, '...', 20]);
  });

  it('should show ellipsis at start', () => {
    const range = getPageRange({ current: 19, total: 20, visible: 7 });
    expect(range).toEqual([1, '...', 16, 17, 18, 19, 20]);
  });

  it('should show ellipsis on both sides', () => {
    const range = getPageRange({ current: 10, total: 20, visible: 7 });
    expect(range).toEqual([1, '...', 9, 10, 11, '...', 20]);
  });
});
