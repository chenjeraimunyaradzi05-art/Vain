'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../../hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Audio Room Page
 * Clubhouse-style audio room with speakers and listeners
 */
export default function AudioRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id;
  
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const { token, isAuthenticated, user } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [userRole, setUserRole] = useState('listener'); // host, speaker, listener

  // Mock room data
  const mockRoom = {
    id: roomId,
    title: 'Weekly Yarn: Career Journeys',
    description: 'Join us for our weekly community yarn where we share career experiences, challenges, and wins. Everyone is welcome to listen or request to speak.',
    hostId: 'host-1',
    hostName: 'Elder Mary T.',
    hostAvatar: '👩🏽',
    status: 'active',
    topics: ['Career', 'Culture', 'Community', 'Mentorship'],
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    speakers: [
      { id: 'host-1', name: 'Elder Mary T.', avatar: '👩🏽', role: 'host', isSpeaking: true, isMuted: false },
      { id: 'speaker-1', name: 'James Williams', avatar: '👨🏽', role: 'speaker', isSpeaking: false, isMuted: true },
      { id: 'speaker-2', name: 'Sarah Chen', avatar: '👩🏻', role: 'speaker', isSpeaking: false, isMuted: false },
      { id: 'speaker-3', name: 'David Brown', avatar: '👨🏼', role: 'speaker', isSpeaking: true, isMuted: false },
    ],
    listeners: [
      { id: 'listener-1', name: 'Emma L.', avatar: '👩🏼' },
      { id: 'listener-2', name: 'Michael K.', avatar: '👨🏿' },
      { id: 'listener-3', name: 'Nina P.', avatar: '👩🏽' },
      { id: 'listener-4', name: 'Tom B.', avatar: '👨🏽' },
      { id: 'listener-5', name: 'Jessica L.', avatar: '👩🏻' },
      { id: 'listener-6', name: 'Alex J.', avatar: '👨🏼' },
      { id: 'listener-7', name: 'Maria S.', avatar: '👩🏽' },
      { id: 'listener-8', name: 'Chris W.', avatar: '👨🏻' },
    ],
    raisedHands: [
      { id: 'listener-2', name: 'Michael K.', avatar: '👨🏿', raisedAt: '2 min ago' },
      { id: 'listener-5', name: 'Jessica L.', avatar: '👩🏻', raisedAt: '5 min ago' },
    ]
  };

  const fetchRoom = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/live/audio-rooms/${roomId}`, { timeout: 5000, skipRetry: true });
      if (res.ok && res.data?.room) {
        setRoom(res.data.room);
      } else {
        setRoom(mockRoom);
      }
    } catch (err) {
      console.error('Error fetching room:', err);
      setRoom(mockRoom);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  const toggleMute = () => {
    if (userRole === 'listener') return;
    setIsMuted(!isMuted);
    
    api(`/live/audio-rooms/${roomId}/mute`, {
      method: 'POST',
      body: { muted: !isMuted }
    }).catch(err => console.error('Error toggling mute:', err));
  };

  const toggleHandRaise = () => {
    if (userRole !== 'listener') return;
    setHandRaised(!handRaised);
    
    api(`/live/audio-rooms/${roomId}/hand`, {
      method: handRaised ? 'DELETE' : 'POST'
    }).catch(err => console.error('Error toggling hand:', err));
  };

  const leaveRoom = () => {
    api(`/live/audio-rooms/${roomId}/leave`, { method: 'POST' })
      .catch(err => console.error('Error leaving room:', err));
    router.push('/live');
  };

  const formatDuration = (isoDate) => {
    const start = new Date(isoDate);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000 / 60);
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 flex flex-col items-center justify-center text-white">
        <div className="text-6xl mb-4">🎙️</div>
        <h2 className="text-2xl font-bold mb-2">Room Not Found</h2>
        <p className="text-gray-400 mb-6">This room may have ended or doesn't exist.</p>
        <Link
          href="/live"
          className="px-6 py-3 rounded-lg text-white font-medium"
          style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
        >
          Browse Audio Rooms
        </Link>
      </div>
    );
  }

  const totalParticipants = room.speakers.length + room.listeners.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/live" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <span>←</span>
            <span>All Rooms</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Live
            </span>
            <span className="text-gray-400">🕐 {formatDuration(room.createdAt)}</span>
            <span className="text-gray-400">👥 {totalParticipants}</span>
          </div>
        </div>

        {/* Room Info */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{room.title}</h1>
          <p className="text-gray-300 mb-4">{room.description}</p>
          <div className="flex flex-wrap gap-2">
            {room.topics.map((topic, idx) => (
              <span key={idx} className="px-3 py-1 bg-purple-500/30 text-purple-200 text-sm rounded-full">
                {topic}
              </span>
            ))}
          </div>
        </div>

        {/* Speakers Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🎤</span>
            Speakers ({room.speakers.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {room.speakers.map((speaker) => (
              <div
                key={speaker.id}
                className={`flex flex-col items-center p-4 rounded-xl transition-all ${
                  speaker.isSpeaking ? 'bg-purple-500/30 ring-2 ring-purple-400' : 'bg-white/5'
                }`}
              >
                <div className="relative mb-2">
                  <span className={`text-5xl ${speaker.isSpeaking ? 'animate-pulse' : ''}`}>
                    {speaker.avatar}
                  </span>
                  {speaker.role === 'host' && (
                    <span className="absolute -top-1 -right-1 text-lg">👑</span>
                  )}
                  {speaker.isMuted && (
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs">
                      🔇
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-center">{speaker.name}</p>
                <p className="text-xs text-gray-400 capitalize">{speaker.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Raised Hands Section (for hosts/speakers) */}
        {userRole !== 'listener' && room.raisedHands.length > 0 && (
          <div className="bg-yellow-500/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-yellow-500/30">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-yellow-400">
              <span>✋</span>
              Raised Hands ({room.raisedHands.length})
            </h2>
            <div className="flex flex-wrap gap-3">
              {room.raisedHands.map((listener) => (
                <div key={listener.id} className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-2">
                  <span className="text-2xl">{listener.avatar}</span>
                  <span className="text-sm">{listener.name}</span>
                  <button
                    className="px-2 py-1 bg-green-500 text-white text-xs rounded-full hover:bg-green-600"
                  >
                    Invite
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listeners Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>👥</span>
            Listeners ({room.listeners.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {room.listeners.map((listener) => (
              <div key={listener.id} className="flex flex-col items-center">
                <span className="text-3xl">{listener.avatar}</span>
                <p className="text-xs text-gray-400 mt-1">{listener.name}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Control Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-lg border-t border-gray-800 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={leaveRoom}
              className="px-6 py-3 bg-red-500/20 text-red-400 rounded-full font-medium hover:bg-red-500/30 transition-colors"
            >
              ✌️ Leave quietly
            </button>

            <div className="flex items-center gap-3">
              {/* Raise Hand (for listeners) */}
              {userRole === 'listener' && (
                <button
                  onClick={toggleHandRaise}
                  className={`px-6 py-3 rounded-full font-medium transition-all ${
                    handRaised
                      ? 'bg-yellow-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {handRaised ? '✋ Hand Raised' : '✋ Raise Hand'}
                </button>
              )}

              {/* Mute Toggle (for speakers) */}
              {userRole !== 'listener' && (
                <button
                  onClick={toggleMute}
                  className={`w-14 h-14 rounded-full font-medium transition-all flex items-center justify-center text-2xl ${
                    isMuted
                      ? 'bg-red-500 text-white'
                      : 'bg-white text-gray-900'
                  }`}
                >
                  {isMuted ? '🔇' : '🎤'}
                </button>
              )}
            </div>

            {/* Share */}
            <button className="px-6 py-3 bg-white/10 text-white rounded-full font-medium hover:bg-white/20 transition-colors">
              📤 Share
            </button>
          </div>
        </div>

        {/* Sign-in Prompt for unauthenticated users */}
        {!isAuthenticated && (
          <div className="fixed bottom-20 left-0 right-0 px-4">
            <div className="max-w-4xl mx-auto bg-gradient-to-r from-pink-500/20 to-purple-500/20 backdrop-blur-lg rounded-xl p-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Want to participate?</p>
                  <p className="text-sm text-gray-400">Sign in to raise your hand or join as a speaker</p>
                </div>
                <Link
                  href="/"
                  className="px-6 py-2 rounded-lg font-medium"
                  style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Spacer for fixed control bar */}
        <div className="h-24"></div>
      </div>
    </div>
  );
}
