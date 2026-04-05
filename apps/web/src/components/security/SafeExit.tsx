'use client';

import React, { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

/**
 * SafeExit Component
 * Provides a quick exit button to redirect users to a neutral site (e.g., Google or Weather)
 * and optionally clears session/sensitive state if needed.
 * This is a critical safety feature for Women's Spaces and support areas.
 */
export const SafeExit = () => {
  const handleSafeExit = () => {
    // Redirect to a neutral safe site
    window.location.href = 'https://www.google.com';
    
    // Optional: clear some local/session storage to avoid breadcrumbs
    // localStorage.removeItem('last_viewed_group');
    // sessionStorage.clear();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow ESC key as a shortcut for quick exit
      if (e.key === 'Escape') {
        handleSafeExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <button
      onClick={handleSafeExit}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-all transform hover:scale-105 group"
      title="Quickly exit this site and redirect to Google (Shortcut: ESC)"
      aria-label="Safe Exit"
    >
      <ShieldAlert className="w-5 h-5" />
      <span className="font-bold text-sm hidden group-hover:block">QUICK EXIT</span>
      <span className="text-xs opacity-80">(ESC)</span>
    </button>
  );
};
