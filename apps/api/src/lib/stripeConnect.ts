/**
 * Stripe Connect Integration for Mentor Payouts
 * 
 * Uses Stripe Connect Express for simple onboarding:
 * - Mentors create Express accounts
 * - Platform handles transfers after sessions
 * - Mentors can manage their account via Stripe dashboard
 * 
 * Flow:
 * 1. Mentor clicks "Set up payouts"
 * 2. Redirect to Stripe onboarding
 * 3. Stripe redirects back with account status
 * 4. After completed sessions, platform transfers earnings
 */

import Stripe from 'stripe';

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    })
  : null;

// Configuration
export const PLATFORM_FEE_PERCENT = parseInt(process.env.PLATFORM_FEE_PERCENT || '15', 10);
export const DEFAULT_SESSION_RATE_CENTS = parseInt(process.env.MENTOR_SESSION_RATE || '5000', 10); // $50

/**
 * Check if Stripe Connect is configured
 * @returns {boolean}
 */
export function isConfigured() {
  return stripe !== null;
}

/**
 * Create a Stripe Connect Express account for a mentor
 * @param {object} options - Account options
 * @param {string} options.email - Mentor's email
 * @param {string} options.mentorId - Mentor's user ID
 * @param {string} options.name - Mentor's name
 * @returns {Promise<object>} - Account details
 */
export async function createConnectAccount(options) {
  if (!stripe) {
    console.log('[StripeConnect] Mock account creation:', options);
    return {
      id: `mock_acct_${Date.now()}`,
      email: options.email,
      mock: true,
    };
  }
  
  const { email, mentorId, name } = options;
  
  try {
    const account = await stripe.accounts.create({
      type: 'express',
      email,
      metadata: {
        mentorId,
        platform: 'ngurra',
      },
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        name: name || 'Ngurra Mentor',
        product_description: 'Mentorship services via Ngurra Pathways',
        mcc: '8299', // Educational services
      },
    });
    
    return {
      id: account.id,
      email: account.email,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  } catch (error) {
    console.error('[StripeConnect] Account creation failed:', error);
    throw error;
  }
}

/**
 * Create an onboarding link for a mentor to complete their account setup
 * @param {string} accountId - Stripe Connect account ID
 * @param {string} returnUrl - URL to redirect after onboarding
 * @param {string} refreshUrl - URL if onboarding link expires
 * @returns {Promise<string>} - Onboarding URL
 */
export async function createOnboardingLink(accountId, returnUrl, refreshUrl) {
  if (!stripe) {
    console.log('[StripeConnect] Mock onboarding link for:', accountId);
    return `${returnUrl}?mock=true&account=${accountId}`;
  }
  
  try {
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    return accountLink.url;
  } catch (error) {
    console.error('[StripeConnect] Onboarding link creation failed:', error);
    throw error;
  }
}

/**
 * Create a login link for a mentor to access their Stripe dashboard
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Promise<string>} - Dashboard URL
 */
export async function createDashboardLink(accountId) {
  if (!stripe) {
    console.log('[StripeConnect] Mock dashboard link for:', accountId);
    return `https://connect.stripe.com/express/mock/${accountId}`;
  }
  
  try {
    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return loginLink.url;
  } catch (error) {
    console.error('[StripeConnect] Dashboard link creation failed:', error);
    throw error;
  }
}

/**
 * Get the status of a Connect account
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Promise<object>} - Account status
 */
export async function getAccountStatus(accountId) {
  if (!stripe) {
    return {
      id: accountId,
      chargesEnabled: true,
      payoutsEnabled: true,
      detailsSubmitted: true,
      mock: true,
    };
  }
  
  try {
    const account = await stripe.accounts.retrieve(accountId);
    
    return {
      id: account.id,
      email: account.email,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements,
      capabilities: account.capabilities,
    };
  } catch (error) {
    console.error('[StripeConnect] Account status check failed:', error);
    throw error;
  }
}

/**
 * Transfer earnings to a mentor after a completed session
 * @param {object} options - Transfer options
 * @param {string} options.accountId - Stripe Connect account ID
 * @param {number} options.amountCents - Amount in cents
 * @param {string} options.sessionId - Mentorship session ID
 * @param {string} options.description - Transfer description
 * @returns {Promise<object>} - Transfer details
 */
export async function transferToMentor(options) {
  const { accountId, amountCents, sessionId, description } = options;
  
  if (!stripe) {
    console.log('[StripeConnect] Mock transfer:', options);
    return {
      id: `mock_tr_${Date.now()}`,
      amount: amountCents,
      destination: accountId,
      mock: true,
    };
  }
  
  try {
    const transfer = await stripe.transfers.create({
      amount: amountCents,
      currency: 'aud',
      destination: accountId,
      description: description || `Mentorship session payment`,
      metadata: {
        sessionId,
        platform: 'ngurra',
      },
    });
    
    return {
      id: transfer.id,
      amount: transfer.amount,
      currency: transfer.currency,
      destination: transfer.destination,
      created: new Date(transfer.created * 1000),
    };
  } catch (error) {
    console.error('[StripeConnect] Transfer failed:', error);
    throw error;
  }
}

/**
 * Calculate mentor payout for a session
 * @param {number} sessionRateCents - The session rate in cents
 * @returns {object} - Breakdown of amounts
 */
export function calculatePayout(sessionRateCents = DEFAULT_SESSION_RATE_CENTS) {
  const platformFee = Math.round((sessionRateCents * PLATFORM_FEE_PERCENT) / 100);
  const mentorPayout = sessionRateCents - platformFee;
  
  return {
    sessionRate: sessionRateCents,
    platformFee,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    mentorPayout,
    currency: 'aud',
  };
}

/**
 * Process a completed session and transfer payment to mentor
 * @param {object} options - Session options
 * @param {string} options.sessionId - Session ID
 * @param {string} options.mentorAccountId - Mentor's Stripe Connect account ID
 * @param {number} options.sessionRateCents - Session rate (optional, uses default)
 * @returns {Promise<object>} - Transfer result with breakdown
 */
export async function processSessionPayment(options) {
  const { sessionId, mentorAccountId, sessionRateCents } = options;
  
  const payout = calculatePayout(sessionRateCents);
  
  const transfer = await transferToMentor({
    accountId: mentorAccountId,
    amountCents: payout.mentorPayout,
    sessionId,
    description: `Mentorship session ${sessionId}`,
  });
  
  return {
    ...transfer,
    breakdown: payout,
  };
}

/**
 * Get transfer history for a mentor
 * @param {string} accountId - Stripe Connect account ID
 * @param {number} limit - Number of transfers to retrieve
 * @returns {Promise<object[]>} - Transfer history
 */
export async function getTransferHistory(accountId, limit = 10) {
  if (!stripe) {
    return {
      transfers: [],
      mock: true,
    };
  }
  
  try {
    const transfers = await stripe.transfers.list({
      destination: accountId,
      limit,
    });
    
    return {
      transfers: transfers.data.map(t => ({
        id: t.id,
        amount: t.amount,
        currency: t.currency,
        created: new Date(t.created * 1000),
        description: t.description,
        metadata: t.metadata,
      })),
      hasMore: transfers.has_more,
    };
  } catch (error) {
    console.error('[StripeConnect] Transfer history failed:', error);
    throw error;
  }
}

/**
 * Get payout balance for a mentor
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Promise<object>} - Balance details
 */
export async function getMentorBalance(accountId) {
  if (!stripe) {
    return {
      available: [{ amount: 0, currency: 'aud' }],
      pending: [{ amount: 0, currency: 'aud' }],
      mock: true,
    };
  }
  
  try {
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });
    
    return {
      available: balance.available,
      pending: balance.pending,
    };
  } catch (error) {
    console.error('[StripeConnect] Balance check failed:', error);
    throw error;
  }
}

export default {
  isConfigured,
  createConnectAccount,
  createOnboardingLink,
  createDashboardLink,
  getAccountStatus,
  transferToMentor,
  calculatePayout,
  processSessionPayment,
  getTransferHistory,
  getMentorBalance,
  DEFAULT_SESSION_RATE_CENTS,
  PLATFORM_FEE_PERCENT,
};
