/**
 * Accessibility Utilities
 * Helpers for building accessible components
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to trap focus within an element (for modals, dialogs)
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    
    const getFocusableElements = () => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Focus first element when trap activates
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return containerRef;
}

/**
 * Hook to restore focus to previous element when component unmounts
 */
export function useFocusReturn() {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;

    return () => {
      if (previousFocus.current && typeof previousFocus.current.focus === 'function') {
        previousFocus.current.focus();
      }
    };
  }, []);
}

/**
 * Hook to announce content to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;

    document.body.appendChild(announcer);

    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, []);

  return announce;
}

/**
 * Hook to manage roving tabindex for keyboard navigation
 */
export function useRovingTabIndex<T extends HTMLElement>(
  items: T[] | NodeListOf<T>,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
    onSelect?: (element: T, index: number) => void;
  } = {}
) {
  const { orientation = 'both', wrap = true, onSelect } = options;
  const currentIndex = useRef(0);

  useEffect(() => {
    const elements = Array.from(items);
    if (elements.length === 0) return;

    // Set initial tabindex
    elements.forEach((el, index) => {
      el.setAttribute('tabindex', index === currentIndex.current ? '0' : '-1');
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';
      const isVertical = orientation === 'vertical' || orientation === 'both';

      let nextIndex = currentIndex.current;

      switch (event.key) {
        case 'ArrowLeft':
          if (isHorizontal) {
            event.preventDefault();
            nextIndex = currentIndex.current - 1;
          }
          break;
        case 'ArrowRight':
          if (isHorizontal) {
            event.preventDefault();
            nextIndex = currentIndex.current + 1;
          }
          break;
        case 'ArrowUp':
          if (isVertical) {
            event.preventDefault();
            nextIndex = currentIndex.current - 1;
          }
          break;
        case 'ArrowDown':
          if (isVertical) {
            event.preventDefault();
            nextIndex = currentIndex.current + 1;
          }
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = elements.length - 1;
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          onSelect?.(elements[currentIndex.current], currentIndex.current);
          return;
        default:
          return;
      }

      // Handle wrapping
      if (wrap) {
        if (nextIndex < 0) nextIndex = elements.length - 1;
        if (nextIndex >= elements.length) nextIndex = 0;
      } else {
        nextIndex = Math.max(0, Math.min(elements.length - 1, nextIndex));
      }

      if (nextIndex !== currentIndex.current) {
        elements[currentIndex.current].setAttribute('tabindex', '-1');
        elements[nextIndex].setAttribute('tabindex', '0');
        elements[nextIndex].focus();
        currentIndex.current = nextIndex;
      }
    };

    elements.forEach((el) => {
      el.addEventListener('keydown', handleKeyDown);
    });

    return () => {
      elements.forEach((el) => {
        el.removeEventListener('keydown', handleKeyDown);
      });
    };
  }, [items, orientation, wrap, onSelect]);
}

/**
 * Generate unique ID for accessibility attributes
 */
let idCounter = 0;
export function useId(prefix: string = 'id'): string {
  const id = useRef<string | null>(null);

  if (id.current === null) {
    id.current = `${prefix}-${++idCounter}`;
  }

  return id.current;
}

/**
 * Hook to detect if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to detect if user prefers high contrast
 */
export function usePrefersHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersHighContrast;
}

/**
 * Skip link component for keyboard navigation
 */
export function SkipLink({ 
  href = '#main-content', 
  children = 'Skip to main content' 
}: { 
  href?: string; 
  children?: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:outline focus:outline-2 focus:outline-offset-2"
    >
      {children}
    </a>
  );
}

/**
 * Visually hidden component for screen readers
 */
export function VisuallyHidden({ 
  children, 
  as: Component = 'span' 
}: { 
  children: React.ReactNode;
  as?: React.ElementType;
}) {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
}

/**
 * Live region for dynamic announcements
 */
export function LiveRegion({
  children,
  priority = 'polite',
  atomic = true,
}: {
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      className="sr-only"
    >
      {children}
    </div>
  );
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hex
      .replace('#', '')
      .match(/.{2}/g)
      ?.map((x) => {
        const value = parseInt(x, 16) / 255;
        return value <= 0.03928
          ? value / 12.92
          : Math.pow((value + 0.055) / 1.055, 2.4);
      }) || [0, 0, 0];

    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };

  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG requirements
 */
export function meetsContrastRequirement(
  ratio: number,
  size: 'normal' | 'large' = 'normal',
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const requirements = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 },
  };

  return ratio >= requirements[level][size];
}

// Import React for JSX
import React from 'react';

const accessibilityUtils = {
  useFocusTrap,
  useFocusReturn,
  useAnnounce,
  useRovingTabIndex,
  useId,
  usePrefersReducedMotion,
  usePrefersHighContrast,
  SkipLink,
  VisuallyHidden,
  LiveRegion,
  getContrastRatio,
  meetsContrastRequirement,
};

export default accessibilityUtils;
