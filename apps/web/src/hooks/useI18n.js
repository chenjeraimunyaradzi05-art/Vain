/**
 * Internationalization Hook for React
 * 
 * Provides localization utilities for React components.
 */
'use client';

import { createContext, useContext, useMemo } from 'react';

const DEFAULT_LOCALE = 'en-AU';
const DEFAULT_TIMEZONE = 'Australia/Sydney';

/**
 * Translations
 */
const translations = {
  'en-AU': {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.retry': 'Try again',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.search': 'Search',
    'common.noResults': 'No results found',
    
    // Auth
    'auth.login': 'Log in',
    'auth.logout': 'Log out',
    'auth.register': 'Sign up',
    
    // Navigation
    'nav.home': 'Home',
    'nav.jobs': 'Jobs',
    'nav.courses': 'Training',
    'nav.mentorship': 'Mentorship',
    'nav.community': 'Community',
    'nav.messages': 'Messages',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    
    // Jobs
    'jobs.search': 'Search jobs',
    'jobs.apply': 'Apply now',
    'jobs.applied': 'Applied',
    'jobs.saved': 'Saved',
    
    // Time
    'time.justNow': 'Just now',
    'time.minutesAgo': '{count} min ago',
    'time.hoursAgo': '{count}h ago',
    'time.daysAgo': '{count}d ago',
    'time.weeksAgo': '{count}w ago',
    
    // Acknowledgment
    'acknowledgment.short': 'We acknowledge the Traditional Custodians of the land.',
    'acknowledgment.full': 'Ngurra Pathways acknowledges the Traditional Custodians of the lands on which we work and live. We pay our respects to Elders past, present and emerging.',
  },
};

/**
 * I18n Context
 */
const I18nContext = createContext(null);

/**
 * I18n Provider
 */
export function I18nProvider({ children, locale = DEFAULT_LOCALE }) {
  const value = useMemo(() => createI18nContext(locale), [locale]);
  
  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Create i18n context value
 */
function createI18nContext(locale) {
  const localeTranslations = translations[locale] || translations[DEFAULT_LOCALE];
  
  return {
    locale,
    
    t: (key, params = {}) => {
      let text = localeTranslations[key] || key;
      
      for (const [param, val] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(val));
      }
      
      return text;
    },
    
    formatDate: (date, options = {}) => {
      return new Date(date).toLocaleDateString(locale, {
        timeZone: DEFAULT_TIMEZONE,
        ...options,
      });
    },
    
    formatDateTime: (date, options = {}) => {
      return new Date(date).toLocaleString(locale, {
        timeZone: DEFAULT_TIMEZONE,
        dateStyle: 'medium',
        timeStyle: 'short',
        ...options,
      });
    },
    
    formatTime: (date, options = {}) => {
      return new Date(date).toLocaleTimeString(locale, {
        timeZone: DEFAULT_TIMEZONE,
        timeStyle: 'short',
        ...options,
      });
    },
    
    formatRelativeTime: (date) => {
      const now = new Date();
      const d = new Date(date);
      const diff = now - d;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const weeks = Math.floor(days / 7);
      
      if (seconds < 60) return localeTranslations['time.justNow'];
      if (minutes < 60) return localeTranslations['time.minutesAgo'].replace('{count}', minutes);
      if (hours < 24) return localeTranslations['time.hoursAgo'].replace('{count}', hours);
      if (days < 7) return localeTranslations['time.daysAgo'].replace('{count}', days);
      return localeTranslations['time.weeksAgo'].replace('{count}', weeks);
    },
    
    formatCurrency: (amount, currency = 'AUD') => {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    
    formatNumber: (number, options = {}) => {
      return new Intl.NumberFormat(locale, options).format(number);
    },
    
    formatPhoneNumber: (phone) => {
      const digits = phone.replace(/\D/g, '');
      
      if (digits.length === 10 && digits.startsWith('04')) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
      }
      
      if (digits.length === 10 && digits.startsWith('0')) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)} ${digits.slice(6)}`;
      }
      
      return phone;
    },
  };
}

/**
 * Hook to access i18n utilities
 */
export function useI18n() {
  const context = useContext(I18nContext);
  
  if (!context) {
    return createI18nContext(DEFAULT_LOCALE);
  }
  
  return context;
}

/**
 * Hook for translations only
 */
export function useTranslation() {
  const { t } = useI18n();
  return t;
}

/**
 * Hook for date formatting
 */
export function useDateFormat() {
  const { formatDate, formatDateTime, formatTime, formatRelativeTime } = useI18n();
  return { formatDate, formatDateTime, formatTime, formatRelativeTime };
}

/**
 * Hook for number/currency formatting
 */
export function useNumberFormat() {
  const { formatCurrency, formatNumber } = useI18n();
  return { formatCurrency, formatNumber };
}

/**
 * Australian states/territories
 */
export const AUSTRALIAN_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
];

const i18nHooks = {
  I18nProvider,
  useI18n,
  useTranslation,
  useDateFormat,
  useNumberFormat,
  AUSTRALIAN_STATES,
};

export default i18nHooks;
