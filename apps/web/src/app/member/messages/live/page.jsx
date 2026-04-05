"use client";

import { API_BASE } from '@/lib/apiBase';
import { socketService } from '@/lib/socket';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  MoreVertical,
  Search,
  Phone,
  Video,
  Settings,
  Circle,
  Check,
  CheckCheck,
  ChevronLeft,
  User,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw,
  Plus,
  X,
  ArrowLeft
} from 'lucide-react';
import useAuth from '../../../../hooks/useAuth';
import { useNotifications } from '../../../../components/notifications/NotificationProvider';
import { toCloudinaryAutoUrl } from '@/lib/cloudinary';

const MESSAGE_TYPES = {
  NEW_MESSAGE: 'new_message',
  MESSAGE_SENT: 'message_sent',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  PONG: 'pong',
  ERROR: 'error'
};

function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function MessageBubble({ message, isOwn, showAvatar }) {
  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {showAvatar && !isOwn && (
        message.sender?.avatar ? (
          <img src={toCloudinaryAutoUrl(message.sender.avatar)} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs">
            {message.sender?.name?.[0] || '?'}
          </div>
        )
      )}
      {showAvatar && !isOwn ? null : <div className="w-8" />}
      
      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-2 ${
          isOwn 
            ? 'bg-amber-600 text-white rounded-br-sm' 
            : 'bg-slate-700 text-white rounded-bl-sm'
        }`}>
          {message.isDeleted ? (
            <span className="italic text-slate-400">Message deleted</span>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
        <div className={`flex items-center gap-1 mt-1 text-xs text-slate-500 ${isOwn ? 'justify-end' : ''}`}>
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && (
            message.readAt ? (
              <CheckCheck className="w-3 h-3 text-blue-400" />
            ) : (
              <Check className="w-3 h-3" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ConversationItem({ conversation, isSelected, onClick, typingUsers, presence }) {
  const participant = conversation.participants?.[0];
  const isOnline = presence?.[participant?.userId]?.online;
  const isTyping = typingUsers.includes(participant?.userId);

  return (
    <button
      onClick={() => onClick(conversation)}
      className={`w-full p-3 flex items-center gap-3 transition-colors text-left ${
        isSelected ? 'bg-slate-700' : 'hover:bg-slate-800'
      }`}
    >
      <div className="relative">
        {participant?.avatar ? (
          <img src={toCloudinaryAutoUrl(participant.avatar)} alt="" className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-lg">
            {participant?.name?.[0] || <User className="w-5 h-5" />}
          </div>
        )}
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white truncate">{conversation.name || participant?.name}</h4>
          {conversation.lastMessage && (
            <span className="text-xs text-slate-500">
              {formatTime(conversation.lastMessage.createdAt)}
            </span>
          )}
        </div>
        {isTyping ? (
          <p className="text-sm text-amber-400 italic">typing...</p>
        ) : conversation.lastMessage ? (
          <p className="text-sm text-slate-400 truncate">
            {conversation.lastMessage.content}
          </p>
        ) : (
          <p className="text-sm text-slate-500 italic">No messages yet</p>
        )}
      </div>
      {conversation.unreadCount > 0 && (
        <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {conversation.unreadCount}
        </span>
      )}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default function LiveChatPage() {
  const { token, user } = useAuth();
  const { showNotification } = useNotifications();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [presence, setPresence] = useState({});
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [mentorList, setMentorList] = useState([]);
  const [loadingMentors, setLoadingMentors] = useState(false);

  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const apiBase = API_BASE;

  useEffect(() => {
    if (!token) return;

    socketService.connect(token);

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    const handlePresenceUpdate = (update) => {
      setPresence((prev) => ({
        ...prev,
        [update.userId]: {
          ...(prev?.[update.userId] || {}),
          online: update.status === 'online',
        },
      }));
    };

    socketService.on('connect', handleConnect);
    socketService.on('disconnect', handleDisconnect);
    socketService.on('presence:update', handlePresenceUpdate);

    setIsConnected(socketService.connected);

    return () => {
      socketService.off('connect', handleConnect);
      socketService.off('disconnect', handleDisconnect);
      socketService.off('presence:update', handlePresenceUpdate);
    };
  }, [token]);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Fetch conversations
  useEffect(() => {
    if (!token) return;

    async function fetchConversations() {
      try {
        const res = await fetch(`${apiBase}/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchConversations();
  }, [token]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (!token || !selectedConversation) return;

    async function fetchMessages() {
      try {
        const res = await fetch(
          `${apiBase}/messages/conversations/${selectedConversation.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const normalized = (data.messages || []).map((m) => ({
            ...m,
            sender: {
              id: m.senderId,
              name: m.senderName,
              avatar: m.senderAvatar,
            },
          }));
          setMessages(normalized);
        }

        // Mark as read
        await fetch(
          `${apiBase}/messages/conversations/${selectedConversation.id}/read`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          }
        );

        // Update local unread count
        setConversations(prev => prev.map(c => 
          c.id === selectedConversation.id ? { ...c, unreadCount: 0 } : c
        ));
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    }

    fetchMessages();
  }, [token, selectedConversation?.id]);

  // WebSocket connection (simulated polling for now since WS requires server setup)
  useEffect(() => {
    if (!token || !selectedConversation) return;

    // Poll for new messages every 3 seconds
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(
          `${apiBase}/messages/conversations/${selectedConversation.id}?limit=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          // Check for new messages
          if (data.messages?.length > 0) {
            const normalized = (data.messages || []).map((m) => ({
              ...m,
              sender: {
                id: m.senderId,
                name: m.senderName,
                avatar: m.senderAvatar,
              },
            }));
            const newMessages = normalized.filter(m => 
              !messages.some(existing => existing.id === m.id)
            );
            if (newMessages.length > 0) {
              setMessages(prev => [...prev, ...newMessages]);
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [token, selectedConversation?.id, messages]);

  // Send message
  async function handleSendMessage(e) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSendingMessage(true);

    // Optimistic update
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content,
      sender: { id: user?.id, name: user?.name || user?.email?.split('@')[0] },
      createdAt: new Date().toISOString(),
      sending: true
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const res = await fetch(
        `${apiBase}/messages/conversations/${selectedConversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content, messageType: 'text' })
        }
      );

      if (res.ok) {
        const data = await res.json();
        const normalizedMessage = data.message
          ? {
              ...data.message,
              sender: {
                id: data.message.senderId,
                name: data.message.senderName,
                avatar: data.message.senderAvatar,
              },
              sending: false,
            }
          : null;

        if (!normalizedMessage) {
          setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
          showNotification({ message: 'Failed to send message', variant: 'error' });
          return;
        }

        // Replace temp message with real one
        setMessages(prev => prev.map(m => 
          m.id === tempMessage.id ? normalizedMessage : m
        ));

        // Update conversation last message
        setConversations(prev => prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, lastMessage: normalizedMessage, updatedAt: new Date().toISOString() }
            : c
        ));
      } else {
        // Remove temp message on error
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        showNotification({ message: 'Failed to send message', variant: 'error' });
      }
    } catch (err) {
      console.error('Send message error:', err);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
    } finally {
      setSendingMessage(false);
    }
  }

  // Handle typing indicator
  function handleTyping() {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Would send typing event via WebSocket here
    // For now, just set a timeout to stop typing indication

    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing indication
    }, 2000);
  }

  // Handle selecting a conversation (for mobile)
  function handleSelectConversation(conv) {
    setSelectedConversation(conv);
    setShowMobileSidebar(false);
  }

  // Fetch mentors for new conversation
  async function fetchMentors() {
    if (!token) return;
    setLoadingMentors(true);
    try {
      const res = await fetch(`${apiBase}/mentor/search`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMentorList(data.mentors || []);
      }
    } catch (err) {
      console.error('Failed to fetch mentors:', err);
    } finally {
      setLoadingMentors(false);
    }
  }

  // Start a new conversation with a user
  async function startConversation(recipientId) {
    if (!token) return;
    try {
      const res = await fetch(`${apiBase}/messages/conversations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participantIds: [recipientId], type: 'direct' })
      });
      if (res.ok) {
        const data = await res.json();
        const conversationId = data?.conversation?.id;
        if (!conversationId) {
          showNotification({ message: 'Failed to start conversation', variant: 'error' });
          return;
        }

        // Refresh conversations to get full conversation shape
        const listRes = await fetch(`${apiBase}/messages/conversations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const nextConversations = listData.conversations || [];
          setConversations(nextConversations);
          const nextSelected = nextConversations.find(c => c.id === conversationId);
          if (nextSelected) {
            setSelectedConversation(nextSelected);
          }
        }

        setShowNewConversation(false);
        setShowMobileSidebar(false);
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  }

  // Filter conversations by search
  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.participants?.some(p => p.name?.toLowerCase().includes(q))
    );
  });

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in</h1>
          <p className="text-amber-300 mb-6">Sign in to access your live messages.</p>
          <Link
            href="/signin?returnTo=/member/messages/live"
            className="inline-flex items-center justify-center rounded-lg px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/member/dashboard" className="text-slate-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <MessageSquare className="w-6 h-6 text-amber-400" />
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Wifi className="w-3 h-3" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <WifiOff className="w-3 h-3" />
              Reconnecting...
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Conversations Sidebar */}
        <div className={`
          ${showMobileSidebar ? 'flex' : 'hidden md:flex'}
          w-full md:w-80 bg-slate-850 border-r border-slate-700 flex-col
        `}>
          {/* Search + New Conversation */}
          <div className="p-3 border-b border-slate-700 space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={() => {
                setShowNewConversation(true);
                fetchMentors();
              }}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white text-sm px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400">No conversations yet</p>
                <p className="text-slate-500 text-sm mt-1">Start a new conversation above</p>
              </div>
            ) : (
              filteredConversations.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedConversation?.id === conv.id}
                  onClick={handleSelectConversation}
                  typingUsers={typingUsers}
                  presence={presence}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`
          ${!showMobileSidebar ? 'flex' : 'hidden md:flex'}
          flex-1 flex-col
        `}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile back button */}
                  <button 
                    onClick={() => setShowMobileSidebar(true)}
                    className="md:hidden p-1 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                  </button>
                  {selectedConversation.participants?.[0]?.avatar ? (
                    <img 
                      src={toCloudinaryAutoUrl(selectedConversation.participants[0].avatar)} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-medium">
                      {selectedConversation.name || selectedConversation.participants?.[0]?.name}
                    </h2>
                    {presence[selectedConversation.participants?.[0]?.userId]?.online ? (
                      <span className="text-xs text-emerald-400">Online</span>
                    ) : presence[selectedConversation.participants?.[0]?.userId]?.lastSeen ? (
                      <span className="text-xs text-slate-400">
                        Last seen {formatTime(presence[selectedConversation.participants[0].userId].lastSeen)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                    <Phone className="w-5 h-5 text-slate-400" />
                  </button>
                  <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                    <Video className="w-5 h-5 text-slate-400" />
                  </button>
                  <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date}>
                    <div className="flex items-center justify-center my-4">
                      <span className="bg-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full">
                        {date}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dateMessages.map((message, i) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          isOwn={message.sender?.id === user?.id}
                          showAvatar={i === 0 || dateMessages[i - 1]?.sender?.id !== message.sender?.id}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                
                {typingUsers.length > 0 && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="bg-slate-800 border-t border-slate-700 p-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Paperclip className="w-5 h-5 text-slate-400" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-full px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="p-2 bg-amber-600 hover:bg-amber-500 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Select a conversation</h2>
                <p className="text-slate-400">Choose a conversation from the sidebar to start messaging</p>
                <button
                  onClick={() => {
                    setShowNewConversation(true);
                    fetchMentors();
                  }}
                  className="mt-4 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Start New Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold">New Conversation</h2>
              <button
                onClick={() => setShowNewConversation(false)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingMentors ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
                </div>
              ) : mentorList.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400">No mentors available</p>
                  <p className="text-slate-500 text-sm mt-1">Connect with mentors first to start messaging</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-400 mb-3">Select a mentor to start chatting</p>
                  {mentorList.map(mentor => (
                    <button
                      key={mentor.id}
                      onClick={() => startConversation(mentor.id)}
                      className="w-full p-3 flex items-center gap-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
                    >
                      {mentor.avatar ? (
                        <img src={toCloudinaryAutoUrl(mentor.avatar)} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-medium">{mentor.name}</h4>
                        {mentor.role && <p className="text-sm text-slate-400">{mentor.role}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
