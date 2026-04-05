/**
 * Unified API Types
 * 
 * This file exports types that should be used by both web and mobile clients.
 * Import from @ngurra/types for the full type definitions.
 * 
 * This is a bridge file until the shared types package is fully integrated.
 */

// Re-export common types for mobile compatibility
export * from '@ngurra/types';

// Mobile-specific API configuration
export interface MobileApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export const DEFAULT_MOBILE_CONFIG: MobileApiConfig = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Offline sync types
export interface SyncQueueItem {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface SyncStatus {
  pendingCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
  errors: SyncQueueItem[];
}

// Push notification types
export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: {
    type: string;
    id?: string;
    action?: string;
    url?: string;
  };
}

// Biometric auth types
export interface BiometricCapabilities {
  available: boolean;
  biometryType: 'fingerprint' | 'faceId' | 'iris' | null;
  enrolled: boolean;
}

// Deep link types
export interface DeepLinkConfig {
  scheme: string;
  host: string;
  routes: {
    pattern: string;
    screen: string;
    params?: string[];
  }[];
}

export const DEEP_LINK_CONFIG: DeepLinkConfig = {
  scheme: 'ngurra',
  host: 'ngurrapathways.com.au',
  routes: [
    { pattern: '/jobs/:id', screen: 'JobDetail', params: ['id'] },
    { pattern: '/courses/:id', screen: 'CourseDetail', params: ['id'] },
    { pattern: '/mentors/:id', screen: 'MentorProfile', params: ['id'] },
    { pattern: '/applications/:id', screen: 'ApplicationDetail', params: ['id'] },
    { pattern: '/profile', screen: 'Profile' },
    { pattern: '/messages', screen: 'Messages' },
    { pattern: '/notifications', screen: 'Notifications' },
  ],
};
