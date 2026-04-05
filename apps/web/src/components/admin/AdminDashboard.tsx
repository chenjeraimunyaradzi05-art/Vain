'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';

/**
 * AdminDashboard - Platform administration panel
 * 
 * Features:
 * - User management
 * - Content moderation
 * - Analytics overview
 * - System health monitoring
 * - Feature flags management
 */

interface DashboardStats {
  users: {
    total: number;
    active: number;
    new: number;
    candidates: number;
    employers: number;
    indigenous: number;
  };
  jobs: {
    total: number;
    active: number;
    new: number;
    applications: number;
    filled: number;
  };
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    avgSessionDuration: string;
    bounceRate: number;
  };
  content: {
    pendingModeration: number;
    flaggedContent: number;
    reports: number;
  };
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'candidate' | 'employer' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'pending' | 'banned';
  isIndigenous: boolean;
  createdAt: string;
  lastLoginAt: string;
  verified: boolean;
}

interface ModerationItem {
  id: string;
  type: 'profile' | 'job' | 'message' | 'comment' | 'review';
  contentPreview: string;
  reportedBy: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    name: string;
    status: 'up' | 'degraded' | 'down';
    latency: number;
    uptime: number;
  }[];
  recentErrors: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
}

interface ActivityLog {
  id: string;
  action: string;
  user: string;
  target?: string;
  timestamp: string;
  ip: string;
  details?: string;
}

// API functions
const adminApi = {
  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/admin/stats', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getUsers(page: number, filters?: Record<string, string>): Promise<{ users: User[]; total: number }> {
    const params = new URLSearchParams({ page: page.toString(), ...filters });
    const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  async getModerationQueue(): Promise<{ items: ModerationItem[] }> {
    const res = await fetch('/api/admin/moderation', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch moderation queue');
    return res.json();
  },

  async moderateItem(id: string, action: 'approve' | 'reject' | 'escalate', reason?: string): Promise<void> {
    const res = await fetch(`/api/admin/moderation/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action, reason }),
    });
    if (!res.ok) throw new Error('Failed to moderate item');
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const res = await fetch('/api/admin/health', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
  },

  async getActivityLog(page: number): Promise<{ logs: ActivityLog[]; total: number }> {
    const res = await fetch(`/api/admin/activity?page=${page}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch activity');
    return res.json();
  },
};

// Stats Card
function StatCard({
  title,
  value,
  change,
  icon,
  color,
}: {
  title: string;
  value: number | string;
  change?: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`p-2 rounded-lg ${color}`}>{icon}</span>
        {change !== undefined && (
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="text-sm text-gray-500">{title}</div>
    </div>
  );
}

// User Management Table
function UserTable({
  users,
  onUpdateStatus,
  onViewUser,
}: {
  users: User[];
  onUpdateStatus: (id: string, status: User['status']) => void;
  onViewUser: (user: User) => void;
}) {
  const statusConfig = {
    active: { label: 'Active', color: 'bg-green-100 text-green-700' },
    suspended: { label: 'Suspended', color: 'bg-yellow-100 text-yellow-700' },
    pending: { label: 'Pending', color: 'bg-blue-100 text-blue-700' },
    banned: { label: 'Banned', color: 'bg-red-100 text-red-700' },
  };

  const roleConfig = {
    candidate: { label: 'Candidate', color: 'bg-gray-100 text-gray-700' },
    employer: { label: 'Employer', color: 'bg-purple-100 text-purple-700' },
    admin: { label: 'Admin', color: 'bg-red-100 text-red-700' },
    moderator: { label: 'Moderator', color: 'bg-orange-100 text-orange-700' },
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">User</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Last Login</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {user.firstName} {user.lastName}
                      </span>
                      {user.isIndigenous && <span title="Indigenous">🪶</span>}
                      {user.verified && <span className="text-blue-500" title="Verified">✓</span>}
                    </div>
                    <span className="text-sm text-gray-500">{user.email}</span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleConfig[user.role].color}`}>
                  {roleConfig[user.role].label}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusConfig[user.status].color}`}>
                  {statusConfig[user.status].label}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-gray-500">
                {new Date(user.lastLoginAt).toLocaleDateString('en-AU')}
              </td>
              <td className="py-3 px-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewUser(user)}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View
                  </button>
                  <select
                    value={user.status}
                    onChange={(e) => onUpdateStatus(user.id, e.target.value as User['status'])}
                    className="text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspend</option>
                    <option value="banned">Ban</option>
                  </select>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Moderation Queue
function ModerationQueue({
  items,
  onModerate,
}: {
  items: ModerationItem[];
  onModerate: (id: string, action: 'approve' | 'reject' | 'escalate') => void;
}) {
  const priorityConfig = {
    low: { color: 'text-gray-500' },
    medium: { color: 'text-blue-500' },
    high: { color: 'text-orange-500' },
    urgent: { color: 'text-red-500' },
  };

  const typeConfig = {
    profile: '👤',
    job: '💼',
    message: '💬',
    comment: '💭',
    review: '⭐',
  };

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <span className="text-4xl">✓</span>
          <p className="mt-2">No items pending moderation</p>
        </div>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{typeConfig[item.type]}</span>
                  <span className={`text-sm font-medium ${priorityConfig[item.priority].color}`}>
                    {item.priority.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString('en-AU')}
                  </span>
                </div>
                <p className="text-gray-900 dark:text-white mb-1">{item.contentPreview}</p>
                <p className="text-sm text-gray-500">
                  <strong>Reason:</strong> {item.reason}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onModerate(item.id, 'approve')}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                  title="Approve"
                >
                  ✓
                </button>
                <button
                  onClick={() => onModerate(item.id, 'reject')}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  title="Reject"
                >
                  ✕
                </button>
                <button
                  onClick={() => onModerate(item.id, 'escalate')}
                  className="p-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg"
                  title="Escalate"
                >
                  ⚠
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// System Health Monitor
function SystemHealthMonitor({ health }: { health: SystemHealth }) {
  const statusConfig = {
    healthy: { label: 'Healthy', color: 'bg-green-100 text-green-700', icon: '✓' },
    degraded: { label: 'Degraded', color: 'bg-yellow-100 text-yellow-700', icon: '⚠' },
    down: { label: 'Down', color: 'bg-red-100 text-red-700', icon: '✕' },
  };

  const serviceStatusConfig = {
    up: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  };

  const config = statusConfig[health.status];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{health.cpuUsage}%</div>
          <div className="text-sm text-gray-500">CPU</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{health.memoryUsage}%</div>
          <div className="text-sm text-gray-500">Memory</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{health.activeConnections}</div>
          <div className="text-sm text-gray-500">Connections</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{health.recentErrors}</div>
          <div className="text-sm text-gray-500">Errors (24h)</div>
        </div>
      </div>

      {/* Services */}
      <div className="space-y-2">
        {health.services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${serviceStatusConfig[service.status]}`} />
              <span className="font-medium text-gray-900 dark:text-white">{service.name}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{service.latency}ms</span>
              <span>{service.uptime}% uptime</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Activity Log
function ActivityLogSection({ logs }: { logs: ActivityLog[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
      
      <div className="space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <span className="text-gray-400 text-lg">📋</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-white">
                <strong>{log.user}</strong> {log.action}
                {log.target && <span className="text-blue-600"> {log.target}</span>}
              </p>
              {log.details && (
                <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(log.timestamp).toLocaleString('en-AU')} • {log.ip}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick Actions
function QuickActions() {
  const actions = [
    { label: 'Send Announcement', icon: '📢', action: () => {} },
    { label: 'Export Data', icon: '📊', action: () => {} },
    { label: 'System Backup', icon: '💾', action: () => {} },
    { label: 'Clear Cache', icon: '🗑️', action: () => {} },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.action}
            className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="text-2xl mb-2 block">{action.icon}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Main Component
export function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'moderation' | 'system'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [moderationItems, setModerationItems] = useState<ModerationItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, modRes, healthRes, logsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(1),
        adminApi.getModerationQueue(),
        adminApi.getSystemHealth(),
        adminApi.getActivityLog(1),
      ]);
      setStats(statsRes);
      setUsers(usersRes.users);
      setModerationItems(modRes.items);
      setSystemHealth(healthRes);
      setActivityLogs(logsRes.logs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateUserStatus = async (id: string, status: User['status']) => {
    try {
      const updated = await adminApi.updateUser(id, { status });
      setUsers(users.map(u => u.id === id ? updated : u));
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const handleModerate = async (id: string, action: 'approve' | 'reject' | 'escalate') => {
    try {
      await adminApi.moderateItem(id, action);
      setModerationItems(moderationItems.filter(i => i.id !== id));
    } catch (error) {
      console.error('Failed to moderate:', error);
    }
  };

  if (isLoading || !stats || !systemHealth) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform administration and monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>Refresh</Button>
          <Button>Generate Report</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: 'overview', label: 'Overview' },
          { key: 'users', label: 'Users' },
          { key: 'moderation', label: `Moderation (${moderationItems.length})` },
          { key: 'system', label: 'System' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid md:grid-cols-4 gap-4">
            <StatCard title="Total Users" value={stats.users.total} change={12} icon="👥" color="bg-blue-100" />
            <StatCard title="Active Jobs" value={stats.jobs.active} change={8} icon="💼" color="bg-green-100" />
            <StatCard title="Applications" value={stats.jobs.applications} change={15} icon="📝" color="bg-purple-100" />
            <StatCard title="Indigenous Users" value={stats.users.indigenous} change={5} icon="🪶" color="bg-orange-100" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Engagement */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Engagement</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Daily Active Users</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.engagement.dailyActiveUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Weekly Active Users</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.engagement.weeklyActiveUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg Session</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.engagement.avgSessionDuration}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bounce Rate</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.engagement.bounceRate}%</span>
                </div>
              </div>
            </div>

            {/* Content Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Pending Moderation</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    {stats.content.pendingModeration}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Flagged Content</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                    {stats.content.flaggedContent}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">User Reports</span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                    {stats.content.reports}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActions />
          </div>

          {/* Activity Log */}
          <ActivityLogSection logs={activityLogs} />
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">User Management</h3>
              <div className="flex gap-2">
                <input
                  type="search"
                  placeholder="Search users..."
                  className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
                <Button variant="outline">Export</Button>
              </div>
            </div>
          </div>
          <UserTable
            users={users}
            onUpdateStatus={handleUpdateUserStatus}
            onViewUser={() => {}}
          />
        </div>
      )}

      {/* Moderation Tab */}
      {activeTab === 'moderation' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Moderation Queue</h3>
            <div className="flex gap-2">
              <select className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="all">All Types</option>
                <option value="profile">Profiles</option>
                <option value="job">Jobs</option>
                <option value="message">Messages</option>
              </select>
              <select className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
              </select>
            </div>
          </div>
          <ModerationQueue items={moderationItems} onModerate={handleModerate} />
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          <SystemHealthMonitor health={systemHealth} />
          <ActivityLogSection logs={activityLogs} />
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
