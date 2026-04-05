/**
 * Notification Service
 * 
 * Handles all notification-related operations including:
 * - Push notifications
 * - Email notifications
 * - In-app notifications
 * - Notification preferences
 * - Notification scheduling
 */

import { prisma } from '../lib/database';
import { redisCache } from '../lib/redisCacheWrapper';
import { randomUUID } from 'crypto';
import { emitNotification } from '../lib/socket';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'JOB_MATCH'
  | 'JOB_APPLICATION_UPDATE'
  | 'JOB_APPLICATION_VIEWED'
  | 'INTERVIEW_SCHEDULED'
  | 'OFFER_RECEIVED'
  | 'MENTORSHIP_REQUEST'
  | 'MENTORSHIP_SESSION'
  | 'MESSAGE_RECEIVED'
  | 'CONNECTION_REQUEST'
  | 'CONNECTION_ACCEPTED'
  | 'EVENT_REMINDER'
  | 'EVENT_INVITATION'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'LEVEL_UP'
  | 'REFERRAL_SIGNUP'
  | 'REFERRAL_REWARD'
  | 'CULTURAL_EVENT'
  | 'COMMUNITY_UPDATE'
  | 'SYSTEM_ANNOUNCEMENT';

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH' | 'SMS';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
  channels?: NotificationChannel[];
  scheduledFor?: Date;
  expiresAt?: Date;
  groupKey?: string;
  actionUrl?: string;
  imageUrl?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: NotificationPriority;
  isRead: boolean;
  isArchived: boolean;
  actionUrl?: string;
  imageUrl?: string;
  groupKey?: string;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  types: {
    [key in NotificationType]?: {
      enabled: boolean;
      channels: NotificationChannel[];
    };
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;   // HH:mm
    timezone: string;
  };
  digest: {
    enabled: boolean;
    frequency: 'DAILY' | 'WEEKLY' | 'NEVER';
    time: string; // HH:mm
  };
}

export interface NotificationGroup {
  groupKey: string;
  count: number;
  latestNotification: Notification;
  notifications: Notification[];
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  lastRead?: Date;
}

// ============================================================================
// Configuration
// ============================================================================

export const NOTIFICATION_CONFIG: Record<NotificationType, {
  icon: string;
  color: string;
  defaultPriority: NotificationPriority;
  defaultChannels: NotificationChannel[];
  groupable: boolean;
  expiresInDays?: number;
}> = {
  JOB_MATCH: {
    icon: '💼',
    color: '#3B82F6',
    defaultPriority: 'MEDIUM',
    defaultChannels: ['IN_APP', 'EMAIL'],
    groupable: true,
  },
  JOB_APPLICATION_UPDATE: {
    icon: '📋',
    color: '#10B981',
    defaultPriority: 'HIGH',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    groupable: false,
  },
  JOB_APPLICATION_VIEWED: {
    icon: '👁️',
    color: '#8B5CF6',
    defaultPriority: 'LOW',
    defaultChannels: ['IN_APP'],
    groupable: true,
  },
  INTERVIEW_SCHEDULED: {
    icon: '📅',
    color: '#F59E0B',
    defaultPriority: 'URGENT',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH', 'SMS'],
    groupable: false,
  },
  OFFER_RECEIVED: {
    icon: '🎉',
    color: '#10B981',
    defaultPriority: 'URGENT',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH', 'SMS'],
    groupable: false,
  },
  MENTORSHIP_REQUEST: {
    icon: '🎓',
    color: '#8B5CF6',
    defaultPriority: 'MEDIUM',
    defaultChannels: ['IN_APP', 'EMAIL'],
    groupable: false,
  },
  MENTORSHIP_SESSION: {
    icon: '📚',
    color: '#8B5CF6',
    defaultPriority: 'HIGH',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    groupable: false,
  },
  MESSAGE_RECEIVED: {
    icon: '💬',
    color: '#3B82F6',
    defaultPriority: 'MEDIUM',
    defaultChannels: ['IN_APP', 'PUSH'],
    groupable: true,
  },
  CONNECTION_REQUEST: {
    icon: '🤝',
    color: '#10B981',
    defaultPriority: 'LOW',
    defaultChannels: ['IN_APP'],
    groupable: true,
  },
  CONNECTION_ACCEPTED: {
    icon: '✅',
    color: '#10B981',
    defaultPriority: 'LOW',
    defaultChannels: ['IN_APP'],
    groupable: true,
  },
  EVENT_REMINDER: {
    icon: '⏰',
    color: '#F59E0B',
    defaultPriority: 'HIGH',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
    groupable: false,
    expiresInDays: 1,
  },
  EVENT_INVITATION: {
    icon: '📨',
    color: '#EC4899',
    defaultPriority: 'MEDIUM',
    defaultChannels: ['IN_APP', 'EMAIL'],
    groupable: true,
  },
  ACHIEVEMENT_UNLOCKED: {
    icon: '🏆',
    color: '#F59E0B',
    defaultPriority: 'MEDIUM',
    defaultChannels: ['IN_APP', 'PUSH'],
    groupable: false,
  },
  LEVEL_UP: {
    icon: '⬆️',
    color: '#10B981',
    defaultPriority: 'MEDIUM',
    defaultChannels: ['IN_APP', 'PUSH'],
    groupable: false,
  },
  REFERRAL_SIGNUP: {
    icon: '👋',
    color: '#3B82F6',
    defaultPriority: 'LOW',
    defaultChannels: ['IN_APP'],
    groupable: true,
  },
  REFERRAL_REWARD: {
    icon: '🎁',
    color: '#10B981',
    defaultPriority: 'MEDIUM',
    defaultChannels: ['IN_APP', 'PUSH'],
    groupable: false,
  },
  CULTURAL_EVENT: {
    icon: '🌏',
    color: '#F59E0B',
    defaultPriority: 'MEDIUM',
    defaultChannels: ['IN_APP', 'EMAIL'],
    groupable: false,
  },
  COMMUNITY_UPDATE: {
    icon: '📢',
    color: '#6366F1',
    defaultPriority: 'LOW',
    defaultChannels: ['IN_APP'],
    groupable: true,
  },
  SYSTEM_ANNOUNCEMENT: {
    icon: '📣',
    color: '#EF4444',
    defaultPriority: 'HIGH',
    defaultChannels: ['IN_APP', 'EMAIL'],
    groupable: false,
  },
};

// ============================================================================
// Service Implementation
// ============================================================================

class NotificationService {
  private cachePrefix = 'notification:';
  private cacheTTL = 300; // 5 minutes

  // -------------------------------------------------------------------------
  // Core Notification Methods
  // -------------------------------------------------------------------------

  /**
   * Send a notification to a user
   */
  async send(payload: NotificationPayload): Promise<Notification> {
    const config = NOTIFICATION_CONFIG[payload.type];
    
    const notification: Notification = {
      id: randomUUID(),
      userId: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      priority: payload.priority || config.defaultPriority,
      isRead: false,
      isArchived: false,
      actionUrl: payload.actionUrl,
      imageUrl: payload.imageUrl,
      groupKey: payload.groupKey,
      createdAt: new Date(),
      expiresAt: payload.expiresAt || (config.expiresInDays 
        ? new Date(Date.now() + config.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined),
    };

    // Check user preferences
    const preferences = await this.getPreferences(payload.userId);
    const typePrefs = preferences?.types?.[payload.type];
    
    if (typePrefs && !typePrefs.enabled) {
      console.log(`Notification ${payload.type} disabled for user ${payload.userId}`);
      return notification;
    }

    // Check quiet hours
    if (preferences?.quietHours?.enabled && this.isQuietHours(preferences.quietHours)) {
      // Schedule for after quiet hours
      console.log(`User ${payload.userId} in quiet hours, scheduling notification`);
    }

    // Determine channels
    const channels = payload.channels 
      || typePrefs?.channels 
      || config.defaultChannels;

    // Store in-app notification
    if (channels.includes('IN_APP')) {
      await this.storeNotification(notification);
      
      // Emit real-time notification via Socket.io
      emitNotification(payload.userId, {
        type: payload.type,
        title: notification.title,
        message: notification.body,
        data: notification.data as Record<string, any>,
        actionUrl: notification.actionUrl,
      });
    }

    // Send to other channels
    if (channels.includes('EMAIL')) {
      await this.sendEmail(notification);
    }

    if (channels.includes('PUSH')) {
      await this.sendPush(notification);
    }

    if (channels.includes('SMS')) {
      await this.sendSMS(notification);
    }

    // Invalidate cache
    await this.invalidateCache(payload.userId);

    return notification;
  }

  /**
   * Send multiple notifications
   */
  async sendBulk(payloads: NotificationPayload[]): Promise<Notification[]> {
    const results = await Promise.all(
      payloads.map(payload => this.send(payload))
    );
    return results;
  }

  /**
   * Schedule a notification for later
   */
  async schedule(payload: NotificationPayload, sendAt: Date): Promise<{ notificationId: string; scheduledFor: Date }> {
    const notificationId = randomUUID();
    
    // Store scheduled notification
    await redisCache.set(
      `${this.cachePrefix}scheduled:${notificationId}`,
      JSON.stringify({ ...payload, sendAt }),
      Math.ceil((sendAt.getTime() - Date.now()) / 1000) + 3600 // TTL + 1 hour buffer
    );

    return { notificationId, scheduledFor: sendAt };
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelScheduled(notificationId: string): Promise<boolean> {
    await redisCache.del(`${this.cachePrefix}scheduled:${notificationId}`);
    return true;
  }

  // -------------------------------------------------------------------------
  // Notification Retrieval
  // -------------------------------------------------------------------------

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
      priority?: NotificationPriority;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number; unread: number }> {
    const { limit = 20, offset = 0, unreadOnly = false, types, priority } = options;

    // Check cache for recent notifications
    const cacheKey = `${this.cachePrefix}user:${userId}:list:${JSON.stringify(options)}`;
    const cached = await redisCache.get<string>(cacheKey);
    if (cached && typeof cached === 'string') {
      return JSON.parse(cached);
    }

    // Mock data for now - in production, query database
    const allNotifications: Notification[] = [
      {
        id: '1',
        userId,
        type: 'JOB_APPLICATION_UPDATE',
        title: 'Application Update',
        body: 'Your application for Senior Engineer at BHP has been shortlisted!',
        data: { jobId: 'job1', applicationId: 'app1' },
        priority: 'HIGH',
        isRead: false,
        isArchived: false,
        actionUrl: '/member/applications',
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: '2',
        userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        title: 'Achievement Unlocked! 🏆',
        body: 'You earned the "Rising Star" badge!',
        data: { achievementId: 'rising_star' },
        priority: 'MEDIUM',
        isRead: false,
        isArchived: false,
        actionUrl: '/member/achievements',
        createdAt: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        id: '3',
        userId,
        type: 'MESSAGE_RECEIVED',
        title: 'New Message',
        body: 'Sarah Mitchell from BHP sent you a message',
        data: { conversationId: 'conv1', senderId: 'user1' },
        priority: 'MEDIUM',
        isRead: true,
        isArchived: false,
        actionUrl: '/member/messages',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
      },
      {
        id: '4',
        userId,
        type: 'JOB_MATCH',
        title: 'New Job Matches',
        body: '5 new jobs match your profile!',
        data: { matchCount: 5 },
        priority: 'MEDIUM',
        isRead: true,
        isArchived: false,
        actionUrl: '/member/jobs',
        groupKey: 'job_matches',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
      },
    ];

    let filtered = allNotifications;

    if (unreadOnly) {
      filtered = filtered.filter(n => !n.isRead);
    }

    if (types && types.length > 0) {
      filtered = filtered.filter(n => types.includes(n.type));
    }

    if (priority) {
      filtered = filtered.filter(n => n.priority === priority);
    }

    const total = filtered.length;
    const unread = filtered.filter(n => !n.isRead).length;
    const notifications = filtered.slice(offset, offset + limit);

    const result = { notifications, total, unread };

    // Cache results
    await redisCache.set(cacheKey, JSON.stringify(result), this.cacheTTL);

    return result;
  }

  /**
   * Get grouped notifications
   */
  async getGroupedNotifications(userId: string): Promise<NotificationGroup[]> {
    const { notifications } = await this.getNotifications(userId, { limit: 100 });

    const groups = new Map<string, NotificationGroup>();

    for (const notification of notifications) {
      const key = notification.groupKey || notification.id;
      
      if (!groups.has(key)) {
        groups.set(key, {
          groupKey: key,
          count: 0,
          latestNotification: notification,
          notifications: [],
        });
      }

      const group = groups.get(key)!;
      group.count++;
      group.notifications.push(notification);
      
      if (notification.createdAt > group.latestNotification.createdAt) {
        group.latestNotification = notification;
      }
    }

    return Array.from(groups.values())
      .sort((a, b) => b.latestNotification.createdAt.getTime() - a.latestNotification.createdAt.getTime());
  }

  /**
   * Get notification statistics
   */
  async getStats(userId: string): Promise<NotificationStats> {
    const { notifications, total, unread } = await this.getNotifications(userId, { limit: 1000 });

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    for (const notification of notifications) {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      byPriority[notification.priority] = (byPriority[notification.priority] || 0) + 1;
    }

    const readNotifications = notifications.filter(n => n.isRead && n.readAt);
    const lastRead = readNotifications.length > 0
      ? readNotifications.reduce((latest, n) => 
          n.readAt! > latest ? n.readAt! : latest, 
          readNotifications[0].readAt!
        )
      : undefined;

    return {
      total,
      unread,
      byType: byType as Record<NotificationType, number>,
      byPriority: byPriority as Record<NotificationPriority, number>,
      lastRead,
    };
  }

  // -------------------------------------------------------------------------
  // Notification Actions
  // -------------------------------------------------------------------------

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    // In production, update database
    console.log(`Marking notification ${notificationId} as read for user ${userId}`);
    await this.invalidateCache(userId);
    return true;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    // In production, update database
    console.log(`Marking all notifications as read for user ${userId}`);
    await this.invalidateCache(userId);
    return 10; // Return count of updated notifications
  }

  /**
   * Archive a notification
   */
  async archive(userId: string, notificationId: string): Promise<boolean> {
    console.log(`Archiving notification ${notificationId} for user ${userId}`);
    await this.invalidateCache(userId);
    return true;
  }

  /**
   * Delete a notification
   */
  async delete(userId: string, notificationId: string): Promise<boolean> {
    console.log(`Deleting notification ${notificationId} for user ${userId}`);
    await this.invalidateCache(userId);
    return true;
  }

  /**
   * Delete all notifications
   */
  async deleteAll(userId: string, options?: { olderThan?: Date; archived?: boolean }): Promise<number> {
    console.log(`Deleting notifications for user ${userId}`, options);
    await this.invalidateCache(userId);
    return 50;
  }

  // -------------------------------------------------------------------------
  // Preferences Management
  // -------------------------------------------------------------------------

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const cacheKey = `${this.cachePrefix}preferences:${userId}`;
    const cached = await redisCache.get<string>(cacheKey);
    
    if (cached && typeof cached === 'string') {
      return JSON.parse(cached);
    }

    // Default preferences
    const defaults: NotificationPreferences = {
      userId,
      channels: {
        inApp: true,
        email: true,
        push: true,
        sms: false,
      },
      types: {},
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'Australia/Sydney',
      },
      digest: {
        enabled: true,
        frequency: 'DAILY',
        time: '09:00',
      },
    };

    // In production, fetch from database and merge with defaults
    await redisCache.set(cacheKey, JSON.stringify(defaults), 3600);

    return defaults;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string, 
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...updates };

    // In production, save to database
    const cacheKey = `${this.cachePrefix}preferences:${userId}`;
    await redisCache.set(cacheKey, JSON.stringify(updated), 3600);

    return updated;
  }

  /**
   * Register device for push notifications
   */
  async registerDevice(
    userId: string,
    deviceToken: string,
    platform: 'IOS' | 'ANDROID' | 'WEB'
  ): Promise<boolean> {
    // In production, store device token
    console.log(`Registering device for user ${userId}: ${platform} - ${deviceToken.slice(0, 10)}...`);
    return true;
  }

  /**
   * Unregister device
   */
  async unregisterDevice(userId: string, deviceToken: string): Promise<boolean> {
    console.log(`Unregistering device for user ${userId}: ${deviceToken.slice(0, 10)}...`);
    return true;
  }

  // -------------------------------------------------------------------------
  // Template Notifications
  // -------------------------------------------------------------------------

  /**
   * Send job match notification
   */
  async notifyJobMatch(userId: string, jobId: string, jobTitle: string, company: string, matchScore: number): Promise<Notification> {
    return this.send({
      userId,
      type: 'JOB_MATCH',
      title: 'New Job Match!',
      body: `${jobTitle} at ${company} is a ${matchScore}% match for you`,
      data: { jobId, matchScore },
      actionUrl: `/member/jobs/${jobId}`,
      groupKey: 'job_matches',
    });
  }

  /**
   * Send application status update
   */
  async notifyApplicationUpdate(
    userId: string, 
    applicationId: string, 
    jobTitle: string, 
    status: string
  ): Promise<Notification> {
    const messages: Record<string, string> = {
      VIEWED: 'Your application was viewed',
      SHORTLISTED: 'Congratulations! You\'ve been shortlisted',
      INTERVIEW: 'An interview has been scheduled',
      OFFER: 'You\'ve received a job offer!',
      REJECTED: 'Your application was not selected',
    };

    return this.send({
      userId,
      type: status === 'OFFER' ? 'OFFER_RECEIVED' : 'JOB_APPLICATION_UPDATE',
      title: status === 'OFFER' ? '🎉 Job Offer!' : 'Application Update',
      body: `${messages[status] || 'Status updated'} for ${jobTitle}`,
      data: { applicationId, status },
      actionUrl: '/member/applications',
      priority: status === 'OFFER' || status === 'INTERVIEW' ? 'URGENT' : 'HIGH',
    });
  }

  /**
   * Send interview reminder
   */
  async notifyInterviewReminder(
    userId: string,
    applicationId: string,
    jobTitle: string,
    company: string,
    interviewDate: Date
  ): Promise<Notification> {
    return this.send({
      userId,
      type: 'INTERVIEW_SCHEDULED',
      title: 'Interview Reminder',
      body: `Your interview with ${company} for ${jobTitle} is coming up`,
      data: { applicationId, interviewDate: interviewDate.toISOString() },
      actionUrl: '/member/applications',
      priority: 'URGENT',
    });
  }

  /**
   * Send achievement notification
   */
  async notifyAchievement(userId: string, achievementId: string, achievementName: string, points: number): Promise<Notification> {
    return this.send({
      userId,
      type: 'ACHIEVEMENT_UNLOCKED',
      title: 'Achievement Unlocked! 🏆',
      body: `You earned "${achievementName}" (+${points} points)`,
      data: { achievementId, points },
      actionUrl: '/member/achievements',
    });
  }

  /**
   * Send level up notification
   */
  async notifyLevelUp(userId: string, level: number, levelName: string): Promise<Notification> {
    return this.send({
      userId,
      type: 'LEVEL_UP',
      title: 'Level Up! ⬆️',
      body: `Congratulations! You've reached Level ${level}: ${levelName}`,
      data: { level, levelName },
      actionUrl: '/member/achievements',
    });
  }

  /**
   * Send message notification
   */
  async notifyMessage(userId: string, senderId: string, senderName: string, preview: string): Promise<Notification> {
    return this.send({
      userId,
      type: 'MESSAGE_RECEIVED',
      title: `Message from ${senderName}`,
      body: preview.length > 50 ? preview.slice(0, 50) + '...' : preview,
      data: { senderId },
      actionUrl: '/member/messages',
      groupKey: `messages_${senderId}`,
    });
  }

  /**
   * Send cultural event notification
   */
  async notifyCulturalEvent(userId: string, eventId: string, eventName: string, date: Date): Promise<Notification> {
    return this.send({
      userId,
      type: 'CULTURAL_EVENT',
      title: '🌏 Cultural Event',
      body: `${eventName} is coming up on ${date.toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' })}`,
      data: { eventId },
      actionUrl: `/member/events/${eventId}`,
    });
  }

  // -------------------------------------------------------------------------
  // Private Helper Methods
  // -------------------------------------------------------------------------

  private async storeNotification(notification: Notification): Promise<void> {
    // In production, store in database
    console.log(`Storing notification: ${notification.id}`);
  }

  private async sendEmail(notification: Notification): Promise<void> {
    // In production, queue email
    console.log(`Queuing email notification: ${notification.id}`);
  }

  private async sendPush(notification: Notification): Promise<void> {
    // In production, send push via FCM/APNS
    console.log(`Sending push notification: ${notification.id}`);
  }

  private async sendSMS(notification: Notification): Promise<void> {
    // In production, send SMS via Twilio/etc
    console.log(`Sending SMS notification: ${notification.id}`);
  }

  private isQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    const now = new Date();
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  private async invalidateCache(userId: string): Promise<void> {
    // Invalidate all notification caches for user
    await redisCache.del(`${this.cachePrefix}user:${userId}:*`);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export type { NotificationService };

