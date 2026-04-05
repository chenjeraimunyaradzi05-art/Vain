'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/apiBase';

/**
 * Notification Preferences Hook
 * 
 * Manages user notification preferences.
 */
export function useNotificationPreferences(token) {
  const [preferences, setPreferences] = useState(null);
  const [quietHours, setQuietHours] = useState({ enabled: false });
  const [emailDigest, setEmailDigest] = useState('instant');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/notification-preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setQuietHours(data.quietHours);
      setEmailDigest(data.emailDigest);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Update a single preference
  const updatePreference = async (category, channel, enabled) => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/notification-preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ category, channel, enabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preference');
      }

      // Update local state
      setPreferences(prev => ({
        ...prev,
        [category]: {
          ...prev?.[category],
          [channel]: enabled,
        },
      }));

      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Update quiet hours
  const updateQuietHours = async (settings) => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/notification-preferences/quiet-hours`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update quiet hours');
      }

      setQuietHours(settings);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Update email digest frequency
  const updateEmailDigest = async (frequency) => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/notification-preferences/email-digest`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ frequency }),
      });

      if (!response.ok) {
        throw new Error('Failed to update email digest');
      }

      setEmailDigest(frequency);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Unsubscribe from all
  const unsubscribeAll = async () => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/notification-preferences/unsubscribe-all`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unsubscribe');
      }

      // Refetch preferences
      await fetchPreferences();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/notification-preferences/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reset preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
      setQuietHours({ enabled: false });
      setEmailDigest('instant');
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  return {
    preferences,
    quietHours,
    emailDigest,
    loading,
    error,
    updatePreference,
    updateQuietHours,
    updateEmailDigest,
    unsubscribeAll,
    resetToDefaults,
    refetch: fetchPreferences,
  };
}

/**
 * Notification preference categories with display names
 */
export const PREFERENCE_CATEGORIES = {
  job_alerts: {
    name: 'Job Alerts',
    description: 'New jobs matching your preferences',
    icon: 'Briefcase',
  },
  application_updates: {
    name: 'Application Updates',
    description: 'Status changes on your applications',
    icon: 'FileCheck',
  },
  job_recommendations: {
    name: 'Job Recommendations',
    description: 'Personalized job suggestions',
    icon: 'Star',
  },
  mentor_sessions: {
    name: 'Mentor Sessions',
    description: 'Session bookings and confirmations',
    icon: 'Users',
  },
  mentor_messages: {
    name: 'Mentor Messages',
    description: 'Messages from your mentor',
    icon: 'MessageCircle',
  },
  session_reminders: {
    name: 'Session Reminders',
    description: 'Upcoming session notifications',
    icon: 'Clock',
  },
  course_updates: {
    name: 'Course Updates',
    description: 'Updates to enrolled courses',
    icon: 'BookOpen',
  },
  course_reminders: {
    name: 'Course Reminders',
    description: 'Assignment and deadline reminders',
    icon: 'Bell',
  },
  certification_expiry: {
    name: 'Certification Expiry',
    description: 'Expiring certifications',
    icon: 'Award',
  },
  forum_replies: {
    name: 'Forum Replies',
    description: 'Replies to your forum posts',
    icon: 'MessageSquare',
  },
  mentions: {
    name: 'Mentions',
    description: 'When someone mentions you',
    icon: 'AtSign',
  },
  group_updates: {
    name: 'Group Updates',
    description: 'Activity in your groups',
    icon: 'UsersRound',
  },
  direct_messages: {
    name: 'Direct Messages',
    description: 'Private messages',
    icon: 'Mail',
  },
  security_alerts: {
    name: 'Security Alerts',
    description: 'Account security notifications',
    icon: 'Shield',
    required: true,
  },
  account_updates: {
    name: 'Account Updates',
    description: 'Important account information',
    icon: 'User',
  },
  newsletters: {
    name: 'Newsletters',
    description: 'Platform news and updates',
    icon: 'Newspaper',
  },
  promotions: {
    name: 'Promotions',
    description: 'Special offers and discounts',
    icon: 'Tag',
  },
  surveys: {
    name: 'Surveys',
    description: 'Feedback requests',
    icon: 'ClipboardList',
  },
};

/**
 * Notification channels with display info
 */
export const NOTIFICATION_CHANNELS = {
  email: {
    name: 'Email',
    description: 'Receive via email',
    icon: 'Mail',
  },
  push: {
    name: 'Push',
    description: 'Browser/mobile push notifications',
    icon: 'Bell',
  },
  sms: {
    name: 'SMS',
    description: 'Text messages',
    icon: 'Phone',
  },
  in_app: {
    name: 'In-App',
    description: 'Notifications in the app',
    icon: 'BellRing',
  },
};

export default useNotificationPreferences;
