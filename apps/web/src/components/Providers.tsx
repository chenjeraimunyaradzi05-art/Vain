'use client';

import React from 'react';
// @ts-ignore
import NotificationProvider from './notifications/NotificationProvider';
import { ErrorBoundary } from './ErrorBoundary';
import ConsoleGuard from './ConsoleGuard';
import { ThemeProvider } from './ThemeProvider';
import { ToastProvider } from './Toast';

/**
 * Root Providers Component
 * 
 * Wraps the application with all necessary context providers.
 * Ngurra Pathways - Celestial Precious Stone Theme
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ConsoleGuard />
      <ThemeProvider defaultTheme="system">
        <ToastProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
