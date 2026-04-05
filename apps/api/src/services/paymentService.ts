/**
 * Payment Service
 * 
 * Handles:
 * - Stripe subscription management
 * - One-time payments
 * - RAP certification payments
 * - Invoice management
 * - Webhook processing
 * - Refunds
 * - Mentor payout processing
 */

import { prisma } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';
import { notificationService } from './notificationService';
import { queueEmail } from '../lib/emailQueue';

// Types
export type SubscriptionTier = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' | 'RAP';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  priceMonthly: number; // cents
  priceYearly: number; // cents
  features: string[];
  jobPostLimit: number;
  featuredJobLimit: number;
  analyticsLevel: 'basic' | 'standard' | 'advanced' | 'enterprise';
  supportLevel: 'email' | 'priority' | 'dedicated';
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export interface CreateSubscriptionParams {
  userId: string;
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
}

export interface PaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface CheckoutSession {
  id: string;
  url: string;
  expiresAt: Date;
}

export interface Invoice {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  invoiceUrl?: string;
  pdfUrl?: string;
  paidAt?: Date;
  createdAt: Date;
}

// Subscription plans configuration
const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  FREE: {
    id: 'plan_free',
    tier: 'FREE',
    name: 'Free',
    description: 'Get started with basic features',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      'Post up to 3 jobs per month',
      'Basic candidate search',
      'Email support',
    ],
    jobPostLimit: 3,
    featuredJobLimit: 0,
    analyticsLevel: 'basic',
    supportLevel: 'email',
  },
  STARTER: {
    id: 'plan_starter',
    tier: 'STARTER',
    name: 'Starter',
    description: 'Perfect for small businesses',
    priceMonthly: 9900, // $99 AUD
    priceYearly: 99000, // $990 AUD (2 months free)
    features: [
      'Post up to 10 jobs per month',
      'Advanced candidate search',
      'Application tracking',
      'Priority email support',
    ],
    jobPostLimit: 10,
    featuredJobLimit: 1,
    analyticsLevel: 'standard',
    supportLevel: 'priority',
    stripePriceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  },
  PROFESSIONAL: {
    id: 'plan_professional',
    tier: 'PROFESSIONAL',
    name: 'Professional',
    description: 'For growing organizations',
    priceMonthly: 24900, // $249 AUD
    priceYearly: 249000, // $2490 AUD
    features: [
      'Unlimited job posts',
      'Featured job placements',
      'Advanced analytics dashboard',
      'ATS integration',
      'Dedicated account manager',
    ],
    jobPostLimit: -1, // Unlimited
    featuredJobLimit: 5,
    analyticsLevel: 'advanced',
    supportLevel: 'dedicated',
    stripePriceIdMonthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID,
  },
  ENTERPRISE: {
    id: 'plan_enterprise',
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    priceMonthly: 99900, // $999 AUD
    priceYearly: 999000, // $9990 AUD
    features: [
      'Everything in Professional',
      'Custom integrations',
      'SSO/SAML authentication',
      'Custom branding',
      'SLA guarantee',
      'Dedicated support team',
    ],
    jobPostLimit: -1,
    featuredJobLimit: -1, // Unlimited
    analyticsLevel: 'enterprise',
    supportLevel: 'dedicated',
    stripePriceIdMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  },
  RAP: {
    id: 'plan_rap',
    tier: 'RAP',
    name: 'RAP Partner',
    description: 'For Reconciliation Action Plan certified organizations',
    priceMonthly: 49900, // $499 AUD
    priceYearly: 499000, // $4990 AUD
    features: [
      'Everything in Professional',
      'RAP certification badge',
      'Priority Indigenous talent matching',
      'Cultural awareness training access',
      'RAP reporting dashboard',
      'Community engagement tools',
    ],
    jobPostLimit: -1,
    featuredJobLimit: 10,
    analyticsLevel: 'enterprise',
    supportLevel: 'dedicated',
    stripePriceIdMonthly: process.env.STRIPE_RAP_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_RAP_YEARLY_PRICE_ID,
  },
};

// Mock Stripe implementation (replace with actual Stripe SDK)
const stripe = {
  customers: {
    create: async (params: { email: string; metadata?: Record<string, string> }) => ({
      id: `cus_${Date.now()}`,
      email: params.email,
    }),
    retrieve: async (id: string) => ({ id, email: 'user@example.com' }),
  },
  subscriptions: {
    create: async (params: { customer: string; items: Array<{ price: string }>; metadata?: Record<string, string> }) => ({
      id: `sub_${Date.now()}`,
      customer: params.customer,
      status: 'active' as const,
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }),
    retrieve: async (id: string) => ({
      id,
      status: 'active' as const,
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    }),
    update: async (id: string, params: { cancel_at_period_end?: boolean }) => ({
      id,
      cancel_at_period_end: params.cancel_at_period_end,
    }),
    cancel: async (id: string) => ({ id, status: 'canceled' as const }),
  },
  paymentIntents: {
    create: async (params: { amount: number; currency: string; customer?: string }) => ({
      id: `pi_${Date.now()}`,
      client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      amount: params.amount,
      currency: params.currency,
      status: 'requires_payment_method' as const,
    }),
  },
  checkout: {
    sessions: {
      create: async (params: { 
        customer?: string; 
        line_items: Array<{ price: string; quantity: number }>;
        success_url: string;
        cancel_url: string;
        mode: 'subscription' | 'payment';
      }) => ({
        id: `cs_${Date.now()}`,
        url: `https://checkout.stripe.com/c/pay/cs_${Date.now()}`,
        expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
      }),
    },
  },
  invoices: {
    list: async (_params: { customer: string; limit?: number }) => ({
      data: [],
    }),
    retrieve: async (id: string) => ({
      id,
      amount_paid: 9900,
      currency: 'aud',
      status: 'paid',
      hosted_invoice_url: `https://invoice.stripe.com/${id}`,
      invoice_pdf: `https://invoice.stripe.com/${id}/pdf`,
    }),
  },
  refunds: {
    create: async (params: { payment_intent: string; amount?: number }) => ({
      id: `re_${Date.now()}`,
      payment_intent: params.payment_intent,
      amount: params.amount,
      status: 'succeeded',
    }),
  },
  accounts: {
    create: async (params: { type: string; country: string; email: string }) => ({
      id: `acct_${Date.now()}`,
      email: params.email,
    }),
    createLoginLink: async (accountId: string) => ({
      url: `https://connect.stripe.com/express/${accountId}`,
    }),
  },
  transfers: {
    create: async (params: { amount: number; currency: string; destination: string }) => ({
      id: `tr_${Date.now()}`,
      amount: params.amount,
      destination: params.destination,
    }),
  },
};

class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  // ==================== Subscription Management ====================

  /**
   * Get available subscription plans
   */
  getPlans(): SubscriptionPlan[] {
    return Object.values(SUBSCRIPTION_PLANS);
  }

  /**
   * Get a specific plan
   */
  getPlan(tier: SubscriptionTier): SubscriptionPlan {
    return SUBSCRIPTION_PLANS[tier];
  }

  /**
   * Get user's current subscription
   */
  async getSubscription(userId: string): Promise<{
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd: boolean;
  } | null> {
    try {
      const subscription = await prisma.companySubscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return null;
      }

      return {
        tier: subscription.tier as SubscriptionTier,
        status: subscription.status as SubscriptionStatus,
        currentPeriodEnd: subscription.currentPeriodEnd || undefined,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      };
    } catch (error) {
      logger.error('Failed to get subscription', { userId, error });
      return null;
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<CheckoutSession> {
    const { userId, tier, billingCycle } = params;

    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const plan = SUBSCRIPTION_PLANS[tier];
      if (!plan) {
        throw new Error('Invalid subscription tier');
      }

      // Get or create Stripe customer
      let stripeCustomerId: string;
      const existingSub = await prisma.companySubscription.findUnique({
        where: { userId },
      });

      if (existingSub?.stripeCustomerId) {
        stripeCustomerId = existingSub.stripeCustomerId;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
      }

      // Get the appropriate price ID
      const priceId = billingCycle === 'yearly' 
        ? plan.stripePriceIdYearly 
        : plan.stripePriceIdMonthly;

      if (!priceId && tier !== 'FREE') {
        throw new Error('Price ID not configured for this plan');
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [{
          price: priceId || 'price_placeholder',
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${process.env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/subscription/cancel`,
      });

      // Store pending subscription
      await prisma.companySubscription.upsert({
        where: { userId },
        create: {
          userId,
          tier,
          stripeCustomerId,
          status: 'unpaid',
        },
        update: {
          tier,
          stripeCustomerId,
        },
      });

      logger.info('Checkout session created', { userId, tier, sessionId: session.id });

      return {
        id: session.id,
        url: session.url,
        expiresAt: new Date(session.expires_at * 1000),
      };
    } catch (error) {
      logger.error('Failed to create subscription', { userId, tier, error });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, immediate: boolean = false): Promise<void> {
    try {
      const subscription = await prisma.companySubscription.findUnique({
        where: { userId },
      });

      if (!subscription?.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      if (immediate) {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        await prisma.companySubscription.update({
          where: { userId },
          data: {
            status: 'canceled',
            tier: 'FREE',
          },
        });
      } else {
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
        await prisma.companySubscription.update({
          where: { userId },
          data: { cancelAtPeriodEnd: true },
        });
      }

      logger.info('Subscription canceled', { userId, immediate });
    } catch (error) {
      logger.error('Failed to cancel subscription', { userId, error });
      throw error;
    }
  }

  /**
   * Upgrade/downgrade subscription
   */
  async changeSubscription(userId: string, newTier: SubscriptionTier): Promise<CheckoutSession> {
    // For simplicity, create a new checkout session for the new tier
    return this.createSubscription({
      userId,
      tier: newTier,
      billingCycle: 'monthly', // Default, could be passed as param
    });
  }

  // ==================== Invoice Management ====================

  /**
   * Get user invoices
   */
  async getInvoices(userId: string, limit: number = 10): Promise<Invoice[]> {
    try {
      const invoices = await prisma.invoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return invoices.map(inv => ({
        id: inv.id,
        userId: inv.userId,
        amount: inv.amount,
        currency: inv.currency,
        status: inv.status,
        invoiceUrl: inv.invoiceUrl || undefined,
        pdfUrl: inv.invoicePdf || inv.pdfUrl || undefined,
        paidAt: inv.paidAt || undefined,
        createdAt: inv.createdAt,
      }));
    } catch (error) {
      logger.error('Failed to get invoices', { userId, error });
      return [];
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) return null;

      return {
        id: invoice.id,
        userId: invoice.userId,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        invoiceUrl: invoice.invoiceUrl || undefined,
        pdfUrl: invoice.invoicePdf || invoice.pdfUrl || undefined,
        paidAt: invoice.paidAt || undefined,
        createdAt: invoice.createdAt,
      };
    } catch (error) {
      logger.error('Failed to get invoice', { invoiceId, error });
      return null;
    }
  }

  // ==================== One-time Payments ====================

  /**
   * Create payment intent for one-time payment
   */
  async createPaymentIntent(
    userId: string,
    amount: number,
    description: string,
    metadata?: Record<string, string>
  ): Promise<PaymentIntent> {
    try {
      // Get or create Stripe customer
      let stripeCustomerId: string;
      const subscription = await prisma.companySubscription.findUnique({
        where: { userId },
      });

      if (subscription?.stripeCustomerId) {
        stripeCustomerId = subscription.stripeCustomerId;
      } else {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'aud',
        customer: stripeCustomerId,
      });

      logger.info('Payment intent created', { userId, amount, description });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to create payment intent', { userId, amount, error });
      throw error;
    }
  }

  /**
   * Create checkout session for featured job
   */
  async createFeaturedJobCheckout(
    userId: string,
    jobId: string,
    duration: 7 | 14 | 30
  ): Promise<CheckoutSession> {
    const pricing: Record<number, number> = {
      7: 4900, // $49
      14: 7900, // $79
      30: 14900, // $149
    };

    const amount = pricing[duration];
    const paymentIntent = await this.createPaymentIntent(
      userId,
      amount,
      `Featured job listing for ${duration} days`,
      { jobId, duration: duration.toString() }
    );

    // For now, return a mock checkout session
    return {
      id: paymentIntent.id,
      url: `${process.env.APP_URL}/checkout/featured-job?payment_intent=${paymentIntent.id}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  // ==================== RAP Certification ====================

  /**
   * Create RAP certification payment
   */
  async createRAPCertificationPayment(
    userId: string,
    level: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  ): Promise<CheckoutSession> {
    const pricing: Record<string, number> = {
      BRONZE: 0, // Free
      SILVER: 49900, // $499
      GOLD: 99900, // $999
      PLATINUM: 249900, // $2499
    };

    const amount = pricing[level];
    
    if (amount === 0) {
      // Bronze is free - just upgrade
      await prisma.companyProfile.updateMany({
        where: { userId },
        data: {
          rapCertificationLevel: level,
          rapCertifiedAt: new Date(),
        },
      });

      return {
        id: 'free_bronze',
        url: `${process.env.APP_URL}/rap-certification/success`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };
    }

    const paymentIntent = await this.createPaymentIntent(
      userId,
      amount,
      `RAP Certification - ${level} Level`,
      { rapLevel: level }
    );

    return {
      id: paymentIntent.id,
      url: `${process.env.APP_URL}/checkout/rap-certification?payment_intent=${paymentIntent.id}&level=${level}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  // ==================== Mentor Payouts ====================

  /**
   * Create Stripe Connect account for mentor
   */
  async createMentorStripeAccount(userId: string, email: string): Promise<{
    accountId: string;
    onboardingUrl: string;
  }> {
    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'AU',
        email,
      });

      // Store account ID
      await prisma.mentorProfile.updateMany({
        where: { userId },
        data: { stripeAccountId: account.id },
      });

      const loginLink = await stripe.accounts.createLoginLink(account.id);

      logger.info('Mentor Stripe account created', { userId, accountId: account.id });

      return {
        accountId: account.id,
        onboardingUrl: loginLink.url,
      };
    } catch (error) {
      logger.error('Failed to create mentor Stripe account', { userId, error });
      throw error;
    }
  }

  /**
   * Process mentor payout
   */
  async processMentorPayout(
    mentorUserId: string,
    amount: number,
    sessionId: string
  ): Promise<void> {
    try {
      const mentor = await prisma.mentorProfile.findUnique({
        where: { userId: mentorUserId },
      });

      if (!mentor?.stripeAccountId) {
        throw new Error('Mentor has no Stripe account');
      }

      // Platform takes 15% fee
      const platformFee = Math.round(amount * 0.15);
      const payoutAmount = amount - platformFee;

      await stripe.transfers.create({
        amount: payoutAmount,
        currency: 'aud',
        destination: mentor.stripeAccountId,
      });

      logger.info('Mentor payout processed', {
        mentorUserId,
        amount: payoutAmount,
        sessionId,
        platformFee,
      });
    } catch (error) {
      logger.error('Failed to process mentor payout', { mentorUserId, amount, error });
      throw error;
    }
  }

  // ==================== Refunds ====================

  /**
   * Process refund
   */
  async processRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<{ refundId: string; status: string }> {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount,
      });

      logger.info('Refund processed', { paymentIntentId, amount, refundId: refund.id, reason });

      return {
        refundId: refund.id,
        status: refund.status,
      };
    } catch (error) {
      logger.error('Failed to process refund', { paymentIntentId, amount, error });
      throw error;
    }
  }

  // ==================== Usage & Limits ====================

  /**
   * Check if user can post a job
   */
  async canPostJob(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const cacheKey = `job_limit:${userId}`;
    const cached = await redisCache.get<{ allowed: boolean; reason?: string }>(cacheKey);
    if (cached) return cached;

    try {
      const subscription = await this.getSubscription(userId);
      const tier = subscription?.tier || 'FREE';
      const plan = SUBSCRIPTION_PLANS[tier];

      if (plan.jobPostLimit === -1) {
        const result = { allowed: true };
        await redisCache.set(cacheKey, result, 300);
        return result;
      }

      // Count jobs posted this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const jobCount = await prisma.job.count({
        where: {
          userId,
          createdAt: { gte: startOfMonth },
        },
      });

      if (jobCount >= plan.jobPostLimit) {
        const result = {
          allowed: false,
          reason: `You've reached your monthly limit of ${plan.jobPostLimit} job posts. Upgrade your plan for more.`,
        };
        await redisCache.set(cacheKey, result, 60);
        return result;
      }

      const result = { allowed: true };
      await redisCache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      logger.error('Failed to check job posting limit', { userId, error });
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check if user can feature a job
   */
  async canFeatureJob(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const subscription = await this.getSubscription(userId);
      const tier = subscription?.tier || 'FREE';
      const plan = SUBSCRIPTION_PLANS[tier];

      if (plan.featuredJobLimit === 0) {
        return {
          allowed: false,
          reason: 'Featured job posts are not available on the Free plan. Upgrade to use this feature.',
        };
      }

      if (plan.featuredJobLimit === -1) {
        return { allowed: true };
      }

      // Count active featured jobs
      const featuredCount = await prisma.job.count({
        where: {
          userId,
          isFeatured: true,
          featuredUntil: { gt: new Date() },
        },
      });

      if (featuredCount >= plan.featuredJobLimit) {
        return {
          allowed: false,
          reason: `You've reached your limit of ${plan.featuredJobLimit} featured jobs.`,
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Failed to check featured job limit', { userId, error });
      return { allowed: true };
    }
  }

  // ==================== Webhook Processing ====================

  /**
   * Handle Stripe webhook event
   */
  async handleWebhookEvent(event: {
    type: string;
    data: { object: Record<string, unknown> };
  }): Promise<void> {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          logger.debug('Unhandled webhook event', { type: event.type });
      }
    } catch (error) {
      logger.error('Webhook processing failed', { eventType: event.type, error });
      throw error;
    }
  }

  private async handleCheckoutComplete(session: Record<string, unknown>): Promise<void> {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (subscriptionId) {
      // Find user by customer ID and update subscription
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

        // Clear cache
        await redisCache.delete(`job_limit:${subscription.userId}`);
      }
    }
  }

  private async handleInvoicePaid(invoice: Record<string, unknown>): Promise<void> {
    const customerId = invoice.customer as string;
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
          invoiceUrl: invoice.hosted_invoice_url as string,
          invoicePdf: invoice.invoice_pdf as string,
          paidAt: new Date(),
        },
      });
    }
  }

  private async handleInvoicePaymentFailed(invoice: Record<string, unknown>): Promise<void> {
    const customerId = invoice.customer as string;
    const subscription = await prisma.companySubscription.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (subscription) {
      await prisma.companySubscription.update({
        where: { id: subscription.id },
        data: { status: 'past_due' },
      });

      // Send payment failed notification
      try {
        const user = await prisma.user.findUnique({
          where: { id: subscription.userId },
          select: { id: true, email: true, name: true }
        });

        if (user) {
          // Send in-app notification
          await notificationService.send({
            userId: user.id,
            type: 'SYSTEM_ANNOUNCEMENT',
            title: 'Payment Failed',
            body: 'We couldn\'t process your subscription payment. Please update your payment method.',
            data: { subscriptionId: subscription.id, invoiceId: invoice.id },
            actionUrl: '/settings/billing',
            priority: 'URGENT'
          });

          // Send email notification
          if (user.email) {
            await queueEmail({
              to: user.email,
              subject: 'Action Required: Payment Failed - Ngurra Pathways',
              template: 'payment-failed',
              templateData: {
                recipientName: user.name || 'there',
                amount: (invoice.amount_due as number) / 100,
                invoiceUrl: invoice.hosted_invoice_url as string,
                billingUrl: `${process.env.WEB_URL || 'https://ngurrapathways.com.au'}/settings/billing`
              },
              userId: user.id,
              type: 'SYSTEM_ANNOUNCEMENT',
              priority: 1
            });
          }
        }
      } catch (notifyError) {
        logger.error('Failed to send payment failed notification', { error: notifyError });
      }
    }
  }

  private async handleSubscriptionUpdated(sub: Record<string, unknown>): Promise<void> {
    const customerId = sub.customer as string;
    const status = sub.status as string;
    const currentPeriodEnd = new Date((sub.current_period_end as number) * 1000);

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

      await redisCache.delete(`job_limit:${subscription.userId}`);
    }
  }

  private async handleSubscriptionDeleted(sub: Record<string, unknown>): Promise<void> {
    const customerId = sub.customer as string;
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

      await redisCache.delete(`job_limit:${subscription.userId}`);
    }
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();
export default paymentService;

