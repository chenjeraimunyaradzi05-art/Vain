/**
 * Jobs Dashboard Page
 * 
 * Browse and search for job opportunities with Indigenous-focused filters.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/OptimizedImage';
import { isCloudinaryPublicId } from '@/lib/cloudinary';
import api from '@/lib/apiClient';

// Types
interface Job {
  id: string;
  title: string;
  company: {
    id: string;
    name: string;
    logoUrl?: string;
    isVerified: boolean;
    isIndigenousOwned: boolean;
  };
  location: string;
  locationType: 'REMOTE' | 'HYBRID' | 'ONSITE';
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CASUAL';
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  skills: string[];
  culturalFeatures: string[];
  description: string;
  isIndigenousDesignated: boolean;
  isCulturallySafe: boolean;
  postedAt: string;
  closesAt?: string;
  applicantCount: number;
  matchScore?: number;
}

interface JobFilters {
  search: string;
  location: string;
  locationType: string[];
  employmentType: string[];
  salaryMin: number;
  indigenousDesignated: boolean;
  culturallySafe: boolean;
}

// Mock jobs data
const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Senior Software Engineer',
    company: {
      id: 'c1',
      name: 'Telstra',
      logoUrl: undefined,
      isVerified: true,
      isIndigenousOwned: false,
    },
    location: 'Sydney, NSW',
    locationType: 'HYBRID',
    employmentType: 'FULL_TIME',
    salaryRange: { min: 130000, max: 160000, currency: 'AUD' },
    skills: ['React', 'Node.js', 'TypeScript', 'AWS'],
    culturalFeatures: ['Cultural leave', 'Reconciliation Action Plan', 'Indigenous mentorship'],
    description: 'Join our Indigenous digital inclusion team...',
    isIndigenousDesignated: true,
    isCulturallySafe: true,
    postedAt: '2024-01-10',
    closesAt: '2024-02-10',
    applicantCount: 23,
    matchScore: 95,
  },
  {
    id: '2',
    title: 'Community Programs Manager',
    company: {
      id: 'c2',
      name: 'First Nations Foundation',
      logoUrl: undefined,
      isVerified: true,
      isIndigenousOwned: true,
    },
    location: 'Melbourne, VIC',
    locationType: 'ONSITE',
    employmentType: 'FULL_TIME',
    salaryRange: { min: 90000, max: 110000, currency: 'AUD' },
    skills: ['Program Management', 'Community Engagement', 'Stakeholder Management'],
    culturalFeatures: ['Indigenous-led organization', 'Cultural protocols embedded', 'Elder guidance'],
    description: 'Lead community programs across Victoria...',
    isIndigenousDesignated: true,
    isCulturallySafe: true,
    postedAt: '2024-01-08',
    applicantCount: 45,
    matchScore: 88,
  },
  {
    id: '3',
    title: 'UX Designer',
    company: {
      id: 'c3',
      name: 'Atlassian',
      logoUrl: undefined,
      isVerified: true,
      isIndigenousOwned: false,
    },
    location: 'Remote',
    locationType: 'REMOTE',
    employmentType: 'FULL_TIME',
    salaryRange: { min: 100000, max: 130000, currency: 'AUD' },
    skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'],
    culturalFeatures: ['RAP partner', 'Flexible work', 'Indigenous ERG'],
    description: 'Design accessible and inclusive products...',
    isIndigenousDesignated: false,
    isCulturallySafe: true,
    postedAt: '2024-01-12',
    applicantCount: 67,
    matchScore: 82,
  },
  {
    id: '4',
    title: 'Health Worker',
    company: {
      id: 'c4',
      name: 'Victorian Aboriginal Health Service',
      logoUrl: undefined,
      isVerified: true,
      isIndigenousOwned: true,
    },
    location: 'Fitzroy, VIC',
    locationType: 'ONSITE',
    employmentType: 'FULL_TIME',
    salaryRange: { min: 70000, max: 85000, currency: 'AUD' },
    skills: ['Health Promotion', 'Community Health', 'Cultural Safety'],
    culturalFeatures: ['Aboriginal Community Controlled', 'Cultural healing', 'Community connection'],
    description: 'Provide culturally safe health services...',
    isIndigenousDesignated: true,
    isCulturallySafe: true,
    postedAt: '2024-01-05',
    applicantCount: 12,
    matchScore: 75,
  },
  {
    id: '5',
    title: 'Data Analyst',
    company: {
      id: 'c5',
      name: 'BHP',
      logoUrl: undefined,
      isVerified: true,
      isIndigenousOwned: false,
    },
    location: 'Perth, WA',
    locationType: 'HYBRID',
    employmentType: 'FULL_TIME',
    salaryRange: { min: 95000, max: 120000, currency: 'AUD' },
    skills: ['SQL', 'Python', 'Power BI', 'Data Visualization'],
    culturalFeatures: ['Indigenous scholarship sponsor', 'Reconciliation champion'],
    description: 'Analyze operational data for insights...',
    isIndigenousDesignated: false,
    isCulturallySafe: true,
    postedAt: '2024-01-11',
    applicantCount: 34,
    matchScore: 70,
  },
];

// Format salary
const formatSalary = (salary: { min: number; max: number; currency: string }) => {
  const formatter = new Intl.NumberFormat('en-AU', { style: 'currency', currency: salary.currency, maximumFractionDigits: 0 });
  return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}`;
};

// Format date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
};

// Job Card Component
function JobCard({ job }: { job: Job }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-slate-600 transition-colors group">
      <div className="flex gap-4">
        {/* Company Logo */}
        <div className="w-14 h-14 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {job.company.logoUrl ? (
            <Image
              src={job.company.logoUrl}
              alt={job.company.name}
              width={56}
              height={56}
              cloudinary={isCloudinaryPublicId(job.company.logoUrl || '')}
            />
          ) : (
            <span className="text-2xl font-bold text-slate-400">
              {job.company.name.charAt(0)}
            </span>
          )}
        </div>

        {/* Job Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link href={`/member/jobs/${job.id}`} className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
                {job.title}
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-slate-400">{job.company.name}</span>
                {job.company.isVerified && (
                  <span className="text-blue-400" title="Verified Employer">✓</span>
                )}
                {job.company.isIndigenousOwned && (
                  <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full">
                    Indigenous Owned
                  </span>
                )}
              </div>
            </div>

            {/* Match Score */}
            {job.matchScore && (
              <div className="text-right flex-shrink-0">
                <div className={`text-lg font-bold ${
                  job.matchScore >= 90 ? 'text-green-400' :
                  job.matchScore >= 75 ? 'text-yellow-400' : 'text-slate-400'
                }`}>
                  {job.matchScore}%
                </div>
                <div className="text-xs text-slate-500">Match</div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              {job.location}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              job.locationType === 'REMOTE' ? 'bg-purple-900/50 text-purple-400' :
              job.locationType === 'HYBRID' ? 'bg-blue-900/50 text-blue-400' :
              'bg-slate-700 text-slate-300'
            }`}>
              {job.locationType.charAt(0) + job.locationType.slice(1).toLowerCase()}
            </span>
            <span>{job.employmentType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}</span>
            {job.salaryRange && (
              <span className="text-green-400 font-medium">{formatSalary(job.salaryRange)}</span>
            )}
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {job.skills.slice(0, 4).map((skill) => (
              <span key={skill} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="px-2 py-1 text-slate-500 text-xs">+{job.skills.length - 4} more</span>
            )}
          </div>

          {/* Cultural Features */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            {job.isIndigenousDesignated && (
              <span className="flex items-center gap-1 text-emerald-400 text-sm">
                <span>🌏</span> Indigenous Designated
              </span>
            )}
            {job.isCulturallySafe && (
              <span className="flex items-center gap-1 text-amber-400 text-sm">
                <span>🤝</span> Culturally Safe
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
            <div className="text-sm text-slate-500">
              <span>{formatDate(job.postedAt)}</span>
              <span className="mx-2">•</span>
              <span>{job.applicantCount} applicants</span>
            </div>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors text-sm font-medium">
              Apply Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    location: '',
    locationType: [],
    employmentType: [],
    salaryMin: 0,
    indigenousDesignated: false,
    culturallySafe: false,
  });
  const [sortBy, setSortBy] = useState<'match' | 'recent' | 'salary'>('match');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      try {
        const res = await api('/jobs/matches');
        if (res.ok && Array.isArray(res.data?.jobs)) {
          const normalized = res.data.jobs.map((job: any) => ({
            id: job.id,
            title: job.title,
            company: {
              id: job.company?.id || job.userId,
              name: job.company?.companyName || job.company?.name || 'Employer',
              logoUrl: job.company?.logo || undefined,
              isVerified: !!job.company?.isVerified,
              isIndigenousOwned: false,
            },
            location: job.location || job.company?.location || 'Remote',
            locationType: job.locationType || 'ONSITE',
            employmentType: job.employment || 'FULL_TIME',
            salaryRange: job.salaryLow || job.salaryHigh ? {
              min: job.salaryLow || 0,
              max: job.salaryHigh || job.salaryLow || 0,
              currency: 'AUD',
            } : undefined,
            skills: job.skills || [],
            culturalFeatures: job.matchReasons || [],
            description: job.description || '',
            isIndigenousDesignated: false,
            isCulturallySafe: true,
            postedAt: job.postedAt || job.createdAt || new Date().toISOString(),
            closesAt: job.expiresAt || undefined,
            applicantCount: 0,
            matchScore: job.matchScore || 0,
          }));
          setJobs(normalized);
        } else {
          setJobs(mockJobs);
        }
      } catch {
        setJobs(mockJobs);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  const filteredJobs = jobs
    .filter(job => {
      if (filters.search && !job.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !job.company.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.indigenousDesignated && !job.isIndigenousDesignated) return false;
      if (filters.culturallySafe && !job.isCulturallySafe) return false;
      if (filters.locationType.length > 0 && !filters.locationType.includes(job.locationType)) return false;
      if (filters.employmentType.length > 0 && !filters.employmentType.includes(job.employmentType)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'match') return (b.matchScore || 0) - (a.matchScore || 0);
      if (sortBy === 'recent') return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      if (sortBy === 'salary') return (b.salaryRange?.max || 0) - (a.salaryRange?.max || 0);
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white">Find Your Next Opportunity</h1>
          <p className="text-slate-400 mt-2">Discover jobs with employers committed to Indigenous employment</p>

          {/* Search Bar */}
          <div className="flex gap-4 mt-6">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search jobs, companies, or skills..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl border font-medium transition-colors ${
                showFilters ? 'bg-green-600 border-green-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </span>
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => setFilters({ ...filters, indigenousDesignated: !filters.indigenousDesignated })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.indigenousDesignated
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
              }`}
            >
              🌏 Indigenous Designated
            </button>
            <button
              onClick={() => setFilters({ ...filters, culturallySafe: !filters.culturallySafe })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.culturallySafe
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
              }`}
            >
              🤝 Culturally Safe
            </button>
            {['REMOTE', 'HYBRID', 'ONSITE'].map((type) => (
              <button
                key={type}
                onClick={() => {
                  const types = filters.locationType.includes(type)
                    ? filters.locationType.filter(t => t !== type)
                    : [...filters.locationType, type];
                  setFilters({ ...filters, locationType: types });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.locationType.includes(type)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                }`}
              >
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-slate-400">
            <span className="text-white font-medium">{filteredJobs.length}</span> jobs found
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
            >
              <option value="match">Best Match</option>
              <option value="recent">Most Recent</option>
              <option value="salary">Highest Salary</option>
            </select>
          </div>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-slate-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-xl font-medium text-white mt-4">No jobs found</h3>
            <p className="text-slate-400 mt-2">Try adjusting your filters or search terms</p>
            <button
              onClick={() => setFilters({
                search: '',
                location: '',
                locationType: [],
                employmentType: [],
                salaryMin: 0,
                indigenousDesignated: false,
                culturallySafe: false,
              })}
              className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Load More */}
        {filteredJobs.length > 0 && (
          <div className="text-center mt-8">
            <button className="px-8 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium">
              Load More Jobs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
