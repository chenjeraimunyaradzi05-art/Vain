/**
 * Notification Store - Zustand state management for notifications
 * 
 * Manages:
 * - In-app notifications
 * - Push notification handling
 * - Read/unread status
 * - Notification preferences
 * - Real-time notification updates
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

// Notification types
export type NotificationType =
  | 'like'
  | 'comment'
  | 'mention'
  | 'connection_request'
  | 'connection_accepted'
  | 'message'
  | 'group_invite'
  | 'job_match'
  | 'job_application'
  | 'mentor_request'
  | 'mentor_session'
  | 'system'
  | 'achievement'
  | 'reminder';

export interface NotificationActor {
  id: string;
  name: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actor?: NotificationActor;
  data?: Record<string, any>;
  deepLink?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';
  // Per-type preferences
  likes: boolean;
  comments: boolean;
  mentions: boolean;
  connectionRequests: boolean;
  messages: boolean;
  groupInvites: boolean;
  jobMatches: boolean;
  mentorRequests: boolean;
  systemUpdates: boolean;
  achievements: boolean;
}

interface NotificationState {
  // Data
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  
  // Pagination
  cursor: string | null;
  hasMore: boolean;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchNotifications: (refresh?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  
  // Notification management
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  
  // Real-time handlers
  handleNewNotification: (notification: Notification) => void;
  
  // Push token management
  registerPushToken: (token: string) => Promise<void>;
  unregisterPushToken: (token: string) => Promise<void>;
  
  // Utility
  getNotificationsByType: (type: NotificationType) => Notification[];
  clearError: () => void;
  reset: () => void;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  inAppEnabled: true,
  emailEnabled: true,
  emailDigest: 'daily',
  likes: true,
  comments: true,
  mentions: true,
  connectionRequests: true,
  messages: true,
  groupInvites: true,
  jobMatches: true,
  mentorRequests: true,
  systemUpdates: true,
  achievements: true
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,
      preferences: DEFAULT_PREFERENCES,
      cursor: null,
      hasMore: true,
      isLoading: false,
      isRefreshing: false,
      error: null,

      // Fetch notifications
      fetchNotifications: async (refresh = false) => {
        const { cursor, isLoading, isRefreshing } = get();
        
        if (isLoading || isRefreshing) return;
        
        set({ 
          isLoading: !refresh, 
          isRefreshing: refresh,
          error: null 
        });

        try {
          const response = await api.notifications.getAll(
            refresh ? undefined : cursor || undefined
          );
          
          set(state => ({
            notifications: refresh 
              ? response.notifications 
              : [...state.notifications, ...response.notifications],
            cursor: response.nextCursor,
            hasMore: response.hasMore,
            isLoading: false,
            isRefreshing: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch notifications',
            isLoading: false,
            isRefreshing: false
          });
        }
      },

      // Fetch unread count
      fetchUnreadCount: async () => {
        try {
          const count = await api.notifications.getUnreadCount();
          set({ unreadCount: count });
        } catch (error: any) {
          console.error('Failed to fetch unread count:', error);
        }
      },

      // Fetch notification preferences
      fetchPreferences: async () => {
        try {
          const prefs = await api.notifications.getPreferences();
          set({ preferences: prefs });
        } catch (error: any) {
          set({ error: error.message || 'Failed to fetch preferences' });
        }
      },

      // Update notification preferences
      updatePreferences: async (prefs: Partial<NotificationPreferences>) => {
        const previousPrefs = get().preferences;
        
        // Optimistic update
        set(state => ({
          preferences: { ...state.preferences, ...prefs }
        }));

        try {
          await api.notifications.updatePreferences(prefs);
        } catch (error: any) {
          // Revert on error
          set({ 
            preferences: previousPrefs,
            error: error.message || 'Failed to update preferences'
          });
        }
      },

      // Mark notification as read
      markAsRead: async (notificationId: string) => {
        const { notifications } = get();
        const notification = notifications.find(n => n.id === notificationId);
        
        if (notification?.read) return; // Already read

        // Optimistic update
        set(state => ({
          notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1)
        }));

        try {
          await api.notifications.markAsRead(notificationId);
        } catch (error: any) {
          // Revert on error
          set(state => ({
            notifications: state.notifications.map(n =>
              n.id === notificationId ? { ...n, read: false } : n
            ),
            unreadCount: state.unreadCount + 1,
            error: error.message
          }));
        }
      },

      // Mark all as read
      markAllAsRead: async () => {
        const { notifications, unreadCount } = get();
        
        // Optimistic update
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0
        }));

        try {
          await api.notifications.markAllAsRead();
        } catch (error: any) {
          // Revert on error
          set({ 
            notifications,
            unreadCount,
            error: error.message 
          });
        }
      },

      // Delete notification
      deleteNotification: async (notificationId: string) => {
        const { notifications } = get();
        const notification = notifications.find(n => n.id === notificationId);

        // Optimistic update
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== notificationId),
          unreadCount: notification?.read 
            ? state.unreadCount 
            : Math.max(0, state.unreadCount - 1)
        }));

        try {
          await api.notifications.delete(notificationId);
        } catch (error: any) {
          // Revert on error
          if (notification) {
            set(state => ({
              notifications: [...state.notifications, notification].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              ),
              unreadCount: notification.read 
                ? state.unreadCount 
                : state.unreadCount + 1,
              error: error.message
            }));
          }
        }
      },

      // Clear all notifications
      clearAll: async () => {
        const { notifications, unreadCount } = get();

        // Optimistic update
        set({
          notifications: [],
          unreadCount: 0
        });

        try {
          await api.notifications.clearAll();
        } catch (error: any) {
          // Revert on error
          set({ 
            notifications,
            unreadCount,
            error: error.message 
          });
        }
      },

      // Real-time: Handle new notification
      handleNewNotification: (notification: Notification) => {
        const { preferences } = get();
        
        // Check if notification type is enabled
        const typePreferences: Record<string, keyof NotificationPreferences> = {
          like: 'likes',
          comment: 'comments',
          mention: 'mentions',
          connection_request: 'connectionRequests',
          connection_accepted: 'connectionRequests',
          message: 'messages',
          group_invite: 'groupInvites',
          job_match: 'jobMatches',
          job_application: 'jobMatches',
          mentor_request: 'mentorRequests',
          mentor_session: 'mentorRequests',
          system: 'systemUpdates',
          achievement: 'achievements',
          reminder: 'systemUpdates'
        };

        const prefKey = typePreferences[notification.type];
        if (prefKey && !preferences[prefKey]) {
          return; // Don't show if type is disabled
        }

        set(state => {
          // Don't add if already exists
          if (state.notifications.some(n => n.id === notification.id)) {
            return state;
          }
          
          return {
            notifications: [notification, ...state.notifications],
            unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1
          };
        });
      },

      // Register push token
      registerPushToken: async (token: string) => {
        try {
          await api.notifications.registerPushToken(token);
        } catch (error: any) {
          console.error('Failed to register push token:', error);
        }
      },

      // Unregister push token
      unregisterPushToken: async (token: string) => {
        try {
          await api.notifications.unregisterPushToken(token);
        } catch (error: any) {
          console.error('Failed to unregister push token:', error);
        }
      },

      // Get notifications by type
      getNotificationsByType: (type: NotificationType) => {
        return get().notifications.filter(n => n.type === type);
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Reset store
      reset: () => set({
        notifications: [],
        unreadCount: 0,
        preferences: DEFAULT_PREFERENCES,
        cursor: null,
        hasMore: true,
        isLoading: false,
        isRefreshing: false,
        error: null
      })
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist notifications and preferences
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 100),
        unreadCount: state.unreadCount,
        preferences: state.preferences
      })
    }
  )
);
