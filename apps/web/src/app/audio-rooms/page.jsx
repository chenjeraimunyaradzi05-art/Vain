'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import useAuth from '../../hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Audio Rooms Page
 * Browse and join live audio rooms
 */
export default function AudioRoomsPage() {
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';
  
  const { token, isAuthenticated } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Mock rooms data
  const mockRooms = [
    {
      id: 'room-1',
      title: 'Weekly Yarn: Career Journeys',
      description: 'Share your career experiences and learn from others in our supportive community.',
      hostName: 'Elder Mary T.',
      hostAvatar: '👩🏽',
      hostVerified: true,
      participantCount: 45,
      speakerCount: 4,
      topics: ['Career', 'Culture', 'Community'],
      isLive: true,
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    },
    {
      id: 'room-2',
      title: 'Tech Mentorship Circle',
      description: 'Connect with mentors and mentees in the tech industry.',
      hostName: 'David Chen',
      hostAvatar: '👨🏻',
      hostVerified: true,
      participantCount: 23,
      speakerCount: 3,
      topics: ['Mentorship', 'Technology', 'Career'],
      isLive: true,
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      id: 'room-3',
      title: 'Business Funding Workshop',
      description: 'Learn about grants and funding opportunities for Indigenous businesses.',
      hostName: 'Indigenous Business Network',
      hostAvatar: '🏢',
      hostVerified: true,
      participantCount: 67,
      speakerCount: 5,
      topics: ['Business', 'Funding', 'Grants'],
      isLive: true,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString()
    },
    {
      id: 'room-4',
      title: 'Mining Industry Q&A',
      description: 'Ask questions about careers in the mining sector.',
      hostName: 'BHP Indigenous Employment',
      hostAvatar: '🏢',
      hostVerified: true,
      participantCount: 34,
      speakerCount: 4,
      topics: ['Mining', 'Jobs', 'Industry'],
      isLive: true,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      id: 'room-5',
      title: 'Resume Review Session',
      description: 'Get feedback on your resume from HR professionals.',
      hostName: 'Career Academy',
      hostAvatar: '📚',
      hostVerified: true,
      participantCount: 28,
      speakerCount: 2,
      topics: ['Resume', 'Job Search', 'Career'],
      isLive: true,
      createdAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
    }
  ];

  const allTopics = ['All', 'Career', 'Technology', 'Business', 'Culture', 'Mentorship', 'Jobs', 'Education'];

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('/live/audio-rooms?status=active', { timeout: 5000, skipRetry: true });
      if (res.ok && res.data?.rooms?.length > 0) {
        setRooms(res.data.rooms);
      } else {
        setRooms(mockRooms);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setRooms(mockRooms);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const filteredRooms = filter === 'all' 
    ? rooms 
    : rooms.filter(room => 
        room.topics.some(t => t.toLowerCase() === filter.toLowerCase())
      );

  const formatDuration = (isoDate) => {
    const start = new Date(isoDate);
    const now = new Date();
    const diff = Math.floor((now - start) / 1000 / 60);
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-700/50 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-6">
                  <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-700/50 rounded w-1/2 mb-4"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-gray-700/50 rounded-full w-16"></div>
                    <div className="h-6 bg-gray-700/50 rounded-full w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-gray-900 text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Audio Rooms</h1>
            <p className="text-gray-400 mt-1">Join live conversations with our community</p>
          </div>
          {isAuthenticated && (
            <Link
              href="/live/create-room"
              className="px-5 py-2.5 rounded-lg text-white font-medium transition-all hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
            >
              🎙️ Start a Room
            </Link>
          )}
        </div>

        {/* Topic Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {allTopics.map((topic) => (
            <button
              key={topic}
              onClick={() => setFilter(topic === 'All' ? 'all' : topic)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                (topic === 'All' ? filter === 'all' : filter.toLowerCase() === topic.toLowerCase())
                  ? 'text-white shadow-lg'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
              style={(topic === 'All' ? filter === 'all' : filter.toLowerCase() === topic.toLowerCase()) 
                ? { background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` } 
                : {}
              }
            >
              {topic}
            </button>
          ))}
        </div>

        {/* Rooms Grid */}
        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRooms.map((room) => (
              <Link
                key={room.id}
                href={`/live/room/${room.id}`}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 hover:bg-white/15 transition-all border border-white/10 hover:border-purple-500/50 group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{room.hostAvatar}</span>
                    <div>
                      <p className="font-medium text-white flex items-center gap-1">
                        {room.hostName}
                        {room.hostVerified && <span className="text-blue-400">✓</span>}
                      </p>
                      <p className="text-sm text-gray-400">Host</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Live • {formatDuration(room.createdAt)}
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                  {room.title}
                </h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {room.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {room.topics.map((topic, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 text-sm rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      🎤 {room.speakerCount} speaking
                    </span>
                    <span className="flex items-center gap-1">
                      👥 {room.participantCount} listening
                    </span>
                  </div>
                  <span 
                    className="px-3 py-1 rounded-full text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                  >
                    Join →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎙️</div>
            <h3 className="text-xl font-semibold text-white mb-2">No active rooms</h3>
            <p className="text-gray-400 mb-6">
              {filter !== 'all' 
                ? `No rooms found for "${filter}". Try a different topic.` 
                : 'Be the first to start a conversation!'}
            </p>
            {isAuthenticated ? (
              <Link
                href="/live/create-room"
                className="inline-block px-6 py-3 rounded-lg text-white font-medium transition-all hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Start an Audio Room
              </Link>
            ) : (
              <Link
                href="/"
                className="inline-block px-6 py-3 rounded-lg text-white font-medium transition-all hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Sign In to Start
              </Link>
            )}
          </div>
        )}

        {/* Scheduled Rooms Section */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <span>📅</span>
            Upcoming Rooms
          </h2>
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10">
            <div className="text-center py-8 text-gray-500">
              <p className="text-gray-400">No scheduled rooms at the moment</p>
              <p className="text-sm text-gray-500 mt-1">Check back later for upcoming conversations</p>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-12 bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <h2 className="text-xl font-semibold text-white mb-6 text-center">How Audio Rooms Work</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center text-3xl">
                🎧
              </div>
              <h3 className="font-medium text-white mb-2">Listen In</h3>
              <p className="text-sm text-gray-400">
                Join any room as a listener to hear conversations on topics that interest you.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pink-500/20 flex items-center justify-center text-3xl">
                ✋
              </div>
              <h3 className="font-medium text-white mb-2">Raise Your Hand</h3>
              <p className="text-sm text-gray-400">
                Want to speak? Raise your hand and the host can invite you to join the conversation.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-3xl">
                🎙️
              </div>
              <h3 className="font-medium text-white mb-2">Host Your Own</h3>
              <p className="text-sm text-gray-400">
                Start your own room on any topic and build community around your expertise.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
