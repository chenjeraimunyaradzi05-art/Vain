'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * ApplicationTracker - Track job applications
 * 
 * Features:
 * - View all job applications
 * - Track application status
 * - Interview scheduling
 * - Application notes
 * - Follow-up reminders
 * - Analytics and insights
 */

interface JobApplication {
  id: string;
  job: {
    id: string;
    title: string;
    company: string;
    companyLogo?: string;
    location: string;
    workArrangement: 'onsite' | 'remote' | 'hybrid';
    salary?: {
      min: number;
      max: number;
      type: 'annual' | 'hourly';
    };
  };
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'withdrawn' | 'accepted';
  appliedAt: string;
  updatedAt: string;
  source: 'platform' | 'external' | 'referral';
  coverLetter?: string;
  resumeVersion?: string;
  notes: ApplicationNote[];
  interviews: Interview[];
  followUpDate?: string;
  isArchived: boolean;
}

interface ApplicationNote {
  id: string;
  content: string;
  createdAt: string;
}

interface Interview {
  id: string;
  type: 'phone' | 'video' | 'in-person' | 'assessment' | 'final';
  scheduledAt: string;
  duration: number; // minutes
  location?: string;
  videoUrl?: string;
  interviewers?: string[];
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  feedback?: string;
}

interface ApplicationStats {
  total: number;
  active: number;
  interviews: number;
  offers: number;
  responseRate: number;
  avgTimeToResponse: number; // days
  byStatus: Record<string, number>;
  recentActivity: { date: string; count: number }[];
}

// API functions
const applicationsApi = {
  async getApplications(params?: {
    status?: string;
    archived?: boolean;
  }): Promise<{ applications: JobApplication[] }> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.archived !== undefined) searchParams.set('archived', String(params.archived));
    
    const res = await fetch(`/api/applications?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch applications');
    return res.json();
  },

  async getApplication(id: string): Promise<JobApplication> {
    const res = await fetch(`/api/applications/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch application');
    return res.json();
  },

  async getStats(): Promise<ApplicationStats> {
    const res = await fetch('/api/applications/stats', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async updateStatus(id: string, status: JobApplication['status']): Promise<void> {
    const res = await fetch(`/api/applications/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update status');
  },

  async addNote(id: string, content: string): Promise<ApplicationNote> {
    const res = await fetch(`/api/applications/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to add note');
    return res.json();
  },

  async setFollowUp(id: string, date: string): Promise<void> {
    const res = await fetch(`/api/applications/${id}/follow-up`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ date }),
    });
    if (!res.ok) throw new Error('Failed to set follow-up');
  },

  async archiveApplication(id: string): Promise<void> {
    const res = await fetch(`/api/applications/${id}/archive`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to archive application');
  },

  async withdrawApplication(id: string): Promise<void> {
    const res = await fetch(`/api/applications/${id}/withdraw`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to withdraw application');
  },
};

// Status config
const statusConfig: Record<string, { label: string; color: string; icon: string; description: string }> = {
  applied: { label: 'Applied', color: 'blue', icon: '📤', description: 'Application submitted' },
  screening: { label: 'Screening', color: 'purple', icon: '👀', description: 'Under review' },
  interview: { label: 'Interview', color: 'orange', icon: '🎙️', description: 'Interview stage' },
  offer: { label: 'Offer', color: 'green', icon: '🎉', description: 'Offer received' },
  rejected: { label: 'Rejected', color: 'red', icon: '❌', description: 'Not selected' },
  withdrawn: { label: 'Withdrawn', color: 'gray', icon: '↩️', description: 'You withdrew' },
  accepted: { label: 'Accepted', color: 'emerald', icon: '✅', description: 'You accepted' },
};

// Interview type config
const interviewTypeConfig: Record<string, { label: string; icon: string }> = {
  phone: { label: 'Phone Screen', icon: '📞' },
  video: { label: 'Video Interview', icon: '🎥' },
  'in-person': { label: 'In-Person', icon: '🤝' },
  assessment: { label: 'Assessment', icon: '📝' },
  final: { label: 'Final Interview', icon: '🎯' },
};

// Format relative time
function formatRelativeTime(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// Format date
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Stats Card Component
function StatsCard({
  label,
  value,
  change,
  icon,
}: {
  label: string;
  value: string | number;
  change?: { value: number; isPositive: boolean };
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 text-sm">{label}</span>
        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        {change && (
          <span className={`text-xs font-medium ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {change.isPositive ? '+' : ''}{change.value}%
          </span>
        )}
      </div>
    </div>
  );
}

// Application Card Component
function ApplicationCard({
  application,
  onSelect,
  onUpdateStatus,
}: {
  application: JobApplication;
  onSelect: () => void;
  onUpdateStatus: (status: JobApplication['status']) => void;
}) {
  const status = statusConfig[application.status] || statusConfig.applied;
  const hasUpcomingInterview = application.interviews.some(
    i => i.status === 'scheduled' && new Date(i.scheduledAt) > new Date()
  );
  const nextInterview = application.interviews
    .filter(i => i.status === 'scheduled' && new Date(i.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];

  const needsFollowUp = application.followUpDate && new Date(application.followUpDate) <= new Date();

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border ${
        needsFollowUp ? 'border-orange-300 dark:border-orange-700' : 'border-gray-200 dark:border-gray-700'
      } p-4 hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* Company Logo */}
        {application.job.companyLogo ? (
          <OptimizedImage src={toCloudinaryAutoUrl(application.job.companyLogo)} alt={application.job.company} width={48} height={48} className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium text-lg">
            {application.job.company.charAt(0)}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{application.job.title}</h3>
              <p className="text-sm text-gray-500">{application.job.company}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 bg-${status.color}-100 dark:bg-${status.color}-900/30 text-${status.color}-700 dark:text-${status.color}-400`}>
              {status.icon} {status.label}
            </span>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{application.job.location}</span>
            {application.job.salary && (
              <span>
                ${application.job.salary.min.toLocaleString()} - ${application.job.salary.max.toLocaleString()}
              </span>
            )}
            <span>Applied {formatRelativeTime(application.appliedAt)}</span>
          </div>

          {/* Upcoming Interview */}
          {nextInterview && (
            <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg flex items-center gap-2">
              <span className="text-lg">{interviewTypeConfig[nextInterview.type]?.icon || '📅'}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-200">
                  {interviewTypeConfig[nextInterview.type]?.label || 'Interview'}
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-400">
                  {formatDate(nextInterview.scheduledAt)}
                </p>
              </div>
            </div>
          )}

          {/* Follow-up Reminder */}
          {needsFollowUp && (
            <div className="mt-2 flex items-center gap-2 text-orange-600 dark:text-orange-400 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Follow up reminder
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Application Detail Modal
function ApplicationDetailModal({
  application,
  onClose,
  onUpdateStatus,
  onAddNote,
  onSetFollowUp,
  onWithdraw,
  onArchive,
}: {
  application: JobApplication;
  onClose: () => void;
  onUpdateStatus: (status: JobApplication['status']) => void;
  onAddNote: (content: string) => void;
  onSetFollowUp: (date: string) => void;
  onWithdraw: () => void;
  onArchive: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'overview' | 'interviews' | 'notes'>('overview');
  const [newNote, setNewNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const status = statusConfig[application.status] || statusConfig.applied;

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote);
      setNewNote('');
    }
  };

  const handleSetFollowUp = () => {
    if (followUpDate) {
      onSetFollowUp(followUpDate);
      setFollowUpDate('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {application.job.companyLogo ? (
                <OptimizedImage src={toCloudinaryAutoUrl(application.job.companyLogo)} alt={application.job.company} width={56} height={56} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium text-xl">
                  {application.job.company.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{application.job.title}</h2>
                <p className="text-gray-500">{application.job.company}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>{application.job.location}</span>
                  <span>·</span>
                  <span className="capitalize">{application.job.workArrangement}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4 mt-4">
            <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center gap-1 bg-${status.color}-100 dark:bg-${status.color}-900/30 text-${status.color}-700 dark:text-${status.color}-400`}>
              {status.icon} {status.label}
            </span>
            <select
              value={application.status}
              onChange={(e) => onUpdateStatus(e.target.value as JobApplication['status'])}
              className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.icon} {config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {['overview', 'interviews', 'notes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-3 font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
              {tab === 'interviews' && application.interviews.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-xs rounded">
                  {application.interviews.length}
                </span>
              )}
              {tab === 'notes' && application.notes.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-xs rounded">
                  {application.notes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Timeline */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Application Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                      📤
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Applied</p>
                      <p className="text-xs text-gray-500">{formatDate(application.appliedAt)}</p>
                    </div>
                  </div>
                  {application.status !== 'applied' && (
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 bg-${status.color}-100 dark:bg-${status.color}-900/30 rounded-full flex items-center justify-center`}>
                        {status.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{status.label}</p>
                        <p className="text-xs text-gray-500">{formatDate(application.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Follow-up */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Follow-up Reminder</h3>
                {application.followUpDate ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Reminder set for: {new Date(application.followUpDate).toLocaleDateString('en-AU')}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                    <Button size="sm" onClick={handleSetFollowUp} disabled={!followUpDate}>
                      Set Reminder
                    </Button>
                  </div>
                )}
              </div>

              {/* Application Details */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">Application Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="text-gray-900 dark:text-white capitalize">{application.source}</span>
                  </div>
                  {application.resumeVersion && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Resume</span>
                      <span className="text-gray-900 dark:text-white">{application.resumeVersion}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cover Letter</span>
                    <span className="text-gray-900 dark:text-white">{application.coverLetter ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'interviews' && (
            <div>
              {application.interviews.length > 0 ? (
                <div className="space-y-4">
                  {application.interviews.map((interview) => {
                    const typeInfo = interviewTypeConfig[interview.type] || interviewTypeConfig.video;
                    const isPast = new Date(interview.scheduledAt) < new Date();
                    
                    return (
                      <div
                        key={interview.id}
                        className={`p-4 rounded-lg border ${
                          interview.status === 'cancelled'
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                            : isPast
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900'
                            : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{typeInfo.icon}</span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{typeInfo.label}</p>
                              <p className="text-sm text-gray-500">{formatDate(interview.scheduledAt)}</p>
                              <p className="text-xs text-gray-400">{interview.duration} minutes</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded capitalize ${
                            interview.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            interview.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            interview.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {interview.status}
                          </span>
                        </div>

                        {interview.interviewers && interview.interviewers.length > 0 && (
                          <div className="mt-3 text-sm">
                            <span className="text-gray-500">Interviewers: </span>
                            <span className="text-gray-900 dark:text-white">{interview.interviewers.join(', ')}</span>
                          </div>
                        )}

                        {interview.videoUrl && interview.status === 'scheduled' && !isPast && (
                          <div className="mt-3">
                            <Button size="sm" onClick={() => window.open(interview.videoUrl, '_blank')}>
                              Join Video Call
                            </Button>
                          </div>
                        )}

                        {interview.feedback && (
                          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-500 mb-1">Feedback</p>
                            <p className="text-sm text-gray-900 dark:text-white">{interview.feedback}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No interviews scheduled yet
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add note */}
              <div>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this application..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Notes list */}
              {application.notes.length > 0 ? (
                <div className="space-y-3">
                  {application.notes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-2">{formatDate(note.createdAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No notes yet</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onArchive}>
              Archive
            </Button>
            {['applied', 'screening', 'interview'].includes(application.status) && (
              <Button variant="outline" size="sm" onClick={onWithdraw} className="text-red-600">
                Withdraw
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function ApplicationTracker() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [appsRes, statsRes] = await Promise.all([
        applicationsApi.getApplications({ 
          status: statusFilter || undefined, 
          archived: showArchived 
        }),
        applicationsApi.getStats(),
      ]);
      setApplications(appsRes.applications);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, showArchived]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (id: string, status: JobApplication['status']) => {
    try {
      await applicationsApi.updateStatus(id, status);
      await loadData();
      if (selectedApplication?.id === id) {
        setSelectedApplication(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAddNote = async (id: string, content: string) => {
    try {
      const note = await applicationsApi.addNote(id, content);
      setSelectedApplication(prev => prev ? { 
        ...prev, 
        notes: [note, ...prev.notes] 
      } : null);
    } catch (error) {
      console.error('Failed to add note:', error);
    }
  };

  const handleSetFollowUp = async (id: string, date: string) => {
    try {
      await applicationsApi.setFollowUp(id, date);
      await loadData();
      setSelectedApplication(prev => prev ? { ...prev, followUpDate: date } : null);
    } catch (error) {
      console.error('Failed to set follow-up:', error);
    }
  };

  const handleWithdraw = async (id: string) => {
    if (confirm('Are you sure you want to withdraw this application?')) {
      try {
        await applicationsApi.withdrawApplication(id);
        await loadData();
        setSelectedApplication(null);
      } catch (error) {
        console.error('Failed to withdraw:', error);
      }
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await applicationsApi.archiveApplication(id);
      await loadData();
      setSelectedApplication(null);
    } catch (error) {
      console.error('Failed to archive:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Application Tracker</h1>
        <p className="text-gray-500 mt-1">Track and manage your job applications</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            label="Total Applications"
            value={stats.total}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>}
          />
          <StatsCard
            label="Active"
            value={stats.active}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>}
          />
          <StatsCard
            label="Interviews"
            value={stats.interviews}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>}
          />
          <StatsCard
            label="Offers"
            value={stats.offers}
            icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="">All Statuses</option>
          {Object.entries(statusConfig).map(([key, config]) => (
            <option key={key} value={key}>{config.icon} {config.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-600 dark:text-gray-400">Show archived</span>
        </label>
      </div>

      {/* Applications List */}
      {applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onSelect={() => setSelectedApplication(app)}
              onUpdateStatus={(status) => handleUpdateStatus(app.id, status)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            No applications found
          </h3>
          <p className="text-gray-500 mt-2">
            Start applying to jobs to track your applications here
          </p>
          <Button className="mt-4">Browse Jobs</Button>
        </div>
      )}

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onUpdateStatus={(status) => handleUpdateStatus(selectedApplication.id, status)}
          onAddNote={(content) => handleAddNote(selectedApplication.id, content)}
          onSetFollowUp={(date) => handleSetFollowUp(selectedApplication.id, date)}
          onWithdraw={() => handleWithdraw(selectedApplication.id)}
          onArchive={() => handleArchive(selectedApplication.id)}
        />
      )}
    </div>
  );
}

export default ApplicationTracker;
