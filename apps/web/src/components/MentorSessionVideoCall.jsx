'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/apiClient';
import VideoRoom from '@/components/video/VideoRoom';
import VideoCall from '@/components/VideoCall';

export default function MentorSessionVideoCall({
  sessionId,
  roomName,
  displayName,
  sessionInfo,
  onLeave,
}) {
  const [mode, setMode] = useState('loading'); // loading | livekit | jitsi
  const [liveKit, setLiveKit] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Default to Jitsi unless LiveKit is both configured and token issuance succeeds.
      try {
        const health = await api('/video-sessions/health');
        const configured = Boolean(health.ok && health.data?.configured);

        if (!configured) {
          if (!cancelled) setMode('jitsi');
          return;
        }

        const tokenRes = await api(`/video-sessions/mentor-sessions/${sessionId}/token`, {
          method: 'POST',
          body: displayName ? { name: displayName } : {},
          // If LiveKit is down/misconfigured, don't keep retrying here.
          skipRetry: true,
        });

        if (
          tokenRes.ok &&
          tokenRes.data &&
          typeof tokenRes.data?.url === 'string' &&
          typeof tokenRes.data?.token === 'string'
        ) {
          if (!cancelled) {
            setLiveKit({ url: tokenRes.data.url, token: tokenRes.data.token });
            setMode('livekit');
          }
          return;
        }

        if (!cancelled) setMode('jitsi');
      } catch {
        if (!cancelled) setMode('jitsi');
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [sessionId, displayName]);

  if (mode === 'livekit' && liveKit) {
    return (
      <VideoRoom 
        serverUrl={liveKit.url} 
        token={liveKit.token} 
        onDisconnected={onLeave} 
      />
    );
  }

  // Jitsi fallback
  return (
    <VideoCall
      roomName={roomName}
      displayName={displayName}
      sessionId={sessionId}
      sessionInfo={sessionInfo}
      onLeave={onLeave}
    />
  );
}
