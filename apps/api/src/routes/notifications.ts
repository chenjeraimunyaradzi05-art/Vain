import express from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import auth from '../middleware/auth';
import * as push from '../lib/pushNotifications';

const router = express.Router();

// Helper: check if user is admin
function isAdmin(req: any) {
  return (
    req.user?.userType === 'GOVERNMENT' ||
    (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY)
  );
}

/**
 * GET /notifications
 * List notifications for the current user
 */
router.get('/', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    res.json({ notifications });
  } catch (error) {
    console.error('[Notifications] List error:', error);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

/**
 * GET /notifications/count
 * Get unread notification count
 */
router.get('/count', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ count });
  } catch (error) {
    console.error('[Notifications] Count error:', error);
    res.status(500).json({ error: 'Failed to load notification count' });
  }
});

/**
 * PATCH /notifications/:id
 * Mark notification as read/unread
 */
router.patch('/:id', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const read = Boolean(req.body?.read);

    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId },
      data: { read },
    });

    if (result.count === 0) {
      return void res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Update error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * POST /notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Mark all read error:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

/**
 * DELETE /notifications/:id
 * Delete a notification
 */
router.delete('/:id', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const result = await prisma.notification.deleteMany({
      where: { id: req.params.id, userId },
    });

    if (result.count === 0) {
      return void res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * POST /notifications/register
 * Register a device token for push notifications
 */
router.post('/register', auth.authenticate, async (req: any, res: any) => {
  try {
    const { token, platform, deviceId } = req.body;
    const userId = req.user.id;
    
    if (!token) {
      return void res.status(400).json({ error: 'Token is required' });
    }
    
    // Upsert device token
    const device = await prisma.pushDevice.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId: deviceId || token.substring(0, 32),
        },
      },
      update: {
        token,
        platform: platform || 'unknown',
        updatedAt: new Date(),
        isActive: true,
      },
      create: {
        userId,
        token,
        platform: platform || 'unknown',
        deviceId: deviceId || token.substring(0, 32),
        isActive: true,
      },
    });
    
    // Subscribe to default topics based on user type
    const userTopics = [push.NOTIFICATION_TOPICS.ALL_USERS];
    switch (req.user.userType) {
      case 'MEMBER':
        userTopics.push(push.NOTIFICATION_TOPICS.MEMBERS);
        userTopics.push(push.NOTIFICATION_TOPICS.NEW_JOBS);
        break;
      case 'MENTOR':
        userTopics.push(push.NOTIFICATION_TOPICS.MENTORS);
        break;
      case 'COMPANY':
        userTopics.push(push.NOTIFICATION_TOPICS.EMPLOYERS);
        break;
      case 'INSTITUTION':
        userTopics.push(push.NOTIFICATION_TOPICS.TAFE);
        break;
    }
    
    // Subscribe to topics
    for (const topic of userTopics) {
      await push.subscribeToTopic(token, topic);
    }
    
    res.json({
      success: true,
      device: {
        id: device.id,
        platform: device.platform,
        subscribedTopics: userTopics,
      },
    });
  } catch (error) {
    console.error('[Notifications] Register error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
});

/**
 * POST /notifications/unregister
 * Unregister a device token
 */
router.post('/unregister', auth.authenticate, async (req: any, res: any) => {
  try {
    const { token, deviceId } = req.body;
    const userId = req.user.id;
    
    if (!token && !deviceId) {
      return void res.status(400).json({ error: 'Token or deviceId is required' });
    }
    
    // Mark device as inactive
    await prisma.pushDevice.updateMany({
      where: {
        userId,
        OR: [
          { token: token || undefined },
          { deviceId: deviceId || undefined },
        ].filter((c: any) => Object.values(c)[0]),
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
    
    // Unsubscribe from all topics
    if (token) {
      for (const topic of Object.values(push.NOTIFICATION_TOPICS)) {
        await push.unsubscribeFromTopic(token, topic as string);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('[Notifications] Unregister error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
});

/**
 * POST /notifications/subscribe
 * Subscribe to a notification topic
 */
router.post('/subscribe', auth.authenticate, async (req: any, res: any) => {
  try {
    const { topic } = req.body;
    const userId = req.user.id;
    
    if (!topic) {
      return void res.status(400).json({ error: 'Topic is required' });
    }
    
    // Validate topic
    if (!Object.values(push.NOTIFICATION_TOPICS).includes(topic)) {
      return void res.status(400).json({ error: 'Invalid topic' });
    }
    
    // Get user's active devices
    const devices = await prisma.pushDevice.findMany({
      where: { userId, isActive: true },
    });
    
    // Subscribe all devices
    const results = await Promise.all(
      devices.map((d: any) => push.subscribeToTopic(d.token, topic))
    );
    
    res.json({
      success: true,
      topic,
      devicesSubscribed: results.filter(r => r.success).length,
    });
  } catch (error) {
    console.error('[Notifications] Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe to topic' });
  }
});

/**
 * POST /notifications/unsubscribe
 * Unsubscribe from a notification topic
 */
router.post('/unsubscribe', auth.authenticate, async (req: any, res: any) => {
  try {
    const { topic } = req.body;
    const userId = req.user.id;
    
    if (!topic) {
      return void res.status(400).json({ error: 'Topic is required' });
    }
    
    // Get user's active devices
    const devices = await prisma.pushDevice.findMany({
      where: { userId, isActive: true },
    });
    
    // Unsubscribe all devices
    const results = await Promise.all(
      devices.map((d: any) => push.unsubscribeFromTopic(d.token, topic))
    );
    
    res.json({
      success: true,
      topic,
      devicesUnsubscribed: results.filter(r => r.success).length,
    });
  } catch (error) {
    console.error('[Notifications] Unsubscribe error:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from topic' });
  }
});

/**
 * GET /notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });
    
    // Create default preferences if none exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          jobAlerts: true,
          applicationUpdates: true,
          mentorshipAlerts: true,
          sessionReminders: true,
          courseReminders: true,
          communityUpdates: true,
          marketingEmails: false,
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
        },
      });
    }
    
    res.json({ preferences });
  } catch (error) {
    console.error('[Notifications] Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

/**
 * PUT /notifications/preferences
 * Update user notification preferences
 */
router.put('/preferences', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const updates = req.body;
    
    // Whitelist allowed fields
    const allowedFields = [
      'jobAlerts', 'applicationUpdates', 'mentorshipAlerts',
      'sessionReminders', 'courseReminders', 'communityUpdates',
      'marketingEmails', 'pushEnabled', 'emailEnabled', 'smsEnabled',
    ];
    
    const data: any = {};
    for (const field of allowedFields) {
      if (typeof updates[field] === 'boolean') {
        data[field] = updates[field];
      }
    }
    
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
    
    res.json({ preferences });
  } catch (error) {
    console.error('[Notifications] Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * POST /notifications/send
 * Send a notification (admin only)
 */
router.post('/send', auth.authenticate, async (req: any, res: any) => {
  try {
    if (!isAdmin(req)) {
      return void res.status(403).json({ error: 'Admin access required' });
    }
    
    const { type, targetUserId, targetTopic, title, body, data } = req.body;
    
    if (!title || !body) {
      return void res.status(400).json({ error: 'Title and body are required' });
    }
    
    // Send to specific user
    if (targetUserId) {
      const devices = await prisma.pushDevice.findMany({
        where: { userId: targetUserId, isActive: true },
      });
      
      if (devices.length === 0) {
        return void res.status(404).json({ error: 'No active devices for user' });
      }
      
      const result = await push.sendToDevices(
        devices.map((d: any) => d.token),
        { title, body },
        { type: type || 'admin_message', ...data }
      );
      
      return void res.json({ success: true, result });
    }
    
    // Send to topic
    if (targetTopic) {
      const result = await push.sendToTopic(
        targetTopic,
        { title, body },
        { type: type || 'admin_message', ...data }
      );
      
      return void res.json({ success: true, result });
    }
    
    return void res.status(400).json({ error: 'targetUserId or targetTopic is required' });
  } catch (error) {
    console.error('[Notifications] Send error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * GET /notifications/status
 * Get push notification service status
 */
router.get('/status', (req: any, res: any) => {
  res.json({
    configured: push.isConfigured(),
    availableTopics: Object.values(push.NOTIFICATION_TOPICS),
    notificationTypes: Object.values(push.NOTIFICATION_TYPES),
  });
});

export default router;


