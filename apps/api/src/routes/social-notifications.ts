// @ts-nocheck
/**
 * Social Notifications Routes
 * Handles in-app notifications for social features
 */
import express from 'express';
import { prisma } from '../db';
import authenticateJWT from '../middleware/auth';

const router = express.Router();

// Notification categories for organization
const NOTIFICATION_CATEGORIES = [
  'content',      // Posts, comments, reactions on your content
  'connection',   // Connection requests, follows
  'message',      // Direct messages
  'group',        // Group activities
  'organization', // Org updates
  'job',          // Job-related notifications
  'safety',       // Safety alerts
  'system'        // System notifications
];

// =============================================================================
// NOTIFICATIONS
// =============================================================================

/**
 * GET /social-notifications - Get user's social notifications
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      category, 
      unreadOnly = 'false', 
      page = 1, 
      limit = 30 
    } = req.query;

    const where: any = { userId };
    if (category) where.category = category;
    if (unreadOnly === 'true') where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.socialNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.socialNotification.count({ where }),
      prisma.socialNotification.count({ where: { userId, isRead: false } })
    ]);

    res.json({ notifications, total, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /social-notifications/unread-count - Get count of unread notifications
 */
router.get('/unread-count', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.query;

    const where: any = { userId, isRead: false };
    if (category) where.category = category;

    const count = await prisma.socialNotification.count({ where });

    // Also get breakdown by category
    const breakdown = await prisma.socialNotification.groupBy({
      by: ['category'],
      where: { userId, isRead: false },
      _count: { id: true }
    });

    const byCategory = {};
    breakdown.forEach(b => {
      byCategory[b.category] = b._count.id;
    });

    res.json({ unreadCount: count, byCategory });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

/**
 * PUT /social-notifications/:id/read - Mark a notification as read
 */
router.put('/:id/read', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.socialNotification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== userId) {
      return void res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.socialNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * PUT /social-notifications/read-all - Mark all notifications as read
 */
router.put('/read-all', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.body;

    const where: any = { userId, isRead: false };
    if (category) where.category = category;

    await prisma.socialNotification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /social-notifications/:id - Delete a notification
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await prisma.socialNotification.findUnique({
      where: { id }
    });

    if (!notification || notification.userId !== userId) {
      return void res.status(404).json({ error: 'Notification not found' });
    }

    await prisma.socialNotification.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /social-notifications/clear - Clear all/old notifications
 */
router.delete('/clear', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, olderThanDays } = req.body;

    const where: any = { userId };
    if (category) where.category = category;
    
    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThanDays));
      where.createdAt = { lt: cutoffDate };
    }

    const result = await prisma.socialNotification.deleteMany({ where });

    res.json({ success: true, deletedCount: result.count });
  } catch (err) {
    console.error('Clear notifications error:', err);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// =============================================================================
// UTILITY FUNCTIONS FOR OTHER ROUTES TO USE
// =============================================================================

/**
 * Create a notification (exported for use in other routes)
 */
async function createNotification({
  userId,
  category,
  type,
  actorId,
  message,
  targetType,
  targetId,
  imageUrl,
  actionUrl,
  priority = 'normal',
  metadata
}) {
  // Check if actor is blocked by user
  if (actorId) {
    const blocked = await prisma.userBlock.findFirst({
      where: { blockerId: userId, blockedId: actorId }
    });

    if (blocked) {
      return null; // Don't notify about blocked users
    }
  }

  // Create the notification
  const notification = await prisma.socialNotification.create({
    data: {
      userId,
      category,
      type,
      actorId,
      message,
      targetType,
      targetId,
      imageUrl,
      actionUrl,
      priority,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  });

  return notification;
}

/**
 * Create bulk notifications
 */
async function createBulkNotifications(notifications) {
  const created = [];
  
  for (const notification of notifications) {
    const result = await createNotification(notification);
    if (result) created.push(result);
  }
  
  return created;
}

// Export router and utility functions
export default router;

export { createNotification, createBulkNotifications };


