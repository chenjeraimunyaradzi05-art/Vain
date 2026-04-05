/**
 * Feature Flags Hook for React
 * 
 * Provides feature flag evaluation in React components.
 */
'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { API_BASE } from '@/lib/apiBase';

/**
 * Feature Flags Context
 */
const FeatureFlagsContext = createContext(null);

/**
 * Default flags (fallback if API fails)
 */
const defaultFlags = {
  'feature.recommendations': true,
  'feature.video_calls': true,
  'feature.dark_mode': true,
  'feature.biometric_auth': true,
  'beta.ai_resume_builder': false,
  'beta.community_events': true,
  'experiment.new_onboarding': 'control',
  'experiment.job_card_layout': 'default',
};

/**
 * Feature Flags Provider
 */
export function FeatureFlagsProvider({ children, initialFlags = {}, apiUrl = `${API_BASE}/feature-flags` }) {
  const [flags, setFlags] = useState({ ...defaultFlags, ...initialFlags });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch flags from API
  useEffect(() => {
    let mounted = true;

    async function fetchFlags() {
      try {
        const response = await fetch(apiUrl, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch flags: ${response.status}`);
        }

        const data = await response.json();
        
        if (mounted) {
          setFlags(prev => ({ ...prev, ...data }));
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Failed to fetch feature flags, using defaults:', err);
        if (mounted) {
          setError(err);
          setIsLoading(false);
        }
      }
    }

    fetchFlags();

    return () => {
      mounted = false;
    };
  }, [apiUrl]);

  // Memoize context value
  const value = useMemo(() => ({
    flags,
    isLoading,
    error,
    isEnabled: (flagName) => {
      const flag = flags[flagName];
      return flag === true || (typeof flag === 'string' && flag !== 'control');
    },
    getVariant: (flagName) => flags[flagName],
    getFlag: (flagName) => flags[flagName],
    refreshFlags: async () => {
      setIsLoading(true);
      try {
        const response = await fetch(apiUrl, { credentials: 'include' });
        const data = await response.json();
        setFlags(prev => ({ ...prev, ...data }));
      } finally {
        setIsLoading(false);
      }
    },
  }), [flags, isLoading, error, apiUrl]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Hook to access feature flags
 */
export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);
  
  if (!context) {
    // Return safe defaults if used outside provider
    return {
      flags: defaultFlags,
      isLoading: false,
      error: null,
      isEnabled: () => false,
      getVariant: () => 'control',
      getFlag: () => null,
      refreshFlags: async () => {},
    };
  }
  
  return context;
}

/**
 * Hook to check if a feature is enabled
 */
export function useFeature(flagName) {
  const { flags, isLoading } = useFeatureFlags();
  
  return useMemo(() => ({
    isEnabled: flags[flagName] === true || (typeof flags[flagName] === 'string' && flags[flagName] !== 'control'),
    isLoading,
    value: flags[flagName],
  }), [flags, flagName, isLoading]);
}

/**
 * Hook to get experiment variant
 */
export function useExperiment(experimentName) {
  const { flags, isLoading } = useFeatureFlags();
  
  return useMemo(() => ({
    variant: flags[experimentName] || 'control',
    isLoading,
    isControl: flags[experimentName] === 'control' || !flags[experimentName],
  }), [flags, experimentName, isLoading]);
}

/**
 * Component that renders based on feature flag
 */
export function Feature({ name, children, fallback = null }) {
  const { isEnabled } = useFeature(name);
  
  if (isEnabled) {
    return children;
  }
  
  return fallback;
}

/**
 * Component that renders based on experiment variant
 */
export function Experiment({ name, variants, fallback = null }) {
  const { variant } = useExperiment(name);
  
  const Component = variants[variant];
  
  if (Component) {
    return typeof Component === 'function' ? <Component /> : Component;
  }
  
  return fallback;
}

/**
 * Track experiment exposure
 */
export function useExperimentTracking(experimentName) {
  const { variant } = useExperiment(experimentName);
  const [hasTracked, setHasTracked] = useState(false);

  const trackExposure = useCallback(async () => {
    if (hasTracked) return;
    
    try {
      await fetch(`${API_BASE}/experiments/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          experimentName,
          eventName: 'exposure',
          metadata: { variant, timestamp: new Date().toISOString() },
        }),
      });
      setHasTracked(true);
    } catch (err) {
      console.warn('Failed to track experiment exposure:', err);
    }
  }, [experimentName, variant, hasTracked]);

  // Track on mount
  useEffect(() => {
    trackExposure();
  }, [trackExposure]);

  return { variant, trackExposure };
}

const featureFlagHooks = {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeature,
  useExperiment,
  useExperimentTracking,
  Feature,
  Experiment,
};

export default featureFlagHooks;
