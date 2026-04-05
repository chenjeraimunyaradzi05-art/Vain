/**
 * Analytics Service for React Native
 * 
 * Tracks user interactions and app usage for insights.
 * Respects user privacy preferences.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const ANALYTICS_ENDPOINT = process.env.EXPO_PUBLIC_API_URL 
  ? `${process.env.EXPO_PUBLIC_API_URL}/analytics/events`
  : null;

const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 seconds

// Event queue
let eventQueue = [];
let flushTimer = null;
let isInitialized = false;
let analyticsEnabled = true;
let userId = null;
let sessionId = null;

/**
 * Initialize analytics
 */
export async function initAnalytics() {
  if (isInitialized) return;

  try {
    // Check user preference
    const preference = await AsyncStorage.getItem('analytics_enabled');
    analyticsEnabled = preference !== 'false';

    // Generate session ID
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Load any queued events from storage
    const storedEvents = await AsyncStorage.getItem('analytics_queue');
    if (storedEvents) {
      eventQueue = JSON.parse(storedEvents);
    }

    // Start flush timer
    flushTimer = setInterval(flushEvents, FLUSH_INTERVAL);

    isInitialized = true;
    console.log('[Analytics] Initialized');
  } catch (error) {
    console.error('[Analytics] Init error:', error);
  }
}

/**
 * Set the current user
 * @param {object} user - User object
 */
export function setUser(user) {
  userId = user?.id || null;
}

/**
 * Enable or disable analytics
 * @param {boolean} enabled - Whether analytics is enabled
 */
export async function setEnabled(enabled) {
  analyticsEnabled = enabled;
  await AsyncStorage.setItem('analytics_enabled', enabled.toString());
  
  if (!enabled) {
    // Clear queued events
    eventQueue = [];
    await AsyncStorage.removeItem('analytics_queue');
  }
}

/**
 * Check if analytics is enabled
 * @returns {boolean}
 */
export function isEnabled() {
  return analyticsEnabled;
}

/**
 * Track an event
 * @param {string} eventName - Name of the event
 * @param {object} properties - Event properties
 */
export function track(eventName, properties = {}) {
  if (!analyticsEnabled || !isInitialized) return;

  const event = {
    name: eventName,
    properties: {
      ...properties,
      // Don't include PII
    },
    timestamp: new Date().toISOString(),
    sessionId,
    userId: userId ? hashUserId(userId) : null,
  };

  eventQueue.push(event);

  // Flush if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    flushEvents();
  } else {
    // Save to storage for persistence
    saveQueue();
  }
}

/**
 * Track screen view
 * @param {string} screenName - Name of the screen
 * @param {object} properties - Additional properties
 */
export function trackScreen(screenName, properties = {}) {
  track('screen_view', {
    screen_name: screenName,
    ...properties,
  });
}

/**
 * Track user action
 * @param {string} action - Action name
 * @param {string} category - Action category
 * @param {object} properties - Additional properties
 */
export function trackAction(action, category, properties = {}) {
  track('user_action', {
    action,
    category,
    ...properties,
  });
}

/**
 * Track timing
 * @param {string} name - Timer name
 * @param {number} duration - Duration in milliseconds
 * @param {object} properties - Additional properties
 */
export function trackTiming(name, duration, properties = {}) {
  track('timing', {
    name,
    duration,
    ...properties,
  });
}

/**
 * Start a timer
 * @param {string} name - Timer name
 * @returns {Function} Stop function
 */
export function startTimer(name) {
  const startTime = Date.now();
  return (properties = {}) => {
    const duration = Date.now() - startTime;
    trackTiming(name, duration, properties);
    return duration;
  };
}

/**
 * Track an error
 * @param {Error} error - The error
 * @param {object} context - Additional context
 */
export function trackError(error, context = {}) {
  track('error', {
    error_message: error.message,
    error_name: error.name,
    ...context,
  });
}

/**
 * Flush events to server
 */
async function flushEvents() {
  if (eventQueue.length === 0 || !ANALYTICS_ENDPOINT) return;

  const eventsToSend = [...eventQueue];
  eventQueue = [];

  try {
    const token = await AsyncStorage.getItem('auth_token');
    
    const response = await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ events: eventsToSend }),
    });

    if (!response.ok) {
      // Put events back in queue on failure
      eventQueue = [...eventsToSend, ...eventQueue];
    }

    await AsyncStorage.removeItem('analytics_queue');
  } catch (error) {
    // Put events back in queue
    eventQueue = [...eventsToSend, ...eventQueue];
    console.error('[Analytics] Flush error:', error);
  }
}

/**
 * Save queue to storage
 */
async function saveQueue() {
  try {
    await AsyncStorage.setItem('analytics_queue', JSON.stringify(eventQueue));
  } catch (error) {
    console.error('[Analytics] Save queue error:', error);
  }
}

/**
 * Hash user ID for privacy
 * @param {string} id - User ID
 * @returns {string} Hashed ID
 */
function hashUserId(id) {
  // Simple hash for anonymization
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `user_${Math.abs(hash).toString(36)}`;
}

/**
 * Clean up analytics (call on app close)
 */
export async function cleanup() {
  if (flushTimer) {
    clearInterval(flushTimer);
  }
  await flushEvents();
}

// Pre-defined events
export const Events = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  
  // Jobs
  JOB_VIEW: 'job_view',
  JOB_APPLY: 'job_apply',
  JOB_SAVE: 'job_save',
  JOB_SHARE: 'job_share',
  JOB_SEARCH: 'job_search',
  
  // Mentorship
  MENTOR_VIEW: 'mentor_view',
  SESSION_BOOK: 'session_book',
  SESSION_COMPLETE: 'session_complete',
  
  // Courses
  COURSE_VIEW: 'course_view',
  COURSE_ENROLL: 'course_enroll',
  COURSE_COMPLETE: 'course_complete',
  
  // Community
  POST_CREATE: 'post_create',
  POST_VIEW: 'post_view',
  POST_LIKE: 'post_like',
  COMMENT_CREATE: 'comment_create',
  
  // Messaging
  MESSAGE_SEND: 'message_send',
  CONVERSATION_START: 'conversation_start',
  
  // Profile
  PROFILE_UPDATE: 'profile_update',
  RESUME_UPLOAD: 'resume_upload',
  
  // Settings
  SETTINGS_CHANGE: 'settings_change',
  NOTIFICATION_TOGGLE: 'notification_toggle',
};

export default {
  initAnalytics,
  setUser,
  setEnabled,
  isEnabled,
  track,
  trackScreen,
  trackAction,
  trackTiming,
  startTimer,
  trackError,
  cleanup,
  Events,
};
