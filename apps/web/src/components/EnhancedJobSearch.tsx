'use client';

/**
 * Enhanced Job Search Component with Facets
 * 
 * Full-featured search with filters, faceted navigation, and saved searches.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  Search,
  Filter,
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Building2,
  ChevronDown,
  ChevronUp,
  X,
  Star,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Heart,
} from 'lucide-react';
import { debounce } from 'lodash';
import api from '@/lib/apiClient';
import { useJobStore } from '@/stores/jobStore';
import { useUIStore } from '@/stores/uiStore';

interface JobListing {
  id: string;
  title: string;
  company: { id: string; name: string; logo?: string; verified: boolean };
  location: string;
  remote: boolean;
  jobType: string;
  experienceLevel: string;
  salary?: { min: number; max: number; currency: string; period: string };
  skills: string[];
  culturalFit: boolean;
  postedAt: string;
  savedByUser: boolean;
}

interface SearchFacets {
  jobTypes: { value: string; count: number }[];
  experienceLevels: { value: string; count: number }[];
  locations: { value: string; count: number }[];
  salaryRanges: { value: string; label: string; count: number }[];
  industries: { value: string; count: number }[];
  companies: { value: string; count: number }[];
  skills: { value: string; count: number }[];
  remote: { value: boolean; count: number }[];
  culturalFit: { value: boolean; count: number }[];
}

interface SearchFilters {
  query: string;
  location: string;
  jobTypes: string[];
  experienceLevels: string[];
  salaryMin?: number;
  salaryMax?: number;
  remote?: boolean;
  culturalFit?: boolean;
  industries: string[];
  skills: string[];
  companies: string[];
  sortBy: 'relevance' | 'date' | 'salary_desc' | 'salary_asc';
}

const INITIAL_FILTERS: SearchFilters = {
  query: '',
  location: '',
  jobTypes: [],
  experienceLevels: [],
  industries: [],
  skills: [],
  companies: [],
  sortBy: 'relevance',
};

export default function EnhancedJobSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useUIStore();
  const { savedJobs, toggleSaveJob, addRecentSearch, recentSearches } = useJobStore();
  
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>({
    jobTypes: true,
    experienceLevels: true,
    locations: true,
  });

  // Parse URL params on mount
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const location = searchParams.get('location') || '';
    const jobTypes = searchParams.get('type')?.split(',').filter(Boolean) || [];
    const remote = searchParams.get('remote') === 'true';
    
    setFilters(prev => ({
      ...prev,
      query,
      location,
      jobTypes,
      remote: remote || undefined,
    }));
  }, [searchParams]);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce(async (searchFilters: SearchFilters, pageNum: number, append = false) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchFilters.query) params.append('q', searchFilters.query);
        if (searchFilters.location) params.append('location', searchFilters.location);
        if (searchFilters.jobTypes.length) params.append('types', searchFilters.jobTypes.join(','));
        if (searchFilters.experienceLevels.length) params.append('levels', searchFilters.experienceLevels.join(','));
        if (searchFilters.salaryMin) params.append('salary_min', String(searchFilters.salaryMin));
        if (searchFilters.salaryMax) params.append('salary_max', String(searchFilters.salaryMax));
        if (searchFilters.remote !== undefined) params.append('remote', String(searchFilters.remote));
        if (searchFilters.culturalFit !== undefined) params.append('cultural_fit', String(searchFilters.culturalFit));
        if (searchFilters.industries.length) params.append('industries', searchFilters.industries.join(','));
        if (searchFilters.skills.length) params.append('skills', searchFilters.skills.join(','));
        if (searchFilters.companies.length) params.append('companies', searchFilters.companies.join(','));
        params.append('sort', searchFilters.sortBy);
        params.append('page', String(pageNum));
        params.append('limit', '20');

        const { ok, data } = await api<{
          jobs: JobListing[];
          facets: SearchFacets;
          total: number;
          hasMore: boolean;
        }>(`/jobs/search?${params.toString()}`);

        if (ok && data) {
          setJobs(append ? prev => [...prev, ...data.jobs] : data.jobs);
          setFacets(data.facets);
          setTotalResults(data.total);
          setHasMore(data.hasMore);

          if (searchFilters.query && !append) {
            addRecentSearch(searchFilters.query);
          }
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Trigger search when filters change
  useEffect(() => {
    setPage(1);
    debouncedSearch(filters, 1, false);
  }, [filters, debouncedSearch]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    debouncedSearch(filters, nextPage, true);
  };

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayFilter = (key: 'jobTypes' | 'experienceLevels' | 'industries' | 'skills' | 'companies', value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.jobTypes.length) count += filters.jobTypes.length;
    if (filters.experienceLevels.length) count += filters.experienceLevels.length;
    if (filters.remote !== undefined) count++;
    if (filters.culturalFit !== undefined) count++;
    if (filters.salaryMin || filters.salaryMax) count++;
    if (filters.industries.length) count += filters.industries.length;
    if (filters.skills.length) count += filters.skills.length;
    return count;
  }, [filters]);

  const handleSaveJob = async (jobId: string) => {
    try {
      await api(`/jobs/${jobId}/save`, { method: 'POST' });
      toggleSaveJob(jobId);
      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, savedByUser: !job.savedByUser } : job
      ));
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'Failed to save job' });
    }
  };

  const formatSalary = (salary: JobListing['salary']) => {
    if (!salary) return null;
    const formatter = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: salary.currency,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(salary.min)} - ${formatter.format(salary.max)}/${salary.period}`;
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const FacetSection = ({ 
    title, 
    facetKey, 
    items, 
    selectedItems, 
    onToggle 
  }: { 
    title: string;
    facetKey: string;
    items: { value: string; count: number }[];
    selectedItems: string[];
    onToggle: (value: string) => void;
  }) => {
    const isExpanded = expandedFacets[facetKey] ?? false;
    const displayItems = isExpanded ? items : items.slice(0, 5);

    return (
      <div className="border-b border-slate-700 pb-4 mb-4">
        <button
          onClick={() => setExpandedFacets(prev => ({ ...prev, [facetKey]: !prev[facetKey] }))}
          className="w-full flex items-center justify-between text-sm font-medium text-slate-300 mb-2"
        >
          {title}
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className="space-y-1">
          {displayItems.map((item) => (
            <label key={item.value} className="flex items-center gap-2 text-sm cursor-pointer group">
              <input
                type="checkbox"
                checked={selectedItems.includes(item.value)}
                onChange={() => onToggle(item.value)}
                className="rounded border-slate-600 bg-slate-700 text-purple-600"
              />
              <span className="text-slate-400 group-hover:text-white flex-1 truncate">
                {item.value}
              </span>
              <span className="text-slate-600 text-xs">{item.count}</span>
            </label>
          ))}
        </div>
        {items.length > 5 && !isExpanded && (
          <button
            onClick={() => setExpandedFacets(prev => ({ ...prev, [facetKey]: true }))}
            className="text-sm text-purple-400 mt-2"
          >
            Show {items.length - 5} more
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Search Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
                placeholder="Job title, keywords, or company"
                className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Location Input */}
            <div className="lg:w-64 relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
                placeholder="Location"
                className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white flex items-center justify-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 bg-purple-600 rounded-full text-xs">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => updateFilter('remote', filters.remote === true ? undefined : true)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                filters.remote === true
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Remote
            </button>
            <button
              onClick={() => updateFilter('culturalFit', filters.culturalFit === true ? undefined : true)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex items-center gap-1 ${
                filters.culturalFit === true
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Heart className="w-3 h-3" />
              Cultural Fit
            </button>
            {['Full-time', 'Part-time', 'Contract'].map((type) => (
              <button
                key={type}
                onClick={() => toggleArrayFilter('jobTypes', type)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                  filters.jobTypes.includes(type)
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {type}
              </button>
            ))}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm text-slate-400 hover:text-white flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear all
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {facets && (
                <>
                  <FacetSection
                    title="Job Type"
                    facetKey="jobTypes"
                    items={facets.jobTypes}
                    selectedItems={filters.jobTypes}
                    onToggle={(v) => toggleArrayFilter('jobTypes', v)}
                  />
                  <FacetSection
                    title="Experience Level"
                    facetKey="experienceLevels"
                    items={facets.experienceLevels}
                    selectedItems={filters.experienceLevels}
                    onToggle={(v) => toggleArrayFilter('experienceLevels', v)}
                  />
                  <FacetSection
                    title="Location"
                    facetKey="locations"
                    items={facets.locations}
                    selectedItems={[]}
                    onToggle={(v) => updateFilter('location', v)}
                  />
                  <FacetSection
                    title="Industry"
                    facetKey="industries"
                    items={facets.industries}
                    selectedItems={filters.industries}
                    onToggle={(v) => toggleArrayFilter('industries', v)}
                  />
                  <FacetSection
                    title="Skills"
                    facetKey="skills"
                    items={facets.skills}
                    selectedItems={filters.skills}
                    onToggle={(v) => toggleArrayFilter('skills', v)}
                  />

                  {/* Salary Range */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-slate-300 mb-2">Salary Range</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={filters.salaryMin || ''}
                        onChange={(e) => updateFilter('salaryMin', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Min"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="number"
                        value={filters.salaryMax || ''}
                        onChange={(e) => updateFilter('salaryMax', e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Max"
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-slate-400">
                  {isLoading ? (
                    'Searching...'
                  ) : (
                    <>
                      <span className="text-white font-medium">{totalResults.toLocaleString()}</span> jobs found
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value as SearchFilters['sortBy'])}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="relevance">Most Relevant</option>
                  <option value="date">Most Recent</option>
                  <option value="salary_desc">Highest Salary</option>
                  <option value="salary_asc">Lowest Salary</option>
                </select>
                <div className="hidden sm:flex items-center border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Job Listings */}
            {isLoading && jobs.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-8 text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-2" />
                <p className="text-slate-400">Searching jobs...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-8 text-center border border-slate-700">
                <Briefcase className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                <p className="text-white font-medium mb-2">No jobs found</p>
                <p className="text-slate-400 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                {jobs.map((job) => (
                  <article
                    key={job.id}
                    className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-purple-500/50 transition-colors group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Company Logo */}
                      <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        {job.company.logo ? (
                          <OptimizedImage src={toCloudinaryAutoUrl(job.company.logo)} alt={job.company.name} width={32} height={32} className="w-8 h-8 rounded" />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-500" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                              <a href={`/jobs/${job.id}`}>{job.title}</a>
                            </h3>
                            <p className="text-sm text-slate-400 flex items-center gap-1">
                              {job.company.name}
                              {job.company.verified && (
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              )}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleSaveJob(job.id);
                            }}
                            className="p-2 text-slate-400 hover:text-purple-400"
                          >
                            {job.savedByUser ? (
                              <BookmarkCheck className="w-5 h-5 text-purple-400" />
                            ) : (
                              <Bookmark className="w-5 h-5" />
                            )}
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                          <span className="flex items-center gap-1 text-slate-400">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                            {job.remote && (
                              <span className="ml-1 px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">
                                Remote
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Briefcase className="w-4 h-4" />
                            {job.jobType}
                          </span>
                          {job.salary && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <DollarSign className="w-4 h-4" />
                              {formatSalary(job.salary)}
                            </span>
                          )}
                        </div>

                        {/* Skills */}
                        {job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {job.skills.slice(0, 4).map((skill) => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 4 && (
                              <span className="px-2 py-0.5 text-slate-500 text-xs">
                                +{job.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(job.postedAt)}
                          </span>
                          {job.culturalFit && (
                            <span className="flex items-center gap-1 text-xs text-purple-400">
                              <Heart className="w-3 h-3" />
                              Strong cultural fit
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && !isLoading && (
              <div className="mt-6 text-center">
                <button
                  onClick={loadMore}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Load More Jobs
                </button>
              </div>
            )}

            {isLoading && jobs.length > 0 && (
              <div className="mt-6 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute right-0 top-0 h-full w-80 bg-slate-800 overflow-y-auto">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-semibold text-white">Filters</h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {facets && (
                <>
                  <FacetSection
                    title="Job Type"
                    facetKey="jobTypes"
                    items={facets.jobTypes}
                    selectedItems={filters.jobTypes}
                    onToggle={(v) => toggleArrayFilter('jobTypes', v)}
                  />
                  <FacetSection
                    title="Experience Level"
                    facetKey="experienceLevels"
                    items={facets.experienceLevels}
                    selectedItems={filters.experienceLevels}
                    onToggle={(v) => toggleArrayFilter('experienceLevels', v)}
                  />
                  <FacetSection
                    title="Industry"
                    facetKey="industries"
                    items={facets.industries}
                    selectedItems={filters.industries}
                    onToggle={(v) => toggleArrayFilter('industries', v)}
                  />
                </>
              )}
            </div>
            <div className="p-4 border-t border-slate-700">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
              >
                Show {totalResults} Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
