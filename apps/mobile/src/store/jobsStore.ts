/**
 * Jobs Store - Zustand state management for job listings
 * 
 * Manages:
 * - Job search and filtering
 * - Saved jobs
 * - Job applications
 * - Job recommendations
 * - Application tracking
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

// Types
export interface Company {
  id: string;
  name: string;
  logo?: string;
  isVerified: boolean;
  rapLevel?: 'REFLECT' | 'INNOVATE' | 'ELEVATE';
  industry?: string;
  size?: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: Company;
  location: string;
  locationType: 'ONSITE' | 'REMOTE' | 'HYBRID';
  employment: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CASUAL' | 'APPRENTICESHIP' | 'INTERNSHIP';
  salaryLow?: number;
  salaryHigh?: number;
  salaryCurrency: string;
  description: string;
  requirements?: string[];
  benefits?: string[];
  skills?: string[];
  experienceLevel?: 'ENTRY' | 'MID' | 'SENIOR' | 'EXECUTIVE';
  indigenousPreferred?: boolean;
  isRemoteOk?: boolean;
  isFeatured?: boolean;
  postedAt: string;
  expiresAt?: string;
  applicantCount?: number;
  viewCount?: number;
  matchScore?: number; // Personalized job match score
  matchReasons?: string[];
}

export interface SavedJob {
  id: string;
  jobId: string;
  job: JobListing;
  savedAt: string;
  notes?: string;
  reminderDate?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  job: JobListing;
  status: 'SUBMITTED' | 'VIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'WITHDRAWN';
  appliedAt: string;
  resumeId?: string;
  coverLetter?: string;
  statusHistory: Array<{
    status: string;
    date: string;
    note?: string;
  }>;
  interviewDates?: string[];
}

export interface JobSearchFilters {
  query?: string;
  location?: string;
  locationType?: string[];
  employment?: string[];
  experienceLevel?: string[];
  salaryMin?: number;
  salaryMax?: number;
  skills?: string[];
  indigenousPreferred?: boolean;
  remoteOk?: boolean;
  postedWithin?: '24h' | '7d' | '30d' | 'all';
  companyRap?: boolean;
}

interface JobsState {
  // Job listings
  jobs: JobListing[];
  featuredJobs: JobListing[];
  recommendedJobs: JobListing[];
  
  // Saved & Applications
  savedJobs: SavedJob[];
  applications: JobApplication[];
  
  // Search state
  searchFilters: JobSearchFilters;
  searchHistory: string[];
  
  // Pagination
  cursor: string | null;
  hasMore: boolean;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isApplying: boolean;
  isSaving: boolean;
  
  // Error state
  error: string | null;
  
  // Actions - Job Search
  searchJobs: (filters?: JobSearchFilters, refresh?: boolean) => Promise<void>;
  fetchFeaturedJobs: () => Promise<void>;
  fetchRecommendedJobs: () => Promise<void>;
  setSearchFilters: (filters: Partial<JobSearchFilters>) => void;
  clearFilters: () => void;
  addToSearchHistory: (query: string) => void;
  clearSearchHistory: () => void;
  
  // Actions - Job Detail
  getJobById: (jobId: string) => JobListing | undefined;
  fetchJobDetail: (jobId: string) => Promise<JobListing | null>;
  
  // Actions - Saved Jobs
  fetchSavedJobs: () => Promise<void>;
  saveJob: (jobId: string, notes?: string) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  isJobSaved: (jobId: string) => boolean;
  updateSavedJobNotes: (savedJobId: string, notes: string) => Promise<void>;
  setSavedJobReminder: (savedJobId: string, date: string) => Promise<void>;
  
  // Actions - Applications
  fetchApplications: () => Promise<void>;
  applyToJob: (jobId: string, data: { resumeId?: string; coverLetter?: string }) => Promise<void>;
  withdrawApplication: (applicationId: string) => Promise<void>;
  getApplicationForJob: (jobId: string) => JobApplication | undefined;
  
  // Actions - Utility
  refresh: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_FILTERS: JobSearchFilters = {
  query: '',
  location: '',
  locationType: [],
  employment: [],
  experienceLevel: [],
  salaryMin: undefined,
  salaryMax: undefined,
  skills: [],
  indigenousPreferred: false,
  remoteOk: false,
  postedWithin: 'all',
  companyRap: false,
};

export const useJobsStore = create<JobsState>()(
  persist(
    (set, get) => ({
      // Initial state
      jobs: [],
      featuredJobs: [],
      recommendedJobs: [],
      savedJobs: [],
      applications: [],
      searchFilters: DEFAULT_FILTERS,
      searchHistory: [],
      cursor: null,
      hasMore: true,
      isLoading: false,
      isRefreshing: false,
      isApplying: false,
      isSaving: false,
      error: null,

      // Job Search
      searchJobs: async (filters?: JobSearchFilters, refresh = false) => {
        const state = get();
        if (state.isLoading && !refresh) return;
        
        const effectiveFilters = filters || state.searchFilters;
        
        set({
          isLoading: !refresh,
          isRefreshing: refresh,
          error: null,
          ...(refresh && { jobs: [], cursor: null, hasMore: true }),
        });

        try {
          const params = new URLSearchParams();
          
          if (effectiveFilters.query) params.append('q', effectiveFilters.query);
          if (effectiveFilters.location) params.append('location', effectiveFilters.location);
          if (effectiveFilters.locationType?.length) {
            params.append('locationType', effectiveFilters.locationType.join(','));
          }
          if (effectiveFilters.employment?.length) {
            params.append('employment', effectiveFilters.employment.join(','));
          }
          if (effectiveFilters.experienceLevel?.length) {
            params.append('experienceLevel', effectiveFilters.experienceLevel.join(','));
          }
          if (effectiveFilters.salaryMin) params.append('salaryMin', effectiveFilters.salaryMin.toString());
          if (effectiveFilters.salaryMax) params.append('salaryMax', effectiveFilters.salaryMax.toString());
          if (effectiveFilters.skills?.length) {
            params.append('skills', effectiveFilters.skills.join(','));
          }
          if (effectiveFilters.indigenousPreferred) params.append('indigenousPreferred', 'true');
          if (effectiveFilters.remoteOk) params.append('remoteOk', 'true');
          if (effectiveFilters.postedWithin && effectiveFilters.postedWithin !== 'all') {
            params.append('postedWithin', effectiveFilters.postedWithin);
          }
          if (effectiveFilters.companyRap) params.append('companyRap', 'true');
          
          if (!refresh && state.cursor) params.append('cursor', state.cursor);
          params.append('limit', '20');

          const response = await api.get(`/jobs?${params.toString()}`);
          
          const newJobs = response.data.jobs || response.data.data || [];
          const nextCursor = response.data.cursor || response.data.nextCursor;
          const hasMore = response.data.hasMore ?? (newJobs.length === 20);

          set(prev => ({
            jobs: refresh ? newJobs : [...prev.jobs, ...newJobs],
            cursor: nextCursor || null,
            hasMore,
            searchFilters: effectiveFilters,
            isLoading: false,
            isRefreshing: false,
          }));
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch jobs',
            isLoading: false,
            isRefreshing: false,
          });
        }
      },

      fetchFeaturedJobs: async () => {
        try {
          const response = await api.get('/jobs/featured');
          set({ featuredJobs: response.data.jobs || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch featured jobs:', error);
        }
      },

      fetchRecommendedJobs: async () => {
        try {
          const response = await api.get('/jobs/recommended');
          set({ recommendedJobs: response.data.jobs || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch recommended jobs:', error);
        }
      },

      setSearchFilters: (filters: Partial<JobSearchFilters>) => {
        set(prev => ({
          searchFilters: { ...prev.searchFilters, ...filters },
        }));
      },

      clearFilters: () => {
        set({ searchFilters: DEFAULT_FILTERS });
      },

      addToSearchHistory: (query: string) => {
        if (!query.trim()) return;
        set(prev => {
          const history = [query, ...prev.searchHistory.filter(q => q !== query)];
          return { searchHistory: history.slice(0, 10) }; // Keep last 10
        });
      },

      clearSearchHistory: () => {
        set({ searchHistory: [] });
      },

      // Job Detail
      getJobById: (jobId: string) => {
        const state = get();
        return (
          state.jobs.find(j => j.id === jobId) ||
          state.featuredJobs.find(j => j.id === jobId) ||
          state.recommendedJobs.find(j => j.id === jobId) ||
          state.savedJobs.find(sj => sj.jobId === jobId)?.job
        );
      },

      fetchJobDetail: async (jobId: string) => {
        try {
          const response = await api.get(`/jobs/${jobId}`);
          return response.data.job || response.data;
        } catch (error: any) {
          console.warn('Failed to fetch job detail:', error);
          return null;
        }
      },

      // Saved Jobs
      fetchSavedJobs: async () => {
        try {
          const response = await api.get('/jobs/saved');
          set({ savedJobs: response.data.savedJobs || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch saved jobs:', error);
        }
      },

      saveJob: async (jobId: string, notes?: string) => {
        set({ isSaving: true });
        try {
          const response = await api.post('/jobs/save', { jobId, notes });
          const savedJob = response.data.savedJob || response.data;
          
          set(prev => ({
            savedJobs: [...prev.savedJobs, savedJob],
            isSaving: false,
          }));
        } catch (error: any) {
          set({ error: error.message || 'Failed to save job', isSaving: false });
        }
      },

      unsaveJob: async (jobId: string) => {
        set({ isSaving: true });
        try {
          await api.delete(`/jobs/save/${jobId}`);
          
          set(prev => ({
            savedJobs: prev.savedJobs.filter(sj => sj.jobId !== jobId),
            isSaving: false,
          }));
        } catch (error: any) {
          set({ error: error.message || 'Failed to unsave job', isSaving: false });
        }
      },

      isJobSaved: (jobId: string) => {
        return get().savedJobs.some(sj => sj.jobId === jobId);
      },

      updateSavedJobNotes: async (savedJobId: string, notes: string) => {
        try {
          await api.patch(`/jobs/saved/${savedJobId}`, { notes });
          
          set(prev => ({
            savedJobs: prev.savedJobs.map(sj =>
              sj.id === savedJobId ? { ...sj, notes } : sj
            ),
          }));
        } catch (error: any) {
          console.warn('Failed to update notes:', error);
        }
      },

      setSavedJobReminder: async (savedJobId: string, date: string) => {
        try {
          await api.patch(`/jobs/saved/${savedJobId}`, { reminderDate: date });
          
          set(prev => ({
            savedJobs: prev.savedJobs.map(sj =>
              sj.id === savedJobId ? { ...sj, reminderDate: date } : sj
            ),
          }));
        } catch (error: any) {
          console.warn('Failed to set reminder:', error);
        }
      },

      // Applications
      fetchApplications: async () => {
        try {
          const response = await api.get('/applications/me');
          set({ applications: response.data.applications || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch applications:', error);
        }
      },

      applyToJob: async (jobId: string, data: { resumeId?: string; coverLetter?: string }) => {
        set({ isApplying: true, error: null });
        try {
          const response = await api.post(`/jobs/${jobId}/apply`, data);
          const application = response.data.application || response.data;
          
          set(prev => ({
            applications: [...prev.applications, application],
            isApplying: false,
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to submit application',
            isApplying: false,
          });
          throw error;
        }
      },

      withdrawApplication: async (applicationId: string) => {
        try {
          await api.post(`/applications/${applicationId}/withdraw`);
          
          set(prev => ({
            applications: prev.applications.map(app =>
              app.id === applicationId 
                ? { ...app, status: 'WITHDRAWN' as const }
                : app
            ),
          }));
        } catch (error: any) {
          console.warn('Failed to withdraw application:', error);
        }
      },

      getApplicationForJob: (jobId: string) => {
        return get().applications.find(app => app.jobId === jobId);
      },

      // Utility
      refresh: async () => {
        const state = get();
        await Promise.all([
          state.searchJobs(undefined, true),
          state.fetchFeaturedJobs(),
          state.fetchRecommendedJobs(),
          state.fetchSavedJobs(),
          state.fetchApplications(),
        ]);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'ngurra-jobs-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        savedJobs: state.savedJobs,
        searchHistory: state.searchHistory,
        searchFilters: state.searchFilters,
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useJobs = () => useJobsStore((state) => state.jobs);
export const useFeaturedJobs = () => useJobsStore((state) => state.featuredJobs);
export const useRecommendedJobs = () => useJobsStore((state) => state.recommendedJobs);
export const useSavedJobs = () => useJobsStore((state) => state.savedJobs);
export const useApplications = () => useJobsStore((state) => state.applications);
export const useJobsLoading = () => useJobsStore((state) => state.isLoading);
export const useJobsError = () => useJobsStore((state) => state.error);
