'use client';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs errors, and displays a fallback UI with cosmic theme support.
 */

import React, { Component, ReactNode, ErrorInfo, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  variant?: 'default' | 'cosmic' | 'minimal';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Send to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        extra: { componentStack: errorInfo.componentStack },
      });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };
  
  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { variant = 'default' } = this.props;
    const { hasError, error, errorInfo, showDetails } = this.state;
    
    if (hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isCosmic = variant === 'cosmic';
      const isMinimal = variant === 'minimal';

      // Minimal error UI
      if (isMinimal) {
        return (
          <div className="p-4 text-center">
            <div className="inline-flex items-center gap-2 text-red-500 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Something went wrong</span>
            </div>
            <button
              onClick={this.handleRetry}
              className="block mx-auto text-sm text-blue-600 hover:text-blue-700 underline"
            >
              Try again
            </button>
          </div>
        );
      }

      // Full error UI with cosmic/default variants
      return (
        <div
          className={`
            min-h-[400px] flex items-center justify-center p-8
            ${isCosmic ? 'bg-gradient-to-br from-[#1A0F2E] to-[#2D1B69]' : 'bg-gray-50 dark:bg-gray-900'}
          `}
        >
          <div
            className={`
              max-w-lg w-full p-8 rounded-2xl text-center
              ${isCosmic 
                ? 'bg-[#1A0F2E]/80 border border-[#FFD700]/20 shadow-2xl shadow-[#FFD700]/5' 
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl'}
            `}
          >
            {/* Icon */}
            <div
              className={`
                w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center
                ${isCosmic 
                  ? 'bg-gradient-to-br from-[#E85B8A]/20 to-red-500/20 border border-[#E85B8A]/30' 
                  : 'bg-red-100 dark:bg-red-900/30'}
              `}
            >
              <AlertTriangle 
                className={`w-10 h-10 ${isCosmic ? 'text-[#E85B8A]' : 'text-red-500 dark:text-red-400'}`} 
              />
            </div>

            {/* Title */}
            <h2
              className={`
                text-2xl font-bold mb-3
                ${isCosmic ? 'text-white' : 'text-gray-900 dark:text-white'}
              `}
            >
              Oops! Something went wrong
            </h2>

            {/* Description */}
            <p
              className={`
                mb-6
                ${isCosmic ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}
              `}
            >
              We encountered an unexpected error. Please try again or return home.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <button
                onClick={this.handleRetry}
                className={`
                  inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all
                  ${isCosmic 
                    ? 'bg-gradient-to-r from-[#FFD700] to-[#50C878] text-gray-900 hover:opacity-90' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'}
                `}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>

              <a
                href="/"
                className={`
                  inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors
                  ${isCosmic 
                    ? 'bg-white/10 text-white hover:bg-white/20' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}
                `}
              >
                <Home className="w-4 h-4" />
                Go Home
              </a>
            </div>

            {/* Error details (collapsible) */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className={`border-t ${isCosmic ? 'border-white/10' : 'border-gray-200 dark:border-gray-700'} pt-4`}>
                <button
                  onClick={this.toggleDetails}
                  className={`
                    inline-flex items-center gap-2 text-sm
                    ${isCosmic ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}
                  `}
                >
                  <Bug className="w-4 h-4" />
                  {showDetails ? 'Hide' : 'Show'} technical details
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showDetails && (
                  <div
                    className={`
                      mt-4 p-4 rounded-lg text-left text-sm font-mono overflow-x-auto
                      ${isCosmic 
                        ? 'bg-black/30 text-red-400 border border-red-500/20' 
                        : 'bg-gray-100 dark:bg-gray-900 text-red-600 dark:text-red-400'}
                    `}
                  >
                    <p className="font-bold mb-2">{error.name}: {error.message}</p>
                    {errorInfo && (
                      <pre className="whitespace-pre-wrap text-xs opacity-70">
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap a component with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundary;
}

/**
 * Hook for error handling (for use in function components)
 */
export function useErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    console.error('Error caught by useErrorHandler:', error);
    
    // Send to error tracking service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error);
    }

    // Re-throw to be caught by nearest error boundary
    throw error;
  };
}

export default ErrorBoundary;
