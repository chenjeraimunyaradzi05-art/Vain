'use client';

import React from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Briefcase, 
  Building2, 
  Clock, 
  DollarSign, 
  Calendar,
  ChevronRight, 
  Crown, 
  Gem,
  Heart,
  Share2,
  ExternalLink,
  Users,
  Award,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import { Badge, RAPBadge, VerifiedBadge } from './ui/Badge';
import { Avatar } from './ui/Avatar';

export interface JobData {
  id: string;
  title: string;
  slug: string;
  company: {
    id?: string;
    companyName: string;
    logo?: string;
    isVerified?: boolean;
    isRAPCertified?: boolean;
    industry?: string;
  };
  location: string;
  locationType?: 'onsite' | 'remote' | 'hybrid';
  employment: string;
  salaryLow?: number;
  salaryHigh?: number;
  salaryType?: 'yearly' | 'hourly' | 'daily';
  description?: string;
  requirements?: string[];
  benefits?: string[];
  closingDate?: string;
  postedDate?: string;
  isFeatured?: boolean;
  isIndigenousDesignated?: boolean;
  applicantCount?: number;
  isSaved?: boolean;
}

interface JobCardProps {
  job: JobData;
  variant?: 'default' | 'compact' | 'featured' | 'horizontal';
  showActions?: boolean;
  showApplicantCount?: boolean;
  onSave?: (jobId: string) => void;
  onShare?: (job: JobData) => void;
  className?: string;
}

interface JobListProps {
  jobs: JobData[];
  loading?: boolean;
  variant?: 'grid' | 'list';
  emptyMessage?: string;
  showActions?: boolean;
  className?: string;
}

function formatSalary(low?: number, high?: number, type: string = 'yearly'): string {
  if (!low && !high) return 'Competitive';
  
  const format = (num: number) => {
    if (type === 'yearly') {
      return `$${(num / 1000).toFixed(0)}k`;
    }
    return `$${num.toLocaleString()}`;
  };

  if (low && high) {
    return `${format(low)} - ${format(high)}`;
  }
  return low ? `From ${format(low)}` : `Up to ${format(high!)}`;
}

function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function JobCard({
  job,
  variant = 'default',
  showActions = true,
  showApplicantCount = false,
  onSave,
  onShare,
  className = '',
}: JobCardProps) {
  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSave?.(job.id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.(job);
  };

  if (variant === 'compact') {
    return (
      <Link
        href={`/jobs/${job.slug}`}
        className={`
          block p-4 rounded-lg border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600
          transition-all duration-200 group
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          <Avatar 
            src={job.company.logo} 
            name={job.company.companyName} 
            size="sm" 
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600">
              {job.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {job.company.companyName} • {job.location}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500" />
        </div>
      </Link>
    );
  }

  if (variant === 'horizontal') {
    return (
      <Link
        href={`/jobs/${job.slug}`}
        className={`
          block p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 hover:shadow-md hover:-translate-y-0.5
          transition-all duration-200 group
          ${job.isFeatured ? 'ring-2 ring-amber-400/50' : ''}
          ${className}
        `}
      >
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Company Logo */}
          <div className="flex-shrink-0">
            <Avatar 
              src={job.company.logo} 
              name={job.company.companyName} 
              size="lg"
              variant="rounded"
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {job.isFeatured && (
                <Badge variant="gold" size="xs" icon={<Crown className="w-3 h-3" />}>
                  Featured
                </Badge>
              )}
              {job.isIndigenousDesignated && (
                <Badge variant="emerald" size="xs">Indigenous Designated</Badge>
              )}
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
              {job.title}
            </h3>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {job.company.companyName}
                {job.company.isVerified && <Gem className="w-3 h-3 text-blue-500" />}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" />
                {formatEmploymentType(job.employment)}
              </span>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
            <div className="text-right">
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatSalary(job.salaryLow, job.salaryHigh, job.salaryType)}
              </p>
              {job.postedDate && (
                <p className="text-xs text-gray-400">{getTimeAgo(job.postedDate)}</p>
              )}
            </div>
            
            {showActions && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  aria-label={job.isSaved ? 'Remove from saved' : 'Save job'}
                >
                  {job.isSaved ? (
                    <BookmarkCheck className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Bookmark className="w-5 h-5" />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Default card variant
  return (
    <Link
      href={`/jobs/${job.slug}`}
      className={`
        group relative block p-6 rounded-xl border border-gray-100 dark:border-gray-700
        bg-white dark:bg-gray-800 shadow-sm hover:shadow-md
        transition-all duration-200 hover:-translate-y-1
        ${job.isFeatured ? 'ring-2 ring-amber-400/50' : ''}
        ${className}
      `}
    >
      {/* Featured Badge */}
      {job.isFeatured && (
        <div className="absolute -top-3 -right-3 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
          <Crown className="w-3 h-3" />
          FEATURED
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-3">
          <Avatar 
            src={job.company.logo} 
            name={job.company.companyName} 
            size="md"
            variant="rounded"
          />
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <span>{job.company.companyName}</span>
              {job.company.isVerified && (
                <span className="text-blue-500" title="Verified Employer">
                  <Gem className="w-3 h-3" />
                </span>
              )}
              {job.company.isRAPCertified && <RAPBadge />}
            </div>
          </div>
        </div>

        {showActions && (
          <button
            onClick={handleSave}
            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            aria-label={job.isSaved ? 'Remove from saved' : 'Save job'}
          >
            <Heart className={`w-5 h-5 ${job.isSaved ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        )}
      </div>

      <div className="space-y-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{job.location}</span>
          {job.locationType && (
            <Badge variant="secondary" size="xs">
              {job.locationType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4" />
          <span>{formatEmploymentType(job.employment)}</span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          <span>{formatSalary(job.salaryLow, job.salaryHigh, job.salaryType)}</span>
        </div>
      </div>

      {/* Tags */}
      {job.isIndigenousDesignated && (
        <div className="mb-4">
          <Badge variant="emerald" size="sm" icon={<Award className="w-3 h-3" />}>
            Indigenous Designated
          </Badge>
        </div>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {job.postedDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getTimeAgo(job.postedDate)}
            </span>
          )}
          {showApplicantCount && job.applicantCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {job.applicantCount} applicants
            </span>
          )}
        </div>
        <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full group-hover:bg-blue-100 transition-colors">
          Apply Now
        </span>
      </div>
    </Link>
  );
}

// Job List Component for displaying multiple jobs
export function JobList({
  jobs,
  loading = false,
  variant = 'grid',
  emptyMessage = 'No jobs found',
  showActions = true,
  className = '',
}: JobListProps) {
  if (loading) {
    const skeletonCount = variant === 'grid' ? 6 : 4;
    return (
      <div className={variant === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <div className="flex gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12">
        <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`space-y-4 ${className}`}>
        {jobs.map(job => (
          <JobCard key={job.id} job={job} variant="horizontal" showActions={showActions} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {jobs.map(job => (
        <JobCard key={job.id} job={job} showActions={showActions} />
      ))}
    </div>
  );
}

export default JobCard;
