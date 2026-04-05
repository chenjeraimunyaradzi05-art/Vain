'use client';

/**
 * System Health Dashboard
 * 
 * Real-time monitoring of system health, performance metrics,
 * and infrastructure status.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ChevronLeft,
  Server,
  Database,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Globe,
  Users,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  uptime: number;
  lastCheck: string;
  message?: string;
}

interface SystemMetrics {
  cpu: { usage: number; cores: number };
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  network: { bytesIn: number; bytesOut: number };
}

interface HealthData {
  overall: 'healthy' | 'degraded' | 'critical';
  services: ServiceHealth[];
  metrics: SystemMetrics;
  database: {
    status: 'connected' | 'disconnected';
    poolSize: number;
    activeConnections: number;
    responseTime: number;
  };
  redis: {
    status: 'connected' | 'disconnected';
    memoryUsage: number;
    connectedClients: number;
  };
  queue: {
    pending: number;
    active: number;
    completed: number;
    failed: number;
  };
  recentErrors: {
    timestamp: string;
    service: string;
    message: string;
    count: number;
  }[];
  activeUsers: number;
  requestsPerMinute: number;
}

export default function SystemHealthPage() {
  const router = useRouter();
  const { showToast } = useUIStore();
  
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      const { ok, data } = await api<HealthData>('/admin/health');
      if (ok && data) {
        setHealth(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load health data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();

    if (autoRefresh) {
      const interval = setInterval(loadHealth, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [loadHealth, autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'down':
      case 'disconnected':
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'bg-green-900/50 border-green-700 text-green-400';
      case 'degraded':
        return 'bg-yellow-900/50 border-yellow-700 text-yellow-400';
      case 'down':
      case 'disconnected':
      case 'critical':
        return 'bg-red-900/50 border-red-700 text-red-400';
      default:
        return 'bg-slate-700 border-slate-600 text-slate-400';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (percentage: number) => {
    return `${percentage.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 p-6 md:p-8 mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="text-xs text-purple-300 hover:text-purple-200 mb-3 inline-flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Admin
              </button>
              <h1 className="text-2xl md:text-3xl font-semibold text-white flex items-center gap-3">
                <Activity className="w-7 h-7 text-purple-400" />
                System Health
              </h1>
              <p className="text-slate-400 mt-2 max-w-2xl">
                Real-time visibility into core services, infrastructure health, and performance signals.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-4">
                <span className={`px-2.5 py-1 rounded-full border ${health ? getStatusColor(health.overall) : 'bg-slate-800/70 border-slate-700 text-slate-300'}`}>
                  Status: {health ? health.overall : 'Loading'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '--'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-slate-700 border-slate-600"
                />
                Auto-refresh
              </label>
              <button
                onClick={loadHealth}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
        {isLoading && !health ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-2" />
            <p className="text-slate-400">Loading system health...</p>
          </div>
        ) : health ? (
          <div className="space-y-6">
            {/* Overall Status Banner */}
            <div className={`rounded-xl border p-6 ${getStatusColor(health.overall)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(health.overall)}
                  <div>
                    <h2 className="text-lg font-semibold">
                      System Status: {health.overall.charAt(0).toUpperCase() + health.overall.slice(1)}
                    </h2>
                    <p className="text-sm opacity-75">
                      All monitored services and infrastructure components
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="opacity-75">Active Users</p>
                    <p className="text-2xl font-bold">{health.activeUsers}</p>
                  </div>
                  <div className="text-center">
                    <p className="opacity-75">Requests/min</p>
                    <p className="text-2xl font-bold">{health.requestsPerMinute}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CPU */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">CPU Usage</span>
                  <Cpu className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-2xl font-bold text-white">{health.metrics.cpu.usage.toFixed(1)}%</p>
                <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      health.metrics.cpu.usage > 80 ? 'bg-red-500' :
                      health.metrics.cpu.usage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${health.metrics.cpu.usage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">{health.metrics.cpu.cores} cores</p>
              </div>

              {/* Memory */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Memory</span>
                  <MemoryStick className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-white">{health.metrics.memory.percentage.toFixed(1)}%</p>
                <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      health.metrics.memory.percentage > 85 ? 'bg-red-500' :
                      health.metrics.memory.percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${health.metrics.memory.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatBytes(health.metrics.memory.used)} / {formatBytes(health.metrics.memory.total)}
                </p>
              </div>

              {/* Disk */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Disk Space</span>
                  <HardDrive className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white">{health.metrics.disk.percentage.toFixed(1)}%</p>
                <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      health.metrics.disk.percentage > 90 ? 'bg-red-500' :
                      health.metrics.disk.percentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${health.metrics.disk.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatBytes(health.metrics.disk.used)} / {formatBytes(health.metrics.disk.total)}
                </p>
              </div>

              {/* Network */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Network</span>
                  <Globe className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-green-400 flex items-center gap-1">
                      <ArrowDown className="w-3 h-3" />
                      {formatBytes(health.metrics.network.bytesIn)}/s
                    </p>
                    <p className="text-sm text-blue-400 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" />
                      {formatBytes(health.metrics.network.bytesOut)}/s
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Services & Infrastructure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Services */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-purple-400" />
                  Services
                </h3>
                <div className="space-y-3">
                  {health.services.map((service) => (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(service.status)}
                        <div>
                          <p className="font-medium text-white">{service.name}</p>
                          {service.message && (
                            <p className="text-xs text-slate-400">{service.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        {service.latency && (
                          <p className="text-slate-300">{service.latency}ms</p>
                        )}
                        <p className="text-slate-500">{formatUptime(service.uptime)} uptime</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Database & Redis */}
              <div className="space-y-6">
                {/* Database */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    Database
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-slate-400">Status</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(health.database.status)}
                        <span className="text-white capitalize">{health.database.status}</span>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-slate-400">Response Time</p>
                      <p className="text-xl font-semibold text-white mt-1">{health.database.responseTime}ms</p>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-slate-400">Pool Size</p>
                      <p className="text-xl font-semibold text-white mt-1">{health.database.poolSize}</p>
                    </div>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-sm text-slate-400">Active Connections</p>
                      <p className="text-xl font-semibold text-white mt-1">{health.database.activeConnections}</p>
                    </div>
                  </div>
                </div>

                {/* Queue */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Job Queue
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-400">{health.queue.pending}</p>
                      <p className="text-xs text-slate-400">Pending</p>
                    </div>
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-400">{health.queue.active}</p>
                      <p className="text-xs text-slate-400">Active</p>
                    </div>
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-400">{health.queue.completed}</p>
                      <p className="text-xs text-slate-400">Completed</p>
                    </div>
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-2xl font-bold text-red-400">{health.queue.failed}</p>
                      <p className="text-xs text-slate-400">Failed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Errors */}
            {health.recentErrors.length > 0 && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  Recent Errors
                </h3>
                <div className="space-y-2">
                  {health.recentErrors.map((error, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-red-900/20 border border-red-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <XCircle className="w-4 h-4 text-red-400" />
                        <div>
                          <p className="text-sm text-white">{error.message}</p>
                          <p className="text-xs text-slate-400">{error.service}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-red-400">{error.count}x</p>
                        <p className="text-xs text-slate-500">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-400 mb-4" />
            <p className="text-white font-medium mb-2">Unable to Load Health Data</p>
            <p className="text-slate-400 mb-4">There was an issue connecting to the health monitoring system.</p>
            <button
              onClick={loadHealth}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
