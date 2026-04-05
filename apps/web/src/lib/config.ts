import { API_BASE } from '@/lib/apiBase';

interface Config {
  // API Configuration
  apiUrl: string;
  apiTimeout: number;
  
  // Authentication
  authTokenKey: string;
  refreshTokenKey: string;
  tokenRefreshThreshold: number;
  
  // Feature Flags
  features: {
    mentorship: boolean;
    courses: boolean;
    aiCoaching: boolean;
    analytics: boolean;
  };
  
  // Monitoring
  sentryDsn: string | null;
  posthogKey: string | null;
  
  // UI
  defaultLocale: string;
  supportedLocales: string[];
  
  // Misc
  isDevelopment: boolean;
  isProduction: boolean;
}

function getConfig(): Config {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    // API Configuration - uses centralized API_BASE for consistency
    apiUrl: API_BASE,
    apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
    
    // Authentication
    authTokenKey: 'ngurra_access_token',
    refreshTokenKey: 'ngurra_refresh_token',
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes before expiry
    
    // Feature Flags
    features: {
      mentorship: process.env.NEXT_PUBLIC_FEATURE_MENTORSHIP === 'true',
      courses: process.env.NEXT_PUBLIC_FEATURE_COURSES === 'true',
      aiCoaching: process.env.NEXT_PUBLIC_FEATURE_AI_COACHING === 'true',
      analytics: process.env.NEXT_PUBLIC_FEATURE_ANALYTICS === 'true',
    },
    
    // Monitoring
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN || null,
    posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || null,
    
    // UI
    defaultLocale: 'en-AU',
    supportedLocales: ['en', 'en-AU'],
    
    // Misc
    isDevelopment,
    isProduction,
  };
}

export const config = getConfig();

export default config;
