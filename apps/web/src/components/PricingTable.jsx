'use client';

import { useState } from 'react';
import api from '@/lib/apiClient';
import { useRouter } from 'next/navigation';
import { Check, Star, Shield, Zap } from 'lucide-react';

const TIERS = [
  {
    name: 'Free',
    key: 'FREE',
    price: 0,
    period: 'forever',
    description: 'Get started with essential job posting',
    features: [
      '1 active job listing',
      'Basic applicant management',
      'Email notifications',
      'Standard support',
    ],
    limitations: [
      'No analytics',
      'No featured placement',
      'Limited visibility',
    ],
    cta: 'Current Plan',
    popular: false,
    icon: Shield,
    color: 'bg-gray-100 dark:bg-gray-800 cosmic:bg-white/10'
  },
  {
    name: 'Starter',
    key: 'STARTER',
    price: 99,
    period: '/month',
    description: 'Perfect for small businesses',
    features: [
      '5 active job listings',
      'Applicant tracking',
      'Basic analytics',
      'Interview scheduling',
      'Priority email support',
    ],
    limitations: [],
    cta: 'Upgrade',
    popular: false,
    icon: Zap,
    color: 'bg-emerald-50 dark:bg-emerald-900/20 cosmic:bg-emerald-900/30'
  },
  {
    name: 'Professional',
    key: 'PROFESSIONAL',
    price: 249,
    period: '/month',
    description: 'For growing organizations',
    features: [
      '20 active job listings',
      'Advanced analytics & reports',
      'Featured job placement',
      'Bulk applicant management',
      'AI-powered matching',
      'Priority support',
    ],
    limitations: [],
    cta: 'Upgrade',
    popular: true,
    icon: Star,
    color: 'bg-purple-50 dark:bg-purple-900/20 cosmic:bg-purple-royal/20 border-purple-royal'
  },
  {
    name: 'Enterprise',
    key: 'ENTERPRISE',
    price: 499,
    period: '/month',
    description: 'For large employers',
    features: [
      'Unlimited job listings',
      'Full analytics suite',
      'Premium featured placement',
      'Dedicated account manager',
      'API access',
      'Custom integrations',
      'SLA guarantee',
    ],
    limitations: [],
    cta: 'Upgrade',
    popular: false,
    icon: Shield,
    color: 'bg-blue-50 dark:bg-blue-900/20 cosmic:bg-celestial-blue/10'
  },
  {
    name: 'RAP Partnership',
    key: 'RAP',
    price: 5000,
    period: '/month',
    description: 'Reconciliation Action Plan compliance',
    features: [
      'Everything in Enterprise',
      'RAP compliance dashboard',
      'Indigenous hiring metrics',
      'Quarterly impact reports',
      'Community partnership tools',
      'Closing the Gap alignment',
      'Dedicated Indigenous liaison',
      'Cultural training resources',
    ],
    limitations: [],
    cta: 'Contact Sales',
    popular: false,
    enterprise: true,
    icon: Star,
    color: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 cosmic:from-gold/20 cosmic:to-orange-600/20 border-gold'
  },
];

export default function PricingTable({ currentTier = 'FREE', onSelect }) {
  const [loading, setLoading] = useState(null);
  const router = useRouter();

  const handleSelect = async (tier) => {
    if (onSelect) {
      onSelect(tier);
      return;
    }

    if (tier.key === 'FREE' || tier.cta === 'Contact Sales') {
      router.push('/contact');
      return;
    }

    setLoading(tier.key);
    try {
      const { ok, data } = await api('/billing/checkout', {
        method: 'POST',
        body: { planId: tier.key },
      });

      if (ok && data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout failed', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {TIERS.map((tier) => {
        const isCurrent = currentTier === tier.key;
        const Icon = tier.icon;

        return (
          <div
            key={tier.key}
            className={`
              relative rounded-2xl p-6 flex flex-col h-full border transition-all duration-300
              ${tier.popular 
                ? 'border-purple-500 shadow-xl scale-105 z-10 dark:border-purple-400 cosmic:border-gold cosmic:shadow-gold/20' 
                : 'border-gray-200 dark:border-gray-700 cosmic:border-white/10 hover:border-purple-300 dark:hover:border-purple-700'}
              ${tier.color}
              ${isCurrent ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' : ''}
              bg-white dark:bg-gray-800 cosmic:bg-cosmic-dark/80 backdrop-blur-sm
            `}
          >
            {tier.popular && (
              <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg cosmic:bg-gold cosmic:text-black">
                POPULAR
              </div>
            )}

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white cosmic:text-gray-50">{tier.name}</h3>
                {Icon && <Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 cosmic:text-gold" />}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 cosmic:text-gray-300 min-h-[40px]">{tier.description}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white cosmic:text-white">${tier.price}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1 cosmic:text-gray-400">{tier.period}</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start text-sm">
                  <Check className="w-5 h-5 text-green-500 mr-2 shrink-0 cosmic:text-emerald" />
                  <span className="text-gray-600 dark:text-gray-300 cosmic:text-gray-200">{feature}</span>
                </li>
              ))}
              {tier.limitations?.map((limit, idx) => (
                <li key={`lim-${idx}`} className="flex items-start text-sm opacity-60">
                  <div className="w-5 h-5 mr-2 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-600" />
                  </div>
                  <span className="text-gray-500 dark:text-gray-500 cosmic:text-gray-400 decoration-slate-500 line-through">{limit}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSelect(tier)}
              disabled={loading === tier.key || isCurrent}
              className={`
                w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200
                ${isCurrent
                  ? 'bg-gray-100 text-gray-500 cursor-default dark:bg-gray-700 dark:text-gray-400'
                  : tier.popular
                    ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg cosmic:bg-gradient-to-r cosmic:from-purple-royal cosmic:to-cosmic-linker'
                    : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 cosmic:bg-cosmic-light cosmic:text-white cosmic:hover:bg-cosmic-lighter'}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {loading === tier.key ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : isCurrent ? (
                'Current Plan'
              ) : (
                tier.cta
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
