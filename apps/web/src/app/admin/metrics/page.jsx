'use client';

/**
 * Admin Metrics Dashboard
 * View API performance metrics and system health
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/apiBase';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  Clock,
  Server,
  Zap,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Cpu,
  HardDrive
} from 'lucide-react';

const API_URL = API_BASE;

export default function AdminMetricsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/metrics/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchMetrics();
    }
  }, [token, fetchMetrics]);

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    let interval;
    if (autoRefresh && token) {
      interval = setInterval(fetchMetrics, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, token, fetchMetrics]);

  function formatNumber(num) {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  }

  function formatLatency(ms) {
    if (!ms) return '0ms';
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
  }

  function getStatusColor(rate) {
    if (rate >= 99) return 'text-green-400';
    if (rate >= 95) return 'text-yellow-400';
    return 'text-red-400';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/admin" className="text-xs text-emerald-300 hover:text-emerald-200 mb-3 inline-flex items-center gap-2">
                ← Back to Admin
              </Link>
              <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-3">
                <BarChart3 className="w-7 h-7 text-green-400" />
                API Metrics
              </h1>
              <p className="text-slate-400 mt-2 max-w-2xl">
                Track throughput, latency, error rates, and infrastructure health in real time.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-4">
                <span className={`px-2.5 py-1 rounded-full border ${autoRefresh ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/70 border-slate-700 text-slate-300'}`}>
                  Auto-refresh: {autoRefresh ? 'On' : 'Off'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Token-secured metrics
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                Auto-refresh
              </label>
              <button
                onClick={fetchMetrics}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Requests</p>
                <p className="text-2xl font-bold mt-1">
                  {formatNumber(metrics?.requests?.total)}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-green-400">Active: {metrics?.activeRequests || 0}</span>
            </div>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Response Time</p>
                <p className="text-2xl font-bold mt-1">
                  {formatLatency(metrics?.latency?.average)}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-400" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              P95: {formatLatency(metrics?.latency?.p95)}
            </p>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Error Rate</p>
                <p className={`text-2xl font-bold mt-1 ${
                  (metrics?.errors?.rate || 0) < 1 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {((metrics?.errors?.rate || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {formatNumber(metrics?.errors?.total)} total errors
            </p>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Success Rate</p>
                <p className={`text-2xl font-bold mt-1 ${getStatusColor(100 - (metrics?.errors?.rate || 0) * 100)}`}>
                  {(100 - (metrics?.errors?.rate || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              2xx + 3xx responses
            </p>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Requests by Method */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Requests by Method
            </h3>
            <div className="space-y-3">
              {metrics?.requests?.byMethod && Object.entries(metrics.requests.byMethod)
                .sort(([, a], [, b]) => b - a)
                .map(([method, count]) => {
                  const total = metrics.requests.total || 1;
                  const percentage = (count / total) * 100;
                  const colorMap = {
                    GET: 'bg-blue-500',
                    POST: 'bg-green-500',
                    PUT: 'bg-yellow-500',
                    DELETE: 'bg-red-500',
                    PATCH: 'bg-purple-500',
                  };
                  return (
                    <div key={method}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{method}</span>
                        <span className="text-slate-400">{formatNumber(count)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colorMap[method] || 'bg-slate-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Requests by Status */}
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              Requests by Status
            </h3>
            <div className="space-y-3">
              {metrics?.requests?.byStatus && Object.entries(metrics.requests.byStatus)
                .sort(([a], [b]) => a - b)
                .map(([status, count]) => {
                  const total = metrics.requests.total || 1;
                  const percentage = (count / total) * 100;
                  const statusNum = parseInt(status);
                  let colorClass = 'bg-slate-500';
                  if (statusNum >= 200 && statusNum < 300) colorClass = 'bg-green-500';
                  else if (statusNum >= 300 && statusNum < 400) colorClass = 'bg-blue-500';
                  else if (statusNum >= 400 && statusNum < 500) colorClass = 'bg-yellow-500';
                  else if (statusNum >= 500) colorClass = 'bg-red-500';
                  
                  return (
                    <div key={status} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                        <span className="font-medium">{status}</span>
                      </div>
                      <span className="text-sm text-slate-400">{formatNumber(count)}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Top Endpoints */}
          <div className="bg-slate-800 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Top Endpoints
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                    <th className="pb-3">Path</th>
                    <th className="pb-3 text-right">Requests</th>
                    <th className="pb-3 text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {metrics?.requests?.byPath && Object.entries(metrics.requests.byPath)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10)
                    .map(([path, count]) => {
                      const total = metrics.requests.total || 1;
                      const percentage = (count / total) * 100;
                      return (
                        <tr key={path} className="text-sm">
                          <td className="py-3 font-mono text-slate-300">{path}</td>
                          <td className="py-3 text-right">{formatNumber(count)}</td>
                          <td className="py-3 text-right text-slate-400">{percentage.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Health */}
          <div className="bg-slate-800 rounded-xl p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              System Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-slate-400">Uptime</p>
                <p className="text-lg font-semibold mt-1">
                  {metrics?.system?.uptime 
                    ? `${Math.floor(metrics.system.uptime / 3600)}h ${Math.floor((metrics.system.uptime % 3600) / 60)}m`
                    : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-slate-400">Memory Used</p>
                <p className="text-lg font-semibold mt-1">
                  {metrics?.system?.memory?.heapUsed 
                    ? `${(metrics.system.memory.heapUsed / 1024 / 1024).toFixed(0)} MB`
                    : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-slate-400">Node Version</p>
                <p className="text-lg font-semibold mt-1">{metrics?.system?.nodeVersion || 'N/A'}</p>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <p className="text-sm text-slate-400">Platform</p>
                <p className="text-lg font-semibold mt-1">{metrics?.system?.platform || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
