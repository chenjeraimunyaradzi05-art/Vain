/**
 * Webhook Management Routes (Enterprise)
 * 
 * Create, manage, and test outbound webhooks for event notifications.
 * This is separate from the Stripe webhook handler.
 */

import express from 'express';
import crypto from 'crypto';
import { prisma } from '../db';
import requireAuth from '../middleware/auth';
import { 
  WEBHOOK_EVENTS, 
  triggerWebhook, 
  getDeliveryStats 
} from '../lib/webhookDelivery';

const router = express.Router();

/**
 * Generate a webhook secret
 */
function generateSecret() {
  return 'whsec_' + crypto.randomBytes(24).toString('hex');
}

/**
 * GET /webhook-endpoints
 * List webhooks for the authenticated company
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const webhooks = await prisma.webhook.findMany({
      where: { companyId: company.id },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        retryCount: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Parse events JSON
    const parsed = webhooks.map(w => ({
      ...w,
      events: JSON.parse(w.events || '[]')
    }));
    
    res.json({ webhooks: parsed });
  } catch (err) {
    console.error('Failed to list webhooks:', err);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

/**
 * GET /webhook-endpoints/events
 * List available webhook event types
 */
router.get('/events', requireAuth, (req, res) => {
  res.json({ events: WEBHOOK_EVENTS });
});

/**
 * POST /webhook-endpoints
 * Create a new webhook
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { name, url, events = [] } = req.body;
    
    if (!name || name.length < 3) {
      return void res.status(400).json({ error: 'Name must be at least 3 characters' });
    }
    
    if (!url || !url.startsWith('https://')) {
      return void res.status(400).json({ error: 'URL must be a valid HTTPS URL' });
    }
    
    if (!Array.isArray(events) || events.length === 0) {
      return void res.status(400).json({ error: 'At least one event type is required' });
    }
    
    // Validate event types
    const validEvents = Object.keys(WEBHOOK_EVENTS);
    const invalidEvents = events.filter(e => e !== '*' && !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return void res.status(400).json({ 
        error: 'Invalid event types', 
        invalid: invalidEvents,
        valid: validEvents 
      });
    }
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Check webhook limit (max 10 per company)
    const existingCount = await prisma.webhook.count({
      where: { companyId: company.id }
    });
    
    if (existingCount >= 10) {
      return void res.status(400).json({ error: 'Maximum 10 webhooks per company' });
    }
    
    const secret = generateSecret();
    
    const webhook = await prisma.webhook.create({
      data: {
        companyId: company.id,
        name,
        url,
        secret,
        events: JSON.stringify(events),
        isActive: true
      }
    });
    
    res.status(201).json({
      webhook: {
        id: webhook.id,
        name: webhook.name,
        url: webhook.url,
        events: JSON.parse(webhook.events),
        isActive: webhook.isActive,
        createdAt: webhook.createdAt
      },
      // Secret only shown once!
      secret,
      warning: 'Save this secret securely. It cannot be retrieved again.'
    });
  } catch (err) {
    console.error('Failed to create webhook:', err);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * PATCH /webhook-endpoints/:id
 * Update a webhook
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;
    const { name, url, events, isActive, retryCount, retryDelay } = req.body;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: { id, companyId: company.id }
    });
    
    if (!webhook) {
      return void res.status(404).json({ error: 'Webhook not found' });
    }
    
    const updateData: any = {};
    
    if (name !== undefined) {
      if (name.length < 3) {
        return void res.status(400).json({ error: 'Name must be at least 3 characters' });
      }
      updateData.name = name;
    }
    
    if (url !== undefined) {
      if (!url.startsWith('https://')) {
        return void res.status(400).json({ error: 'URL must be a valid HTTPS URL' });
      }
      updateData.url = url;
    }
    
    if (events !== undefined) {
      const validEvents = Object.keys(WEBHOOK_EVENTS);
      const invalidEvents = events.filter(e => e !== '*' && !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return void res.status(400).json({ error: 'Invalid event types', invalid: invalidEvents });
      }
      updateData.events = JSON.stringify(events);
    }
    
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (retryCount !== undefined) updateData.retryCount = Math.min(Math.max(1, retryCount), 10);
    if (retryDelay !== undefined) updateData.retryDelay = Math.min(Math.max(10, retryDelay), 3600);
    
    const updated = await prisma.webhook.update({
      where: { id },
      data: updateData
    });
    
    res.json({
      webhook: {
        id: updated.id,
        name: updated.name,
        url: updated.url,
        events: JSON.parse(updated.events),
        isActive: updated.isActive,
        retryCount: updated.retryCount,
        retryDelay: updated.retryDelay,
        updatedAt: updated.updatedAt
      }
    });
  } catch (err) {
    console.error('Failed to update webhook:', err);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * DELETE /webhook-endpoints/:id
 * Delete a webhook
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    // Verify ownership
    const webhook = await prisma.webhook.findFirst({
      where: { id, companyId: company.id }
    });
    
    if (!webhook) {
      return void res.status(404).json({ error: 'Webhook not found' });
    }
    
    await prisma.webhook.delete({ where: { id } });
    
    res.json({ success: true, message: 'Webhook deleted' });
  } catch (err) {
    console.error('Failed to delete webhook:', err);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

/**
 * POST /webhook-endpoints/:id/rotate-secret
 * Rotate the webhook secret
 */
router.post('/:id/rotate-secret', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const webhook = await prisma.webhook.findFirst({
      where: { id, companyId: company.id }
    });
    
    if (!webhook) {
      return void res.status(404).json({ error: 'Webhook not found' });
    }
    
    const newSecret = generateSecret();
    
    await prisma.webhook.update({
      where: { id },
      data: { secret: newSecret }
    });
    
    res.json({
      secret: newSecret,
      warning: 'Save this secret securely. The old secret is now invalid.'
    });
  } catch (err) {
    console.error('Failed to rotate webhook secret:', err);
    res.status(500).json({ error: 'Failed to rotate secret' });
  }
});

/**
 * POST /webhook-endpoints/:id/test
 * Send a test webhook delivery
 */
router.post('/:id/test', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const webhook = await prisma.webhook.findFirst({
      where: { id, companyId: company.id }
    });
    
    if (!webhook) {
      return void res.status(404).json({ error: 'Webhook not found' });
    }
    
    // Create test payload
    const testPayload = {
      test: true,
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString()
    };
    
    // Trigger the webhook
    await triggerWebhook(company.id, 'test.ping', testPayload);
    
    res.json({ 
      success: true, 
      message: 'Test webhook queued for delivery' 
    });
  } catch (err) {
    console.error('Failed to send test webhook:', err);
    res.status(500).json({ error: 'Failed to send test webhook' });
  }
});

/**
 * GET /webhook-endpoints/:id/deliveries
 * List recent deliveries for a webhook
 */
router.get('/:id/deliveries', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { id } = req.params;
    const { limit = 20, status } = req.query;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const webhook = await prisma.webhook.findFirst({
      where: { id, companyId: company.id }
    });
    
    if (!webhook) {
      return void res.status(404).json({ error: 'Webhook not found' });
    }
    
    const where: any = { webhookId: id };
    if (status) where.status = status.toUpperCase();
    
    const deliveries = await prisma.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 20, 100)
    });
    
    res.json({
      deliveries: deliveries.map(d => ({
        id: d.id,
        eventType: d.eventType,
        status: d.status,
        statusCode: d.statusCode,
        attempts: d.attempts,
        deliveredAt: d.deliveredAt,
        createdAt: d.createdAt
      }))
    });
  } catch (err) {
    console.error('Failed to list deliveries:', err);
    res.status(500).json({ error: 'Failed to list deliveries' });
  }
});

/**
 * GET /webhook-endpoints/stats
 * Get delivery statistics
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id || req.user.userId;
    const { days = 7 } = req.query;
    
    const company = await prisma.companyProfile.findFirst({
      where: { userId }
    });
    
    if (!company) {
      return void res.status(403).json({ error: 'Company profile required' });
    }
    
    const stats = await getDeliveryStats(company.id, parseInt(days));
    
    res.json({ stats });
  } catch (err) {
    console.error('Failed to get webhook stats:', err);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;


