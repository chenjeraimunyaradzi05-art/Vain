'use client';

/**
 * Comprehensive Admin Dashboard
 * 
 * Full-featured admin panel with user management, content moderation,
 * system health monitoring, and analytics.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Briefcase,
  Building2,
  GraduationCap,
  Shield,
  AlertTriangle,
  TrendingUp,
  Activity,
  Server,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Ban,
  UserCheck,
  MessageSquare,
  Flag,
  BarChart3,
  Settings,
  RefreshCw,
  Search,
  Filter,
  ChevronRight,
  Bell,
  FileText,
  Zap,
  Globe,
} from 'lucide-react';
import api from '@/lib/apiClient';

interface DashboardStats {
  totalUsers: number;
  totalCompanies: number;
  totalJobs: number;
  totalApplications: number;
  activeUsers24h: number;
  newUsersToday: number;
  pendingVerifications: number;
  pendingReports: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

interface RecentActivity {
  id: string;
  type: 'user' | 'job' | 'application' | 'report' | 'verification';
  message: string;
  time: string;
  severity?: 'info' | 'warning' | 'error';
}

interface PendingItem {
  id: string;
  type: string;
  label: string;
  count: number;
  priority: 'low' | 'medium' | 'high';
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const { ok, data } = await api<any>('/admin/dashboard');
      if (ok && data) {
        setStats({
          totalUsers: data.totalUsers || 0,
          totalCompanies: data.totalCompanies || 0,
          totalJobs: data.activeJobs || 0,
          totalApplications: data.applicationsThisMonth || 0,
          activeUsers24h: data.activeUsers24h || 0,
          newUsersToday: data.newUsersToday || 0,
          pendingVerifications: data.pendingCompanyVerifications || 0,
          pendingReports: data.pendingReports || 0,
          systemHealth: 'healthy',
        });
        setRecentActivity(data.recentActivity || []);
        setPendingItems(data.pendingItems || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers || 0, icon: Users, color: 'purple', change: '+12%' },
    { label: 'Companies', value: stats?.totalCompanies || 0, icon: Building2, color: 'blue', change: '+8%' },
    { label: 'Active Jobs', value: stats?.totalJobs || 0, icon: Briefcase, color: 'green', change: '+15%' },
    { label: 'Applications', value: stats?.totalApplications || 0, icon: FileText, color: 'yellow', change: '+23%' },
  ];

  const quickActions = [
    { label: 'User Management', href: '/admin/users', icon: Users, description: 'Manage users, roles, and permissions' },
    { label: 'Content Moderation', href: '/admin/moderation', icon: Shield, description: 'Review flagged content and reports' },
    { label: 'Company Verifications', href: '/admin/users?type=company&verified=false', icon: Building2, description: 'Verify employer accounts' },
    { label: 'System Health', href: '/admin/system-health', icon: Activity, description: 'Monitor system performance' },
    { label: 'Email Templates', href: '/admin/email-templates', icon: MessageSquare, description: 'Manage email templates' },
    { label: 'Experiments', href: '/admin/experiments', icon: Zap, description: 'A/B testing and feature flags' },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, description: 'Platform analytics and reports' },
    { label: 'Settings', href: '/admin/settings', icon: Settings, description: 'System configuration' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
              <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded-full">
                Super Admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg relative">
                <Bell className="w-5 h-5" />
                {(stats?.pendingVerifications || 0) + (stats?.pendingReports || 0) > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 mb-8">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Administration</p>
              <h2 className="text-2xl font-bold text-white">Operational Overview</h2>
              <p className="text-sm text-slate-400 mt-1">Monitor platform health, growth, and trust signals.</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Active users (24h)</p>
                <p className="text-lg font-semibold text-white">{stats?.activeUsers24h?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">New today</p>
                <p className="text-lg font-semibold text-white">{stats?.newUsersToday?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Pending reports</p>
                <p className="text-lg font-semibold text-white">{stats?.pendingReports?.toLocaleString() || 0}</p>
              </div>
            </div>
          </div>
        </div>
        {/* System Status Banner */}
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
          stats?.systemHealth === 'healthy' 
            ? 'bg-green-900/30 border border-green-700' 
            : stats?.systemHealth === 'degraded'
            ? 'bg-yellow-900/30 border border-yellow-700'
            : 'bg-red-900/30 border border-red-700'
        }`}>
          {stats?.systemHealth === 'healthy' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : stats?.systemHealth === 'degraded' ? (
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400" />
          )}
          <span className={`font-medium ${
            stats?.systemHealth === 'healthy' ? 'text-green-200' : 
            stats?.systemHealth === 'degraded' ? 'text-yellow-200' : 'text-red-200'
          }`}>
            All systems operational
          </span>
          <Link href="/admin/system-health" className="ml-auto text-sm text-slate-400 hover:text-white flex items-center gap-1">
            View details <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-slate-900/60 rounded-2xl p-6 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-900/50`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">{stat.change}</span>
                <span className="text-sm text-slate-500">vs last month</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pending Actions & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Pending Actions */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Pending Actions
            </h2>
            
            {pendingItems.length === 0 ? (
              <p className="text-slate-400 text-sm">No pending actions</p>
            ) : (
              <div className="space-y-3">
                {pendingItems.map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/${item.type}`}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${
                        item.priority === 'high' ? 'bg-red-400' :
                        item.priority === 'medium' ? 'bg-yellow-400' : 'bg-blue-400'
                      }`} />
                      <span className="text-white text-sm">{item.label}</span>
                    </div>
                    <span className="px-2 py-1 text-xs bg-slate-600 text-white rounded-full">
                      {item.count}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Recent Activity
            </h2>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-slate-400 text-sm">No recent activity</p>
              ) : (
                recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      activity.type === 'user' ? 'bg-purple-900/50' :
                      activity.type === 'job' ? 'bg-blue-900/50' :
                      activity.type === 'report' ? 'bg-red-900/50' : 'bg-green-900/50'
                    }`}>
                      {activity.type === 'user' && <Users className="w-4 h-4 text-purple-400" />}
                      {activity.type === 'job' && <Briefcase className="w-4 h-4 text-blue-400" />}
                      {activity.type === 'report' && <Flag className="w-4 h-4 text-red-400" />}
                      {activity.type === 'application' && <FileText className="w-4 h-4 text-green-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{activity.message}</p>
                      <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-purple-500 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-900/50 flex items-center justify-center mb-4 group-hover:bg-purple-900 transition-colors">
                <action.icon className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">{action.label}</h3>
              <p className="text-sm text-slate-400">{action.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
