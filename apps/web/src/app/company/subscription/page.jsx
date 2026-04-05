"use client";
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import PricingTable from '@/components/PricingTable';
import api from '@/lib/apiClient';

function SubscriptionContent() {
  const { isAuthenticated } = useAuth();
  const [tiers, setTiers] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [upgrading, setUpgrading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Define loadCurrent as a standalone function so it can be called from useEffects
  const loadCurrent = async () => {
    try {
      const res = await api('/subscriptions/v2/me');
      if (res.ok && res.data?.subscription) {
        setCurrent(res.data.subscription);
      }
    } catch (err) {
      console.error('Failed to refresh subscription:', err);
    }
  };

  // Success/cancel from Stripe
  useEffect(() => {
    if (!searchParams) return;
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const tier = searchParams.get('tier');

    if (success === 'true') {
      setMessage(`Successfully upgraded to ${tier || 'a new'} plan. Thank you!`);
      // Refresh current subscription
      loadCurrent();
    } else if (canceled === 'true') {
      setMessage('Checkout was cancelled. No changes were made.');
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [tiersRes, subRes] = await Promise.all([
          api('/subscriptions/v2/tiers'),
          isAuthenticated ? api('/subscriptions/v2/me') : Promise.resolve({ ok: false }),
        ]);

        if (tiersRes.ok) setTiers(tiersRes.data?.tiers || []);
        if (subRes.ok) setCurrent(subRes.data?.subscription || null);
      } catch (err) {
        console.error('Failed to load subscription options:', err);
        setMessage('Failed to load subscription options');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAuthenticated]);

  async function handleSelectTier(tierKey) {
    if (!isAuthenticated) return setMessage('Please log in to manage subscriptions.');
    setUpgrading(true);
    setMessage(null);

    // Track upgrade CTA click
    import('../../../lib/analytics').then(m => m.trackEvent({ eventType: 'cta_click', metadata: { location: 'subscription.pricing_card', tier: tierKey } }));

    try {
      const res = await api('/subscriptions/v2/checkout', {
        method: 'POST',
        body: { tier: tierKey },
      });

      if (!res.ok) throw new Error(res.data?.error || res.error || 'Failed to start checkout');

      if (res.data?.message && String(res.data.message).includes('not configured')) {
        // Stripe not configured - subscription updated directly
        setMessage(res.data.message);
        // Refresh
        await loadCurrent();
        setUpgrading(false);
        return;
      }

      const checkoutUrl = res.data?.url || res.data?.checkoutUrl;
      if (checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      setMessage(err.message || 'Failed to upgrade');
      setUpgrading(false);
    }
  }

  if (loading) return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <div className="flex items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-600 border-t-blue-500" />
        <span className="text-slate-300">Loading subscription options…</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/company/dashboard" className="hover:text-blue-400 transition-colors">Dashboard</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Subscription</li>
        </ol>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Subscription Plans</h1>
        <p className="text-slate-400">Choose the plan that fits your hiring needs. For RAP Partnership and Enterprise contracts, contact sales for custom pricing.</p>
      </div>

      {message && (
        <div 
          data-testid="subscription-message"
          className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
            message.includes('Successfully') || message.includes('upgraded')
              ? 'bg-green-950/40 border-green-800/60 text-green-200'
              : message.includes('cancelled') || message.includes('cancel')
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
              : 'bg-blue-950/40 border-blue-900/60 text-blue-200'
          }`}
        >
          <span className="text-lg mt-0.5">
            {message.includes('Successfully') ? '✅' : message.includes('cancel') ? '⚠️' : 'ℹ️'}
          </span>
          <span data-testid="subscription-message-text">{message}</span>
        </div>
      )}

      <PricingTable
        currentTier={current?.tier || 'FREE'}
        onSelectTier={handleSelectTier}
        showRAPTier={true}
      />

      <div className="mt-8 bg-gradient-to-r from-slate-900/60 to-slate-800/40 border border-slate-700 p-6 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-600/20 rounded-lg">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Enterprise & RAP Compliance</h3>
            <p className="text-sm text-slate-400 mb-4">For large organizations, RAP compliance reporting, or custom integrations, contact us for a tailored solution.</p>
            <a 
              href="mailto:enterprise@ngurrapathways.com.au" 
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Contact enterprise sales
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto py-12 text-slate-300">Loading subscription options…</div>}>
      <SubscriptionContent />
    </Suspense>
  );
}
