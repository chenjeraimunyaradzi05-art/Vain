/**
 * Mobile App Configuration
 * 
 * Central configuration values for the Ngurra Pathways mobile app.
 */

// Re-export deep linking configuration
export { linking } from './linking';

// API configuration
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

// App info
export const APP_NAME = 'Ngurra Pathways';
export const APP_VERSION = '1.0.0';

// Feature flags
export const FEATURES = {
  BIOMETRIC_AUTH: true,
  PUSH_NOTIFICATIONS: true,
  OFFLINE_MODE: true,
  ANALYTICS: true,
  CRASH_REPORTING: true,
  WELLNESS_CHECKINS: true,
  CULTURAL_CALENDAR: true,
};

// Cache configuration
export const CACHE_CONFIG = {
  DEFAULT_TTL_MINUTES: 5,
  JOBS_TTL_MINUTES: 10,
  PROFILE_TTL_MINUTES: 15,
  COURSES_TTL_MINUTES: 30,
};

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// Timeout configuration (in milliseconds)
export const TIMEOUTS = {
  API_REQUEST: 30000,
  FILE_UPLOAD: 120000,
  BACKGROUND_SYNC: 60000,
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  OFFLINE_QUEUE: '@ngurra_offline_queue',
  SYNC_STATUS: '@ngurra_sync_status',
  NAV_STATE: '@ngurra_nav_state',
  ACCESSIBILITY_PREFS: '@ngurra_accessibility',
  NOTIFICATION_PREFS: '@ngurra_notifications',
  BIOMETRIC_ENABLED: '@ngurra_biometric',
};

// Support contact info
export const SUPPORT = {
  EMAIL: 'support@ngurrapathways.com.au',
  PHONE: '1800 NGURRA',
  WEBSITE: 'https://ngurrapathways.com.au/support',
};

// Analytics event names
export const ANALYTICS_EVENTS = {
  SCREEN_VIEW: 'screen_view',
  LOGIN: 'login',
  LOGOUT: 'logout',
  JOB_VIEW: 'job_view',
  JOB_APPLY: 'job_apply',
  JOB_SAVE: 'job_save',
  COURSE_VIEW: 'course_view',
  COURSE_ENROLL: 'course_enroll',
  MENTOR_REQUEST: 'mentor_request',
  SESSION_BOOK: 'session_book',
  WELLNESS_CHECKIN: 'wellness_checkin',
  PROFILE_UPDATE: 'profile_update',
};

export default {
  API_BASE,
  APP_NAME,
  APP_VERSION,
  FEATURES,
  CACHE_CONFIG,
  PAGINATION,
  TIMEOUTS,
  STORAGE_KEYS,
  SUPPORT,
  ANALYTICS_EVENTS,
};
