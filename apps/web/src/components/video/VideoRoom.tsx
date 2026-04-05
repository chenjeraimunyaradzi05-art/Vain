'use client';

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  VideoConference,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface VideoRoomProps {
  token: string;
  serverUrl: string;
  connect?: boolean;
  onDisconnected?: () => void;
  audio?: boolean;
  video?: boolean;
}

export default function VideoRoom({
  token,
  serverUrl,
  connect = true,
  onDisconnected,
  audio = true,
  video = true,
}: VideoRoomProps) {
  const router = useRouter();

  // Handle disconnection
  const handleDisconnected = () => {
    if (onDisconnected) {
      onDisconnected();
    } else {
      router.back();
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] w-full bg-sand-dark relative overflow-hidden cosmic:bg-cosmic-deep">
      <LiveKitRoom
        video={video}
        audio={audio}
        token={token}
        serverUrl={serverUrl}
        connect={connect}
        onDisconnected={handleDisconnected}
        data-lk-theme="default"
        className="h-full w-full"
      >
        {/* Custom Video Conference Layout */}
        <VideoConference />
        
        {/* Or build custom layout with GridLayout if VideoConference is too rigid */}
        {/* <MyCustomLayout /> */}
        
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

function MyCustomLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4">
        <GridLayout tracks={tracks}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <ControlBar 
            variation="minimal" 
            controls={{ microphone: true, camera: true, screenShare: true, chat: false }}
        />
      </div>
    </div>
  );
}
