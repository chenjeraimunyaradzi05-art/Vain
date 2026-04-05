'use client';

/**
 * Experiment Store
 * 
 * A/B testing and feature experiments management.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/apiClient';

interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: string[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
  targetPercentage: number;
  metrics?: {
    totalParticipants: number;
    conversions: Record<string, number>;
    conversionRate: Record<string, number>;
  };
}

interface ExperimentAssignment {
  experimentName: string;
  variant: string;
  assignedAt: string;
}

interface ExperimentState {
  assignments: Record<string, ExperimentAssignment>;
  experiments: Experiment[]; // For admin
  isLoading: boolean;
}

interface ExperimentActions {
  // Get variant for an experiment
  getVariant: (experimentName: string) => Promise<string>;
  
  // Track conversion
  trackConversion: (experimentName: string, eventName: string, metadata?: Record<string, unknown>) => Promise<void>;
  
  // Check if user is in variant
  isInVariant: (experimentName: string, variant: string) => boolean;
  
  // Admin functions
  loadExperiments: () => Promise<void>;
  createExperiment: (experiment: Partial<Experiment>) => Promise<boolean>;
  updateExperiment: (id: string, updates: Partial<Experiment>) => Promise<boolean>;
  
  // Clear assignments (for testing)
  clearAssignments: () => void;
}

type ExperimentStore = ExperimentState & ExperimentActions;

export const useExperimentStore = create<ExperimentStore>()(
  persist(
    (set, get) => ({
      // State
      assignments: {},
      experiments: [],
      isLoading: false,

      // Get variant
      getVariant: async (experimentName) => {
        const { assignments } = get();
        
        // Return cached assignment if exists
        if (assignments[experimentName]) {
          return assignments[experimentName].variant;
        }

        try {
          // Get anonymous ID for non-logged-in users
          let anonymousId = localStorage.getItem('ngurra_anon_id');
          if (!anonymousId) {
            anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('ngurra_anon_id', anonymousId);
          }

          const { ok, data } = await api<{ variant: string }>('/experiments/variant', {
            method: 'POST',
            body: { experimentName, anonymousId },
          });

          if (ok && data) {
            const assignment: ExperimentAssignment = {
              experimentName,
              variant: data.variant,
              assignedAt: new Date().toISOString(),
            };

            set((state) => ({
              assignments: {
                ...state.assignments,
                [experimentName]: assignment,
              },
            }));

            return data.variant;
          }
          
          return 'control';
        } catch (err) {
          console.error('Failed to get experiment variant:', err);
          return 'control';
        }
      },

      // Track conversion
      trackConversion: async (experimentName, eventName, metadata) => {
        try {
          const anonymousId = localStorage.getItem('ngurra_anon_id');
          
          await api('/experiments/convert', {
            method: 'POST',
            body: { experimentName, eventName, anonymousId, metadata },
          });
        } catch (err) {
          console.error('Failed to track conversion:', err);
        }
      },

      // Check variant
      isInVariant: (experimentName, variant) => {
        const { assignments } = get();
        return assignments[experimentName]?.variant === variant;
      },

      // Admin: Load experiments
      loadExperiments: async () => {
        set({ isLoading: true });
        try {
          const { ok, data } = await api<{ experiments: Experiment[] }>('/admin/experiments');
          if (ok && data) {
            set({ experiments: data.experiments, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          console.error('Failed to load experiments:', err);
          set({ isLoading: false });
        }
      },

      // Admin: Create experiment
      createExperiment: async (experiment) => {
        try {
          const { ok, data } = await api<{ experiment: Experiment }>('/admin/experiments', {
            method: 'POST',
            body: experiment,
          });
          if (ok && data) {
            set((state) => ({
              experiments: [...state.experiments, data.experiment],
            }));
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to create experiment:', err);
          return false;
        }
      },

      // Admin: Update experiment
      updateExperiment: async (id, updates) => {
        try {
          const { ok, data } = await api<{ experiment: Experiment }>(`/admin/experiments/${id}`, {
            method: 'PATCH',
            body: updates,
          });
          if (ok && data) {
            set((state) => ({
              experiments: state.experiments.map((e) =>
                e.id === id ? data.experiment : e
              ),
            }));
            return true;
          }
          return false;
        } catch (err) {
          console.error('Failed to update experiment:', err);
          return false;
        }
      },

      // Clear assignments
      clearAssignments: () => {
        set({ assignments: {} });
      },
    }),
    {
      name: 'ngurra-experiments',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        assignments: state.assignments,
      }),
    }
  )
);

/**
 * React hook for using experiments in components
 */
export function useExperiment(experimentName: string) {
  const { getVariant, trackConversion, isInVariant, assignments } = useExperimentStore();
  
  return {
    variant: assignments[experimentName]?.variant || null,
    getVariant: () => getVariant(experimentName),
    trackConversion: (eventName: string, metadata?: Record<string, unknown>) => 
      trackConversion(experimentName, eventName, metadata),
    isControl: () => isInVariant(experimentName, 'control'),
    isVariant: (variant: string) => isInVariant(experimentName, variant),
  };
}
