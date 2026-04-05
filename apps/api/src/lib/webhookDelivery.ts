/**
 * Webhook Delivery System
 * 
 * Handles outbound webhook delivery with retry logic,
 * HMAC signing, and delivery tracking.
 */

import crypto from 'crypto';
import { prisma } from '../db';
import logger from './logger';

/**
 * Sign a webhook payload using HMAC-SHA256
 */
function signPayload(payload, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

/**
 * Available webhook event types
 */
const WEBHOOK_EVENTS = {
  // Job events
  'job.created': 'A new job was posted',
  'job.updated': 'A job was updated',
  'job.closed': 'A job was closed',
  'job.expired': 'A job expired',
  
  // Application events
  'application.received': 'New application received',
  'application.reviewed': 'Application was reviewed',
  'application.shortlisted': 'Candidate was shortlisted',
  'application.rejected': 'Candidate was rejected',
  'application.hired': 'Candidate was hired',
  
  // Candidate events
  'candidate.profile_updated': 'Candidate profile was updated',
  'candidate.document_uploaded': 'Candidate uploaded a document',
  
  // Course events
  'course.enrolment': 'New course enrolment',
  'course.completion': 'Course completed',
  
  // RAP events
  'rap.points_earned': 'RAP points were earned',
  'rap.milestone_reached': 'RAP milestone was reached',
  'rap.certification_upgraded': 'RAP certification level upgraded'
};

/**
 * Trigger webhook delivery for an event
 * 
 * @param {string} companyId - Company to send webhook to
 * @param {string} eventType - Event type (e.g., 'application.received')
 * @param {object} payload - Event payload data
 */
async function triggerWebhook(companyId, eventType, payload) {
  try {
    // Find active webhooks for this company and event
    const webhooks = await prisma.webhook.findMany({
      where: {
        companyId,
        isActive: true
      }
    });
    
    // Filter webhooks that subscribe to this event
    const matchingWebhooks = webhooks.filter(webhook => {
      const events = JSON.parse(webhook.events || '[]');
      return events.includes(eventType) || events.includes('*');
    });
    
    if (matchingWebhooks.length === 0) {
      return { triggered: 0 };
    }
    
    // Create delivery records
    const deliveries = await Promise.all(
      matchingWebhooks.map(webhook =>
        prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            eventType,
            payload: JSON.stringify(payload),
            status: 'PENDING'
          }
        })
      )
    );
    
    // Process deliveries asynchronously
    deliveries.forEach(delivery => {
      processDelivery(delivery.id).catch(err => {
        logger.error('Webhook delivery failed', { deliveryId: delivery.id, error: err.message });
      });
    });
    
    return { triggered: deliveries.length };
  } catch (err) {
    logger.error('Failed to trigger webhooks', { companyId, eventType, error: err.message });
    throw err;
  }
}

/**
 * Process a single webhook delivery
 */
async function processDelivery(deliveryId) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true }
  });
  
  if (!delivery || delivery.status === 'DELIVERED') {
    return;
  }
  
  const { webhook } = delivery;
  const payload = JSON.parse(delivery.payload);
  
  // Add metadata to payload
  const fullPayload = {
    id: delivery.id,
    event: delivery.eventType,
    timestamp: new Date().toISOString(),
    data: payload
  };
  
  // Sign the payload
  const signature = signPayload(fullPayload, webhook.secret);
  
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': delivery.eventType,
        'X-Webhook-Delivery': delivery.id,
        'User-Agent': 'Ngurra-Pathways-Webhook/1.0'
      },
      body: JSON.stringify(fullPayload),
      signal: AbortSignal.timeout(30000) // 30s timeout
    });
    
    const responseText = await response.text().catch(() => '');
    
    if (response.ok) {
      // Success
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'DELIVERED',
          statusCode: response.status,
          response: responseText.substring(0, 1000),
          attempts: delivery.attempts + 1,
          deliveredAt: new Date()
        }
      });
      
      logger.info('Webhook delivered', {
        deliveryId,
        webhookId: webhook.id,
        event: delivery.eventType,
        statusCode: response.status
      });
    } else {
      // Failed - schedule retry
      await scheduleRetry(deliveryId, delivery.attempts + 1, webhook.retryCount, webhook.retryDelay, {
        statusCode: response.status,
        response: responseText.substring(0, 1000)
      });
    }
  } catch (err) {
    // Network error - schedule retry
    await scheduleRetry(deliveryId, delivery.attempts + 1, webhook.retryCount, webhook.retryDelay, {
      error: err.message
    });
  }
}

/**
 * Schedule a retry for failed delivery
 */
async function scheduleRetry(deliveryId, attempts, maxRetries, retryDelay, failureInfo) {
  if (attempts >= maxRetries) {
    // Max retries exceeded
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status: 'FAILED',
        attempts,
        statusCode: failureInfo.statusCode || null,
        response: failureInfo.response || failureInfo.error
      }
    });
    
    logger.warn('Webhook delivery failed permanently', {
      deliveryId,
      attempts,
      ...failureInfo
    });
    return;
  }
  
  // Exponential backoff: delay * 2^(attempt-1)
  const backoffDelay = retryDelay * Math.pow(2, attempts - 1);
  const nextRetryAt = new Date(Date.now() + backoffDelay * 1000);
  
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: 'PENDING',
      attempts,
      nextRetryAt,
      statusCode: failureInfo.statusCode || null,
      response: failureInfo.response || failureInfo.error
    }
  });
  
  logger.info('Webhook retry scheduled', {
    deliveryId,
    attempts,
    nextRetryAt: nextRetryAt.toISOString()
  });
}

/**
 * Process pending retries
 * Call this periodically (e.g., every minute via cron)
 */
async function processPendingRetries() {
  const now = new Date();
  
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      status: 'PENDING',
      nextRetryAt: { lte: now }
    },
    take: 100 // Process in batches
  });
  
  logger.info(`Processing ${pendingDeliveries.length} pending webhook retries`);
  
  for (const delivery of pendingDeliveries) {
    await processDelivery(delivery.id).catch(err => {
      logger.error('Retry processing failed', { deliveryId: delivery.id, error: err.message });
    });
  }
  
  return { processed: pendingDeliveries.length };
}

/**
 * Get delivery statistics for a company
 */
async function getDeliveryStats(companyId, days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  const webhooks = await prisma.webhook.findMany({
    where: { companyId },
    select: { id: true }
  });
  
  const webhookIds = webhooks.map(w => w.id);
  
  const [total, delivered, failed, pending] = await Promise.all([
    prisma.webhookDelivery.count({
      where: { webhookId: { in: webhookIds }, createdAt: { gte: since } }
    }),
    prisma.webhookDelivery.count({
      where: { webhookId: { in: webhookIds }, status: 'DELIVERED', createdAt: { gte: since } }
    }),
    prisma.webhookDelivery.count({
      where: { webhookId: { in: webhookIds }, status: 'FAILED', createdAt: { gte: since } }
    }),
    prisma.webhookDelivery.count({
      where: { webhookId: { in: webhookIds }, status: 'PENDING', createdAt: { gte: since } }
    })
  ]);
  
  return {
    period: `${days} days`,
    total,
    delivered,
    failed,
    pending,
    successRate: total > 0 ? ((delivered / total) * 100).toFixed(1) + '%' : 'N/A'
  };
}

// ============================================
// Step 48: Enhanced Webhook Features
// ============================================

/**
 * Verify incoming webhook signature
 * Use this to validate webhook requests from external services
 * @param {object} payload - Request body
 * @param {string} signature - Signature from header
 * @param {string} secret - Webhook secret
 * @param {object} options - Verification options
 */
function verifyWebhookSignature(payload, signature, secret, options: any = {}) {
  const { algorithm = 'sha256', encoding = 'hex', timestampTolerance = 300 } = options;
  
  if (!signature || !secret) {
    return { valid: false, error: 'Missing signature or secret' };
  }
  
  // Handle different signature formats
  let signatureValue = signature;
  let timestamp: number | null = null;
  
  // Parse Stripe-style signature: t=timestamp,v1=signature
  if (signature.includes('t=')) {
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    timestamp = parseInt(parts.t, 10);
    signatureValue = parts.v1;
    
    // Verify timestamp is recent
    if (timestamp) {
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > timestampTolerance) {
        return { valid: false, error: 'Timestamp too old' };
      }
    }
  }
  
  // Compute expected signature
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signedPayload = timestamp ? `${timestamp}.${payloadString}` : payloadString;
  
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(signedPayload)
    .digest(encoding);
  
  // Constant-time comparison to prevent timing attacks
  const valid = crypto.timingSafeEqual(
    Buffer.from(signatureValue),
    Buffer.from(expectedSignature)
  );
  
  return { valid, timestamp };
}

/**
 * Test webhook endpoint
 * Sends a test event to verify the endpoint is working
 * @param {string} webhookId - Webhook ID to test
 */
async function testWebhook(webhookId) {
  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId }
  });
  
  if (!webhook) {
    throw new Error('Webhook not found');
  }
  
  const testPayload = {
    event: 'test.ping',
    timestamp: new Date().toISOString(),
    data: {
      message: 'This is a test event from Ngurra Pathways',
      webhookId
    }
  };
  
  const signature = signPayload(testPayload, webhook.secret);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'test.ping',
        'X-Webhook-Test': 'true',
        'User-Agent': 'Ngurra-Pathways-Webhook/1.0'
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000) // 10s timeout for test
    });
    
    const responseTime = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');
    
    // Log test result
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType: 'test.ping',
        payload: JSON.stringify(testPayload),
        status: response.ok ? 'DELIVERED' : 'FAILED',
        statusCode: response.status,
        response: responseBody.substring(0, 1000),
        attempts: 1,
        deliveredAt: response.ok ? new Date() : null
      }
    });
    
    return {
      success: response.ok,
      statusCode: response.status,
      responseTime,
      response: responseBody.substring(0, 500),
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (err) {
    const responseTime = Date.now() - startTime;
    
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType: 'test.ping',
        payload: JSON.stringify(testPayload),
        status: 'FAILED',
        response: err.message,
        attempts: 1
      }
    });
    
    return {
      success: false,
      error: err.message,
      responseTime
    };
  }
}

/**
 * Create webhook with templates
 * @param {object} data - Webhook configuration
 */
async function createWebhook(data) {
  const {
    companyId,
    url,
    events,
    name = 'Webhook',
    description = '',
    retryCount = 3,
    retryDelay = 60 // seconds
  } = data;
  
  // Validate URL
  try {
    new URL(url);
  } catch (e) {
    throw new Error('Invalid webhook URL');
  }
  
  // Generate secret
  const secret = crypto.randomBytes(32).toString('hex');
  
  const webhook = await prisma.webhook.create({
    data: {
      companyId,
      name,
      // description, // Removed as it does not exist in schema
      url,
      secret,
      events: JSON.stringify(events),
      retryCount,
      retryDelay,
      isActive: true
    }
  });
  
  return {
    ...webhook,
    secret // Return secret once on creation
  };
}

/**
 * Regenerate webhook secret
 * @param {string} webhookId - Webhook ID
 */
async function regenerateSecret(webhookId) {
  const newSecret = crypto.randomBytes(32).toString('hex');
  
  await prisma.webhook.update({
    where: { id: webhookId },
    data: { secret: newSecret }
  });
  
  return { secret: newSecret };
}

/**
 * Get recent deliveries for a webhook
 * @param {string} webhookId - Webhook ID
 * @param {number} limit - Number of deliveries to return
 */
async function getRecentDeliveries(webhookId, limit = 20) {
  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
  
  return deliveries.map(d => ({
    id: d.id,
    eventType: d.eventType,
    status: d.status,
    statusCode: d.statusCode,
    attempts: d.attempts,
    createdAt: d.createdAt,
    deliveredAt: d.deliveredAt,
    responsePreview: d.response?.substring(0, 100)
  }));
}

/**
 * Replay a failed delivery
 * @param {string} deliveryId - Delivery ID to replay
 */
async function replayDelivery(deliveryId) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: true }
  });
  
  if (!delivery) {
    throw new Error('Delivery not found');
  }
  
  // Create a new delivery with the same payload
  const newDelivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: delivery.webhookId,
      eventType: delivery.eventType,
      payload: delivery.payload,
      status: 'PENDING'
    }
  });
  
  // Process immediately
  await processDelivery(newDelivery.id);
  
  // Get updated status
  const result = await prisma.webhookDelivery.findUnique({
    where: { id: newDelivery.id }
  });
  
  return {
    originalId: deliveryId,
    replayId: newDelivery.id,
    status: result?.status,
    statusCode: result?.statusCode
  };
}

/**
 * Get webhook event templates
 * Returns sample payloads for each event type
 */
function getEventTemplates() {
  return {
    'job.created': {
      event: 'job.created',
      timestamp: new Date().toISOString(),
      data: {
        jobId: 'job_sample123',
        title: 'Software Developer',
        location: 'Sydney, NSW',
        employmentType: 'FULL_TIME',
        postedAt: new Date().toISOString()
      }
    },
    'application.received': {
      event: 'application.received',
      timestamp: new Date().toISOString(),
      data: {
        applicationId: 'app_sample123',
        jobId: 'job_sample123',
        candidate: {
          name: 'Sample Candidate',
          email: 'candidate@example.com'
        },
        submittedAt: new Date().toISOString()
      }
    },
    'application.status_changed': {
      event: 'application.status_changed',
      timestamp: new Date().toISOString(),
      data: {
        applicationId: 'app_sample123',
        previousStatus: 'RECEIVED',
        newStatus: 'SHORTLISTED',
        changedAt: new Date().toISOString()
      }
    },
    'interview.scheduled': {
      event: 'interview.scheduled',
      timestamp: new Date().toISOString(),
      data: {
        interviewId: 'int_sample123',
        applicationId: 'app_sample123',
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'video',
        meetingLink: 'https://meet.example.com/abc123'
      }
    }
  };
}

/**
 * Validate webhook URL is reachable
 * @param {string} url - URL to validate
 */
async function validateWebhookUrl(url) {
  try {
    new URL(url);
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  // Must be HTTPS in production
  if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
    return { valid: false, error: 'HTTPS required in production' };
  }
  
  // Try HEAD request to check if reachable
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    return {
      valid: true,
      statusCode: response.status,
      reachable: response.status < 500
    };
  } catch (err) {
    return {
      valid: true, // URL format is valid
      reachable: false,
      error: err.message
    };
  }
}

export {
  WEBHOOK_EVENTS,
  triggerWebhook,
  processDelivery,
  processPendingRetries,
  getDeliveryStats,
  signPayload,
  // Step 48 additions
  verifyWebhookSignature,
  testWebhook,
  createWebhook,
  regenerateSecret,
  getRecentDeliveries,
  replayDelivery,
  getEventTemplates,
  validateWebhookUrl
};

