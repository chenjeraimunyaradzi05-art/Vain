import Stripe from 'stripe';

// Initialize Stripe with the secret key
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
    })
  : null;

// Product/Price configuration
export const STRIPE_PRICES = {
  STARTER: process.env.STRIPE_PRICE_STARTER || 'price_starter_monthly',
  PROFESSIONAL: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_professional_monthly',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || 'price_enterprise_monthly',
  RAP: process.env.STRIPE_PRICE_RAP || 'price_rap_monthly',
};

export const TIER_PRICES_CENTS = {
  FREE: 0,
  STARTER: 9900,        // $99
  PROFESSIONAL: 24900,  // $249
  ENTERPRISE: 49900,    // $499
};

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId: string, email: string, name: string): Promise<string> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Check if customer already exists in Stripe
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  return customer.id;
}

/**
 * Create a checkout session for subscription upgrade
 */
export async function createCheckoutSession({ customerId, priceId, successUrl, cancelUrl, userId, tier }: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    userId: string;
    tier: string;
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    tax_id_collection: {
      enabled: true,
    },
  });

  return session;
}

/**
 * Create a billing portal session for subscription management
 */
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Reactivate a cancelled subscription
 */
export async function reactivateSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}

/**
 * Retrieve subscription details
 */
export async function getSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * List all invoices for a customer
 */
export async function listInvoices(customerId: string, limit = 10) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit,
  });

  return invoices.data;
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(invoiceId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return stripe.invoices.retrieve(invoiceId);
}

/**
 * Construct and verify a webhook event
 */
export function constructWebhookEvent(payload: Buffer, signature: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Map Stripe price ID to tier
 */
export function priceIdToTier(priceId: string) {
  for (const [tier, price] of Object.entries(STRIPE_PRICES)) {
    if (price === priceId) {
      return tier;
    }
  }
  return 'FREE';
}

// =============================================================================
// Stripe Connect helpers (for mentor payouts)
// =============================================================================

export async function createConnectedAccount({ email, country = 'AU', type = 'express', businessProfile = {} }: {
    email?: string;
    country?: string;
    type?: Stripe.AccountCreateParams.Type;
    businessProfile?: Stripe.AccountCreateParams.BusinessProfile;
} = {}) {
  if (!stripe) throw new Error('Stripe is not configured');

  const account = await stripe.accounts.create({
    type,
    country,
    email,
    business_type: 'individual',
    business_profile: businessProfile,
  });

  return account;
}

export async function createAccountLink({ accountId, refreshUrl, returnUrl, type = 'account_onboarding' }: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
    type?: Stripe.AccountLinkCreateParams.Type;
}) {
  if (!stripe) throw new Error('Stripe is not configured');

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type,
  });

  return link;
}

export async function getAccount(accountId: string) {
  if (!stripe) throw new Error('Stripe is not configured');
  return stripe.accounts.retrieve(accountId);
}

export async function createTransfer({ amount, currency = 'aud', destinationAccountId, metadata = {} }: {
    amount: number;
    currency?: string;
    destinationAccountId: string;
    metadata?: Record<string, string>;
}) {
  if (!stripe) throw new Error('Stripe is not configured');

  const transfer = await stripe.transfers.create({
    amount,
    currency: currency.toLowerCase(),
    destination: destinationAccountId,
    metadata,
  });

  return transfer;
}





