'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * EmployerDashboard - Dashboard for employers to manage job listings and candidates
 * 
 * Features:
 * - View and manage job postings
 * - Review candidate applications
 * - Schedule interviews
 * - Track hiring pipeline
 * - Manage company profile
 */

interface JobPosting {
  id: string;
  title: string;
  department?: string;
  location: {
    name: string;
    isRemote: boolean;
  };
  type: 'full-time' | 'part-time' | 'contract' | 'casual' | 'internship';
  status: 'draft' | 'active' | 'paused' | 'closed';
  applicantCount: number;
  newApplicants: number;
  views: number;
  postedAt: string;
  closingDate?: string;
  salaryRange?: { min: number; max: number };
}

interface Applicant {
  id: string;
  jobId: string;
  jobTitle: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    headline?: string;
    location?: string;
    matchScore?: number;
  };
  status: 'new' | 'reviewing' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected';
  appliedAt: string;
  resume?: string;
  coverLetter?: string;
  videoResume?: string;
  notes?: string;
}

interface DashboardStats {
  activeJobs: number;
  totalApplicants: number;
  newApplicants: number;
  interviewsScheduled: number;
  hiresMade: number;
  avgTimeToHire: number;
}

interface Interview {
  id: string;
  applicantId: string;
  candidateName: string;
  jobTitle: string;
  scheduledAt: string;
  duration: number;
  type: 'phone' | 'video' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
}

// API functions
const employerApi = {
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch('/api/employer/stats', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getJobPostings(): Promise<{ jobs: JobPosting[] }> {
    const res = await fetch('/api/employer/jobs', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  async getApplicants(jobId?: string): Promise<{ applicants: Applicant[] }> {
    const url = jobId ? `/api/employer/applicants?jobId=${jobId}` : '/api/employer/applicants';
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch applicants');
    return res.json();
  },

  async getUpcomingInterviews(): Promise<{ interviews: Interview[] }> {
    const res = await fetch('/api/employer/interviews', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch interviews');
    return res.json();
  },

  async updateApplicantStatus(id: string, status: Applicant['status']): Promise<void> {
    const res = await fetch(`/api/employer/applicants/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update status');
  },

  async updateJobStatus(id: string, status: JobPosting['status']): Promise<void> {
    const res = await fetch(`/api/employer/jobs/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update job status');
  },
};

// Status configs
const jobTypeConfig: Record<string, { label: string; color: string }> = {
  'full-time': { label: 'Full-time', color: 'blue' },
  'part-time': { label: 'Part-time', color: 'green' },
  'contract': { label: 'Contract', color: 'purple' },
  'casual': { label: 'Casual', color: 'orange' },
  'internship': { label: 'Internship', color: 'pink' },
};

const jobStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'gray' },
  active: { label: 'Active', color: 'green' },
  paused: { label: 'Paused', color: 'yellow' },
  closed: { label: 'Closed', color: 'red' },
};

const applicantStatusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'blue' },
  reviewing: { label: 'Reviewing', color: 'yellow' },
  shortlisted: { label: 'Shortlisted', color: 'purple' },
  interview: { label: 'Interview', color: 'orange' },
  offered: { label: 'Offered', color: 'green' },
  hired: { label: 'Hired', color: 'emerald' },
  rejected: { label: 'Rejected', color: 'red' },
};

// Stats Card
function StatsCard({
  icon,
  value,
  label,
  change,
  color,
}: {
  icon: string;
  value: number | string;
  label: string;
  change?: { value: number; positive: boolean };
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <span className={`text-3xl p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          {icon}
        </span>
        {change && (
          <span className={`text-sm font-medium ${change.positive ? 'text-green-600' : 'text-red-600'}`}>
            {change.positive ? '+' : ''}{change.value}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

// Job Card
function JobCard({
  job,
  onViewApplicants,
  onEdit,
  onToggleStatus,
}: {
  job: JobPosting;
  onViewApplicants: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const typeConfig = jobTypeConfig[job.type];
  const statusConfig = jobStatusConfig[job.status];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-400`}>
              {statusConfig.label}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full bg-${typeConfig.color}-100 dark:bg-${typeConfig.color}-900/30 text-${typeConfig.color}-700 dark:text-${typeConfig.color}-400`}>
              {typeConfig.label}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {job.location.isRemote ? 'Remote' : job.location.name}
            {job.department && ` · ${job.department}`}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{job.applicantCount}</span>
            {job.newApplicants > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                +{job.newApplicants}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">applicants</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {job.views} views
          </span>
          <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onViewApplicants}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
          >
            View Applicants
          </button>
          <button
            onClick={onToggleStatus}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
          >
            {job.status === 'active' ? 'Pause' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Applicant Card
function ApplicantCard({
  applicant,
  onStatusChange,
  onViewProfile,
}: {
  applicant: Applicant;
  onStatusChange: (status: Applicant['status']) => void;
  onViewProfile: () => void;
}) {
  const statusConfig = applicantStatusConfig[applicant.status];
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {applicant.candidate.avatar ? (
          <OptimizedImage src={toCloudinaryAutoUrl(applicant.candidate.avatar)} alt={applicant.candidate.name} width={48} height={48} className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium text-lg">
            {applicant.candidate.name.charAt(0)}
          </div>
        )}

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 dark:text-white">{applicant.candidate.name}</h4>
            {applicant.candidate.matchScore && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                applicant.candidate.matchScore >= 80 ? 'bg-green-100 text-green-700' :
                applicant.candidate.matchScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {applicant.candidate.matchScore}% match
              </span>
            )}
          </div>
          {applicant.candidate.headline && (
            <p className="text-sm text-gray-500 mt-0.5">{applicant.candidate.headline}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Applied {new Date(applicant.appliedAt).toLocaleDateString()}</span>
            <span>for {applicant.jobTitle}</span>
          </div>
        </div>

        {/* Status */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1
              bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 
              text-${statusConfig.color}-700 dark:text-${statusConfig.color}-400`}
          >
            {statusConfig.label}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showStatusMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
              <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                {Object.entries(applicantStatusConfig).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => {
                      onStatusChange(key as Applicant['status']);
                      setShowStatusMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <span className={`inline-block w-2 h-2 rounded-full bg-${config.color}-500 mr-2`} />
                    {config.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Button variant="outline" size="sm" onClick={onViewProfile}>
          View Profile
        </Button>
        {applicant.resume && (
          <Button variant="outline" size="sm">
            Resume
          </Button>
        )}
        {applicant.videoResume && (
          <Button variant="outline" size="sm">
            Video Resume
          </Button>
        )}
        <Button variant="outline" size="sm" className="ml-auto">
          Schedule Interview
        </Button>
      </div>
    </div>
  );
}

// Interview Card
function InterviewCard({ interview }: { interview: Interview }) {
  const typeIcon = {
    phone: '📞',
    video: '💻',
    'in-person': '🏢',
  };

  const date = new Date(interview.scheduledAt);
  const isToday = date.toDateString() === new Date().toDateString();

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="text-center min-w-[50px]">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{date.getDate()}</p>
        <p className="text-xs text-gray-500">{date.toLocaleString('en-AU', { month: 'short' })}</p>
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{interview.candidateName}</p>
        <p className="text-sm text-gray-500">{interview.jobTitle}</p>
        <p className="text-xs text-gray-400 mt-1">
          {date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} · {interview.duration}min · {typeIcon[interview.type]} {interview.type}
        </p>
      </div>
      {isToday && (
        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">Today</span>
      )}
    </div>
  );
}

// Main Component
export function EmployerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'applicants'>('overview');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, jobsData, applicantsData, interviewsData] = await Promise.all([
        employerApi.getDashboardStats(),
        employerApi.getJobPostings(),
        employerApi.getApplicants(selectedJobId || undefined),
        employerApi.getUpcomingInterviews(),
      ]);
      setStats(statsData);
      setJobs(jobsData.jobs);
      setApplicants(applicantsData.applicants);
      setInterviews(interviewsData.interviews);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleJobStatusToggle = async (job: JobPosting) => {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    try {
      await employerApi.updateJobStatus(job.id, newStatus);
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  const handleApplicantStatusChange = async (applicant: Applicant, status: Applicant['status']) => {
    try {
      await employerApi.updateApplicantStatus(applicant.id, status);
      setApplicants(prev => prev.map(a => a.id === applicant.id ? { ...a, status } : a));
    } catch (error) {
      console.error('Failed to update applicant status:', error);
    }
  };

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Employer Dashboard</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage your job postings and candidates
          </p>
        </div>
        <Button>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post New Job
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard icon="💼" value={stats.activeJobs} label="Active Jobs" color="blue" />
        <StatsCard 
          icon="👥" 
          value={stats.totalApplicants} 
          label="Total Applicants" 
          color="green"
          change={stats.newApplicants > 0 ? { value: stats.newApplicants, positive: true } : undefined}
        />
        <StatsCard icon="📅" value={stats.interviewsScheduled} label="Interviews Scheduled" color="purple" />
        <StatsCard icon="✅" value={stats.hiresMade} label="Hires Made" color="emerald" />
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'jobs', 'applicants'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Applicants */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Recent Applicants</h3>
                <button 
                  onClick={() => setActiveTab('applicants')}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-4">
                {applicants.slice(0, 5).map((applicant) => (
                  <ApplicantCard
                    key={applicant.id}
                    applicant={applicant}
                    onStatusChange={(status) => handleApplicantStatusChange(applicant, status)}
                    onViewProfile={() => {}}
                  />
                ))}
                {applicants.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No applicants yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Interviews */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Upcoming Interviews</h3>
              <div className="space-y-3">
                {interviews.slice(0, 4).map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} />
                ))}
                {interviews.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No interviews scheduled</p>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Hiring Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Avg. Time to Hire</span>
                  <span className="font-medium text-gray-900 dark:text-white">{stats.avgTimeToHire} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Applicant-to-Interview</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {stats.totalApplicants > 0 
                      ? Math.round((stats.interviewsScheduled / stats.totalApplicants) * 100) 
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Interview-to-Hire</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {stats.interviewsScheduled > 0 
                      ? Math.round((stats.hiresMade / stats.interviewsScheduled) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onViewApplicants={() => {
                setSelectedJobId(job.id);
                setActiveTab('applicants');
              }}
              onEdit={() => {}}
              onToggleStatus={() => handleJobStatusToggle(job)}
            />
          ))}
          {jobs.length === 0 && (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="text-6xl mb-4">💼</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No job postings yet</h3>
              <p className="text-gray-500 mt-2">Post your first job to start receiving applications</p>
              <Button className="mt-4">Post a Job</Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'applicants' && (
        <div>
          {/* Job Filter */}
          <div className="flex items-center gap-4 mb-6">
            <select
              value={selectedJobId || ''}
              onChange={(e) => setSelectedJobId(e.target.value || null)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>{job.title}</option>
              ))}
            </select>
            <span className="text-gray-500">
              {applicants.length} applicant{applicants.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-4">
            {applicants.map((applicant) => (
              <ApplicantCard
                key={applicant.id}
                applicant={applicant}
                onStatusChange={(status) => handleApplicantStatusChange(applicant, status)}
                onViewProfile={() => {}}
              />
            ))}
            {applicants.length === 0 && (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <div className="text-6xl mb-4">👥</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No applicants found</h3>
                <p className="text-gray-500 mt-2">
                  {selectedJobId ? 'No one has applied to this job yet' : 'You haven\'t received any applications yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployerDashboard;
