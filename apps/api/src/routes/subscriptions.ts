import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import * as stripeLib from '../lib/stripe';

const router = express.Router();

function normalizeSubscriptionStatus(subscription: any): string {
    // The schema uses `active, canceled, past_due`, but some web UI checks `cancelled`.
    if (subscription?.cancelAtPeriodEnd) return 'cancelled';
    return subscription?.status || 'active';
}

async function ensureSubscriptionForUser(userId: string) {
    let subscription = await prisma.companySubscription.findUnique({ where: { userId } });
    if (!subscription) {
        subscription = await prisma.companySubscription.create({ data: { userId, tier: 'FREE' } });
    }
    return subscription;
}

// Subscription tier limits
const TIER_LIMITS: Record<string, { maxJobs: number; priorityListing: boolean; analytics: boolean; apiAccess: boolean }> = {
    FREE: { maxJobs: 1, priorityListing: false, analytics: false, apiAccess: false },
    STARTER: { maxJobs: 5, priorityListing: false, analytics: true, apiAccess: false },
    PROFESSIONAL: { maxJobs: 20, priorityListing: true, analytics: true, apiAccess: false },
    ENTERPRISE: { maxJobs: -1, priorityListing: true, analytics: true, apiAccess: true }, // -1 = unlimited
};

const TIER_PRICES: Record<string, number> = {
    FREE: 0,
    STARTER: 9900, //  in cents
    PROFESSIONAL: 24900, //  in cents
    ENTERPRISE: 49900, //  in cents
};

// GET /subscriptions/me - get current subscription
router.get('/me', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        let subscription = await prisma.companySubscription.findUnique({
            where: { userId: userId },
        });

        if (!subscription) {
            subscription = await prisma.companySubscription.create({
                data: { userId: userId, tier: 'FREE' },
            });
        }

        const limits = TIER_LIMITS[subscription.tier];
        const price = TIER_PRICES[subscription.tier];

        const activeJobs = await prisma.job.count({
            where: { userId: userId, isActive: true },
        });

        res.json({
            subscription: {
                ...subscription,
                status: normalizeSubscriptionStatus(subscription),
                limits: limits,
                pricePerMonth: price,
                activeJobs: activeJobs,
                canPostMore: limits.maxJobs === -1 || activeJobs < limits.maxJobs
            },
        });
    } catch (err) {
        console.error('get subscription error', err);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// GET /subscriptions - legacy billing portal expects this shape
router.get('/', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const subscription = await ensureSubscriptionForUser(userId);

        const invoices = await prisma.invoice.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        res.json({
            subscription: {
                ...subscription,
                status: normalizeSubscriptionStatus(subscription),
            },
            invoices,
        });
    } catch (err) {
        console.error('get subscription summary error', err);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// GET /subscriptions/current - used by SubscriptionBadge
router.get('/current', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const subscription = await ensureSubscriptionForUser(userId);
        res.json({
            tier: subscription.tier,
            status: normalizeSubscriptionStatus(subscription),
            currentPeriodEnd: subscription.currentPeriodEnd,
        });
    } catch (err) {
        console.error('get subscription current error', err);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// GET /subscriptions/payment-status - used by PaymentFailure hook
router.get('/payment-status', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const failed = await prisma.invoice.findFirst({
            where: { userId, status: 'failed' },
            orderBy: { createdAt: 'desc' },
        });

        if (!failed) {
            return void res.json({ failure: null });
        }

        return void res.json({
            failure: {
                id: failed.id,
                invoiceId: failed.stripeInvoiceId || failed.id,
                amount: failed.amount,
                currency: failed.currency,
                failedAt: failed.createdAt,
                reason: 'payment_failed',
                retryCount: 0,
                lastFour: null,
                cardBrand: null,
            },
        });
    } catch (err) {
        console.error('get payment status error', err);
        res.status(500).json({ error: 'Failed to fetch payment status' });
    }
});

// GET /subscriptions/tiers - list available tiers
router.get('/tiers', async (_req, res) => {
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
            priceLabel: '/month',
            features: ['5 active job postings', 'Analytics dashboard', 'Email support', 'Application tracking'],
            limits: TIER_LIMITS.STARTER,
        },
        {
            tier: 'PROFESSIONAL',
            name: 'Professional',
            price: 24900,
            priceLabel: '/month',
            features: ['20 active job postings', 'Priority listing in search', 'Full analytics', 'Phone support', 'Outcome tracking'],
            limits: TIER_LIMITS.PROFESSIONAL,
        },
        {
            tier: 'ENTERPRISE',
            name: 'Enterprise',
            price: 49900,
            priceLabel: '/month',
            features: ['Unlimited job postings', 'API access', 'Dedicated account manager', 'Custom integrations', 'RAP compliance reporting'],
            limits: TIER_LIMITS.ENTERPRISE,
        },
    ];
    res.json({ tiers: tiers });
});

// POST /subscriptions/upgrade - upgrade subscription (placeholder for Stripe integration)
router.post('/upgrade', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const { tier } = req.body;

        if (!tier || !['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(tier)) {
            return void res.status(400).json({ error: 'Invalid tier' });
        }

        const subscription = await prisma.companySubscription.upsert({
            where: { userId: userId },
            create: { userId: userId, tier: tier },
            update: { tier: tier },
        });

        res.json({
            subscription: subscription,
            message: tier === 'FREE'
                ? 'Subscription updated to Free tier'
                : `Upgraded to ${tier} tier. Payment integration coming soon.`,
        });
    } catch (err) {
        console.error('upgrade subscription error', err);
        res.status(500).json({ error: 'Failed to upgrade subscription' });
    }
});

// POST /subscriptions/checkout - legacy alias for Stripe checkout (web component expects `checkoutUrl`)
router.post('/checkout', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const { tier } = req.body;

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

        if (!user) {
            return void res.status(404).json({ error: 'User not found' });
        }

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

        res.json({
            url: session.url,
            checkoutUrl: session.url,
            sessionId: session.id,
        });
    } catch (err) {
        console.error('Create checkout error:', err);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// POST /subscriptions/portal - legacy alias for Stripe billing portal (web component expects `portalUrl`)
router.post('/portal', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const subscription = await ensureSubscriptionForUser(userId);

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

// POST /subscriptions/billing-portal - used by PaymentFailure
router.post('/billing-portal', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const subscription = await ensureSubscriptionForUser(userId);

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

        res.json({ url: session.url });
    } catch (err) {
        console.error('Create billing-portal error:', err);
        res.status(500).json({ error: 'Failed to create billing portal' });
    }
});

// POST /subscriptions/retry-payment - attempt to pay an invoice
router.post('/retry-payment', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const { invoiceId } = req.body || {};

        if (!invoiceId || typeof invoiceId !== 'string') {
            return void res.status(400).json({ success: false, error: 'invoiceId is required' });
        }
        if (!stripeLib.stripe) {
            return void res.status(400).json({ success: false, error: 'Stripe not configured' });
        }

        // invoiceId can be either Stripe invoice ID or our local Invoice.id
        let stripeInvoiceId = invoiceId;
        if (!invoiceId.startsWith('in_')) {
            const local = await prisma.invoice.findFirst({ where: { id: invoiceId, userId } });
            stripeInvoiceId = local?.stripeInvoiceId || invoiceId;
        }

        const paidInvoice = await stripeLib.stripe.invoices.pay(stripeInvoiceId);

        // Best-effort mirror into DB
        await prisma.invoice.updateMany({
            where: { userId, stripeInvoiceId: paidInvoice.id },
            data: { status: paidInvoice.status === 'paid' ? 'paid' : 'open' },
        });

        return void res.json({ success: paidInvoice.status === 'paid' });
    } catch (err) {
        console.error('retry payment error', err);
        return void res.status(500).json({ success: false });
    }
});

// POST /subscriptions/cancel - legacy alias
router.post('/cancel', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const subscription = await ensureSubscriptionForUser(userId);

        if (!subscription?.stripeSubscriptionId) {
            return void res.status(400).json({ error: 'No active subscription found' });
        }

        if (stripeLib.stripe) {
            await stripeLib.cancelSubscription(subscription.stripeSubscriptionId);
        }

        await prisma.companySubscription.update({
            where: { userId },
            data: { cancelAtPeriodEnd: true },
        });

        res.json({ ok: true });
    } catch (err) {
        console.error('cancel subscription error', err);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// POST /subscriptions/reactivate - legacy alias
router.post('/reactivate', authenticate, async (req: any, res) => {
    try {
        const userId = req.user?.id;
        const subscription = await ensureSubscriptionForUser(userId);

        if (!subscription?.stripeSubscriptionId) {
            return void res.status(400).json({ error: 'No active subscription found' });
        }

        if (stripeLib.stripe) {
            await stripeLib.reactivateSubscription(subscription.stripeSubscriptionId);
        }

        await prisma.companySubscription.update({
            where: { userId },
            data: { cancelAtPeriodEnd: false },
        });

        res.json({ ok: true });
    } catch (err) {
        console.error('reactivate subscription error', err);
        res.status(500).json({ error: 'Failed to reactivate subscription' });
    }
});

// Middleware to check subscription limits before posting a job
export async function checkJobLimit(req: any, res: any, next: any) {
    try {
        const userId = req.user?.id;
        if (!userId)
            return void res.status(401).json({ error: 'Unauthorized' });

        let subscription = await prisma.companySubscription.findUnique({
            where: { userId: userId },
        });

        if (!subscription) {
            subscription = await prisma.companySubscription.create({
                data: { userId: userId, tier: 'FREE' },
            });
        }

        const limits = TIER_LIMITS[subscription.tier];
        // Unlimited for enterprise
        if (limits.maxJobs === -1)
            return next();

        const activeJobs = await prisma.job.count({
            where: { userId: userId, isActive: true },
        });

        if (activeJobs >= limits.maxJobs) {
            return void res.status(403).json({
                error: 'Job limit reached',
                message: `Your ${subscription.tier} plan allows ${limits.maxJobs} active job(s). Upgrade to post more.`,
                currentTier: subscription.tier,
                activeJobs: activeJobs,
                limit: limits.maxJobs,
            });
        }
        next();
    } catch (err) {
        console.error('check job limit error', err);
        res.status(500).json({ error: 'Failed to check subscription' });
    }
}

export default router;


