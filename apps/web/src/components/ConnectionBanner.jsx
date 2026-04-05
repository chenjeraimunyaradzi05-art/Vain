'use client';

/**
 * Connection Status Banner
 * Shows when the user is offline or API is unreachable
 */

import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import useConnectionStatus from '@/hooks/useConnectionStatus';

export default function ConnectionBanner() {
  const { isOnline, apiReachable, isConnected, checking, checkNow } = useConnectionStatus();

  // Don't show anything if connected
  if (isConnected) {
    return null;
  }

  const isOffline = !isOnline;
  const apiDown = isOnline && !apiReachable;

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 z-50 px-4 py-3 ${
        isOffline 
          ? 'bg-slate-900 border-t border-slate-700' 
          : 'bg-amber-900/90 border-t border-amber-700'
      }`}
      role="alert"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isOffline ? (
            <>
              <WifiOff className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-sm">You're offline</p>
                <p className="text-xs text-slate-400">Check your internet connection</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <p className="font-medium text-sm text-amber-100">Connection issues</p>
                <p className="text-xs text-amber-200/70">Unable to reach the server</p>
              </div>
            </>
          )}
        </div>

        {apiDown && (
          <button
            onClick={checkNow}
            disabled={checking}
            className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Retry'}
          </button>
        )}
      </div>
    </div>
  );
}
