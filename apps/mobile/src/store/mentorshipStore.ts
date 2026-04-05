/**
 * Mentorship Store - Zustand state management for mentorship features
 * 
 * Manages:
 * - Mentor discovery and search
 * - Mentorship sessions (booking, scheduling)
 * - Mentor circles/groups
 * - Session history and reviews
 * - Mentor availability
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

// Types
export interface MentorProfile {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  title: string;
  bio: string;
  expertise: string[];
  industries: string[];
  yearsExperience: number;
  hourlyRate?: number;
  isFreeIntroAvailable: boolean;
  isAvailableNow?: boolean;
  rating: number;
  reviewCount: number;
  sessionCount: number;
  responseTime?: string; // e.g., "Usually responds within 24h"
  languages?: string[];
  location?: string;
  culturalBackground?: {
    indigenousAffiliation?: string;
    culturalExperience?: string[];
  };
  isVerified: boolean;
  availableSlots?: AvailabilitySlot[];
  badges?: string[];
}

export interface AvailabilitySlot {
  id: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  timezone: string;
}

export interface MentorSession {
  id: string;
  mentorId: string;
  mentor: MentorProfile;
  menteeId: string;
  scheduledAt: string;
  duration: number; // minutes
  type: 'VIDEO' | 'AUDIO' | 'CHAT' | 'IN_PERSON';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  topic?: string;
  notes?: string;
  meetingUrl?: string;
  price?: number;
  paidAt?: string;
  rating?: number;
  review?: string;
  cancelledBy?: string;
  cancelReason?: string;
  createdAt: string;
}

export interface MentorCircle {
  id: string;
  name: string;
  description: string;
  coverImage?: string;
  mentorId: string;
  mentor: MentorProfile;
  memberCount: number;
  isPrivate: boolean;
  topics: string[];
  meetingFrequency?: string;
  nextMeetingAt?: string;
  isMember?: boolean;
  isPending?: boolean;
  createdAt: string;
}

export interface SessionReview {
  id: string;
  sessionId: string;
  mentorId: string;
  menteeId: string;
  rating: number;
  review?: string;
  tags?: string[]; // e.g., "Helpful", "Knowledgeable", "Great listener"
  createdAt: string;
}

export interface MentorSearchFilters {
  query?: string;
  expertise?: string[];
  industries?: string[];
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  availableNow?: boolean;
  freeIntro?: boolean;
  indigenousBackground?: boolean;
  languages?: string[];
}

interface MentorshipState {
  // Mentor discovery
  mentors: MentorProfile[];
  featuredMentors: MentorProfile[];
  recommendedMentors: MentorProfile[];
  
  // Sessions
  upcomingSessions: MentorSession[];
  pastSessions: MentorSession[];
  
  // Circles
  myCircles: MentorCircle[];
  discoveryCircles: MentorCircle[];
  
  // Current mentor detail
  selectedMentor: MentorProfile | null;
  
  // Search state
  searchFilters: MentorSearchFilters;
  
  // Pagination
  mentorsCursor: string | null;
  mentorsHasMore: boolean;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isBooking: boolean;
  
  // Error state
  error: string | null;
  
  // Actions - Mentor Discovery
  searchMentors: (filters?: MentorSearchFilters, refresh?: boolean) => Promise<void>;
  fetchFeaturedMentors: () => Promise<void>;
  fetchRecommendedMentors: () => Promise<void>;
  getMentorById: (mentorId: string) => Promise<MentorProfile | null>;
  setSearchFilters: (filters: Partial<MentorSearchFilters>) => void;
  clearFilters: () => void;
  
  // Actions - Sessions
  fetchUpcomingSessions: () => Promise<void>;
  fetchPastSessions: () => Promise<void>;
  bookSession: (data: {
    mentorId: string;
    scheduledAt: string;
    duration: number;
    type: string;
    topic?: string;
    notes?: string;
  }) => Promise<MentorSession>;
  cancelSession: (sessionId: string, reason?: string) => Promise<void>;
  rescheduleSession: (sessionId: string, newDate: string) => Promise<void>;
  submitReview: (sessionId: string, rating: number, review?: string, tags?: string[]) => Promise<void>;
  
  // Actions - Circles
  fetchMyCircles: () => Promise<void>;
  fetchDiscoveryCircles: () => Promise<void>;
  joinCircle: (circleId: string) => Promise<void>;
  leaveCircle: (circleId: string) => Promise<void>;
  
  // Actions - Availability
  getMentorAvailability: (mentorId: string, date: string) => Promise<AvailabilitySlot[]>;
  
  // Utility
  refresh: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_FILTERS: MentorSearchFilters = {
  query: '',
  expertise: [],
  industries: [],
  priceMin: undefined,
  priceMax: undefined,
  rating: undefined,
  availableNow: false,
  freeIntro: false,
  indigenousBackground: false,
  languages: [],
};

export const useMentorshipStore = create<MentorshipState>()(
  persist(
    (set, get) => ({
      // Initial state
      mentors: [],
      featuredMentors: [],
      recommendedMentors: [],
      upcomingSessions: [],
      pastSessions: [],
      myCircles: [],
      discoveryCircles: [],
      selectedMentor: null,
      searchFilters: DEFAULT_FILTERS,
      mentorsCursor: null,
      mentorsHasMore: true,
      isLoading: false,
      isRefreshing: false,
      isBooking: false,
      error: null,

      // Mentor Discovery
      searchMentors: async (filters?: MentorSearchFilters, refresh = false) => {
        const state = get();
        if (state.isLoading && !refresh) return;
        
        const effectiveFilters = filters || state.searchFilters;
        
        set({
          isLoading: !refresh,
          isRefreshing: refresh,
          error: null,
          ...(refresh && { mentors: [], mentorsCursor: null, mentorsHasMore: true }),
        });

        try {
          const params = new URLSearchParams();
          
          if (effectiveFilters.query) params.append('q', effectiveFilters.query);
          if (effectiveFilters.expertise?.length) {
            params.append('expertise', effectiveFilters.expertise.join(','));
          }
          if (effectiveFilters.industries?.length) {
            params.append('industries', effectiveFilters.industries.join(','));
          }
          if (effectiveFilters.priceMin) params.append('priceMin', effectiveFilters.priceMin.toString());
          if (effectiveFilters.priceMax) params.append('priceMax', effectiveFilters.priceMax.toString());
          if (effectiveFilters.rating) params.append('minRating', effectiveFilters.rating.toString());
          if (effectiveFilters.availableNow) params.append('availableNow', 'true');
          if (effectiveFilters.freeIntro) params.append('freeIntro', 'true');
          if (effectiveFilters.indigenousBackground) params.append('indigenousBackground', 'true');
          if (effectiveFilters.languages?.length) {
            params.append('languages', effectiveFilters.languages.join(','));
          }
          
          if (!refresh && state.mentorsCursor) params.append('cursor', state.mentorsCursor);
          params.append('limit', '20');

          const response = await api.get(`/mentors?${params.toString()}`);
          
          const newMentors = response.data.mentors || response.data.data || [];
          const nextCursor = response.data.cursor || response.data.nextCursor;
          const hasMore = response.data.hasMore ?? (newMentors.length === 20);

          set(prev => ({
            mentors: refresh ? newMentors : [...prev.mentors, ...newMentors],
            mentorsCursor: nextCursor || null,
            mentorsHasMore: hasMore,
            searchFilters: effectiveFilters,
            isLoading: false,
            isRefreshing: false,
          }));
        } catch (error: any) {
          set({
            error: error.message || 'Failed to fetch mentors',
            isLoading: false,
            isRefreshing: false,
          });
        }
      },

      fetchFeaturedMentors: async () => {
        try {
          const response = await api.get('/mentors/featured');
          set({ featuredMentors: response.data.mentors || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch featured mentors:', error);
        }
      },

      fetchRecommendedMentors: async () => {
        try {
          const response = await api.get('/mentors/recommended');
          set({ recommendedMentors: response.data.mentors || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch recommended mentors:', error);
        }
      },

      getMentorById: async (mentorId: string) => {
        try {
          const response = await api.get(`/mentors/${mentorId}`);
          const mentor = response.data.mentor || response.data;
          set({ selectedMentor: mentor });
          return mentor;
        } catch (error: any) {
          console.warn('Failed to fetch mentor:', error);
          return null;
        }
      },

      setSearchFilters: (filters: Partial<MentorSearchFilters>) => {
        set(prev => ({
          searchFilters: { ...prev.searchFilters, ...filters },
        }));
      },

      clearFilters: () => {
        set({ searchFilters: DEFAULT_FILTERS });
      },

      // Sessions
      fetchUpcomingSessions: async () => {
        try {
          const response = await api.get('/mentorship/sessions?status=upcoming');
          set({ upcomingSessions: response.data.sessions || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch upcoming sessions:', error);
        }
      },

      fetchPastSessions: async () => {
        try {
          const response = await api.get('/mentorship/sessions?status=past');
          set({ pastSessions: response.data.sessions || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch past sessions:', error);
        }
      },

      bookSession: async (data) => {
        set({ isBooking: true, error: null });
        try {
          const response = await api.post('/mentorship/sessions', data);
          const session = response.data.session || response.data;
          
          set(prev => ({
            upcomingSessions: [...prev.upcomingSessions, session],
            isBooking: false,
          }));
          
          return session;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to book session',
            isBooking: false,
          });
          throw error;
        }
      },

      cancelSession: async (sessionId: string, reason?: string) => {
        try {
          await api.post(`/mentorship/sessions/${sessionId}/cancel`, { reason });
          
          set(prev => ({
            upcomingSessions: prev.upcomingSessions.map(s =>
              s.id === sessionId ? { ...s, status: 'CANCELLED' as const } : s
            ),
          }));
        } catch (error: any) {
          console.warn('Failed to cancel session:', error);
          throw error;
        }
      },

      rescheduleSession: async (sessionId: string, newDate: string) => {
        try {
          const response = await api.post(`/mentorship/sessions/${sessionId}/reschedule`, { 
            scheduledAt: newDate 
          });
          const updatedSession = response.data.session || response.data;
          
          set(prev => ({
            upcomingSessions: prev.upcomingSessions.map(s =>
              s.id === sessionId ? updatedSession : s
            ),
          }));
        } catch (error: any) {
          console.warn('Failed to reschedule session:', error);
          throw error;
        }
      },

      submitReview: async (sessionId: string, rating: number, review?: string, tags?: string[]) => {
        try {
          await api.post(`/mentorship/sessions/${sessionId}/review`, { 
            rating, 
            review,
            tags,
          });
          
          set(prev => ({
            pastSessions: prev.pastSessions.map(s =>
              s.id === sessionId ? { ...s, rating, review } : s
            ),
          }));
        } catch (error: any) {
          console.warn('Failed to submit review:', error);
          throw error;
        }
      },

      // Circles
      fetchMyCircles: async () => {
        try {
          const response = await api.get('/mentorship/circles/my');
          set({ myCircles: response.data.circles || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch my circles:', error);
        }
      },

      fetchDiscoveryCircles: async () => {
        try {
          const response = await api.get('/mentorship/circles/discover');
          set({ discoveryCircles: response.data.circles || response.data.data || [] });
        } catch (error: any) {
          console.warn('Failed to fetch discovery circles:', error);
        }
      },

      joinCircle: async (circleId: string) => {
        try {
          await api.post(`/mentorship/circles/${circleId}/join`);
          
          set(prev => {
            const circle = prev.discoveryCircles.find(c => c.id === circleId);
            if (circle) {
              return {
                myCircles: [...prev.myCircles, { ...circle, isMember: true }],
                discoveryCircles: prev.discoveryCircles.map(c =>
                  c.id === circleId ? { ...c, isMember: true } : c
                ),
              };
            }
            return prev;
          });
        } catch (error: any) {
          console.warn('Failed to join circle:', error);
          throw error;
        }
      },

      leaveCircle: async (circleId: string) => {
        try {
          await api.post(`/mentorship/circles/${circleId}/leave`);
          
          set(prev => ({
            myCircles: prev.myCircles.filter(c => c.id !== circleId),
            discoveryCircles: prev.discoveryCircles.map(c =>
              c.id === circleId ? { ...c, isMember: false } : c
            ),
          }));
        } catch (error: any) {
          console.warn('Failed to leave circle:', error);
          throw error;
        }
      },

      // Availability
      getMentorAvailability: async (mentorId: string, date: string) => {
        try {
          const response = await api.get(`/mentors/${mentorId}/availability?date=${date}`);
          return response.data.slots || response.data.data || [];
        } catch (error: any) {
          console.warn('Failed to fetch availability:', error);
          return [];
        }
      },

      // Utility
      refresh: async () => {
        const state = get();
        await Promise.all([
          state.searchMentors(undefined, true),
          state.fetchFeaturedMentors(),
          state.fetchRecommendedMentors(),
          state.fetchUpcomingSessions(),
          state.fetchPastSessions(),
          state.fetchMyCircles(),
        ]);
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'ngurra-mentorship-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        searchFilters: state.searchFilters,
        // Don't persist sessions as they need fresh data
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useMentors = () => useMentorshipStore((state) => state.mentors);
export const useFeaturedMentors = () => useMentorshipStore((state) => state.featuredMentors);
export const useUpcomingSessions = () => useMentorshipStore((state) => state.upcomingSessions);
export const usePastSessions = () => useMentorshipStore((state) => state.pastSessions);
export const useMyCircles = () => useMentorshipStore((state) => state.myCircles);
export const useMentorshipLoading = () => useMentorshipStore((state) => state.isLoading);
export const useMentorshipError = () => useMentorshipStore((state) => state.error);
