'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * EmployerAnalytics - Analytics dashboard for employers
 * 
 * Features:
 * - Job posting performance
 * - Candidate pipeline metrics
 * - Engagement analytics
 * - Diversity insights
 */

interface EmployerAnalytics {
  overview: {
    totalJobs: number;
    activeJobs: number;
    totalApplications: number;
    newApplications: number;
    hires: number;
    avgTimeToHire: string;
    avgCostPerHire: number;
  };
  jobPerformance: {
    jobId: string;
    title: string;
    views: number;
    applications: number;
    conversionRate: number;
    avgQualityScore: number;
    status: 'active' | 'paused' | 'closed';
  }[];
  pipeline: {
    stage: string;
    count: number;
    avgDaysInStage: number;
  }[];
  sourcing: {
    source: string;
    applications: number;
    hires: number;
    quality: number;
  }[];
  diversity: {
    indigenous: { applied: number; hired: number; rate: number };
    gender: { label: string; percentage: number }[];
    ageGroups: { label: string; percentage: number }[];
  };
  trends: {
    applications: { date: string; count: number }[];
    views: { date: string; count: number }[];
    hires: { date: string; count: number }[];
  };
  engagement: {
    responseRate: number;
    avgResponseTime: string;
    candidateSatisfaction: number;
    profileViews: number;
  };
}

// API functions
const analyticsApi = {
  async getAnalytics(period: string): Promise<EmployerAnalytics> {
    const res = await fetch(`/api/employer/analytics?period=${period}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async exportReport(period: string, format: 'pdf' | 'csv'): Promise<Blob> {
    const res = await fetch(`/api/employer/analytics/export?period=${period}&format=${format}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to export report');
    return res.blob();
  },
};

// Stat Card
function StatCard({
  title,
  value,
  change,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {change !== undefined && (
          <span className={`text-sm font-medium ${trendColors[trend || 'neutral']}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
}

// Pipeline Chart
function PipelineChart({ pipeline }: { pipeline: EmployerAnalytics['pipeline'] }) {
  const max = Math.max(...pipeline.map(p => p.count));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hiring Pipeline</h3>
      
      <div className="flex items-end gap-2 h-48 mb-4">
        {pipeline.map((stage, idx) => (
          <div key={stage.stage} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all"
              style={{ height: `${(stage.count / max) * 100}%`, minHeight: '20px' }}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {pipeline.map((stage, idx) => (
          <div key={stage.stage} className="flex-1 text-center">
            <div className="text-sm font-medium text-gray-900 dark:text-white">{stage.count}</div>
            <div className="text-xs text-gray-500">{stage.stage}</div>
            <div className="text-xs text-gray-400">{stage.avgDaysInStage}d avg</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Job Performance Table
function JobPerformanceTable({ jobs }: { jobs: EmployerAnalytics['jobPerformance'] }) {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    closed: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Job Performance</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b dark:border-gray-700">
              <th className="pb-3 font-medium">Job Title</th>
              <th className="pb-3 font-medium">Views</th>
              <th className="pb-3 font-medium">Applications</th>
              <th className="pb-3 font-medium">Conversion</th>
              <th className="pb-3 font-medium">Quality</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.jobId} className="border-b dark:border-gray-700 last:border-0">
                <td className="py-3 font-medium text-gray-900 dark:text-white">{job.title}</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">{job.views.toLocaleString()}</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">{job.applications}</td>
                <td className="py-3 text-gray-600 dark:text-gray-400">{job.conversionRate.toFixed(1)}%</td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-gray-600 dark:text-gray-400">{job.avgQualityScore.toFixed(1)}</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[job.status]}`}>
                    {job.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Source Performance
function SourcePerformance({ sources }: { sources: EmployerAnalytics['sourcing'] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Candidate Sources</h3>
      
      <div className="space-y-4">
        {sources.map((source) => (
          <div key={source.source}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{source.source}</span>
              <span className="text-sm text-gray-500">{source.applications} applications</span>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(source.applications / sources[0].applications) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-16 text-right">
                {source.hires} hired
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Diversity Insights
function DiversityInsights({ diversity }: { diversity: EmployerAnalytics['diversity'] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Diversity Insights</h3>
      
      {/* Indigenous Employment */}
      <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🌏</span>
          <span className="font-semibold text-gray-900 dark:text-white">Indigenous Employment</span>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-amber-600">{diversity.indigenous.applied}</div>
            <div className="text-sm text-gray-500">Applied</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{diversity.indigenous.hired}</div>
            <div className="text-sm text-gray-500">Hired</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{diversity.indigenous.rate}%</div>
            <div className="text-sm text-gray-500">Hire Rate</div>
          </div>
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Gender Distribution</p>
        <div className="flex gap-1 h-6 rounded-full overflow-hidden">
          {diversity.gender.map((g, idx) => (
            <div
              key={g.label}
              className={`${idx === 0 ? 'bg-blue-500' : idx === 1 ? 'bg-pink-500' : 'bg-purple-500'}`}
              style={{ width: `${g.percentage}%` }}
              title={`${g.label}: ${g.percentage}%`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {diversity.gender.map((g, idx) => (
            <span key={g.label} className="text-xs text-gray-500">
              {g.label}: {g.percentage}%
            </span>
          ))}
        </div>
      </div>

      {/* Age Groups */}
      <div>
        <p className="text-sm text-gray-500 mb-2">Age Distribution</p>
        <div className="space-y-2">
          {diversity.ageGroups.map((age) => (
            <div key={age.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16">{age.label}</span>
              <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${age.percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-10 text-right">{age.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Trend Chart
function TrendChart({
  data,
  label,
  color,
}: {
  data: { date: string; count: number }[];
  label: string;
  color: string;
}) {
  const max = Math.max(...data.map(d => d.count));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{label} Over Time</h3>
      
      <div className="flex items-end gap-1 h-32">
        {data.map((point, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center group">
            <div className="relative">
              <div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
                {point.count}
              </div>
            </div>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${(point.count / max) * 100}%`,
                minHeight: '4px',
                backgroundColor: color,
              }}
            />
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{new Date(data[0]?.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1]?.date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}

// Engagement Metrics
function EngagementMetrics({ engagement }: { engagement: EmployerAnalytics['engagement'] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Candidate Engagement</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{engagement.responseRate}%</div>
          <div className="text-sm text-gray-500">Response Rate</div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{engagement.avgResponseTime}</div>
          <div className="text-sm text-gray-500">Avg Response Time</div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{engagement.candidateSatisfaction}/5</div>
          <div className="text-sm text-gray-500">Candidate Rating</div>
        </div>
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{engagement.profileViews}</div>
          <div className="text-sm text-gray-500">Company Views</div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function EmployerAnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<EmployerAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await analyticsApi.getAnalytics(period);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      const blob = await analyticsApi.exportReport(period, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${period}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recruiting Analytics</h1>
          <p className="text-gray-500 mt-1">Track your hiring performance and candidate pipeline</p>
        </div>
        <div className="flex gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="12m">Last 12 Months</option>
          </select>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button onClick={() => handleExport('pdf')}>
            Download Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon="📋"
          title="Active Jobs"
          value={analytics.overview.activeJobs}
          change={12}
          trend="up"
        />
        <StatCard
          icon="📝"
          title="Total Applications"
          value={analytics.overview.totalApplications}
          change={8}
          trend="up"
        />
        <StatCard
          icon="✅"
          title="Hires"
          value={analytics.overview.hires}
          change={-5}
          trend="down"
        />
        <StatCard
          icon="⏱️"
          title="Avg Time to Hire"
          value={analytics.overview.avgTimeToHire}
        />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <PipelineChart pipeline={analytics.pipeline} />
        </div>
        <div>
          <SourcePerformance sources={analytics.sourcing} />
        </div>
      </div>

      {/* Job Performance */}
      <div className="mb-8">
        <JobPerformanceTable jobs={analytics.jobPerformance} />
      </div>

      {/* Trends & Insights */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <TrendChart data={analytics.trends.applications} label="Applications" color="#3B82F6" />
        <TrendChart data={analytics.trends.views} label="Job Views" color="#10B981" />
        <TrendChart data={analytics.trends.hires} label="Hires" color="#8B5CF6" />
      </div>

      {/* Bottom Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <DiversityInsights diversity={analytics.diversity} />
        <EngagementMetrics engagement={analytics.engagement} />
      </div>
    </div>
  );
}

export default EmployerAnalyticsPage;
