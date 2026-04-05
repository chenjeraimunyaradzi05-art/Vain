'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './Button';
import { useToast } from './Toast';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * ReferralSystem - Complete referral program management
 * 
 * Features:
 * - Generate referral links
 * - Track referrals
 * - View and claim rewards
 * - Share via social media
 * - Referral statistics
 */

interface ReferralInfo {
  code: string;
  link: string;
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalRewards: number;
  pendingRewards: number;
}

interface Referral {
  id: string;
  referredUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  completedAt?: string;
  reward?: number;
}

interface Reward {
  id: string;
  type: 'credit' | 'discount' | 'premium' | 'badge';
  name: string;
  description: string;
  value: number;
  status: 'available' | 'claimed' | 'expired';
  expiresAt?: string;
  claimedAt?: string;
}

interface ReferralTier {
  tier: number;
  name: string;
  minReferrals: number;
  bonusMultiplier: number;
  perks: string[];
  icon: string;
}

// Referral Tiers
const referralTiers: ReferralTier[] = [
  {
    tier: 1,
    name: 'Starter',
    minReferrals: 0,
    bonusMultiplier: 1,
    perks: ['$10 per referral'],
    icon: '🌱',
  },
  {
    tier: 2,
    name: 'Connector',
    minReferrals: 5,
    bonusMultiplier: 1.25,
    perks: ['$12.50 per referral', 'Priority support'],
    icon: '🔗',
  },
  {
    tier: 3,
    name: 'Ambassador',
    minReferrals: 15,
    bonusMultiplier: 1.5,
    perks: ['$15 per referral', 'Exclusive badge', 'Early access to features'],
    icon: '⭐',
  },
  {
    tier: 4,
    name: 'Champion',
    minReferrals: 50,
    bonusMultiplier: 2,
    perks: ['$20 per referral', 'VIP badge', 'Free premium', 'Direct team access'],
    icon: '👑',
  },
];

// API functions
const referralApi = {
  async getReferralInfo(): Promise<ReferralInfo> {
    const res = await fetch('/api/referrals', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch referral info');
    return res.json();
  },

  async generateLink(campaign?: string): Promise<{ link: string }> {
    const res = await fetch('/api/referrals/link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ campaign }),
    });
    if (!res.ok) throw new Error('Failed to generate link');
    return res.json();
  },

  async getReferrals(params: { status?: string; page?: number; limit?: number } = {}): Promise<{ referrals: Referral[] }> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    
    const res = await fetch(`/api/referrals/list?${query.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch referrals');
    return res.json();
  },

  async getRewards(): Promise<{ rewards: Reward[] }> {
    const res = await fetch('/api/referrals/rewards', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch rewards');
    return res.json();
  },

  async claimReward(rewardId: string): Promise<void> {
    const res = await fetch(`/api/referrals/rewards/${rewardId}/claim`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to claim reward');
  },
};

// Share links generator
const generateShareLinks = (referralLink: string, message: string) => ({
  twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(referralLink)}`,
  facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
  linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
  whatsapp: `https://wa.me/?text=${encodeURIComponent(`${message} ${referralLink}`)}`,
  email: `mailto:?subject=${encodeURIComponent('Join Ngurra Pathways!')}&body=${encodeURIComponent(`${message}\n\n${referralLink}`)}`,
});

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    expired: { label: 'Expired', className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' },
    available: { label: 'Available', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
    claimed: { label: 'Claimed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  };
  
  const { label, className } = config[status as keyof typeof config] || config.pending;
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
      {label}
    </span>
  );
}

// Stats Card Component
function StatsCard({ 
  icon, 
  label, 
  value, 
  subValue,
  color = 'blue',
}: { 
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-orange-500',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-4 text-white`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-white/80 text-sm">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subValue && <p className="text-xs text-white/60">{subValue}</p>}
        </div>
      </div>
    </div>
  );
}

// Tier Progress Component
function TierProgress({ completedReferrals }: { completedReferrals: number }) {
  const currentTier = referralTiers.reduce((acc, tier) => 
    completedReferrals >= tier.minReferrals ? tier : acc
  , referralTiers[0]);
  
  const nextTier = referralTiers.find(t => t.minReferrals > completedReferrals);
  const progress = nextTier 
    ? ((completedReferrals - currentTier.minReferrals) / (nextTier.minReferrals - currentTier.minReferrals)) * 100
    : 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{currentTier.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{currentTier.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {currentTier.bonusMultiplier}x reward multiplier
            </p>
          </div>
        </div>
        {nextTier && (
          <div className="text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">Next: {nextTier.name}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {nextTier.minReferrals - completedReferrals} more referrals
            </p>
          </div>
        )}
      </div>
      
      {nextTier && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Tier Perks */}
      <div className="space-y-2">
        {currentTier.perks.map((perk, index) => (
          <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {perk}
          </div>
        ))}
      </div>
    </div>
  );
}

// Share Modal Component
function ShareModal({ 
  isOpen, 
  onClose, 
  referralLink,
}: { 
  isOpen: boolean;
  onClose: () => void;
  referralLink: string;
}) {
  const { addToast } = useToast();
  const shareMessage = "Join me on Ngurra Pathways - the platform connecting Indigenous Australians with career opportunities!";
  const shareLinks = generateShareLinks(referralLink, shareMessage);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      addToast('Link copied to clipboard!', 'success');
    } catch {
      addToast('Failed to copy link', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Your Referral Link</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Link Input */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg
              bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <Button onClick={copyToClipboard}>
            Copy
          </Button>
        </div>

        {/* Social Share Buttons */}
        <div className="grid grid-cols-5 gap-3">
          <a
            href={shareLinks.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-3 bg-[#1DA1F2] rounded-lg text-white hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
          </a>
          <a
            href={shareLinks.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-3 bg-[#4267B2] rounded-lg text-white hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a
            href={shareLinks.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-3 bg-[#0A66C2] rounded-lg text-white hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <a
            href={shareLinks.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-3 bg-[#25D366] rounded-lg text-white hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
          <a
            href={shareLinks.email}
            className="flex items-center justify-center p-3 bg-gray-600 rounded-lg text-white hover:opacity-90 transition-opacity"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// Main Referral System Component
export function ReferralSystem() {
  const { user } = useAuth();
  const { addToast } = useToast();
  
  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [activeTab, setActiveTab] = useState<'referrals' | 'rewards'>('referrals');
  const [referralFilter, setReferralFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [info, referralsData, rewardsData] = await Promise.all([
        referralApi.getReferralInfo(),
        referralApi.getReferrals(),
        referralApi.getRewards(),
      ]);
      
      setReferralInfo(info);
      setReferrals(referralsData.referrals);
      setRewards(rewardsData.rewards);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      addToast('Failed to load referral data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Claim reward
  const handleClaimReward = async (rewardId: string) => {
    try {
      await referralApi.claimReward(rewardId);
      setRewards(prev => prev.map(r => 
        r.id === rewardId ? { ...r, status: 'claimed', claimedAt: new Date().toISOString() } : r
      ));
      addToast('Reward claimed successfully!', 'success');
    } catch (error) {
      addToast('Failed to claim reward', 'error');
    }
  };

  // Filter referrals
  const filteredReferrals = referralFilter === 'all' 
    ? referrals 
    : referrals.filter(r => r.status === referralFilter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Referral Program
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Invite friends and earn rewards for each successful referral
          </p>
        </div>
        <Button onClick={() => setShowShareModal(true)}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share & Invite
        </Button>
      </div>

      {/* Stats Cards */}
      {referralInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            label="Total Referrals"
            value={referralInfo.totalReferrals}
            color="blue"
          />
          <StatsCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Pending"
            value={referralInfo.pendingReferrals}
            subValue="Awaiting completion"
            color="yellow"
          />
          <StatsCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            }
            label="Completed"
            value={referralInfo.completedReferrals}
            color="green"
          />
          <StatsCard
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label="Total Earned"
            value={`$${referralInfo.totalRewards}`}
            subValue={`$${referralInfo.pendingRewards} pending`}
            color="purple"
          />
        </div>
      )}

      {/* Tier Progress */}
      {referralInfo && (
        <div className="mb-8">
          <TierProgress completedReferrals={referralInfo.completedReferrals} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 mb-6">
        {[
          { key: 'referrals', label: 'My Referrals' },
          { key: 'rewards', label: 'Rewards' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'referrals' && (
        <>
          {/* Filter */}
          <div className="flex items-center gap-2 mb-4">
            {['all', 'pending', 'completed', 'expired'].map((filter) => (
              <button
                key={filter}
                onClick={() => setReferralFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-full capitalize transition-colors ${
                  referralFilter === filter
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Referrals List */}
          {filteredReferrals.length > 0 ? (
            <div className="space-y-3">
              {filteredReferrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                    {referral.referredUser.avatar ? (
                      <OptimizedImage 
                        src={toCloudinaryAutoUrl(referral.referredUser.avatar)} 
                        alt={referral.referredUser.name || 'Referred user'} 
                        width={48}
                        height={48}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {referral.referredUser.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Joined {new Date(referral.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Reward */}
                  {referral.reward && (
                    <div className="text-right">
                      <p className="font-medium text-green-600 dark:text-green-400">
                        +${referral.reward}
                      </p>
                    </div>
                  )}

                  {/* Status */}
                  <StatusBadge status={referral.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔗</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No referrals yet</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Share your referral link to start inviting friends!
              </p>
              <Button className="mt-4" onClick={() => setShowShareModal(true)}>
                Share Your Link
              </Button>
            </div>
          )}
        </>
      )}

      {activeTab === 'rewards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rewards.length > 0 ? (
            rewards.map((reward) => (
              <div
                key={reward.id}
                className={`p-4 rounded-xl border-2 ${
                  reward.status === 'available'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : reward.status === 'claimed'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">
                    {reward.type === 'credit' ? '💰' : 
                     reward.type === 'discount' ? '🏷️' : 
                     reward.type === 'premium' ? '⭐' : '🏆'}
                  </span>
                  <StatusBadge status={reward.status} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{reward.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{reward.description}</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-2">
                  {reward.type === 'credit' ? `$${reward.value}` : 
                   reward.type === 'discount' ? `${reward.value}% off` : 
                   reward.type === 'premium' ? `${reward.value} months` : 'Special'}
                </p>
                {reward.status === 'available' && (
                  <Button 
                    className="w-full mt-4" 
                    onClick={() => handleClaimReward(reward.id)}
                  >
                    Claim Reward
                  </Button>
                )}
                {reward.expiresAt && reward.status === 'available' && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Expires {new Date(reward.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="text-6xl mb-4">🎁</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No rewards yet</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Complete referrals to earn rewards!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        referralLink={referralInfo?.link || ''}
      />
    </div>
  );
}

export default ReferralSystem;
