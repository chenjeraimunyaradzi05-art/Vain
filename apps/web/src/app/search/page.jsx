import { Suspense } from 'react';
import SearchClient from './SearchClient';
import { Loader2 } from 'lucide-react';

// Feminine theme constants
const accentPink = '#E91E8C';
const accentPurple = '#8B5CF6';

function SearchFallback() {
  return (
    <div className="ngurra-page pt-24 pb-20">
      {/* Decorative Halos */}
      <div className="ngurra-halos">
        <div className="ngurra-halo-pink" />
        <div className="ngurra-halo-purple" />
      </div>
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-pink-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading search...</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Search Page (Server Component)
 * Wraps the client search component with Suspense for useSearchParams
 */
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchClient />
    </Suspense>
  );
}
