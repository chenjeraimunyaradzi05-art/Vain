'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseOnlineStatusReturn {
  /** Whether the user is online */
  isOnline: boolean;
  /** Whether connection was recently restored */
  wasOffline: boolean;
  /** Timestamp of last online/offline change */
  lastChanged: Date | null;
  /** Force a connection check */
  checkConnection: () => Promise<boolean>;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });
  
  const [wasOffline, setWasOffline] = useState(false);
  const [lastChanged, setLastChanged] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      setLastChanged(new Date());
      
      // Reset wasOffline after a short delay
      setTimeout(() => setWasOffline(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChanged(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // More accurate connection check by trying to fetch
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
      });
      const online = response.ok;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  return {
    isOnline,
    wasOffline,
    lastChanged,
    checkConnection,
  };
}

// Hook for connection-aware data fetching
interface UseConnectionAwareFetchOptions<T> {
  /** The fetch function to call */
  fetchFn: () => Promise<T>;
  /** Whether to retry when connection is restored */
  retryOnReconnect?: boolean;
  /** Cached/fallback data to use when offline */
  fallbackData?: T;
}

export function useConnectionAwareFetch<T>({
  fetchFn,
  retryOnReconnect = true,
  fallbackData,
}: UseConnectionAwareFetchOptions<T>) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [data, setData] = useState<T | undefined>(fallbackData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!isOnline) {
      setError(new Error('No internet connection'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fetch failed'));
    } finally {
      setLoading(false);
    }
  }, [isOnline, fetchFn]);

  // Retry on reconnection
  useEffect(() => {
    if (wasOffline && retryOnReconnect && isOnline) {
      fetch();
    }
  }, [wasOffline, retryOnReconnect, isOnline, fetch]);

  return {
    data,
    loading,
    error,
    isOnline,
    refetch: fetch,
  };
}

// Connection quality detection
type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown';

interface NetworkInformation extends EventTarget {
  downlink?: number;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

export function useConnectionQuality(): ConnectionQuality {
  const [quality, setQuality] = useState<ConnectionQuality>('unknown');
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) {
      setQuality('offline');
      return;
    }

    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (!connection) {
      setQuality('unknown');
      return;
    }

    const updateQuality = () => {
      if (!connection.effectiveType) {
        setQuality('unknown');
        return;
      }

      switch (connection.effectiveType) {
        case '4g':
          setQuality(connection.rtt && connection.rtt < 100 ? 'excellent' : 'good');
          break;
        case '3g':
          setQuality('fair');
          break;
        case '2g':
        case 'slow-2g':
          setQuality('poor');
          break;
        default:
          setQuality('unknown');
      }
    };

    updateQuality();
    connection.addEventListener('change', updateQuality);

    return () => {
      connection.removeEventListener('change', updateQuality);
    };
  }, [isOnline]);

  return quality;
}

export default useOnlineStatus;
