'use client';

/**
 * Offline Page
 * 
 * Displayed when the user is offline and the requested page
 * is not available in cache.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  WifiOff,
  RefreshCw,
  Home,
  Briefcase,
  MessageSquare,
  CloudOff,
} from 'lucide-react';

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      window.location.reload();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    try {
      const response = await fetch('/api/health', { method: 'HEAD' });
      if (response.ok) {
        window.location.reload();
      }
    } catch {
      // Still offline
    }
    
    setTimeout(() => setIsRetrying(false), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <OptimizedImage src="/brand/vantage-logo.png" alt="Vantage" width={32} height={32} className="h-8 w-8" />
            <span className="text-xl font-bold text-white">Vantage</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <WifiOff className="w-5 h-5" />
            <span className="text-sm">Offline</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          {/* Offline Icon */}
          <div className="w-24 h-24 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center">
            <CloudOff className="w-12 h-12 text-slate-500" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">You're Offline</h1>
          <p className="text-slate-400 mb-8">
            It looks like you've lost your internet connection. Check your connection and try again.
          </p>

          {/* Retry Button */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 mb-6"
          >
            <RefreshCw className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Checking connection...' : 'Try Again'}
          </button>

          {/* Cached Pages */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <p className="text-sm text-slate-400 mb-3">
              These pages might be available offline:
            </p>
            <div className="space-y-2">
              <Link
                href="/"
                className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Home className="w-5 h-5 text-purple-400" />
                <span className="text-slate-300">Home</span>
              </Link>
              <Link
                href="/jobs"
                className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Briefcase className="w-5 h-5 text-purple-400" />
                <span className="text-slate-300">Jobs (Cached)</span>
              </Link>
              <Link
                href="/messages"
                className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <span className="text-slate-300">Messages (Cached)</span>
              </Link>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-6 text-left">
            <p className="text-sm font-medium text-slate-300 mb-2">Troubleshooting tips:</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Check your Wi-Fi or mobile data connection</li>
              <li>• Try moving to an area with better signal</li>
              <li>• Restart your router or modem</li>
              <li>• Disable airplane mode if enabled</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-4 text-center">
        <p className="text-sm text-slate-500">
          Changes you make while offline will sync when you reconnect.
        </p>
      </footer>
    </div>
  );
}
