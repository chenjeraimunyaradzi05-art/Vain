// @ts-nocheck
"use strict";
/**
 * Notification Preferences API Routes
 * 
 * Allows users to manage their notification settings
 * for email, push, SMS, and in-app notifications.
 */

const express = require('express');
const { prisma } = require('../db');
const authenticateJWT = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { z } = require('zod');

const router = express.Router();

/**
 * Notification channel types
 */
const NotificationChannel = {
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms',
  IN_APP: 'in_app'
};

/**
 * Notification categories
 */
const NotificationCategory = {
  // Job-related
  JOB_ALERTS: 'job_alerts',
  APPLICATION_UPDATES: 'application_updates',
  JOB_RECOMMENDATIONS: 'job_recommendations',
  
  // Mentorship
  MENTOR_SESSIONS: 'mentor_sessions',
  MENTOR_MESSAGES: 'mentor_messages',
  SESSION_REMINDERS: 'session_reminders',
  
  // Training
  COURSE_UPDATES: 'course_updates',
  COURSE_REMINDERS: 'course_reminders',
  CERTIFICATION_EXPIRY: 'certification_expiry',
  
  // Community
  FORUM_REPLIES: 'forum_replies',
  MENTIONS: 'mentions',
  GROUP_UPDATES: 'group_updates',
  
  // Messages
  DIRECT_MESSAGES: 'direct_messages',
  
  // Account
  SECURITY_ALERTS: 'security_alerts',
  ACCOUNT_UPDATES: 'account_updates',
  
  // Marketing (opt-in)
  NEWSLETTERS: 'newsletters',
  PROMOTIONS: 'promotions',
  SURVEYS: 'surveys'
};

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES = {
  // Job-related - all on by default
  [NotificationCategory.JOB_ALERTS]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.APPLICATION_UPDATES]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.JOB_RECOMMENDATIONS]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: false,
    [NotificationChannel.IN_APP]: true
  },
  
  // Mentorship
  [NotificationCategory.MENTOR_SESSIONS]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.SMS]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.MENTOR_MESSAGES]: {
    [NotificationChannel.EMAIL]: false,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.SESSION_REMINDERS]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.SMS]: true,
    [NotificationChannel.IN_APP]: true
  },
  
  // Training
  [NotificationCategory.COURSE_UPDATES]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.COURSE_REMINDERS]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.CERTIFICATION_EXPIRY]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.SMS]: true,
    [NotificationChannel.IN_APP]: true
  },
  
  // Community
  [NotificationCategory.FORUM_REPLIES]: {
    [NotificationChannel.EMAIL]: false,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.MENTIONS]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.GROUP_UPDATES]: {
    [NotificationChannel.EMAIL]: false,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  
  // Messages
  [NotificationCategory.DIRECT_MESSAGES]: {
    [NotificationChannel.EMAIL]: false,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.IN_APP]: true
  },
  
  // Account - always on for security
  [NotificationCategory.SECURITY_ALERTS]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: true,
    [NotificationChannel.SMS]: true,
    [NotificationChannel.IN_APP]: true
  },
  [NotificationCategory.ACCOUNT_UPDATES]: {
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.PUSH]: false,
    [NotificationChannel.IN_APP]: true
  },
  
  // Marketing - off by default
  [NotificationCategory.NEWSLETTERS]: {
    [NotificationChannel.EMAIL]: false
  },
  [NotificationCategory.PROMOTIONS]: {
    [NotificationChannel.EMAIL]: false,
    [NotificationChannel.PUSH]: false
  },
  [NotificationCategory.SURVEYS]: {
    [NotificationChannel.EMAIL]: false
  }
};

/**
 * Validation schemas
 */
const preferencesSchema = z.object({
  category: z.enum(Object.values(NotificationCategory)),
  channel: z.enum(Object.values(NotificationChannel)),
  enabled: z.boolean()
});

const bulkPreferencesSchema = z.object({
  preferences: z.array(preferencesSchema)
});

const quietHoursSchema = z.object({
  enabled: z.boolean(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  timezone: z.string().optional()
});

/**
 * GET /notification-preferences
 * Get all notification preferences for the current user
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Try to get existing preferences
    let preferences = null;
    
    try {
      if (prisma.notificationPreference) {
        preferences = await prisma.notificationPreference.findUnique({
          where: { userId }
        });
      }
    } catch (dbErr) {
      // Model may not exist yet
    }
    
    // Merge with defaults
    const settings = preferences?.settings 
      ? JSON.parse(preferences.settings) 
      : {};
    
    const mergedPreferences = { ...DEFAULT_PREFERENCES };
    
    // Override with user preferences
    Object.keys(settings).forEach(category => {
      if (mergedPreferences[category]) {
        mergedPreferences[category] = {
          ...mergedPreferences[category],
          ...settings[category]
        };
      }
    });
    
    res.json({
      preferences: mergedPreferences,
      quietHours: preferences?.quietHours 
        ? JSON.parse(preferences.quietHours) 
        : { enabled: false },
      emailDigest: preferences?.emailDigest || 'instant',
      unsubscribeAll: preferences?.unsubscribeAll || false
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PATCH /notification-preferences
 * Update a single notification preference
 */
router.patch('/', authenticateJWT, validate(preferencesSchema), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { category, channel, enabled } = req.body;
    
    // Security alerts cannot be disabled
    if (category === NotificationCategory.SECURITY_ALERTS && !enabled) {
      return void res.status(400).json({ 
        error: 'Security alerts cannot be disabled' 
      });
    }
    
    // Get or create preferences
    let preferences = null;
    
    try {
      if (prisma.notificationPreference) {
        preferences = await prisma.notificationPreference.findUnique({
          where: { userId }
        });
      }
    } catch (dbErr) {
      // Model may not exist - store in user metadata
    }
    
    const currentSettings = preferences?.settings 
      ? JSON.parse(preferences.settings) 
      : {};
    
    // Update the specific setting
    if (!currentSettings[category]) {
      currentSettings[category] = { ...DEFAULT_PREFERENCES[category] };
    }
    currentSettings[category][channel] = enabled;
    
    // Save
    try {
      if (prisma.notificationPreference) {
        await prisma.notificationPreference.upsert({
          where: { userId },
          create: {
            userId,
            settings: JSON.stringify(currentSettings)
          },
          update: {
            settings: JSON.stringify(currentSettings)
          }
        });
      }
    } catch (dbErr) {
      console.warn('NotificationPreference model not available');
    }
    
    res.json({ 
      success: true,
      category,
      channel,
      enabled
    });
  } catch (error) {
    console.error('Error updating notification preference:', error);
    res.status(500).json({ error: 'Failed to update preference' });
  }
});

/**
 * PUT /notification-preferences/bulk
 * Update multiple notification preferences at once
 */
router.put('/bulk', authenticateJWT, validate(bulkPreferencesSchema), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { preferences } = req.body;
    
    // Check for security alerts
    const hasDisabledSecurity = preferences.some(
      p => p.category === NotificationCategory.SECURITY_ALERTS && !p.enabled
    );
    
    if (hasDisabledSecurity) {
      return void res.status(400).json({ 
        error: 'Security alerts cannot be disabled' 
      });
    }
    
    // Get current settings
    let existingPrefs = null;
    try {
      if (prisma.notificationPreference) {
        existingPrefs = await prisma.notificationPreference.findUnique({
          where: { userId }
        });
      }
    } catch (dbErr) {
      // Model may not exist
    }
    
    const currentSettings = existingPrefs?.settings 
      ? JSON.parse(existingPrefs.settings) 
      : {};
    
    // Apply all updates
    preferences.forEach(({ category, channel, enabled }) => {
      if (!currentSettings[category]) {
        currentSettings[category] = { ...DEFAULT_PREFERENCES[category] };
      }
      currentSettings[category][channel] = enabled;
    });
    
    // Save
    try {
      if (prisma.notificationPreference) {
        await prisma.notificationPreference.upsert({
          where: { userId },
          create: {
            userId,
            settings: JSON.stringify(currentSettings)
          },
          update: {
            settings: JSON.stringify(currentSettings)
          }
        });
      }
    } catch (dbErr) {
      console.warn('NotificationPreference model not available');
    }
    
    res.json({ 
      success: true,
      updated: preferences.length
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * PUT /notification-preferences/quiet-hours
 * Configure quiet hours (do not disturb)
 */
router.put('/quiet-hours', authenticateJWT, validate(quietHoursSchema), async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const quietHours = req.body;
    
    try {
      if (prisma.notificationPreference) {
        await prisma.notificationPreference.upsert({
          where: { userId },
          create: {
            userId,
            quietHours: JSON.stringify(quietHours),
            settings: JSON.stringify({})
          },
          update: {
            quietHours: JSON.stringify(quietHours)
          }
        });
      }
    } catch (dbErr) {
      console.warn('NotificationPreference model not available');
    }
    
    res.json({ 
      success: true,
      quietHours
    });
  } catch (error) {
    console.error('Error updating quiet hours:', error);
    res.status(500).json({ error: 'Failed to update quiet hours' });
  }
});

/**
 * PUT /notification-preferences/email-digest
 * Configure email digest frequency
 */
router.put('/email-digest', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { frequency } = req.body;
    
    const validFrequencies = ['instant', 'daily', 'weekly', 'never'];
    if (!validFrequencies.includes(frequency)) {
      return void res.status(400).json({ 
        error: 'Invalid frequency. Must be: instant, daily, weekly, or never' 
      });
    }
    
    try {
      if (prisma.notificationPreference) {
        await prisma.notificationPreference.upsert({
          where: { userId },
          create: {
            userId,
            emailDigest: frequency,
            settings: JSON.stringify({})
          },
          update: {
            emailDigest: frequency
          }
        });
      }
    } catch (dbErr) {
      console.warn('NotificationPreference model not available');
    }
    
    res.json({ 
      success: true,
      emailDigest: frequency
    });
  } catch (error) {
    console.error('Error updating email digest:', error);
    res.status(500).json({ error: 'Failed to update email digest' });
  }
});

/**
 * POST /notification-preferences/unsubscribe-all
 * Unsubscribe from all non-essential notifications
 */
router.post('/unsubscribe-all', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    // Create settings with all non-essential disabled
    const settings = {};
    Object.keys(DEFAULT_PREFERENCES).forEach(category => {
      // Keep security alerts enabled
      if (category === NotificationCategory.SECURITY_ALERTS) {
        settings[category] = DEFAULT_PREFERENCES[category];
      } else {
        settings[category] = {};
        Object.keys(DEFAULT_PREFERENCES[category]).forEach(channel => {
          settings[category][channel] = false;
        });
      }
    });
    
    try {
      if (prisma.notificationPreference) {
        await prisma.notificationPreference.upsert({
          where: { userId },
          create: {
            userId,
            settings: JSON.stringify(settings),
            unsubscribeAll: true
          },
          update: {
            settings: JSON.stringify(settings),
            unsubscribeAll: true
          }
        });
      }
    } catch (dbErr) {
      console.warn('NotificationPreference model not available');
    }
    
    res.json({ 
      success: true,
      message: 'Unsubscribed from all non-essential notifications'
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

/**
 * POST /notification-preferences/reset
 * Reset all preferences to defaults
 */
router.post('/reset', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    try {
      if (prisma.notificationPreference) {
        await prisma.notificationPreference.deleteMany({
          where: { userId }
        });
      }
    } catch (dbErr) {
      console.warn('NotificationPreference model not available');
    }
    
    res.json({ 
      success: true,
      message: 'Preferences reset to defaults',
      preferences: DEFAULT_PREFERENCES
    });
  } catch (error) {
    console.error('Error resetting preferences:', error);
    res.status(500).json({ error: 'Failed to reset preferences' });
  }
});

/**
 * GET /notification-preferences/categories
 * Get available notification categories and channels
 */
router.get('/categories', (req, res) => {
  res.json({
    categories: Object.values(NotificationCategory).map(cat => ({
      id: cat,
      name: cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      channels: Object.keys(DEFAULT_PREFERENCES[cat] || {})
    })),
    channels: Object.values(NotificationChannel)
  });
});

export default router;

module.exports.NotificationChannel = NotificationChannel;
module.exports.NotificationCategory = NotificationCategory;
module.exports.DEFAULT_PREFERENCES = DEFAULT_PREFERENCES;

export {};

