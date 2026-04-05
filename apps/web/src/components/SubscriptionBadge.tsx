'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/apiClient';

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string | null }> = {
  FREE: {
    label: 'Free',
    color: 'bg-gray-600 text-gray-200',
    icon: null,
  },
  STARTER: {
    label: 'Starter',
    color: 'bg-blue-600 text-white',
    icon: '⚡',
  },
  PROFESSIONAL: {
    label: 'Pro',
    color: 'bg-purple-600 text-white',
    icon: '🚀',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    color: 'bg-indigo-600 text-white',
    icon: '💼',
  },
  RAP: {
    label: 'RAP Partner',
    color: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
    icon: '🤝',
  },
};

interface Subscription {
  tier: string;
  status: string;
  currentPeriodEnd?: string;
}

interface SubscriptionBadgeProps {
  className?: string;
  showUpgrade?: boolean;
  compact?: boolean;
}

export default function SubscriptionBadge({ 
  className = '',
  showUpgrade = true,
  compact = false,
}: SubscriptionBadgeProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const { ok, data } = await api<Subscription>('/subscriptions/current');
        if (ok && data) {
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (loading) {
    return <div className={`h-6 w-16 bg-gray-200 animate-pulse rounded ${className}`} />;
  }

  if (!subscription) {
    return null;
  }

  const tier = TIER_CONFIG[subscription.tier] || TIER_CONFIG.FREE;
  const isPaid = subscription.tier !== 'FREE';

  if (compact) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${tier.color} ${className}`}>
        {tier.icon && <span className="mr-1">{tier.icon}</span>}
        {tier.label}
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tier.color}`}>
        {tier.icon && <span className="mr-1.5">{tier.icon}</span>}
        {tier.label}
      </span>
      
      {showUpgrade && !isPaid && (
        <Link 
          href="/pricing" 
          className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
        >
          Upgrade
        </Link>
      )}
    </div>
  );
}
