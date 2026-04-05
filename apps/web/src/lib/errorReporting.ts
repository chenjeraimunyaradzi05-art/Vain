/**
 * Error Reporting Service
 * 
 * Centralized error reporting for the web application
 */

import { config } from './config';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

/**
 * Error context
 */
export interface ErrorContext {
  /** Unique error ID for tracking */
  errorId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Current page/route */
  page?: string;
  /** Action that triggered the error */
  action?: string;
  /** Component name */
  component?: string;
  /** Additional metadata */
  extra?: Record<string, unknown>;
  /** Tags for categorization */
  tags?: Record<string, string>;
}

/**
 * Error report structure
 */
export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  timestamp: string;
  context: ErrorContext;
  environment: string;
  url: string;
  userAgent: string;
  release?: string;
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Sanitize error for reporting (remove sensitive data)
 */
function sanitizeError(error: Error | unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  
  if (typeof error === 'string') {
    return { message: error };
  }
  
  return { message: String(error) };
}

/**
 * Check if we should report this error
 */
function shouldReport(severity: ErrorSeverity): boolean {
  if (config.isDevelopment) {
    // Report all in development
    return true;
  }
  
  // In production, only report warnings and above
  const levels: ErrorSeverity[] = ['debug', 'info', 'warning', 'error', 'fatal'];
  return levels.indexOf(severity) >= levels.indexOf('warning');
}

/**
 * Error queue for batching
 */
const errorQueue: ErrorReport[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Flush error queue to reporting service
 */
async function flushErrorQueue(): Promise<void> {
  if (errorQueue.length === 0) return;
  
  const errors = [...errorQueue];
  errorQueue.length = 0;
  
  try {
    // Send to error reporting endpoint
    if (config.apiUrl) {
      await fetch(`${config.apiUrl}/errors/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ errors }),
        keepalive: true, // Ensure request completes even if page unloads
      });
    }
    
    // Also log to console in development
    if (config.isDevelopment) {
      errors.forEach(error => {
        console.error(`[${error.severity.toUpperCase()}] ${error.message}`, error);
      });
    }
  } catch {
    // Re-queue errors if reporting fails
    errorQueue.push(...errors);
  }
}

/**
 * Queue an error for reporting
 */
function queueError(report: ErrorReport): void {
  errorQueue.push(report);
  
  // Flush immediately for fatal errors
  if (report.severity === 'fatal') {
    flushErrorQueue();
    return;
  }
  
  // Batch other errors
  if (!flushTimeout) {
    flushTimeout = setTimeout(() => {
      flushTimeout = null;
      flushErrorQueue();
    }, 5000);
  }
}

/**
 * Main error reporting function
 */
export function reportError(
  error: Error | unknown,
  severity: ErrorSeverity = 'error',
  context: ErrorContext = {}
): string {
  const errorId = generateErrorId();
  const sanitized = sanitizeError(error);
  
  const report: ErrorReport = {
    id: errorId,
    message: sanitized.message,
    stack: sanitized.stack,
    severity,
    timestamp: new Date().toISOString(),
    context: {
      ...context,
      errorId,
    },
    environment: config.isDevelopment ? 'development' : 'production',
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    release: process.env.NEXT_PUBLIC_VERSION,
  };
  
  if (shouldReport(severity)) {
    queueError(report);
  }
  
  return errorId;
}

/**
 * Convenience functions for different severity levels
 */
export const errorReporter = {
  debug: (error: Error | unknown, context?: ErrorContext) => 
    reportError(error, 'debug', context),
  
  info: (error: Error | unknown, context?: ErrorContext) => 
    reportError(error, 'info', context),
  
  warning: (error: Error | unknown, context?: ErrorContext) => 
    reportError(error, 'warning', context),
  
  error: (error: Error | unknown, context?: ErrorContext) => 
    reportError(error, 'error', context),
  
  fatal: (error: Error | unknown, context?: ErrorContext) => 
    reportError(error, 'fatal', context),
};

/**
 * Global error handler setup
 */
export function setupGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  
  // Unhandled errors
  window.onerror = (message, source, lineno, colno, error) => {
    reportError(error || message, 'error', {
      extra: { source, lineno, colno },
    });
    return false; // Don't prevent default handling
  };
  
  // Unhandled promise rejections
  window.onunhandledrejection = (event) => {
    reportError(event.reason, 'error', {
      action: 'unhandledrejection',
    });
  };
  
  // Flush errors on page unload
  window.addEventListener('beforeunload', () => {
    flushErrorQueue();
  });
  
  // Flush errors on visibility change (user switching tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushErrorQueue();
    }
  });
}

/**
 * Error boundary helper for React components
 */
export function captureComponentError(
  error: Error,
  errorInfo: { componentStack?: string }
): string {
  return reportError(error, 'error', {
    component: 'ErrorBoundary',
    extra: {
      componentStack: errorInfo.componentStack,
    },
  });
}

/**
 * API error helper
 */
export function captureApiError(
  error: Error | unknown,
  endpoint: string,
  method: string = 'GET'
): string {
  return reportError(error, 'error', {
    action: 'api_call',
    extra: { endpoint, method },
    tags: { type: 'api_error' },
  });
}

export default errorReporter;
