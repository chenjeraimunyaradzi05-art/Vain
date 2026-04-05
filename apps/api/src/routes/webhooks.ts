"use strict";

/**
 * Stripe Webhook Handler
 * 
 * Handles Stripe subscription lifecycle events:
 * - checkout.session.completed: New subscription created
 * - invoice.payment_succeeded: Renewal payment successful
 * - invoice.payment_failed: Payment failed
 * - customer.subscription.updated: Subscription changed
 * - customer.subscription.deleted: Subscription cancelled
 */
import express from 'express';
import { prisma } from '../db';
import * as stripeLib from '../lib/stripe';
import { sendMail } from '../lib/mailer';
import { paymentFailedTemplate } from '../lib/emailTemplates';

const router = express.Router();

/**
 * Stripe expects raw body for webhook signature verification
 * This route must be mounted with express.raw() middleware
 */
router.post('/stripe', async (req, res) => {
  const signatureHeader = req.headers['stripe-signature'];
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

  // In test/development mode without Stripe, just acknowledge
  if (!stripeLib.stripe) {
    console.log('[Webhook] Stripe not configured, skipping webhook processing');
    return void res.json({ received: true, mode: 'mock' });
  }

  if (!signature) {
    console.error('[Webhook] Missing stripe-signature header');
    return void res.status(400).json({ error: 'Missing signature' });
  }

  let event;
  try {
    event = stripeLib.constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err.message);
    return void res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`[Webhook] Error processing ${event.type}:`, err);
    // Return 200 to prevent Stripe retries for business logic errors
    res.json({ received: true, error: err.message });
  }
});

/**
 * Handle checkout.session.completed
 * Called when a customer completes the Stripe Checkout flow
 */
async function handleCheckoutCompleted(session) {
  const { customer: customerId, subscription: subscriptionId, metadata } = session;
  const userId = metadata?.userId;
  const tier = metadata?.tier;

  if (!userId) {
    console.error('[Webhook] checkout.session.completed missing userId in metadata');
    return;
  }

  console.log(`[Webhook] Checkout completed for user ${userId}, tier ${tier}`);

  // Retrieve full subscription details
  let subscription;
  if (stripeLib.stripe && subscriptionId) {
    subscription = await stripeLib.getSubscription(subscriptionId);
  }

  // Update the company subscription record
  await prisma.companySubscription.upsert({
    where: { userId },
    create: {
      userId,
      tier: tier || 'STARTER',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodStart: subscription?.current_period_start 
        ? new Date(subscription.current_period_start * 1000) 
        : new Date(),
      currentPeriodEnd: subscription?.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null,
      cancelAtPeriodEnd: false,
    },
    update: {
      tier: tier || 'STARTER',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      currentPeriodStart: subscription?.current_period_start 
        ? new Date(subscription.current_period_start * 1000) 
        : new Date(),
      currentPeriodEnd: subscription?.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null,
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`[Webhook] Subscription activated for user ${userId}`);
}

/**
 * Handle invoice.payment_succeeded
 * Called when a subscription renewal payment succeeds
 */
async function handlePaymentSucceeded(invoice) {
  const { customer: customerId, subscription: subscriptionId, id: invoiceId, amount_paid, hosted_invoice_url, invoice_pdf, period_start, period_end } = invoice;

  // Find user by Stripe customer ID
  const companySubscription = await prisma.companySubscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!companySubscription) {
    console.log(`[Webhook] No subscription found for customer ${customerId}`);
    return;
  }

  console.log(`[Webhook] Payment succeeded for user ${companySubscription.userId}`);

  // Create or update invoice record
  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoiceId },
    create: {
      userId: companySubscription.userId,
      stripeInvoiceId: invoiceId,
      amount: amount_paid,
      currency: 'aud',
      status: 'paid',
      invoiceUrl: hosted_invoice_url,
      invoicePdf: invoice_pdf,
      periodStart: period_start ? new Date(period_start * 1000) : null,
      periodEnd: period_end ? new Date(period_end * 1000) : null,
      paidAt: new Date(),
    },
    update: {
      amount: amount_paid,
      status: 'paid',
      invoiceUrl: hosted_invoice_url,
      invoicePdf: invoice_pdf,
      paidAt: new Date(),
    },
  });

  // Update subscription period dates
  if (subscriptionId) {
    await prisma.companySubscription.update({
      where: { userId: companySubscription.userId },
      data: {
        currentPeriodStart: period_start ? new Date(period_start * 1000) : undefined,
        currentPeriodEnd: period_end ? new Date(period_end * 1000) : undefined,
      },
    });
  }
}

/**
 * Handle invoice.payment_failed
 * Called when a subscription renewal payment fails
 */
async function handlePaymentFailed(invoice) {
  const { customer: customerId, id: invoiceId, amount_due, hosted_invoice_url } = invoice;

  const companySubscription = await prisma.companySubscription.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!companySubscription) {
    console.log(`[Webhook] No subscription found for customer ${customerId}`);
    return;
  }

  console.warn(`[Webhook] Payment failed for user ${companySubscription.userId}`);

  // Create invoice record with failed status
  await prisma.invoice.upsert({
    where: { stripeInvoiceId: invoiceId },
    create: {
      userId: companySubscription.userId,
      stripeInvoiceId: invoiceId,
      amount: amount_due,
      currency: 'aud',
      status: 'failed',
      invoiceUrl: hosted_invoice_url,
    },
    update: {
      status: 'failed',
    },
  });

  // Send payment failed notification email
  try {
    const user = await prisma.user.findUnique({
      where: { id: companySubscription.userId },
      select: { email: true },
    });

    if (user?.email) {
      const emailContent = paymentFailedTemplate({
        amount: amount_due,
        invoiceUrl: hosted_invoice_url,
        billingUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/company/billing`,
      });

      await sendMail({
        to: user.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html,
      });

      console.log(`[Webhook] Payment failed email sent to ${user.email}`);
    }
  } catch (emailErr) {
    console.error('[Webhook] Failed to send payment failed email:', emailErr);
  }
}

/**
 * Handle customer.subscription.updated
 * Called when subscription is modified (tier change, cancellation scheduled, etc.)
 */
async function handleSubscriptionUpdated(subscription) {
  const { id: subscriptionId, customer: customerId, cancel_at_period_end, current_period_start, current_period_end, items } = subscription;

  const companySubscription = await prisma.companySubscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!companySubscription) {
    console.log(`[Webhook] No subscription found for ${subscriptionId}`);
    return;
  }

  console.log(`[Webhook] Subscription updated for user ${companySubscription.userId}`);

  // Determine tier from price ID
  const priceId = items?.data?.[0]?.price?.id;
  const tier = priceId ? stripeLib.priceIdToTier(priceId) : companySubscription.tier;

  await prisma.companySubscription.update({
    where: { userId: companySubscription.userId },
    data: {
      tier,
      cancelAtPeriodEnd: cancel_at_period_end,
      currentPeriodStart: current_period_start ? new Date(current_period_start * 1000) : undefined,
      currentPeriodEnd: current_period_end ? new Date(current_period_end * 1000) : undefined,
    },
  });
}

/**
 * Handle customer.subscription.deleted
 * Called when subscription is fully cancelled (after period end)
 */
async function handleSubscriptionDeleted(subscription) {
  const { id: subscriptionId, customer: customerId } = subscription;

  const companySubscription = await prisma.companySubscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!companySubscription) {
    console.log(`[Webhook] No subscription found for ${subscriptionId}`);
    return;
  }

  console.log(`[Webhook] Subscription deleted for user ${companySubscription.userId}`);

  // Downgrade to FREE tier
  await prisma.companySubscription.update({
    where: { userId: companySubscription.userId },
    data: {
      tier: 'FREE',
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });
}

// Test endpoint for E2E tests (non-production only)
router.post('/stripe/test', async (req, res) => {
  const nodeEnv = String(process.env.NODE_ENV || 'development').toLowerCase();
  if (nodeEnv === 'production') {
    return void res.status(404).json({ error: 'Not found' });
  }

  const { eventType, data } = req.body;

  console.log(`[Webhook Test] Simulating event: ${eventType}`);

  try {
    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(data);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(data);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(data);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(data);
        break;
      default:
        return void res.json({ received: true, message: 'Unknown event type' });
    }

    res.json({ received: true, eventType });
  } catch (err) {
    console.error(`[Webhook Test] Error:`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;


