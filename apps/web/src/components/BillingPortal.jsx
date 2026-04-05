'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Subscription tier details
 */
const TIERS = {
    STARTER: {
        name: 'Starter',
        price: 99,
        priceId: 'price_starter_monthly',
        features: [
            'Up to 5 job listings',
            'Basic candidate search',
            'Email support',
            'Standard job visibility',
        ],
        limits: {
            jobPosts: 5,
            featuredJobs: 0,
            candidateViews: 50,
        },
    },
    PROFESSIONAL: {
        name: 'Professional',
        price: 249,
        priceId: 'price_professional_monthly',
        popular: true,
        features: [
            'Up to 20 job listings',
            'Advanced candidate search',
            'Priority email support',
            '2 featured job slots',
            'Basic analytics dashboard',
            'RAP progress tracking',
        ],
        limits: {
            jobPosts: 20,
            featuredJobs: 2,
            candidateViews: 200,
        },
    },
    ENTERPRISE: {
        name: 'Enterprise',
        price: 499,
        priceId: 'price_enterprise_monthly',
        features: [
            'Unlimited job listings',
            'Full candidate database access',
            'Dedicated account manager',
            '10 featured job slots',
            'Advanced analytics & reporting',
            'RAP compliance reports',
            'API access',
            'White-label options',
        ],
        limits: {
            jobPosts: -1, // unlimited
            featuredJobs: 10,
            candidateViews: -1,
        },
    },
};

/**
 * Billing Portal Component for Company Dashboard
 */
export default function BillingPortal({ companyId }) {
    const [subscription, setSubscription] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Fetch subscription data
    const fetchSubscription = useCallback(async () => {
        try {
            const { ok, data } = await api('/subscriptions');
            
            if (!ok) throw new Error('Failed to fetch subscription');
            
            setSubscription(data.subscription);
            setInvoices(data.invoices || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchSubscription();
    }, [fetchSubscription]);
    
    // Handle upgrade/change plan
    const handleChangePlan = async (tier) => {
        setActionLoading(true);
        try {
            const { ok, data } = await api('/subscriptions/checkout', {
                method: 'POST',
                body: { tier },
            });
            
            if (!ok) throw new Error('Failed to create checkout session');
            
            // Redirect to Stripe Checkout
            window.location.href = data.checkoutUrl;
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };
    
    // Open Stripe billing portal
    const handleManageBilling = async () => {
        setActionLoading(true);
        try {
            const { ok, data } = await api('/subscriptions/portal', {
                method: 'POST',
            });
            
            if (!ok) throw new Error('Failed to open billing portal');
            
            window.location.href = data.portalUrl;
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };
    
    // Cancel subscription
    const handleCancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.')) {
            return;
        }
        
        setActionLoading(true);
        try {
            const { ok } = await api('/subscriptions/cancel', {
                method: 'POST',
            });
            
            if (!ok) throw new Error('Failed to cancel subscription');
            
            await fetchSubscription();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };
    
    // Reactivate subscription
    const handleReactivate = async () => {
        setActionLoading(true);
        try {
            const { ok } = await api('/subscriptions/reactivate', {
                method: 'POST',
            });
            
            if (!ok) throw new Error('Failed to reactivate subscription');
            
            await fetchSubscription();
        } catch (err) {
            setError(err.message);
        } finally {
            setActionLoading(false);
        }
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }
    
    const currentTier = subscription?.tier || 'FREE';
    const tierInfo = TIERS[currentTier];
    
    return (
        <div className="space-y-8">
            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
            
            {/* Current Plan */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
                
                {subscription ? (
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-2xl font-bold text-primary">
                                {tierInfo?.name || 'Free'} Plan
                            </p>
                            <p className="text-gray-600 mt-1">
                                {subscription.status === 'active' ? (
                                    <>
                                        ${tierInfo?.price || 0}/month • Renews on{' '}
                                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                    </>
                                ) : subscription.status === 'cancelled' ? (
                                    <>
                                        Cancelled • Access until{' '}
                                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                    </>
                                ) : (
                                    `Status: ${subscription.status}`
                                )}
                            </p>
                        </div>
                        <div className="flex gap-3">
                            {subscription.status === 'active' && (
                                <>
                                    <button
                                        onClick={handleManageBilling}
                                        disabled={actionLoading}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Manage Billing
                                    </button>
                                    <button
                                        onClick={handleCancelSubscription}
                                        disabled={actionLoading}
                                        className="px-4 py-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                            {subscription.status === 'cancelled' && (
                                <button
                                    onClick={handleReactivate}
                                    disabled={actionLoading}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                                >
                                    Reactivate
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-2xl font-bold text-gray-900">Free Plan</p>
                        <p className="text-gray-600 mt-1">
                            Limited features. Upgrade to unlock more capabilities.
                        </p>
                    </div>
                )}
                
                {/* Usage Stats */}
                {tierInfo && (
                    <div className="mt-6 grid grid-cols-3 gap-4">
                        <UsageStat
                            label="Job Posts"
                            used={subscription?.usage?.jobPosts || 0}
                            limit={tierInfo.limits.jobPosts}
                        />
                        <UsageStat
                            label="Featured Jobs"
                            used={subscription?.usage?.featuredJobs || 0}
                            limit={tierInfo.limits.featuredJobs}
                        />
                        <UsageStat
                            label="Candidate Views"
                            used={subscription?.usage?.candidateViews || 0}
                            limit={tierInfo.limits.candidateViews}
                        />
                    </div>
                )}
            </div>
            
            {/* Plans Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                {Object.entries(TIERS).map(([key, tier]) => (
                    <div
                        key={key}
                        className={`bg-white rounded-xl shadow-sm border p-6 relative ${
                            tier.popular ? 'border-primary ring-2 ring-primary/20' : ''
                        }`}
                    >
                        {tier.popular && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs px-3 py-1 rounded-full">
                                Most Popular
                            </span>
                        )}
                        
                        <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                        <p className="mt-2">
                            <span className="text-3xl font-bold">${tier.price}</span>
                            <span className="text-gray-600">/month</span>
                        </p>
                        
                        <ul className="mt-6 space-y-3">
                            {tier.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-gray-600 text-sm">{feature}</span>
                                </li>
                            ))}
                        </ul>
                        
                        <button
                            onClick={() => handleChangePlan(key)}
                            disabled={actionLoading || currentTier === key}
                            className={`mt-6 w-full py-2 px-4 rounded-lg font-medium disabled:opacity-50 ${
                                currentTier === key
                                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                    : tier.popular
                                    ? 'bg-primary text-white hover:bg-primary-dark'
                                    : 'border border-primary text-primary hover:bg-primary/5'
                            }`}
                        >
                            {currentTier === key ? 'Current Plan' : 'Select Plan'}
                        </button>
                    </div>
                ))}
            </div>
            
            {/* Invoice History */}
            {invoices.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Invoice History</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Date</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Description</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Amount</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Status</th>
                                    <th className="text-left py-3 px-4 text-gray-600 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="border-b last:border-0">
                                        <td className="py-3 px-4">
                                            {new Date(invoice.created * 1000).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4">{invoice.description || 'Subscription'}</td>
                                        <td className="py-3 px-4">
                                            ${(invoice.amount_paid / 100).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                                invoice.status === 'paid'
                                                    ? 'bg-green-100 text-green-700'
                                                    : invoice.status === 'open'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {invoice.hosted_invoice_url && (
                                                <a
                                                    href={invoice.hosted_invoice_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:underline text-sm"
                                                >
                                                    View
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Usage stat component
 */
function UsageStat({ label, used, limit }) {
    const isUnlimited = limit === -1;
    const percentage = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
    const isNearLimit = !isUnlimited && percentage >= 80;
    
    return (
        <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">{label}</p>
            <p className="text-xl font-semibold mt-1">
                {used} / {isUnlimited ? '∞' : limit}
            </p>
            {!isUnlimited && (
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full ${
                            isNearLimit ? 'bg-orange-500' : 'bg-primary'
                        }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </div>
    );
}
