"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useAuth from '../../../../hooks/useAuth';
import { AlertTriangle, X, Check, ArrowLeft, CreditCard } from 'lucide-react';
import api from '@/lib/apiClient';

const CANCELLATION_REASONS = [
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'not_using', label: 'Not using enough' },
  { id: 'missing_features', label: 'Missing features I need' },
  { id: 'switching', label: 'Switching to another platform' },
  { id: 'temporary', label: 'Temporary pause (will return)' },
  { id: 'other', label: 'Other reason' },
];

export default function CancelClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [step, setStep] = useState('confirm'); // confirm, reason, complete
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState(null);

  const monthlyPriceLabel = (() => {
    if (!subscription) return null;

    if (typeof subscription.priceLabel === 'string' && subscription.priceLabel.trim()) {
      return subscription.priceLabel;
    }

    const tier = String(subscription.tier || '').toUpperCase();
    const tierMonthly = {
      STARTER: 99,
      PROFESSIONAL: 249,
      ENTERPRISE: 499,
      RAP: null,
      FREE: 0,
    };

    if (tier === 'RAP') return 'Custom';
    if (Number.isFinite(tierMonthly[tier])) return `$${tierMonthly[tier]}/month`;

    // Try to infer from numeric price if present.
    const raw = subscription.price;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      // Heuristic: values like 9900/24900 are cents.
      const dollars = raw >= 1000 ? raw / 100 : raw;
      return `$${dollars}/month`;
    }

    return null;
  })();

  useEffect(() => {
    async function loadSubscription() {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }
      try {
        const res = await api('/subscriptions/v2/me');
        if (res.ok) {
          setSubscription(res.data?.subscription || null);
        }
      } catch (err) {
        console.error('Failed to load subscription:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSubscription();
  }, [isAuthenticated]);

  const handleCancel = async () => {
    setCancelling(true);
    setError(null);

    try {
      const res = await api('/subscriptions/v2/cancel', {
        method: 'POST',
        body: { reason, feedback },
      });

      if (!res.ok) {
        throw new Error(res.data?.error || res.error || 'Failed to cancel subscription');
      }

      setStep('complete');
    } catch (err) {
      setError(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-64"></div>
          <div className="h-40 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!subscription || subscription.tier === 'FREE') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
          <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Active Subscription</h2>
          <p className="text-slate-400 mb-6">You don't have an active paid subscription to cancel.</p>
          <a
            href="/company/billing"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Billing
          </a>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Subscription Cancelled</h2>
          <p className="text-slate-300 mb-6">
            Your subscription has been cancelled. You'll continue to have access to your current plan 
            until the end of your billing period.
          </p>
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6 inline-block">
            <p className="text-sm text-slate-400">Access until</p>
            <p className="text-lg font-semibold text-white">
              {subscription.currentPeriodEnd 
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                : 'End of billing period'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <a
              href="/company/billing"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500"
            >
              Back to Billing
            </a>
            <a
              href="/company/dashboard"
              className="px-6 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-slate-400">
          <li><a href="/company/dashboard" className="hover:text-blue-400">Dashboard</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li><a href="/company/billing" className="hover:text-blue-400">Billing</a></li>
          <li><span className="text-slate-600">/</span></li>
          <li className="text-white">Cancel Subscription</li>
        </ol>
      </nav>

      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-red-950/30 border-b border-red-900/30 p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h1 className="text-xl font-bold">Cancel Subscription</h1>
          </div>
        </div>

        <div className="p-6">
          {step === 'confirm' && (
            <>
              {/* Current Plan Summary */}
              <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-slate-400">Current Plan</p>
                    <p className="text-lg font-semibold">{subscription.tier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Billing</p>
                    <p className="font-medium">{monthlyPriceLabel || '—'}</p>
                  </div>
                </div>
              </div>

              {/* What You'll Lose */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 text-red-300">What you'll lose:</h3>
                <ul className="space-y-2 text-slate-300">
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    {subscription.limits?.maxJobs === -1 ? 'Unlimited' : subscription.limits?.maxJobs} active job postings
                  </li>
                  {subscription.limits?.featuredJobs > 0 && (
                    <li className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      {subscription.limits.featuredJobs} featured job slots
                    </li>
                  )}
                  {subscription.limits?.analytics && (
                    <li className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      Advanced analytics dashboard
                    </li>
                  )}
                  {subscription.limits?.prioritySupport && (
                    <li className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-400" />
                      Priority support
                    </li>
                  )}
                </ul>
              </div>

              {/* Free Tier Preview */}
              <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2 text-blue-300">After cancellation:</h3>
                <p className="text-slate-300 text-sm">
                  You'll be downgraded to the Free tier with 1 active job posting and basic features. 
                  Your existing jobs will become inactive.
                </p>
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => router.push('/company/billing')}
                  className="flex-1 px-4 py-3 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Keep My Subscription
                </button>
                <button
                  onClick={() => setStep('reason')}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500"
                >
                  Continue to Cancel
                </button>
              </div>
            </>
          )}

          {step === 'reason' && (
            <>
              <h3 className="font-semibold mb-4">Why are you cancelling?</h3>
              <p className="text-slate-400 text-sm mb-6">
                Your feedback helps us improve. Please let us know why you're leaving.
              </p>

              <div className="space-y-3 mb-6">
                {CANCELLATION_REASONS.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      reason === r.id
                        ? 'border-blue-500 bg-blue-950/30'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.id}
                      checked={reason === r.id}
                      onChange={(e) => setReason(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      reason === r.id ? 'border-blue-500' : 'border-slate-600'
                    }`}>
                      {reason === r.id && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Additional feedback (optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Tell us more about your experience..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 px-4 py-3 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  onClick={handleCancel}
                  disabled={!reason || cancelling}
                  className={`flex-1 px-4 py-3 rounded-lg ${
                    !reason || cancelling
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-500'
                  }`}
                >
                  {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
