'use client';

/**
 * Loading Skeleton Components
 * 
 * Provides consistent loading states across the application.
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

/**
 * Base skeleton component
 */
export function Skeleton({ className = '', animate = true }: SkeletonProps): React.ReactElement {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded ${animate ? 'animate-pulse' : ''} ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Text line skeleton
 */
export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }): React.ReactElement {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

/**
 * Avatar skeleton
 */
export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }): React.ReactElement {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return <Skeleton className={`rounded-full ${sizeClasses[size]}`} />;
}

/**
 * Button skeleton
 */
export function SkeletonButton({ width = 'w-24' }: { width?: string }): React.ReactElement {
  return <Skeleton className={`h-10 rounded-lg ${width}`} />;
}

/**
 * Card skeleton
 */
export function SkeletonCard({ className = '' }: { className?: string }): React.ReactElement {
  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center space-x-4 mb-4">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex space-x-2 mt-4">
        <SkeletonButton width="w-20" />
        <SkeletonButton width="w-20" />
      </div>
    </div>
  );
}

/**
 * Job card skeleton
 */
export function SkeletonJobCard(): React.ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <Skeleton className="h-6 w-2/3 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <SkeletonText lines={2} />
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Skeleton className="h-4 w-24" />
        <SkeletonButton width="w-28" />
      </div>
    </div>
  );
}

/**
 * Table skeleton
 */
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }): React.ReactElement {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 px-2">
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex py-3 border-b border-gray-100 dark:border-gray-800">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 px-2">
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Page skeleton with sidebar
 */
export function SkeletonPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="hidden lg:block w-64 border-r border-gray-200 dark:border-gray-700 p-4">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
