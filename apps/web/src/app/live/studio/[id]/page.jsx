'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../../hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Stream Studio Page
 * Broadcaster/Host view for managing a live stream
 */
export default function StreamStudioPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id;
  
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const { token, isAuthenticated, user } = useAuth();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [messages, setMessages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activePanel, setActivePanel] = useState('chat');
  const videoRef = useRef(null);
  const durationInterval = useRef(null);

  // Mock stream data
  const mockStream = {
    id: streamId,
    title: 'Career Tips for First Nations Tech Professionals',
    description: 'Interactive session on building your career in tech while staying connected to culture.',
    category: 'Career Development',
    tags: ['Career', 'Tech', 'Mentorship', 'Culture'],
    status: 'ready',
    settings: {
      allowChat: true,
      allowQuestions: true,
      allowReactions: true,
      visibility: 'public'
    }
  };

  const mockMessages = [
    { id: 1, userName: 'Emma L.', message: 'So excited for this stream!', timestamp: 'Just now' },
    { id: 2, userName: 'James W.', message: 'Great topic 👏', timestamp: '1 min ago' },
    { id: 3, userName: 'David C.', message: 'Can you talk about remote work?', timestamp: '2 min ago' }
  ];

  const mockQuestions = [
    { id: 1, userName: 'Nina P.', question: 'What companies have the best Indigenous employment programs?', votes: 12, answered: false },
    { id: 2, userName: 'Michael B.', question: 'Tips for salary negotiation?', votes: 8, answered: false }
  ];

  const fetchStream = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/live/streams/${streamId}`, { timeout: 5000, skipRetry: true });
      if (res.ok && res.data?.stream) {
        setStream(res.data.stream);
        setIsLive(res.data.stream.status === 'live');
      } else {
        setStream(mockStream);
      }
      setMessages(mockMessages);
      setQuestions(mockQuestions);
    } catch (err) {
      console.error('Error fetching stream:', err);
      setStream(mockStream);
      setMessages(mockMessages);
      setQuestions(mockQuestions);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  // Duration timer
  useEffect(() => {
    if (isLive) {
      durationInterval.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    }
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isLive]);

  // Simulate viewer count changes when live
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setViewerCount(prev => Math.max(0, prev + Math.floor(Math.random() * 10) - 4));
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const goLive = async () => {
    try {
      const res = await api(`/live/streams/${streamId}/start`, { method: 'POST' });
      if (res.ok) {
        setIsLive(true);
        setViewerCount(5); // Start with some initial viewers
      }
    } catch (err) {
      console.error('Error going live:', err);
      // For demo, go live anyway
      setIsLive(true);
      setViewerCount(5);
    }
  };

  const endStream = async () => {
    if (!confirm('Are you sure you want to end this stream?')) return;
    
    try {
      await api(`/live/streams/${streamId}/end`, { method: 'POST' });
    } catch (err) {
      console.error('Error ending stream:', err);
    }
    setIsLive(false);
    router.push('/live');
  };

  const markQuestionAnswered = (questionId) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, answered: true } : q
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
        <div className="text-6xl mb-4">📺</div>
        <h2 className="text-2xl font-bold mb-2">Stream Not Found</h2>
        <p className="text-gray-400 mb-6">This stream doesn't exist or you don't have access.</p>
        <Link
          href="/live"
          className="px-6 py-3 rounded-lg text-white font-medium"
          style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
        >
          Back to Live
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-4">
              <Link href="/live" className="text-gray-400 hover:text-white">
                ← Exit Studio
              </Link>
              {isLive ? (
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-md flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    LIVE
                  </span>
                  <span className="text-gray-400 font-mono">{formatDuration(duration)}</span>
                  <span className="px-3 py-1 bg-gray-700 text-white text-sm rounded-md">
                    👁 {viewerCount} viewers
                  </span>
                </div>
              ) : (
                <span className="px-3 py-1 bg-gray-700 text-gray-300 text-sm rounded-md">
                  Ready to go live
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">
                ⚙️ Settings
              </button>
              {isLive ? (
                <button
                  onClick={endStream}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium"
                >
                  End Stream
                </button>
              ) : (
                <button
                  onClick={goLive}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                >
                  🔴 Go Live
                </button>
              )}
            </div>
          </div>

          {/* Video Preview */}
          <div className="flex-1 relative bg-black flex items-center justify-center">
            {isCameraOn ? (
              <div className="relative w-full h-full">
                {/* Camera preview would go here */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50">
                  <div className="text-center">
                    <span className="text-8xl mb-4 block">👤</span>
                    <p className="text-gray-400">Camera preview</p>
                    <p className="text-xs text-gray-500 mt-2">Video would connect via LiveKit</p>
                  </div>
                </div>
                
                {/* Overlay Info */}
                <div className="absolute top-4 left-4">
                  <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
                    <h3 className="font-semibold text-white">{stream.title}</h3>
                    <p className="text-sm text-gray-400">{stream.category}</p>
                  </div>
                </div>

                {/* Screen Share Indicator */}
                {isScreenSharing && (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-md flex items-center gap-2">
                      <span>🖥️</span>
                      Sharing Screen
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <span className="text-6xl mb-4 block">📷</span>
                <p className="text-gray-400">Camera is off</p>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="flex items-center justify-center gap-4 py-4 bg-gray-800 border-t border-gray-700">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-colors ${
                isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-colors ${
                !isCameraOn ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              {isCameraOn ? '📷' : '🚫'}
            </button>
            <button
              onClick={() => setIsScreenSharing(!isScreenSharing)}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-colors ${
                isScreenSharing ? 'bg-green-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
            >
              🖥️
            </button>
            <div className="w-px h-10 bg-gray-600"></div>
            <button className="w-14 h-14 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center text-2xl">
              👥
            </button>
            <button className="w-14 h-14 rounded-full bg-gray-700 text-white hover:bg-gray-600 flex items-center justify-center text-2xl">
              ⚡
            </button>
          </div>
        </div>

        {/* Side Panel - Chat/Q&A */}
        <div className="w-full lg:w-[380px] bg-gray-800 flex flex-col border-l border-gray-700">
          {/* Panel Tabs */}
          <div className="flex border-b border-gray-700">
            {[
              { id: 'chat', label: '💬 Chat', count: messages.length },
              { id: 'qa', label: '❓ Q&A', count: questions.filter(q => !q.answered).length },
              { id: 'analytics', label: '📊 Stats' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  activePanel === tab.id
                    ? 'text-white border-b-2'
                    : 'text-gray-400 hover:text-white'
                }`}
                style={activePanel === tab.id ? { borderColor: accentPink } : {}}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Chat Panel */}
          {activePanel === 'chat' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No messages yet</p>
                  <p className="text-sm">Chat will appear here when you go live</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex gap-3 p-2 rounded-lg hover:bg-gray-700/50">
                    <span className="text-2xl">👤</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-300">{msg.userName}</span>
                        <span className="text-xs text-gray-500">{msg.timestamp}</span>
                      </div>
                      <p className="text-gray-200 text-sm">{msg.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Q&A Panel */}
          {activePanel === 'qa' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No questions yet</p>
                  <p className="text-sm">Questions will appear here when viewers ask</p>
                </div>
              ) : (
                questions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg ${q.answered ? 'bg-green-900/30 opacity-60' : 'bg-gray-700'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-gray-200 text-sm">{q.question}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          From {q.userName} • {q.votes} votes
                        </p>
                      </div>
                      {!q.answered && (
                        <button
                          onClick={() => markQuestionAnswered(q.id)}
                          className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
                        >
                          ✓ Answered
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Analytics Panel */}
          {activePanel === 'analytics' && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-white">{viewerCount}</p>
                  <p className="text-sm text-gray-400">Current Viewers</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-white">{Math.max(viewerCount, 45)}</p>
                  <p className="text-sm text-gray-400">Peak Viewers</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-white">{messages.length}</p>
                  <p className="text-sm text-gray-400">Chat Messages</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-white">{questions.length}</p>
                  <p className="text-sm text-gray-400">Questions</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-400">Stream Health</h4>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Connection Quality</span>
                    <span className="text-green-400 font-medium">Excellent</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '95%' }}></div>
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Bitrate</span>
                    <span className="text-white font-mono">4,500 kbps</span>
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Resolution</span>
                    <span className="text-white font-mono">1080p @ 30fps</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
