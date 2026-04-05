/**
 * Admin Analytics Dashboard
 * 
 * Comprehensive analytics dashboard for platform administrators showing:
 * - User growth and engagement metrics
 * - Job posting and application statistics
 * - Mentorship program analytics
 * - Indigenous employment metrics
 * - Revenue and subscription data
 * - Real-time activity monitoring
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// Types
interface DashboardMetrics {
  users: {
    total: number;
    members: number;
    mentors: number;
    employers: number;
    newThisMonth: number;
    activeDaily: number;
    activeWeekly: number;
    retentionRate: number;
  };
  jobs: {
    total: number;
    active: number;
    indigenousDesignated: number;
    applications: number;
    avgApplicationsPerJob: number;
    hireRate: number;
  };
  mentorship: {
    totalSessions: number;
    completedSessions: number;
    avgRating: number;
    activeMentors: number;
    activeMentees: number;
    totalHours: number;
  };
  indigenous: {
    totalIndigenousUsers: number;
    indigenousPercentage: number;
    indigenousHires: number;
    rapCertifiedCompanies: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    revenueGrowth: number;
    subscriptions: {
      free: number;
      starter: number;
      professional: number;
      enterprise: number;
      rap: number;
    };
  };
}

interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

// Theme colors
const colors = {
  primary: '#2d6a4f',
  primaryLight: '#40916c',
  secondary: '#74c69d',
  accent: '#b7e4c7',
  ochre: '#d97706',
  terracotta: '#c2410c',
  purple: '#8b5cf6',
  blue: '#3b82f6',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#ef4444',
};

const COLORS = [colors.primary, colors.ochre, colors.purple, colors.blue, colors.terracotta];

// Stat Card Component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, change, changeLabel, icon, color = colors.primary }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {change !== undefined && (
          <div className="flex items-center mt-2">
            <span
              className={`text-sm font-medium ${
                change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
            </span>
            <span className="text-xs text-gray-400 ml-1">{changeLabel || 'vs last month'}</span>
          </div>
        )}
      </div>
      <div
        className="p-3 rounded-lg"
        style={{ backgroundColor: color + '15' }}
      >
        {icon}
      </div>
    </div>
  </div>
);

const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
}> = ({ title, value, subtitle }) => (
  <div className="bg-white/80 backdrop-blur rounded-xl px-4 py-3 border border-gray-100">
    <p className="text-xs text-gray-500 font-medium">{title}</p>
    <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
  </div>
);

// Chart Card Component
const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ title, subtitle, children, action }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

// Date Range Selector
const DateRangeSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20"
  >
    <option value="7d">Last 7 days</option>
    <option value="30d">Last 30 days</option>
    <option value="90d">Last 90 days</option>
    <option value="1y">Last year</option>
    <option value="all">All time</option>
  </select>
);

// Main Component
export default function AdminAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [userGrowth, setUserGrowth] = useState<TimeSeriesData[]>([]);
  const [jobActivity, setJobActivity] = useState<TimeSeriesData[]>([]);
  const [revenueData, setRevenueData] = useState<TimeSeriesData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'jobs' | 'mentorship' | 'revenue'>('overview');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // In production, fetch from API
        // const response = await fetch(`/api/admin/analytics?range=${dateRange}`);
        // const data = await response.json();

        // Mock data for demonstration
        setMetrics({
          users: {
            total: 15847,
            members: 12450,
            mentors: 856,
            employers: 2541,
            newThisMonth: 1234,
            activeDaily: 3421,
            activeWeekly: 8756,
            retentionRate: 72.5,
          },
          jobs: {
            total: 4523,
            active: 1876,
            indigenousDesignated: 423,
            applications: 28456,
            avgApplicationsPerJob: 15.2,
            hireRate: 8.7,
          },
          mentorship: {
            totalSessions: 12456,
            completedSessions: 11234,
            avgRating: 4.7,
            activeMentors: 234,
            activeMentees: 1567,
            totalHours: 8234,
          },
          indigenous: {
            totalIndigenousUsers: 4523,
            indigenousPercentage: 28.5,
            indigenousHires: 892,
            rapCertifiedCompanies: 156,
          },
          revenue: {
            mrr: 127500,
            arr: 1530000,
            revenueGrowth: 18.5,
            subscriptions: {
              free: 1876,
              starter: 423,
              professional: 189,
              enterprise: 45,
              rap: 8,
            },
          },
        });

        // Generate time series data
        const days = parseInt(dateRange) || 30;
        const growthData = eachDayOfInterval({
          start: subDays(new Date(), days),
          end: new Date(),
        }).map((date) => ({
          date: format(date, 'MMM d'),
          value: Math.floor(Math.random() * 100) + 50,
        }));
        setUserGrowth(growthData);

        const jobData = eachDayOfInterval({
          start: subDays(new Date(), days),
          end: new Date(),
        }).map((date) => ({
          date: format(date, 'MMM d'),
          value: Math.floor(Math.random() * 50) + 20,
        }));
        setJobActivity(jobData);

        const revData = eachDayOfInterval({
          start: subDays(new Date(), days),
          end: new Date(),
        }).map((date) => ({
          date: format(date, 'MMM d'),
          value: Math.floor(Math.random() * 5000) + 3000,
        }));
        setRevenueData(revData);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange]);

  // User distribution data for pie chart
  const userDistribution = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Members', value: metrics.users.members },
      { name: 'Mentors', value: metrics.users.mentors },
      { name: 'Employers', value: metrics.users.employers },
    ];
  }, [metrics]);

  // Subscription distribution
  const subscriptionData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: 'Free', value: metrics.revenue.subscriptions.free, color: '#9ca3af' },
      { name: 'Starter', value: metrics.revenue.subscriptions.starter, color: colors.blue },
      { name: 'Professional', value: metrics.revenue.subscriptions.professional, color: colors.purple },
      { name: 'Enterprise', value: metrics.revenue.subscriptions.enterprise, color: colors.ochre },
      { name: 'RAP', value: metrics.revenue.subscriptions.rap, color: colors.primary },
    ];
  }, [metrics]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-emerald-50 p-6 mb-8">
          <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Admin Analytics</p>
              <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              <p className="text-gray-500 mt-1">Platform performance and insights</p>
            </div>
            <div className="flex items-center gap-3">
              <DateRangeSelector value={dateRange} onChange={setDateRange} />
              <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors">
                Export Report
              </button>
            </div>
          </div>
        </div>

        {metrics && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <SummaryCard
              title="Weekly Active Users"
              value={metrics.users.activeWeekly.toLocaleString()}
              subtitle="Active in last 7 days"
            />
            <SummaryCard
              title="Annual Recurring Revenue"
              value={`$${(metrics.revenue.arr / 1000).toFixed(1)}k`}
              subtitle="Projected ARR"
            />
            <SummaryCard
              title="Indigenous Hires"
              value={metrics.indigenous.indigenousHires.toLocaleString()}
              subtitle="Total hires to date"
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100/80 p-1 rounded-full w-fit">
          {(['overview', 'users', 'jobs', 'mentorship', 'revenue'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={metrics.users.total.toLocaleString()}
              change={12.5}
              icon={
                <svg className="w-6 h-6" fill={colors.primary} viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              }
            />
            <StatCard
              title="Active Jobs"
              value={metrics.jobs.active.toLocaleString()}
              change={8.3}
              icon={
                <svg className="w-6 h-6" fill={colors.blue} viewBox="0 0 24 24">
                  <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                </svg>
              }
              color={colors.blue}
            />
            <StatCard
              title="Monthly Revenue"
              value={`$${(metrics.revenue.mrr / 1000).toFixed(1)}k`}
              change={metrics.revenue.revenueGrowth}
              icon={
                <svg className="w-6 h-6" fill={colors.success} viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                </svg>
              }
              color={colors.success}
            />
            <StatCard
              title="Indigenous Users"
              value={`${metrics.indigenous.indigenousPercentage}%`}
              change={5.2}
              icon={
                <svg className="w-6 h-6" fill={colors.ochre} viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              }
              color={colors.ochre}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ChartCard title="User Growth" subtitle="New registrations over time">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowth}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={colors.primary}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="User Distribution" subtitle="By account type">
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={userDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {userDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <ChartCard title="Mentorship Sessions">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.mentorship.completedSessions.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">completed sessions</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {metrics.mentorship.avgRating.toFixed(1)} ⭐
                  </p>
                  <p className="text-sm text-gray-500">average rating</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Active Mentors</span>
                  <span className="font-medium">{metrics.mentorship.activeMentors}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Total Hours</span>
                  <span className="font-medium">{metrics.mentorship.totalHours.toLocaleString()}</span>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Job Applications">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.jobs.applications.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">total applications</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics.jobs.avgApplicationsPerJob.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500">avg per job</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Indigenous Designated Jobs</span>
                  <span className="font-medium text-ochre">{metrics.jobs.indigenousDesignated}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Hire Rate</span>
                  <span className="font-medium">{metrics.jobs.hireRate}%</span>
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Subscription Mix">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={subscriptionData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {subscriptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                  <Tooltip />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Revenue Chart */}
          <ChartCard
            title="Revenue Trend"
            subtitle="Daily revenue over selected period"
            action={
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  ${(metrics.revenue.mrr / 1000).toFixed(1)}k
                </p>
                <p className="text-sm text-gray-500">MRR</p>
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value?: number) => [`$${(value ?? 0).toLocaleString()}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.success}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Indigenous Impact Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Indigenous Impact</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-ochre to-terracotta text-white rounded-xl p-6">
                <p className="text-sm opacity-80">Total Indigenous Users</p>
                <p className="text-3xl font-bold mt-1">
                  {metrics.indigenous.totalIndigenousUsers.toLocaleString()}
                </p>
                <p className="text-sm opacity-80 mt-2">
                  {metrics.indigenous.indigenousPercentage}% of platform
                </p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Indigenous Hires</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {metrics.indigenous.indigenousHires}
                </p>
                <p className="text-sm text-green-600 mt-2">↑ 23% this quarter</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500">RAP Certified Companies</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {metrics.indigenous.rapCertifiedCompanies}
                </p>
                <p className="text-sm text-green-600 mt-2">↑ 12 new this month</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <p className="text-sm text-gray-500">Mentorship Hours</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {metrics.mentorship.totalHours.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">by Indigenous mentors</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Users"
              value={metrics.users.total.toLocaleString()}
              change={12.5}
              icon={<svg className="w-6 h-6" fill={colors.primary} viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>}
            />
            <StatCard
              title="New This Month"
              value={metrics.users.newThisMonth.toLocaleString()}
              change={8.3}
              icon={<svg className="w-6 h-6" fill={colors.success} viewBox="0 0 24 24"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>}
              color={colors.success}
            />
            <StatCard
              title="Daily Active"
              value={metrics.users.activeDaily.toLocaleString()}
              change={-2.1}
              icon={<svg className="w-6 h-6" fill={colors.blue} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>}
              color={colors.blue}
            />
            <StatCard
              title="Retention Rate"
              value={`${metrics.users.retentionRate}%`}
              change={3.2}
              icon={<svg className="w-6 h-6" fill={colors.purple} viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z" /></svg>}
              color={colors.purple}
            />
          </div>

          <ChartCard title="User Growth Over Time">
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={colors.primary}
                  fillOpacity={1}
                  fill="url(#colorGrowth)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Active Jobs"
              value={metrics.jobs.active.toLocaleString()}
              change={15.2}
              icon={<svg className="w-6 h-6" fill={colors.blue} viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" /></svg>}
              color={colors.blue}
            />
            <StatCard
              title="Applications"
              value={metrics.jobs.applications.toLocaleString()}
              change={22.1}
              icon={<svg className="w-6 h-6" fill={colors.success} viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" /></svg>}
              color={colors.success}
            />
            <StatCard
              title="Indigenous Jobs"
              value={metrics.jobs.indigenousDesignated}
              change={18.5}
              icon={<svg className="w-6 h-6" fill={colors.ochre} viewBox="0 0 24 24"><path d="M12 2l.94 2.06 2.06.94-2.06.94L12 8l-.94-2.06-2.06-.94 2.06-.94L12 2zm-8 8l.94 2.06 2.06.94-2.06.94L4 16l-.94-2.06-2.06-.94 2.06-.94L4 10zm16 0l.94 2.06 2.06.94-2.06.94L20 16l-.94-2.06-2.06-.94 2.06-.94L20 10z" /></svg>}
              color={colors.ochre}
            />
            <StatCard
              title="Hire Rate"
              value={`${metrics.jobs.hireRate}%`}
              change={5.8}
              icon={<svg className="w-6 h-6" fill={colors.purple} viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>}
              color={colors.purple}
            />
          </div>

          <ChartCard title="Job Posting Activity">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={jobActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill={colors.blue} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Mentorship Tab */}
      {activeTab === 'mentorship' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Completed Sessions"
              value={metrics.mentorship.completedSessions.toLocaleString()}
              change={12.3}
              icon={<svg className="w-6 h-6" fill={colors.primary} viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>}
            />
            <StatCard
              title="Active Mentors"
              value={metrics.mentorship.activeMentors}
              change={8.7}
              icon={<svg className="w-6 h-6" fill={colors.ochre} viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" /></svg>}
              color={colors.ochre}
            />
            <StatCard
              title="Average Rating"
              value={metrics.mentorship.avgRating.toFixed(1)}
              change={0.2}
              changeLabel="vs last quarter"
              icon={<svg className="w-6 h-6" fill={colors.warning} viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>}
              color={colors.warning}
            />
            <StatCard
              title="Total Hours"
              value={metrics.mentorship.totalHours.toLocaleString()}
              change={15.6}
              icon={<svg className="w-6 h-6" fill={colors.purple} viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>}
              color={colors.purple}
            />
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="MRR"
              value={`$${(metrics.revenue.mrr / 1000).toFixed(1)}k`}
              change={metrics.revenue.revenueGrowth}
              icon={<svg className="w-6 h-6" fill={colors.success} viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" /></svg>}
              color={colors.success}
            />
            <StatCard
              title="ARR"
              value={`$${(metrics.revenue.arr / 1000000).toFixed(2)}M`}
              change={metrics.revenue.revenueGrowth}
              icon={<svg className="w-6 h-6" fill={colors.primary} viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z" /></svg>}
            />
            <StatCard
              title="Paid Subscriptions"
              value={(
                metrics.revenue.subscriptions.starter +
                metrics.revenue.subscriptions.professional +
                metrics.revenue.subscriptions.enterprise +
                metrics.revenue.subscriptions.rap
              ).toLocaleString()}
              change={9.4}
              icon={<svg className="w-6 h-6" fill={colors.purple} viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>}
              color={colors.purple}
            />
            <StatCard
              title="Conversion Rate"
              value="12.3%"
              change={2.1}
              icon={<svg className="w-6 h-6" fill={colors.blue} viewBox="0 0 24 24"><path d="M16.59 9H15V4c0-.55-.45-1-1-1h-4c-.55 0-1 .45-1 1v5H7.41c-.89 0-1.34 1.08-.71 1.71l4.59 4.59c.39.39 1.02.39 1.41 0l4.59-4.59c.63-.63.19-1.71-.7-1.71zM5 19c0 .55.45 1 1 1h12c.55 0 1-.45 1-1s-.45-1-1-1H6c-.55 0-1 .45-1 1z" /></svg>}
              color={colors.blue}
            />
          </div>

          <ChartCard title="Revenue Over Time">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value?: number) => [`$${(value ?? 0).toLocaleString()}`, 'Revenue']} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors.success}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
      </div>
    </div>
  );
}
