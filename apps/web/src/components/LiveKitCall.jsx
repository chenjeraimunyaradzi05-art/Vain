'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

function VideoTrackView({ track, muted }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;

    track.attach(el);
    return () => {
      try {
        track.detach(el);
      } catch {
        // ignore
      }
    };
  }, [track]);

  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      autoPlay
      playsInline
      muted={muted}
    />
  );
}

function AudioTrackView({ track }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !track) return;

    track.attach(el);
    return () => {
      try {
        track.detach(el);
      } catch {
        // ignore
      }
    };
  }, [track]);

  return <audio ref={ref} autoPlay />;
}

function getBestVideoTrackPublication(participant) {
  if (!participant) return null;
  const pubs = Array.from(participant.videoTrackPublications?.values?.() || []);
  // Prefer camera, then any other video.
  return (
    pubs.find((p) => p?.source === Track.Source.Camera) ||
    pubs.find((p) => p?.source === Track.Source.ScreenShare) ||
    pubs[0] ||
    null
  );
}

function getBestAudioTrackPublication(participant) {
  if (!participant) return null;
  const pubs = Array.from(participant.audioTrackPublications?.values?.() || []);
  return pubs.find((p) => p?.source === Track.Source.Microphone) || pubs[0] || null;
}

export default function LiveKitCall({ url, token, onLeave }) {
  const room = useMemo(
    () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
      }),
    []
  );

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    let cancelled = false;

    function updateParticipants() {
      if (cancelled) return;
      const all = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
      setParticipants(all);
    }

    async function connect() {
      try {
        await room.connect(url, token);
        if (cancelled) return;

        room
          .on(RoomEvent.ParticipantConnected, updateParticipants)
          .on(RoomEvent.ParticipantDisconnected, updateParticipants)
          .on(RoomEvent.TrackSubscribed, updateParticipants)
          .on(RoomEvent.TrackUnsubscribed, updateParticipants);

        // Publish local media
        await room.localParticipant.enableCameraAndMicrophone();

        setConnected(true);
        updateParticipants();
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Failed to connect to LiveKit';
        setError(message);
      }
    }

    connect();

    return () => {
      cancelled = true;
      try {
        room.removeAllListeners();
      } catch {
        // ignore
      }
      try {
        room.disconnect();
      } catch {
        // ignore
      }
    };
  }, [room, url, token]);

  if (error) {
    return (
      <div className="w-full h-full min-h-[600px] bg-slate-900 rounded-xl flex items-center justify-center">
        <div className="text-center p-8">
          <h3 className="text-lg font-semibold mb-2">Video Call Error</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={() => onLeave?.()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="w-full h-[600px] bg-slate-900 rounded-xl flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Connecting to video call...</p>
        </div>
      </div>
    );
  }

  const remoteAudio = participants
    .filter((p) => p !== room.localParticipant)
    .map((p) => ({
      participant: p,
      pub: getBestAudioTrackPublication(p),
    }))
    .filter((x) => x.pub?.track);

  return (
    <div className="w-full h-full min-h-[600px] bg-slate-900 rounded-xl overflow-hidden flex flex-col">
      <div className="flex-1 p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
          {participants.map((p) => {
            const isLocal = p === room.localParticipant;
            const pub = getBestVideoTrackPublication(p);
            const track = pub?.track;
            const label = p?.name || p?.identity || (isLocal ? 'You' : 'Participant');

            return (
              <div
                key={p?.sid || p?.identity || label}
                className="relative bg-slate-950/40 border border-slate-800 rounded-lg overflow-hidden"
                style={{ minHeight: 260 }}
              >
                {track ? (
                  <VideoTrackView track={track} muted={isLocal} />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400">
                    Camera off
                  </div>
                )}

                <div className="absolute left-2 bottom-2 text-xs px-2 py-1 rounded bg-slate-900/70 border border-slate-800 text-slate-200">
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hidden remote audio renderers */}
      <div className="hidden">
        {remoteAudio.map(({ participant, pub }) => (
          <AudioTrackView key={participant?.sid || participant?.identity} track={pub.track} />
        ))}
      </div>
    </div>
  );
}
