'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    Video, 
    VideoOff, 
    Mic, 
    MicOff, 
    Phone,
    MessageSquare,
    Users,
    Maximize,
    Settings,
    Share2
} from 'lucide-react';

/**
 * VideoCall component using Jitsi Meet for video conferencing
 * Can be embedded in session pages for mentor-mentee calls
 */
export default function VideoCall({ 
    roomName, 
    displayName = 'Participant',
    email = '',
    onLeave,
    onError,
    sessionId,
    sessionInfo = {}
}) {
    const jitsiContainerRef = useRef(null);
    const jitsiApiRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [participantCount, setParticipantCount] = useState(1);
    const [showChat, setShowChat] = useState(false);

    useEffect(() => {
        if (!roomName) {
            setError('No room name provided');
            setLoading(false);
            return;
        }

        loadJitsiScript();

        return () => {
            if (jitsiApiRef.current) {
                jitsiApiRef.current.dispose();
            }
        };
    }, [roomName]);

    function loadJitsiScript() {
        // Check if script already loaded
        if (window.JitsiMeetExternalAPI) {
            initializeJitsi();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.async = true;
        script.onload = initializeJitsi;
        script.onerror = () => {
            setError('Failed to load video conference');
            setLoading(false);
        };
        document.body.appendChild(script);
    }

    function initializeJitsi() {
        if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

        try {
            // Generate room name with session ID for uniqueness
            const fullRoomName = sessionId 
                ? `gimbi-session-${sessionId}-${roomName}`
                : `gimbi-${roomName}`;

            const domain = 'meet.jit.si';
            const options = {
                roomName: fullRoomName,
                width: '100%',
                height: '100%',
                parentNode: jitsiContainerRef.current,
                userInfo: {
                    displayName: displayName,
                    email: email
                },
                configOverwrite: {
                    startWithAudioMuted: false,
                    startWithVideoMuted: false,
                    prejoinPageEnabled: false,
                    disableDeepLinking: true,
                    enableWelcomePage: false,
                    enableClosePage: false,
                    disableThirdPartyRequests: true,
                    enableNoisyMicDetection: true,
                    // Disable some features for cleaner UI
                    toolbarButtons: [
                        'camera',
                        'chat',
                        'desktop',
                        'filmstrip',
                        'fullscreen',
                        'hangup',
                        'microphone',
                        'participants-pane',
                        'raisehand',
                        'select-background',
                        'settings',
                        'tileview'
                    ],
                },
                interfaceConfigOverwrite: {
                    SHOW_JITSI_WATERMARK: false,
                    SHOW_WATERMARK_FOR_GUESTS: false,
                    TOOLBAR_BUTTONS: [
                        'microphone', 'camera', 'desktop', 'fullscreen',
                        'hangup', 'chat', 'raisehand', 'tileview',
                        'settings', 'participants-pane'
                    ],
                    SETTINGS_SECTIONS: ['devices', 'language'],
                    DEFAULT_BACKGROUND: '#1e293b', // Slate-800
                    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                    MOBILE_APP_PROMO: false,
                    HIDE_INVITE_MORE_HEADER: true,
                    DEFAULT_REMOTE_DISPLAY_NAME: 'Participant'
                }
            };

            const api = new window.JitsiMeetExternalAPI(domain, options);
            jitsiApiRef.current = api;

            // Event listeners
            api.addListener('readyToClose', handleClose);
            api.addListener('participantJoined', handleParticipantUpdate);
            api.addListener('participantLeft', handleParticipantUpdate);
            api.addListener('audioMuteStatusChanged', ({ muted }) => setIsMuted(muted));
            api.addListener('videoMuteStatusChanged', ({ muted }) => setIsVideoOff(muted));
            api.addListener('videoConferenceJoined', () => {
                setLoading(false);
            });
            api.addListener('errorOccurred', (err) => {
                console.error('Jitsi error:', err);
                if (onError) onError(err);
            });

        } catch (err) {
            console.error('Failed to initialize Jitsi:', err);
            setError('Failed to initialize video call');
            setLoading(false);
        }
    }

    function handleClose() {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.dispose();
            jitsiApiRef.current = null;
        }
        if (onLeave) onLeave();
    }

    function handleParticipantUpdate() {
        if (jitsiApiRef.current) {
            const count = jitsiApiRef.current.getNumberOfParticipants();
            setParticipantCount(count);
        }
    }

    // Control functions
    function toggleAudio() {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.executeCommand('toggleAudio');
        }
    }

    function toggleVideo() {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.executeCommand('toggleVideo');
        }
    }

    function toggleChat() {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.executeCommand('toggleChat');
            setShowChat(!showChat);
        }
    }

    function toggleFullscreen() {
        if (jitsiContainerRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                jitsiContainerRef.current.requestFullscreen();
            }
        }
    }

    function hangup() {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.executeCommand('hangup');
        }
        handleClose();
    }

    if (error) {
        return (
            <div className="w-full h-full min-h-[400px] bg-slate-900 rounded-xl flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <VideoOff className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Video Call Error</h3>
                    <p className="text-slate-400 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full min-h-[600px] bg-slate-900 rounded-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                        <span className="text-sm font-medium">
                            {loading ? 'Connecting...' : 'In Session'}
                        </span>
                    </div>
                    {sessionInfo.mentorName && (
                        <span className="text-sm text-slate-400">
                            with {sessionInfo.mentorName}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Users className="w-4 h-4" />
                    <span>{participantCount}</span>
                </div>
            </div>

            {/* Video Container */}
            <div 
                ref={jitsiContainerRef}
                className="flex-1 relative"
                style={{ minHeight: '500px' }}
            >
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500 mx-auto mb-4" />
                            <p className="text-slate-400">Starting video call...</p>
                            <p className="text-sm text-slate-500 mt-1">Please allow camera and microphone access</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Controls Bar */}
            <div className="flex items-center justify-center gap-4 px-4 py-4 bg-slate-800 border-t border-slate-700">
                <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-colors ${
                        isMuted 
                            ? 'bg-red-600 hover:bg-red-500' 
                            : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-colors ${
                        isVideoOff 
                            ? 'bg-red-600 hover:bg-red-500' 
                            : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>

                <button
                    onClick={toggleChat}
                    className={`p-3 rounded-full transition-colors ${
                        showChat 
                            ? 'bg-blue-600 hover:bg-blue-500' 
                            : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    title="Toggle chat"
                >
                    <MessageSquare className="w-5 h-5" />
                </button>

                <button
                    onClick={toggleFullscreen}
                    className="p-3 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                    title="Fullscreen"
                >
                    <Maximize className="w-5 h-5" />
                </button>

                <button
                    onClick={hangup}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-full transition-colors"
                    title="Leave call"
                >
                    <Phone className="w-5 h-5 rotate-135" />
                </button>
            </div>
        </div>
    );
}

/**
 * Simpler version without Jitsi - just generates a meeting link
 */
export function VideoCallLink({ roomName, sessionId }) {
    const fullRoomName = sessionId 
        ? `gimbi-session-${sessionId}-${roomName}`
        : `gimbi-${roomName}`;
    
    const meetLink = `https://meet.jit.si/${fullRoomName}`;

    function copyLink() {
        navigator.clipboard.writeText(meetLink);
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-900/50 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h4 className="font-medium">Video Call Link</h4>
                    <p className="text-sm text-slate-400">Share this link with participants</p>
                </div>
            </div>
            
            <div className="flex gap-2">
                <input
                    type="text"
                    value={meetLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
                />
                <button
                    onClick={copyLink}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    <Share2 className="w-4 h-4" />
                    Copy
                </button>
            </div>

            <a
                href={meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
                <Video className="w-4 h-4" />
                Join Video Call
            </a>
        </div>
    );
}
