'use client';

import api from '@/lib/apiClient';
import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';

/**
 * Messages Page
 * Direct messaging interface with real-time features and safety
 */
export default function MessagesPage() {
  const { user, token: authToken } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const myUserId = user?.id || null;

  // Real-time state
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId: [userIds] }
  // eslint-disable-next-line no-unused-vars
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);

  // Theme colors
  const accentPink = '#E91E8C';
  const accentPurple = '#8B5CF6';

  // Initialize Socket.io connection
  useEffect(() => {
    if (authToken) {
      socketService.connect(authToken);

      // Listen for connection status
      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      socketService.on('connect', handleConnect);
      socketService.on('disconnect', handleDisconnect);

      // Set initial connection state
      setIsConnected(socketService.connected);

      return () => {
        socketService.off('connect', handleConnect);
        socketService.off('disconnect', handleDisconnect);
      };
    }
  }, []);

  // Handle real-time message events
  useEffect(() => {
    const handleNewMessage = (message) => {
      if (selectedConversation && message.conversationId === selectedConversation.id) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === message.id)) return prev;
          return [
            ...prev,
            {
              id: message.id,
              senderId: message.senderId === myUserId ? 'me' : 'other',
              content: message.content,
              timestamp: formatTime(new Date(message.createdAt)),
              isRead: false,
            },
          ];
        });
      }
      // Update conversation list with new message
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                lastMessage: message.content,
                lastMessageTime: 'Just now',
                unreadCount:
                  message.senderId !== myUserId ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
              }
            : conv,
        ),
      );
    };

    const handleTyping = (data) => {
      if (data.userId === myUserId) return;

      setTypingUsers((prev) => {
        const convTyping = prev[data.conversationId] || [];
        if (data.isTyping) {
          if (!convTyping.includes(data.userId)) {
            return { ...prev, [data.conversationId]: [...convTyping, data.userId] };
          }
        } else {
          return { ...prev, [data.conversationId]: convTyping.filter((id) => id !== data.userId) };
        }
        return prev;
      });

      // Auto-clear typing after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => {
          const convTyping = prev[data.conversationId] || [];
          return { ...prev, [data.conversationId]: convTyping.filter((id) => id !== data.userId) };
        });
      }, 3000);
    };

    const handlePresence = (data) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        if (data.status === 'online') {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    };

    const handleMessageRead = (data) => {
      if (data.conversationId === selectedConversation?.id) {
        setMessages((prev) =>
          prev.map((msg) => (data.messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg)),
        );
      }
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('message:typing', handleTyping);
    socketService.on('presence:update', handlePresence);
    socketService.on('message:read', handleMessageRead);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:typing', handleTyping);
      socketService.off('presence:update', handlePresence);
      socketService.off('message:read', handleMessageRead);
    };
  }, [selectedConversation, myUserId]);

  // Join/leave conversation rooms
  useEffect(() => {
    if (selectedConversation && isConnected) {
      socketService.joinConversation(selectedConversation.id);
      return () => {
        socketService.leaveConversation(selectedConversation.id);
      };
    }
  }, [selectedConversation, isConnected]);

  // Emit typing indicator
  const emitTyping = useCallback(
    (isTyping) => {
      if (!selectedConversation || !isConnected) return;

      const now = Date.now();
      // Throttle typing emissions to every 2 seconds
      if (isTyping && now - lastTypingEmitRef.current < 2000) return;
      lastTypingEmitRef.current = now;

      socketService.sendTyping(selectedConversation.id, isTyping);
    },
    [selectedConversation, isConnected],
  );

  // Handle typing in input
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Emit typing indicator
    emitTyping(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 2000);
  };

  // Fetch conversations on mount
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api('/messages/conversations');

        if (response.ok) {
          const data = response.data;
          // Transform API data to match UI format
          const formattedConversations = (data.conversations || []).map((conv) => ({
            id: conv.id,
            participant: {
              name: conv.name || conv.participants?.[0]?.name || 'Unknown',
              avatar: conv.participants?.[0]?.avatar || '👤',
              isVerified: true,
              trustLevel: 'verified',
              isOnline: false,
            },
            lastMessage: conv.lastMessage?.content || 'No messages yet',
            lastMessageTime: conv.lastMessage?.createdAt
              ? formatTimeAgo(new Date(conv.lastMessage.createdAt))
              : '',
            unreadCount: conv.unreadCount || 0,
          }));
          setConversations(formattedConversations);
        } else if (response.status === 401) {
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      try {
        const response = await api(`/messages/conversations/${selectedConversation.id}`);

        if (response.ok) {
          const data = response.data;
          // Transform API data to match UI format
          const formattedMessages = (data.messages || []).map((msg) => ({
            id: msg.id,
            senderId: myUserId && msg.senderId === myUserId ? 'me' : 'other',
            content: msg.content,
            timestamp: formatTime(new Date(msg.createdAt)),
            isRead: msg.isRead ?? true,
          }));
          setMessages(formattedMessages);

          // Mark unread messages as read on the server and notify via socket
          const unreadFromOthers = (data.messages || []).filter(
            (m) => m.senderId !== myUserId && !m.isRead,
          );
          if (unreadFromOthers.length) {
            try {
              await api(`/messages/conversations/${selectedConversation.id}/read`, {
                method: 'POST',
              });
              const ids = unreadFromOthers.map((m) => m.id);
              socketService.markAsRead(selectedConversation.id, ids);
            } catch (err) {
              console.warn('Failed to mark messages as read:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();
  }, [selectedConversation, myUserId]);

  // Helper function to format time
  function formatTime(date) {
    return date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  // Helper function to format time ago
  function formatTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  }

  // Mock conversations as fallback when not logged in
  const mockConversations = [
    {
      id: '1',
      participant: {
        name: 'Sarah Mitchell',
        avatar: '👩🏽',
        isVerified: true,
        trustLevel: 'verified',
        isOnline: true,
      },
      lastMessage: 'Thanks for the mentorship advice! Really helped.',
      lastMessageTime: '2m ago',
      unreadCount: 2,
    },
    {
      id: '2',
      participant: {
        name: 'David Yarrawonga',
        avatar: '👨🏾',
        isVerified: true,
        trustLevel: 'trusted',
        isOnline: false,
      },
      lastMessage: "Let me know when you're free to chat about the role",
      lastMessageTime: '1h ago',
      unreadCount: 0,
    },
    {
      id: '3',
      participant: {
        name: 'First Nations Tech',
        avatar: '💻',
        isVerified: true,
        trustLevel: 'verified',
        isOrg: true,
        isOnline: true,
      },
      lastMessage: "We'd love to discuss the opportunity with you",
      lastMessageTime: '3h ago',
      unreadCount: 1,
    },
    {
      id: '4',
      participant: {
        name: 'Emma Coach',
        avatar: '👩🏻',
        isVerified: false,
        trustLevel: 'established',
        isOnline: false,
      },
      lastMessage: 'Great progress on your resume!',
      lastMessageTime: 'Yesterday',
      unreadCount: 0,
    },
  ];

  // Mock messages as fallback
  const mockMessages = [
    {
      id: '1',
      senderId: 'other',
      content: "Hi! I saw your profile and I think you'd be a great fit for our team.",
      timestamp: '10:30 AM',
      isRead: true,
    },
    {
      id: '2',
      senderId: 'me',
      content: "Thanks for reaching out! I'd love to learn more about the opportunity.",
      timestamp: '10:32 AM',
      isRead: true,
    },
    {
      id: '3',
      senderId: 'other',
      content:
        "We're looking for someone with your skills in community engagement. The role involves working closely with First Nations communities.",
      timestamp: '10:35 AM',
      isRead: true,
    },
    {
      id: '4',
      senderId: 'other',
      content: 'Would you be available for a chat this week?',
      timestamp: '10:36 AM',
      isRead: true,
    },
    {
      id: '5',
      senderId: 'me',
      content: "That sounds amazing! Yes, I'm available Thursday or Friday afternoon.",
      timestamp: '10:40 AM',
      isRead: true,
    },
  ];

  // Use API data or fallback to mock data
  const displayConversations = conversations.length > 0 ? conversations : mockConversations;
  const displayMessages = messages.length > 0 ? messages : selectedConversation ? mockMessages : [];

  const filteredConversations = displayConversations.filter((c) =>
    c.participant.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getTrustBadge = (level) => {
    const badges = {
      new: { icon: '🌱', label: 'New' },
      basic: { icon: '✓', label: 'Basic' },
      established: { icon: '★', label: 'Established' },
      trusted: { icon: '💎', label: 'Trusted' },
      verified: { icon: '✓✓', label: 'Verified' },
    };
    return badges[level] || badges.new;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const tempId = `tmp-${Math.random().toString(36).slice(2, 9)}`;
    const tempMsg = {
      id: tempId,
      senderId: 'me',
      content: newMessage.trim(),
      timestamp: formatTime(new Date()),
      status: 'sending',
    };

    // Optimistic UI
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage('');
    setSendingMessage(true);

    try {
      // POST to REST API
      const response = await api(`/messages/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        body: { content: tempMsg.content },
      });

      if (response.ok) {
        const message = response.data?.message || response.data;
        // Replace temp message with confirmed message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: message.id,
                  senderId: 'me',
                  content: message.content,
                  timestamp: formatTime(new Date(message.createdAt)),
                  isRead: true,
                }
              : m,
          ),
        );

        // Real-time broadcast is handled server-side after REST persist
      } else {
        // Mark as failed
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
    } finally {
      setSendingMessage(false);
    }
  };

  const retrySend = async (msg) => {
    if (!selectedConversation) return;
    // Set to sending
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'sending' } : m)));

    try {
      const response = await api(`/messages/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        body: { content: msg.content },
      });
      if (response.ok) {
        const message = response.data?.message || response.data;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id
              ? {
                  id: message.id,
                  senderId: 'me',
                  content: message.content,
                  timestamp: formatTime(new Date(message.createdAt)),
                  isRead: true,
                }
              : m,
          ),
        );
      } else {
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'failed' } : m)));
      }
    } catch (err) {
      console.error('Retry failed:', err);
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'failed' } : m)));
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  return (
    <div className="ngurra-page pt-16">
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Conversations List */}
        <aside
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-white ${
            selectedConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span style={{ color: accentPink }}>💬</span> Messages
              </h1>
              <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">✏️</button>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 text-sm transition-all"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <span className="text-4xl mb-4 block">💬</span>
                <p>No conversations found</p>
              </div>
            ) : (
              filteredConversations.map((convo) => (
                <button
                  key={convo.id}
                  onClick={() => setSelectedConversation(convo)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 ${
                    selectedConversation?.id === convo.id ? 'bg-pink-50' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                      }}
                    >
                      {convo.participant.avatar}
                    </div>
                    {convo.participant.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-slate-800 truncate">
                          {convo.participant.name}
                        </span>
                        {convo.participant.isVerified && (
                          <span className="text-xs" style={{ color: accentPink }}>
                            {getTrustBadge(convo.participant.trustLevel).icon}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{convo.lastMessageTime}</span>
                    </div>
                    <p className="text-sm text-slate-500 truncate">{convo.lastMessage}</p>
                  </div>

                  {/* Unread Badge */}
                  {convo.unreadCount > 0 && (
                    <div
                      className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                      style={{ background: accentPink }}
                    >
                      {convo.unreadCount}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Chat View */}
        <main
          className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}
        >
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <header className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                  ←
                </button>

                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(233, 30, 140, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)',
                    }}
                  >
                    {selectedConversation.participant.avatar}
                  </div>
                  {selectedConversation.participant.isOnline && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-800">
                      {selectedConversation.participant.name}
                    </h2>
                    {selectedConversation.participant.isVerified && (
                      <span className="text-sm" style={{ color: accentPink }}>
                        {getTrustBadge(selectedConversation.participant.trustLevel).icon}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">
                    {selectedConversation.participant.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    title="Video Call"
                  >
                    📹
                  </button>
                  <button
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    title="More Options"
                  >
                    ⋯
                  </button>
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {/* Safety Banner */}
                <div className="mx-auto max-w-md p-3 rounded-lg bg-pink-50 border border-pink-200 text-center">
                  <p className="text-sm text-slate-600">
                    <span style={{ color: accentPink }}>🛡️</span> Safety Mode is ON.
                    <Link
                      href="/settings/safety"
                      className="hover:underline ml-1"
                      style={{ color: accentPink }}
                    >
                      Adjust settings
                    </Link>
                  </p>
                </div>

                {displayMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        message.senderId === 'me'
                          ? 'text-white rounded-br-md'
                          : 'bg-white text-slate-800 rounded-bl-md border border-slate-200'
                      }`}
                      style={
                        message.senderId === 'me'
                          ? {
                              background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                            }
                          : {}
                      }
                    >
                      <p className="text-sm">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.senderId === 'me' ? 'text-white/70' : 'text-slate-400'
                        }`}
                      >
                        {message.timestamp}
                        {message.senderId === 'me' && message.isRead && ' ✓✓'}
                        {message.status === 'sending' && ' ⏳'}
                        {message.status === 'failed' && (
                          <span className="ml-2 text-red-400">
                            Failed ·{' '}
                            <button className="underline" onClick={() => retrySend(message)}>
                              Retry
                            </button>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {selectedConversation && typingUsers[selectedConversation.id]?.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-white text-slate-500 rounded-2xl rounded-bl-md border border-slate-200 px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <span className="animate-bounce text-lg" style={{ animationDelay: '0ms' }}>
                          •
                        </span>
                        <span
                          className="animate-bounce text-lg"
                          style={{ animationDelay: '150ms' }}
                        >
                          •
                        </span>
                        <span
                          className="animate-bounce text-lg"
                          style={{ animationDelay: '300ms' }}
                        >
                          •
                        </span>
                        <span className="text-xs ml-2 text-slate-400">typing...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                  >
                    📎
                  </button>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-2.5 rounded-full bg-slate-50 border-2 border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="p-3 rounded-full transition-all text-white"
                    style={
                      newMessage.trim() && !sendingMessage
                        ? {
                            background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                          }
                        : { background: '#E2E8F0', color: '#94A3B8' }
                    }
                  >
                    {sendingMessage ? '⏳' : '➤'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50">
              <div className="text-center p-8">
                <span className="text-6xl mb-4 block">💬</span>
                <h2 className="text-xl font-semibold text-slate-800 mb-2">Your Messages</h2>
                <p className="text-slate-500 mb-6">Select a conversation to start chatting</p>
                <button
                  className="px-6 py-2 rounded-full text-sm text-white"
                  style={{
                    background: `linear-gradient(135deg, ${accentPink} 0%, ${accentPurple} 100%)`,
                  }}
                >
                  Start New Conversation
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
