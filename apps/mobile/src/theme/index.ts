/**
 * Ngurra Pathways Mobile Theme
 * 
 * Consistent design tokens for the React Native mobile app.
 * Aligned with the dark theme from the web app.
 */

/**
 * Color palette - dark theme with Indigenous cultural inspiration
 */
export const colors = {
  // Primary brand colors
  primary: '#FFA94D',           // Warm ochre/orange
  primaryLight: '#FFD166',      // Lighter ochre
  primaryDark: '#E88B2E',       // Darker ochre
  
  // Secondary colors
  secondary: '#8B4513',         // Earth brown
  secondaryLight: '#CD853F',    // Peru/tan
  
  // Accent colors
  accent: '#4ECDC4',            // Teal accent
  accentLight: '#7FE5DD',       // Light teal
  
  // Background colors (dark theme)
  background: '#121212',        // Main dark background
  surface: '#1E1E1E',           // Card/surface background
  surfaceLight: '#2A2A2A',      // Elevated surface
  card: '#252525',              // Card background
  
  // Text colors
  text: '#FFFFFF',              // Primary text
  textSecondary: '#B3B3B3',     // Secondary text
  textMuted: '#808080',         // Muted text
  textInverse: '#121212',       // Text on light backgrounds
  
  // Status colors
  success: '#4CAF50',           // Green for success
  successLight: '#81C784',      // Light green
  warning: '#FFB74D',           // Orange for warnings
  warningLight: '#FFD180',      // Light warning
  error: '#F44336',             // Red for errors
  errorLight: '#EF9A9A',        // Light error
  info: '#2196F3',              // Blue for info
  infoLight: '#64B5F6',         // Light info
  
  // Semantic colors
  purple: '#9C27B0',            // Purple for mentorship
  pink: '#E91E63',              // Pink accent
  
  // Border colors
  border: '#333333',            // Default border
  borderLight: '#444444',       // Light border
  
  // Overlay colors
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlay
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  
  // Tab bar colors
  tabInactive: '#666666',       // Inactive tab icon
  tabActive: '#FFA94D',         // Active tab icon
  
  // Status bar
  statusBar: '#0D0D0D',
} as const;

/**
 * Spacing scale (in pixels)
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  
  // Specific spacings
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
} as const;

/**
 * Typography styles
 */
export const typography = {
  // Font families
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  
  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    display: 40,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Font weights (for System font)
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  // Pre-defined text styles
  styles: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600',
    },
  },
} as const;

/**
 * Border radius values
 */
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
  
  // Specific radii
  card: 12,
  button: 8,
  input: 8,
  avatar: 9999,
  chip: 16,
} as const;

/**
 * Shadow definitions
 */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
  
  // Glow effect for primary elements
  glow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

/**
 * Animation durations (ms)
 */
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Z-index layers
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
  toast: 1070,
} as const;

/**
 * Common hitSlop for touchable elements (accessibility)
 */
export const hitSlop = {
  default: { top: 10, bottom: 10, left: 10, right: 10 },
  large: { top: 20, bottom: 20, left: 20, right: 20 },
} as const;

/**
 * Screen breakpoints (for responsive layouts)
 */
export const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
} as const;

// Default export for convenience
export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animation,
  zIndex,
  hitSlop,
  breakpoints,
};
