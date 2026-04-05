'use client';

/**
 * Admin Security Dashboard
 * Monitor security events, audit logs, sessions, 2FA adoption, alerts, and maintenance mode
 */

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/apiBase';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';
import {
  Shield,
  AlertTriangle,
  Users,
  Activity,
  Clock,
  Monitor,
  Lock,
  Unlock,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Search,
  Filter,
  Download,
  Eye,
  UserX,
  Smartphone,
  Key,
  Bell,
  Wrench,
  CheckCircle,
  XCircle,
  Calendar
} from 'lucide-react';

const API_URL = API_BASE;

export default function AdminSecurityPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState([]);
  const [usersWithout2FA, setUsersWithout2FA] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState(null);
  const [maintenance, setMaintenance] = useState({ active: false, config: {} });
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState(null);
  
  // Maintenance form state
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [maintenanceEndTime, setMaintenanceEndTime] = useState('');

  // Fetch security data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Fetch in parallel
        const [overviewRes, logsRes, suspiciousRes, users2FARes, alertsRes, maintenanceRes] = await Promise.allSettled([
          fetch(`${API_URL}/security/admin/overview`, { headers }),
          fetch(`${API_URL}/security/admin/audit-logs?limit=20`, { headers }),
          fetch(`${API_URL}/security/admin/suspicious-activity`, { headers }),
          fetch(`${API_URL}/security/admin/users-without-2fa?limit=20`, { headers }),
          fetch(`${API_URL}/security/admin/alerts`, { headers }),
          fetch(`${API_URL}/security/admin/maintenance`, { headers })
        ]);
        
        if (overviewRes.status === 'fulfilled' && overviewRes.value.ok) {
          setOverview(await overviewRes.value.json());
        }
        
        if (logsRes.status === 'fulfilled' && logsRes.value.ok) {
          const logsData = await logsRes.value.json();
          setAuditLogs(logsData.logs || []);
        }
        
        if (suspiciousRes.status === 'fulfilled' && suspiciousRes.value.ok) {
          const susData = await suspiciousRes.value.json();
          setSuspiciousActivity(susData.reports || []);
        }
        
        if (users2FARes.status === 'fulfilled' && users2FARes.value.ok) {
          const usersData = await users2FARes.value.json();
          setUsersWithout2FA(usersData.users || []);
        }
        
        if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
          const alertsData = await alertsRes.value.json();
          setAlerts(alertsData.alerts || []);
          setAlertStats(alertsData.stats || null);
        }
        
        if (maintenanceRes.status === 'fulfilled' && maintenanceRes.value.ok) {
          const maintenanceData = await maintenanceRes.value.json();
          setMaintenance(maintenanceData);
        }
      } catch (err) {
        setError('Failed to load security data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    if (token) {
      fetchData();
    }
  }, [token]);

  // Cleanup expired sessions
  async function handleCleanupSessions() {
    try {
      const res = await fetch(`${API_URL}/security/admin/cleanup-sessions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      alert('Failed to cleanup sessions');
    }
  }
  
  // Acknowledge an alert
  async function handleAcknowledgeAlert(alertId) {
    try {
      await fetch(`${API_URL}/security/admin/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, acknowledged: true } : a
      ));
    } catch (err) {
      alert('Failed to acknowledge alert');
    }
  }
  
  // Enable maintenance mode
  async function handleEnableMaintenance() {
    try {
      const res = await fetch(`${API_URL}/security/admin/maintenance/enable`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: maintenanceMessage || 'System is undergoing scheduled maintenance',
          endTime: maintenanceEndTime || undefined
        })
      });
      
      if (res.ok) {
        setMaintenance({ active: true, config: { enabled: true, message: maintenanceMessage } });
        alert('Maintenance mode enabled');
      }
    } catch (err) {
      alert('Failed to enable maintenance mode');
    }
  }
  
  // Disable maintenance mode
  async function handleDisableMaintenance() {
    try {
      const res = await fetch(`${API_URL}/security/admin/maintenance/disable`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        setMaintenance({ active: false, config: { enabled: false } });
        alert('Maintenance mode disabled');
      }
    } catch (err) {
      alert('Failed to disable maintenance mode');
    }
  }

  // Format relative time
  function formatRelativeTime(date) {
    if (!date) return 'N/A';
    const now = new Date();
    const d = new Date(date);
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  }

  // Severity badge color
  function getSeverityColor(severity) {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-600 text-white';
      case 'MEDIUM': return 'bg-yellow-600 text-black';
      default: return 'bg-slate-600 text-white';
    }
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
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link href="/admin" className="text-xs text-purple-300 hover:text-purple-200 mb-3 inline-flex items-center gap-2">
                ← Back to Admin
              </Link>
              <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-3">
                <Shield className="w-7 h-7 text-purple-400" />
                Security Dashboard
              </h1>
              <p className="text-slate-400 mt-2 max-w-2xl">
                Monitor security events, session health, alerts, and authentication posture.
              </p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-4">
                <span className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700">
                  Alerts pending: {alerts.filter(a => !a.acknowledged).length}
                </span>
                <span className={`px-2.5 py-1 rounded-full border ${maintenance.active ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' : 'bg-slate-800/70 border-slate-700 text-slate-300'}`}>
                  Maintenance: {maintenance.active ? 'Active' : 'Normal'}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCleanupSessions}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Cleanup Sessions
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 mb-6 text-red-300">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Active Sessions</p>
                <p className="text-2xl font-semibold mt-1">
                  {overview?.sessions?.activeSessions || 0}
                </p>
              </div>
              <Monitor className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {overview?.sessions?.totalSessions || 0} total sessions
            </p>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Failed Logins (24h)</p>
                <p className="text-2xl font-semibold mt-1 text-orange-400">
                  {overview?.security?.failedLogins24h || 0}
                </p>
              </div>
              <UserX className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Last 24 hours
            </p>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Suspicious Activity</p>
                <p className="text-2xl font-semibold mt-1 text-red-400">
                  {overview?.security?.suspiciousActivity7d || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Last 7 days
            </p>
          </div>
          
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">2FA Adoption</p>
                <p className="text-2xl font-semibold mt-1 text-green-400">
                  {overview?.twoFactor?.adoptionRate || 0}%
                </p>
              </div>
              <Smartphone className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {overview?.twoFactor?.enabledCount || 0} of {overview?.twoFactor?.totalUsers || 0} users
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'logs', label: 'Audit Logs', icon: Eye },
            { id: 'suspicious', label: 'Suspicious Activity', icon: AlertTriangle },
            { id: '2fa', label: '2FA Status', icon: Lock },
            { id: 'alerts', label: 'Security Alerts', icon: Bell, badge: alerts.filter(a => !a.acknowledged).length },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench, active: maintenance.active }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                activeTab === tab.id 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                  {tab.badge}
                </span>
              )}
              {tab.active && (
                <span className="bg-yellow-500 text-black text-xs rounded-full px-1.5 py-0.5">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Devices */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-blue-400" />
                Active Sessions by Device
              </h3>
              <div className="space-y-3">
                {overview?.sessions?.topDevices?.map((device, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <span className="text-sm">{device.device}</span>
                    <span className="text-sm font-medium">{device.count} sessions</span>
                  </div>
                )) || (
                  <p className="text-slate-500 text-sm">No session data available</p>
                )}
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                Recent Security Events
              </h3>
              <div className="space-y-3">
                {auditLogs.slice(0, 5).map((log, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(log.severity)}`}>
                        {log.event}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>
                )) || (
                  <p className="text-slate-500 text-sm">No recent events</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Audit Logs</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                    <th className="pb-3">Event</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Severity</th>
                    <th className="pb-3">IP Address</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {auditLogs.map((log, i) => (
                    <tr key={i} className="text-sm">
                      <td className="py-3">{log.event}</td>
                      <td className="py-3 text-slate-400">{log.category}</td>
                      <td className="py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-xs">{log.ipAddress || '-'}</td>
                      <td className="py-3 text-slate-400">{formatRelativeTime(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLogs.length === 0 && (
                <p className="text-center text-slate-500 py-8">No audit logs available</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'suspicious' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Suspicious Activity Reports (Last 7 Days)
            </h3>
            <div className="space-y-4">
              {suspiciousActivity.map((report, i) => (
                <div key={i} className="p-4 bg-red-900/10 border border-red-800/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {report.userId ? `User: ${report.userId}` : `IP: ${report.ipAddress}`}
                    </span>
                    <span className="text-sm text-red-400">{report.count} incidents</span>
                  </div>
                  <div className="text-sm text-slate-400">
                    {report.incidents?.slice(0, 3).map((inc, j) => (
                      <div key={j} className="flex justify-between">
                        <span>{inc.metadata?.reason || 'Suspicious pattern'}</span>
                        <span>{formatRelativeTime(inc.timestamp)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {suspiciousActivity.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-slate-400">No suspicious activity detected</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === '2fa' && (
          <div className="bg-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              Users Without 2FA
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Consider reaching out to these users to encourage 2FA adoption
            </p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                    <th className="pb-3">User</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Last Login</th>
                    <th className="pb-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {usersWithout2FA.map((user, i) => (
                    <tr key={i} className="text-sm">
                      <td className="py-3">
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded capitalize">
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{formatRelativeTime(user.lastLoginAt)}</td>
                      <td className="py-3 text-slate-400">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usersWithout2FA.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-slate-400">All users have 2FA enabled! 🎉</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Alerts Stats */}
            {alertStats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="text-2xl font-bold">{alertStats.total || 0}</p>
                      <p className="text-sm text-slate-400">Total Alerts</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-400">{alertStats.unacknowledged || 0}</p>
                      <p className="text-sm text-slate-400">Pending</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-400" />
                    <div>
                      <p className="text-2xl font-bold text-red-400">{alertStats.critical || 0}</p>
                      <p className="text-sm text-slate-400">Critical</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-2xl font-bold text-green-400">{alertStats.acknowledged || 0}</p>
                      <p className="text-sm text-slate-400">Resolved</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alerts List */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-400" />
                Security Alerts
              </h3>
              <div className="space-y-3">
                {alerts.map((alert, i) => (
                  <div 
                    key={alert.id || i} 
                    className={`p-4 rounded-lg border ${
                      alert.acknowledged 
                        ? 'bg-slate-700/30 border-slate-700' 
                        : 'bg-red-900/20 border-red-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(alert.severity)}`}>
                            {alert.severity || 'INFO'}
                          </span>
                          <span className="font-medium">{alert.type || 'Alert'}</span>
                          {alert.acknowledged && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Acknowledged
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-300">{alert.message}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatRelativeTime(alert.timestamp)}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-slate-400">No security alerts</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            {/* Maintenance Status */}
            <div className={`rounded-xl p-6 ${maintenance.active ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-slate-800'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className={`w-8 h-8 ${maintenance.active ? 'text-yellow-400' : 'text-slate-400'}`} />
                  <div>
                    <h3 className="text-lg font-semibold">
                      Maintenance Mode: {maintenance.active ? 'ACTIVE' : 'Inactive'}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {maintenance.active 
                        ? maintenance.config?.message || 'System is under maintenance'
                        : 'System is operating normally'
                      }
                    </p>
                  </div>
                </div>
                {maintenance.active ? (
                  <button
                    onClick={handleDisableMaintenance}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <Unlock className="w-4 h-4" />
                    Disable Maintenance
                  </button>
                ) : (
                  <span className="text-green-400 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    System Online
                  </span>
                )}
              </div>
            </div>

            {/* Enable Maintenance Form */}
            {!maintenance.active && (
              <div className="bg-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-400" />
                  Enable Maintenance Mode
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  When enabled, users will see a maintenance message and most features will be disabled.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Maintenance Message</label>
                    <textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      placeholder="System is undergoing scheduled maintenance. We'll be back shortly."
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm resize-none focus:outline-none focus:border-purple-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Estimated End Time (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={maintenanceEndTime}
                      onChange={(e) => setMaintenanceEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <button
                    onClick={handleEnableMaintenance}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <Wrench className="w-4 h-4" />
                    Enable Maintenance Mode
                  </button>
                </div>
              </div>
            )}

            {/* Maintenance Schedule Info */}
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                Maintenance Best Practices
              </h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-purple-400" />
                  Schedule maintenance during off-peak hours (typically 2-6 AM local time)
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-purple-400" />
                  Notify users at least 24 hours in advance for planned maintenance
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-purple-400" />
                  Always set an estimated end time to keep users informed
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-purple-400" />
                  Admin users can still access the system during maintenance
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
