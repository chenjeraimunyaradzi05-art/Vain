import { AccessibilityInfo, PixelRatio, Dimensions, Appearance, EmitterSubscription } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const ACCESSIBILITY_PREFS_KEY = '@ngurra_accessibility_prefs';

export interface AccessibilityPreferences {
  highContrastMode: boolean;
  reducedMotion: boolean;
  fontScale: number;
  boldText: boolean;
  screenReaderEnabled: boolean;
}

// Default preferences
const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  highContrastMode: false,
  reducedMotion: false,
  fontScale: 1.0,
  boldText: false,
  screenReaderEnabled: false,
};

// Current preferences
let currentPrefs: AccessibilityPreferences = { ...DEFAULT_PREFERENCES };
let listeners: ((prefs: AccessibilityPreferences) => void)[] = [];

/**
 * Initialize accessibility service
 */
export async function initializeAccessibility() {
  // Load saved preferences
  try {
    const saved = await AsyncStorage.getItem(ACCESSIBILITY_PREFS_KEY);
    if (saved) {
      currentPrefs = { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Failed to load accessibility prefs:', e);
  }

  // Check system accessibility settings
  try {
    const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
    currentPrefs.screenReaderEnabled = screenReaderEnabled;

    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    currentPrefs.reducedMotion = reduceMotion;

    // @ts-ignore - isBoldTextEnabled might not be in all types definitions yet
    const boldText = await AccessibilityInfo.isBoldTextEnabled?.() || false;
    currentPrefs.boldText = boldText;
  } catch (e) {
    console.warn('Failed to check system accessibility:', e);
  }

  // Subscribe to screen reader changes
  const screenReaderSubscription = AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    (enabled) => {
      currentPrefs.screenReaderEnabled = enabled;
      notifyListeners();
    }
  );

  // Subscribe to reduce motion changes
  const reduceMotionSubscription = AccessibilityInfo.addEventListener(
    'reduceMotionChanged',
    (enabled) => {
      currentPrefs.reducedMotion = enabled;
      notifyListeners();
    }
  );

  // Subscribe to bold text changes (iOS)
  // @ts-ignore
  const boldTextSubscription = AccessibilityInfo.addEventListener?.(
    'boldTextChanged',
    (enabled: boolean) => {
      currentPrefs.boldText = enabled;
      notifyListeners();
    }
  );

  notifyListeners();

  // Return cleanup function
  return () => {
    screenReaderSubscription?.remove?.();
    reduceMotionSubscription?.remove?.();
    boldTextSubscription?.remove?.();
  };
}

/**
 * Get current accessibility preferences
 */
export function getAccessibilityPrefs(): AccessibilityPreferences {
  return { ...currentPrefs };
}

/**
 * Update accessibility preferences
 */
export async function updateAccessibilityPrefs(prefs: Partial<AccessibilityPreferences>) {
  currentPrefs = { ...currentPrefs, ...prefs };
  
  try {
    await AsyncStorage.setItem(ACCESSIBILITY_PREFS_KEY, JSON.stringify(currentPrefs));
  } catch (e) {
    console.warn('Failed to save accessibility prefs:', e);
  }
  
  notifyListeners();
}

/**
 * Add listener for preference changes
 */
export function addAccessibilityListener(listener: (prefs: AccessibilityPreferences) => void) {
  listeners.push(listener);
  listener(currentPrefs);
  
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  listeners.forEach(listener => listener(currentPrefs));
}
