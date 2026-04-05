/**
 * API Fetch Hooks
 *
 * Custom hooks for data fetching with caching, error handling,
 * and optimistic updates.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isValidating: boolean;
}

export interface FetchOptions {
  /** Skip initial fetch */
  skip?: boolean;
  /** Cache time in milliseconds */
  cacheTime?: number;
  /** Refetch on window focus */
  refetchOnFocus?: boolean;
  /** Polling interval in milliseconds */
  pollingInterval?: number;
  /** Callback on success */
  // eslint-disable-next-line no-unused-vars
  onSuccess?: (data: unknown) => void;
  /** Callback on error */
  // eslint-disable-next-line no-unused-vars
  onError?: (error: Error) => void;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Generic fetch hook for API data
 */
export function useFetch<T>(
  url: string | null,
  options: FetchOptions = {},
  // eslint-disable-next-line no-unused-vars
): FetchState<T> & { refetch: () => Promise<void>; mutate: (data: T) => void } {
  const {
    skip = false,
    cacheTime = DEFAULT_CACHE_TIME,
    refetchOnFocus = true,
    pollingInterval,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: !skip && !!url,
    error: null,
    isValidating: false,
  });

  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!url || skip) return;

    // Check cache
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setState((s) => ({
        ...s,
        data: cached.data as T,
        isLoading: false,
        isValidating: true,
      }));
    }

    try {
      setState((s) => ({ ...s, isValidating: true }));

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      // Update cache
      cache.set(url, { data, timestamp: Date.now() });

      if (mountedRef.current) {
        setState({
          data,
          isLoading: false,
          error: null,
          isValidating: false,
        });
        onSuccess?.(data);
      }
    } catch (error: unknown) {
      if (mountedRef.current) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState((s) => ({
          ...s,
          isLoading: false,
          error: err,
          isValidating: false,
        }));
        onError?.(err);
      }
    }
  }, [url, skip, cacheTime, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnFocus, fetchData]);

  // Polling
  useEffect(() => {
    if (!pollingInterval) return;

    const interval = setInterval(fetchData, pollingInterval);
    return () => clearInterval(interval);
  }, [pollingInterval, fetchData]);

  // Optimistic update function
  const mutate = useCallback(
    (data: T) => {
      setState((s) => ({ ...s, data }));
      if (url) {
        cache.set(url, { data, timestamp: Date.now() });
      }
    },
    [url],
  );

  return { ...state, refetch: fetchData, mutate };
}

/**
 * Hook for POST/PUT/DELETE mutations
 */
export function useMutation<TData, TVariables>(
  // eslint-disable-next-line no-unused-vars
  mutationFn: (variables: TVariables) => Promise<TData>,
): {
  // eslint-disable-next-line no-unused-vars
  mutate: (variables: TVariables) => Promise<TData>;
  // eslint-disable-next-line no-unused-vars
  mutateAsync: (variables: TVariables) => Promise<TData>;
  data: TData | null;
  isLoading: boolean;
  error: Error | null;
  reset: () => void;
} {
  const [state, setState] = useState<{
    data: TData | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: false,
    error: null,
  });

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setState({ data: null, isLoading: true, error: null });

      try {
        const data = await mutationFn(variables);
        setState({ data, isLoading: false, error: null });
        return data;
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        setState({ data: null, isLoading: false, error: err });
        throw err;
      }
    },
    [mutationFn],
  );

  const mutate = useCallback(
    (variables: TVariables): Promise<TData> => {
      return mutateAsync(variables);
    },
    [mutateAsync],
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, mutate, mutateAsync, reset };
}

/**
 * Hook for paginated data
 */
export function usePaginatedFetch<T>(
  baseUrl: string,
  options: FetchOptions & { pageSize?: number } = {},
) {
  const { pageSize = 20, ...fetchOptions } = options;
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const url = `${baseUrl}?page=${page}&limit=${pageSize}`;

  const { data, isLoading, error, refetch } = useFetch<{
    items: T[];
    total: number;
    page: number;
    totalPages: number;
  }>(url, fetchOptions);

  useEffect(() => {
    if (data?.items) {
      if (page === 1) {
        setAllData(data.items);
      } else {
        setAllData((prev) => [...prev, ...data.items]);
      }
      setHasMore(page < (data.totalPages || 1));
    }
  }, [data, page]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setPage((p) => p + 1);
    }
  }, [isLoading, hasMore]);

  const reset = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
  }, []);

  return {
    data: allData,
    isLoading,
    error,
    hasMore,
    loadMore,
    reset,
    refetch: () => {
      reset();
      refetch();
    },
    page,
    total: data?.total || 0,
  };
}

/**
 * Debounced search hook
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Search hook with debouncing
 */
export function useSearch<T>(
  searchUrl: string,
  options: FetchOptions & { debounceMs?: number } = {},
) {
  const { debounceMs = 300, ...fetchOptions } = options;
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);

  const url = debouncedQuery ? `${searchUrl}?q=${encodeURIComponent(debouncedQuery)}` : null;

  const { data, isLoading, error } = useFetch<T>(url, {
    ...fetchOptions,
    skip: !debouncedQuery,
  });

  return {
    query,
    setQuery,
    results: data,
    isSearching: isLoading,
    error,
  };
}

export default useFetch;
