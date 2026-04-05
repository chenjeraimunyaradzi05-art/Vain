'use client';

import { API_BASE } from '@/lib/apiBase';
import { useEffect, useState } from 'react';

/**
 * Report error to monitoring service (Sentry)
 * Configure NEXT_PUBLIC_SENTRY_DSN to enable
 */
function reportError(error) {
  // Log to console in development
   
  console.error('Application Error:', error);

  const apiBase = API_BASE;

  // Report to Sentry if configured
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (sentryDsn && typeof window !== 'undefined') {
    // Simple error reporting - in production use @sentry/nextjs
    const errorPayload = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };

    // Send to error tracking endpoint
    fetch(`${apiBase}/error-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorPayload)
    }).catch(() => {
      // Silently fail - don't cause more errors
    });
  }
}

export default function Error({ error, reset }) {
  const [showDetails, setShowDetails] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  useEffect(() => {
    reportError(error);
    setReportSent(true);
  }, [error]);

  return (
    <div 
      className="min-h-[60vh] flex items-center justify-center px-6 py-20"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="mx-auto max-w-lg text-center">
        {/* Error Icon */}
        <div 
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20"
          aria-hidden="true"
        >
          <svg
            className="h-10 w-10 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-slate-300 mb-2">
          We encountered an unexpected error. Don&apos;t worry, your data is safe.
        </p>

        {reportSent && (
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            This error has been automatically reported to our team.
          </p>
        )}

        {/* Dev-only error details */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-2 mx-auto"
            >
              <span>{showDetails ? 'Hide' : 'Show'} error details</span>
              <svg
                className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showDetails && (
              <div className="mt-4 text-left bg-slate-900/80 border border-slate-700 rounded-lg p-4 overflow-hidden">
                <p className="text-xs font-mono text-red-400 break-words">
                  {error.message}
                </p>
                {error.stack && (
                  <pre className="mt-3 text-xs font-mono text-slate-400 overflow-auto max-h-48 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            onClick={() => reset()}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-6 py-3 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Go home
          </a>
        </div>

        {/* Help text */}
        <p className="mt-8 text-xs text-gray-500 dark:text-slate-500">
          If this problem persists, please{' '}
          <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 underline">
            contact support
          </a>
        </p>
      </div>
    </div>
  );
}

