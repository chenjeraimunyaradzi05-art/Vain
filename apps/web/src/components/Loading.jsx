'use client';

/**
 * Loading Spinner Component
 * Provides consistent loading states across the app
 */

// Basic spinner
export function Spinner({ size = 'md', className = '' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
    xl: 'h-16 w-16 border-4',
  };

  return (
    <div 
      className={`animate-spin rounded-full border-slate-700 border-t-blue-500 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

// Full page loading overlay
export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 flex items-center justify-center z-50">
      <div className="text-center">
        <Spinner size="xl" className="mx-auto mb-4" />
        <p className="text-slate-300">{message}</p>
      </div>
    </div>
  );
}

// Card/section skeleton loader
export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 animate-pulse">
      <div className="h-6 w-1/3 bg-slate-700 rounded mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`h-4 bg-slate-700/50 rounded mb-2 ${
            i === lines - 1 ? 'w-2/3' : 'w-full'
          }`} 
        />
      ))}
    </div>
  );
}

// Grid of skeleton cards
export function GridSkeleton({ count = 4, columns = 2 }) {
  return (
    <div className={`grid gap-4 md:grid-cols-${columns}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex border-b border-slate-700 p-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-slate-700 rounded mx-2" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex border-b border-slate-700/50 p-4">
          {Array.from({ length: columns }).map((_, col) => (
            <div key={col} className="flex-1 h-4 bg-slate-700/50 rounded mx-2" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Dashboard stats skeleton
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 animate-pulse">
          <div className="h-8 w-20 bg-slate-700 rounded mb-2" />
          <div className="h-4 w-24 bg-slate-700/50 rounded" />
        </div>
      ))}
    </div>
  );
}

// Inline loading indicator for buttons etc
export function InlineLoader({ text = 'Loading...' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size="sm" />
      <span>{text}</span>
    </span>
  );
}

// Content placeholder with pulse animation
export function Placeholder({ width = 'full', height = '4' }) {
  return (
    <div 
      className={`animate-pulse bg-slate-700/50 rounded w-${width} h-${height}`} 
    />
  );
}

// Profile/avatar skeleton
export function AvatarSkeleton({ size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div 
      className={`animate-pulse bg-slate-700 rounded-full ${sizeClasses[size]}`} 
    />
  );
}

// List item skeleton
export function ListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg animate-pulse">
          <AvatarSkeleton size="md" />
          <div className="flex-1">
            <div className="h-4 w-1/3 bg-slate-700 rounded mb-2" />
            <div className="h-3 w-1/2 bg-slate-700/50 rounded" />
          </div>
          <div className="h-8 w-20 bg-slate-700 rounded" />
        </div>
      ))}
    </div>
  );
}

export default Spinner;
