/**
 * Theme Context
 * 
 * Provides theme switching (dark/light mode) for the mobile app.
 * Persists user preference and respects system settings.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Light theme colors
const lightColors = {
  // Primary brand colors
  primary: '#E88B2E',
  primaryLight: '#FFA94D',
  primaryDark: '#D67A1E',

  // Secondary colors
  secondary: '#6B3A0D',
  secondaryLight: '#8B4513',

  // Accent colors
  accent: '#3DBDB4',
  accentLight: '#4ECDC4',

  // Background colors (light theme)
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceLight: '#FAFAFA',
  card: '#FFFFFF',

  // Text colors
  text: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textInverse: '#FFFFFF',

  // Status colors
  success: '#4CAF50',
  successLight: '#81C784',
  warning: '#FF9800',
  warningLight: '#FFB74D',
  error: '#F44336',
  errorLight: '#EF9A9A',
  info: '#2196F3',
  infoLight: '#64B5F6',

  // Semantic colors
  purple: '#9C27B0',
  pink: '#E91E63',

  // Border colors
  border: '#E0E0E0',
  borderLight: '#EEEEEE',

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.3)',
  overlayLight: 'rgba(0, 0, 0, 0.15)',

  // Tab bar colors
  tabInactive: '#999999',
  tabActive: '#E88B2E',

  // Status bar
  statusBar: '#FFFFFF',
} as const;

// Dark theme colors
const darkColors = {
  // Primary brand colors
  primary: '#FFA94D',
  primaryLight: '#FFD166',
  primaryDark: '#E88B2E',

  // Secondary colors
  secondary: '#8B4513',
  secondaryLight: '#CD853F',

  // Accent colors
  accent: '#4ECDC4',
  accentLight: '#7FE5DD',

  // Background colors (dark theme)
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#2A2A2A',
  card: '#252525',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#808080',
  textInverse: '#121212',

  // Status colors
  success: '#4CAF50',
  successLight: '#81C784',
  warning: '#FFB74D',
  warningLight: '#FFD180',
  error: '#F44336',
  errorLight: '#EF9A9A',
  info: '#2196F3',
  infoLight: '#64B5F6',

  // Semantic colors
  purple: '#9C27B0',
  pink: '#E91E63',

  // Border colors
  border: '#333333',
  borderLight: '#444444',

  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Tab bar colors
  tabInactive: '#666666',
  tabActive: '#FFA94D',

  // Status bar
  statusBar: '#0D0D0D',
} as const;

export type ThemeMode = 'light' | 'dark' | 'system';
export type Colors = typeof darkColors | typeof lightColors;

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: Colors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_STORAGE_KEY = 'ngurra_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine if dark mode should be active
  const isDark = mode === 'system' 
    ? systemColorScheme === 'dark' 
    : mode === 'dark';

  // Get the appropriate color palette
  const colors = isDark ? darkColors : lightColors;

  // Load saved preference on mount
  useEffect(() => {
    async function loadTheme() {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setModeState(savedMode as ThemeMode);
        }
      } catch (e) {
        console.warn('Failed to load theme preference:', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadTheme();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      // This will trigger a re-render if mode is 'system'
    });

    return () => subscription.remove();
  }, []);

  // Set mode and persist
  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  };

  if (!isLoaded) {
    return null; // Or a loading screen
  }

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
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

// Hook for styled components pattern
export function useThemedStyles<T>(styleFactory: (colors: Colors, isDark: boolean) => T): T {
  const { colors, isDark } = useTheme();
  return styleFactory(colors, isDark);
}
