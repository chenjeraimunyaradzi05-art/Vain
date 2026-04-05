'use client';

import dynamic from 'next/dynamic';

// Skeleton placeholder to prevent layout shift / flickering
function HeaderSkeleton() {
  return (
    <header className="bg-white shadow-sm">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Top">
        <div className="flex w-full items-center justify-between border-b border-gray-200 py-6 lg:border-none">
          <div className="flex items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="leading-tight">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-100 rounded mt-1 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="hidden lg:flex gap-4">
            <div className="h-10 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </nav>
    </header>
  );
}

const HeaderNavigation = dynamic(() => import('./HeaderNavigation'), {
  ssr: false,
  loading: () => <HeaderSkeleton />,
});

export default function HeaderNavigationClientOnly() {
  return <HeaderNavigation />;
}
