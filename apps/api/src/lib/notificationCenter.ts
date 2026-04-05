// @ts-nocheck
'use strict';

/**
 * Notification Center (Step 45)
 * 
 * Features:
 * - Notification grouping by category/time
 * - Mark all as read
 * - Notification search/filter
 * - Notification history with pagination
 * - Real-time notification delivery
 */

const { prisma } = require('../db');

// Notification categories
const CATEGORIES = {
  JOBS: 'jobs',
  MENTORSHIP: 'mentorship',
  MESSAGES: 'messages',
  LEARNING: 'learning',
  COMMUNITY: 'community',
  ACCOUNT: 'account',
  SYSTEM: 'system'
};

// Time grouping thresholds
const TIME_GROUPS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  OLDER: 'older'
};

/**
 * Get notification center data for a user
 * @param {string} userId - User ID
 * @param {object} options - Query options
 */
async function getNotificationCenter(userId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    category = null,
    unreadOnly = false,
    search = null,
    groupBy = 'time' // 'time' | 'category' | null
  } = options;
  
  // Build where clause
  const where = { userId };
  
  if (category) {
    where.category = category;
  }
  
  if (unreadOnly) {
    where.readAt = null;
  }
  
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  // Get notifications
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, readAt: null }
    })
  ]);
  
  // Group notifications if requested
  let grouped = null;
  if (groupBy === 'time') {
    grouped = groupByTime(notifications);
  } else if (groupBy === 'category') {
    grouped = groupByCategory(notifications);
  }
  
  // Get category counts
  const categoryCounts = await getCategoryCounts(userId);
  
  return {
    notifications: grouped || notifications.map(formatNotification),
    total,
    unreadCount,
    categoryCounts,
    pagination: {
      limit,
      offset,
      hasMore: offset + limit < total
    }
  };
}

/**
 * Format notification for API response
 */
function formatNotification(notification) {
  return {
    id: notification.id,
    type: notification.type,
    category: notification.category || 'system',
    title: notification.title,
    message: notification.message,
    data: notification.data ? JSON.parse(notification.data) : null,
    link: notification.link,
    icon: notification.icon,
    isRead: !!notification.readAt,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    timeAgo: getTimeAgo(notification.createdAt)
  };
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return new Date(date).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Group notifications by time period
 */
function groupByTime(notifications) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);
  
  const groups = {
    [TIME_GROUPS.TODAY]: [],
    [TIME_GROUPS.YESTERDAY]: [],
    [TIME_GROUPS.THIS_WEEK]: [],
    [TIME_GROUPS.THIS_MONTH]: [],
    [TIME_GROUPS.OLDER]: []
  };
  
  notifications.forEach(notification => {
    const createdAt = new Date(notification.createdAt);
    const formatted = formatNotification(notification);
    
    if (createdAt >= today) {
      groups[TIME_GROUPS.TODAY].push(formatted);
    } else if (createdAt >= yesterday) {
      groups[TIME_GROUPS.YESTERDAY].push(formatted);
    } else if (createdAt >= weekAgo) {
      groups[TIME_GROUPS.THIS_WEEK].push(formatted);
    } else if (createdAt >= monthAgo) {
      groups[TIME_GROUPS.THIS_MONTH].push(formatted);
    } else {
      groups[TIME_GROUPS.OLDER].push(formatted);
    }
  });
  
  // Filter out empty groups
  return Object.entries(groups)
    .filter(([, items]) => items.length > 0)
    .map(([period, items]) => ({
      period,
      label: getTimeGroupLabel(period),
      notifications: items,
      count: items.length
    }));
}

/**
 * Get human-readable label for time group
 */
function getTimeGroupLabel(period) {
  const labels = {
    [TIME_GROUPS.TODAY]: 'Today',
    [TIME_GROUPS.YESTERDAY]: 'Yesterday',
    [TIME_GROUPS.THIS_WEEK]: 'This Week',
    [TIME_GROUPS.THIS_MONTH]: 'This Month',
    [TIME_GROUPS.OLDER]: 'Older'
  };
  return labels[period] || period;
}

/**
 * Group notifications by category
 */
function groupByCategory(notifications) {
  const groups = {};
  
  notifications.forEach(notification => {
    const category = notification.category || 'system';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(formatNotification(notification));
  });
  
  return Object.entries(groups).map(([category, items]) => ({
    category,
    label: getCategoryLabel(category),
    icon: getCategoryIcon(category),
    notifications: items,
    count: items.length
  }));
}

/**
 * Get human-readable category label
 */
function getCategoryLabel(category) {
  const labels = {
    [CATEGORIES.JOBS]: 'Jobs & Applications',
    [CATEGORIES.MENTORSHIP]: 'Mentorship',
    [CATEGORIES.MESSAGES]: 'Messages',
    [CATEGORIES.LEARNING]: 'Learning & Courses',
    [CATEGORIES.COMMUNITY]: 'Community',
    [CATEGORIES.ACCOUNT]: 'Account',
    [CATEGORIES.SYSTEM]: 'System'
  };
  return labels[category] || category;
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
  const icons = {
    [CATEGORIES.JOBS]: '💼',
    [CATEGORIES.MENTORSHIP]: '🤝',
    [CATEGORIES.MESSAGES]: '💬',
    [CATEGORIES.LEARNING]: '📚',
    [CATEGORIES.COMMUNITY]: '👥',
    [CATEGORIES.ACCOUNT]: '⚙️',
    [CATEGORIES.SYSTEM]: '🔔'
  };
  return icons[category] || '🔔';
}

/**
 * Get notification counts by category
 */
async function getCategoryCounts(userId) {
  const counts = await prisma.notification.groupBy({
    by: ['category'],
    where: { userId, readAt: null },
    _count: true
  });
  
  const result = {};
  counts.forEach(({ category, _count }) => {
    result[category || 'system'] = _count;
  });
  
  return result;
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for verification)
 */
async function markAsRead(notificationId, userId) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId }
  });
  
  if (!notification) {
    throw new Error('Notification not found');
  }
  
  if (!notification.readAt) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() }
    });
  }
  
  return { success: true };
}

/**
 * Mark all notifications as read
 * @param {string} userId - User ID
 * @param {string} category - Optional category filter
 */
async function markAllAsRead(userId, category = null) {
  const where = { userId, readAt: null };
  if (category) {
    where.category = category;
  }
  
  const result = await prisma.notification.updateMany({
    where,
    data: { readAt: new Date() }
  });
  
  return { markedRead: result.count };
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID (for verification)
 */
async function deleteNotification(notificationId, userId) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId }
  });
  
  if (!notification) {
    throw new Error('Notification not found');
  }
  
  await prisma.notification.delete({
    where: { id: notificationId }
  });
  
  return { success: true };
}

/**
 * Clear all notifications older than X days
 * @param {string} userId - User ID
 * @param {number} daysOld - Clear notifications older than this
 */
async function clearOldNotifications(userId, daysOld = 30) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  
  const result = await prisma.notification.deleteMany({
    where: {
      userId,
      createdAt: { lt: cutoff }
    }
  });
  
  return { deleted: result.count };
}

/**
 * Create a new notification
 * @param {object} notificationData - Notification data
 */
async function createNotification(notificationData) {
  const {
    userId,
    type,
    category = 'system',
    title,
    message,
    data = null,
    link = null,
    icon = null
  } = notificationData;
  
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      category,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
      link,
      icon
    }
  });
  
  return formatNotification(notification);
}

/**
 * Create notifications for multiple users (bulk)
 * @param {string[]} userIds - User IDs
 * @param {object} notificationData - Notification data (without userId)
 */
async function createBulkNotifications(userIds, notificationData) {
  const notifications = userIds.map(userId => ({
    userId,
    type: notificationData.type,
    category: notificationData.category || 'system',
    title: notificationData.title,
    message: notificationData.message,
    data: notificationData.data ? JSON.stringify(notificationData.data) : null,
    link: notificationData.link || null,
    icon: notificationData.icon || null
  }));
  
  const result = await prisma.notification.createMany({
    data: notifications
  });
  
  return { created: result.count };
}

/**
 * Get notification history with advanced filtering
 * @param {string} userId - User ID
 * @param {object} filters - Filter options
 */
async function getNotificationHistory(userId, filters = {}) {
  const {
    startDate,
    endDate,
    types = [],
    categories = [],
    page = 1,
    pageSize = 20
  } = filters;
  
  const where = { userId };
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  
  if (types.length > 0) {
    where.type = { in: types };
  }
  
  if (categories.length > 0) {
    where.category = { in: categories };
  }
  
  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize
    }),
    prisma.notification.count({ where })
  ]);
  
  return {
    notifications: notifications.map(formatNotification),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Get summary stats for notifications
 * @param {string} userId - User ID
 */
async function getNotificationStats(userId) {
  const [total, unread, byCategory, recentActivity] = await Promise.all([
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.notification.groupBy({
      by: ['category'],
      where: { userId },
      _count: true
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { type: true, createdAt: true }
    })
  ]);
  
  return {
    total,
    unread,
    readRate: total > 0 ? ((total - unread) / total * 100).toFixed(1) : 0,
    byCategory: byCategory.reduce((acc, { category, _count }) => {
      acc[category || 'system'] = _count;
      return acc;
    }, {}),
    recentActivity
  };
}
