/**
 * Accessibility Utilities for React Native
 * 
 * Helpers for improving screen reader support and accessibility.
 */
import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to detect if screen reader is active
 */
export function useScreenReader() {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => subscription?.remove();
  }, []);

  return isScreenReaderEnabled;
}

/**
 * Hook to detect if reduce motion is enabled
 */
export function useReduceMotion() {
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotionEnabled);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );

    return () => subscription?.remove();
  }, []);

  return isReduceMotionEnabled;
}

/**
 * Hook to detect if bold text is enabled
 */
export function useBoldText() {
  const [isBoldTextEnabled, setIsBoldTextEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isBoldTextEnabled().then(setIsBoldTextEnabled);

      const subscription = AccessibilityInfo.addEventListener(
        'boldTextChanged',
        setIsBoldTextEnabled
      );

      return () => subscription?.remove();
    }
  }, []);

  return isBoldTextEnabled;
}

/**
 * Hook to detect if grayscale is enabled
 */
export function useGrayscale() {
  const [isGrayscaleEnabled, setIsGrayscaleEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isGrayscaleEnabled().then(setIsGrayscaleEnabled);

      const subscription = AccessibilityInfo.addEventListener(
        'grayscaleChanged',
        setIsGrayscaleEnabled
      );

      return () => subscription?.remove();
    }
  }, []);

  return isGrayscaleEnabled;
}

/**
 * Combined accessibility hook
 */
export function useAccessibility() {
  const isScreenReaderEnabled = useScreenReader();
  const isReduceMotionEnabled = useReduceMotion();
  const isBoldTextEnabled = useBoldText();
  const isGrayscaleEnabled = useGrayscale();

  const announceForAccessibility = useCallback((message) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  const setAccessibilityFocus = useCallback((reactTag) => {
    AccessibilityInfo.setAccessibilityFocus(reactTag);
  }, []);

  return {
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    isBoldTextEnabled,
    isGrayscaleEnabled,
    announceForAccessibility,
    setAccessibilityFocus,
  };
}

/**
 * Accessibility props helper
 * Generates common accessibility props for components
 */
export function a11yProps(label, options = {}) {
  const {
    role = 'none',
    hint = '',
    isButton = false,
    isHeader = false,
    isSelected = false,
    isDisabled = false,
    isChecked = undefined,
    value = undefined,
  } = options;

  const props = {
    accessible: true,
    accessibilityLabel: label,
  };

  if (hint) {
    props.accessibilityHint = hint;
  }

  if (isButton) {
    props.accessibilityRole = 'button';
  } else if (isHeader) {
    props.accessibilityRole = 'header';
  } else if (role !== 'none') {
    props.accessibilityRole = role;
  }

  const state = {};
  if (isSelected !== undefined) state.selected = isSelected;
  if (isDisabled !== undefined) state.disabled = isDisabled;
  if (isChecked !== undefined) state.checked = isChecked;
  
  if (Object.keys(state).length > 0) {
    props.accessibilityState = state;
  }

  if (value !== undefined) {
    if (typeof value === 'object') {
      props.accessibilityValue = value;
    } else {
      props.accessibilityValue = { text: String(value) };
    }
  }

  return props;
}

/**
 * Live region helper for dynamic content
 */
export function liveRegionProps(politeness = 'polite') {
  return {
    accessibilityLiveRegion: politeness, // 'none', 'polite', 'assertive'
  };
}

/**
 * Group related elements
 */
export function groupProps(label) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'none',
  };
}

/**
 * Image accessibility props
 */
export function imageA11yProps(description, isDecorative = false) {
  if (isDecorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    };
  }

  return {
    accessible: true,
    accessibilityLabel: description,
    accessibilityRole: 'image',
  };
}

/**
 * Link accessibility props
 */
export function linkA11yProps(label, url) {
  return {
    accessible: true,
    accessibilityLabel: `${label}, link`,
    accessibilityRole: 'link',
    accessibilityHint: `Opens ${url}`,
  };
}

/**
 * Text input accessibility props
 */
export function inputA11yProps(label, options = {}) {
  const { hint = '', isRequired = false, errorMessage = '' } = options;

  return {
    accessible: true,
    accessibilityLabel: `${label}${isRequired ? ', required' : ''}${errorMessage ? `, error: ${errorMessage}` : ''}`,
    accessibilityHint: hint,
    accessibilityRole: 'none',
  };
}

/**
 * Tab bar item accessibility props
 */
export function tabA11yProps(label, isSelected, index, total) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'tab',
    accessibilityState: { selected: isSelected },
    accessibilityValue: { text: `${index + 1} of ${total}` },
  };
}

/**
 * Slider accessibility props
 */
export function sliderA11yProps(label, min, max, current) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityRole: 'adjustable',
    accessibilityValue: {
      min,
      max,
      now: current,
    },
  };
}

/**
 * Progress accessibility props
 */
export function progressA11yProps(label, progress) {
  return {
    accessible: true,
    accessibilityLabel: `${label}, ${Math.round(progress * 100)}% complete`,
    accessibilityRole: 'progressbar',
    accessibilityValue: {
      min: 0,
      max: 100,
      now: Math.round(progress * 100),
    },
  };
}

export default {
  useScreenReader,
  useReduceMotion,
  useBoldText,
  useGrayscale,
  useAccessibility,
  a11yProps,
  liveRegionProps,
  groupProps,
  imageA11yProps,
  linkA11yProps,
  inputA11yProps,
  tabA11yProps,
  sliderA11yProps,
  progressA11yProps,
};
