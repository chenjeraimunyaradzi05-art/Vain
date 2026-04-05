'use client';

/**
 * Feature Error Boundary
 * 
 * Per-feature error boundary with Sentry integration.
 * Provides graceful degradation for individual features.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  feature: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showErrorDetails: boolean;
}

export class FeatureErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    console.error(`Error in ${this.props.feature}:`, error, errorInfo);

    // Send to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('feature', this.props.feature);
      scope.setExtra('componentStack', errorInfo.componentStack);
      Sentry.captureException(error);
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showErrorDetails: false,
    });
  };

  toggleErrorDetails = () => {
    this.setState((state) => ({
      showErrorDetails: !state.showErrorDetails,
    }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-800 rounded-xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-900/50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">
              Something went wrong
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              We encountered an error loading {this.props.feature}. 
              Our team has been notified.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="/"
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </a>
            </div>

            {/* Error Details (Development or when showDetails is true) */}
            {(process.env.NODE_ENV === 'development' || this.props.showDetails) && this.state.error && (
              <div className="mt-4">
                <button
                  onClick={this.toggleErrorDetails}
                  className="text-sm text-slate-500 hover:text-slate-400 flex items-center justify-center gap-1 mx-auto"
                >
                  {this.state.showErrorDetails ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show Details
                    </>
                  )}
                </button>

                {this.state.showErrorDetails && (
                  <div className="mt-3 text-left bg-slate-900 rounded-lg p-4 max-h-48 overflow-auto">
                    <p className="text-red-400 text-sm font-mono mb-2">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="text-slate-500 text-xs font-mono whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
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
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: string,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryComponent(props: P) {
    return (
      <FeatureErrorBoundary feature={feature} fallback={fallback}>
        <WrappedComponent {...props} />
      </FeatureErrorBoundary>
    );
  };
}

/**
 * Specific Error Boundaries for common features
 */

export function JobsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FeatureErrorBoundary 
      feature="Jobs"
      fallback={
        <div className="p-6 text-center">
          <p className="text-slate-400">Unable to load jobs. Please try again later.</p>
          <a href="/jobs" className="text-purple-400 hover:underline mt-2 inline-block">
            Refresh
          </a>
        </div>
      }
    >
      {children}
    </FeatureErrorBoundary>
  );
}

export function MentorshipErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FeatureErrorBoundary 
      feature="Mentorship"
      fallback={
        <div className="p-6 text-center">
          <p className="text-slate-400">Unable to load mentorship content.</p>
        </div>
      }
    >
      {children}
    </FeatureErrorBoundary>
  );
}

export function MessagesErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FeatureErrorBoundary 
      feature="Messages"
      fallback={
        <div className="p-6 text-center">
          <p className="text-slate-400">Unable to load messages.</p>
        </div>
      }
    >
      {children}
    </FeatureErrorBoundary>
  );
}

export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FeatureErrorBoundary feature="Dashboard">
      {children}
    </FeatureErrorBoundary>
  );
}

export function ProfileErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FeatureErrorBoundary feature="Profile">
      {children}
    </FeatureErrorBoundary>
  );
}

export function AnalyticsErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <FeatureErrorBoundary 
      feature="Analytics"
      fallback={
        <div className="p-6 text-center">
          <p className="text-slate-400">Analytics temporarily unavailable.</p>
        </div>
      }
    >
      {children}
    </FeatureErrorBoundary>
  );
}
