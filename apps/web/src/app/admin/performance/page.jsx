'use client';

import { API_BASE } from '@/lib/apiBase';
import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Admin Performance Monitoring Dashboard
 * Shows cache stats, memory usage, and system health
 */
export default function PerformancePage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const apiBase = API_BASE;
      const res = await fetch(`${apiBase}/health/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      setMetrics(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/admin" className="text-xs text-blue-300 hover:text-blue-200 mb-3 inline-flex items-center gap-2">
                ← Back to Admin
              </Link>
              <h1 className="text-2xl md:text-3xl font-semibold">Performance Monitoring</h1>
              <p className="text-slate-400 text-sm mt-2 max-w-2xl">
                Real-time system health, memory utilization, and cache performance signals.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-4">
                <span className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Live polling: 30s
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Last updated: {lastRefresh ? lastRefresh.toLocaleTimeString() : '--'}
                </span>
              </div>
            </div>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Uptime</p>
            <p className="text-lg font-semibold mt-1 text-green-400">
              {metrics?.uptime ? formatUptime(metrics.uptime) : '--'}
            </p>
            <p className="text-xs text-slate-500 mt-1">System availability</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Heap Utilization</p>
            <p className="text-lg font-semibold mt-1">
              {metrics?.memory?.heapUsed ? formatBytes(metrics.memory.heapUsed) : '--'}
              <span className="text-xs text-slate-500 ml-2">/ {metrics?.memory?.heapTotal ? formatBytes(metrics.memory.heapTotal) : '--'}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {metrics?.memory?.heapTotal
                ? `${((metrics.memory.heapUsed / metrics.memory.heapTotal) * 100).toFixed(1)}% used`
                : 'Utilization unavailable'}
            </p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Cache Entries</p>
            <p className="text-lg font-semibold mt-1">
              {metrics?.cache?.totalEntries?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Valid: {metrics?.cache?.validEntries?.toLocaleString() || 0}</p>
          </div>
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400">Active Jobs</p>
            <p className="text-lg font-semibold mt-1">
              {metrics?.metrics?.activeJobs?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-slate-500 mt-1">Applications: {metrics?.metrics?.applications?.toLocaleString() || 0}</p>
          </div>
        </div>

        {metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* System Health */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                System Health
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Uptime</span>
                  <span className="font-mono text-green-400">{formatUptime(metrics.uptime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Active Jobs</span>
                  <span className="font-mono">{metrics.metrics?.activeJobs?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Users</span>
                  <span className="font-mono">{metrics.metrics?.users?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Applications</span>
                  <span className="font-mono">{metrics.metrics?.applications?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Memory Usage
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Heap Used</span>
                  <span className="font-mono">{formatBytes(metrics.memory?.heapUsed || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heap Total</span>
                  <span className="font-mono">{formatBytes(metrics.memory?.heapTotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RSS</span>
                  <span className="font-mono">{formatBytes(metrics.memory?.rss || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">External</span>
                  <span className="font-mono">{formatBytes(metrics.memory?.external || 0)}</span>
                </div>
              </div>
              {/* Memory bar */}
              <div className="mt-4">
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (metrics.memory?.heapUsed / metrics.memory?.heapTotal) * 100 || 0)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {((metrics.memory?.heapUsed / metrics.memory?.heapTotal) * 100 || 0).toFixed(1)}% heap utilization
                </p>
              </div>
            </div>

            {/* Cache Stats */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                Cache Statistics
              </h2>
              {metrics.cache ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Entries</span>
                    <span className="font-mono">{metrics.cache.totalEntries?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valid Entries</span>
                    <span className="font-mono text-green-400">{metrics.cache.validEntries?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expired Entries</span>
                    <span className="font-mono text-slate-500">{metrics.cache.expiredEntries?.toLocaleString() || 0}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">Cached Types:</p>
                    <div className="flex flex-wrap gap-2">
                      {metrics.cache.cacheTypes?.map(type => (
                        <span key={type} className="px-2 py-1 bg-slate-800 rounded text-xs">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Cache stats not available</p>
              )}
            </div>

            {/* Rate Limiting Info */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6 md:col-span-2 lg:col-span-3 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Rate Limiting Configuration
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { name: 'Public', limit: '100/15min', color: 'bg-green-500/20 text-green-400' },
                  { name: 'Auth', limit: '300/15min', color: 'bg-blue-500/20 text-blue-400' },
                  { name: 'Sensitive', limit: '10/hour', color: 'bg-amber-500/20 text-amber-400' },
                  { name: 'AI', limit: '10/min', color: 'bg-purple-500/20 text-purple-400' },
                  { name: 'Uploads', limit: '50/hour', color: 'bg-pink-500/20 text-pink-400' },
                  { name: 'Admin', limit: '500/15min', color: 'bg-cyan-500/20 text-cyan-400' },
                  { name: 'Search', limit: '30/min', color: 'bg-orange-500/20 text-orange-400' },
                ].map(tier => (
                  <div key={tier.name} className={`p-3 rounded-lg ${tier.color}`}>
                    <p className="font-medium text-sm">{tier.name}</p>
                    <p className="text-xs opacity-80">{tier.limit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
