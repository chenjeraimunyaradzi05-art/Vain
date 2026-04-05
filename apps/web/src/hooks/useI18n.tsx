'use client';

/**
 * Internationalization Hook
 * 
 * Provides translation utilities in React components.
 */

import { useState, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { t, setLocale, getLocale, getAvailableLocales, Locale, TranslationKeys } from '@/lib/i18n';

interface I18nContextValue {
  locale: Locale;
  t: (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

/**
 * I18n Provider component
 */
export function I18nProvider({ children, initialLocale = 'en-AU' }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const handleSetLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('locale', newLocale);
    }
  }, []);

  const translate = useCallback((key: keyof TranslationKeys, params?: Record<string, string | number>) => {
    return t(key, params);
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    t: translate,
    setLocale: handleSetLocale,
    availableLocales: getAvailableLocales(),
  }), [locale, translate, handleSetLocale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access i18n utilities
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  
  if (!context) {
    // Return a default implementation if not in provider
    return {
      locale: getLocale(),
      t,
      setLocale,
      availableLocales: getAvailableLocales(),
    };
  }
  
  return context;
}

/**
 * Hook for just the translation function
 */
export function useTranslation() {
  const { t } = useI18n();
  return { t };
}

export default useI18n;
