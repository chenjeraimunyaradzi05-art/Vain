'use client';

import { useEffect } from 'react';

/**
 * ConsoleGuard
 *
 * Reduces noisy console output in production builds.
 * This is intentionally conservative: errors are left intact.
 */
export default function ConsoleGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    if (typeof window === 'undefined') return;

    const original = {
      log: console.log,
      info: console.info,
      debug: console.debug,
      warn: console.warn,
    };

    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    console.warn = () => {};

    return () => {
      console.log = original.log;
      console.info = original.info;
      console.debug = original.debug;
      console.warn = original.warn;
    };
  }, []);

  return null;
}
