'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * AnalyticsDashboard - Admin analytics and insights dashboard
 * 
 * Features:
 * - Platform metrics overview
 * - User growth and engagement charts
 * - Job matching success rates
 * - Course completion analytics
 * - Community engagement metrics
 * - Export and reporting capabilities
 */

interface MetricCard {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format: 'number' | 'currency' | 'percent' | 'duration';
  icon: string;
  color: string;
}

interface TimeSeriesData {
  date: string;
  value: number;
}

interface ChartData {
  id: string;
  label: string;
  data: TimeSeriesData[];
}

interface TopItem {
  id: string;
  name: string;
  value: number;
  metadata?: Record<string, string | number>;
}

interface AnalyticsData {
  overview: MetricCard[];
  userGrowth: ChartData;
  engagement: ChartData;
  jobMatches: {
    total: number;
    successful: number;
    pending: number;
    rate: number;
  };
  courseCompletion: {
    totalEnrollments: number;
    completions: number;
    rate: number;
    avgTimeToComplete: number;
  };
  topCourses: TopItem[];
  topJobs: TopItem[];
  topMentors: TopItem[];
  communityStats: {
    totalPosts: number;
    totalComments: number;
    activeUsers: number;
    engagementRate: number;
  };
  demographics: {
    byRegion: { region: string; count: number }[];
    byAgeGroup: { group: string; count: number }[];
  };
}

// API functions
const analyticsApi = {
  async getOverview(period: string): Promise<AnalyticsData> {
    const res = await fetch(`/api/admin/analytics?period=${period}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async exportReport(type: string, period: string): Promise<Blob> {
    const res = await fetch(`/api/admin/analytics/export?type=${type}&period=${period}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to export report');
    return res.blob();
  },
};

// Format helpers
function formatValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'duration':
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    default:
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toLocaleString();
  }
}

// Metric Card Component
function MetricCardComponent({ metric }: { metric: MetricCard }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className={`text-3xl p-2 rounded-lg bg-${metric.color}-100 dark:bg-${metric.color}-900/30`}>
          {metric.icon}
        </span>
        {metric.change !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${
            metric.changeType === 'increase' ? 'text-green-600' :
            metric.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
          }`}>
            {metric.changeType === 'increase' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : metric.changeType === 'decrease' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            ) : null}
            {Math.abs(metric.change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {formatValue(metric.value, metric.format)}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{metric.label}</p>
    </div>
  );
}

// Simple Line Chart Component
function SimpleLineChart({ 
  data, 
  height = 200,
  color = '#3B82F6',
}: { 
  data: TimeSeriesData[]; 
  height?: number;
  color?: string;
}) {
  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-gray-400">No data</div>;
  }

  const values = data.map(d => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  // Create SVG path
  const width = 100;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

  return (
    <div className="relative" style={{ height }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#chartGradient)" />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 px-2">
        {data.length > 0 && (
          <>
            <span>{new Date(data[0].date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</span>
            <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</span>
          </>
        )}
      </div>
    </div>
  );
}

// Horizontal Bar Chart
function HorizontalBarChart({ items, max }: { items: TopItem[]; max: number }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={item.id}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="text-gray-400">{index + 1}.</span>
              {item.name}
            </span>
            <span className="font-medium text-gray-900 dark:text-white">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// Donut Chart
function DonutChart({ 
  data, 
  total,
  label,
}: { 
  data: { label: string; value: number; color: string }[];
  total: number;
  label: string;
}) {
  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {data.map((segment, i) => {
            const percent = (segment.value / total) * 100;
            const strokeDasharray = `${percent} ${100 - percent}`;
            const strokeDashoffset = -cumulativePercent;
            cumulativePercent += percent;

            return (
              <circle
                key={i}
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke={segment.color}
                strokeWidth="3"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{total.toLocaleString()}</span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: segment.color }} />
            <span className="text-gray-600 dark:text-gray-400">{segment.label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Card
function StatsCard({ 
  title, 
  stats,
}: { 
  title: string; 
  stats: { label: string; value: string | number }[];
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, i) => (
          <div key={i}>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// Main Component
export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const analyticsData = await analyticsApi.getOverview(period);
      setData(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true);
    try {
      // TODO: implement export functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6 mb-8">
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-500/10" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Admin Analytics</p>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Platform insights and performance metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-full p-1">
              {(['7d', '30d', '90d', '1y'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    period === p
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
            
            {/* Export */}
            <Button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              variant="secondary"
            >
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <SummaryCard
          title="Job Match Success"
          value={`${data.jobMatches.rate}%`}
          subtitle={`${data.jobMatches.successful} successful matches`}
        />
        <SummaryCard
          title="Course Completion"
          value={`${data.courseCompletion.rate}%`}
          subtitle={`${data.courseCompletion.completions} completions`}
        />
        <SummaryCard
          title="Community Engagement"
          value={`${data.communityStats.engagementRate}%`}
          subtitle={`${data.communityStats.activeUsers} active users`}
        />
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {data.overview.map((metric) => (
          <MetricCardComponent key={metric.id} metric={metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">User Growth</h3>
          <SimpleLineChart data={data.userGrowth.data} color="#3B82F6" />
        </div>

        {/* Engagement */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Active Users</h3>
          <SimpleLineChart data={data.engagement.data} color="#10B981" />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Job Matching */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Job Matching</h3>
          <DonutChart
            data={[
              { label: 'Successful', value: data.jobMatches.successful, color: '#10B981' },
              { label: 'Pending', value: data.jobMatches.pending, color: '#F59E0B' },
            ]}
            total={data.jobMatches.total}
            label="Total Matches"
          />
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Success Rate</span>
              <span className="font-semibold text-green-600">{data.jobMatches.rate}%</span>
            </div>
          </div>
        </div>

        {/* Course Completion */}
        <StatsCard
          title="Course Completion"
          stats={[
            { label: 'Total Enrollments', value: data.courseCompletion.totalEnrollments.toLocaleString() },
            { label: 'Completions', value: data.courseCompletion.completions.toLocaleString() },
            { label: 'Completion Rate', value: `${data.courseCompletion.rate}%` },
            { label: 'Avg Time', value: formatValue(data.courseCompletion.avgTimeToComplete, 'duration') },
          ]}
        />

        {/* Community Stats */}
        <StatsCard
          title="Community Engagement"
          stats={[
            { label: 'Total Posts', value: data.communityStats.totalPosts.toLocaleString() },
            { label: 'Total Comments', value: data.communityStats.totalComments.toLocaleString() },
            { label: 'Active Users', value: data.communityStats.activeUsers.toLocaleString() },
            { label: 'Engagement Rate', value: `${data.communityStats.engagementRate}%` },
          ]}
        />
      </div>

      {/* Top Items Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Courses</h3>
          <HorizontalBarChart 
            items={data.topCourses} 
            max={Math.max(...data.topCourses.map(c => c.value))}
          />
        </div>

        {/* Top Jobs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Job Listings</h3>
          <HorizontalBarChart 
            items={data.topJobs} 
            max={Math.max(...data.topJobs.map(j => j.value))}
          />
        </div>

        {/* Top Mentors */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Mentors</h3>
          <HorizontalBarChart 
            items={data.topMentors} 
            max={Math.max(...data.topMentors.map(m => m.value))}
          />
        </div>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Region */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Users by Region</h3>
          <div className="space-y-3">
            {data.demographics.byRegion.map((region) => (
              <div key={region.region}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{region.region}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{region.count.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${(region.count / Math.max(...data.demographics.byRegion.map(r => r.count))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Age Group */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Users by Age Group</h3>
          <div className="space-y-3">
            {data.demographics.byAgeGroup.map((group) => (
              <div key={group.group}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">{group.group}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{group.count.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(group.count / Math.max(...data.demographics.byAgeGroup.map(g => g.count))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Activity (Optional Enhancement) */}
      <div className="mt-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <span className="flex items-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>
          <div className="space-y-3">
            {[
              { icon: '👤', text: 'New user registered', time: 'Just now', color: 'blue' },
              { icon: '📝', text: 'Course "Cultural Leadership" completed', time: '2m ago', color: 'green' },
              { icon: '💼', text: 'New job application submitted', time: '5m ago', color: 'purple' },
              { icon: '🤝', text: 'Mentor session booked', time: '8m ago', color: 'amber' },
              { icon: '🎉', text: 'Achievement unlocked: First Connection', time: '12m ago', color: 'pink' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <span className="text-xl">{activity.icon}</span>
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{activity.text}</span>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
