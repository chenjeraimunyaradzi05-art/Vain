'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * JobSearchBrowse - Search and browse job listings
 * 
 * Features:
 * - Advanced job search
 * - Filters (location, salary, type, etc.)
 * - Save jobs
 * - Quick apply
 * - Indigenous employer filter
 * - Job recommendations
 */

interface Job {
  id: string;
  title: string;
  company: {
    id: string;
    name: string;
    logo?: string;
    isIndigenousOwned: boolean;
    isIndigenousFriendly: boolean;
  };
  location: string;
  workArrangement: 'onsite' | 'remote' | 'hybrid';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'casual' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  salary?: {
    min: number;
    max: number;
    type: 'annual' | 'hourly';
    isVisible: boolean;
  };
  description: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  benefits?: string[];
  culturalSupport?: string[];
  postedAt: string;
  closingDate?: string;
  applicantsCount: number;
  isSaved: boolean;
  isApplied: boolean;
  isUrgent: boolean;
  isFeatured: boolean;
}

interface SearchFilters {
  query: string;
  location: string;
  workArrangement: string[];
  employmentType: string[];
  experienceLevel: string[];
  salaryMin?: number;
  salaryMax?: number;
  indigenousEmployers: boolean;
  postedWithin: string;
  remote: boolean;
}

// API functions
const jobsApi = {
  async searchJobs(filters: Partial<SearchFilters>, page: number = 1): Promise<{
    jobs: Job[];
    total: number;
    pages: number;
    suggestions?: string[];
  }> {
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.location) params.set('location', filters.location);
    if (filters.workArrangement?.length) params.set('workArrangement', filters.workArrangement.join(','));
    if (filters.employmentType?.length) params.set('employmentType', filters.employmentType.join(','));
    if (filters.experienceLevel?.length) params.set('experienceLevel', filters.experienceLevel.join(','));
    if (filters.salaryMin) params.set('salaryMin', String(filters.salaryMin));
    if (filters.salaryMax) params.set('salaryMax', String(filters.salaryMax));
    if (filters.indigenousEmployers) params.set('indigenousEmployers', 'true');
    if (filters.postedWithin) params.set('postedWithin', filters.postedWithin);
    if (filters.remote) params.set('remote', 'true');
    params.set('page', String(page));

    const res = await fetch(`/api/jobs/search?${params}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to search jobs');
    return res.json();
  },

  async getRecommendedJobs(): Promise<{ jobs: Job[] }> {
    const res = await fetch('/api/jobs/recommended', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get recommendations');
    return res.json();
  },

  async saveJob(jobId: string): Promise<void> {
    const res = await fetch(`/api/jobs/${jobId}/save`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to save job');
  },

  async unsaveJob(jobId: string): Promise<void> {
    const res = await fetch(`/api/jobs/${jobId}/save`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to unsave job');
  },

  async getSavedJobs(): Promise<{ jobs: Job[] }> {
    const res = await fetch('/api/jobs/saved', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get saved jobs');
    return res.json();
  },

  async applyToJob(jobId: string, data: {
    resumeId: string;
    coverLetter?: string;
  }): Promise<void> {
    const res = await fetch(`/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to apply');
  },

  async getRecentSearches(): Promise<{ searches: string[] }> {
    const res = await fetch('/api/jobs/recent-searches', { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to get recent searches');
    return res.json();
  },
};

// Config
const workArrangementOptions = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const employmentTypeOptions = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'casual', label: 'Casual' },
  { value: 'internship', label: 'Internship' },
];

const experienceLevelOptions = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'executive', label: 'Executive' },
];

const postedWithinOptions = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '14d', label: 'Last 14 days' },
  { value: '30d', label: 'Last 30 days' },
];

const australianCities = [
  'Sydney, NSW',
  'Melbourne, VIC',
  'Brisbane, QLD',
  'Perth, WA',
  'Adelaide, SA',
  'Gold Coast, QLD',
  'Newcastle, NSW',
  'Canberra, ACT',
  'Darwin, NT',
  'Hobart, TAS',
  'Cairns, QLD',
  'Alice Springs, NT',
];

// Format date
function formatPostedDate(date: string): string {
  const posted = new Date(date);
  const now = new Date();
  const diff = now.getTime() - posted.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return posted.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

// Format salary
function formatSalary(salary: Job['salary']): string {
  if (!salary || !salary.isVisible) return 'Salary not disclosed';
  const min = salary.min.toLocaleString();
  const max = salary.max.toLocaleString();
  const suffix = salary.type === 'hourly' ? '/hr' : '/yr';
  return `$${min} - $${max}${suffix}`;
}

// Checkbox Filter Group
function FilterCheckboxGroup({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <h4 className="font-medium text-gray-900 dark:text-white mb-2">{title}</h4>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => handleToggle(option.value)}
              className="rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// Job Card
function JobCard({
  job,
  onSelect,
  onSave,
  isSelected,
}: {
  job: Job;
  onSelect: () => void;
  onSave: () => void;
  isSelected?: boolean;
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 border rounded-xl cursor-pointer transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex gap-4">
        {/* Company Logo */}
        {job.company.logo ? (
          <OptimizedImage src={toCloudinaryAutoUrl(job.company.logo)} alt={job.company.name} width={48} height={48} className="w-12 h-12 rounded-lg object-contain bg-white" />
        ) : (
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg font-medium text-gray-400">
            {job.company.name.charAt(0)}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title & Badges */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                {job.isUrgent && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded">
                    Urgent
                  </span>
                )}
                {job.isFeatured && (
                  <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                    Featured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">{job.company.name}</span>
                {(job.company.isIndigenousOwned || job.company.isIndigenousFriendly) && (
                  <span className="text-xs">🌏</span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onSave(); }}
              className={`p-2 rounded-full transition-colors ${
                job.isSaved
                  ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5" fill={job.isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {job.location}
            </span>
            <span className="text-gray-300">·</span>
            <span className="capitalize">{job.workArrangement}</span>
            <span className="text-gray-300">·</span>
            <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
          </div>

          {/* Salary */}
          {job.salary?.isVisible && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2">
              {formatSalary(job.salary)}
            </p>
          )}

          {/* Skills */}
          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {job.skills.slice(0, 4).map((skill, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                  {skill}
                </span>
              ))}
              {job.skills.length > 4 && (
                <span className="text-xs text-gray-400">+{job.skills.length - 4}</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-400">{formatPostedDate(job.postedAt)}</span>
            {job.isApplied && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ Applied
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Job Detail Panel
function JobDetailPanel({
  job,
  onApply,
  onSave,
  onClose,
}: {
  job: Job;
  onApply: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            {job.company.logo ? (
              <OptimizedImage src={toCloudinaryAutoUrl(job.company.logo)} alt={job.company.name} width={56} height={56} className="w-14 h-14 rounded-xl object-contain bg-white" />
            ) : (
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-xl font-medium text-gray-400">
                {job.company.name.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{job.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-600 dark:text-gray-400">{job.company.name}</span>
                {job.company.isIndigenousOwned && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                    🌏 Indigenous Owned
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 lg:hidden">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-sm text-gray-500">
          <span>{job.location}</span>
          <span className="text-gray-300">·</span>
          <span className="capitalize">{job.workArrangement}</span>
          <span className="text-gray-300">·</span>
          <span className="capitalize">{job.employmentType.replace('-', ' ')}</span>
          <span className="text-gray-300">·</span>
          <span className="capitalize">{job.experienceLevel} Level</span>
        </div>

        {/* Salary */}
        {job.salary?.isVisible && (
          <p className="text-lg text-green-600 dark:text-green-400 font-semibold mt-3">
            {formatSalary(job.salary)}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          {job.isApplied ? (
            <Button disabled className="flex-1">Applied ✓</Button>
          ) : (
            <Button onClick={onApply} className="flex-1">Apply Now</Button>
          )}
          <Button variant="outline" onClick={onSave}>
            <svg className="w-5 h-5" fill={job.isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
          <span>{job.applicantsCount} applicants</span>
          <span className="text-gray-300">·</span>
          <span>Posted {formatPostedDate(job.postedAt)}</span>
          {job.closingDate && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-red-500">
                Closes {new Date(job.closingDate).toLocaleDateString('en-AU')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About the Role</h3>
          <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{job.description}</p>
        </div>

        {/* Responsibilities */}
        {job.responsibilities.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Responsibilities</h3>
            <ul className="space-y-2">
              {job.responsibilities.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 mt-1 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requirements */}
        {job.requirements.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Requirements</h3>
            <ul className="space-y-2">
              {job.requirements.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 mt-1 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Skills */}
        {job.skills.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, i) => (
                <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-sm">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Benefits */}
        {job.benefits && job.benefits.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Benefits</h3>
            <div className="grid grid-cols-2 gap-2">
              {job.benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-green-500">✓</span>
                  {benefit}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cultural Support */}
        {job.culturalSupport && job.culturalSupport.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
              🌏 Indigenous Cultural Support
            </h3>
            <ul className="space-y-2">
              {job.culturalSupport.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// Apply Modal
function ApplyModal({
  job,
  onClose,
  onSubmit,
}: {
  job: Job;
  onClose: () => void;
  onSubmit: (data: { resumeId: string; coverLetter?: string }) => void;
}) {
  const [resumeId, setResumeId] = useState('default');
  const [coverLetter, setCoverLetter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ resumeId, coverLetter: coverLetter || undefined });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Apply to {job.title}
        </h3>
        <p className="text-gray-500 mb-6">{job.company.name}</p>

        <div className="space-y-4">
          {/* Resume Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resume
            </label>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="default">Default Resume</option>
              <option value="tech">Tech Resume</option>
              <option value="video">Video Resume</option>
            </select>
          </div>

          {/* Cover Letter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cover Letter (Optional)
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Add a cover letter to stand out..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function JobSearchBrowse() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState<'search' | 'recommended' | 'saved'>('search');

  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    location: '',
    workArrangement: [],
    employmentType: [],
    experienceLevel: [],
    indigenousEmployers: false,
    postedWithin: '',
    remote: false,
  });

  const searchJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await jobsApi.searchJobs(filters, page);
      setJobs(result.jobs);
      setTotalPages(result.pages);
      setTotal(result.total);
      if (result.jobs.length > 0 && !selectedJob) {
        setSelectedJob(result.jobs[0]);
      }
    } catch (error) {
      console.error('Failed to search jobs:', error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page]);

  const loadRecommended = useCallback(async () => {
    try {
      const { jobs } = await jobsApi.getRecommendedJobs();
      setRecommendedJobs(jobs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  }, []);

  const loadSaved = useCallback(async () => {
    try {
      const { jobs } = await jobsApi.getSavedJobs();
      setJobs(jobs);
    } catch (error) {
      console.error('Failed to load saved jobs:', error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'search') {
      searchJobs();
    } else if (activeTab === 'recommended') {
      setJobs(recommendedJobs);
    } else if (activeTab === 'saved') {
      loadSaved();
    }
  }, [activeTab, searchJobs, recommendedJobs, loadSaved]);

  useEffect(() => {
    loadRecommended();
  }, [loadRecommended]);

  const handleSave = async (job: Job) => {
    try {
      if (job.isSaved) {
        await jobsApi.unsaveJob(job.id);
      } else {
        await jobsApi.saveJob(job.id);
      }
      const update = (j: Job) => (j.id === job.id ? { ...j, isSaved: !j.isSaved } : j);
      setJobs(prev => prev.map(update));
      if (selectedJob?.id === job.id) {
        setSelectedJob(prev => prev ? { ...prev, isSaved: !prev.isSaved } : null);
      }
    } catch (error) {
      console.error('Failed to save job:', error);
    }
  };

  const handleApply = async (data: { resumeId: string; coverLetter?: string }) => {
    if (!selectedJob) return;
    try {
      await jobsApi.applyToJob(selectedJob.id, data);
      const update = (j: Job) => (j.id === selectedJob.id ? { ...j, isApplied: true } : j);
      setJobs(prev => prev.map(update));
      setSelectedJob(prev => prev ? { ...prev, isApplied: true } : null);
      setShowApplyModal(false);
    } catch (error) {
      console.error('Failed to apply:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    searchJobs();
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      location: '',
      workArrangement: [],
      employmentType: [],
      experienceLevel: [],
      indigenousEmployers: false,
      postedWithin: '',
      remote: false,
    });
    setPage(1);
  };

  const displayedJobs = activeTab === 'recommended' ? recommendedJobs : jobs;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Find Jobs</h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
              placeholder="Job title, keywords, or company"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="w-52">
            <select
              value={filters.location}
              onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Locations</option>
              {australianCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <Button type="submit">Search</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </Button>
        </form>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          {(['search', 'recommended', 'saved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium rounded-lg capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'search' ? 'All Jobs' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Filters</h3>
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <FilterCheckboxGroup
              title="Work Arrangement"
              options={workArrangementOptions}
              selected={filters.workArrangement}
              onChange={(v) => setFilters(f => ({ ...f, workArrangement: v }))}
            />
            <FilterCheckboxGroup
              title="Employment Type"
              options={employmentTypeOptions}
              selected={filters.employmentType}
              onChange={(v) => setFilters(f => ({ ...f, employmentType: v }))}
            />
            <FilterCheckboxGroup
              title="Experience Level"
              options={experienceLevelOptions}
              selected={filters.experienceLevel}
              onChange={(v) => setFilters(f => ({ ...f, experienceLevel: v }))}
            />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Posted</h4>
              <select
                value={filters.postedWithin}
                onChange={(e) => setFilters(f => ({ ...f, postedWithin: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Any time</option>
                {postedWithinOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Special</h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.indigenousEmployers}
                  onChange={(e) => setFilters(f => ({ ...f, indigenousEmployers: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">🌏 Indigenous Employers</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Job List */}
        <div className="w-full lg:w-1/2 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : displayedJobs.length > 0 ? (
            <>
              <p className="text-sm text-gray-500 mb-2">
                {activeTab === 'search' ? `${total} jobs found` : `${displayedJobs.length} jobs`}
              </p>
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onSelect={() => setSelectedJob(job)}
                  onSave={() => handleSave(job)}
                />
              ))}
              {activeTab === 'search' && totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">💼</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No jobs found</h3>
              <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
            </div>
          )}
        </div>

        {/* Job Detail */}
        <div className="hidden lg:block w-1/2 p-4">
          {selectedJob ? (
            <JobDetailPanel
              job={selectedJob}
              onApply={() => setShowApplyModal(true)}
              onSave={() => handleSave(selectedJob)}
              onClose={() => setSelectedJob(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl">
              <p className="text-gray-500">Select a job to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <ApplyModal
          job={selectedJob}
          onClose={() => setShowApplyModal(false)}
          onSubmit={handleApply}
        />
      )}
    </div>
  );
}

export default JobSearchBrowse;
