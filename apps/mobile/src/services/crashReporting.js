/**
 * Crash Reporting and Analytics Service for React Native
 * 
 * Integrates with Sentry for crash reporting and performance monitoring.
 */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Configuration
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENVIRONMENT = process.env.EXPO_PUBLIC_ENV || 'development';
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

/**
 * Initialize crash reporting
 */
export function initCrashReporting() {
  if (!SENTRY_DSN) {
    console.log('[CrashReporting] Sentry DSN not configured, skipping initialization');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `ngurra-pathways-mobile@${APP_VERSION}`,
    
    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,
    
    // Session tracking
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    
    // Additional options
    enableNativeCrashHandling: true,
    attachStacktrace: true,
    
    // Before sending events
    beforeSend(event, hint) {
      // Filter out events in development
      if (ENVIRONMENT === 'development') {
        console.log('[Sentry] Would send event:', event.message || event.exception);
        return null;
      }
      
      // Scrub sensitive data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      
      return event;
    },
  });

  console.log('[CrashReporting] Sentry initialized');
}

/**
 * Identify a user for crash reports
 * @param {object} user - User object
 */
export function identifyUser(user) {
  if (!user) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: user.id,
    // Don't send PII
    segment: user.role || 'candidate',
  });
}

/**
 * Log a custom event
 * @param {string} name - Event name
 * @param {object} data - Event data
 */
export function logEvent(name, data = {}) {
  Sentry.addBreadcrumb({
    category: 'app.event',
    message: name,
    data,
    level: 'info',
  });
}

/**
 * Log navigation events
 * @param {string} routeName - Current route name
 * @param {object} params - Route params
 */
export function logNavigation(routeName, params = {}) {
  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated to ${routeName}`,
    data: { params },
    level: 'info',
  });
}

/**
 * Log a non-fatal error
 * @param {Error} error - The error
 * @param {object} context - Additional context
 */
export function logError(error, context = {}) {
  Sentry.withScope((scope) => {
    scope.setLevel('error');
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureException(error);
  });
}

/**
 * Log a warning
 * @param {string} message - Warning message
 * @param {object} context - Additional context
 */
export function logWarning(message, context = {}) {
  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    Sentry.captureMessage(message);
  });
}

/**
 * Start a performance transaction
 * @param {string} name - Transaction name
 * @param {string} op - Operation type
 * @returns {object} Transaction object
 */
export function startTransaction(name, op = 'task') {
  return Sentry.startTransaction({
    name,
    op,
  });
}

/**
 * Wrap a function with error boundary
 * @param {Function} fn - Function to wrap
 * @param {string} context - Context for error reporting
 */
export function withErrorBoundary(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { context, args: JSON.stringify(args).slice(0, 500) });
      throw error;
    }
  };
}

/**
 * Set custom tags for filtering
 * @param {object} tags - Key-value tags
 */
export function setTags(tags) {
  Object.entries(tags).forEach(([key, value]) => {
    Sentry.setTag(key, value);
  });
}

/**
 * Manually flush events (useful before app closes)
 */
export async function flush() {
  await Sentry.flush(2000);
}

// Export Sentry for advanced usage
export { Sentry };

export default {
  initCrashReporting,
  identifyUser,
  logEvent,
  logNavigation,
  logError,
  logWarning,
  startTransaction,
  withErrorBoundary,
  setTags,
  flush,
  Sentry,
};
