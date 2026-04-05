// @ts-nocheck
'use strict';

/**
 * Announcement System (Step 49)
 * 
 * Features:
 * - Platform-wide announcements
 * - Banner and modal notifications
 * - Targeting by role, location, etc.
 * - Scheduling
 * - Analytics
 */

const { prisma } = require('../db');
const { queueEmail, sendBulkEmails } = require('./emailQueue');
const { createBulkNotifications } = require('./notificationCenter');
const logger = require('./logger');

// Announcement types
const ANNOUNCEMENT_TYPES = {
  BANNER: 'banner',      // Top banner on all pages
  MODAL: 'modal',        // Full-screen modal (dismissable)
  TOAST: 'toast',        // Toast notification
  EMAIL: 'email',        // Email-only
  PUSH: 'push'           // Push notification
};

// Priority levels
const PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Target audiences
const AUDIENCES = {
  ALL: 'all',
  MEMBERS: 'MEMBER',
  MENTORS: 'MENTOR',
  EMPLOYERS: 'COMPANY',
  INSTITUTIONS: 'INSTITUTION',
  ADMINS: 'ADMIN'
};

/**
 * Create a new announcement
 * @param {object} data - Announcement data
 */
async function createAnnouncement(data) {
  const {
    title,
    content,
    type = ANNOUNCEMENT_TYPES.BANNER,
    priority = PRIORITY.NORMAL,
    targetRoles = ['all'],
    targetLocations = [],
    targetUserIds = [],
    startsAt = new Date(),
    endsAt = null,
    dismissable = true,
    actionText = null,
    actionUrl = null,
    createdBy
  } = data;
  
  // Validate
  if (!title || title.trim().length < 3) {
    throw new Error('Title is required');
  }
  
  if (!content || content.trim().length < 10) {
    throw new Error('Content is required');
  }
  
  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      type,
      priority,
      targetRoles: JSON.stringify(targetRoles),
      targetLocations: JSON.stringify(targetLocations),
      targetUserIds: JSON.stringify(targetUserIds),
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      dismissable,
      actionText,
      actionUrl,
      isActive: true,
      createdBy
    }
  });
  
  logger.info('Announcement created', { id: announcement.id, title });
  
  return announcement;
}

/**
 * Get active announcements for a user
 * @param {object} user - User object with role, location
 */
async function getActiveAnnouncementsForUser(user) {
  const now = new Date();
  
  // Get all active announcements
  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      OR: [
        { endsAt: null },
        { endsAt: { gte: now } }
      ]
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'desc' }
    ]
  });
  
  // Get user's dismissed announcements
  const dismissed = await prisma.announcementDismissal.findMany({
    where: { userId: user.id },
    select: { announcementId: true }
  });
  
  const dismissedIds = new Set(dismissed.map(d => d.announcementId));
  
  // Filter announcements for this user
  return announcements
    .filter(a => {
      // Skip dismissed
      if (dismissedIds.has(a.id)) return false;
      
      // Check role targeting
      const targetRoles = JSON.parse(a.targetRoles || '["all"]');
      if (!targetRoles.includes('all') && !targetRoles.includes(user.userType)) {
        return false;
      }
      
      // Check location targeting
      const targetLocations = JSON.parse(a.targetLocations || '[]');
      if (targetLocations.length > 0 && user.profile?.location) {
        const userLocation = user.profile.location.toLowerCase();
        const matchesLocation = targetLocations.some(loc => 
          userLocation.includes(loc.toLowerCase())
        );
        if (!matchesLocation) return false;
      }
      
      // Check specific user targeting
      const targetUserIds = JSON.parse(a.targetUserIds || '[]');
      if (targetUserIds.length > 0 && !targetUserIds.includes(user.id)) {
        return false;
      }
      
      return true;
    })
    .map(formatAnnouncement);
}

/**
 * Format announcement for API response
 */
function formatAnnouncement(announcement) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    priority: announcement.priority,
    dismissable: announcement.dismissable,
    actionText: announcement.actionText,
    actionUrl: announcement.actionUrl,
    createdAt: announcement.createdAt,
    expiresAt: announcement.endsAt
  };
}

/**
 * Dismiss an announcement for a user
 * @param {string} announcementId - Announcement ID
 * @param {string} userId - User ID
 */
async function dismissAnnouncement(announcementId, userId) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId }
  });
  
  if (!announcement) {
    throw new Error('Announcement not found');
  }
  
  if (!announcement.dismissable) {
    throw new Error('This announcement cannot be dismissed');
  }
  
  await prisma.announcementDismissal.upsert({
    where: {
      announcementId_userId: { announcementId, userId }
    },
    create: { announcementId, userId },
    update: { dismissedAt: new Date() }
  });
  
  // Track analytics
  await trackAnnouncementEvent(announcementId, userId, 'dismissed');
  
  return { dismissed: true };
}

/**
 * Track announcement event
 */
async function trackAnnouncementEvent(announcementId, userId, eventType) {
  try {
    await prisma.announcementAnalytics.create({
      data: {
        announcementId,
        userId,
        eventType,
        timestamp: new Date()
      }
    });
  } catch (err) {
    // Non-critical, just log
    logger.warn('Failed to track announcement event', { announcementId, eventType });
  }
}

/**
 * Record announcement view
 * @param {string} announcementId - Announcement ID
 * @param {string} userId - User ID
 */
async function recordView(announcementId, userId) {
  await trackAnnouncementEvent(announcementId, userId, 'viewed');
  
  // Increment view count
  await prisma.announcement.update({
    where: { id: announcementId },
    data: { viewCount: { increment: 1 } }
  });
  
  return { recorded: true };
}

/**
 * Record announcement click (CTA)
 * @param {string} announcementId - Announcement ID
 * @param {string} userId - User ID
 */
async function recordClick(announcementId, userId) {
  await trackAnnouncementEvent(announcementId, userId, 'clicked');
  
  await prisma.announcement.update({
    where: { id: announcementId },
    data: { clickCount: { increment: 1 } }
  });
  
  return { recorded: true };
}

/**
 * Publish announcement immediately
 * Sends to all targeted users via their preferred channels
 * @param {string} announcementId - Announcement ID
 */
async function publishAnnouncement(announcementId) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId }
  });
  
  if (!announcement) {
    throw new Error('Announcement not found');
  }
  
  const targetRoles = JSON.parse(announcement.targetRoles || '["all"]');
  const targetLocations = JSON.parse(announcement.targetLocations || '[]');
  const targetUserIds = JSON.parse(announcement.targetUserIds || '[]');
  
  // Build user query
  const userWhere = { isActive: true };
  
  if (!targetRoles.includes('all')) {
    userWhere.userType = { in: targetRoles };
  }
  
  if (targetUserIds.length > 0) {
    userWhere.id = { in: targetUserIds };
  }
  
  const users = await prisma.user.findMany({
    where: userWhere,
    include: { profile: true }
  });
  
  // Filter by location if specified
  let targetUsers = users;
  if (targetLocations.length > 0) {
    targetUsers = users.filter(u => {
      const userLocation = u.profile?.location?.toLowerCase() || '';
      return targetLocations.some(loc => userLocation.includes(loc.toLowerCase()));
    });
  }
  
  const results = { 
    targeted: targetUsers.length,
    inApp: 0,
    emails: 0,
    push: 0
  };
  
  // Create in-app notifications
  if (announcement.type !== ANNOUNCEMENT_TYPES.EMAIL) {
    const inAppResult = await createBulkNotifications(
      targetUsers.map(u => u.id),
      {
        type: 'ANNOUNCEMENT',
        category: 'system',
        title: announcement.title,
        message: announcement.content.substring(0, 200),
        link: announcement.actionUrl,
        icon: '📢'
      }
    );
    results.inApp = inAppResult.created;
  }
  
  // Send emails if it's an email-type announcement
  if (announcement.type === ANNOUNCEMENT_TYPES.EMAIL || 
      announcement.priority === PRIORITY.CRITICAL) {
    const emails = targetUsers.map(u => ({
      to: u.email,
      subject: announcement.title,
      template: 'announcement',
      templateData: {
        userName: u.profile?.name,
        title: announcement.title,
        content: announcement.content,
        actionText: announcement.actionText,
        actionUrl: announcement.actionUrl
      },
      userId: u.id,
      type: 'ANNOUNCEMENT'
    }));
    
    const emailResult = await sendBulkEmails(emails);
    results.emails = emailResult.success;
  }
  
  // Update announcement as published
  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      publishedAt: new Date(),
      targetedCount: targetUsers.length
    }
  });
  
  logger.info('Announcement published', { id: announcementId, ...results });
  
  return results;
}

/**
 * Schedule an announcement
 * @param {string} announcementId - Announcement ID
 * @param {Date} publishAt - When to publish
 */
async function scheduleAnnouncement(announcementId, publishAt) {
  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      startsAt: new Date(publishAt),
      scheduledAt: new Date()
    }
  });
  
  return { scheduled: true, publishAt };
}

/**
 * Get announcement analytics
 * @param {string} announcementId - Announcement ID
 */
async function getAnnouncementAnalytics(announcementId) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId }
  });
  
  if (!announcement) {
    throw new Error('Announcement not found');
  }
  
  // Get event counts
  const events = await prisma.announcementAnalytics.groupBy({
    by: ['eventType'],
    where: { announcementId },
    _count: true
  });
  
  const eventCounts = events.reduce((acc, e) => {
    acc[e.eventType] = e._count;
    return acc;
  }, {});
  
  // Get unique users
  const uniqueViewers = await prisma.announcementAnalytics.findMany({
    where: { announcementId, eventType: 'viewed' },
    distinct: ['userId']
  });
  
  // Get dismissal count
  const dismissals = await prisma.announcementDismissal.count({
    where: { announcementId }
  });
  
  return {
    id: announcementId,
    title: announcement.title,
    status: announcement.isActive ? 'active' : 'inactive',
    targeted: announcement.targetedCount || 0,
    views: announcement.viewCount || 0,
    uniqueViewers: uniqueViewers.length,
    clicks: announcement.clickCount || 0,
    dismissals,
    clickRate: announcement.viewCount > 0 
      ? ((announcement.clickCount || 0) / announcement.viewCount * 100).toFixed(1) + '%'
      : 'N/A',
    events: eventCounts,
    createdAt: announcement.createdAt,
    publishedAt: announcement.publishedAt,
    expiresAt: announcement.endsAt
  };
}

/**
 * Update an announcement
 * @param {string} announcementId - Announcement ID
 * @param {object} updates - Fields to update
 */
async function updateAnnouncement(announcementId, updates) {
  const allowed = [
    'title', 'content', 'type', 'priority', 
    'dismissable', 'actionText', 'actionUrl',
    'endsAt', 'isActive'
  ];
  
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      data[key] = updates[key];
    }
  }
  
  // Handle date fields
  if (data.endsAt) {
    data.endsAt = new Date(data.endsAt);
  }
  
  const announcement = await prisma.announcement.update({
    where: { id: announcementId },
    data
  });
  
  return formatAnnouncement(announcement);
}

/**
 * Delete an announcement
 * @param {string} announcementId - Announcement ID
 */
async function deleteAnnouncement(announcementId) {
  // Delete related data
  await prisma.announcementDismissal.deleteMany({
    where: { announcementId }
  });
  
  await prisma.announcementAnalytics.deleteMany({
    where: { announcementId }
  });
  
  await prisma.announcement.delete({
    where: { id: announcementId }
  });
  
  return { deleted: true };
}

/**
 * Deactivate expired announcements
 * Call from cron job
 */
async function deactivateExpiredAnnouncements() {
  const now = new Date();
  
  const result = await prisma.announcement.updateMany({
    where: {
      isActive: true,
      endsAt: { lte: now }
    },
    data: { isActive: false }
  });
  
  if (result.count > 0) {
    logger.info('Deactivated expired announcements', { count: result.count });
  }
  
  return { deactivated: result.count };
}

/**
 * Get all announcements (admin view)
 * @param {object} options - Query options
 */
async function getAllAnnouncements(options = {}) {
  const {
    status = 'all', // 'active', 'inactive', 'scheduled', 'all'
    page = 1,
    pageSize = 20
  } = options;
  
  const now = new Date();
  const where = {};
  
  if (status === 'active') {
    where.isActive = true;
    where.startsAt = { lte: now };
    where.OR = [{ endsAt: null }, { endsAt: { gte: now } }];
  } else if (status === 'inactive') {
    where.isActive = false;
  } else if (status === 'scheduled') {
    where.startsAt = { gt: now };
  }
  
  const [announcements, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize
    }),
    prisma.announcement.count({ where })
  ]);
  
  return {
    announcements: announcements.map(a => ({
      ...formatAnnouncement(a),
      targetRoles: JSON.parse(a.targetRoles || '[]'),
      targetedCount: a.targetedCount,
      viewCount: a.viewCount,
      clickCount: a.clickCount,
      isActive: a.isActive
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}
