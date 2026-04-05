'use client';

/**
 * Admin User Management Page
 * 
 * Comprehensive user management with search, filters, bulk actions,
 * and detailed user views.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Ban,
  UserCheck,
  Trash2,
  Mail,
  Shield,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  GraduationCap,
  Star,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'member' | 'company' | 'tafe' | 'admin' | 'mentor';
  status: 'active' | 'suspended' | 'pending' | 'deleted';
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
  avatar?: string;
}

interface Filters {
  search: string;
  userType: string;
  status: string;
  verified: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useUIStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [filters, setFilters] = useState<Filters>({
    search: searchParams.get('search') || '',
    userType: searchParams.get('type') || '',
    status: searchParams.get('status') || '',
    verified: searchParams.get('verified') || '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.userType) params.append('userType', filters.userType);
      if (filters.status) params.append('status', filters.status);
      if (filters.verified) params.append('verified', filters.verified);
      params.append('sort', filters.sortBy);
      params.append('order', filters.sortOrder);
      params.append('page', String(page));
      params.append('limit', '20');

      const { ok, data } = await api<{
        users: User[];
        total: number;
        pages: number;
      }>(`/admin/users?${params.toString()}`);

      if (ok && data) {
        setUsers(data.users || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.pages || 1);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkAction = async (action: 'suspend' | 'activate' | 'delete' | 'verify') => {
    if (selectedUsers.length === 0) return;

    try {
      const { ok } = await api('/admin/users/bulk', {
        method: 'POST',
        body: { userIds: selectedUsers, action },
      });

      if (ok) {
        showToast({
          type: 'success',
          title: 'Success',
          message: `${selectedUsers.length} users ${action}d successfully`,
        });
        setSelectedUsers([]);
        loadUsers();
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to perform bulk action',
      });
    }
  };

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const { ok } = await api(`/admin/users/${userId}/${action}`, {
        method: 'POST',
      });

      if (ok) {
        showToast({
          type: 'success',
          title: 'Success',
          message: `User ${action}d successfully`,
        });
        loadUsers();
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: `Failed to ${action} user`,
      });
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'company': return <Building2 className="w-4 h-4" />;
      case 'tafe': return <GraduationCap className="w-4 h-4" />;
      case 'mentor': return <Star className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { bg: 'bg-green-900/50', text: 'text-green-400', icon: CheckCircle },
      suspended: { bg: 'bg-red-900/50', text: 'text-red-400', icon: Ban },
      pending: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', icon: Clock },
      deleted: { bg: 'bg-slate-700', text: 'text-slate-400', icon: XCircle },
    }[status] || { bg: 'bg-slate-700', text: 'text-slate-400', icon: Clock };

    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const summary = useMemo(() => {
    const total = totalCount || users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const pending = users.filter((u) => u.status === 'pending').length;
    const suspended = users.filter((u) => u.status === 'suspended').length;
    const verified = users.filter((u) => u.isVerified).length;
    return { total, active, pending, suspended, verified };
  }, [users, totalCount]);

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-white">User Management</h1>
              <span className="text-sm text-slate-400">
                {totalCount.toLocaleString()} users
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 text-slate-300 hover:text-white flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 mb-6">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Admin</p>
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <p className="text-sm text-slate-400 mt-1">Search, verify, and manage platform accounts.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-lg font-semibold text-white">{summary.total.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">Active</p>
                <p className="text-lg font-semibold text-white">{summary.active.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-lg font-semibold text-white">{summary.pending.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">Suspended</p>
                <p className="text-lg font-semibold text-white">{summary.suspended.toLocaleString()}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2">
                <p className="text-xs text-slate-500">Verified</p>
                <p className="text-lg font-semibold text-white">{summary.verified.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search by name, email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500"
              />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <select
                value={filters.userType}
                onChange={(e) => handleFilterChange('userType', e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              >
                <option value="">All Types</option>
                <option value="member">Members</option>
                <option value="company">Companies</option>
                <option value="tafe">TAFE</option>
                <option value="mentor">Mentors</option>
                <option value="admin">Admins</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>

              <select
                value={filters.verified}
                onChange={(e) => handleFilterChange('verified', e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Unverified</option>
              </select>

              <button
                onClick={loadUsers}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-4">
              <span className="text-sm text-slate-400">
                {selectedUsers.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-1"
                >
                  <UserCheck className="w-4 h-4" />
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('suspend')}
                  className="px-3 py-1.5 text-sm bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg flex items-center gap-1"
                >
                  <Ban className="w-4 h-4" />
                  Suspend
                </button>
                <button
                  onClick={() => handleBulkAction('verify')}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Verify
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-slate-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Joined</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">Last Active</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="rounded border-slate-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center">
                          {user.avatar ? (
                            <OptimizedImage src={toCloudinaryAutoUrl(user.avatar)} alt={`${user.firstName} ${user.lastName}`} width={40} height={40} className="w-full h-full rounded-full" />
                          ) : (
                            <span className="text-purple-300 font-medium">
                              {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-slate-400">{user.email}</p>
                        </div>
                        {user.isVerified && (
                          <CheckCircle className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-sm text-slate-300">
                        {getUserTypeIcon(user.userType)}
                        {user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {user.lastLogin 
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => router.push(`/admin/users/${user.id}`)}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUserAction(user.id, user.status === 'suspended' ? 'activate' : 'suspend')}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                          title={user.status === 'suspended' ? 'Activate' : 'Suspend'}
                        >
                          {user.status === 'suspended' ? (
                            <UserCheck className="w-4 h-4" />
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                          title="More"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
