'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * UserAnalytics - User engagement and activity analytics
 * 
 * Features:
 * - Personal activity metrics
 * - Engagement insights
 * - Profile performance
 * - Career progress tracking
 */

interface UserAnalytics {
  profileViews: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    trend: number;
    bySource: { source: string; count: number }[];
    topViewers: { industry: string; count: number }[];
  };
  searchAppearances: {
    total: number;
    thisWeek: number;
    keywords: { keyword: string; count: number }[];
  };
  applicationMetrics: {
    total: number;
    thisMonth: number;
    byStatus: { status: string; count: number }[];
    responseRate: number;
    avgResponseTime: string;
  };
  engagement: {
    profileCompleteness: number;
    lastActive: string;
    streak: number;
    totalLogins: number;
    avgSessionDuration: string;
  };
  network: {
    connections: number;
    newThisMonth: number;
    pendingRequests: number;
    profileReaches: number;
  };
  content: {
    posts: number;
    likes: number;
    comments: number;
    shares: number;
  };
  learning: {
    coursesCompleted: number;
    certificatesEarned: number;
    hoursLearned: number;
    currentStreak: number;
  };
  careerScore: {
    overall: number;
    profile: number;
    skills: number;
    experience: number;
    network: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'view' | 'application' | 'connection' | 'message' | 'achievement';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface WeeklyData {
  day: string;
  views: number;
  applications: number;
  connections: number;
}

// API functions
const analyticsApi = {
  async getAnalytics(): Promise<UserAnalytics> {
    const res = await fetch('/api/analytics/user', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async getActivity(page: number): Promise<{ activities: ActivityItem[] }> {
    const res = await fetch(`/api/analytics/activity?page=${page}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch activity');
    return res.json();
  },

  async getWeeklyData(): Promise<{ data: WeeklyData[] }> {
    const res = await fetch('/api/analytics/weekly', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch weekly data');
    return res.json();
  },
};

// Stat Card
function StatCard({
  title,
  value,
  change,
  subtitle,
  icon,
}: {
  title: string;
  value: number | string;
  change?: number;
  subtitle?: string;
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {change !== undefined && (
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

// Progress Ring
function ProgressRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" className="transform -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          style={{ strokeDasharray: circumference, strokeDashoffset }}
          className="transition-all duration-500"
        />
      </svg>
      <div className="text-center -mt-16">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}%</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

// Bar Chart (Simple)
function SimpleBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="text-sm text-gray-500 w-20 truncate">{item.label}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// Career Score Card
function CareerScoreCard({ score }: { score: UserAnalytics['careerScore'] }) {
  const categories = [
    { key: 'profile', label: 'Profile', color: '#3B82F6' },
    { key: 'skills', label: 'Skills', color: '#10B981' },
    { key: 'experience', label: 'Experience', color: '#8B5CF6' },
    { key: 'network', label: 'Network', color: '#F59E0B' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Career Score</h3>
      
      <div className="flex items-center justify-center mb-8">
        <div className="relative">
          <svg width="160" height="160" className="transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke={score.overall >= 80 ? '#10B981' : score.overall >= 60 ? '#F59E0B' : '#EF4444'}
              strokeWidth="12"
              fill="none"
              strokeLinecap="round"
              style={{
                strokeDasharray: 2 * Math.PI * 70,
                strokeDashoffset: 2 * Math.PI * 70 * (1 - score.overall / 100),
              }}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">{score.overall}</span>
            <span className="text-sm text-gray-500">out of 100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{cat.label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white ml-auto">
              {score[cat.key as keyof typeof score]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Profile Performance
function ProfilePerformance({ analytics }: { analytics: UserAnalytics }) {
  const barHeights = useMemo(() => {
    const seed = (analytics.profileViews?.thisWeek || 0) + (analytics.searchAppearances?.thisWeek || 0) + (analytics.profileViews?.total || 0);
    return Array.from({ length: 7 }, (_, i) => 10 + ((seed + i * 13) % 41));
  }, [analytics.profileViews?.thisWeek, analytics.searchAppearances?.thisWeek, analytics.profileViews?.total]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Performance</h3>
      
      <div className="space-y-6">
        {/* Profile Views */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Profile Views</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {analytics.profileViews.thisWeek} this week
            </span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-blue-100 dark:bg-blue-900/30 rounded"
                style={{
                  height: `${barHeights[i]}px`,
                  opacity: 0.5 + (i / 7) * 0.5,
                }}
              />
            ))}
          </div>
        </div>

        {/* Search Appearances */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Search Appearances</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {analytics.searchAppearances.thisWeek} this week
            </span>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-gray-500 mb-2">Top keywords:</p>
            <div className="flex flex-wrap gap-1">
              {analytics.searchAppearances.keywords.slice(0, 5).map((kw) => (
                <span
                  key={kw.keyword}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded"
                >
                  {kw.keyword}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Top Viewers */}
        <div>
          <p className="text-sm text-gray-500 mb-2">Who's viewing your profile</p>
          <SimpleBarChart
            data={analytics.profileViews.topViewers.map(v => ({
              label: v.industry,
              value: v.count,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

// Application Insights
function ApplicationInsights({ metrics }: { metrics: UserAnalytics['applicationMetrics'] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Application Insights</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.responseRate}%</div>
          <div className="text-sm text-gray-500">Response Rate</div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.avgResponseTime}</div>
          <div className="text-sm text-gray-500">Avg Response</div>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-500 mb-2">Applications by status</p>
        <div className="space-y-2">
          {metrics.byStatus.map((item) => {
            const colors: Record<string, string> = {
              applied: 'bg-blue-500',
              reviewing: 'bg-yellow-500',
              interview: 'bg-purple-500',
              offered: 'bg-green-500',
              rejected: 'bg-red-500',
            };
            return (
              <div key={item.status} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colors[item.status] || 'bg-gray-500'}`} />
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize flex-1">{item.status}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Activity Feed
function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  const typeColors = {
    view: 'bg-blue-100 text-blue-600',
    application: 'bg-green-100 text-green-600',
    connection: 'bg-purple-100 text-purple-600',
    message: 'bg-yellow-100 text-yellow-600',
    achievement: 'bg-pink-100 text-pink-600',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3">
            <span className={`p-2 rounded-lg text-lg ${typeColors[activity.type]}`}>
              {activity.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-white">{activity.title}</p>
              <p className="text-xs text-gray-500">{activity.description}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(activity.timestamp).toLocaleDateString('en-AU')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Engagement Stats
function EngagementStats({ engagement, content }: { engagement: UserAnalytics['engagement']; content: UserAnalytics['content'] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-500">🔥 {engagement.streak}</div>
          <div className="text-sm text-gray-500">Day Streak</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-500">{engagement.totalLogins}</div>
          <div className="text-sm text-gray-500">Total Logins</div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 mb-3">Content Performance</p>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 dark:text-white">{content.posts}</div>
            <div className="text-xs text-gray-500">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 dark:text-white">{content.likes}</div>
            <div className="text-xs text-gray-500">Likes</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 dark:text-white">{content.comments}</div>
            <div className="text-xs text-gray-500">Comments</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900 dark:text-white">{content.shares}</div>
            <div className="text-xs text-gray-500">Shares</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Learning Progress
function LearningProgress({ learning }: { learning: UserAnalytics['learning'] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Learning Journey</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{learning.coursesCompleted}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Courses Completed</div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{learning.certificatesEarned}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Certificates</div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Hours Learned</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{learning.hoursLearned}h</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Current Streak</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">🔥 {learning.currentStreak} days</span>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function UserAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [analyticsRes, activityRes] = await Promise.all([
        analyticsApi.getAnalytics(),
        analyticsApi.getActivity(1),
      ]);
      setAnalytics(analyticsRes);
      setActivities(activityRes.activities);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Analytics</h1>
          <p className="text-gray-500 mt-1">Track your profile performance and career progress</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm ${
                dateRange === range
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Profile Views"
          value={analytics.profileViews.total}
          change={analytics.profileViews.trend}
          icon="👁️"
        />
        <StatCard
          title="Search Appearances"
          value={analytics.searchAppearances.total}
          subtitle={`${analytics.searchAppearances.thisWeek} this week`}
          icon="🔍"
        />
        <StatCard
          title="Applications"
          value={analytics.applicationMetrics.total}
          subtitle={`${analytics.applicationMetrics.thisMonth} this month`}
          icon="📝"
        />
        <StatCard
          title="Connections"
          value={analytics.network.connections}
          change={5}
          icon="🤝"
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <ProfilePerformance analytics={analytics} />
          <ApplicationInsights metrics={analytics.applicationMetrics} />
          <ActivityFeed activities={activities} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <CareerScoreCard score={analytics.careerScore} />
          <EngagementStats engagement={analytics.engagement} content={analytics.content} />
          <LearningProgress learning={analytics.learning} />
        </div>
      </div>
    </div>
  );
}

export default UserAnalyticsPage;
