'use client';

/**
 * Admin Job Management Page
 * 
 * Comprehensive job management for administrators including
 * job listings, moderation, and analytics.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Briefcase,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Pause,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Calendar,
  DollarSign,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  BarChart3,
  Shield,
  Star,
  Flag,
} from 'lucide-react';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CASUAL' | 'APPRENTICESHIP' | 'TRAINEESHIP';
  salaryMin?: number;
  salaryMax?: number;
  status: 'ACTIVE' | 'CLOSED' | 'DRAFT' | 'SUSPENDED';
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    companyProfile?: {
      companyName: string;
      logo?: string;
      industry?: string;
      verified?: boolean;
    };
  };
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  applicationCount: number;
  viewCount: number;
  isFeatured: boolean;
  isUrgent: boolean;
  tags: string[];
  skills: Array<{
    id: string;
    skill: {
      id: string;
      name: string;
      category: string;
    };
  }>;
}

interface JobStats {
  totalJobs: number;
  activeJobs: number;
  draftJobs: number;
  closedJobs: number;
  suspendedJobs: number;
  featuredJobs: number;
  urgentJobs: number;
  totalApplications: number;
  totalViews: number;
  avgSalary: number;
  popularLocations: Array<{
    location: string;
    count: number;
  }>;
  popularTypes: Array<{
    type: string;
    count: number;
  }>;
}

export default function AdminJobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showNotification } = useUIStore();

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Load jobs and stats
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load stats
      const statsResponse = await api<any>('/admin/jobs/stats');
      if (statsResponse.ok) {
        setStats(statsResponse.data);
      }

      // Load jobs
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        type: typeFilter !== 'all' ? typeFilter : '',
        sortBy,
        sortOrder,
      });

      const jobsResponse = await api<any>(`/admin/jobs?${params.toString()}`);
      if (jobsResponse.ok) {
        setJobs(jobsResponse.data.jobs || []);
        setTotalCount(jobsResponse.data.total || 0);
      }
    } catch (error) {
      console.error('Error loading job data:', error);
      showNotification('Failed to load job data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, statusFilter, typeFilter, sortBy, sortOrder, currentPage, pageSize, showNotification]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handle bulk actions
  const handleSelectAll = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(job => job.id)));
    }
  };

  const handleSelectJob = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleBulkAction = async (action: 'suspend' | 'activate' | 'delete' | 'feature' | 'unfeature') => {
    if (selectedJobs.size === 0) return;

    try {
      const response = await api(`/admin/jobs/bulk`, {
        method: 'POST',
        body: JSON.stringify({
          jobIds: Array.from(selectedJobs),
          action,
        }),
      });

      if (response.ok) {
        showNotification(`${action} completed successfully`, 'success');
        setSelectedJobs(new Set());
        await loadData();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showNotification('Failed to perform bulk action', 'error');
    }
  };

  // Handle individual job actions
  const handleJobAction = async (jobId: string, action: 'suspend' | 'activate' | 'delete' | 'feature' | 'unfeature') => {
    try {
      const response = await api(`/admin/jobs/${jobId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        showNotification(`Job ${action}d successfully`, 'success');
        await loadData();
      }
    } catch (error) {
      console.error('Error performing job action:', error);
      showNotification(`Failed to ${action} job`, 'error');
    }
  };

  // Filter and sort jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    // Apply filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status.toLowerCase() === statusFilter.toLowerCase());
    }
    if (typeFilter !== 'all') {
      filtered = filtered.filter(job => job.employmentType.toLowerCase() === typeFilter.toLowerCase());
    }
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.user.companyProfile?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Job];
      let bValue: any = b[sortBy as keyof Job];

      if (sortBy === 'applicationCount' || sortBy === 'viewCount') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [jobs, statusFilter, typeFilter, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedJobs = filteredAndSortedJobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const statusOptions = [
    { value: 'all', label: 'All Status', count: stats?.totalJobs || 0 },
    { value: 'ACTIVE', label: 'Active', count: stats?.activeJobs || 0 },
    { value: 'DRAFT', label: 'Draft', count: stats?.draftJobs || 0 },
    { value: 'CLOSED', label: 'Closed', count: stats?.closedJobs || 0 },
    { value: 'SUSPENDED', label: 'Suspended', count: stats?.suspendedJobs || 0 },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'FULL_TIME', label: 'Full Time' },
    { value: 'PART_TIME', label: 'Part Time' },
    { value: 'CONTRACT', label: 'Contract' },
    { value: 'CASUAL', label: 'Casual' },
    { value: 'APPRENTICESHIP', label: 'Apprenticeship' },
    { value: 'TRAINEESHIP', label: 'Traineeship' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-white">Job Management</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Jobs</p>
                  <p className="text-2xl font-bold text-white">{stats.totalJobs.toLocaleString()}</p>
                </div>
                <Briefcase className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Active Jobs</p>
                  <p className="text-2xl font-bold text-green-400">{stats.activeJobs.toLocaleString()}</p>
                </div>
                <Play className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Applications</p>
                  <p className="text-2xl font-bold text-purple-400">{stats.totalApplications.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Views</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.totalViews.toLocaleString()}</p>
                </div>
                <Eye className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {typeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Updated Date</option>
                <option value="applicationCount">Applications</option>
                <option value="viewCount">Views</option>
                <option value="title">Title</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {sortOrder === 'asc' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedJobs.size > 0 && (
            <div className="flex items-center justify-between mt-4 p-3 bg-slate-700 rounded-lg">
              <span className="text-white">
                {selectedJobs.size} job{selectedJobs.size > 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('suspend')}
                  className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                >
                  Suspend
                </button>
                <button
                  onClick={() => handleBulkAction('activate')}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Activate
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Jobs Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedJobs.size === jobs.length && jobs.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Salary
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Applications
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {paginatedJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-700">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedJobs.has(job.id)}
                        onChange={() => handleSelectJob(job.id)}
                        className="rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-medium">{job.title}</p>
                            {job.isFeatured && <Star className="w-4 h-4 text-yellow-400" />}
                            {job.isUrgent && <AlertTriangle className="w-4 h-4 text-red-400" />}
                          </div>
                          <p className="text-slate-400 text-sm line-clamp-2">{job.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-white text-sm">{job.user.companyProfile?.companyName || 'N/A'}</p>
                          {job.user.companyProfile?.verified && (
                            <div className="flex items-center gap-1">
                              <Shield className="w-3 h-3 text-green-400" />
                              <span className="text-xs text-green-400">Verified</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs bg-slate-600 text-white rounded">
                        {job.employmentType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-slate-300 text-sm">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {job.salaryMin && job.salaryMax ? (
                        <div className="text-slate-300 text-sm">
                          ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-sm">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'ACTIVE' ? 'bg-green-900/50 text-green-200' :
                        job.status === 'DRAFT' ? 'bg-yellow-900/50 text-yellow-200' :
                        job.status === 'CLOSED' ? 'bg-red-900/50 text-red-200' :
                        job.status === 'SUSPENDED' ? 'bg-orange-900/50 text-orange-200' :
                        'bg-slate-600 text-slate-300'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-white">{job.applicationCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-slate-400" />
                        <span className="text-white">{job.viewCount}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-300 text-sm">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/jobs/${job.id}`)}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleJobAction(job.id, job.status === 'ACTIVE' ? 'suspend' : 'activate')}
                          className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded"
                        >
                          {job.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <button className="p-1 text-slate-400 hover:text-white hover:bg-slate-600 rounded">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-slate-400">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} jobs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-white">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
