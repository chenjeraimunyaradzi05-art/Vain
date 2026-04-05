'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';

/**
 * Keyboard Navigation Utilities
 *
 * Custom hooks and utilities for keyboard accessibility.
 * Ngurra Pathways - Celestial Precious Stone Theme
 */

// ============================================================================
// FOCUS TRAP HOOK
// ============================================================================

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  isActive: boolean;
  /** Element to return focus to when trap is deactivated */
  returnFocusOnDeactivate?: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Allow clicking outside the trapped area */
  allowOutsideClick?: boolean;
}

/**
 * Hook to trap focus within a container element.
 * Essential for modal dialogs and dropdown menus.
 */
export function useFocusTrap<T extends HTMLElement>({
  isActive,
  returnFocusOnDeactivate = true,
  onEscape,
  allowOutsideClick = false,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(', ');

    const elements = containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors);
    return Array.from(elements).filter(
      (el) => el.offsetParent !== null, // Visible elements only
    );
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      // Handle Tab key for focus trap
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab: going backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: going forward
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Handle clicks outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        allowOutsideClick ||
        !containerRef.current ||
        containerRef.current.contains(event.target as Node)
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('keydown', handleKeyDown);
    if (!allowOutsideClick) {
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (!allowOutsideClick) {
        document.removeEventListener('mousedown', handleClickOutside, true);
      }

      // Return focus to the previous element
      if (returnFocusOnDeactivate && previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, onEscape, getFocusableElements, allowOutsideClick, returnFocusOnDeactivate]);

  return containerRef;
}

// ============================================================================
// ARROW KEY NAVIGATION HOOK
// ============================================================================

// eslint-disable-next-line no-unused-vars
interface UseArrowNavigationOptions<T> {
  /** The list of items to navigate */
  items: T[];
  /** Whether navigation is active */
  isActive?: boolean;
  /** Current active index */
  activeIndex: number;
  /** Callback when active index changes */
  // eslint-disable-next-line no-unused-vars
  onActiveIndexChange: (_index: number) => void;
  /** Callback when item is selected (Enter key) */
  // eslint-disable-next-line no-unused-vars
  onSelect?: (_item: T, _index: number) => void;
  /** Callback when escape is pressed */
  onEscape?: () => void;
  /** Navigation orientation */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Whether navigation should wrap around */
  loop?: boolean;
}

/**
 * Hook for arrow key navigation in lists and menus.
 */
export function useArrowNavigation<T, E extends HTMLElement>({
  items,
  isActive = true,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onEscape,
  orientation = 'vertical',
  loop = true,
}: UseArrowNavigationOptions<T>) {
  const containerRef = useRef<E>(null);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isActive || items.length === 0) return;

      const isVertical = orientation === 'vertical' || orientation === 'both';
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';

      const prevKeys = isVertical ? ['ArrowUp'] : [];
      const nextKeys = isVertical ? ['ArrowDown'] : [];
      if (isHorizontal) {
        prevKeys.push('ArrowLeft');
        nextKeys.push('ArrowRight');
      }

      if (prevKeys.includes(event.key)) {
        event.preventDefault();
        let newIndex = activeIndex - 1;
        if (newIndex < 0) {
          newIndex = loop ? items.length - 1 : 0;
        }
        onActiveIndexChange(newIndex);
        return;
      }

      if (nextKeys.includes(event.key)) {
        event.preventDefault();
        let newIndex = activeIndex + 1;
        if (newIndex >= items.length) {
          newIndex = loop ? 0 : items.length - 1;
        }
        onActiveIndexChange(newIndex);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        onActiveIndexChange(0);
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        onActiveIndexChange(items.length - 1);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect?.(items[activeIndex], activeIndex);
        return;
      }

      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }
    },
    [isActive, items, activeIndex, onActiveIndexChange, onSelect, onEscape, orientation, loop],
  );

  return {
    containerRef,
    getContainerProps: () => ({
      ref: containerRef,
      onKeyDown: handleKeyDown,
      role: 'listbox',
      tabIndex: 0,
      'aria-activedescendant': items.length > 0 ? `item-${activeIndex}` : undefined,
    }),
    getItemProps: (index: number) => ({
      id: `item-${index}`,
      role: 'option',
      'aria-selected': index === activeIndex,
      tabIndex: index === activeIndex ? 0 : -1,
    }),
  };
}

// ============================================================================
// ESCAPE KEY HANDLER HOOK
// ============================================================================

/**
 * Hook to handle Escape key press.
 */
export function useEscapeKey(onEscape: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, isActive]);
}

// ============================================================================
// ROVING TABINDEX HOOK
// ============================================================================

interface UseRovingTabIndexOptions {
  /** Number of items in the group */
  itemCount: number;
  /** Initial focused index */
  initialIndex?: number;
  /** Navigation orientation */
  orientation?: 'vertical' | 'horizontal';
}

/**
 * Hook for roving tabindex pattern in toolbars and tab lists.
 */
export function useRovingTabIndex({
  itemCount,
  initialIndex = 0,
  orientation = 'horizontal',
}: UseRovingTabIndexOptions) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const prevKey = orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
      const nextKey = orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown';

      let newIndex = activeIndex;

      if (event.key === prevKey) {
        event.preventDefault();
        newIndex = activeIndex > 0 ? activeIndex - 1 : itemCount - 1;
      } else if (event.key === nextKey) {
        event.preventDefault();
        newIndex = activeIndex < itemCount - 1 ? activeIndex + 1 : 0;
      } else if (event.key === 'Home') {
        event.preventDefault();
        newIndex = 0;
      } else if (event.key === 'End') {
        event.preventDefault();
        newIndex = itemCount - 1;
      }

      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex);
        itemRefs.current[newIndex]?.focus();
      }
    },
    [activeIndex, itemCount, orientation],
  );

  const getItemProps = useCallback(
    (index: number) => ({
      ref: (el: HTMLElement | null) => {
        itemRefs.current[index] = el;
      },
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: handleKeyDown,
      onFocus: () => setActiveIndex(index),
    }),
    [activeIndex, handleKeyDown],
  );

  return {
    activeIndex,
    setActiveIndex,
    getItemProps,
  };
}

// ============================================================================
// TYPEAHEAD NAVIGATION HOOK
// ============================================================================

interface UseTypeaheadOptions {
  /** List of searchable labels */
  items: string[];
  /** Callback when match is found */
  // eslint-disable-next-line no-unused-vars
  onMatch: (_index: number) => void;
  /** Timeout before resetting buffer (ms) */
  timeout?: number;
  /** Whether typeahead is active */
  isActive?: boolean;
}

/**
 * Hook for typeahead/type-to-select functionality in menus.
 */
export function useTypeahead({
  items,
  onMatch,
  timeout = 500,
  isActive = true,
}: UseTypeaheadOptions) {
  const bufferRef = useRef('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isActive) return;

      // Only handle printable characters
      if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      // Reset timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Add to buffer
      bufferRef.current += event.key.toLowerCase();

      // Find matching item
      const matchIndex = items.findIndex((item) =>
        item.toLowerCase().startsWith(bufferRef.current),
      );

      if (matchIndex !== -1) {
        onMatch(matchIndex);
      }

      // Reset buffer after timeout
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = '';
      }, timeout);
    },
    [items, onMatch, timeout, isActive],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { onKeyDown: handleKeyDown };
}

// ============================================================================
// FOCUS VISIBLE HOOK
// ============================================================================

/**
 * Hook to detect if focus was triggered by keyboard navigation.
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const hadKeyboardEventRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = () => {
      hadKeyboardEventRef.current = true;
    };

    const handlePointerDown = () => {
      hadKeyboardEventRef.current = false;
    };

    const handleFocus = () => {
      if (hadKeyboardEventRef.current) {
        setIsFocusVisible(true);
      }
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  return isFocusVisible;
}

const keyboardNavigationHooks = {
  useFocusTrap,
  useArrowNavigation,
  useEscapeKey,
  useRovingTabIndex,
  useTypeahead,
  useFocusVisible,
};

export default keyboardNavigationHooks;
