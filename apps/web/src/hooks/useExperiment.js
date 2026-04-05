'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/apiBase';
import { getAccessToken } from '@/lib/tokenStore';

/**
 * useExperiment Hook
 * 
 * Fetches the variant assignment for an A/B test experiment.
 * Uses consistent assignment based on user ID or anonymous session.
 * 
 * @param {string} experimentName - Name of the experiment
 * @param {object} options - Optional targeting options
 * @returns {object} { variant, isLoading, error, trackConversion }
 * 
 * @example
 * const { variant, isLoading } = useExperiment('new_onboarding_flow');
 * if (variant === 'treatment') {
 *   return <NewOnboarding />;
 * }
 * return <ClassicOnboarding />;
 */
export function useExperiment(experimentName, options = {}) {
  const [variant, setVariant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  let optionsKey = '{}';
  try {
    optionsKey = JSON.stringify(options || {});
  } catch {
    optionsKey = '{}';
  }

  useEffect(() => {
    if (!experimentName) {
      setIsLoading(false);
      return;
    }

    async function fetchVariant() {
      try {
        const apiBase = API_BASE;
        const token = getAccessToken();
        
        // Get or create anonymous ID for non-logged-in users
        let anonymousId = localStorage.getItem('ngurra_anon_id');
        if (!anonymousId) {
          anonymousId = `anon_${Math.random().toString(36).substring(2)}`;
          localStorage.setItem('ngurra_anon_id', anonymousId);
        }

        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const res = await fetch(`${apiBase}/experiments/variant`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            experimentName,
            anonymousId,
            ...JSON.parse(optionsKey)
          })
        });

        if (res.ok) {
          const data = await res.json();
          setVariant(data.variant);
        } else {
          // Default to control if experiment not found
          setVariant('control');
        }
      } catch (err) {
        console.warn('[useExperiment] Failed to fetch variant:', err);
        // Default to control on error
        setVariant('control');
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchVariant();
  }, [experimentName, optionsKey]);

  /**
   * Track a conversion event for this experiment
   */
  const trackConversion = useCallback(async (eventName, metadata = {}) => {
    if (!experimentName || !variant) return;

    try {
      const apiBase = API_BASE;
      const token = getAccessToken();
      const anonymousId = localStorage.getItem('ngurra_anon_id');

      await fetch(`${apiBase}/experiments/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          experimentName,
          eventName,
          anonymousId,
          metadata
        })
      });
    } catch (err) {
      console.warn('[useExperiment] Failed to track conversion:', err);
    }
  }, [experimentName, variant]);

  return {
    variant,
    isLoading,
    error,
    trackConversion,
    isControl: variant === 'control',
    isTreatment: variant === 'treatment',
  };
}

/**
 * useFeatureFlag Hook
 * 
 * Simplified hook for feature flags (on/off experiments)
 * 
 * @param {string} flagName - Name of the feature flag
 * @returns {object} { isEnabled, isLoading }
 * 
 * @example
 * const { isEnabled } = useFeatureFlag('dark_mode');
 * if (isEnabled) {
 *   return <DarkModeToggle />;
 * }
 */
export function useFeatureFlag(flagName) {
  const { variant, isLoading, error } = useExperiment(flagName);
  
  return {
    isEnabled: variant === 'enabled' || variant === 'treatment',
    isLoading,
    error
  };
}

export default useExperiment;
