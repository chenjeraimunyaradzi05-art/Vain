'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  /** The root element for the intersection */
  root?: Element | null;
  /** Margin around the root element */
  rootMargin?: string;
  /** Threshold(s) at which to trigger */
  threshold?: number | number[];
  /** Whether to trigger only once */
  triggerOnce?: boolean;
  /** Whether the observer is enabled */
  enabled?: boolean;
}

interface UseIntersectionObserverReturn<T extends Element> {
  /** Ref to attach to the observed element */
  ref: React.RefCallback<T>;
  /** Whether the element is currently intersecting */
  isIntersecting: boolean;
  /** The current intersection entry */
  entry: IntersectionObserverEntry | null;
}

export function useIntersectionObserver<T extends Element = HTMLDivElement>({
  root = null,
  rootMargin = '0px',
  threshold = 0,
  triggerOnce = false,
  enabled = true,
}: UseIntersectionObserverOptions = {}): UseIntersectionObserverReturn<T> {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<T | null>(null);
  const hasTriggeredRef = useRef(false);

  const ref = useCallback((element: T | null) => {
    // Cleanup previous observer
    if (observerRef.current && elementRef.current) {
      observerRef.current.unobserve(elementRef.current);
    }

    elementRef.current = element;

    if (!element || !enabled) return;
    if (triggerOnce && hasTriggeredRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setEntry(entry);
        setIsIntersecting(entry.isIntersecting);

        if (entry.isIntersecting && triggerOnce) {
          hasTriggeredRef.current = true;
          observerRef.current?.disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observerRef.current.observe(element);
  }, [root, rootMargin, threshold, triggerOnce, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { ref, isIntersecting, entry };
}

// Hook for lazy loading content when it enters viewport
interface UseLazyLoadOptions extends UseIntersectionObserverOptions {
  /** Callback when element becomes visible */
  onVisible?: () => void;
}

export function useLazyLoad<T extends Element = HTMLDivElement>(
  options: UseLazyLoadOptions = {}
) {
  const { onVisible, ...intersectionOptions } = options;
  const hasLoadedRef = useRef(false);
  
  const { ref, isIntersecting, entry } = useIntersectionObserver<T>({
    ...intersectionOptions,
    triggerOnce: true,
  });

  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isIntersecting && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      setHasLoaded(true);
      onVisible?.();
    }
  }, [isIntersecting, onVisible]);

  return {
    ref,
    isVisible: isIntersecting,
    hasLoaded,
    entry,
  };
}

// Hook for animating elements when they enter viewport
interface UseAnimateOnScrollOptions extends UseIntersectionObserverOptions {
  /** Animation class to apply */
  animationClass?: string;
  /** Initial class before animation */
  initialClass?: string;
}

export function useAnimateOnScroll<T extends Element = HTMLDivElement>({
  animationClass = 'animate-fade-in-up',
  initialClass = 'opacity-0 translate-y-4',
  ...options
}: UseAnimateOnScrollOptions = {}) {
  const { ref, isIntersecting } = useIntersectionObserver<T>({
    ...options,
    triggerOnce: true,
  });

  const className = isIntersecting 
    ? `${animationClass} opacity-100 translate-y-0` 
    : initialClass;

  return { ref, className, isVisible: isIntersecting };
}

// Hook for tracking scroll progress of an element
export function useScrollProgress<T extends Element = HTMLDivElement>() {
  const [progress, setProgress] = useState(0);
  const elementRef = useRef<T | null>(null);

  const ref = useCallback((element: T | null) => {
    elementRef.current = element;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how much of the element is visible
      const visibleStart = Math.max(0, windowHeight - rect.top);
      const totalVisible = Math.min(rect.height + windowHeight, visibleStart);
      const newProgress = Math.min(1, Math.max(0, totalVisible / (rect.height + windowHeight)));
      
      setProgress(newProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return { ref, progress };
}

export default useIntersectionObserver;
