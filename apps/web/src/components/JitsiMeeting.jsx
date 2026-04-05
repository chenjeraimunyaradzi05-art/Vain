'use client';

import { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Maximize2, Minimize2 } from 'lucide-react';

/**
 * JitsiMeeting Component
 * Embeds a Jitsi Meet video call in the application
 * 
 * @param {string} roomName - The Jitsi room name
 * @param {string} displayName - User's display name
 * @param {string} domain - Jitsi domain (default: meet.jit.si)
 * @param {function} onClose - Callback when call ends
 * @param {object} configOverwrite - Jitsi config options
 */
export default function JitsiMeeting({
  roomName,
  displayName = 'Participant',
  domain = 'meet.jit.si',
  onClose,
  configOverwrite = {},
  interfaceConfigOverwrite = {},
  subject = 'Ngurra Mentorship Session',
  height = '100%',
  width = '100%',
}) {
  const jitsiContainerRef = useRef(null);
  const apiRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);

  useEffect(() => {
    // Load Jitsi Meet external API script
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Failed to load Jitsi script'));
        document.head.appendChild(script);
      });
    };

    const initJitsi = async () => {
      try {
        await loadJitsiScript();
        setIsLoading(false);

        if (jitsiContainerRef.current && window.JitsiMeetExternalAPI) {
          const options = {
            roomName,
            parentNode: jitsiContainerRef.current,
            userInfo: {
              displayName,
            },
            configOverwrite: {
              prejoinPageEnabled: false,
              startWithAudioMuted: false,
              startWithVideoMuted: false,
              disableDeepLinking: true,
              enableWelcomePage: false,
              enableClosePage: false,
              disableInviteFunctions: true,
              hideConferenceSubject: false,
              subject,
              ...configOverwrite,
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              DEFAULT_BACKGROUND: '#1e293b',
              TOOLBAR_BUTTONS: [
                'microphone', 'camera', 'closedcaptions', 'desktop',
                'fullscreen', 'hangup', 'chat', 'settings',
                'raisehand', 'videoquality', 'tileview',
              ],
              SETTINGS_SECTIONS: ['devices', 'language'],
              ...interfaceConfigOverwrite,
            },
          };

          apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

          // Event listeners
          apiRef.current.addListener('videoConferenceJoined', () => {
            console.log('Joined conference');
          });

          apiRef.current.addListener('participantJoined', () => {
            setParticipantCount(prev => prev + 1);
          });

          apiRef.current.addListener('participantLeft', () => {
            setParticipantCount(prev => Math.max(1, prev - 1));
          });

          apiRef.current.addListener('audioMuteStatusChanged', ({ muted }) => {
            setIsAudioMuted(muted);
          });

          apiRef.current.addListener('videoMuteStatusChanged', ({ muted }) => {
            setIsVideoMuted(muted);
          });

          apiRef.current.addListener('readyToClose', () => {
            onClose?.();
          });
        }
      } catch (err) {
        console.error('Jitsi initialization error:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    initJitsi();

    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
      }
    };
  }, [roomName, displayName, domain, subject, configOverwrite, interfaceConfigOverwrite, onClose]);

  const toggleAudio = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('toggleVideo');
    }
  };

  const toggleFullscreen = () => {
    if (jitsiContainerRef.current) {
      if (!document.fullscreenElement) {
        jitsiContainerRef.current.requestFullscreen?.();
        setIsFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setIsFullscreen(false);
      }
    }
  };

  const hangUp = () => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
    }
    onClose?.();
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-900 rounded-xl p-8">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">Failed to load video call</div>
          <p className="text-slate-400 mb-4">{error}</p>
          <a
            href={`https://${domain}/${roomName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium"
          >
            Open in New Tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-slate-900 rounded-xl overflow-hidden" style={{ height, width }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
            <p className="text-slate-300">Connecting to video call...</p>
          </div>
        </div>
      )}

      {/* Jitsi container */}
      <div
        ref={jitsiContainerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {/* Custom controls overlay */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-800/90 backdrop-blur-sm px-4 py-2 rounded-full z-20">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition-colors ${
            isAudioMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-700 hover:bg-slate-600'
          }`}
          title={isAudioMuted ? 'Unmute' : 'Mute'}
        >
          {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition-colors ${
            isVideoMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-700 hover:bg-slate-600'
          }`}
          title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        <button
          onClick={hangUp}
          className="p-3 rounded-full bg-red-600 hover:bg-red-500 transition-colors"
          title="End call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>

        <div className="w-px h-6 bg-slate-600" />

        <button
          onClick={toggleFullscreen}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2 text-slate-300 text-sm">
          <Users className="w-4 h-4" />
          <span>{participantCount}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple video meeting link component (for when embedding isn't needed)
 */
export function VideoMeetingLink({ meetingUrl, buttonText = 'Join Video Call' }) {
  return (
    <a
      href={meetingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
    >
      <Video className="w-5 h-5" />
      {buttonText}
    </a>
  );
}
