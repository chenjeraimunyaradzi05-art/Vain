import React from 'react';
import { Skeleton } from './Skeleton';

export function JobCardSkeleton() {
  return (
    <div className="bg-white/80 dark:bg-[#0f172a]/72 rounded-xl p-4 border border-slate-200 dark:border-slate-700/30 shadow-sm backdrop-blur-md transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700/50">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}
