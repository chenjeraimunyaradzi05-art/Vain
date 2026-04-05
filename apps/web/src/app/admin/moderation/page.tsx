'use client';

/**
 * Content Moderation Dashboard
 * 
 * AI-assisted content moderation with report queue, auto-flagging,
 * and moderation actions.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Flag,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Zap,
  BarChart3,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/apiClient';
import { useUIStore } from '@/stores/uiStore';

interface Report {
  id: string;
  contentType: 'post' | 'comment' | 'message' | 'profile' | 'job' | 'review';
  contentId: string;
  contentPreview: string;
  reason: string;
  reportedBy: { id: string; name: string };
  reportedUser: { id: string; name: string };
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  aiScore?: number;
  aiCategories?: string[];
}

interface ModerationStats {
  pending: number;
  resolvedToday: number;
  averageResponseTime: string;
  autoFlaggedToday: number;
}

export default function ModerationPage() {
  const router = useRouter();
  const { showToast } = useUIStore();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'high-priority'>('pending');
  const [page, setPage] = useState(1);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'pending') params.append('status', 'pending');
      if (filter === 'high-priority') params.append('priority', 'high,critical');
      params.append('page', String(page));

      const { ok, data } = await api<{ reports: Report[] }>(`/admin/reports?${params.toString()}`);
      if (ok && data) {
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter, page]);

  const loadStats = useCallback(async () => {
    try {
      const { ok, data } = await api<ModerationStats>('/admin/moderation/stats');
      if (ok && data) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadReports();
    loadStats();
  }, [loadReports, loadStats]);

  const handleAction = async (reportId: string, action: 'approve' | 'remove' | 'dismiss' | 'warn') => {
    try {
      const { ok } = await api(`/admin/reports/${reportId}/${action}`, {
        method: 'POST',
      });

      if (ok) {
        showToast({
          type: 'success',
          title: 'Action Completed',
          message: `Report ${action}ed successfully`,
        });
        loadReports();
        loadStats();
        setSelectedReport(null);
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to process action',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="w-4 h-4" />;
      case 'comment': return <MessageSquare className="w-4 h-4" />;
      case 'message': return <MessageSquare className="w-4 h-4" />;
      case 'profile': return <User className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

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
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-6 h-6 text-purple-400" />
                Content Moderation
              </h1>
            </div>
            <button
              onClick={loadReports}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 mb-6">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Admin</p>
              <h2 className="text-2xl font-bold text-white">Content Moderation</h2>
              <p className="text-sm text-slate-400 mt-1">Review reports, prioritize risks, and take action fast.</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-lg font-semibold text-white">{stats?.pending || 0}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Resolved today</p>
                <p className="text-lg font-semibold text-white">{stats?.resolvedToday || 0}</p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">Auto-flagged</p>
                <p className="text-lg font-semibold text-white">{stats?.autoFlaggedToday || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Pending Reports</p>
                <p className="text-2xl font-bold text-white">{stats?.pending || 0}</p>
              </div>
              <Flag className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Resolved Today</p>
                <p className="text-2xl font-bold text-white">{stats?.resolvedToday || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">{stats?.averageResponseTime || '—'}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">AI Auto-Flagged</p>
                <p className="text-2xl font-bold text-white">{stats?.autoFlaggedToday || 0}</p>
              </div>
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-4">
          {(['all', 'pending', 'high-priority'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {f === 'all' ? 'All Reports' : f === 'pending' ? 'Pending' : 'High Priority'}
            </button>
          ))}
        </div>

        {/* Reports List */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          {isLoading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-2" />
              <p className="text-slate-400">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-2" />
              <p className="text-slate-400">No pending reports. Great work!</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 hover:bg-slate-700/30 cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start gap-4">
                    {/* Priority & Type */}
                    <div className="flex flex-col items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${getPriorityColor(report.priority)}`}>
                        {report.priority}
                      </span>
                      <span className="text-slate-400">
                        {getContentTypeIcon(report.contentType)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-white truncate">
                          {report.reason}
                        </p>
                        {report.aiScore && report.aiScore > 0.8 && (
                          <span className="px-2 py-0.5 text-xs bg-purple-900/50 text-purple-300 rounded flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            AI Flagged
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 truncate mb-2">
                        {report.contentPreview}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>Reported by: {report.reportedBy.name}</span>
                        <span>•</span>
                        <span>Against: {report.reportedUser.name}</span>
                        <span>•</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(report.id, 'approve');
                        }}
                        className="p-2 text-green-400 hover:bg-green-900/30 rounded-lg"
                        title="Approve (Keep Content)"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(report.id, 'remove');
                        }}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg"
                        title="Remove Content"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAction(report.id, 'dismiss');
                        }}
                        className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg"
                        title="Dismiss Report"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Report Detail Modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Report Details</h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {selectedReport.contentType} • {new Date(selectedReport.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-2 text-slate-400 hover:text-white"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Reason */}
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Reason</h3>
                  <p className="text-white">{selectedReport.reason}</p>
                </div>

                {/* Content Preview */}
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-1">Content</h3>
                  <div className="p-4 bg-slate-900 rounded-lg">
                    <p className="text-slate-300">{selectedReport.contentPreview}</p>
                  </div>
                </div>

                {/* AI Analysis */}
                {selectedReport.aiScore && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">AI Analysis</h3>
                    <div className="p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span className="text-purple-300">
                          Confidence: {(selectedReport.aiScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      {selectedReport.aiCategories && (
                        <div className="flex flex-wrap gap-2">
                          {selectedReport.aiCategories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-1 text-xs bg-purple-900/50 text-purple-300 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Users */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Reported By</h3>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-white">{selectedReport.reportedBy.name}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-1">Reported User</h3>
                    <div className="p-3 bg-slate-700/50 rounded-lg">
                      <p className="text-white">{selectedReport.reportedUser.name}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => handleAction(selectedReport.id, 'dismiss')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Dismiss Report
                </button>
                <button
                  onClick={() => handleAction(selectedReport.id, 'warn')}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                >
                  Warn User
                </button>
                <button
                  onClick={() => handleAction(selectedReport.id, 'remove')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Remove Content
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
