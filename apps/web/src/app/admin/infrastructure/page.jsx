'use client';

/**
 * Admin Infrastructure Dashboard
 * Monitor system health, cache, queues, backups, and CDN
 */

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/apiBase';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import {
  Server,
  Database,
  HardDrive,
  Activity,
  Cloud,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
  MemoryStick,
  Clock,
  Trash2,
  Download,
  Shield,
  Loader2,
  ChevronRight,
  Box,
  Layers,
  Globe,
  Zap,
  Settings,
  BookOpen
} from 'lucide-react';

const API_URL = API_BASE;

export default function InfrastructurePage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState(null);
  const [cacheStats, setCacheStats] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  const [backups, setBackups] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [cdnStatus, setCdnStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch all data
  useEffect(() => {
    if (token) {
      fetchAllData();
    }
  }, [token]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (autoRefresh && token) {
      const interval = setInterval(fetchAllData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, token]);

  async function fetchAllData() {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [healthRes, cacheRes, queueRes, backupsRes, systemRes, cdnRes] = await Promise.allSettled([
        fetch(`${API_URL}/admin/infrastructure/health`, { headers }),
        fetch(`${API_URL}/admin/infrastructure/cache/stats`, { headers }),
        fetch(`${API_URL}/admin/infrastructure/queues/stats`, { headers }),
        fetch(`${API_URL}/admin/infrastructure/backups`, { headers }),
        fetch(`${API_URL}/admin/infrastructure/system`, { headers }),
        fetch(`${API_URL}/admin/infrastructure/cdn/status`, { headers }),
      ]);

      if (healthRes.status === 'fulfilled' && healthRes.value.ok) {
        setHealth(await healthRes.value.json());
      }
      if (cacheRes.status === 'fulfilled' && cacheRes.value.ok) {
        setCacheStats(await cacheRes.value.json());
      }
      if (queueRes.status === 'fulfilled' && queueRes.value.ok) {
        setQueueStats(await queueRes.value.json());
      }
      if (backupsRes.status === 'fulfilled' && backupsRes.value.ok) {
        const data = await backupsRes.value.json();
        setBackups(data.backups || []);
      }
      if (systemRes.status === 'fulfilled' && systemRes.value.ok) {
        setSystemInfo(await systemRes.value.json());
      }
      if (cdnRes.status === 'fulfilled' && cdnRes.value.ok) {
        setCdnStatus(await cdnRes.value.json());
      }
    } catch (error) {
      console.error('Failed to fetch infrastructure data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action, endpoint, body = null) {
    setActionLoading(action);
    setMessage(null);
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : null,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Action completed' });
        fetchAllData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: data.error || 'Action failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusIcon(status) {
    if (status === 'healthy') return <CheckCircle2 className="w-5 h-5 text-green-400" />;
    if (status === 'degraded' || status === 'fallback') return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  }

  function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="w-6 h-6 text-blue-400" />
              Infrastructure Dashboard
            </h1>
            <p className="text-slate-400">Monitor and manage production infrastructure</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchAllData}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-900/30 border border-green-800 text-green-300'
              : 'bg-red-900/30 border border-red-800 text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            {message.text}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* System Status */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">System Status</span>
              {getStatusIcon(health?.status)}
            </div>
            <div className="text-2xl font-bold capitalize">{health?.status || 'Unknown'}</div>
            <div className="text-xs text-slate-500 mt-1">
              Uptime: {health?.uptime ? formatUptime(health.uptime) : 'N/A'}
            </div>
          </div>

          {/* Database */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Database</span>
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(health?.components?.database?.status)}
              <span className="text-lg font-semibold capitalize">
                {health?.components?.database?.status || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Cache */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Cache</span>
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-lg font-semibold capitalize">
              {cacheStats?.type || 'Unknown'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {cacheStats?.size ? `${cacheStats.size} keys` : 'Connected'}
            </div>
          </div>

          {/* Memory */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Memory</span>
              <MemoryStick className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-lg font-semibold">
              {health?.system?.memory?.heapUsedMB || 0} MB
            </div>
            <div className="text-xs text-slate-500 mt-1">
              of {health?.system?.memory?.heapTotalMB || 0} MB heap
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700 pb-2 overflow-x-auto">
          {['overview', 'cache', 'queues', 'cdn', 'backups', 'system'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Components Status */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                Component Status
              </h2>
              <div className="space-y-3">
                {health?.components && Object.entries(health.components).map(([name, info]) => (
                  <div key={name} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="font-medium capitalize">{name}</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(info?.status)}
                      <span className="text-sm capitalize">{info?.status || 'unknown'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* System Info */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                System Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">Node Version</span>
                  <span>{health?.system?.nodeVersion || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">Platform</span>
                  <span>{health?.system?.platform || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">Heap Used</span>
                  <span>{health?.system?.memory?.heapUsedMB || 0} MB</span>
                </div>
                <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-400">RSS Memory</span>
                  <span>{health?.system?.memory?.rssMB || 0} MB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cache' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Cache Management
              </h2>
              <button
                onClick={() => handleAction('flush-cache', '/admin/infrastructure/cache/flush')}
                disabled={actionLoading === 'flush-cache'}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'flush-cache' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Flush Cache
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Type</div>
                <div className="text-xl font-semibold capitalize">{cacheStats?.type || 'Unknown'}</div>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Keys</div>
                <div className="text-xl font-semibold">{cacheStats?.size || 0}</div>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-lg">
                <div className="text-sm text-slate-400 mb-1">Status</div>
                <div className="text-xl font-semibold text-green-400">Connected</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'queues' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Box className="w-5 h-5 text-purple-400" />
              Job Queues
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {queueStats && Object.entries(queueStats).map(([name, stats]) => (
                <div key={name} className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-lg font-semibold capitalize mb-3">{name}</div>
                  {stats ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Waiting</span>
                        <span>{stats.waiting || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Active</span>
                        <span className="text-blue-400">{stats.active || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Completed</span>
                        <span className="text-green-400">{stats.completed || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Failed</span>
                        <span className="text-red-400">{stats.failed || 0}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-500">Not configured</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cdn' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                CDN Configuration
              </h2>
              <button
                onClick={() => handleAction('purge-cdn', '/admin/infrastructure/cdn/purge', { paths: ['/*'] })}
                disabled={actionLoading === 'purge-cdn'}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === 'purge-cdn' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Purge All Cache
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-slate-300">Configuration</h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Provider</span>
                    <span className="capitalize">{cdnStatus?.provider || 'Not configured'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Enabled</span>
                    <span>{cdnStatus?.enabled ? '✓ Yes' : '✗ No'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Static URL</span>
                    <span className="font-mono text-sm truncate max-w-48">{cdnStatus?.urls?.static || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Media URL</span>
                    <span className="font-mono text-sm truncate max-w-48">{cdnStatus?.urls?.media || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-slate-300">Cache Rules</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Static Assets</div>
                    <div className="font-mono text-xs">max-age=31536000, immutable</div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">Images</div>
                    <div className="font-mono text-xs">max-age=86400, stale-while-revalidate</div>
                  </div>
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="text-sm text-slate-400 mb-1">API Responses</div>
                    <div className="font-mono text-xs">no-cache, private</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-400" />
              System Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-medium text-slate-300">Node.js</h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Version</span>
                    <span className="font-mono">{systemInfo?.node?.version || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Environment</span>
                    <span className="capitalize">{systemInfo?.node?.env || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Process ID</span>
                    <span>{systemInfo?.node?.pid || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Uptime</span>
                    <span>{systemInfo?.node?.uptime ? formatUptime(systemInfo.node.uptime) : 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium text-slate-300">Operating System</h3>
                <div className="space-y-3">
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Platform</span>
                    <span className="capitalize">{systemInfo?.os?.platform || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Architecture</span>
                    <span>{systemInfo?.os?.arch || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">CPUs</span>
                    <span>{systemInfo?.os?.cpus || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-slate-400">Memory</span>
                    <span>{systemInfo?.os?.freeMemoryMB || 0} / {systemInfo?.os?.totalMemoryMB || 0} MB</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <h3 className="font-medium text-slate-300">Load Average</h3>
                <div className="grid grid-cols-3 gap-4">
                  {(systemInfo?.os?.loadAvg || [0, 0, 0]).map((load, i) => (
                    <div key={i} className="p-4 bg-slate-700/30 rounded-lg text-center">
                      <div className="text-2xl font-bold">{load.toFixed(2)}</div>
                      <div className="text-sm text-slate-400">{i === 0 ? '1 min' : i === 1 ? '5 min' : '15 min'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backups' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-green-400" />
                Database Backups
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('cleanup-backups', '/admin/infrastructure/backups/cleanup')}
                  disabled={actionLoading === 'cleanup-backups'}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'cleanup-backups' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Cleanup Old
                </button>
                <button
                  onClick={() => handleAction('create-backup', '/admin/infrastructure/backups/create', { type: 'full' })}
                  disabled={actionLoading === 'create-backup'}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'create-backup' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Create Backup
                </button>
              </div>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No backups found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                      <th className="pb-3 font-medium">Filename</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Size</th>
                      <th className="pb-3 font-medium">Created</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.filename} className="border-b border-slate-700/50">
                        <td className="py-3 font-mono text-sm">{backup.filename}</td>
                        <td className="py-3 capitalize">{backup.type}</td>
                        <td className="py-3">{backup.sizeMB} MB</td>
                        <td className="py-3 text-sm text-slate-400">
                          {new Date(backup.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3">
                          <button
                            onClick={() => handleAction(`verify-${backup.filename}`, `/admin/infrastructure/backups/verify/${backup.filename}`)}
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            Verify
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link 
            href="/admin/security"
            className="flex items-center justify-between p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <span>Security Dashboard</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
          <Link 
            href="/admin/analytics"
            className="flex items-center justify-between p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-400" />
              <span>Analytics</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
          <Link 
            href="/admin"
            className="flex items-center justify-between p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-blue-400" />
              <span>Admin Dashboard</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
