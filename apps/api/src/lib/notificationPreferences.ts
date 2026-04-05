// @ts-nocheck
'use strict';

/**
 * Enhanced Notification Preferences (Step 44)
 * 
 * Features:
 * - Per-notification-type channel selection
 * - Quiet hours configuration
 * - Digest email options
 * - Notification importance levels
 * - Snooze functionality
 */

const { prisma } = require('../db');

// Notification channels
const CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app'
};

// Notification types and their default channels
const NOTIFICATION_TYPES = {
  // Job-related
  JOB_ALERT: { name: 'New Job Matches', category: 'jobs', defaultChannels: ['email', 'push'], importance: 'normal' },
  APPLICATION_RECEIVED: { name: 'Application Received', category: 'jobs', defaultChannels: ['email'], importance: 'high' },
  APPLICATION_STATUS: { name: 'Application Status Update', category: 'jobs', defaultChannels: ['email', 'push', 'sms'], importance: 'high' },
  INTERVIEW_SCHEDULED: { name: 'Interview Scheduled', category: 'jobs', defaultChannels: ['email', 'sms', 'push'], importance: 'urgent' },
  INTERVIEW_REMINDER: { name: 'Interview Reminder', category: 'jobs', defaultChannels: ['email', 'sms', 'push'], importance: 'urgent' },
  
  // Mentorship
  SESSION_REMINDER: { name: 'Session Reminder', category: 'mentorship', defaultChannels: ['email', 'sms', 'push'], importance: 'urgent' },
  SESSION_BOOKING: { name: 'Session Booked', category: 'mentorship', defaultChannels: ['email', 'push'], importance: 'high' },
  MENTORSHIP_REQUEST: { name: 'Mentorship Request', category: 'mentorship', defaultChannels: ['email', 'push'], importance: 'high' },
  
  // Messages
  NEW_MESSAGE: { name: 'New Message', category: 'messaging', defaultChannels: ['push', 'in_app'], importance: 'normal' },
  MESSAGE_REACTION: { name: 'Message Reaction', category: 'messaging', defaultChannels: ['in_app'], importance: 'low' },
  
  // Courses
  COURSE_REMINDER: { name: 'Course Reminder', category: 'learning', defaultChannels: ['email', 'push'], importance: 'normal' },
  COURSE_COMPLETION: { name: 'Course Completed', category: 'learning', defaultChannels: ['email', 'push'], importance: 'normal' },
  
  // Community
  FORUM_REPLY: { name: 'Forum Reply', category: 'community', defaultChannels: ['email', 'in_app'], importance: 'low' },
  FORUM_MENTION: { name: 'Forum Mention', category: 'community', defaultChannels: ['push', 'in_app'], importance: 'normal' },
  CONNECTION_REQUEST: { name: 'Connection Request', category: 'community', defaultChannels: ['push', 'in_app'], importance: 'normal' },
  
  // Account
  SECURITY_ALERT: { name: 'Security Alert', category: 'account', defaultChannels: ['email', 'sms', 'push'], importance: 'urgent' },
  PASSWORD_CHANGED: { name: 'Password Changed', category: 'account', defaultChannels: ['email'], importance: 'high' },
  
  // System
  WEEKLY_DIGEST: { name: 'Weekly Digest', category: 'system', defaultChannels: ['email'], importance: 'low' },
  ANNOUNCEMENT: { name: 'Platform Announcement', category: 'system', defaultChannels: ['email', 'push'], importance: 'normal' }
};

// Importance levels and their behavior
const IMPORTANCE_LEVELS = {
  low: { bypassQuietHours: false, canSnooze: true, maxDelay: 24 * 60 * 60 * 1000 }, // 24 hours
  normal: { bypassQuietHours: false, canSnooze: true, maxDelay: 4 * 60 * 60 * 1000 }, // 4 hours
  high: { bypassQuietHours: false, canSnooze: true, maxDelay: 1 * 60 * 60 * 1000 }, // 1 hour
  urgent: { bypassQuietHours: true, canSnooze: false, maxDelay: 0 } // Immediate
};

// Default quiet hours (in user's timezone)
const DEFAULT_QUIET_HOURS = {
  enabled: false,
  startHour: 22, // 10 PM
  endHour: 7, // 7 AM
  days: [0, 1, 2, 3, 4, 5, 6] // All days
};

/**
 * Get user's notification preferences
 * @param {string} userId - User ID
 */
async function getPreferences(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true, timezone: true }
  });
  
  if (!user) return null;
  
  const savedPrefs = user.notificationPreferences 
    ? JSON.parse(user.notificationPreferences) 
    : {};
  
  // Merge with defaults
  const preferences = {
    channels: {},
    quietHours: { ...DEFAULT_QUIET_HOURS, ...savedPrefs.quietHours },
    digest: savedPrefs.digest || { enabled: true, frequency: 'weekly', day: 'monday' },
    snooze: savedPrefs.snooze || { active: false, until: null },
    timezone: user.timezone || 'Australia/Sydney'
  };
  
  // Build channel preferences for each notification type
  Object.entries(NOTIFICATION_TYPES).forEach(([type, config]) => {
    preferences.channels[type] = {
      ...config,
      enabledChannels: savedPrefs.channels?.[type]?.enabledChannels ?? config.defaultChannels,
      enabled: savedPrefs.channels?.[type]?.enabled ?? true
    };
  });
  
  return preferences;
}

/**
 * Update user's notification preferences
 * @param {string} userId - User ID
 * @param {object} updates - Preference updates
 */
async function updatePreferences(userId, updates) {
  const current = await getPreferences(userId);
  if (!current) throw new Error('User not found');
  
  // Deep merge updates
  const newPrefs = {
    channels: { ...current.channels },
    quietHours: { ...current.quietHours, ...updates.quietHours },
    digest: { ...current.digest, ...updates.digest },
    snooze: { ...current.snooze, ...updates.snooze },
    timezone: updates.timezone || current.timezone
  };
  
  // Update specific channel preferences
  if (updates.channels) {
    Object.entries(updates.channels).forEach(([type, channelUpdate]) => {
      if (newPrefs.channels[type]) {
        newPrefs.channels[type] = {
          ...newPrefs.channels[type],
          ...channelUpdate
        };
      }
    });
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { 
      notificationPreferences: JSON.stringify(newPrefs),
      timezone: updates.timezone || undefined
    }
  });
  
  return newPrefs;
}

/**
 * Check if notification should be sent based on preferences
 * @param {string} userId - User ID
 * @param {string} notificationType - Type of notification
 * @param {string} channel - Delivery channel
 */
async function shouldSendNotification(userId, notificationType, channel) {
  const prefs = await getPreferences(userId);
  if (!prefs) return false;
  
  const typeConfig = prefs.channels[notificationType];
  if (!typeConfig) return false;
  
  // Check if notification type is enabled
  if (!typeConfig.enabled) return false;
  
  // Check if channel is enabled for this type
  if (!typeConfig.enabledChannels.includes(channel)) return false;
  
  // Check snooze
  if (prefs.snooze.active && prefs.snooze.until) {
    const snoozeUntil = new Date(prefs.snooze.until);
    if (snoozeUntil > new Date()) {
      // Check if notification bypasses snooze
      const importance = NOTIFICATION_TYPES[notificationType]?.importance || 'normal';
      if (!IMPORTANCE_LEVELS[importance]?.bypassQuietHours) {
        return false;
      }
    }
  }
  
  // Check quiet hours
  if (prefs.quietHours.enabled && !isUrgent(notificationType)) {
    if (isQuietTime(prefs.quietHours, prefs.timezone)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if notification type is urgent
 */
function isUrgent(notificationType) {
  const config = NOTIFICATION_TYPES[notificationType];
  return config?.importance === 'urgent';
}

/**
 * Check if current time is within quiet hours
 */
function isQuietTime(quietHours, timezone) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
      weekday: 'short'
    });
    
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || 0);
    const dayName = parts.find(p => p.type === 'weekday')?.value?.toLowerCase();
    
    // Map day name to number
    const dayMap = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const dayNum = dayMap[dayName] ?? new Date().getDay();
    
    // Check if day is in quiet days
    if (!quietHours.days.includes(dayNum)) return false;
    
    // Check time range
    const { startHour, endHour } = quietHours;
    
    if (startHour < endHour) {
      // Same day range (e.g., 9-17)
      return hour >= startHour && hour < endHour;
    } else {
      // Overnight range (e.g., 22-7)
      return hour >= startHour || hour < endHour;
    }
  } catch (err) {
    console.error('Error checking quiet time:', err);
    return false;
  }
}

/**
 * Snooze notifications for a user
 * @param {string} userId - User ID
 * @param {number} durationMinutes - Duration in minutes
 */
async function snoozeNotifications(userId, durationMinutes) {
  const until = new Date(Date.now() + durationMinutes * 60 * 1000);
  
  await updatePreferences(userId, {
    snooze: {
      active: true,
      until: until.toISOString(),
      snoozedAt: new Date().toISOString()
    }
  });
  
  return { snoozedUntil: until };
}

/**
 * Cancel snooze
 * @param {string} userId - User ID
 */
async function cancelSnooze(userId) {
  await updatePreferences(userId, {
    snooze: {
      active: false,
      until: null
    }
  });
  
  return { success: true };
}

/**
 * Set quiet hours
 * @param {string} userId - User ID
 * @param {object} quietHours - Quiet hours configuration
 */
async function setQuietHours(userId, quietHours) {
  return updatePreferences(userId, { quietHours });
}

/**
 * Update channel preferences for a notification type
 * @param {string} userId - User ID
 * @param {string} notificationType - Notification type
 * @param {string[]} channels - Enabled channels
 */
async function setChannelPreferences(userId, notificationType, channels) {
  const validChannels = channels.filter(c => Object.values(CHANNELS).includes(c));
  
  return updatePreferences(userId, {
    channels: {
      [notificationType]: {
        enabledChannels: validChannels
      }
    }
  });
}

/**
 * Disable a notification type
 * @param {string} userId - User ID
 * @param {string} notificationType - Notification type
 */
async function disableNotificationType(userId, notificationType) {
  return updatePreferences(userId, {
    channels: {
      [notificationType]: {
        enabled: false
      }
    }
  });
}

/**
 * Enable a notification type
 * @param {string} userId - User ID
 * @param {string} notificationType - Notification type
 */
async function enableNotificationType(userId, notificationType) {
  return updatePreferences(userId, {
    channels: {
      [notificationType]: {
        enabled: true
      }
    }
  });
}

/**
 * Configure digest preferences
 * @param {string} userId - User ID
 * @param {object} digestConfig - Digest configuration
 */
async function setDigestPreferences(userId, digestConfig) {
  return updatePreferences(userId, { digest: digestConfig });
}

/**
 * Get all notification types grouped by category
 */
function getNotificationTypes() {
  const byCategory = {};
  
  Object.entries(NOTIFICATION_TYPES).forEach(([type, config]) => {
    if (!byCategory[config.category]) {
      byCategory[config.category] = [];
    }
    byCategory[config.category].push({
      type,
      ...config
    });
  });
  
  return byCategory;
}
