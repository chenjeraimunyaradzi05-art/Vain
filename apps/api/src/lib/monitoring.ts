// @ts-nocheck
/**
 * Production Monitoring Configuration
 * 
 * Integrates with:
 * - Sentry for error tracking
 * - PostHog for analytics
 * - Better Uptime for monitoring
 */

import logger from './logger';

// Sentry client
let Sentry = null;

// PostHog client
let posthog = null;

/**
 * Initialize Sentry error tracking
 */
export async function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    logger.info('[Monitoring] Sentry DSN not configured, error tracking disabled');
    return false;
  }

  try {
    // @ts-ignore - Optional dependency
    Sentry = await import('@sentry/node');
    // @ts-ignore - Optional dependency
    const Profiling = await import('@sentry/profiling-node');
    
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.npm_package_version || '1.0.0',
      
      // Performance monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Integrations
      integrations: [
        new Profiling.nodeProfilingIntegration(),
      ],
      
      // Filter sensitive data
      beforeSend(event) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        
        // Remove sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(crumb => {
            if (crumb.data?.password) {
              crumb.data.password = '[REDACTED]';
            }
            return crumb;
          });
        }
        
        return event;
      },
    });

    logger.info('[Monitoring] Sentry initialized');
    return true;
  } catch (error) {
    logger.error('[Monitoring] Failed to initialize Sentry:', error.message);
    return false;
  }
}

/**
 * Initialize PostHog analytics
 */
export async function initPostHog() {
  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST || 'https://app.posthog.com';
  
  if (!apiKey) {
    logger.info('[Monitoring] PostHog API key not configured, analytics disabled');
    return false;
  }

  try {
    // @ts-ignore - Optional dependency
    const { PostHog } = await import('posthog-node');
    
    posthog = new PostHog(apiKey, {
      host,
      flushAt: 20,
      flushInterval: 10000,
    });

    logger.info('[Monitoring] PostHog initialized');
    return true;
  } catch (error) {
    logger.error('[Monitoring] Failed to initialize PostHog:', error.message);
    return false;
  }
}

/**
 * Initialize all monitoring services
 */
export async function initMonitoring() {
  const results = {
    sentry: await initSentry(),
    posthog: await initPostHog(),
  };
  
  return results;
}

/**
 * Capture an error in Sentry
 */
export function captureError(error, context = {}) {
  if (Sentry) {
    Sentry.captureException(error, {
      extra: context,
    });
  }
  logger.error('Captured error:', error.message, context);
}

/**
 * Capture a message in Sentry
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (Sentry) {
    Sentry.captureMessage(message, {
      level,
      extra: context,
    });
  }
  logger[level]?.(message, context) || logger.info(message, context);
}

/**
 * Set user context for error tracking
 */
export function setUser(user) {
  if (Sentry && user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      userType: user.userType,
    });
  }
}

/**
 * Clear user context
 */
export function clearUser() {
  if (Sentry) {
    Sentry.setUser(null);
  }
}

/**
 * Track an analytics event
 */
export function trackEvent(userId, event, properties = {}) {
  if (posthog) {
    posthog.capture({
      distinctId: userId,
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        source: 'api',
      },
    });
  }
}

/**
 * Track page view (for API endpoint hits)
 */
export function trackPageView(userId, path, properties = {}) {
  if (posthog) {
    posthog.capture({
      distinctId: userId,
      event: '$pageview',
      properties: {
        $current_url: path,
        ...properties,
      },
    });
  }
}

/**
 * Identify a user in analytics
 */
export function identifyUser(userId, traits = {}) {
  if (posthog) {
    posthog.identify({
      distinctId: userId,
      properties: traits,
    });
  }
}

/**
 * Create Express middleware for request tracking
 */
export function requestTrackingMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Add request ID for correlation
    req.requestId = req.headers['x-request-id'] || generateRequestId();
    res.setHeader('x-request-id', req.requestId);
    
    // Track response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const userId = req.user?.id || 'anonymous';
      
      // Track API call
      trackEvent(userId, 'api_request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        requestId: req.requestId,
      });
      
      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow request', {
          method: req.method,
          path: req.path,
          duration,
          requestId: req.requestId,
        });
      }
    });
    
    next();
  };
}

/**
 * Create Express error handling middleware
 */
export function errorHandlingMiddleware() {
  return (err, req, res, next) => {
    // Capture error in Sentry
    captureError(err, {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      userId: req.user?.id,
    });
    
    // Track error event
    trackEvent(req.user?.id || 'anonymous', 'api_error', {
      error: err.message,
      stack: err.stack?.substring(0, 500),
      path: req.path,
      requestId: req.requestId,
    });
    
    next(err);
  };
}

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Flush analytics on shutdown
 */
export async function shutdown() {
  if (posthog) {
    await posthog.shutdown();
    logger.info('[Monitoring] PostHog flushed');
  }
  if (Sentry) {
    await Sentry.close(2000);
    logger.info('[Monitoring] Sentry flushed');
  }
}

/**
 * Health check endpoint data
 */
export function getHealthData() {
  return {
    sentry: !!Sentry,
    posthog: !!posthog,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
  };
}



export {};

