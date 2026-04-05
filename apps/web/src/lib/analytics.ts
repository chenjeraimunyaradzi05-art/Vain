/**
 * Analytics and Tracking
 * 
 * Event tracking with privacy considerations.
 */

import { config } from './config';
import api from './apiClient';

interface EventProperties {
  [key: string]: string | number | boolean | null | undefined;
}

// ... existing types ...

/**
 * Track an event
 */
export async function trackEvent(name: EventName | string, properties?: EventProperties): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnabled()) return;

  const eventData = {
    eventName: name,
    eventType: 'user_action',
    properties,
    sessionId: getSessionId(), // You might need to implement this helper or get it from context
    timestamp: new Date().toISOString(),
    location: window.location.href,
    deviceInfo: {
      platform: 'web',
      userAgent: window.navigator.userAgent,
    }
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics] Track:', name, properties);
  }

  try {
    // Send to backend
    await api('/analytics/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  } catch (err) {
    // Fail silently for analytics
    console.warn('[Analytics] Failed to track event:', err);
  }
}

/**
 * Get or create a session ID
 */
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
}

interface UserProperties {
  id?: string;
  email?: string;
  role?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Privacy-preserving event names
type EventName =
  | 'page_view'
  | 'sign_up'
  | 'sign_in'
  | 'sign_out'
  | 'job_view'
  | 'job_search'
  | 'job_apply'
  | 'job_save'
  | 'profile_update'
  | 'resume_upload'
  | 'course_view'
  | 'course_enroll'
  | 'mentor_view'
  | 'session_book'
  | 'error';

/**
 * Initialize analytics
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnabled()) return;
  
  // Initialize PostHog if configured
  if (config.posthogKey) {
    // Note: PostHog initialization would go here
    console.log('[Analytics] PostHog initialized');
  }
  
  console.log('[Analytics] Initialized');
}

/**
 * Track an event
 */
export function track(
  event: EventName,
  properties?: EventProperties
): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnabled()) return;
  
  // Strip PII from properties
  const safeProperties = sanitizeProperties(properties);
  
  if (config.isDevelopment) {
    console.log(`[Analytics] ${event}`, safeProperties);
  }
  
  // Send to analytics service
  if (config.posthogKey && (window as any).posthog) {
    (window as any).posthog.capture(event, safeProperties);
  }
}

/**
 * Identify a user
 */
export function identify(userId: string, properties?: UserProperties): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnabled()) return;
  
  // Only include safe properties
  const safeProperties: UserProperties = {
    role: properties?.role,
    // Don't include email for privacy
  };
  
  if (config.isDevelopment) {
    console.log(`[Analytics] Identify: ${userId}`, safeProperties);
  }
  
  if (config.posthogKey && (window as any).posthog) {
    (window as any).posthog.identify(userId, safeProperties);
  }
}

/**
 * Reset analytics (on logout)
 */
export function reset(): void {
  if (typeof window === 'undefined') return;
  
  if (config.isDevelopment) {
    console.log('[Analytics] Reset');
  }
  
  if (config.posthogKey && (window as any).posthog) {
    (window as any).posthog.reset();
  }
}

/**
 * Track page view
 */
export function trackPageView(url: string): void {
  if (!isAnalyticsEnabled()) return;
  track('page_view', { url: sanitizePath(url) });
}

/**
 * Remove PII from properties
 */
function sanitizeProperties(
  properties?: EventProperties
): EventProperties | undefined {
  if (!properties) return undefined;
  
  const sensitiveKeys = ['email', 'name', 'phone', 'address', 'ssn', 'password'];
  const result: EventProperties = {};
  
  for (const [key, value] of Object.entries(properties)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      continue; // Skip sensitive data
    }
    result[key] = value;
  }
  
  return result;
}

/**
 * Remove IDs from paths
 */
function sanitizePath(path: string): string {
  return path
    .replace(/\/[a-f0-9-]{36}/gi, '/:id') // UUIDs
    .replace(/\/\d+/g, '/:id'); // Numeric IDs
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for user consent
  const consent = localStorage.getItem('analytics_consent');
  return consent === 'true';
}

/**
 * Set analytics consent
 */
export function setAnalyticsConsent(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('analytics_consent', String(enabled));
  
  if (enabled) {
    initAnalytics();
  } else {
    reset();
  }
}

// Convenience tracking functions
export const analytics = {
  init: initAnalytics,
  track,
  identify,
  reset,
  pageView: trackPageView,
  isEnabled: isAnalyticsEnabled,
  setConsent: setAnalyticsConsent,
  
  // Specific events
  signUp: () => track('sign_up'),
  signIn: () => track('sign_in'),
  signOut: () => track('sign_out'),
  
  jobView: (jobId: string) => track('job_view', { jobId }),
  jobSearch: (query: string, resultCount: number) =>
    track('job_search', { query: query.substring(0, 50), resultCount }),
  jobApply: (jobId: string) => track('job_apply', { jobId }),
  jobSave: (jobId: string) => track('job_save', { jobId }),
  
  courseView: (courseId: string) => track('course_view', { courseId }),
  courseEnroll: (courseId: string) => track('course_enroll', { courseId }),
  
  mentorView: (mentorId: string) => track('mentor_view', { mentorId }),
  sessionBook: (mentorId: string) => track('session_book', { mentorId }),
  
  error: (errorCode: string, message: string) =>
    track('error', { errorCode, message: message.substring(0, 100) }),
};

export default analytics;
