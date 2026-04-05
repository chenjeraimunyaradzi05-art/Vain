// @ts-nocheck
/**
 * Email Queue System (Step 41)
 * 
 * Features:
 * - Queue-based email processing
 * - Retry logic with backoff
 * - Email tracking (opens, clicks)
 * - Batch sending support
 * - Rate limiting
 */

import { prisma } from '../db';
import { sendMail } from './mailer';
import logger from './logger';
import crypto from 'crypto';

// Queue configuration
const QUEUE_CONFIG = {
  maxRetries: 3,
  retryDelays: [60000, 300000, 900000], // 1min, 5min, 15min
  batchSize: 50,
  rateLimit: 100, // per minute
  trackingPixelEnabled: true
};

// In-memory queue for immediate processing
const emailQueue = [];
let processingQueue = false;
let rateLimitWindow = { minute: 0, count: 0 };

/**
 * Generate tracking pixel URL
 */
function generateTrackingPixel(emailLogId) {
  const token = crypto.createHash('sha256')
    .update(emailLogId + process.env.JWT_SECRET || 'tracking')
    .digest('hex')
    .substring(0, 16);
  
  const baseUrl = process.env.API_BASE_URL || 'https://api.ngurrapathways.com.au';
  return `${baseUrl}/emails/track/open/${emailLogId}/${token}`;
}

/**
 * Wrap links with click tracking
 */
function wrapLinksWithTracking(html, emailLogId) {
  if (!html) return html;
  
  const baseUrl = process.env.API_BASE_URL || 'https://api.ngurrapathways.com.au';
  const linkRegex = /href="(https?:\/\/[^"]+)"/g;
  
  let linkIndex = 0;
  return html.replace(linkRegex, (match, url) => {
    // Don't wrap unsubscribe links or tracking URLs
    if (url.includes('unsubscribe') || url.includes('/track/')) {
      return match;
    }
    
    const encodedUrl = Buffer.from(url).toString('base64url');
    const trackUrl = `${baseUrl}/emails/track/click/${emailLogId}/${linkIndex}/${encodedUrl}`;
    linkIndex++;
    return `href="${trackUrl}"`;
  });
}

/**
 * Add tracking to email HTML
 */
function addEmailTracking(html, emailLogId) {
  if (!QUEUE_CONFIG.trackingPixelEnabled) return html;
  if (!html) return html;
  
  // Wrap links
  let trackedHtml = wrapLinksWithTracking(html, emailLogId);
  
  // Add tracking pixel before closing body tag
  const trackingPixel = `<img src="${generateTrackingPixel(emailLogId)}" width="1" height="1" alt="" style="display:none;" />`;
  
  if (trackedHtml.includes('</body>')) {
    trackedHtml = trackedHtml.replace('</body>', `${trackingPixel}</body>`);
  } else {
    trackedHtml += trackingPixel;
  }
  
  return trackedHtml;
}

/**
 * Queue an email for sending
 * 
 * @param {object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body
 * @param {string} options.template - Template name (optional)
 * @param {object} options.templateData - Template data (optional)
 * @param {string} options.userId - Associated user ID (optional)
 * @param {string} options.type - Notification type (optional)
 * @param {Date} options.scheduledFor - Send at specific time (optional)
 * @param {number} options.priority - 1-5, lower is higher priority
 */
async function queueEmail(options) {
  try {
    // Create email log entry
    const emailLog = await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        template: options.template || 'custom',
        status: 'QUEUED',
        userId: options.userId || null,
        notificationType: options.type || null,
        scheduledFor: options.scheduledFor || null,
        priority: options.priority || 3,
        metadata: options.templateData ? JSON.stringify(options.templateData) : null
      }
    });
    
    // Add to in-memory queue for immediate processing
    if (!options.scheduledFor || new Date(options.scheduledFor) <= new Date()) {
      emailQueue.push({
        id: emailLog.id,
        ...options
      });
      
      // Start processing if not already running
      if (!processingQueue) {
        processQueue();
      }
    }
    
    return { queued: true, emailLogId: emailLog.id };
  } catch (err) {
    logger.error('Failed to queue email', { error: err.message, to: options.to });
    throw err;
  }
}

/**
 * Process the email queue
 */
async function processQueue() {
  if (processingQueue) return;
  processingQueue = true;
  
  try {
    while (emailQueue.length > 0) {
      // Check rate limit
      const currentMinute = Math.floor(Date.now() / 60000);
      if (rateLimitWindow.minute !== currentMinute) {
        rateLimitWindow = { minute: currentMinute, count: 0 };
      }
      
      if (rateLimitWindow.count >= QUEUE_CONFIG.rateLimit) {
        // Wait for next minute
        await new Promise(resolve => setTimeout(resolve, 60000 - (Date.now() % 60000)));
        continue;
      }
      
      const email = emailQueue.shift();
      await sendSingleEmail(email);
      rateLimitWindow.count++;
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } finally {
    processingQueue = false;
  }
}

/**
 * Send a single email with tracking
 */
async function sendSingleEmail(email) {
  try {
    // Add tracking to HTML
    const trackedHtml = addEmailTracking(email.html, email.id);
    
    // Send via mailer
    const result = await sendMail({
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: trackedHtml
    });
    
    // Update status
    await prisma.emailLog.update({
      where: { id: email.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        messageId: result?.messageId || null
      }
    });
    
    logger.info('Email sent', { id: email.id, to: email.to });
    return { success: true };
    
  } catch (err) {
    logger.error('Email send failed', { id: email.id, error: err.message });
    
    // Update retry count
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: email.id }
    });
    
    const retryCount = (emailLog?.retryCount || 0) + 1;
    
    if (retryCount >= QUEUE_CONFIG.maxRetries) {
      await prisma.emailLog.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          retryCount,
          lastError: err.message
        }
      });
    } else {
      // Schedule retry
      const retryDelay = QUEUE_CONFIG.retryDelays[retryCount - 1] || 60000;
      
      await prisma.emailLog.update({
        where: { id: email.id },
        data: {
          status: 'RETRY_SCHEDULED',
          retryCount,
          lastError: err.message,
          scheduledFor: new Date(Date.now() + retryDelay)
        }
      });
    }
    
    return { success: false, error: err.message };
  }
}

/**
 * Record email open
 */
async function trackOpen(emailLogId) {
  try {
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId }
    });
    
    if (!emailLog) return false;
    
    // Only track first open
    if (!emailLog.openedAt) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          openedAt: new Date(),
          openCount: 1
        }
      });
    } else {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: {
          openCount: { increment: 1 }
        }
      });
    }
    
    return true;
  } catch (err) {
    logger.error('Failed to track email open', { emailLogId, error: err.message });
    return false;
  }
}

/**
 * Record email link click
 */
async function trackClick(emailLogId, linkIndex, originalUrl) {
  try {
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId }
    });
    
    if (!emailLog) return originalUrl;
    
    // Record click
    const clicks = JSON.parse(emailLog.clicks || '[]');
    clicks.push({
      linkIndex,
      url: originalUrl,
      clickedAt: new Date().toISOString()
    });
    
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: {
        clicks: JSON.stringify(clicks),
        clickCount: clicks.length,
        firstClickAt: emailLog.firstClickAt || new Date()
      }
    });
    
    return originalUrl;
  } catch (err) {
    logger.error('Failed to track email click', { emailLogId, error: err.message });
    return originalUrl;
  }
}

/**
 * Process scheduled emails
 * Call this from a cron job every minute
 */
async function processScheduledEmails() {
  try {
    const scheduledEmails = await prisma.emailLog.findMany({
      where: {
        status: { in: ['QUEUED', 'RETRY_SCHEDULED'] },
        scheduledFor: { lte: new Date() }
      },
      orderBy: [
        { priority: 'asc' },
        { scheduledFor: 'asc' }
      ],
      take: QUEUE_CONFIG.batchSize
    });
    
    for (const email of scheduledEmails) {
      const metadata = email.metadata ? JSON.parse(email.metadata) : {};
      
      emailQueue.push({
        id: email.id,
        to: email.to,
        subject: email.subject,
        text: metadata.text,
        html: metadata.html,
        ...metadata
      });
    }
    
    if (scheduledEmails.length > 0 && !processingQueue) {
      processQueue();
    }
    
    return { processed: scheduledEmails.length };
  } catch (err) {
    logger.error('Failed to process scheduled emails', { error: err.message });
    return { processed: 0, error: err.message };
  }
}

/**
 * Get email delivery statistics
 */
async function getEmailStats(startDate, endDate) {
  try {
    const stats = await prisma.emailLog.groupBy({
      by: ['status'],
      _count: true,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate || new Date()
        }
      }
    });
    
    const totals = await prisma.emailLog.aggregate({
      _count: true,
      _sum: {
        openCount: true,
        clickCount: true
      },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate || new Date()
        }
      }
    });
    
    const byTemplate = await prisma.emailLog.groupBy({
      by: ['template'],
      _count: true,
      where: {
        status: 'SENT',
        createdAt: {
          gte: startDate,
          lte: endDate || new Date()
        }
      }
    });
    
    return {
      byStatus: stats.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {}),
      totals: {
        sent: totals._count,
        opens: totals._sum?.openCount || 0,
        clicks: totals._sum?.clickCount || 0,
        openRate: totals._count > 0 ? (totals._sum?.openCount || 0) / totals._count : 0,
        clickRate: totals._count > 0 ? (totals._sum?.clickCount || 0) / totals._count : 0
      },
      byTemplate: byTemplate.map(t => ({ template: t.template, count: t._count }))
    };
  } catch (err) {
    logger.error('Failed to get email stats', { error: err.message });
    return null;
  }
}

/**
 * Bulk send emails (for newsletters, announcements)
 */
async function sendBulkEmails(emails, options = {}) {
  const { batchDelay = 1000 } = options;
  const results = { success: 0, failed: 0 };
  
  for (let i = 0; i < emails.length; i += QUEUE_CONFIG.batchSize) {
    const batch = emails.slice(i, i + QUEUE_CONFIG.batchSize);
    
    for (const email of batch) {
      try {
        await queueEmail(email);
        results.success++;
      } catch (err) {
        results.failed++;
      }
    }
    
    // Delay between batches
    if (i + QUEUE_CONFIG.batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }
  
  return results;
}

export {
  queueEmail,
  processQueue,
  processScheduledEmails,
  trackOpen,
  trackClick,
  getEmailStats,
  sendBulkEmails,
  QUEUE_CONFIG
};
