'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './Button';
import { Modal } from './Modal';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * AchievementsScreen - User achievements and badges management
 * 
 * Features:
 * - Display earned badges
 * - Show progress towards badges
 * - Achievement categories
 * - Leaderboard
 * - Share achievements
 */

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 
  | 'engagement' 
  | 'career' 
  | 'learning' 
  | 'community' 
  | 'mentorship' 
  | 'profile' 
  | 'special';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  points: number;
  criteria: string;
  earnedAt?: string;
  progress?: number;
  maxProgress?: number;
  isSecret?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  points: number;
  badgeCount: number;
  isCurrentUser: boolean;
}

interface AchievementStats {
  totalPoints: number;
  earnedBadges: number;
  totalBadges: number;
  rank: number;
  level: number;
  nextLevelPoints: number;
}

// Rarity configurations
const rarityConfig: Record<BadgeRarity, { label: string; color: string; bgColor: string; border: string }> = {
  common: { 
    label: 'Common', 
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-600',
  },
  uncommon: { 
    label: 'Uncommon', 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-700',
  },
  rare: { 
    label: 'Rare', 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-300 dark:border-blue-700',
  },
  epic: { 
    label: 'Epic', 
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-300 dark:border-purple-700',
  },
  legendary: { 
    label: 'Legendary', 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    border: 'border-amber-400 dark:border-amber-600',
  },
};

// Category configurations
const categoryConfig: Record<BadgeCategory, { label: string; icon: React.ReactNode }> = {
  engagement: {
    label: 'Engagement',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  career: {
    label: 'Career',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  learning: {
    label: 'Learning',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  community: {
    label: 'Community',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  mentorship: {
    label: 'Mentorship',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  profile: {
    label: 'Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  special: {
    label: 'Special',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
};

// API functions
const achievementsApi = {
  async getStats(): Promise<AchievementStats> {
    const res = await fetch('/api/badges/stats', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getEarnedBadges(): Promise<{ badges: Badge[] }> {
    const res = await fetch('/api/badges/earned', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch badges');
    return res.json();
  },

  async getAvailableBadges(): Promise<{ badges: Badge[] }> {
    const res = await fetch('/api/badges/available', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch available badges');
    return res.json();
  },

  async getProgress(): Promise<{ badges: Badge[] }> {
    const res = await fetch('/api/badges/progress', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch progress');
    return res.json();
  },

  async getLeaderboard(params: { period?: string; limit?: number } = {}): Promise<{ entries: LeaderboardEntry[] }> {
    const query = new URLSearchParams();
    if (params.period) query.append('period', params.period);
    if (params.limit) query.append('limit', params.limit.toString());
    
    const res = await fetch(`/api/leaderboard?${query.toString()}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
  },
};

// Badge Card Component
function BadgeCard({ 
  badge, 
  showProgress = false,
  onClick,
}: { 
  badge: Badge; 
  showProgress?: boolean;
  onClick?: () => void;
}) {
  const rarity = rarityConfig[badge.rarity];
  const isEarned = !!badge.earnedAt;
  
  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer
        ${isEarned 
          ? `${rarity.bgColor} ${rarity.border}` 
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
        }
        hover:shadow-lg hover:scale-105
      `}
    >
      {/* Rarity indicator */}
      {isEarned && badge.rarity === 'legendary' && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400/10 via-yellow-400/10 to-orange-400/10 animate-pulse" />
      )}
      
      {/* Badge Icon */}
      <div className="flex justify-center mb-3">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl
          ${isEarned ? 'bg-white dark:bg-gray-900 shadow-lg' : 'bg-gray-200 dark:bg-gray-700'}
        `}>
          {badge.isSecret && !isEarned ? '❓' : badge.icon}
        </div>
      </div>
      
      {/* Badge Info */}
      <div className="text-center">
        <h3 className={`font-semibold ${isEarned ? rarity.color : 'text-gray-400 dark:text-gray-500'}`}>
          {badge.isSecret && !isEarned ? '???' : badge.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {badge.isSecret && !isEarned ? 'Complete the secret requirement to unlock' : badge.description}
        </p>
        
        {/* Points */}
        <div className="mt-2 flex items-center justify-center gap-1">
          <span className="text-yellow-500">⭐</span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {badge.points} pts
          </span>
        </div>
        
        {/* Progress bar */}
        {showProgress && !isEarned && badge.progress !== undefined && badge.maxProgress && (
          <div className="mt-3">
            <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(badge.progress / badge.maxProgress) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {badge.progress} / {badge.maxProgress}
            </p>
          </div>
        )}
        
        {/* Earned date */}
        {isEarned && badge.earnedAt && (
          <p className="mt-2 text-xs text-gray-400">
            Earned {new Date(badge.earnedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      
      {/* Rarity label */}
      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${rarity.color} ${rarity.bgColor}`}>
        {rarity.label}
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({ stats }: { stats: AchievementStats }) {
  const levelProgress = stats.nextLevelPoints > 0 
    ? (stats.totalPoints / stats.nextLevelPoints) * 100 
    : 100;

  return (
    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-purple-200 text-sm">Your Level</p>
          <p className="text-4xl font-bold">{stats.level}</p>
        </div>
        <div className="text-right">
          <p className="text-purple-200 text-sm">Rank</p>
          <p className="text-2xl font-bold">#{stats.rank}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>{stats.totalPoints} XP</span>
          <span>{stats.nextLevelPoints} XP</span>
        </div>
        <div className="h-3 bg-purple-400/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-400 rounded-full transition-all"
            style={{ width: `${Math.min(levelProgress, 100)}%` }}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <span>{stats.earnedBadges} / {stats.totalBadges} badges earned</span>
        </div>
      </div>
    </div>
  );
}

// Leaderboard Component
function Leaderboard({ 
  entries,
  period,
  onPeriodChange,
}: { 
  entries: LeaderboardEntry[];
  period: string;
  onPeriodChange: (period: string) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">Leaderboard</h3>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
          <option value="allTime">All Time</option>
        </select>
      </div>
      
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {entries.map((entry) => (
          <div 
            key={entry.userId}
            className={`flex items-center gap-4 p-4 ${
              entry.isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            {/* Rank */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
              ${entry.rank === 1 ? 'bg-yellow-400 text-yellow-900' : ''}
              ${entry.rank === 2 ? 'bg-gray-300 text-gray-700' : ''}
              ${entry.rank === 3 ? 'bg-amber-600 text-white' : ''}
              ${entry.rank > 3 ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' : ''}
            `}>
              {entry.rank}
            </div>
            
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
              {entry.avatar ? (
                <OptimizedImage src={toCloudinaryAutoUrl(entry.avatar)} alt={entry.userName} width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
            </div>
            
            {/* Name */}
            <div className="flex-1">
              <p className={`font-medium ${entry.isCurrentUser ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                {entry.userName}
                {entry.isCurrentUser && <span className="text-xs ml-2">(You)</span>}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {entry.badgeCount} badges
              </p>
            </div>
            
            {/* Points */}
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white">{entry.points.toLocaleString()}</p>
              <p className="text-xs text-gray-500">points</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main Achievements Screen
export function AchievementsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'earned' | 'progress' | 'all'>('earned');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, leaderboardData] = await Promise.all([
        achievementsApi.getStats(),
        achievementsApi.getLeaderboard({ period: leaderboardPeriod, limit: 10 }),
      ]);
      
      setStats(statsData);
      setLeaderboard(leaderboardData.entries);
      
      // Load badges based on active tab
      let badgesData;
      switch (activeTab) {
        case 'earned':
          badgesData = await achievementsApi.getEarnedBadges();
          break;
        case 'progress':
          badgesData = await achievementsApi.getProgress();
          break;
        default:
          badgesData = await achievementsApi.getAvailableBadges();
      }
      setBadges(badgesData.badges);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, leaderboardPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter badges by category
  const filteredBadges = selectedCategory === 'all' 
    ? badges 
    : badges.filter(b => b.category === selectedCategory);

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Achievements
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Earn badges by engaging with the community and advancing your career
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Card */}
          {stats && <StatsCard stats={stats} />}

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
            {[
              { key: 'earned', label: 'Earned' },
              { key: 'progress', label: 'In Progress' },
              { key: 'all', label: 'All Badges' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                  selectedCategory === key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                }`}
              >
                {config.icon}
                {config.label}
              </button>
            ))}
          </div>

          {/* Badges Grid */}
          {filteredBadges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  showProgress={activeTab === 'progress'}
                  onClick={() => setSelectedBadge(badge)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {activeTab === 'earned' ? 'No badges earned yet' : 'No badges in this category'}
              </h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {activeTab === 'earned' 
                  ? 'Start engaging with the platform to earn your first badge!'
                  : 'Check other categories or keep working towards new achievements.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Sidebar - Leaderboard */}
        <div className="lg:col-span-1">
          <Leaderboard
            entries={leaderboard}
            period={leaderboardPeriod}
            onPeriodChange={setLeaderboardPeriod}
          />
        </div>
      </div>

      {/* Badge Detail Modal */}
      <Modal
        isOpen={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        title="Badge Details"
      >
        {selectedBadge && (
          <div className="text-center">
            <div className="text-6xl mb-4">{selectedBadge.icon}</div>
            <h3 className={`text-xl font-bold ${rarityConfig[selectedBadge.rarity].color}`}>
              {selectedBadge.name}
            </h3>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${rarityConfig[selectedBadge.rarity].bgColor} ${rarityConfig[selectedBadge.rarity].color}`}>
              {rarityConfig[selectedBadge.rarity].label}
            </span>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {selectedBadge.description}
            </p>
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <strong>How to earn:</strong> {selectedBadge.criteria}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{selectedBadge.points}</p>
                <p className="text-xs text-gray-500">Points</p>
              </div>
              {selectedBadge.earnedAt && (
                <div className="text-center">
                  <p className="text-sm font-medium text-green-600">✓ Earned</p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedBadge.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
            {selectedBadge.earnedAt && (
              <Button className="mt-6" variant="outline">
                Share Achievement
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AchievementsScreen;
