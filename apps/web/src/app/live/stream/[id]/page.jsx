'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuth from '../../../../hooks/useAuth';
import api from '@/lib/apiClient';

/**
 * Live Stream Viewer Page
 * Watch live streams with real-time chat, reactions, and Q&A
 */
const TOP_PARTICIPANTS = ['Emma L.', 'James W.', 'David C.', 'Sarah T.', 'Nina P.'];

function getDeterministicCount(seed, name) {
  const key = `${seed}-${name}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 997;
  }
  return (hash % 10) + 1;
}

export default function StreamViewerPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.id;
  
  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  const { token, isAuthenticated, user } = useAuth();
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [activePanel, setActivePanel] = useState('chat'); // chat, qa, viewers
  const [viewerCount, setViewerCount] = useState(0);
  const [reactions, setReactions] = useState({ '❤️': 0, '🔥': 0, '👏': 0, '💯': 0 });
  const chatEndRef = useRef(null);
  const videoRef = useRef(null);

  const participantMessageCounts = useMemo(() => {
    const seed = streamId || 'stream';
    return TOP_PARTICIPANTS.map((name) => getDeterministicCount(seed, name));
  }, [streamId]);

  // Mock stream data
  const mockStream = {
    id: streamId,
    title: 'Career Tips for First Nations Tech Professionals',
    description: 'Join us for an interactive session on building your career in tech while staying connected to culture. We\'ll cover resume tips, interview prep, and navigating workplace dynamics.',
    hostId: 'host-1',
    hostName: 'Aunty Sarah Mitchell',
    hostAvatar: '👩🏽',
    hostTitle: 'Tech Industry Veteran & Cultural Mentor',
    hostVerified: true,
    status: 'live',
    viewerCount: 234,
    category: 'Career Development',
    tags: ['Career', 'Tech', 'Mentorship', 'Culture'],
    startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    thumbnail: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1280&h=720&fit=crop'
  };

  const mockMessages = [
    { id: 1, userId: 'user-1', userName: 'James W.', message: 'This is so helpful! Thank you 🙏', avatar: '👨🏽', timestamp: '2 min ago' },
    { id: 2, userId: 'user-2', userName: 'Emma L.', message: 'Love the advice about cultural leave negotiations', avatar: '👩🏼', timestamp: '3 min ago' },
    { id: 3, userId: 'user-3', userName: 'David C.', message: 'Can you talk about remote work opportunities?', avatar: '👨🏻', timestamp: '4 min ago' },
    { id: 4, userId: 'user-4', userName: 'Sarah T.', message: '✨ Finally some real talk about our experiences!', avatar: '👩🏽', timestamp: '5 min ago' },
    { id: 5, userId: 'host-1', userName: 'Aunty Sarah Mitchell', message: 'Great question David! Let me address that...', avatar: '👩🏽', isHost: true, timestamp: '5 min ago' }
  ];

  const mockQuestions = [
    { id: 1, userId: 'user-3', userName: 'David C.', question: 'What are the best companies for Indigenous employment programs?', votes: 45, answered: false },
    { id: 2, userId: 'user-5', userName: 'Nina P.', question: 'How do you balance career growth with cultural responsibilities?', votes: 38, answered: true },
    { id: 3, userId: 'user-6', userName: 'Michael B.', question: 'Any tips for negotiating salary as a First Nations professional?', votes: 32, answered: false }
  ];

  const [questions, setQuestions] = useState(mockQuestions);

  const fetchStream = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/live/streams/${streamId}`, { timeout: 5000, skipRetry: true });
      if (res.ok && res.data?.stream) {
        setStream(res.data.stream);
        setViewerCount(res.data.stream.viewerCount || 0);
      } else {
        // Use mock data for demo
        setStream(mockStream);
        setViewerCount(mockStream.viewerCount);
      }
      setMessages(mockMessages);
    } catch (err) {
      console.error('Error fetching stream:', err);
      setStream(mockStream);
      setMessages(mockMessages);
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  useEffect(() => {
    // Auto-scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate viewer count updates
  useEffect(() => {
    const interval = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 5) - 2);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim() || !isAuthenticated) return;
    
    const message = {
      id: Date.now(),
      userId: user?.id || 'current-user',
      userName: user?.name || 'You',
      message: newMessage.trim(),
      avatar: '👤',
      timestamp: 'Just now'
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Send to API
    api(`/live/streams/${streamId}/chat`, {
      method: 'POST',
      body: { message: newMessage.trim() }
    }).catch(err => console.error('Error sending message:', err));
  };

  const sendReaction = (emoji) => {
    setReactions(prev => ({ ...prev, [emoji]: prev[emoji] + 1 }));
    
    // Send to API
    api(`/live/streams/${streamId}/react`, {
      method: 'POST',
      body: { emoji }
    }).catch(err => console.error('Error sending reaction:', err));
  };

  const submitQuestion = (question) => {
    if (!question.trim() || !isAuthenticated) return;
    
    const newQuestion = {
      id: Date.now(),
      userId: user?.id || 'current-user',
      userName: user?.name || 'You',
      question: question.trim(),
      votes: 0,
      answered: false
    };
    
    setQuestions(prev => [newQuestion, ...prev]);
    
    api(`/live/streams/${streamId}/question`, {
      method: 'POST',
      body: { question: question.trim() }
    }).catch(err => console.error('Error submitting question:', err));
  };

  const voteQuestion = (questionId) => {
    setQuestions(prev => prev.map(q => 
      q.id === questionId ? { ...q, votes: q.votes + 1 } : q
    ).sort((a, b) => b.votes - a.votes));
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
        <p className="text-gray-400 mb-6">This stream may have ended or doesn't exist.</p>
        <Link
          href="/live"
          className="px-6 py-3 rounded-lg text-white font-medium"
          style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
        >
          Browse Live Streams
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Video Section */}
        <div className={`flex-1 flex flex-col ${showChat ? 'lg:max-w-[calc(100%-380px)]' : ''}`}>
          {/* Video Player */}
          <div className="relative bg-black aspect-video lg:aspect-auto lg:flex-1">
            <img
              src={stream.thumbnail}
              alt={stream.title}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                  <span className="text-4xl">▶️</span>
                </div>
                <p className="text-white/80 text-sm">Video player would connect via LiveKit</p>
              </div>
            </div>
            
            {/* Live Badge & Viewer Count */}
            <div className="absolute top-4 left-4 flex items-center gap-3">
              <span className="px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-md flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </span>
              <span className="px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm rounded-md">
                👁 {viewerCount.toLocaleString()} watching
              </span>
              <span className="px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm rounded-md">
                🕐 {formatDuration(stream.startedAt)}
              </span>
            </div>

            {/* Reaction Buttons */}
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              {['❤️', '🔥', '👏', '💯'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all flex items-center justify-center text-xl relative"
                >
                  {emoji}
                  {reactions[emoji] > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-pink-500 text-white text-xs rounded-full">
                      {reactions[emoji]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Toggle Chat Button (Mobile) */}
            <button
              onClick={() => setShowChat(!showChat)}
              className="lg:hidden absolute top-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm rounded-md"
            >
              {showChat ? '✕ Hide Chat' : '💬 Show Chat'}
            </button>
          </div>

          {/* Stream Info */}
          <div className="p-4 bg-gray-800">
            <div className="flex items-start gap-4">
              <span className="text-4xl">{stream.hostAvatar}</span>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-white mb-1">{stream.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span className="font-medium text-white">{stream.hostName}</span>
                  {stream.hostVerified && <span className="text-blue-400">✓</span>}
                  <span>•</span>
                  <span>{stream.category}</span>
                </div>
                <p className="text-gray-400 text-sm mt-2 line-clamp-2">{stream.description}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {stream.tags?.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                >
                  Follow
                </button>
                <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 font-medium">
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat/Q&A Panel */}
        {showChat && (
          <div className="w-full lg:w-[380px] bg-gray-800 flex flex-col border-l border-gray-700">
            {/* Panel Tabs */}
            <div className="flex border-b border-gray-700">
              {[
                { id: 'chat', label: '💬 Chat' },
                { id: 'qa', label: '❓ Q&A' },
                { id: 'viewers', label: '👥 Viewers' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activePanel === tab.id
                      ? 'text-white border-b-2'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  style={activePanel === tab.id ? { borderColor: accentPink } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Chat Panel */}
            {activePanel === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.isHost ? 'bg-purple-900/30 -mx-4 px-4 py-2' : ''}`}>
                      <span className="text-2xl">{msg.avatar}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${msg.isHost ? 'text-purple-400' : 'text-gray-300'}`}>
                            {msg.userName}
                          </span>
                          {msg.isHost && (
                            <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded">HOST</span>
                          )}
                          <span className="text-xs text-gray-500">{msg.timestamp}</span>
                        </div>
                        <p className="text-gray-200 text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-gray-700">
                  {isAuthenticated ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Send a message..."
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                        style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                      >
                        Send
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/"
                      className="block text-center py-3 rounded-lg font-medium"
                      style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                    >
                      Sign in to chat
                    </Link>
                  )}
                </div>
              </>
            )}

            {/* Q&A Panel */}
            {activePanel === 'qa' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className={`p-3 rounded-lg ${q.answered ? 'bg-green-900/30 border border-green-700' : 'bg-gray-700'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-gray-200 text-sm">{q.question}</p>
                          <p className="text-xs text-gray-500 mt-1">Asked by {q.userName}</p>
                        </div>
                        <button
                          onClick={() => voteQuestion(q.id)}
                          className="flex flex-col items-center px-2 py-1 rounded bg-gray-600 hover:bg-gray-500"
                        >
                          <span>⬆️</span>
                          <span className="text-xs text-white">{q.votes}</span>
                        </button>
                      </div>
                      {q.answered && (
                        <div className="mt-2 pt-2 border-t border-green-700">
                          <span className="text-xs text-green-400">✓ Answered</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Question Input */}
                <div className="p-4 border-t border-gray-700">
                  {isAuthenticated ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Ask a question..."
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            submitQuestion(e.target.value);
                            e.target.value = '';
                          }
                        }}
                      />
                      <p className="text-xs text-gray-500">Press Enter to submit • Questions with most votes shown first</p>
                    </div>
                  ) : (
                    <Link
                      href="/"
                      className="block text-center py-3 rounded-lg font-medium"
                      style={{ background: `linear-gradient(135deg, ${accentPink}, ${accentPurple})` }}
                    >
                      Sign in to ask questions
                    </Link>
                  )}
                </div>
              </>
            )}

            {/* Viewers Panel */}
            {activePanel === 'viewers' && (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">👥</div>
                  <p className="text-2xl font-bold text-white">{viewerCount.toLocaleString()}</p>
                  <p className="text-gray-400">people watching</p>
                </div>
                <div className="border-t border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Top Participants</h4>
                  <div className="space-y-3">
                    {TOP_PARTICIPANTS.map((name, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700">
                        <span className="text-2xl">👤</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{name}</p>
                          <p className="text-xs text-gray-500">{participantMessageCounts[idx]} messages</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
