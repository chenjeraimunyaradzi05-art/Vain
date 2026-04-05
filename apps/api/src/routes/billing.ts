import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import * as stripeLib from '../lib/stripe';

const router = express.Router();

// =============================================================================
// BILLING (Phase 2)
// =============================================================================

router.get('/', authenticate, async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

  const subscription = await prisma.companySubscription.findUnique({ where: { userId } });
  const invoices = await prisma.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return void res.json({
    subscription,
    invoices,
    stripeConfigured: Boolean(stripeLib.stripe),
  });
});

/**
 * POST /billing/checkout
 * Create Stripe Checkout session for subscription upgrade.
 * Body: { tier: 'STARTER'|'PROFESSIONAL'|'ENTERPRISE'|'RAP' }
 */
router.post('/checkout', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const tier = String(req.body?.tier || '').toUpperCase();
    if (!tier || !['STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'RAP'].includes(tier)) {
      return void res.status(400).json({ error: 'Invalid tier' });
    }

    if (!stripeLib.stripe) {
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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { companyProfile: true },
    });

    if (!user) return void res.status(404).json({ error: 'User not found' });

    const customerId = await stripeLib.getOrCreateCustomer(
      userId,
      user.email,
      user.companyProfile?.companyName || user.email
    );

    await prisma.companySubscription.upsert({
      where: { userId },
      create: { userId, tier: 'FREE', stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await stripeLib.createCheckoutSession({
      customerId,
      priceId: (stripeLib.STRIPE_PRICES as any)[tier],
      successUrl: `${frontendUrl}/company/billing?success=true&tier=${tier}`,
      cancelUrl: `${frontendUrl}/company/billing?canceled=true`,
      userId,
      tier,
    });

    return void res.json({ url: session.url, checkoutUrl: session.url, sessionId: session.id });
  } catch (err: any) {
    console.error('Create checkout error:', err);
    return void res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /billing/portal
 * Create Stripe billing portal session.
 */
router.post('/portal', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const subscription = await prisma.companySubscription.findUnique({ where: { userId } });
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

    return void res.json({ url: session.url, portalUrl: session.url });
  } catch (err: any) {
    console.error('Create portal error:', err);
    return void res.status(500).json({ error: 'Failed to create billing portal' });
  }
});

/**
 * GET /billing/invoices
 * List recent invoices (persisted locally via Stripe webhook).
 */
router.get('/invoices', authenticate, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const invoices = await prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return void res.json({ invoices, total: invoices.length });
  } catch (err: any) {
    console.error('List invoices error:', err);
    return void res.status(500).json({ error: 'Failed to list invoices' });
  }
});

export default router;


