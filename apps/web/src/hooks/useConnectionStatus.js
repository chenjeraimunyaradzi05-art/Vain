'use client';

/**
 * useConnectionStatus Hook
 * Monitors network connectivity and API availability
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/apiBase';

export function useConnectionStatus(options = {}) {
  const { checkInterval = 30000, onStatusChange } = options;
  
  const [isOnline, setIsOnline] = useState(true);
  const [apiReachable, setApiReachable] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);
  const [checking, setChecking] = useState(false);

  // Check API reachability
  const checkApiConnection = useCallback(async () => {
    if (checking) return;
    
    setChecking(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`${API_BASE}/health/live`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      
      clearTimeout(timeout);
      
      const wasReachable = apiReachable;
      const nowReachable = res.ok;
      
      setApiReachable(nowReachable);
      setLastChecked(new Date());
      
      // Notify on status change
      if (wasReachable !== nowReachable && onStatusChange) {
        onStatusChange({ online: isOnline, apiReachable: nowReachable });
      }
      
      return nowReachable;
    } catch (err) {
      setApiReachable(false);
      setLastChecked(new Date());
      
      if (onStatusChange) {
        onStatusChange({ online: isOnline, apiReachable: false });
      }
      
      return false;
    } finally {
      setChecking(false);
    }
  }, [checking, apiReachable, isOnline, onStatusChange]);

  // Monitor browser online/offline events
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      checkApiConnection();
    }

    function handleOffline() {
      setIsOnline(false);
      setApiReachable(false);
      if (onStatusChange) {
        onStatusChange({ online: false, apiReachable: false });
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      checkApiConnection();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkApiConnection, onStatusChange]);

  // Periodic health check
  useEffect(() => {
    if (!checkInterval) return;

    const interval = setInterval(() => {
      if (isOnline) {
        checkApiConnection();
      }
    }, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval, isOnline, checkApiConnection]);

  return {
    isOnline,
    apiReachable,
    isConnected: isOnline && apiReachable,
    lastChecked,
    checking,
    checkNow: checkApiConnection,
  };
}

export default useConnectionStatus;
