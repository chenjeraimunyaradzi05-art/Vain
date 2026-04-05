/**
 * Webhook Handler Service
 * 
 * Centralized webhook processing for:
 * - Stripe payment events
 * - SendGrid email events
 * - Twilio SMS events
 * - External integrations (ATS, HRIS)
 * - Calendar integrations
 */

import { prisma } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';
import crypto from 'crypto';

// Types
export interface WebhookEvent {
  id: string;
  source: WebhookSource;
  type: string;
  payload: Record<string, unknown>;
  signature?: string;
  timestamp: Date;
  processed: boolean;
  error?: string;
}

export type WebhookSource = 
  | 'stripe'
  | 'sendgrid'
  | 'twilio'
  | 'google_calendar'
  | 'microsoft_calendar'
  | 'custom';

export interface WebhookConfig {
  id: string;
  userId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
  deliveredAt?: Date;
  retryCount: number;
  nextRetryAt?: Date;
}

// Webhook signature secrets (from env)
const WEBHOOK_SECRETS: Record<WebhookSource, string | undefined> = {
  stripe: process.env.STRIPE_WEBHOOK_SECRET,
  sendgrid: process.env.SENDGRID_WEBHOOK_SECRET,
  twilio: process.env.TWILIO_WEBHOOK_SECRET,
  google_calendar: process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET,
  microsoft_calendar: process.env.MICROSOFT_CALENDAR_WEBHOOK_SECRET,
  custom: undefined,
};

class WebhookHandlerService {
  private static instance: WebhookHandlerService;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS = [1000, 5000, 30000, 120000, 600000]; // 1s, 5s, 30s, 2m, 10m

  private constructor() {}

  static getInstance(): WebhookHandlerService {
    if (!WebhookHandlerService.instance) {
      WebhookHandlerService.instance = new WebhookHandlerService();
    }
    return WebhookHandlerService.instance;
  }

  // ==================== Inbound Webhook Processing ====================

  /**
   * Process an incoming webhook
   */
  async processWebhook(
    source: WebhookSource,
    payload: Record<string, unknown>,
    signature: string,
    rawBody: string
  ): Promise<{ success: boolean; eventId: string }> {
    const eventId = `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      // Verify signature
      if (!this.verifySignature(source, signature, rawBody)) {
        logger.warn('Webhook signature verification failed', { source, eventId });
        throw new Error('Invalid webhook signature');
      }

      // Check for duplicate
      const eventIdentifier = this.getEventIdentifier(source, payload);
      const isDuplicate = await this.isDuplicateEvent(eventIdentifier);
      if (isDuplicate) {
        logger.info('Duplicate webhook ignored', { source, eventId, eventIdentifier });
        return { success: true, eventId };
      }

      // Mark as processed to prevent duplicates
      await this.markEventProcessed(eventIdentifier);

      // Route to appropriate handler
      await this.routeWebhook(source, payload, eventId);

      logger.info('Webhook processed successfully', { source, eventId });
      return { success: true, eventId };
    } catch (error) {
      logger.error('Webhook processing failed', { source, eventId, error });
      
      // Store failed event for retry
      await this.storeFailedEvent(source, payload, eventId, error as Error);
      
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(source: WebhookSource, signature: string, rawBody: string): boolean {
    const secret = WEBHOOK_SECRETS[source];
    if (!secret) {
      // No secret configured - skip verification (not recommended for production)
      return true;
    }

    switch (source) {
      case 'stripe':
        return this.verifyStripeSignature(signature, rawBody, secret);
      case 'sendgrid':
        return this.verifySendGridSignature(signature, rawBody, secret);
      case 'twilio':
        return this.verifyTwilioSignature(signature, rawBody, secret);
      default:
        return this.verifyGenericSignature(signature, rawBody, secret);
    }
  }

  private verifyStripeSignature(signature: string, rawBody: string, secret: string): boolean {
    // Parse Stripe signature header: t=timestamp,v1=signature
    const elements = signature.split(',');
    const signatureMap: Record<string, string> = {};
    for (const element of elements) {
      const [key, value] = element.split('=');
      signatureMap[key] = value;
    }

    const timestamp = signatureMap['t'];
    const sig = signatureMap['v1'];

    if (!timestamp || !sig) return false;

    const payload = `${timestamp}.${rawBody}`;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig));
  }

  private verifySendGridSignature(signature: string, rawBody: string, secret: string): boolean {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    return signature === expectedSig;
  }

  private verifyTwilioSignature(_signature: string, _rawBody: string, _secret: string): boolean {
    // Twilio uses a different verification method
    // For now, return true - implement proper validation in production
    return true;
  }

  private verifyGenericSignature(signature: string, rawBody: string, secret: string): boolean {
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  }

  /**
   * Get unique identifier for event deduplication
   */
  private getEventIdentifier(source: WebhookSource, payload: Record<string, unknown>): string {
    switch (source) {
      case 'stripe':
        return `stripe:${payload.id}`;
      case 'sendgrid':
        return `sendgrid:${payload.sg_event_id || payload.message_id}`;
      case 'twilio':
        return `twilio:${payload.MessageSid || payload.SmsSid}`;
      default:
        return `${source}:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').substring(0, 16)}`;
    }
  }

  private async isDuplicateEvent(identifier: string): Promise<boolean> {
    const exists = await redisCache.get(`webhook:${identifier}`);
    return exists !== null;
  }

  private async markEventProcessed(identifier: string): Promise<void> {
    await redisCache.set(`webhook:${identifier}`, true, 86400); // 24 hours
  }

  private async storeFailedEvent(
    source: WebhookSource,
    payload: Record<string, unknown>,
    eventId: string,
    error: Error
  ): Promise<void> {
    await redisCache.listPush('webhook:failed', {
      eventId,
      source,
      payload,
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 1000);
  }

  /**
   * Route webhook to appropriate handler
   */
  private async routeWebhook(
    source: WebhookSource,
    payload: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    switch (source) {
      case 'stripe':
        await this.handleStripeWebhook(payload, eventId);
        break;
      case 'sendgrid':
        await this.handleSendGridWebhook(payload, eventId);
        break;
      case 'twilio':
        await this.handleTwilioWebhook(payload, eventId);
        break;
      case 'google_calendar':
      case 'microsoft_calendar':
        await this.handleCalendarWebhook(source, payload, eventId);
        break;
      default:
        logger.warn('Unknown webhook source', { source, eventId });
    }
  }

  // ==================== Stripe Webhooks ====================

  private async handleStripeWebhook(payload: Record<string, unknown>, eventId: string): Promise<void> {
    const eventType = payload.type as string;
    const data = payload.data as { object: Record<string, unknown> };

    switch (eventType) {
      case 'checkout.session.completed':
        await this.handleStripeCheckoutComplete(data.object, eventId);
        break;
      case 'invoice.paid':
        await this.handleStripeInvoicePaid(data.object, eventId);
        break;
      case 'invoice.payment_failed':
        await this.handleStripePaymentFailed(data.object, eventId);
        break;
      case 'customer.subscription.updated':
        await this.handleStripeSubscriptionUpdated(data.object, eventId);
        break;
      case 'customer.subscription.deleted':
        await this.handleStripeSubscriptionDeleted(data.object, eventId);
        break;
      case 'payment_intent.succeeded':
        await this.handleStripePaymentSucceeded(data.object, eventId);
        break;
      case 'account.updated':
        await this.handleStripeAccountUpdated(data.object, eventId);
        break;
      default:
        logger.debug('Unhandled Stripe event', { eventType, eventId });
    }
  }

  private async handleStripeCheckoutComplete(
    session: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const metadata = session.metadata as Record<string, string> | undefined;

    logger.info('Stripe checkout completed', { eventId, customerId, subscriptionId });

    if (subscriptionId) {
      const subscription = await prisma.companySubscription.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (subscription) {
        await prisma.companySubscription.update({
          where: { id: subscription.id },
          data: {
            stripeSubscriptionId: subscriptionId,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        // Create notification
        await prisma.notification.create({
          data: {
            userId: subscription.userId,
            type: 'subscription_activated',
            title: 'Subscription Activated',
            message: `Your ${subscription.tier} subscription is now active.`,
          },
        });
      }
    }

    // Handle RAP certification payment
    if (metadata?.rapLevel) {
      const subscription = await prisma.companySubscription.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (subscription) {
        await prisma.companyProfile.updateMany({
          where: { userId: subscription.userId },
          data: {
            rapCertificationLevel: metadata.rapLevel,
            rapCertifiedAt: new Date(),
          },
        });
      }
    }
  }

  private async handleStripeInvoicePaid(
    invoice: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const customerId = invoice.customer as string;
    
    logger.info('Stripe invoice paid', { eventId, customerId });

    const subscription = await prisma.companySubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      await prisma.invoice.create({
        data: {
          userId: subscription.userId,
          subscriptionId: subscription.id,
          stripeInvoiceId: invoice.id as string,
          amount: invoice.amount_paid as number,
          currency: (invoice.currency as string) || 'aud',
          status: 'paid',
          invoiceUrl: invoice.hosted_invoice_url as string | undefined,
          invoicePdf: invoice.invoice_pdf as string | undefined,
          paidAt: new Date(),
        },
      });
    }
  }

  private async handleStripePaymentFailed(
    invoice: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const customerId = invoice.customer as string;
    
    logger.warn('Stripe payment failed', { eventId, customerId });

    const subscription = await prisma.companySubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      await prisma.companySubscription.update({
        where: { id: subscription.id },
        data: { status: 'past_due' },
      });

      // Send notification
      await prisma.notification.create({
        data: {
          userId: subscription.userId,
          type: 'payment_failed',
          title: 'Payment Failed',
          message: 'Your subscription payment failed. Please update your payment method to avoid service interruption.',
        },
      });
    }
  }

  private async handleStripeSubscriptionUpdated(
    sub: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const customerId = sub.customer as string;
    const status = sub.status as string;
    const currentPeriodEnd = new Date((sub.current_period_end as number) * 1000);

    logger.info('Stripe subscription updated', { eventId, customerId, status });

    const subscription = await prisma.companySubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      await prisma.companySubscription.update({
        where: { id: subscription.id },
        data: {
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancel_at_period_end as boolean,
        },
      });
    }
  }

  private async handleStripeSubscriptionDeleted(
    sub: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const customerId = sub.customer as string;
    
    logger.info('Stripe subscription deleted', { eventId, customerId });

    const subscription = await prisma.companySubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      await prisma.companySubscription.update({
        where: { id: subscription.id },
        data: {
          status: 'canceled',
          tier: 'FREE',
        },
      });

      await prisma.notification.create({
        data: {
          userId: subscription.userId,
          type: 'subscription_canceled',
          title: 'Subscription Canceled',
          message: 'Your subscription has been canceled. You are now on the Free plan.',
        },
      });
    }
  }

  private async handleStripePaymentSucceeded(
    paymentIntent: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const metadata = paymentIntent.metadata as Record<string, string> | undefined;
    
    logger.info('Stripe payment succeeded', { eventId, metadata });

    // Handle featured job payment
    if (metadata?.jobId && metadata?.duration) {
      const duration = parseInt(metadata.duration, 10);
      await prisma.job.update({
        where: { id: metadata.jobId },
        data: {
          isFeatured: true,
          featuredAt: new Date(),
          featuredUntil: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  private async handleStripeAccountUpdated(
    account: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const accountId = account.id as string;
    const chargesEnabled = account.charges_enabled as boolean;
    const payoutsEnabled = account.payouts_enabled as boolean;

    logger.info('Stripe Connect account updated', { eventId, accountId, chargesEnabled, payoutsEnabled });

    // Update mentor profile if both are enabled
    if (chargesEnabled && payoutsEnabled) {
      await prisma.mentorProfile.updateMany({
        where: { stripeAccountId: accountId },
        data: {
          // Mark as ready for payouts
        },
      });
    }
  }

  // ==================== SendGrid Webhooks ====================

  private async handleSendGridWebhook(
    payload: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    // SendGrid sends an array of events
    const events = Array.isArray(payload) ? payload : [payload];

    for (const event of events) {
      const eventName = event.event as string;
      const email = event.email as string;
      const messageId = event.sg_message_id as string;

      switch (eventName) {
        case 'delivered':
          logger.info('Email delivered', { eventId, email, messageId });
          break;
        case 'open':
          logger.info('Email opened', { eventId, email, messageId });
          await this.trackEmailEvent('open', email, messageId);
          break;
        case 'click':
          logger.info('Email link clicked', { eventId, email, messageId, url: event.url });
          await this.trackEmailEvent('click', email, messageId);
          break;
        case 'bounce':
          logger.warn('Email bounced', { eventId, email, messageId, reason: event.reason });
          await this.handleEmailBounce(email, event.reason as string);
          break;
        case 'dropped':
          logger.warn('Email dropped', { eventId, email, messageId, reason: event.reason });
          break;
        case 'spamreport':
          logger.warn('Email marked as spam', { eventId, email, messageId });
          await this.handleSpamReport(email);
          break;
        case 'unsubscribe':
          logger.info('User unsubscribed', { eventId, email });
          await this.handleUnsubscribe(email);
          break;
      }
    }
  }

  private async trackEmailEvent(eventType: string, email: string, messageId: string): Promise<void> {
    await redisCache.zincrby(`email:${eventType}:daily`, 1, new Date().toISOString().split('T')[0]);
    
    // Could also update analytics event
    await prisma.analyticsEvent.create({
      data: {
        eventType: `email_${eventType}`,
        data: JSON.stringify({ email, messageId }),
      },
    });
  }

  private async handleEmailBounce(email: string, reason: string): Promise<void> {
    // Mark email as bounced in user record
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Could add a field to track bounced emails
      logger.warn('Email bounce for user', { userId: user.id, reason });
    }
  }

  private async handleSpamReport(email: string): Promise<void> {
    // Unsubscribe user from marketing emails
    await this.handleUnsubscribe(email);
  }

  private async handleUnsubscribe(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      // Update notification preferences
      await prisma.notificationPreference.updateMany({
        where: { userId: user.id },
        data: {
          marketingEmails: false,
          emailEnabled: false,
        },
      });
    }
  }

  // ==================== Twilio Webhooks ====================

  private async handleTwilioWebhook(
    payload: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const status = payload.MessageStatus || payload.SmsStatus;
    const messageSid = payload.MessageSid || payload.SmsSid;
    const to = payload.To as string;

    switch (status) {
      case 'delivered':
        logger.info('SMS delivered', { eventId, messageSid, to });
        break;
      case 'failed':
      case 'undelivered':
        logger.warn('SMS failed', { eventId, messageSid, to, errorCode: payload.ErrorCode });
        break;
      case 'received':
        // Incoming SMS
        await this.handleIncomingSMS(payload, eventId);
        break;
    }
  }

  private async handleIncomingSMS(
    payload: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    const from = payload.From as string;
    const body = payload.Body as string;

    logger.info('Incoming SMS received', { eventId, from, body: body.substring(0, 50) });

    // Handle STOP/UNSUBSCRIBE
    if (/^(stop|unsubscribe|cancel)$/i.test(body.trim())) {
      // Find user by phone and unsubscribe
      const profile = await prisma.memberProfile.findFirst({
        where: { phone: from },
      });

      if (profile) {
        await prisma.notificationPreference.updateMany({
          where: { userId: profile.userId },
          data: { smsEnabled: false },
        });
      }
    }
  }

  // ==================== Calendar Webhooks ====================

  private async handleCalendarWebhook(
    source: WebhookSource,
    payload: Record<string, unknown>,
    eventId: string
  ): Promise<void> {
    logger.info('Calendar webhook received', { source, eventId });

    // Handle calendar event updates
    const resourceState = payload.resourceState as string;
    
    switch (resourceState) {
      case 'exists':
        // Event was created or updated
        await this.syncCalendarEvent(source, payload);
        break;
      case 'not_exists':
        // Event was deleted
        await this.removeCalendarEvent(payload);
        break;
    }
  }

  private async syncCalendarEvent(
    _source: WebhookSource,
    _payload: Record<string, unknown>
  ): Promise<void> {
    // Sync calendar event with mentor sessions
    // Implementation depends on calendar integration
  }

  private async removeCalendarEvent(_payload: Record<string, unknown>): Promise<void> {
    // Remove calendar event from mentor sessions
  }

  // ==================== Outbound Webhooks ====================

  /**
   * Register a webhook for a company
   */
  async registerWebhook(
    companyId: string,
    name: string,
    url: string,
    events: string[]
  ): Promise<WebhookConfig> {
    const secret = crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhook.create({
      data: {
        companyId,
        name,
        url,
        events: JSON.stringify(events), // events is stored as JSON string
        secret,
        isActive: true,
      },
    });

    return {
      id: webhook.id,
      userId: companyId, // Map to userId for interface compatibility
      url: webhook.url,
      events: JSON.parse(webhook.events), // Parse back to array
      secret: webhook.secret,
      isActive: webhook.isActive,
      createdAt: webhook.createdAt,
    };
  }

  /**
   * Deliver webhook to registered endpoints
   */
  async deliverWebhook(
    eventType: string,
    payload: Record<string, unknown>,
    companyId?: string
  ): Promise<void> {
    // Find webhooks subscribed to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        ...(companyId && { companyId }),
      },
    });

    // Filter by event type (events is JSON string)
    const matchingWebhooks = webhooks.filter(wh => {
      try {
        const events = JSON.parse(wh.events) as string[];
        return events.includes(eventType);
      } catch {
        return false;
      }
    });

    for (const webhook of matchingWebhooks) {
      await this.sendWebhook(webhook, eventType, payload);
    }
  }

  private async sendWebhook(
    webhook: { id: string; url: string; secret: string },
    eventType: string,
    payload: Record<string, unknown>,
    retryCount: number = 0
  ): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: `wh_del_${Date.now()}`,
      type: eventType,
      created: timestamp,
      data: payload,
    });

    // Create signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
          'X-Webhook-ID': webhook.id,
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Webhook delivery failed: ${response.status}`);
      }

      logger.info('Webhook delivered', { webhookId: webhook.id, eventType });
    } catch (error) {
      logger.error('Webhook delivery failed', { 
        webhookId: webhook.id, 
        eventType, 
        retryCount,
        error 
      });

      // Retry with exponential backoff
      if (retryCount < this.MAX_RETRIES) {
        const delay = this.RETRY_DELAYS[retryCount] || 600000;
        setTimeout(() => {
          this.sendWebhook(webhook, eventType, payload, retryCount + 1);
        }, delay);
      }
    }
  }

  // ==================== Retry Processing ====================

  /**
   * Process failed webhooks
   */
  async processFailedWebhooks(): Promise<void> {
    const failed = await redisCache.listRange<{
      eventId: string;
      source: WebhookSource;
      payload: Record<string, unknown>;
      error: string;
      timestamp: string;
    }>('webhook:failed', 0, 100);

    for (const event of failed) {
      try {
        await this.routeWebhook(event.source, event.payload, event.eventId);
        
        // Remove from failed queue
        await redisCache.listRemove('webhook:failed', JSON.stringify(event));
        
        logger.info('Failed webhook reprocessed', { eventId: event.eventId });
      } catch (error) {
        logger.error('Webhook reprocessing failed', { eventId: event.eventId, error });
      }
    }
  }
}

// Export singleton instance
export const webhookHandler = WebhookHandlerService.getInstance();
export default webhookHandler;

