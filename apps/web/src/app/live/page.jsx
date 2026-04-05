'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useAuth from '../../hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Live Streaming & Audio Rooms Hub
 * Browse live streams, audio rooms, and scheduled events
 */
export default function LivePage() {
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';
  
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('live');
  const [streams, setStreams] = useState([]);
  const [audioRooms, setAudioRooms] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for fallback
  const mockStreams = [
    {
      id: '1',
      title: 'Career Tips for First Nations Tech Professionals',
      hostName: 'Aunty Sarah Mitchell',
      hostAvatar: '👩🏽',
      hostVerified: true,
      thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=450&fit=crop',
      viewerCount: 234,
      category: 'Career Development',
      isLive: true,
      startedAt: '45 minutes ago'
    },
    {
      id: '2',
      title: 'Live Coding: Building Indigenous Business Websites',
      hostName: 'James Williams',
      hostAvatar: '👨🏽',
      hostVerified: true,
      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop',
      viewerCount: 156,
      category: 'Tech & Development',
      isLive: true,
      startedAt: '1 hour ago'
    },
    {
      id: '3',
      title: 'Mining Industry Q&A with HR Leaders',
      hostName: 'BHP Indigenous Employment',
      hostAvatar: '🏢',
      hostVerified: true,
      thumbnail: 'https://images.unsplash.com/photo-1581093458791-9d15482442f6?w=800&h=450&fit=crop',
      viewerCount: 89,
      category: 'Job Opportunities',
      isLive: true,
      startedAt: '30 minutes ago'
    }
  ];

  const mockAudioRooms = [
    {
      id: 'room-1',
      title: 'Weekly Yarn: Career Journeys',
      hostName: 'Elder Mary T.',
      hostAvatar: '👩🏽',
      participantCount: 45,
      speakerCount: 4,
      topics: ['Career', 'Culture', 'Community'],
      isLive: true
    },
    {
      id: 'room-2',
      title: 'Tech Mentorship Circle',
      hostName: 'David Chen',
      hostAvatar: '👨🏻',
      participantCount: 23,
      speakerCount: 3,
      topics: ['Mentorship', 'Technology'],
      isLive: true
    },
    {
      id: 'room-3',
      title: 'Business Funding Workshop',
      hostName: 'Indigenous Business Network',
      hostAvatar: '🏢',
      participantCount: 67,
      speakerCount: 5,
      topics: ['Business', 'Funding', 'Grants'],
      isLive: true
    }
  ];

  const mockScheduled = [
    {
      id: 'scheduled-1',
      title: 'Interview Skills Workshop',
      hostName: 'Career Academy',
      scheduledFor: 'Tomorrow, 2:00 PM AEST',
      type: 'stream',
      category: 'Career Development',
      attendees: 156
    },
    {
      id: 'scheduled-2',
      title: 'Weekly Community Yarn',
      hostName: 'Community Leaders',
      scheduledFor: 'Friday, 6:00 PM AEST',
      type: 'audio-room',
      category: 'Community',
      attendees: 89
    },
    {
      id: 'scheduled-3',
      title: 'Resume Writing Masterclass',
      hostName: 'HR Experts Panel',
      scheduledFor: 'Saturday, 10:00 AM AEST',
      type: 'stream',
      category: 'Job Search',
      attendees: 234
    }
  ];

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const [streamsRes, roomsRes] = await Promise.all([
        api('/live/streams?status=live', { timeout: 5000, skipRetry: true }),
        api('/live/audio-rooms?status=active', { timeout: 5000, skipRetry: true })
      ]);

      if (streamsRes.ok && streamsRes.data?.streams?.length > 0) {
        setStreams(streamsRes.data.streams);
      } else {
        setStreams(mockStreams);
      }

      if (roomsRes.ok && roomsRes.data?.rooms?.length > 0) {
        setAudioRooms(roomsRes.data.rooms);
      } else {
        setAudioRooms(mockAudioRooms);
      }

      setScheduled(mockScheduled);
    } catch (err) {
      console.error('Error fetching live content:', err);
      setStreams(mockStreams);
      setAudioRooms(mockAudioRooms);
      setScheduled(mockScheduled);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const tabs = [
    { id: 'live', label: '🔴 Live Now', count: streams.length + audioRooms.length },
    { id: 'streams', label: '📺 Streams', count: streams.length },
    { id: 'rooms', label: '🎙️ Audio Rooms', count: audioRooms.length },
    { id: 'scheduled', label: '📅 Scheduled', count: scheduled.length },
  ];

  const getFilteredContent = () => {
    switch (activeTab) {
      case 'streams':
        return { streams, audioRooms: [] };
      case 'rooms':
        return { streams: [], audioRooms };
      case 'scheduled':
        return { streams: [], audioRooms: [], scheduled };
      default:
        return { streams, audioRooms };
    }
  };

  const content = getFilteredContent();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="h-40 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live</h1>
            <p className="text-gray-600 mt-1">Join live streams and audio rooms from our community</p>
          </div>
          {isAuthenticated && (
            <div className="flex gap-3">
              <Link
                href="/live/create-stream"
                className="px-4 py-2 rounded-lg text-white font-medium transition-all hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                📺 Go Live
              </Link>
              <Link
                href="/live/create-room"
                className="px-4 py-2 rounded-lg border-2 font-medium transition-all hover:shadow-lg"
                style={{ borderColor: accentPurple, color: accentPurple }}
              >
                🎙️ Start Room
              </Link>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              style={activeTab === tab.id ? { background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` } : {}}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Live Streams Section */}
        {content.streams?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
              Live Streams
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.streams.map((stream) => (
                <Link
                  key={stream.id}
                  href={`/live/stream/${stream.id}`}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all group"
                >
                  <div className="relative">
                    <img
                      src={stream.thumbnail}
                      alt={stream.title}
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-md flex items-center gap-1">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                      <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                        👁 {stream.viewerCount}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                        {stream.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{stream.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{stream.hostAvatar}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                          {stream.hostName}
                          {stream.hostVerified && <span className="text-blue-500">✓</span>}
                        </p>
                        <p className="text-xs text-gray-500">Started {stream.startedAt}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Audio Rooms Section */}
        {content.audioRooms?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🎙️</span>
              Audio Rooms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.audioRooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/live/room/${room.id}`}
                  className="bg-white rounded-xl shadow-sm p-5 hover:shadow-lg transition-all border-l-4"
                  style={{ borderLeftColor: accentPurple }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-3xl">{room.hostAvatar}</span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Live
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{room.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">Hosted by {room.hostName}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {room.topics.map((topic, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>🎤 {room.speakerCount} speakers</span>
                    <span>👥 {room.participantCount} listening</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Scheduled Section */}
        {activeTab === 'scheduled' && content.scheduled?.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Upcoming Events
            </h2>
            <div className="space-y-4">
              {content.scheduled.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-xl shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl"
                      style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                    >
                      {event.type === 'stream' ? '📺' : '🎙️'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-600">{event.hostName}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span>🕐 {event.scheduledFor}</span>
                        <span>👥 {event.attendees} interested</span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 rounded-lg border-2 font-medium transition-all hover:shadow-md"
                    style={{ borderColor: accentPurple, color: accentPurple }}
                  >
                    Set Reminder
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {streams.length === 0 && audioRooms.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📺</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No live content right now</h3>
            <p className="text-gray-600 mb-6">Be the first to go live and connect with the community!</p>
            {isAuthenticated ? (
              <div className="flex justify-center gap-3">
                <Link
                  href="/live/create-stream"
                  className="px-6 py-3 rounded-lg text-white font-medium transition-all hover:shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                >
                  Start Streaming
                </Link>
                <Link
                  href="/live/create-room"
                  className="px-6 py-3 rounded-lg border-2 font-medium"
                  style={{ borderColor: accentPurple, color: accentPurple }}
                >
                  Create Audio Room
                </Link>
              </div>
            ) : (
              <span
                className="px-6 py-3 rounded-lg text-white font-medium inline-block"
                style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
              >
                Sign-in disabled
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
