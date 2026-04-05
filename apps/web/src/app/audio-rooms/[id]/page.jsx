'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';
import { redirect } from 'next/navigation';

/**
 * Audio Room Redirect Page
 * Redirects to the main /live/room/[id] path for consistency
 */
export default function AudioRoomRedirectPage() {
  const params = useParams();
  const roomId = params.id;
  
  useEffect(() => {
    // Redirect to the main audio room path
    window.location.href = `/live/room/${roomId}`;
  }, [roomId]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Joining room...</p>
      </div>
    </div>
  );
}
