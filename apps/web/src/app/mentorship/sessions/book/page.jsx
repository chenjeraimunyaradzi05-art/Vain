import { Suspense } from 'react';
import BookSessionClient from './BookSessionClient';

function BookSessionFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a1a] via-[#151530] to-[#1a1a2e]">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">📅</div>
        <p className="text-white/60">Loading booking calendar...</p>
      </div>
    </div>
  );
}

/**
 * Book Session Page (Server Component)
 * Wraps the client booking component with Suspense for useSearchParams
 */
export default function BookSessionPage() {
  return (
    <Suspense fallback={<BookSessionFallback />}>
      <BookSessionClient />
    </Suspense>
  );
}
