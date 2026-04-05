'use client';

/**
 * Job Store
 * 
 * Manages job listings, search, filters, and saved jobs.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/apiClient';

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  type: 'full-time' | 'part-time' | 'contract' | 'casual' | 'internship';
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  };
  description: string;
  requirements: string[];
  benefits?: string[];
  isRemote: boolean;
  isFeatured: boolean;
  isIndigenousFriendly: boolean;
  postedAt: string;
  closingDate?: string;
  applicationCount?: number;
  matchScore?: number;
}

interface JobFilters {
  query: string;
  location: string;
  type: string[];
  remote: boolean | null;
  salaryMin: number | null;
  salaryMax: number | null;
  indigenous: boolean;
  sortBy: 'relevance' | 'date' | 'salary' | 'match';
}

interface JobState {
  jobs: Job[];
  featuredJobs: Job[];
  savedJobs: string[];
  appliedJobs: string[];
  recentSearches: string[];
  filters: JobFilters;
  isLoading: boolean;
  hasMore: boolean;
  totalCount: number;
  currentPage: number;
}

interface JobActions {
  // Load jobs
  loadJobs: (page?: number, append?: boolean) => Promise<void>;
  loadFeaturedJobs: () => Promise<void>;
  loadJobById: (id: string) => Promise<Job | null>;
  
  // Filters
  setFilter: <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => void;
  setFilters: (filters: Partial<JobFilters>) => void;
  resetFilters: () => void;
  
  // Saved jobs
  saveJob: (jobId: string) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  loadSavedJobs: () => Promise<void>;
  
  // Applications
  applyToJob: (jobId: string, application: any) => Promise<boolean>;
  loadAppliedJobs: () => Promise<void>;
  
  // Search history
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  
  // Additional convenience methods
  toggleSaveJob: (jobId: string) => void;
  addToSearchHistory: (query: string) => void;
}

type JobStore = JobState & JobActions;

const defaultFilters: JobFilters = {
  query: '',
  location: '',
  type: [],
  remote: null,
  salaryMin: null,
  salaryMax: null,
  indigenous: false,
  sortBy: 'relevance',
};

export const useJobStore = create<JobStore>()(
  persist(
    (set, get) => ({
      // State
      jobs: [],
      featuredJobs: [],
      savedJobs: [],
      appliedJobs: [],
      recentSearches: [],
      filters: defaultFilters,
      isLoading: false,
      hasMore: true,
      totalCount: 0,
      currentPage: 1,

      // Load jobs
      loadJobs: async (page = 1, append = false) => {
        set({ isLoading: true });
        try {
          const { filters } = get();
          const params = new URLSearchParams();
          
          if (filters.query) params.append('q', filters.query);
          if (filters.location) params.append('location', filters.location);
          if (filters.type.length) params.append('type', filters.type.join(','));
          if (filters.remote !== null) params.append('remote', String(filters.remote));
          if (filters.salaryMin) params.append('salaryMin', String(filters.salaryMin));
          if (filters.salaryMax) params.append('salaryMax', String(filters.salaryMax));
          if (filters.indigenous) params.append('indigenous', 'true');
          params.append('sort', filters.sortBy);
          params.append('page', String(page));
          params.append('limit', '20');

          const { ok, data } = await api<{
            jobs: Job[];
            total: number;
            hasMore: boolean;
          }>(`/jobs?${params.toString()}`);

          if (ok && data) {
            set((state) => ({
              jobs: append ? [...state.jobs, ...data.jobs] : data.jobs,
              totalCount: data.total,
              hasMore: data.hasMore,
              currentPage: page,
              isLoading: false,
            }));
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.error('Failed to load jobs:', err);
          set({ isLoading: false });
        }
      },

      loadFeaturedJobs: async () => {
        try {
          const { ok, data } = await api<{ jobs: Job[] }>('/jobs/featured');
          if (ok && data) {
            set({ featuredJobs: data.jobs });
          }
        } catch (err) {
          console.error('Failed to load featured jobs:', err);
        }
      },

      loadJobById: async (id) => {
        try {
          const { ok, data } = await api<{ job: Job }>(`/jobs/${id}`);
          if (ok && data) {
            return data.job;
          }
          return null;
        } catch (err) {
          console.error('Failed to load job:', err);
          return null;
        }
      },

      // Filters
      setFilter: (key, value) => {
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        }));
      },

      setFilters: (filters) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      resetFilters: () => {
        set({ filters: defaultFilters });
      },

      // Saved jobs
      saveJob: async (jobId) => {
        try {
          const { ok } = await api(`/jobs/${jobId}/save`, { method: 'POST' });
          if (ok) {
            set((state) => ({
              savedJobs: [...new Set([...state.savedJobs, jobId])],
            }));
          }
        } catch (err) {
          console.error('Failed to save job:', err);
        }
      },

      unsaveJob: async (jobId) => {
        try {
          const { ok } = await api(`/jobs/${jobId}/save`, { method: 'DELETE' });
          if (ok) {
            set((state) => ({
              savedJobs: state.savedJobs.filter((id) => id !== jobId),
            }));
          }
        } catch (err) {
          console.error('Failed to unsave job:', err);
        }
      },

      loadSavedJobs: async () => {
        try {
          const { ok, data } = await api<{ jobIds: string[] }>('/jobs/saved');
          if (ok && data) {
            set({ savedJobs: data.jobIds });
          }
        } catch (err) {
          console.error('Failed to load saved jobs:', err);
        }
      },

      // Applications
      applyToJob: async (jobId, application) => {
        try {
          const { ok } = await api(`/jobs/${jobId}/apply`, {
            method: 'POST',
            body: application,
          });
          if (ok) {
            set((state) => ({
              appliedJobs: [...new Set([...state.appliedJobs, jobId])],
            }));
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to apply to job:', err);
          return false;
        }
      },

      loadAppliedJobs: async () => {
        try {
          const { ok, data } = await api<{ jobIds: string[] }>('/member/applications/job-ids');
          if (ok && data) {
            set({ appliedJobs: data.jobIds });
          }
        } catch (err) {
          console.error('Failed to load applied jobs:', err);
        }
      },

      // Search history
      addRecentSearch: (query) => {
        if (!query.trim()) return;
        set((state) => ({
          recentSearches: [
            query,
            ...state.recentSearches.filter((s) => s !== query),
          ].slice(0, 10),
        }));
      },

      clearRecentSearches: () => {
        set({ recentSearches: [] });
      },

      // Convenience method to toggle job save state
      toggleSaveJob: (jobId) => {
        const { savedJobs, saveJob, unsaveJob } = get();
        if (savedJobs.includes(jobId)) {
          unsaveJob(jobId);
        } else {
          saveJob(jobId);
        }
      },

      // Alias for addRecentSearch for compatibility
      addToSearchHistory: (query) => {
        get().addRecentSearch(query);
      },
    }),
    {
      name: 'ngurra-jobs',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedJobs: state.savedJobs,
        recentSearches: state.recentSearches,
        filters: state.filters,
      }),
    }
  )
);
