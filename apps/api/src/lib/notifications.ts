/**
 * Notification Service
 * 
 * Handles sending notifications via various channels (email, push, in-app)
 */

import { Queue } from 'bullmq';
import { logger } from './logger';
import { sendEmail } from '../services/email';

type EmailTemplate = string;

/**
 * Notification types
 */
export type NotificationType =
  | 'application_received'
  | 'application_status_changed'
  | 'job_match_found'
  | 'mentorship_request'
  | 'mentorship_accepted'
  | 'mentorship_session_scheduled'
  | 'message_received'
  | 'profile_viewed'
  | 'account_security'
  | 'system_announcement';

/**
 * Notification channel
 */
export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms';

/**
 * Notification data
 */
export interface NotificationData {
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels?: NotificationChannel[];
  priority?: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
  
  // Per-type preferences
  types: Partial<Record<NotificationType, {
    enabled: boolean;
    channels: NotificationChannel[];
  }>>;
  
  // Quiet hours
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
    timezone: string;
  };
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  push: true,
  inApp: true,
  sms: false,
  types: {},
};

/**
 * Notification templates
 */
const NOTIFICATION_TEMPLATES: Record<NotificationType, {
  emailTemplate: EmailTemplate;
  pushTitle: (data: Record<string, unknown>) => string;
  pushBody: (data: Record<string, unknown>) => string;
}> = {
  application_received: {
    emailTemplate: 'application-received',
    pushTitle: () => 'Application Received!',
    pushBody: (data) => `Your application for ${data.jobTitle} has been submitted.`,
  },
  application_status_changed: {
    emailTemplate: 'application-status',
    pushTitle: () => 'Application Update',
    pushBody: (data) => `Your application status has been updated to ${data.status}.`,
  },
  job_match_found: {
    emailTemplate: 'job-match',
    pushTitle: () => 'New Job Match!',
    pushBody: (data) => `We found a job that matches your profile: ${data.jobTitle}`,
  },
  mentorship_request: {
    emailTemplate: 'mentorship-request',
    pushTitle: () => 'Mentorship Request',
    pushBody: (data) => `${data.menteeName} has requested mentorship.`,
  },
  mentorship_accepted: {
    emailTemplate: 'mentorship-accepted',
    pushTitle: () => 'Mentorship Accepted!',
    pushBody: (data) => `${data.mentorName} has accepted your mentorship request.`,
  },
  mentorship_session_scheduled: {
    emailTemplate: 'mentorship-session',
    pushTitle: () => 'Session Scheduled',
    pushBody: (data) => `Your mentorship session is scheduled for ${data.date}.`,
  },
  message_received: {
    emailTemplate: 'message-received',
    pushTitle: (data) => `New message from ${data.senderName}`,
    pushBody: (data) => String(data.preview || 'You have a new message'),
  },
  profile_viewed: {
    emailTemplate: 'profile-viewed',
    pushTitle: () => 'Profile Viewed',
    pushBody: (data) => `${data.viewerName} viewed your profile.`,
  },
  account_security: {
    emailTemplate: 'security-alert',
    pushTitle: () => 'Security Alert',
    pushBody: (data) => String(data.message || 'There was a security event on your account'),
  },
  system_announcement: {
    emailTemplate: 'announcement',
    pushTitle: (data) => String(data.title || 'Announcement'),
    pushBody: (data) => String(data.message || ''),
  },
};

/**
 * Notification service class
 */
class NotificationService {
  private queue: Queue | null = null;
  
  constructor() {
    this.initQueue();
  }
  
  private initQueue(): void {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger?.warn('Redis not configured, notifications will be sent synchronously');
      return;
    }
    
    try {
      this.queue = new Queue('notifications', {
        connection: { url: redisUrl },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      });
    } catch (error) {
      logger?.error('Failed to initialize notification queue:', error);
    }
  }
  
  /**
   * Send a notification
   */
  async send(notification: NotificationData): Promise<void> {
    const channels = notification.channels || ['email', 'in_app'];
    
    // Get user preferences
    const preferences = await this.getUserPreferences(notification.userId);
    
    // Filter channels based on preferences
    const enabledChannels = channels.filter(channel => {
      // Check global preference
      if (!preferences[channel === 'in_app' ? 'inApp' : channel]) {
        return false;
      }
      
      // Check type-specific preference
      const typePrefs = preferences.types[notification.type];
      if (typePrefs && !typePrefs.enabled) {
        return false;
      }
      if (typePrefs?.channels && !typePrefs.channels.includes(channel)) {
        return false;
      }
      
      return true;
    });
    
    // Check quiet hours
    if (await this.isInQuietHours(preferences)) {
      // Only send high priority notifications during quiet hours
      if (notification.priority !== 'high') {
        // Schedule for after quiet hours
        notification.scheduledFor = await this.getQuietHoursEnd(preferences);
      }
    }
    
    // Queue or send immediately
    if (this.queue) {
      await this.queue.add('send', {
        ...notification,
        channels: enabledChannels,
      }, {
        delay: notification.scheduledFor 
          ? notification.scheduledFor.getTime() - Date.now() 
          : undefined,
        priority: notification.priority === 'high' ? 1 : notification.priority === 'low' ? 10 : 5,
      });
    } else {
      await this.processNotification(notification, enabledChannels);
    }
  }
  
  /**
   * Process a notification (called by worker or directly)
   */
  async processNotification(
    notification: NotificationData,
    channels: NotificationChannel[]
  ): Promise<void> {
    const template = NOTIFICATION_TEMPLATES[notification.type];
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmail(notification, template);
            break;
          case 'push':
            await this.sendPush(notification, template);
            break;
          case 'in_app':
            await this.saveInApp(notification);
            break;
          case 'sms':
            await this.sendSms(notification);
            break;
        }
      } catch (error) {
        logger?.error(`Failed to send ${channel} notification:`, error);
      }
    }
  }
  
  /**
   * Send email notification
   */
  private async sendEmail(
    notification: NotificationData,
    template: typeof NOTIFICATION_TEMPLATES[NotificationType]
  ): Promise<void> {
    // Get user email
    const user = await this.getUser(notification.userId);
    if (!user?.email) return;
    
    await sendEmail({
      template: template.emailTemplate,
      to: user.email,
      subject: notification.title, // Assuming subject is required and can be title
      data: {
        userName: user.firstName,
        title: notification.title,
        message: notification.message,
        ...notification.data,
      }
    });
  }
  
  /**
   * Send push notification
   */
  private async sendPush(
    notification: NotificationData,
    template: typeof NOTIFICATION_TEMPLATES[NotificationType]
  ): Promise<void> {
    // Get user's push tokens
    const tokens = await this.getUserPushTokens(notification.userId);
    if (tokens.length === 0) return;
    
    const title = template.pushTitle(notification.data || {});
    const body = template.pushBody(notification.data || {});
    
    // In a real implementation, use Firebase Cloud Messaging or similar
    logger?.info(`Push notification to ${notification.userId}: ${title} - ${body}`);
  }
  
  /**
   * Save in-app notification
   */
  private async saveInApp(notification: NotificationData): Promise<void> {
    // In a real implementation, save to database
    logger?.info(`In-app notification for ${notification.userId}: ${notification.title}`);
  }
  
  /**
   * Send SMS notification
   */
  private async sendSms(notification: NotificationData): Promise<void> {
    // Get user phone
    const user = await this.getUser(notification.userId);
    if (!user?.phone) return;
    
    // In a real implementation, use Twilio or similar
    logger?.info(`SMS to ${user.phone}: ${notification.message}`);
  }
  
  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // In a real implementation, fetch from database
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
  
  /**
   * Get user details
   */
  private async getUser(userId: string): Promise<{
    email?: string;
    firstName?: string;
    phone?: string;
  } | null> {
    // In a real implementation, fetch from database
    return null;
  }
  
  /**
   * Get user's push tokens
   */
  private async getUserPushTokens(userId: string): Promise<string[]> {
    // In a real implementation, fetch from database
    return [];
  }
  
  /**
   * Check if current time is within quiet hours
   */
  private async isInQuietHours(preferences: NotificationPreferences): Promise<boolean> {
    if (!preferences.quietHours?.enabled) return false;
    
    // Implementation would check current time against quiet hours
    return false;
  }
  
  /**
   * Get end of quiet hours
   */
  private async getQuietHoursEnd(preferences: NotificationPreferences): Promise<Date> {
    // Implementation would calculate when quiet hours end
    return new Date();
  }
  
  /**
   * Bulk send notifications
   */
  async sendBulk(notifications: NotificationData[]): Promise<void> {
    await Promise.all(notifications.map(n => this.send(n)));
  }
  
  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: Omit<NotificationData, 'userId'>
  ): Promise<void> {
    await Promise.all(
      userIds.map(userId => this.send({ ...notification, userId }))
    );
  }
}

// Singleton instance
export const notificationService = new NotificationService();

/**
 * Convenience functions
 */
export const notify = {
  applicationReceived: (userId: string, jobTitle: string, companyName: string) =>
    notificationService.send({
      type: 'application_received',
      userId,
      title: 'Application Submitted',
      message: `Your application for ${jobTitle} at ${companyName} has been submitted.`,
      data: { jobTitle, companyName },
    }),
  
  applicationStatusChanged: (userId: string, jobTitle: string, status: string) =>
    notificationService.send({
      type: 'application_status_changed',
      userId,
      title: 'Application Status Update',
      message: `Your application for ${jobTitle} has been updated to: ${status}`,
      data: { jobTitle, status },
    }),
  
  mentorshipRequest: (mentorId: string, menteeName: string) =>
    notificationService.send({
      type: 'mentorship_request',
      userId: mentorId,
      title: 'New Mentorship Request',
      message: `${menteeName} has requested you as their mentor.`,
      data: { menteeName },
    }),
  
  securityAlert: (userId: string, message: string, priority: 'low' | 'normal' | 'high' = 'high') =>
    notificationService.send({
      type: 'account_security',
      userId,
      title: 'Security Alert',
      message,
      priority,
      channels: ['email', 'push', 'in_app'],
    }),
};

export default notificationService;

export {};
