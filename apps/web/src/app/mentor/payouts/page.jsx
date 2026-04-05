import { Suspense } from 'react';
import PayoutsClient from './PayoutsClient';

function PayoutsFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a1a] via-[#151530] to-[#1a1a2e]">
      <div className="text-center">
        <div className="animate-spin text-4xl mb-4">💰</div>
        <p className="text-white/60">Loading payout information...</p>
      </div>
    </div>
  );
}

/**
 * Mentor Payouts Page (Server Component)
 * Wraps the client component with Suspense for useSearchParams
 */
export default function MentorPayoutsPage() {
  return (
    <Suspense fallback={<PayoutsFallback />}>
      <PayoutsClient />
    </Suspense>
  );
}
