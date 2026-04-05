'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '../Button';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';

/**
 * CompanyProfiles - Browse and view employer profiles
 * 
 * Features:
 * - Browse companies
 * - Company details with culture info
 * - Indigenous employer certification
 * - Job listings per company
 * - Company reviews
 * - Follow companies
 */

interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  coverImage?: string;
  tagline?: string;
  description: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  founded?: number;
  headquarters: {
    city: string;
    state: string;
    country: string;
  };
  website?: string;
  isIndigenousOwned: boolean;
  isIndigenousFriendly: boolean;
  indigenousCertifications?: string[];
  culturalCommitments?: string[];
  values: string[];
  benefits: string[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  stats: {
    openJobs: number;
    totalEmployees?: number;
    indigenousRepresentation?: number;
    averageRating: number;
    reviewCount: number;
  };
  isFollowing: boolean;
}

interface CompanyReview {
  id: string;
  rating: number;
  title: string;
  pros: string;
  cons: string;
  advice?: string;
  position: string;
  employmentStatus: 'current' | 'former';
  isAnonymous: boolean;
  author?: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
  isHelpful: number;
  culturalRating?: number;
}

interface Job {
  id: string;
  title: string;
  location: string;
  workArrangement: 'onsite' | 'remote' | 'hybrid';
  employmentType: string;
  salary?: {
    min: number;
    max: number;
  };
  postedAt: string;
}

// API functions
const companiesApi = {
  async getCompanies(params?: {
    search?: string;
    industry?: string;
    indigenousOwned?: boolean;
    size?: string;
    page?: number;
  }): Promise<{ companies: Company[]; total: number; pages: number }> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.industry) searchParams.set('industry', params.industry);
    if (params?.indigenousOwned) searchParams.set('indigenousOwned', 'true');
    if (params?.size) searchParams.set('size', params.size);
    if (params?.page) searchParams.set('page', String(params.page));
    
    const res = await fetch(`/api/companies?${searchParams}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
  },

  async getCompany(slug: string): Promise<Company> {
    const res = await fetch(`/api/companies/${slug}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch company');
    return res.json();
  },

  async getCompanyJobs(companyId: string): Promise<{ jobs: Job[] }> {
    const res = await fetch(`/api/companies/${companyId}/jobs`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  async getCompanyReviews(companyId: string): Promise<{ reviews: CompanyReview[] }> {
    const res = await fetch(`/api/companies/${companyId}/reviews`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch reviews');
    return res.json();
  },

  async followCompany(companyId: string): Promise<void> {
    const res = await fetch(`/api/companies/${companyId}/follow`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to follow company');
  },

  async unfollowCompany(companyId: string): Promise<void> {
    const res = await fetch(`/api/companies/${companyId}/follow`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to unfollow company');
  },

  async markReviewHelpful(reviewId: string): Promise<void> {
    const res = await fetch(`/api/reviews/${reviewId}/helpful`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to mark helpful');
  },
};

// Size labels
const sizeLabels: Record<string, string> = {
  startup: '1-10 employees',
  small: '11-50 employees',
  medium: '51-200 employees',
  large: '201-1000 employees',
  enterprise: '1000+ employees',
};

// Industries
const industries = [
  'Technology',
  'Healthcare',
  'Education',
  'Finance',
  'Government',
  'Mining',
  'Agriculture',
  'Arts & Culture',
  'Tourism',
  'Non-Profit',
  'Retail',
  'Construction',
  'Professional Services',
];

// Star Rating Component
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClass} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// Company Card
function CompanyCard({
  company,
  onSelect,
  onFollow,
}: {
  company: Company;
  onSelect: () => void;
  onFollow: () => void;
}) {
  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onSelect}
    >
      {/* Cover */}
      <div className="h-24 bg-gradient-to-r from-blue-500 to-purple-500 relative">
        {company.coverImage && (
          <OptimizedImage
            src={toCloudinaryAutoUrl(company.coverImage)}
            alt={`${company.name} cover image`}
            width={1200}
            height={96}
            className="w-full h-full object-cover"
          />
        )}
        {(company.isIndigenousOwned || company.isIndigenousFriendly) && (
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              company.isIndigenousOwned
                ? 'bg-amber-100 text-amber-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {company.isIndigenousOwned ? '🌏 Indigenous Owned' : '🤝 Indigenous Friendly'}
            </span>
          </div>
        )}
      </div>

      {/* Logo & Content */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="-mt-10 relative">
            {company.logo ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(company.logo)}
                alt={`${company.name} logo`}
                width={64}
                height={64}
                className="w-16 h-16 rounded-xl border-4 border-white dark:border-gray-800 bg-white object-contain"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-400">
                {company.name.charAt(0)}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-2">
            <h3 className="font-semibold text-gray-900 dark:text-white">{company.name}</h3>
            <p className="text-sm text-gray-500">{company.industry}</p>
          </div>
        </div>

        {company.tagline && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
            {company.tagline}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <StarRating rating={Math.round(company.stats.averageRating)} />
            <span className="text-gray-600 dark:text-gray-400">
              ({company.stats.reviewCount})
            </span>
          </div>
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {company.stats.openJobs} open jobs
          </span>
        </div>

        {/* Location */}
        <p className="text-xs text-gray-500 mt-2">
          📍 {company.headquarters.city}, {company.headquarters.state}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant={company.isFollowing ? 'outline' : 'primary'}
            onClick={onFollow}
          >
            {company.isFollowing ? 'Following' : 'Follow'}
          </Button>
          <Button variant="outline" size="sm" onClick={onSelect}>
            View Profile
          </Button>
        </div>
      </div>
    </div>
  );
}

// Company Detail Modal
function CompanyDetailModal({
  company,
  onClose,
  onFollow,
}: {
  company: Company;
  onClose: () => void;
  onFollow: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'about' | 'culture' | 'jobs' | 'reviews'>('about');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const { jobs } = await companiesApi.getCompanyJobs(company.id);
      setJobs(jobs);
    } catch (error) {
      console.error('Failed to load jobs:', error);
    }
  }, [company.id]);

  const loadReviews = useCallback(async () => {
    try {
      const { reviews } = await companiesApi.getCompanyReviews(company.id);
      setReviews(reviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    }
  }, [company.id]);

  useEffect(() => {
    if (activeTab === 'jobs' && jobs.length === 0) {
      setIsLoading(true);
      loadJobs().finally(() => setIsLoading(false));
    } else if (activeTab === 'reviews' && reviews.length === 0) {
      setIsLoading(true);
      loadReviews().finally(() => setIsLoading(false));
    }
  }, [activeTab, jobs.length, reviews.length, loadJobs, loadReviews]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 relative">
          {company.coverImage && (
            <OptimizedImage
              src={toCloudinaryAutoUrl(company.coverImage)}
              alt={`${company.name} cover image`}
              width={1200}
              height={128}
              className="w-full h-full object-cover"
            />
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-end gap-4 -mt-8">
            {company.logo ? (
              <OptimizedImage
                src={toCloudinaryAutoUrl(company.logo)}
                alt={`${company.name} logo`}
                width={80}
                height={80}
                className="w-20 h-20 rounded-xl border-4 border-white dark:border-gray-800 bg-white object-contain"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl border-4 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-400">
                {company.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{company.name}</h2>
                    {company.isIndigenousOwned && (
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                        🌏 Indigenous Owned
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500">{company.industry} · {sizeLabels[company.size]}</p>
                </div>
                <Button
                  variant={company.isFollowing ? 'outline' : 'primary'}
                  size="sm"
                  onClick={onFollow}
                >
                  {company.isFollowing ? 'Following' : 'Follow'}
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <StarRating rating={Math.round(company.stats.averageRating)} size="md" />
              <span className="font-medium">{company.stats.averageRating.toFixed(1)}</span>
              <span className="text-gray-500">({company.stats.reviewCount} reviews)</span>
            </div>
            <span className="text-gray-300">|</span>
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {company.stats.openJobs} open positions
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              📍 {company.headquarters.city}, {company.headquarters.state}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          {['about', 'culture', 'jobs', 'reviews'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-3 font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'culture' ? '🎥 Culture' : tab}
              {tab === 'jobs' && company.stats.openJobs > 0 && (
                <span className="ml-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 rounded">
                  {company.stats.openJobs}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About</h3>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                  {company.description}
                </p>
              </div>

              {/* Indigenous Commitment */}
              {(company.isIndigenousFriendly || company.isIndigenousOwned) && company.culturalCommitments && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                    🌏 Indigenous Commitment
                  </h3>
                  <ul className="space-y-2">
                    {company.culturalCommitments.map((commitment, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300">
                        <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {commitment}
                      </li>
                    ))}
                  </ul>
                  {company.indigenousCertifications && company.indigenousCertifications.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {company.indigenousCertifications.map((cert, i) => (
                        <span key={i} className="px-2 py-1 bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-xs rounded">
                          {cert}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Values */}
              {company.values.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Our Values</h3>
                  <div className="flex flex-wrap gap-2">
                    {company.values.map((value, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits — Enhanced with category icons */}
              {company.benefits.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Benefits & Perks</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {company.benefits.map((benefit, i) => {
                      const benefitIcons: Record<string, string> = {
                        health: '🏥', dental: '🦷', vision: '👁️', insurance: '🛡️',
                        remote: '🏠', flexible: '⏰', leave: '🌴', parental: '👶',
                        training: '📚', development: '🚀', mentoring: '🤝', education: '🎓',
                        gym: '💪', wellness: '🧘', food: '🍽️', travel: '✈️',
                        stock: '📈', bonus: '💰', salary: '💵', retirement: '🏦',
                        cultural: '🌏', community: '🤲', diversity: '🌈',
                      };
                      const key = Object.keys(benefitIcons).find(k => benefit.toLowerCase().includes(k));
                      const icon = key ? benefitIcons[key] : '✅';
                      return (
                        <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300">
                          <span className="text-lg flex-shrink-0">{icon}</span>
                          {benefit}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="grid grid-cols-2 gap-4">
                {company.founded && (
                  <div>
                    <p className="text-sm text-gray-500">Founded</p>
                    <p className="font-medium text-gray-900 dark:text-white">{company.founded}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Company Size</p>
                  <p className="font-medium text-gray-900 dark:text-white">{sizeLabels[company.size]}</p>
                </div>
                {company.website && (
                  <div>
                    <p className="text-sm text-gray-500">Website</p>
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {new URL(company.website).hostname}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'culture' && (
            <div className="space-y-6">
              {/* Company Intro Video */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  🎬 Company Video
                </h3>
                <div className="aspect-video rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-gray-200 dark:border-gray-700 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <div className="w-0 h-0 border-l-[20px] border-l-blue-500 border-y-[12px] border-y-transparent ml-1" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Watch our intro video</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">2:45</p>
                  </div>
                </div>
              </div>

              {/* Team Culture Video */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  👥 Life at {company.name}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {['Team Culture', 'Office Tour', 'Day in the Life', 'Community Impact'].map((title, i) => (
                    <div key={i} className="aspect-video rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                      <div className="text-center p-2">
                        <div className="w-10 h-10 rounded-full bg-white/80 dark:bg-gray-600 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform shadow-sm">
                          <div className="w-0 h-0 border-l-[10px] border-l-gray-600 dark:border-l-gray-300 border-y-[6px] border-y-transparent ml-0.5" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-xs font-medium">{title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employee Testimonials */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  💬 Employee Spotlight
                </h3>
                <div className="space-y-3">
                  {[
                    { name: 'Team Member', role: 'Software Engineer', quote: 'The mentoring culture here is incredible. I feel supported to grow both professionally and personally.', avatar: '👩🏽', years: 3 },
                    { name: 'Team Member', role: 'HR Coordinator', quote: 'Our RAP commitments are real — not just words on a page. I see genuine cultural safety every day.', avatar: '👨🏾', years: 5 },
                    { name: 'Team Member', role: 'Graduate Program', quote: 'As a CareerTrackers intern turned full-time employee, I can say the pathway programs actually work.', avatar: '👩🏻', years: 1 },
                  ].map((testimonial, i) => (
                    <div key={i} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-lg flex-shrink-0">
                          {testimonial.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 dark:text-white text-sm">{testimonial.name}</p>
                            <span className="text-gray-400 text-xs">·</span>
                            <p className="text-gray-500 text-xs">{testimonial.role}</p>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 italic">"{testimonial.quote}"</p>
                          <p className="text-gray-400 text-xs mt-2">{testimonial.years} year{testimonial.years > 1 ? 's' : ''} at {company.name}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Programs & Pathways */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  🚀 Programs & Pathways
                </h3>
                <div className="space-y-2">
                  {[
                    { name: 'Indigenous Internship Program', icon: '🌏', description: 'Paid summer internships for Aboriginal and Torres Strait Islander students', status: 'Applications Open' },
                    { name: 'Graduate Development Program', icon: '🎓', description: '2-year rotational program with mentoring and cultural support', status: 'Coming Soon' },
                    { name: 'Career Mentoring', icon: '🤝', description: 'Matched mentoring with senior leaders and cultural advisors', status: 'Always Open' },
                    { name: 'Community Partnerships', icon: '🤲', description: 'Partnerships with Indigenous organisations and community groups', status: 'Active' },
                  ].map((program, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
                      <span className="text-2xl flex-shrink-0 mt-0.5">{program.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{program.name}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0 ${
                            program.status === 'Applications Open' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            program.status === 'Coming Soon' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          }`}>{program.status}</span>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{program.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jobs' && (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : jobs.length > 0 ? (
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                    >
                      <h4 className="font-medium text-gray-900 dark:text-white">{job.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                        <span>{job.location}</span>
                        <span className="capitalize">{job.workArrangement}</span>
                        <span>{job.employmentType}</span>
                        {job.salary && (
                          <span className="text-green-600">
                            ${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No open positions at this time
                </div>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} />
                            <span className="font-medium text-gray-900 dark:text-white">{review.title}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {review.position} · {review.employmentStatus === 'current' ? 'Current Employee' : 'Former Employee'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('en-AU')}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs font-medium text-green-600 mb-1">Pros</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{review.pros}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-red-600 mb-1">Cons</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{review.cons}</p>
                        </div>
                        {review.advice && (
                          <div>
                            <p className="text-xs font-medium text-blue-600 mb-1">Advice to Management</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{review.advice}</p>
                          </div>
                        )}
                      </div>

                      {review.culturalRating && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <span className="text-gray-500">Cultural Inclusivity:</span>
                          <StarRating rating={review.culturalRating} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No reviews yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Component
export function CompanyProfiles() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [indigenousOnly, setIndigenousOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    try {
      const { companies, pages } = await companiesApi.getCompanies({
        search: searchQuery,
        industry: industryFilter,
        indigenousOwned: indigenousOnly,
        size: sizeFilter,
        page,
      });
      setCompanies(companies);
      setTotalPages(pages);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, industryFilter, indigenousOnly, sizeFilter, page]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleFollow = async (company: Company) => {
    try {
      if (company.isFollowing) {
        await companiesApi.unfollowCompany(company.id);
      } else {
        await companiesApi.followCompany(company.id);
      }
      setCompanies(prev =>
        prev.map(c =>
          c.id === company.id ? { ...c, isFollowing: !c.isFollowing } : c
        )
      );
      if (selectedCompany?.id === company.id) {
        setSelectedCompany(prev => prev ? { ...prev, isFollowing: !prev.isFollowing } : null);
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  };

  if (isLoading && companies.length === 0) {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Companies</h1>
        <p className="text-gray-500 mt-1">Explore employers and find your next opportunity</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-64 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search companies..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <select
          value={industryFilter}
          onChange={(e) => { setIndustryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Industries</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>

        <select
          value={sizeFilter}
          onChange={(e) => { setSizeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Any Size</option>
          {Object.entries(sizeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer bg-white dark:bg-gray-700">
          <input
            type="checkbox"
            checked={indigenousOnly}
            onChange={(e) => { setIndigenousOnly(e.target.checked); setPage(1); }}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            🌏 Indigenous Owned
          </span>
        </label>
      </div>

      {/* Companies Grid */}
      {companies.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onSelect={() => setSelectedCompany(company)}
                onFollow={() => handleFollow(company)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No companies found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Company Detail Modal */}
      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onFollow={() => handleFollow(selectedCompany)}
        />
      )}
    </div>
  );
}

export default CompanyProfiles;
