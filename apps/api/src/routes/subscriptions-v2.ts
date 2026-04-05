// @ts-nocheck
import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import * as stripeLib from '../lib/stripe';

const router = express.Router();
const authenticateJWT = authenticate;

// Tier configuration
const TIER_LIMITS = {
  FREE: { maxJobs: 1, priorityListing: false, analytics: false, apiAccess: false, rapReporting: false },
  STARTER: { maxJobs: 5, priorityListing: false, analytics: true, apiAccess: false, rapReporting: false },
  PROFESSIONAL: { maxJobs: 20, priorityListing: true, analytics: true, apiAccess: false, rapReporting: false },
  ENTERPRISE: { maxJobs: -1, priorityListing: true, analytics: true, apiAccess: true, rapReporting: false },
  RAP: { maxJobs: -1, priorityListing: true, analytics: true, apiAccess: true, rapReporting: true },
};

const TIER_PRICES = {
  FREE: 0,
  STARTER: 9900,
  PROFESSIONAL: 24900,
  ENTERPRISE: 49900,
  RAP: 500000, // $5,000/month - custom annual pricing available
};

// =============================================================================
// SUBSCRIPTION INFO
// =============================================================================

/**
 * GET /subscriptions/me - Get current subscription
 */
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    let subscription = await prisma.companySubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await prisma.companySubscription.create({
        data: { userId, tier: 'FREE' },
      });
    }

    const limits = TIER_LIMITS[subscription.tier];
    const price = TIER_PRICES[subscription.tier];

    const activeJobs = await prisma.job.count({
      where: { userId, isActive: true },
    });

    res.json({
      subscription: {
        ...subscription,
        limits,
        pricePerMonth: price,
        activeJobs,
        canPostMore: limits.maxJobs === -1 || activeJobs < limits.maxJobs,
      },
    });
  } catch (err) {
    console.error('get subscription error', err);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * GET /subscriptions/tiers - List available tiers
 */
router.get('/tiers', (req, res) => {
  const tiers = [
    {
      tier: 'FREE',
      name: 'Free',
      price: 0,
      priceLabel: 'Free forever',
      features: ['1 active job posting', 'Basic applicant management', 'Email notifications'],
      limits: TIER_LIMITS.FREE,
    },
    {
      tier: 'STARTER',
      name: 'Starter',
      price: 9900,
      priceLabel: '$99/month',
      features: ['5 active job postings', 'Analytics dashboard', 'Email support', 'Application tracking'],
      limits: TIER_LIMITS.STARTER,
      stripePriceId: stripeLib.STRIPE_PRICES.STARTER,
    },
    {
      tier: 'PROFESSIONAL',
      name: 'Professional',
      price: 24900,
      priceLabel: '$249/month',
      features: ['20 active job postings', 'Priority listing in search', 'Full analytics', 'Phone support', 'Outcome tracking'],
      limits: TIER_LIMITS.PROFESSIONAL,
      stripePriceId: stripeLib.STRIPE_PRICES.PROFESSIONAL,
    },
    {
      tier: 'ENTERPRISE',
      name: 'Enterprise',
      price: 49900,
      priceLabel: '$499/month',
      features: ['Unlimited job postings', 'API access', 'Dedicated account manager', 'Custom integrations'],
      limits: TIER_LIMITS.ENTERPRISE,
      stripePriceId: stripeLib.STRIPE_PRICES.ENTERPRISE,
    },
    {
      tier: 'RAP',
      name: 'RAP Compliance',
      price: 500000,
      priceLabel: 'From $5,000/month',
      features: [
        'Everything in Enterprise',
        'RAP compliance dashboard',
        'Closing the Gap reporting',
        'Indigenous hiring targets tracking',
        'Diversity metrics & benchmarking',
        'Impact certification badge',
        'Dedicated success manager',
        'Custom annual contracts available',
      ],
      limits: TIER_LIMITS.RAP,
      stripePriceId: stripeLib.STRIPE_PRICES.RAP,
      isEnterprise: true,
    },
  ];

  res.json({ tiers: tiers.map(t => ({ id: t.tier, ...t })) });
});

// =============================================================================
// STRIPE CHECKOUT
// =============================================================================

/**
 * POST /subscriptions/checkout - Create Stripe checkout session
 */
router.post('/checkout', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { tier } = req.body;

    if (!tier || !['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
      return void res.status(400).json({ error: 'Invalid tier' });
    }

    if (!stripeLib.stripe) {
      // Fallback for development without Stripe
      const subscription = await prisma.companySubscription.upsert({
        where: { userId },
        create: { userId, tier },
        update: { tier },
      });
      return void res.json({
        subscription,
        message: 'Stripe not configured. Subscription updated directly.',
      });
    }

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { companyProfile: true },
    });

    // Get or create Stripe customer
    const customerId = await stripeLib.getOrCreateCustomer(
      userId,
      user.email,
      user.companyProfile?.companyName || user.email
    );

    // Update subscription with customer ID
    await prisma.companySubscription.upsert({
      where: { userId },
      create: { userId, tier: 'FREE', stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    });

    // Create checkout session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripeLib.createCheckoutSession({
      customerId,
      priceId: stripeLib.STRIPE_PRICES[tier],
      successUrl: `${frontendUrl}/company/billing?success=true&tier=${tier}`,
      cancelUrl: `${frontendUrl}/company/billing?canceled=true`,
      userId,
      tier,
    });

    res.json({ url: session.url, checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Create checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// =============================================================================
// BILLING PORTAL
// =============================================================================

/**
 * POST /subscriptions/portal - Create Stripe billing portal session
 */
router.post('/portal', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const subscription = await prisma.companySubscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      return void res.status(400).json({ error: 'No billing account found' });
    }

    if (!stripeLib.stripe) {
      return void res.status(400).json({ error: 'Stripe not configured' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripeLib.createBillingPortalSession(
      subscription.stripeCustomerId,
      `${frontendUrl}/company/billing`
    );

    res.json({ url: session.url, portalUrl: session.url });
  } catch (err) {
    console.error('Create portal error:', err);
    res.status(500).json({ error: 'Failed to create billing portal' });
  }
});

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

/**
 * POST /subscriptions/cancel - Cancel subscription at period end
 */
router.post('/cancel', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const subscription = await prisma.companySubscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeSubscriptionId) {
      return void res.status(400).json({ error: 'No active subscription found' });
    }

    if (stripeLib.stripe) {
      await stripeLib.cancelSubscription(subscription.stripeSubscriptionId);
    }

    const updated = await prisma.companySubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: true },
    });

    res.json({
      subscription: updated,
      message: 'Subscription will be canceled at the end of the billing period',
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /subscriptions/reactivate - Reactivate a canceled subscription
 */
router.post('/reactivate', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const subscription = await prisma.companySubscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeSubscriptionId) {
      return void res.status(400).json({ error: 'No subscription found' });
    }

    if (stripeLib.stripe) {
      await stripeLib.reactivateSubscription(subscription.stripeSubscriptionId);
    }

    const updated = await prisma.companySubscription.update({
      where: { userId },
      data: { cancelAtPeriodEnd: false },
    });

    res.json({ subscription: updated, message: 'Subscription reactivated' });
  } catch (err) {
    console.error('Reactivate subscription error:', err);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// =============================================================================
// INVOICES
// =============================================================================

/**
 * GET /subscriptions/invoices - List invoices (from database)
 */
router.get('/invoices', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    // First get the user's subscription(s) to find related invoices
    const subscriptions = await prisma.companySubscription.findMany({
      where: { userId },
      select: { id: true },
    });

    if (subscriptions.length === 0) {
      return void res.json({ invoices: [] });
    }

    const subscriptionIds = subscriptions.map((s) => s.id);

    const invoices = await prisma.invoice.findMany({
      where: { subscriptionId: { in: subscriptionIds } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ invoices });
  } catch (err) {
    console.error('List invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * GET /subscriptions/stripe-invoices - List Stripe invoices with PDF links
 */
router.get('/stripe-invoices', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    // Get company profile with Stripe customer ID
    const company = await prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!(company as any)?.stripeCustomerId) {
      return void res.json({ invoices: [] });
    }

    // Fetch invoices from Stripe
    const stripeInvoices = await stripeLib.listInvoices((company as any).stripeCustomerId, 20);

    // Map to simpler format with PDF URLs
    const invoices = stripeInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status,
      paidAt: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000) : null,
      periodStart: new Date(inv.period_start * 1000),
      periodEnd: new Date(inv.period_end * 1000),
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
    }));

    res.json({ invoices });
  } catch (err) {
    console.error('List Stripe invoices error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

/**
 * GET /subscriptions/invoices/:invoiceId/pdf - Get invoice PDF URL
 */
router.get('/invoices/:invoiceId/pdf', authenticateJWT, async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const userId = (req as any).user?.id;

    // Verify ownership by checking customer
    const company = await prisma.companyProfile.findUnique({
      where: { userId },
    });

    if (!(company as any)?.stripeCustomerId) {
      return void res.status(404).json({ error: 'No billing account found' });
    }

    // Get invoice from Stripe
    const invoice = await stripeLib.getInvoice(invoiceId);

    // Verify the invoice belongs to this customer
    if (invoice.customer !== (company as any).stripeCustomerId) {
      return void res.status(403).json({ error: 'Access denied' });
    }

    if (!invoice.invoice_pdf) {
      return void res.status(404).json({ error: 'Invoice PDF not available' });
    }

    // Redirect to the Stripe-hosted PDF
    res.redirect(invoice.invoice_pdf);
  } catch (err) {
    console.error('Get invoice PDF error:', err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// =============================================================================
// TIER GATE MIDDLEWARE
// =============================================================================

/**
 * Middleware to check subscription limits before posting a job
 */
async function checkJobLimit(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  try {
    let subscription = await prisma.companySubscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      subscription = await prisma.companySubscription.create({
        data: { userId, tier: 'FREE' },
      });
    }

    const limits = TIER_LIMITS[subscription.tier];

    // Unlimited for enterprise
    if (limits.maxJobs === -1) return next();

    const activeJobs = await prisma.job.count({
      where: { userId, isActive: true },
    });

    if (activeJobs >= limits.maxJobs) {
      return void res.status(403).json({
        error: 'Job limit reached',
        message: `Your ${subscription.tier} plan allows ${limits.maxJobs} active job(s). Upgrade to post more.`,
        currentTier: subscription.tier,
        activeJobs,
        limit: limits.maxJobs,
      });
    }

    next();
  } catch (err) {
    console.error('check job limit error', err);
    res.status(500).json({ error: 'Failed to check subscription' });
  }
}

/**
 * Middleware to check analytics access
 */
async function checkAnalyticsAccess(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  try {
    const subscription = await prisma.companySubscription.findUnique({
      where: { userId },
    });

    const tier = subscription?.tier || 'FREE';
    const limits = TIER_LIMITS[tier];

    if (!limits.analytics) {
      return void res.status(403).json({
        error: 'Analytics access requires a paid plan',
        currentTier: tier,
      });
    }

    next();
  } catch (err) {
    console.error('check analytics access error', err);
    res.status(500).json({ error: 'Failed to check subscription' });
  }
}

/**
 * Middleware to check API access (Enterprise only)
 */
async function checkApiAccess(req, res, next) {
  const userId = req.user?.id;
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  try {
    const subscription = await prisma.companySubscription.findUnique({
      where: { userId },
    });

    const tier = subscription?.tier || 'FREE';
    const limits = TIER_LIMITS[tier];

    if (!limits.apiAccess) {
      return void res.status(403).json({
        error: 'API access requires Enterprise plan',
        currentTier: tier,
      });
    }

    next();
  } catch (err) {
    console.error('check api access error', err);
    res.status(500).json({ error: 'Failed to check subscription' });
  }
}

// Legacy upgrade endpoint (direct tier change without payment)
router.post('/upgrade', authenticateJWT, async (req, res) => {
  const userId = (req as any).user?.id;
  const { tier } = req.body;

  if (!tier || !['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
    return void res.status(400).json({ error: 'Invalid tier' });
  }

  try {
    // For non-free tiers, redirect to checkout
    if (tier !== 'FREE' && stripeLib.stripe) {
      return void res.status(400).json({
        error: 'Use /subscriptions/checkout for paid tiers',
        redirectTo: '/subscriptions/checkout',
      });
    }

    const subscription = await prisma.companySubscription.upsert({
      where: { userId },
      create: { userId, tier },
      update: { tier },
    });

    res.json({
      subscription,
      message: tier === 'FREE' ? 'Downgraded to Free tier' : `Updated to ${tier} tier`,
    });
  } catch (err) {
    console.error('upgrade subscription error', err);
    res.status(500).json({ error: 'Failed to upgrade subscription' });
  }
});

export default router;

module.exports.checkJobLimit = checkJobLimit;
module.exports.checkAnalyticsAccess = checkAnalyticsAccess;
module.exports.checkApiAccess = checkApiAccess;
module.exports.TIER_LIMITS = TIER_LIMITS;

export {};


