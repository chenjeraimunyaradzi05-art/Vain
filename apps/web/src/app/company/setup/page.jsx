import { Suspense } from 'react';
import SetupClient from './SetupClient';

function SetupFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a1a] via-[#151530] to-[#1a1a2e]">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">🏢</div>
        <p className="text-white/60">Loading company setup...</p>
      </div>
    </div>
  );
}

/**
 * Company Setup Page (Server Component)
 * Wraps the client component with Suspense for useSearchParams
 */
export default function CompanySetupPage() {
  return (
    <Suspense fallback={<SetupFallback />}>
      <SetupClient />
    </Suspense>
  );
}
