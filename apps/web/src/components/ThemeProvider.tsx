'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * Theme Provider for Ngurra Pathways
 * 
 * Supports three theme modes:
 * - light: Standard light theme
 * - dark: Standard dark theme  
 * - cosmic: Celestial Precious Stone theme (purple/gold gradients)
 */

export type ThemeMode = 'light' | 'dark' | 'cosmic' | 'system';
export type ResolvedTheme = 'light' | 'dark' | 'cosmic';

interface ThemeColors {
  // Primary colors
  primary: string;
  primaryHover: string;
  primaryLight: string;
  
  // Accent colors (Celestial theme)
  gold: string;
  emerald: string;
  rose: string;
  
  // Background
  background: string;
  backgroundAlt: string;
  surface: string;
  surfaceHover: string;
  
  // Text
  text: string;
  textMuted: string;
  textInverted: string;
  
  // Borders
  border: string;
  borderHover: string;
  
  // Status
  success: string;
  warning: string;
  error: string;
  info: string;
}

const lightTheme: ThemeColors = {
  primary: '#3B82F6',
  primaryHover: '#2563EB',
  primaryLight: '#EFF6FF',
  gold: '#FFD700',
  emerald: '#50C878',
  rose: '#E85B8A',
  background: '#FFFFFF',
  backgroundAlt: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceHover: '#F3F4F6',
  text: '#111827',
  textMuted: '#6B7280',
  textInverted: '#FFFFFF',
  border: '#E5E7EB',
  borderHover: '#D1D5DB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

const darkTheme: ThemeColors = {
  primary: '#60A5FA',
  primaryHover: '#3B82F6',
  primaryLight: '#1E3A5F',
  gold: '#FFD700',
  emerald: '#50C878',
  rose: '#E85B8A',
  background: '#111827',
  backgroundAlt: '#1F2937',
  surface: '#1F2937',
  surfaceHover: '#374151',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  textInverted: '#111827',
  border: '#374151',
  borderHover: '#4B5563',
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
};

const cosmicTheme: ThemeColors = {
  primary: '#FFD700',
  primaryHover: '#FFC000',
  primaryLight: '#3D2E6B',
  gold: '#FFD700',
  emerald: '#50C878',
  rose: '#E85B8A',
  background: '#0D0A1A',
  backgroundAlt: '#1A0F2E',
  surface: '#2D1B69',
  surfaceHover: '#3D2E6B',
  text: '#F0E6FF',
  textMuted: '#A78BFA',
  textInverted: '#0D0A1A',
  border: '#4C1D95',
  borderHover: '#6D28D9',
  success: '#50C878',
  warning: '#FFD700',
  error: '#E85B8A',
  info: '#818CF8',
};

const themes: Record<ResolvedTheme, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
  cosmic: cosmicTheme,
};

interface ThemeContextValue {
  // Current theme mode (may include 'system')
  theme: ThemeMode;
  // Resolved theme (never 'system')
  resolvedTheme: ResolvedTheme;
  // Theme colors object
  colors: ThemeColors;
  // Set theme mode
  setTheme: (theme: ThemeMode) => void;
  // Toggle between light/dark (skips cosmic)
  toggleTheme: () => void;
  // Check if using cosmic theme
  isCosmic: boolean;
  // Whether the theme has been hydrated on the client
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'vantage-theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

export function ThemeProvider({ 
  children,
  defaultTheme = 'system',
  storageKey = STORAGE_KEY,
}: { 
  children: React.ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from storage - only on client
  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(storageKey) as ThemeMode | null;
      if (stored && ['light', 'dark', 'cosmic', 'system'].includes(stored)) {
        setThemeState(stored);
        // Immediately resolve theme to prevent flash
        const resolved = stored === 'system' ? getSystemTheme() : stored;
        setResolvedTheme(resolved);
      } else {
        // No stored theme, resolve default
        const resolved = defaultTheme === 'system' ? getSystemTheme() : defaultTheme;
        setResolvedTheme(resolved);
      }
    } catch (error) {
      // Ignore storage access errors (private mode / blocked storage)
      const resolved = defaultTheme === 'system' ? getSystemTheme() : defaultTheme;
      setResolvedTheme(resolved);
    }
  }, [storageKey, defaultTheme]);

  // Update resolved theme when theme changes (after initial mount)
  useEffect(() => {
    if (!mounted) return;
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
  }, [theme, mounted]);

  // Apply theme classes and CSS variables when resolved theme changes
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove('light', 'dark', 'cosmic');
    root.classList.add(resolvedTheme);
    if (body) {
      body.classList.remove('light', 'dark', 'cosmic');
      body.classList.add(resolvedTheme);
    }
    root.style.colorScheme = resolvedTheme === 'dark' || resolvedTheme === 'cosmic' ? 'dark' : 'light';

    // Update meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', themes[resolvedTheme].background);
    }

    // Update CSS custom properties
    const colors = themes[resolvedTheme];
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolvedTheme(getSystemTheme());
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch (error) {
        // Ignore storage access errors
      }
    }
  }, [storageKey]);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value: ThemeContextValue = {
    theme,
    resolvedTheme,
    colors: themes[resolvedTheme],
    setTheme,
    toggleTheme,
    isCosmic: resolvedTheme === 'cosmic',
    mounted,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme Toggle Button Component
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme, isCosmic } = useTheme();
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-lg transition-colors ${
          resolvedTheme === 'light' 
            ? 'bg-yellow-100 text-yellow-600' 
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        aria-label="Light mode"
        aria-pressed={resolvedTheme === 'light'}
      >
        <SunIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-lg transition-colors ${
          resolvedTheme === 'dark' 
            ? 'bg-gray-700 text-blue-400' 
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        aria-label="Dark mode"
        aria-pressed={resolvedTheme === 'dark'}
      >
        <MoonIcon className="w-5 h-5" />
      </button>
      <button
        onClick={() => setTheme('cosmic')}
        className={`p-2 rounded-lg transition-colors ${
          isCosmic 
            ? 'bg-purple-900 text-yellow-400' 
            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
        }`}
        aria-label="Cosmic mode"
        aria-pressed={isCosmic}
      >
        <SparklesIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

// Simple theme selector dropdown
export function ThemeSelector({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  
  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as ThemeMode)}
      className={`px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
        bg-white dark:bg-gray-800 text-gray-900 dark:text-white
        focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
      aria-label="Select theme"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
      <option value="cosmic">Cosmic ✨</option>
    </select>
  );
}

// Icon components
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
      />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
      />
    </svg>
  );
}

export default ThemeProvider;
