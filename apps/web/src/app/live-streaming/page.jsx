'use client';

import { useEffect } from 'react';

/**
 * Live Streaming Redirect Page
 * Redirects to the main /live path for consistency
 */
export default function LiveStreamingRedirectPage() {
  useEffect(() => {
    window.location.href = '/live';
  }, []);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Live...</p>
      </div>
    </div>
  );
}
