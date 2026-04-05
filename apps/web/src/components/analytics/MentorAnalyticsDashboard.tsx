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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Calendar, Users, Clock, Star, TrendingUp, Award, Video, CheckCircle } from 'lucide-react';
import api from '@/lib/apiClient';

interface MentorAnalyticsData {
  profile: {
    id: string;
    verified: boolean;
  };
  sessions: {
    total: number;
    thisMonth: number;
    completed: number;
    upcoming: number;
  };
  mentees: number;
  rating: number | null;
  generatedAt: string;
}

interface SessionTrend {
  month: string;
  sessions: number;
  hours: number;
}

interface ImpactMetric {
  label: string;
  value: number;
  fill: string;
  [key: string]: string | number;
}

const COLORS = {
  primary: '#8B5CF6',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  pink: '#EC4899',
};

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = COLORS.primary,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: color + '15' }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

// Rating Stars Component
function RatingStars({ rating }: { rating: number | null }) {
  if (rating === null) {
    return <span className="text-slate-400">No ratings yet</span>;
  }

  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < fullStars
              ? 'text-yellow-400 fill-yellow-400'
              : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-yellow-400/50'
              : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
      <span className="ml-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

export default function MentorAnalyticsDashboard() {
  const [data, setData] = useState<MentorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock session trend data (would come from a dedicated endpoint in production)
  const sessionTrend: SessionTrend[] = [
    { month: 'Sep', sessions: 4, hours: 6 },
    { month: 'Oct', sessions: 6, hours: 9 },
    { month: 'Nov', sessions: 8, hours: 12 },
    { month: 'Dec', sessions: 5, hours: 7.5 },
    { month: 'Jan', sessions: 10, hours: 15 },
  ];

  // Impact distribution (mock data)
  const impactData: ImpactMetric[] = [
    { label: 'Career Guidance', value: 40, fill: COLORS.primary },
    { label: 'Skill Development', value: 30, fill: COLORS.success },
    { label: 'Interview Prep', value: 20, fill: COLORS.info },
    { label: 'Resume Review', value: 10, fill: COLORS.warning },
  ];

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const result = await api<MentorAnalyticsData>('/analytics-dashboard/mentor/overview');
        if (result.ok && result.data) {
          setData(result.data);
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
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400">{error || 'No analytics data available'}</p>
      </div>
    );
  }

  const estimatedHours = data.sessions.completed * 1.5; // Assume 1.5hr per session

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Mentor Analytics
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track your mentoring impact and progress
          </p>
        </div>
        {data.profile.verified && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Verified Mentor
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sessions"
          value={data.sessions.total}
          subtitle={`${data.sessions.thisMonth} this month`}
          icon={Video}
          color={COLORS.primary}
        />
        <StatCard
          title="Active Mentees"
          value={data.mentees}
          subtitle="Unique mentees"
          icon={Users}
          color={COLORS.info}
        />
        <StatCard
          title="Hours Mentored"
          value={`${estimatedHours}h`}
          subtitle="Estimated total"
          icon={Clock}
          color={COLORS.success}
        />
        <StatCard
          title="Upcoming"
          value={data.sessions.upcoming}
          subtitle="Sessions scheduled"
          icon={Calendar}
          color={COLORS.warning}
        />
      </div>

      {/* Rating Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Your Rating
            </h3>
            <RatingStars rating={data.rating} />
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 dark:text-slate-400">Completion Rate</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {data.sessions.total > 0
                ? Math.round((data.sessions.completed / data.sessions.total) * 100)
                : 0}
              %
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Session Trend Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Session Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sessionTrend}>
                <defs>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
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
                  dataKey="sessions"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorSessions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Impact Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Session Focus Areas
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={impactData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {impactData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {impactData.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Award className="w-8 h-8" />
          <h3 className="text-lg font-semibold">Impact Summary</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="text-purple-200 text-sm">Career Paths Guided</p>
            <p className="text-3xl font-bold">{data.mentees}</p>
          </div>
          <div>
            <p className="text-purple-200 text-sm">Sessions Delivered</p>
            <p className="text-3xl font-bold">{data.sessions.completed}</p>
          </div>
          <div>
            <p className="text-purple-200 text-sm">Hours Invested</p>
            <p className="text-3xl font-bold">{estimatedHours}h</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
        Last updated: {new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}
