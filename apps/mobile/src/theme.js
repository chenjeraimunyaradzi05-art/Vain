/**
 * Ngurra Pathways Theme Configuration
 * Dark theme with First Nations design elements
 */

export const colors = {
  // Primary palette
  primary: '#3B82F6',      // Blue
  primaryLight: '#60A5FA',
  primaryDark: '#2563EB',
  
  // Secondary palette
  secondary: '#1E293B',    // Slate
  secondaryLight: '#334155',
  
  // Accent colors
  accent: '#10B981',       // Green
  accentLight: '#34D399',
  purple: '#9333EA',       // Purple for 2FA
  
  // Background colors (dark theme)
  background: '#0F172A',   // Slate 900
  surface: '#1E293B',      // Slate 800
  surfaceLight: '#334155', // Slate 700
  
  // Text colors
  text: '#F8FAFC',         // Slate 50
  textSecondary: '#CBD5E1', // Slate 300
  textMuted: '#64748B',    // Slate 500
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Border colors
  border: '#334155',
  borderLight: '#475569',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  h2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  body: {
    fontSize: 16,
    color: colors.text,
  },
  bodySmall: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: 12,
    color: colors.textMuted,
  },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};
