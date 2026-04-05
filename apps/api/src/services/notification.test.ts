/**
 * Notification Service Tests
 * 
 * Unit tests for notification creation, delivery, and preferences.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../test/mocks/prisma';

// Mock services
vi.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));

// Mock notification service
const notificationService = {
  async createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    // Check user preferences
    const preferences = await prismaMock.notificationPreferences.findUnique({
      where: { userId },
    });

    // Check if this type is enabled
    const typeEnabled = preferences?.[`${type}Enabled`] ?? true;
    if (!typeEnabled) {
      return null; // User has disabled this notification type
    }

    const notification = await prismaMock.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
        read: false,
      },
    });

    // Queue push notification if enabled
    if (preferences?.pushEnabled !== false) {
      await this.queuePushNotification(userId, title, body, data);
    }

    // Queue email notification if enabled for this type
    if (preferences?.emailEnabled !== false && preferences?.[`${type}Email`] !== false) {
      await this.queueEmailNotification(userId, type, title, body, data);
    }

    return notification;
  },

  async queuePushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    // Get user's push tokens
    const tokens = await prismaMock.pushToken.findMany({
      where: { userId, active: true },
    });

    // Would queue to notification service (e.g., Firebase)
    return tokens.length;
  },

  async queueEmailNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    const user = await prismaMock.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    if (!user?.email) return false;

    // Would queue email to email service
    return true;
  },

  async getNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const skip = (page - 1) * limit;

    const notifications = await prismaMock.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prismaMock.notification.count({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
    });

    return {
      notifications,
      total,
      unreadCount: await this.getUnreadCount(userId),
    };
  },

  async getUnreadCount(userId: string) {
    return prismaMock.notification.count({
      where: { userId, read: false },
    });
  },

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prismaMock.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found');
    }

    return prismaMock.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
  },

  async markAllAsRead(userId: string) {
    const result = await prismaMock.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    return result.count;
  },

  async updatePreferences(userId: string, preferences: Record<string, boolean>) {
    return prismaMock.notificationPreferences.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences,
      },
    });
  },

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prismaMock.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found');
    }

    await prismaMock.notification.delete({
      where: { id: notificationId },
    });

    return true;
  },
};

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'job_match',
        title: 'New Job Match',
        body: 'A new job matches your preferences',
        data: null,
        read: false,
        createdAt: new Date(),
      };

      prismaMock.notificationPreferences.findUnique.mockResolvedValue(null);
      prismaMock.notification.create.mockResolvedValue(mockNotification);
      prismaMock.pushToken.findMany.mockResolvedValue([]);
      prismaMock.user.findUnique.mockResolvedValue({ email: 'test@example.com', name: 'Test' });

      const result = await notificationService.createNotification(
        'user-1',
        'job_match',
        'New Job Match',
        'A new job matches your preferences'
      );

      expect(result).toEqual(mockNotification);
      expect(prismaMock.notification.create).toHaveBeenCalled();
    });

    it('should not create notification if type is disabled', async () => {
      prismaMock.notificationPreferences.findUnique.mockResolvedValue({
        userId: 'user-1',
        job_matchEnabled: false,
      });

      const result = await notificationService.createNotification(
        'user-1',
        'job_match',
        'New Job Match',
        'A new job matches your preferences'
      );

      expect(result).toBeNull();
      expect(prismaMock.notification.create).not.toHaveBeenCalled();
    });

    it('should include custom data', async () => {
      prismaMock.notificationPreferences.findUnique.mockResolvedValue(null);
      prismaMock.notification.create.mockResolvedValue({
        id: 'notif-1',
        data: JSON.stringify({ jobId: 'job-123' }),
      });
      prismaMock.pushToken.findMany.mockResolvedValue([]);
      prismaMock.user.findUnique.mockResolvedValue({ email: 'test@example.com', name: 'Test' });

      await notificationService.createNotification(
        'user-1',
        'job_match',
        'New Job Match',
        'Body',
        { jobId: 'job-123' }
      );

      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          data: JSON.stringify({ jobId: 'job-123' }),
        }),
      });
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockNotifications = [
        { id: 'notif-1', title: 'Notification 1', read: false },
        { id: 'notif-2', title: 'Notification 2', read: true },
      ];

      prismaMock.notification.findMany.mockResolvedValue(mockNotifications);
      prismaMock.notification.count.mockResolvedValue(10);

      const result = await notificationService.getNotifications('user-1', 1, 20);

      expect(result.notifications).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it('should filter unread only', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);

      await notificationService.getNotifications('user-1', 1, 20, true);

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', read: false },
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        read: false,
      });
      prismaMock.notification.update.mockResolvedValue({
        id: 'notif-1',
        read: true,
        readAt: new Date(),
      });

      const result = await notificationService.markAsRead('notif-1', 'user-1');

      expect(result.read).toBe(true);
      expect(prismaMock.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { read: true, readAt: expect.any(Date) },
      });
    });

    it('should reject if notification belongs to other user', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
        read: false,
      });

      await expect(
        notificationService.markAsRead('notif-1', 'user-1')
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await notificationService.markAllAsRead('user-1');

      expect(result).toBe(5);
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', async () => {
      const newPreferences = {
        pushEnabled: true,
        emailEnabled: false,
        job_matchEnabled: true,
      };

      prismaMock.notificationPreferences.upsert.mockResolvedValue({
        userId: 'user-1',
        ...newPreferences,
      });

      const result = await notificationService.updatePreferences('user-1', newPreferences);

      expect(result).toEqual(expect.objectContaining(newPreferences));
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
      });
      prismaMock.notification.delete.mockResolvedValue({});

      const result = await notificationService.deleteNotification('notif-1', 'user-1');

      expect(result).toBe(true);
      expect(prismaMock.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
    });

    it('should reject deleting other user notification', async () => {
      prismaMock.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-2',
      });

      await expect(
        notificationService.deleteNotification('notif-1', 'user-1')
      ).rejects.toThrow('Notification not found');
    });
  });
});
