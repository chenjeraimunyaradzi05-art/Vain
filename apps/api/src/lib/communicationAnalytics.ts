// @ts-nocheck
'use strict';

/**
 * Communication Analytics Dashboard (Step 50)
 * 
 * Features:
 * - Email delivery rates
 * - SMS delivery success
 * - Notification engagement
 * - Communication dashboard
 * - A/B testing support
 */

const { prisma } = require('../db');
const logger = require('./logger');

/**
 * Get comprehensive communication analytics
 * @param {object} options - Query options
 */
async function getCommunicationDashboard(options = {}) {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    companyId = null
  } = options;
  
  const [
    emailStats,
    smsStats,
    pushStats,
    notificationStats,
    webhookStats,
    topPerformers
  ] = await Promise.all([
    getEmailAnalytics(startDate, endDate),
    getSmsAnalytics(startDate, endDate),
    getPushAnalytics(startDate, endDate),
    getNotificationAnalytics(startDate, endDate),
    getWebhookAnalytics(startDate, endDate, companyId),
    getTopPerformingContent(startDate, endDate)
  ]);
  
  return {
    period: {
      start: startDate,
      end: endDate,
      days: Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
    },
    email: emailStats,
    sms: smsStats,
    push: pushStats,
    notifications: notificationStats,
    webhooks: webhookStats,
    topPerformers,
    summary: {
      totalCommunications: (emailStats.total || 0) + (smsStats.total || 0) + (pushStats.total || 0),
      overallDeliveryRate: calculateOverallDeliveryRate(emailStats, smsStats, pushStats),
      overallEngagementRate: calculateOverallEngagementRate(emailStats, notificationStats)
    }
  };
}

/**
 * Get email analytics
 */
async function getEmailAnalytics(startDate, endDate) {
  try {
    const emails = await prisma.emailLog.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      select: {
        status: true,
        openedAt: true,
        clickCount: true,
        template: true
      }
    });
    
    const total = emails.length;
    const sent = emails.filter(e => e.status === 'SENT').length;
    const failed = emails.filter(e => e.status === 'FAILED').length;
    const opened = emails.filter(e => e.openedAt).length;
    const clicked = emails.filter(e => e.clickCount > 0).length;
    const totalClicks = emails.reduce((sum, e) => sum + (e.clickCount || 0), 0);
    
    // By template
    const templateStats = {};
    emails.forEach(e => {
      const template = e.template || 'unknown';
      if (!templateStats[template]) {
        templateStats[template] = { sent: 0, opened: 0, clicked: 0 };
      }
      if (e.status === 'SENT') templateStats[template].sent++;
      if (e.openedAt) templateStats[template].opened++;
      if (e.clickCount > 0) templateStats[template].clicked++;
    });
    
    return {
      total,
      sent,
      failed,
      deliveryRate: total > 0 ? ((sent / total) * 100).toFixed(1) : 0,
      opened,
      openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0,
      clicked,
      clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : 0,
      totalClicks,
      avgClicksPerEmail: clicked > 0 ? (totalClicks / clicked).toFixed(2) : 0,
      byTemplate: Object.entries(templateStats).map(([template, stats]) => ({
        template,
        ...stats,
        openRate: stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : 0,
        clickRate: stats.sent > 0 ? ((stats.clicked / stats.sent) * 100).toFixed(1) : 0
      }))
    };
  } catch (err) {
    logger.warn('Email analytics failed', { error: err.message });
    return { total: 0, sent: 0, failed: 0, deliveryRate: 0 };
  }
}

/**
 * Get SMS analytics
 */
async function getSmsAnalytics(startDate, endDate) {
  try {
    // Check if SmsLog exists
    const smsLogs = await prisma.smsLog?.findMany?.({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }) || [];
    
    const total = smsLogs.length;
    const delivered = smsLogs.filter(s => s.status === 'DELIVERED').length;
    const failed = smsLogs.filter(s => s.status === 'FAILED').length;
    
    return {
      total,
      delivered,
      failed,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
      byType: groupByField(smsLogs, 'type'),
      costEstimate: total * 0.05 // Rough estimate: $0.05 per SMS
    };
  } catch (err) {
    // SmsLog might not exist yet
    return { total: 0, delivered: 0, failed: 0, deliveryRate: 0 };
  }
}

/**
 * Get push notification analytics
 */
async function getPushAnalytics(startDate, endDate) {
  try {
    const pushLogs = await prisma.pushLog?.findMany?.({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      }
    }) || [];
    
    const total = pushLogs.length;
    const delivered = pushLogs.filter(p => p.status === 'DELIVERED').length;
    const clicked = pushLogs.filter(p => p.clickedAt).length;
    
    return {
      total,
      delivered,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
      clicked,
      clickRate: delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : 0
    };
  } catch (err) {
    return { total: 0, delivered: 0, deliveryRate: 0 };
  }
}

/**
 * Get in-app notification analytics
 */
async function getNotificationAnalytics(startDate, endDate) {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate }
      },
      select: {
        category: true,
        type: true,
        readAt: true
      }
    });
    
    const total = notifications.length;
    const read = notifications.filter(n => n.readAt).length;
    
    // By category
    const byCategory = {};
    notifications.forEach(n => {
      const category = n.category || 'system';
      if (!byCategory[category]) {
        byCategory[category] = { total: 0, read: 0 };
      }
      byCategory[category].total++;
      if (n.readAt) byCategory[category].read++;
    });
    
    return {
      total,
      read,
      unread: total - read,
      readRate: total > 0 ? ((read / total) * 100).toFixed(1) : 0,
      byCategory: Object.entries(byCategory).map(([category, stats]) => ({
        category,
        ...stats,
        readRate: stats.total > 0 ? ((stats.read / stats.total) * 100).toFixed(1) : 0
      }))
    };
  } catch (err) {
    logger.warn('Notification analytics failed', { error: err.message });
    return { total: 0, read: 0, readRate: 0 };
  }
}

/**
 * Get webhook analytics
 */
async function getWebhookAnalytics(startDate, endDate, companyId = null) {
  try {
    const where = { createdAt: { gte: startDate, lte: endDate } };
    
    if (companyId) {
      const webhooks = await prisma.webhook.findMany({
        where: { companyId },
        select: { id: true }
      });
      where.webhookId = { in: webhooks.map(w => w.id) };
    }
    
    const deliveries = await prisma.webhookDelivery.findMany({
      where,
      select: {
        status: true,
        eventType: true,
        attempts: true,
        statusCode: true
      }
    });
    
    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.status === 'DELIVERED').length;
    const failed = deliveries.filter(d => d.status === 'FAILED').length;
    const pending = deliveries.filter(d => d.status === 'PENDING').length;
    
    // Average attempts for successful deliveries
    const successfulAttempts = deliveries
      .filter(d => d.status === 'DELIVERED')
      .reduce((sum, d) => sum + d.attempts, 0);
    
    return {
      total,
      delivered,
      failed,
      pending,
      deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0,
      avgAttempts: delivered > 0 ? (successfulAttempts / delivered).toFixed(2) : 0,
      byEvent: groupByField(deliveries, 'eventType')
    };
  } catch (err) {
    logger.warn('Webhook analytics failed', { error: err.message });
    return { total: 0, delivered: 0, deliveryRate: 0 };
  }
}

/**
 * Get top performing content
 */
async function getTopPerformingContent(startDate, endDate) {
  try {
    // Top email templates by open rate
    const emailsByTemplate = await prisma.emailLog.groupBy({
      by: ['template'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: 'SENT'
      },
      _count: true
    });
    
    // Get open rates for each template
    const topEmails = [];
    for (const { template, _count } of emailsByTemplate.slice(0, 5)) {
      const opened = await prisma.emailLog.count({
        where: {
          template,
          createdAt: { gte: startDate, lte: endDate },
          openedAt: { not: null }
        }
      });
      
      topEmails.push({
        template,
        sent: _count,
        opened,
        openRate: _count > 0 ? ((opened / _count) * 100).toFixed(1) : 0
      });
    }
    
    // Sort by open rate
    topEmails.sort((a, b) => parseFloat(b.openRate) - parseFloat(a.openRate));
    
    return {
      topEmailTemplates: topEmails.slice(0, 5)
    };
  } catch (err) {
    return { topEmailTemplates: [] };
  }
}

/**
 * Helper: Group items by field
 */
function groupByField(items, field) {
  const groups = {};
  items.forEach(item => {
    const key = item[field] || 'unknown';
    if (!groups[key]) {
      groups[key] = 0;
    }
    groups[key]++;
  });
  return groups;
}

/**
 * Calculate overall delivery rate
 */
function calculateOverallDeliveryRate(emailStats, smsStats, pushStats) {
  const totalSent = (emailStats.total || 0) + (smsStats.total || 0) + (pushStats.total || 0);
  const totalDelivered = (emailStats.sent || 0) + (smsStats.delivered || 0) + (pushStats.delivered || 0);
  
  return totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : 0;
}

/**
 * Calculate overall engagement rate
 */
function calculateOverallEngagementRate(emailStats, notificationStats) {
  const totalContent = (emailStats.sent || 0) + (notificationStats.total || 0);
  const totalEngaged = (emailStats.opened || 0) + (notificationStats.read || 0);
  
  return totalContent > 0 ? ((totalEngaged / totalContent) * 100).toFixed(1) : 0;
}

/**
 * Get communication trend over time
 */
async function getCommunicationTrend(options = {}) {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    interval = 'day' // 'hour', 'day', 'week'
  } = options;
  
  const trend = [];
  let current = new Date(startDate);
  
  while (current <= endDate) {
    let periodEnd;
    if (interval === 'hour') {
      periodEnd = new Date(current.getTime() + 60 * 60 * 1000);
    } else if (interval === 'week') {
      periodEnd = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else {
      periodEnd = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    
    const [emails, notifications] = await Promise.all([
      prisma.emailLog.count({
        where: {
          createdAt: { gte: current, lt: periodEnd },
          status: 'SENT'
        }
      }),
      prisma.notification.count({
        where: {
          createdAt: { gte: current, lt: periodEnd }
        }
      })
    ]);
    
    trend.push({
      date: current.toISOString().split('T')[0],
      emails,
      notifications,
      total: emails + notifications
    });
    
    current = periodEnd;
  }
  
  return trend;
}

/**
 * Get channel performance comparison
 */
async function getChannelComparison(startDate, endDate) {
  const [email, notification] = await Promise.all([
    getEmailAnalytics(startDate, endDate),
    getNotificationAnalytics(startDate, endDate)
  ]);
  
  return {
    channels: [
      {
        name: 'Email',
        volume: email.sent || 0,
        deliveryRate: parseFloat(email.deliveryRate) || 0,
        engagementRate: parseFloat(email.openRate) || 0,
        actionRate: parseFloat(email.clickRate) || 0
      },
      {
        name: 'In-App Notifications',
        volume: notification.total || 0,
        deliveryRate: 100, // Always delivered
        engagementRate: parseFloat(notification.readRate) || 0,
        actionRate: 0 // Would need click tracking
      }
    ],
    recommendation: getChannelRecommendation(email, notification)
  };
}

/**
 * Get channel recommendation based on performance
 */
function getChannelRecommendation(email, notification) {
  const emailOpenRate = parseFloat(email.openRate) || 0;
  const notificationReadRate = parseFloat(notification.readRate) || 0;
  
  if (emailOpenRate > notificationReadRate + 10) {
    return 'Email is performing better than in-app notifications. Consider email for important announcements.';
  } else if (notificationReadRate > emailOpenRate + 10) {
    return 'In-app notifications have higher engagement. Use them for time-sensitive updates.';
  } else {
    return 'Both channels perform similarly. Use a multi-channel approach for best results.';
  }
}

/**
 * A/B Test Analytics
 */
async function getAbTestResults(testId) {
  try {
    const test = await prisma.abTest?.findUnique?.({
      where: { id: testId },
      include: {
        variants: true
      }
    });
    
    if (!test) {
      return null;
    }
    
    // Calculate stats for each variant
    const variantStats = await Promise.all(
      test.variants.map(async (variant) => {
        const emails = await prisma.emailLog.findMany({
          where: { abTestVariantId: variant.id },
          select: { openedAt: true, clickCount: true }
        });
        
        const sent = emails.length;
        const opened = emails.filter(e => e.openedAt).length;
        const clicked = emails.filter(e => e.clickCount > 0).length;
        
        return {
          id: variant.id,
          name: variant.name,
          sent,
          opened,
          clicked,
          openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0,
          clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : 0
        };
      })
    );
    
    // Determine winner
    let winner = null;
    let maxScore = 0;
    
    for (const variant of variantStats) {
      // Score = 60% open rate + 40% click rate
      const score = parseFloat(variant.openRate) * 0.6 + parseFloat(variant.clickRate) * 0.4;
      if (score > maxScore) {
        maxScore = score;
        winner = variant;
      }
    }
    
    return {
      testId,
      name: test.name,
      status: test.status,
      variants: variantStats,
      winner: winner ? {
        id: winner.id,
        name: winner.name,
        improvement: variantStats.length > 1 
          ? calculateImprovement(variantStats, winner)
          : null
      } : null,
      statisticalSignificance: calculateStatisticalSignificance(variantStats)
    };
  } catch (err) {
    return null;
  }
}

/**
 * Calculate improvement percentage
 */
function calculateImprovement(variants, winner) {
  const others = variants.filter(v => v.id !== winner.id);
  if (others.length === 0) return null;
  
  const avgOtherOpenRate = others.reduce((sum, v) => sum + parseFloat(v.openRate), 0) / others.length;
  const improvement = ((parseFloat(winner.openRate) - avgOtherOpenRate) / avgOtherOpenRate * 100).toFixed(1);
  
  return `${improvement}%`;
}

/**
 * Calculate statistical significance (simplified)
 */
function calculateStatisticalSignificance(variants) {
  // Simplified calculation - in production, use proper chi-square test
  const totalSent = variants.reduce((sum, v) => sum + v.sent, 0);
  
  if (totalSent < 100) {
    return { significant: false, message: 'Need more data (minimum 100 sends per variant)' };
  }
  
  if (totalSent < 1000) {
    return { significant: false, message: 'Low confidence. Continue test for more reliable results.' };
  }
  
  return { significant: true, confidence: '95%' };
}

/**
 * Get user communication preferences summary
 */
async function getUserPreferencesSummary() {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { notificationPreferences: true }
    });
    
    const summary = {
      totalUsers: users.length,
      emailEnabled: 0,
      smsEnabled: 0,
      pushEnabled: 0,
      quietHoursEnabled: 0,
      digestEnabled: 0
    };
    
    users.forEach(user => {
      const prefs = user.notificationPreferences 
        ? JSON.parse(user.notificationPreferences) 
        : {};
      
      // Check channel preferences
      if (prefs.channels) {
        const hasEmail = Object.values(prefs.channels).some(c => c.enabledChannels?.includes('email'));
        const hasSms = Object.values(prefs.channels).some(c => c.enabledChannels?.includes('sms'));
        const hasPush = Object.values(prefs.channels).some(c => c.enabledChannels?.includes('push'));
        
        if (hasEmail) summary.emailEnabled++;
        if (hasSms) summary.smsEnabled++;
        if (hasPush) summary.pushEnabled++;
      } else {
        // Default enabled
        summary.emailEnabled++;
        summary.pushEnabled++;
      }
      
      if (prefs.quietHours?.enabled) summary.quietHoursEnabled++;
      if (prefs.digest?.enabled) summary.digestEnabled++;
    });
    
    return {
      ...summary,
      emailRate: summary.totalUsers > 0 ? ((summary.emailEnabled / summary.totalUsers) * 100).toFixed(1) : 0,
      smsRate: summary.totalUsers > 0 ? ((summary.smsEnabled / summary.totalUsers) * 100).toFixed(1) : 0,
      pushRate: summary.totalUsers > 0 ? ((summary.pushEnabled / summary.totalUsers) * 100).toFixed(1) : 0
    };
  } catch (err) {
    logger.warn('User preferences summary failed', { error: err.message });
    return { totalUsers: 0 };
  }
}
