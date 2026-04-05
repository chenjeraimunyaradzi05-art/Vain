'use client';

/**
 * i18n Provider and Hooks
 * 
 * Internationalization support for the web application.
 * Supports dynamic language switching and interpolation.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as DOMPurifyModule from 'isomorphic-dompurify';

// Handle both ESM and CommonJS module formats
const DOMPurify = (DOMPurifyModule as any).default || DOMPurifyModule;

type TranslationValue = string | { [key: string]: string | TranslationValue };
type Translations = Record<string, TranslationValue>;

interface I18nContextType {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  isLoading: boolean;
  availableLocales: { code: string; name: string; nativeName: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const AVAILABLE_LOCALES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)' },
  // Add First Nations language support in future
  // { code: 'kriol', name: 'Kriol', nativeName: 'Kriol' },
];

const DEFAULT_LOCALE = 'en';
const STORAGE_KEY = 'ngurra-locale';

interface I18nProviderProps {
  children: ReactNode;
  initialLocale?: string;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState(initialLocale || DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load translations for the current locale
  const loadTranslations = useCallback(async (loc: string) => {
    setIsLoading(true);
    try {
      // Try to load from public locales
      const response = await fetch(`/locales/${loc.split('-')[0]}/common.json`);
      if (response.ok) {
        const data = await response.json();
        setTranslations(data);
      } else {
        // Fallback to English
        const fallbackResponse = await fetch('/locales/en/common.json');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setTranslations(fallbackData);
        }
      }
    } catch (err) {
      console.error('Failed to load translations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize locale from storage or browser preference
  useEffect(() => {
    const storedLocale = localStorage.getItem(STORAGE_KEY);
    const browserLocale = navigator.language;
    
    const detectedLocale = storedLocale || 
      AVAILABLE_LOCALES.find(l => browserLocale.startsWith(l.code))?.code ||
      DEFAULT_LOCALE;
    
    setLocaleState(detectedLocale);
    loadTranslations(detectedLocale);
  }, [loadTranslations]);

  // Set locale and persist
  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    loadTranslations(newLocale);
    
    // Update HTML lang attribute
    document.documentElement.lang = newLocale;
  }, [loadTranslations]);

  // Translation function with interpolation
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: TranslationValue = translations;

    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = value[k];
      } else {
        // Return key if translation not found
        console.warn(`Translation not found: ${key}`);
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(`Translation is not a string: ${key}`);
      return key;
    }

    // Handle pluralization
    if (params && 'count' in params) {
      const count = params.count as number;
      if (count !== 1) {
        const pluralKey = `${key}_plural`;
        const pluralValue = t(pluralKey, params);
        if (pluralValue !== pluralKey) {
          value = pluralValue;
        }
      }
    }

    // Interpolate params
    if (params) {
      value = value.replace(/\{\{(\w+)\}\}/g, (_match: string, paramKey: string) => {
        return params[paramKey]?.toString() || `{{${paramKey}}}`;
      });
    }

    return value;
  }, [translations]);

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        isLoading,
        availableLocales: AVAILABLE_LOCALES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// Hook to use translations
export function useTranslation() {
  const context = useContext(I18nContext);
  
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }

  return context;
}

// Hook for locale-specific formatting
export function useLocaleFormat() {
  const { locale } = useTranslation();

  const formatNumber = useCallback((value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(locale, options).format(value);
  }, [locale]);

  const formatCurrency = useCallback((value: number, currency = 'AUD') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(value);
  }, [locale]);

  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, options).format(d);
  }, [locale]);

  const formatRelativeTime = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const diff = Date.now() - d.getTime();
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (seconds < 60) return rtf.format(-seconds, 'second');
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    if (hours < 24) return rtf.format(-hours, 'hour');
    if (days < 7) return rtf.format(-days, 'day');
    return rtf.format(-weeks, 'week');
  }, [locale]);

  return {
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelativeTime,
  };
}

// Language selector component
export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale, availableLocales } = useTranslation();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className={`bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm ${className || ''}`}
      aria-label="Select language"
    >
      {availableLocales.map((l) => (
        <option key={l.code} value={l.code}>
          {l.nativeName}
        </option>
      ))}
    </select>
  );
}

// Trans component for complex translations with embedded components
interface TransProps {
  i18nKey: string;
  components?: Record<string, ReactNode>;
  values?: Record<string, string | number>;
}

export function Trans({ i18nKey, components = {}, values = {} }: TransProps) {
  const { t } = useTranslation();
  
  let translated = t(i18nKey, values);
  
  // Replace component placeholders like {{link}}text{{/link}}
  Object.entries(components).forEach(([key, component]) => {
    const regex = new RegExp(`{{${key}}}(.+?){{/${key}}}`, 'g');
    translated = translated.replace(regex, (_, content) => {
      // This is simplified - in production you'd use a proper parser
      return `<span data-component="${key}">${content}</span>`;
    });
  });

  // SECURITY: Sanitize HTML to prevent XSS attacks from compromised translation files
  const sanitizedHtml = DOMPurify.sanitize(translated, {
    ALLOWED_TAGS: ['span', 'strong', 'em', 'b', 'i', 'a', 'br'],
    ALLOWED_ATTR: ['data-component', 'href', 'target', 'rel'],
  });

  return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
}
