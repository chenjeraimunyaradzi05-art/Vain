/**
 * Admin Analytics Dashboard
 * 
 * Comprehensive analytics dashboard for platform administrators.
 * Displays key metrics, user activity, job statistics, and engagement data.
 */

'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

// Types
interface DashboardMetrics {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  jobs: {
    total: number;
    active: number;
    applications: number;
    hiredThisMonth: number;
  };
  mentorship: {
    totalMentors: number;
    totalSessions: number;
    completedThisMonth: number;
    avgRating: number;
  };
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    avgSessionDuration: number;
    postsThisWeek: number;
  };
}

interface ChartData {
  userGrowth: { date: string; users: number; activeUsers: number }[];
  jobApplications: { month: string; applications: number; hires: number }[];
  userDemographics: { name: string; value: number; color: string }[];
  engagementByDay: { day: string; logins: number; actions: number }[];
  topEmployers: { name: string; jobs: number; hires: number }[];
}

// Theme colors
const COLORS = {
  primary: '#22c55e',
  secondary: '#3b82f6',
  accent: '#a855f7',
  warning: '#f59e0b',
  danger: '#ef4444',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  background: '#0f172a',
  surface: '#1e293b',
  surfaceLight: '#334155',
  border: '#475569',
};

const CHART_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

// Mock data generator
const generateMockData = (): { metrics: DashboardMetrics; charts: ChartData } => ({
  metrics: {
    users: { total: 15420, active: 8934, newThisMonth: 1247, growth: 12.5 },
    jobs: { total: 856, active: 342, applications: 4523, hiredThisMonth: 89 },
    mentorship: { totalMentors: 234, totalSessions: 5678, completedThisMonth: 423, avgRating: 4.7 },
    engagement: { dailyActiveUsers: 2341, weeklyActiveUsers: 6789, avgSessionDuration: 8.5, postsThisWeek: 567 },
  },
  charts: {
    userGrowth: [
      { date: 'Jan', users: 12000, activeUsers: 6500 },
      { date: 'Feb', users: 12800, activeUsers: 7100 },
      { date: 'Mar', users: 13200, activeUsers: 7400 },
      { date: 'Apr', users: 13900, activeUsers: 7800 },
      { date: 'May', users: 14600, activeUsers: 8200 },
      { date: 'Jun', users: 15420, activeUsers: 8934 },
    ],
    jobApplications: [
      { month: 'Jan', applications: 320, hires: 45 },
      { month: 'Feb', applications: 410, hires: 52 },
      { month: 'Mar', applications: 480, hires: 68 },
      { month: 'Apr', applications: 520, hires: 71 },
      { month: 'May', applications: 590, hires: 82 },
      { month: 'Jun', applications: 680, hires: 89 },
    ],
    userDemographics: [
      { name: 'Job Seekers', value: 65, color: '#22c55e' },
      { name: 'Employed', value: 20, color: '#3b82f6' },
      { name: 'Mentors', value: 10, color: '#a855f7' },
      { name: 'Employers', value: 5, color: '#f59e0b' },
    ],
    engagementByDay: [
      { day: 'Mon', logins: 2100, actions: 5400 },
      { day: 'Tue', logins: 2400, actions: 6100 },
      { day: 'Wed', logins: 2200, actions: 5800 },
      { day: 'Thu', logins: 2500, actions: 6300 },
      { day: 'Fri', logins: 2100, actions: 5200 },
      { day: 'Sat', logins: 1400, actions: 3200 },
      { day: 'Sun', logins: 1200, actions: 2800 },
    ],
    topEmployers: [
      { name: 'BHP', jobs: 45, hires: 12 },
      { name: 'Rio Tinto', jobs: 38, hires: 9 },
      { name: 'Woolworths', jobs: 32, hires: 15 },
      { name: 'Commonwealth Bank', jobs: 28, hires: 8 },
      { name: 'Telstra', jobs: 25, hires: 7 },
    ],
  },
});

// Metric Card Component
function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  color = COLORS.primary 
}: { 
  title: string; 
  value: string | number; 
  change?: number; 
  icon: React.ReactNode; 
  color?: string;
}) {
  return (
    <div className="group bg-slate-900/60 rounded-xl p-6 border border-slate-800 hover:border-slate-600 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value.toLocaleString()}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <span>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}%</span>
              <span className="text-slate-500 ml-2">vs last month</span>
            </div>
          )}
        </div>
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center ring-1 ring-white/5"
          style={{ backgroundColor: color + '20' }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, value, subtitle, percent, color }: {
  title: string;
  value: string;
  subtitle: string;
  percent: number;
  color: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="text-2xl font-semibold text-white mt-1">{value}</p>
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        </div>
        <span className="text-xs text-slate-400">{percent}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full" style={{ width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// Section Header Component
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {action}
    </div>
  );
}

export default function AdminAnalyticsDashboard() {
  const [data, setData] = useState<{ metrics: DashboardMetrics; charts: ChartData } | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    // Simulate API call
    const loadData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setData(generateMockData());
      setLoading(false);
    };
    loadData();
  }, [timeRange]);

  const derived = useMemo(() => {
    if (!data) {
      return { activationRate: 0, hireRate: 0, mentorCompletion: 0 };
    }

    const { metrics } = data;
    const activationRate = metrics.users.total > 0
      ? Math.round((metrics.users.active / metrics.users.total) * 100)
      : 0;
    const hireRate = metrics.jobs.applications > 0
      ? Math.round((metrics.jobs.hiredThisMonth / metrics.jobs.applications) * 100)
      : 0;
    const mentorCompletion = metrics.mentorship.totalSessions > 0
      ? Math.round((metrics.mentorship.completedThisMonth / metrics.mentorship.totalSessions) * 100)
      : 0;
    return { activationRate, hireRate, mentorCompletion };
  }, [data]);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { metrics, charts } = data;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 mb-8">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Admin Analytics</p>
              <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
              <p className="text-slate-400 mt-1">Platform performance and user insights</p>
            </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2 bg-slate-900/80 rounded-full p-1 border border-slate-700">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard
          title="Total Users"
          value={metrics.users.total}
          change={metrics.users.growth}
          color={COLORS.primary}
          icon={<svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <MetricCard
          title="Active Jobs"
          value={metrics.jobs.active}
          change={8.3}
          color={COLORS.secondary}
          icon={<svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
        />
        <MetricCard
          title="Hired This Month"
          value={metrics.jobs.hiredThisMonth}
          change={15.7}
          color={COLORS.accent}
          icon={<svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
        />
        <MetricCard
          title="Mentor Sessions"
          value={metrics.mentorship.completedThisMonth}
          change={22.1}
          color={COLORS.warning}
          icon={<svg className="w-7 h-7 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        </div>

        {/* Insight Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <InsightCard
            title="Activation Rate"
            value={`${derived.activationRate}%`}
            subtitle="Active users / total"
            percent={derived.activationRate}
            color={COLORS.primary}
          />
          <InsightCard
            title="Hire Rate"
            value={`${derived.hireRate}%`}
            subtitle="Hires / applications"
            percent={derived.hireRate}
            color={COLORS.secondary}
          />
          <InsightCard
            title="Mentor Completion"
            value={`${derived.mentorCompletion}%`}
            subtitle="Completed sessions"
            percent={derived.mentorCompletion}
            color={COLORS.accent}
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User Growth Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <SectionHeader title="User Growth" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.userGrowth}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="date" stroke={COLORS.textMuted} />
                <YAxis stroke={COLORS.textMuted} />
                <Tooltip 
                  contentStyle={{ backgroundColor: COLORS.surface, border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: COLORS.text }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  name="Total Users"
                  stroke={COLORS.primary} 
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="activeUsers" 
                  name="Active Users"
                  stroke={COLORS.secondary} 
                  fillOpacity={1} 
                  fill="url(#colorActive)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Job Applications Chart */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <SectionHeader title="Job Applications & Hires" />
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.jobApplications}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="month" stroke={COLORS.textMuted} />
                <YAxis stroke={COLORS.textMuted} />
                <Tooltip 
                  contentStyle={{ backgroundColor: COLORS.surface, border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: COLORS.text }}
                />
                <Legend />
                <Bar dataKey="applications" name="Applications" fill={COLORS.secondary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="hires" name="Hires" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* User Demographics */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <SectionHeader title="User Demographics" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.userDemographics}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {charts.userDemographics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: COLORS.surface, border: 'none', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {charts.userDemographics.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement by Day */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 lg:col-span-2">
          <SectionHeader title="Weekly Engagement Pattern" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.engagementByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="day" stroke={COLORS.textMuted} />
                <YAxis stroke={COLORS.textMuted} />
                <Tooltip 
                  contentStyle={{ backgroundColor: COLORS.surface, border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: COLORS.text }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="logins" 
                  name="Logins"
                  stroke={COLORS.primary} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary }}
                />
                <Line 
                  type="monotone" 
                  dataKey="actions" 
                  name="Actions"
                  stroke={COLORS.accent} 
                  strokeWidth={2}
                  dot={{ fill: COLORS.accent }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Employers */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <SectionHeader 
            title="Top Employers" 
            action={
              <button className="text-green-400 text-sm hover:underline">View All</button>
            }
          />
          <div className="space-y-4">
            {charts.topEmployers.map((employer, index) => (
              <div key={employer.name} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">{employer.name}</p>
                  <p className="text-sm text-slate-400">{employer.jobs} active jobs</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-semibold">{employer.hires} hires</p>
                  <p className="text-xs text-slate-500">this month</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <SectionHeader title="Engagement Metrics" />
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p className="text-3xl font-bold text-white">{metrics.engagement.dailyActiveUsers.toLocaleString()}</p>
              <p className="text-sm text-slate-400 mt-1">Daily Active Users</p>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p className="text-3xl font-bold text-white">{metrics.engagement.weeklyActiveUsers.toLocaleString()}</p>
              <p className="text-sm text-slate-400 mt-1">Weekly Active Users</p>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p className="text-3xl font-bold text-white">{metrics.engagement.avgSessionDuration}m</p>
              <p className="text-sm text-slate-400 mt-1">Avg. Session Duration</p>
            </div>
            <div className="text-center p-4 bg-slate-700/50 rounded-lg">
              <p className="text-3xl font-bold text-white">{metrics.engagement.postsThisWeek}</p>
              <p className="text-sm text-slate-400 mt-1">Posts This Week</p>
            </div>
          </div>

          {/* Mentor Stats */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h3 className="text-lg font-medium text-white mb-4">Mentorship Program</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-white">{metrics.mentorship.totalMentors}</p>
                <p className="text-sm text-slate-400">Active Mentors</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{metrics.mentorship.totalSessions.toLocaleString()}</p>
                <p className="text-sm text-slate-400">Total Sessions</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-bold text-yellow-400">{metrics.mentorship.avgRating}</p>
                  <span className="text-yellow-400">⭐</span>
                </div>
                <p className="text-sm text-slate-400">Avg. Rating</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
