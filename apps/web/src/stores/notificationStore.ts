'use client';

/**
 * Notification Store
 * 
 * Manages notifications, preferences, and real-time updates.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/apiClient';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface NotificationPreference {
  category: string;
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreference[];
  isLoading: boolean;
  hasMore: boolean;
  lastFetch: number | null;
}

interface NotificationActions {
  loadNotifications: (page?: number) => Promise<void>;
  loadPreferences: () => Promise<void>;
  updatePreference: (category: string, channel: string, enabled: boolean) => Promise<boolean>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearAll: () => void;
  setUnreadCount: (count: number) => void;
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      // State
      notifications: [],
      unreadCount: 0,
      preferences: [],
      isLoading: false,
      hasMore: true,
      lastFetch: null,

      // Actions
      loadNotifications: async (page = 1) => {
        set({ isLoading: true });
        try {
          const { ok, data } = await api<{
            notifications: Notification[];
            total: number;
            unreadCount: number;
            hasMore: boolean;
          }>(`/notifications?page=${page}&limit=20`);

          if (ok && data) {
            set((state) => ({
              notifications: page === 1 
                ? data.notifications 
                : [...state.notifications, ...data.notifications],
              unreadCount: data.unreadCount,
              hasMore: data.hasMore,
              lastFetch: Date.now(),
              isLoading: false,
            }));
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.error('Failed to load notifications:', err);
          set({ isLoading: false });
        }
      },

      loadPreferences: async () => {
        try {
          const { ok, data } = await api<{ preferences: NotificationPreference[] }>('/notification-preferences');
          if (ok && data) {
            set({ preferences: data.preferences || [] });
          }
        } catch (err) {
          console.error('Failed to load notification preferences:', err);
        }
      },

      updatePreference: async (category, channel, enabled) => {
        try {
          const { ok } = await api('/notification-preferences', {
            method: 'PATCH',
            body: { category, channel, enabled },
          });

          if (ok) {
            set((state) => ({
              preferences: state.preferences.map((p) =>
                p.category === category
                  ? { ...p, [channel]: enabled }
                  : p
              ),
            }));
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to update notification preference:', err);
          return false;
        }
      },

      markAsRead: async (id) => {
        try {
          const { ok } = await api(`/notifications/${id}/read`, { method: 'POST' });
          if (ok) {
            set((state) => ({
              notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, isRead: true } : n
              ),
              unreadCount: Math.max(0, state.unreadCount - 1),
            }));
          }
        } catch (err) {
          console.error('Failed to mark notification as read:', err);
        }
      },

      markAllAsRead: async () => {
        try {
          const { ok } = await api('/notifications/read-all', { method: 'POST' });
          if (ok) {
            set((state) => ({
              notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
              unreadCount: 0,
            }));
          }
        } catch (err) {
          console.error('Failed to mark all notifications as read:', err);
        }
      },

      deleteNotification: async (id) => {
        try {
          const { ok } = await api(`/notifications/${id}`, { method: 'DELETE' });
          if (ok) {
            set((state) => {
              const notification = state.notifications.find((n) => n.id === id);
              return {
                notifications: state.notifications.filter((n) => n.id !== id),
                unreadCount: notification && !notification.isRead
                  ? Math.max(0, state.unreadCount - 1)
                  : state.unreadCount,
              };
            });
          }
        } catch (err) {
          console.error('Failed to delete notification:', err);
        }
      },

      addNotification: (notification) => {
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
        }));
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      setUnreadCount: (count) => {
        set({ unreadCount: count });
      },
    }),
    {
      name: 'ngurra-notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        lastFetch: state.lastFetch,
      }),
    }
  )
);
