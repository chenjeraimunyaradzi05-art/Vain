'use client';

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Briefcase, Users, Eye, TrendingUp, Clock, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import api from '@/lib/apiClient';
import CandidateFunnel, { FunnelData } from './CandidateFunnel';

interface EmployerOverview {
  jobs: {
    total: number;
    active: number;
    filled: number;
    avgTimeToFill: number;
  };
  applications: {
    total: number;
    thisMonth: number;
    pending: number;
    shortlisted: number;
  };
  views: {
    total: number;
    thisMonth: number;
  };
  conversionRate: number;
  generatedAt: string;
}

interface JobPerformance {
  jobId: string;
  title: string;
  views: number;
  applications: number;
  conversionRate: number;
}

interface TrendData {
  date: string;
  applications: number;
  views: number;
}

const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#6366F1',
  purple: '#8B5CF6',
};

// Stat Card with trend indicator
function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color = COLORS.primary,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {change >= 0 ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ml-1 ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-slate-400 ml-1">{changeLabel || 'vs last month'}</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: color + '15' }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function EmployerAnalyticsDashboard() {
  const [overview, setOverview] = useState<EmployerOverview | null>(null);
  const [topJobs, setTopJobs] = useState<JobPerformance[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock trend data (would come from analytics endpoint)
  const trendData: TrendData[] = [
    { date: 'Week 1', applications: 12, views: 145 },
    { date: 'Week 2', applications: 18, views: 210 },
    { date: 'Week 3', applications: 15, views: 178 },
    { date: 'Week 4', applications: 22, views: 256 },
  ];

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const result = await api<EmployerOverview>('/analytics-dashboard/employer/overview');
        if (result.ok && result.data) {
          setOverview(result.data);

          // Build funnel data from overview
          const apps = result.data.applications;
          setFunnelData([
            { stage: 'Views', count: result.data.views.total, fill: '#3B82F6' },
            { stage: 'Applications', count: apps.total, fill: '#8B5CF6' },
            { stage: 'Shortlisted', count: apps.shortlisted, fill: '#EC4899' },
            { stage: 'Hired', count: result.data.jobs.filled, fill: '#10B981' },
          ]);
        } else {
          setError(result.error || 'Failed to load analytics');
        }
      } catch (err) {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
        <p className="text-yellow-600 dark:text-yellow-400">
          {error || 'Analytics data not available. Post some jobs to see insights.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Recruitment Analytics
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track job performance and hiring metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Jobs"
          value={overview.jobs.active}
          icon={Briefcase}
          color={COLORS.primary}
        />
        <StatCard
          title="Total Applications"
          value={overview.applications.total}
          change={15}
          icon={Users}
          color={COLORS.purple}
        />
        <StatCard
          title="Job Views"
          value={overview.views.total}
          change={8}
          icon={Eye}
          color={COLORS.info}
        />
        <StatCard
          title="Conversion Rate"
          value={`${overview.conversionRate}%`}
          icon={Target}
          color={COLORS.success}
        />
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Application Trend */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Application Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="applications"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorApps)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Candidate Funnel */}
        <CandidateFunnel data={funnelData} title="Hiring Funnel" />
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Time to Fill</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {overview.jobs.avgTimeToFill} days
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pending Review</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {overview.applications.pending}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Hired</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {overview.jobs.filled}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Last updated: {new Date(overview.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
