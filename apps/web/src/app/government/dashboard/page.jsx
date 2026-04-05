'use client';

import api from '@/lib/apiClient';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

/**
 * Government Dashboard - Closing the Gap Metrics
 * 
 * Displays real-time metrics aligned with Closing the Gap priorities.
 * Provides government users with overview of platform outcomes.
 */

// Status badge colors
const STATUS_COLORS = {
  ON_TRACK: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EXCEEDING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  NEEDS_ATTENTION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  AT_RISK: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// Date range presets
const DATE_PRESETS = [
  { label: 'All Time', value: 'all' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Last 6 Months', value: '6months' },
  { label: 'Last 12 Months', value: '12months' },
];

// Skeleton loading component
function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      aria-hidden="true"
    />
  );
}

// Metric card component
function MetricCard({ title, value, trend, status, targetNumber, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {trend} vs previous period
            </p>
          )}
        </div>
        {targetNumber && (
          <span className="text-xs text-gray-400">Target #{targetNumber}</span>
        )}
      </div>
      {status && (
        <span className={`inline-block mt-3 px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[status] || STATUS_COLORS.ON_TRACK}`}>
          {status.replace(/_/g, ' ')}
        </span>
      )}
    </div>
  );
}

// Regional breakdown chart (simple bar chart)
function RegionalChart({ data, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="mb-3">
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-6 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const maxPlacements = Math.max(...(data?.regions?.map(r => r.placements) || [1]));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Regional Breakdown
      </h3>
      <div className="space-y-3">
        {data?.regions?.map((region) => (
          <div key={region.region}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">{region.name}</span>
              <span className="text-gray-500">{region.placements} placements</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(region.placements / maxPlacements) * 100}%` }}
                role="progressbar"
                aria-valuenow={region.placements}
                aria-valuemax={maxPlacements}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Industry breakdown
function IndustryChart({ data, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Industry Sectors
      </h3>
      <div className="space-y-2">
        {data?.sectors?.slice(0, 5).map((sector) => (
          <div
            key={sector.sector}
            className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <span className="text-gray-700 dark:text-gray-300">{sector.sector}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{sector.placements}</span>
              <span className={`text-sm ${sector.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {sector.growth}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Trend line chart (simplified)
function TrendChart({ data, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const maxValue = Math.max(...(data?.trends?.map(t => t.placements) || [1]));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        12-Month Trend
      </h3>
      <div className="flex items-end gap-1 h-48">
        {data?.trends?.map((point, idx) => (
          <div key={point.month} className="flex-1 flex flex-col items-center">
            <div
              className="w-full bg-amber-500 rounded-t transition-all duration-500 hover:bg-amber-600"
              style={{ height: `${(point.placements / maxValue) * 100}%` }}
              title={`${point.label}: ${point.placements} placements`}
            />
            {idx % 2 === 0 && (
              <span className="text-xs text-gray-500 mt-1 transform -rotate-45">
                {point.label}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Placements Growth</span>
          <p className="font-semibold text-green-600">{data?.overallGrowth?.placements}</p>
        </div>
        <div>
          <span className="text-gray-500">Active Users Growth</span>
          <p className="font-semibold text-green-600">{data?.overallGrowth?.activeUsers}</p>
        </div>
      </div>
    </div>
  );
}

// Employer accountability table
function EmployerTable({ data, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Performing Employers
        </h3>
        <span className="text-sm text-gray-500">
          {data?.rapVerifiedEmployers} RAP-verified ({data?.rapAdoptionRate}%)
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full" role="table" aria-label="Top performing employers">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th scope="col" className="text-left py-2 text-sm font-medium text-gray-500">Employer</th>
              <th scope="col" className="text-right py-2 text-sm font-medium text-gray-500">Placements</th>
              <th scope="col" className="text-right py-2 text-sm font-medium text-gray-500">Retention</th>
              <th scope="col" className="text-right py-2 text-sm font-medium text-gray-500">RAP Level</th>
            </tr>
          </thead>
          <tbody>
            {data?.topPerformers?.map((emp) => (
              <tr key={emp.name} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-2 text-gray-900 dark:text-white">{emp.name}</td>
                <td className="text-right py-2 text-gray-600 dark:text-gray-400">{emp.placements}</td>
                <td className="text-right py-2 text-gray-600 dark:text-gray-400">{emp.retention}%</td>
                <td className="text-right py-2">
                  <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded">
                    {emp.rapLevel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Average Retention Rate</span>
          <span className={`font-semibold ${data?.averageRetention >= data?.targetRetention ? 'text-green-600' : 'text-yellow-600'}`}>
            {data?.averageRetention}% (target: {data?.targetRetention}%)
          </span>
        </div>
      </div>
    </div>
  );
}

// Demographics donut chart (simplified CSS-based)
function DemographicsChart({ data, loading = false }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="flex items-center justify-center">
          <Skeleton className="h-32 w-32 rounded-full" />
        </div>
      </div>
    );
  }

  const ageGroups = data?.ageGroups || [];
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Age Demographics
      </h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Simple pie representation */}
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
            {ageGroups.reduce((acc, group, idx) => {
              const startOffset = acc.offset;
              const dashArray = group.percentage;
              acc.elements.push(
                <circle
                  key={group.range}
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={colors[idx % colors.length]}
                  strokeWidth="3"
                  strokeDasharray={`${dashArray} ${100 - dashArray}`}
                  strokeDashoffset={-startOffset}
                  className="transition-all duration-500"
                  aria-label={`${group.label}: ${group.percentage}%`}
                />
              );
              acc.offset += dashArray;
              return acc;
            }, { elements: [], offset: 0 }).elements}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {ageGroups.reduce((sum, g) => sum + g.count, 0)}
            </span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {ageGroups.map((group, idx) => (
            <div key={group.range} className="flex items-center gap-2">
              <span 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: colors[idx % colors.length] }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {group.range} ({group.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Date range filter component
function DateRangeFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="date-range" className="text-sm text-gray-500 dark:text-gray-400">
        Period:
      </label>
      <select
        id="date-range"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
      >
        {DATE_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {preset.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function GovernmentDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [dashboardData, setDashboardData] = useState(null);
  const [regional, setRegional] = useState(null);
  const [industry, setIndustry] = useState(null);
  const [trends, setTrends] = useState(null);
  const [employers, setEmployers] = useState(null);
  const [demographics, setDemographics] = useState(null);

  const fetchData = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      
      setError(null);

      // Build query params for date filtering
      const params = new URLSearchParams();
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate;
        switch (dateRange) {
          case 'quarter':
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case '6months':
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 6);
            break;
          case '12months':
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 12);
            break;
        }
        if (startDate) params.set('startDate', startDate.toISOString());
        params.set('endDate', now.toISOString());
      }
      const queryString = params.toString() ? `?${params.toString()}` : '';

      const [dashRes, regRes, indRes, trendRes, empRes, demoRes] = await Promise.all([
        api(`/government/dashboard${queryString}`),
        api(`/government/regional${queryString}`),
        api('/government/industry'),
        api('/government/trends?months=12'),
        api('/government/employers'),
        api('/government/demographics'),
      ]);

      if (!dashRes.ok) {
        throw new Error(dashRes.data?.error || dashRes.error || 'Failed to load dashboard data');
      }

      setDashboardData(dashRes.data?.data);
      setRegional(regRes.data?.data);
      setIndustry(indRes.data?.data);
      setTrends(trendRes.data?.data);
      setEmployers(empRes.data?.data);
      setDemographics(demoRes.data?.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData(true);
  };

  const ctg = dashboardData?.closingTheGap || {};

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Government Portal
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Closing the Gap - Employment Outcomes Dashboard
              </p>
            </div>
          <div className="flex flex-wrap gap-3">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
                aria-label="Refresh data"
              >
                <svg 
                  className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <Link
                href="/government/reports"
                className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">View Reports</span>
                <span className="sm:hidden">Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Error message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4" role="alert">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* CTG Priority Metrics */}
        <section aria-labelledby="ctg-heading">
          <h2 id="ctg-heading" className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Closing the Gap Priorities
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              title="Employment & Economic Participation"
              value={ctg.employment?.currentValue}
              trend={ctg.employment?.trend}
              status={ctg.employment?.status}
              targetNumber={10}
              loading={loading}
            />
            <MetricCard
              title="Education & Training"
              value={ctg.education?.currentValue}
              trend={ctg.education?.trend}
              status={ctg.education?.status}
              targetNumber={6}
              loading={loading}
            />
            <MetricCard
              title="Youth Employment"
              value={ctg.youthEmployment?.currentValue}
              trend={ctg.youthEmployment?.trend}
              status={ctg.youthEmployment?.status}
              targetNumber={7}
              loading={loading}
            />
            <MetricCard
              title="Digital Inclusion"
              value={ctg.digitalInclusion?.currentValue}
              trend={ctg.digitalInclusion?.trend}
              status={ctg.digitalInclusion?.status}
              targetNumber={17}
              loading={loading}
            />
          </div>
        </section>

        {/* Summary Stats */}
        <section aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Platform Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <MetricCard
              title="Total Placements"
              value={dashboardData?.summary?.totalPlacements}
              loading={loading}
            />
            <MetricCard
              title="Active Job Seekers"
              value={dashboardData?.summary?.activeJobSeekers}
              loading={loading}
            />
            <MetricCard
              title="Training Completions"
              value={dashboardData?.summary?.trainingCompletions}
              loading={loading}
            />
            <MetricCard
              title="Mentorship Sessions"
              value={dashboardData?.summary?.mentorshipSessions}
              loading={loading}
            />
            <MetricCard
              title="Employer Partners"
              value={dashboardData?.summary?.employerPartnerships}
              loading={loading}
            />
            <MetricCard
              title="Retention Rate"
              value={`${dashboardData?.summary?.retentionRate || 0}%`}
              loading={loading}
            />
          </div>
        </section>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <RegionalChart data={regional} loading={loading} />
          <IndustryChart data={industry} loading={loading} />
          <DemographicsChart data={demographics} loading={loading} />
        </div>

        {/* Trend Chart */}
        <div className="mb-8">
          <TrendChart data={trends} loading={loading} />
        </div>

        {/* Employer Accountability */}
        <section aria-labelledby="employers-heading">
          <h2 id="employers-heading" className="sr-only">Employer Accountability</h2>
          <EmployerTable data={employers} loading={loading} />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Data aligned with the National Agreement on Closing the Gap. Last updated: {new Date().toLocaleDateString('en-AU')}
          </p>
        </div>
      </footer>
    </div>
  );
}
