/**
 * Debug Utilities
 * Development and debugging helpers
 */

import { useEffect, useRef } from 'react';

/**
 * Log component renders with props changes
 */
export function useWhyDidYouUpdate<T extends Record<string, unknown>>(
  componentName: string,
  props: T
): void {
  const previousProps = useRef<T | undefined>(undefined);

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changesObj: Record<string, { from: unknown; to: unknown }> = {};

      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changesObj[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changesObj).length) {
        console.log('[why-did-you-update]', componentName, changesObj);
      }
    }

    previousProps.current = props;
  });
}

/**
 * Count component renders
 */
export function useRenderCount(componentName: string): number {
  const renderCount = useRef(0);
  renderCount.current++;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[render-count] ${componentName}: ${renderCount.current}`);
  }

  return renderCount.current;
}

/**
 * Profile component mount/unmount
 */
export function useComponentLifecycle(componentName: string): void {
  useEffect(() => {
    const mountTime = performance.now();
    console.log(`[lifecycle] ${componentName} mounted at ${mountTime.toFixed(2)}ms`);

    return () => {
      const unmountTime = performance.now();
      const duration = unmountTime - mountTime;
      console.log(
        `[lifecycle] ${componentName} unmounted after ${duration.toFixed(2)}ms`
      );
    };
  }, [componentName]);
}

/**
 * Track async operation duration
 */
export async function trackAsyncOperation<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  console.log(`[async] Starting: ${name}`);

  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    console.log(`[async] Completed: ${name} in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[async] Failed: ${name} after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Create a debug logger with namespace
 */
export function createDebugLogger(namespace: string) {
  const isEnabled =
    process.env.NODE_ENV === 'development' ||
    (typeof window !== 'undefined' &&
      localStorage.getItem('debug')?.includes(namespace));

  return {
    log: (...args: unknown[]) => {
      if (isEnabled) {
        console.log(`[${namespace}]`, ...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (isEnabled) {
        console.warn(`[${namespace}]`, ...args);
      }
    },
    error: (...args: unknown[]) => {
      // Always log errors
      console.error(`[${namespace}]`, ...args);
    },
    time: (label: string) => {
      if (isEnabled) {
        console.time(`[${namespace}] ${label}`);
      }
    },
    timeEnd: (label: string) => {
      if (isEnabled) {
        console.timeEnd(`[${namespace}] ${label}`);
      }
    },
    group: (label: string) => {
      if (isEnabled) {
        console.group(`[${namespace}] ${label}`);
      }
    },
    groupEnd: () => {
      if (isEnabled) {
        console.groupEnd();
      }
    },
    table: (data: unknown) => {
      if (isEnabled) {
        console.log(`[${namespace}]`);
        console.table(data);
      }
    },
  };
}

/**
 * Measure React component render time
 */
export function withRenderTiming<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.FC<P> {
  const name = componentName || Component.displayName || Component.name || 'Component';

  const TimedComponent: React.FC<P> = (props) => {
    const startTime = useRef(performance.now());

    useEffect(() => {
      const renderTime = performance.now() - startTime.current;
      console.log(`[render-time] ${name}: ${renderTime.toFixed(2)}ms`);
    });

    startTime.current = performance.now();
    return <Component {...props} />;
  };

  TimedComponent.displayName = `withRenderTiming(${name})`;
  return TimedComponent;
}

/**
 * Trace object property access
 */
export function createTracedObject<T extends object>(
  obj: T,
  name: string
): T {
  if (process.env.NODE_ENV !== 'development') {
    return obj;
  }

  return new Proxy(obj, {
    get(target, prop, receiver) {
      console.log(`[trace] ${name}.${String(prop)} accessed`);
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      console.log(`[trace] ${name}.${String(prop)} set to:`, value);
      return Reflect.set(target, prop, value, receiver);
    },
  });
}

/**
 * Debug state changes
 */
export function useDebugState<T>(
  initialValue: T,
  name: string
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState(initialValue);

  const setStateWithDebug = React.useCallback<
    React.Dispatch<React.SetStateAction<T>>
  >(
    (value) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[state] ${name}:`, {
          previous: state,
          next: typeof value === 'function' ? '(function)' : value,
        });
      }
      setState(value);
    },
    [name, state]
  );

  return [state, setStateWithDebug];
}

/**
 * Log network requests
 */
export function setupNetworkLogging(): void {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }

  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    const [url, options] = args;
    const startTime = performance.now();
    const method = options?.method || 'GET';

    console.log(`[network] ${method} ${url} started`);

    try {
      const response = await originalFetch(...args);
      const duration = performance.now() - startTime;

      console.log(
        `[network] ${method} ${url} completed`,
        `${response.status} in ${duration.toFixed(2)}ms`
      );

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(
        `[network] ${method} ${url} failed after ${duration.toFixed(2)}ms`,
        error
      );
      throw error;
    }
  };
}

/**
 * Create a performance mark
 */
export function mark(name: string): void {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(name);
  }
}

/**
 * Measure between two marks
 */
export function measure(
  name: string,
  startMark: string,
  endMark?: string
): PerformanceMeasure | null {
  if (typeof performance !== 'undefined' && performance.measure) {
    try {
      const measure = performance.measure(name, startMark, endMark);
      console.log(`[perf] ${name}: ${measure.duration.toFixed(2)}ms`);
      return measure;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Get all performance entries
 */
export function getPerformanceReport(): {
  marks: PerformanceEntry[];
  measures: PerformanceEntry[];
  resources: PerformanceEntry[];
  navigation: PerformanceEntry | null;
} {
  if (typeof performance === 'undefined') {
    return { marks: [], measures: [], resources: [], navigation: null };
  }

  return {
    marks: performance.getEntriesByType('mark'),
    measures: performance.getEntriesByType('measure'),
    resources: performance.getEntriesByType('resource'),
    navigation: performance.getEntriesByType('navigation')[0] || null,
  };
}

// Need to import React for JSX
import React from 'react';

const debugUtils = {
  useWhyDidYouUpdate,
  useRenderCount,
  useComponentLifecycle,
  trackAsyncOperation,
  createDebugLogger,
  withRenderTiming,
  createTracedObject,
  useDebugState,
  setupNetworkLogging,
  mark,
  measure,
  getPerformanceReport,
};

export default debugUtils;
