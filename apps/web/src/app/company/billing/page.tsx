'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, CreditCard, FileText, AlertCircle, Shield, Zap, Star, Building } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { getErrorMessage } from '@/lib/formatters';

interface Tier {
  tier: string;
  name: string;
  price: number;
  priceLabel: string;
  features: string[];
  popular?: boolean;
  isEnterprise?: boolean;
}

interface Subscription {
  tier: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  limits?: {
    maxJobs: number;
  };
}

interface Invoice {
  id: string;
  createdAt: string;
  amount: number;
  currency: string;
  status: string;
  invoiceUrl?: string;
  invoicePdf?: string;
}

function BillingContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'info' | 'error', text: string } | null>(null);

  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const tierFromUrl = searchParams.get('tier');

  useEffect(() => {
    if (success === 'true') {
      setMessage({ type: 'success', text: `Successfully upgraded to ${tierFromUrl || 'new'} plan! Welcome aboard.` });
    } else if (canceled === 'true') {
      setMessage({ type: 'info', text: 'Checkout was cancelled. No changes were made to your subscription.' });
    }
  }, [success, canceled, tierFromUrl]);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        load();
      } else {
        setLoading(false);
      }
    }
  }, [isAuthenticated, authLoading]);

  async function load() {
    setLoading(true);
    try {
      const [tiersRes, subRes, invoicesRes] = await Promise.all([
        api<{ tiers: Tier[] }>('/subscriptions/v2/tiers'),
        api<{ subscription: Subscription }>('/subscriptions/v2/me'),
        api<{ invoices: Invoice[] }>('/subscriptions/v2/stripe-invoices'),
      ]);

      if (tiersRes.ok && tiersRes.data) {
        setTiers(tiersRes.data.tiers);
      } else {
        // Fallback defaults
        setTiers([
          { tier: 'FREE', name: 'Free', price: 0, priceLabel: 'Free', features: ['1 job posting'] },
          { tier: 'STARTER', name: 'Starter', price: 9900, priceLabel: '$99/mo', features: ['3 job postings', 'Basic analytics'] },
          { tier: 'PROFESSIONAL', name: 'Professional', price: 24900, priceLabel: '$249/mo', features: ['10 job postings', 'Full analytics'], popular: true },
          { tier: 'ENTERPRISE', name: 'Enterprise', price: 49900, priceLabel: '$499/mo', features: ['Unlimited postings', 'Priority support'] },
        ]);
      }

      if (subRes.ok && subRes.data) {
        setSubscription(subRes.data.subscription);
      }

      if (invoicesRes.ok && invoicesRes.data) {
        setInvoices(invoicesRes.data.invoices);
      }
    } catch (err: unknown) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(tierId: string) {
    setActionLoading(true);
    try {
      const res = await api<{ url: string }>('/subscriptions/v2/checkout', {
        method: 'POST',
        body: { tier: tierId },
      });

      if (res.ok && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setMessage({ type: 'error', text: 'Failed to start checkout. Please try again.' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Checkout failed') });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleManageSubscription() {
    setActionLoading(true);
    try {
      const res = await api<{ url: string }>('/subscriptions/v2/portal', {
        method: 'POST',
      });

      if (res.ok && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setMessage({ type: 'error', text: 'Failed to open billing portal.' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Portal failed') });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
      <p className="text-slate-400 mb-8">Manage your plan, payment methods, and invoices.</p>

      {message && (
        <div className={`p-4 rounded-xl mb-8 flex items-center gap-3 ${
          message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
          message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
           message.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
           <Shield className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Current Subscription */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Current Plan</h2>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-blue-400">{subscription?.tier || 'FREE'}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full border ${
                subscription?.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/50 text-slate-400 border-slate-600'
              }`}>
                {subscription?.status || 'Active'}
              </span>
            </div>
            {subscription?.cancelAtPeriodEnd && (
              <p className="text-amber-400 text-sm mt-2">
                Cancels on {new Date(subscription.currentPeriodEnd!).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleManageSubscription}
              disabled={actionLoading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              Manage Billing
            </button>
          </div>
        </div>
      </div>

      {/* Plans */}
      <h2 className="text-xl font-semibold text-white mb-6">Available Plans</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {tiers.map((tier) => {
          const isCurrent = subscription?.tier === tier.tier;
          const Icon = tier.tier === 'ENTERPRISE' ? Building : tier.tier === 'PROFESSIONAL' ? Star : Zap;
          
          return (
            <div 
              key={tier.tier}
              className={`relative rounded-xl border-2 p-6 flex flex-col ${
                isCurrent 
                  ? 'bg-slate-900/80 border-blue-500 shadow-lg shadow-blue-500/10' 
                  : tier.popular 
                    ? 'bg-slate-900/50 border-indigo-500/50' 
                    : 'bg-slate-900/30 border-slate-800'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}
              
              <div className="mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                  isCurrent ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <div className="text-2xl font-bold text-white mt-1">{tier.priceLabel}</div>
              </div>
              
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              
              <button
                onClick={() => handleSubscribe(tier.tier)}
                disabled={isCurrent || actionLoading}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent 
                    ? 'bg-slate-800 text-slate-400 cursor-default' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isCurrent ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      <h2 className="text-xl font-semibold text-white mb-6">Invoice History</h2>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
        {invoices.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-slate-300">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-white font-medium">
                    ${(inv.amount / 100).toFixed(2)} {inv.currency.toUpperCase()}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full border ${
                      inv.status === 'paid' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-slate-700/50 text-slate-400 border-slate-600'
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {inv.invoicePdf && (
                      <a 
                        href={inv.invoicePdf} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-slate-400">
            No invoices found.
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12 min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-700 border-t-blue-500" /></div>}>
      <BillingContent />
    </Suspense>
  );
}
