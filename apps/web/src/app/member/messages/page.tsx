/**
 * Messages & Inbox Page
 * 
 * Messaging center for member communications.
 * Connected to real backend API at /messages/*
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/apiClient';
import { socketService } from '@/lib/socket';
import { Send, ArrowLeft, Search, Plus, MessageSquare, Loader2, BellOff } from 'lucide-react';
import OptimizedImage from '@/components/ui/OptimizedImage';

// Types matching backend API response shapes
interface Participant {
  userId: string;
  name: string;
  avatar?: string | null;
  role: string;
}

interface LastMessage {
  id: string;
  content: string;
  senderId: string;
  messageType: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  type: string;
  name: string;
  participants: Participant[];
  lastMessage: LastMessage | null;
  unreadCount: number;
  isMuted: boolean;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  messageType: string;
  mediaUrl?: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
}

// Helper functions
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export default function MessagesPage() {
  const { user, token, isAuthenticated } = useAuth();
  const userId = user?.id;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [newConvoEmail, setNewConvoEmail] = useState('');
  const [creatingConvo, setCreatingConvo] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTypingEmitRef = useRef(0);

  // Fetch conversations from API
  const fetchConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api('/messages/conversations');
      if (res.ok && res.data?.conversations) {
        setConversations(res.data.conversations);
      }
    } catch {
      console.error('Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (convId: string) => {
    setMessagesLoading(true);
    try {
      const res = await api(`/messages/conversations/${convId}`);
      if (res.ok && res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch {
      console.error('Failed to fetch messages');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
      // Mark conversation as read
      api(`/messages/conversations/${selectedId}/read`, { method: 'POST' }).then(() => {
        setConversations(prev =>
          prev.map(c => c.id === selectedId ? { ...c, unreadCount: 0 } : c)
        );
      }).catch(() => {});
    }
  }, [selectedId, fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebSocket: connect and listen for real-time events
  useEffect(() => {
    if (!isAuthenticated || !user || !token) return;
    try {
      if (!socketService.connected) {
        socketService.connect(token);
      }
    } catch { /* socket connection is optional */ }

    const handleNewMessage = (message: any) => {
      if (selectedId && message.conversationId === selectedId) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, {
            id: message.id,
            senderId: message.senderId,
            senderName: message.senderName || 'Unknown',
            content: message.content,
            messageType: message.type || 'text',
            isEdited: false,
            isDeleted: false,
            createdAt: message.createdAt || new Date().toISOString(),
          }];
        });
      }
      // Refresh conversation list for unread counts
      fetchConversations();
    };

    const handleTyping = (data: any) => {
      if (data.userId === userId) return;
      setTypingUsers(prev => {
        const convTyping = prev[data.conversationId] || [];
        if (data.isTyping) {
          if (!convTyping.includes(data.userId)) {
            return { ...prev, [data.conversationId]: [...convTyping, data.userId] };
          }
        } else {
          return { ...prev, [data.conversationId]: convTyping.filter(id => id !== data.userId) };
        }
        return prev;
      });
      // Auto-clear typing after 3s
      setTimeout(() => {
        setTypingUsers(prev => {
          const convTyping = prev[data.conversationId] || [];
          return { ...prev, [data.conversationId]: convTyping.filter(id => id !== data.userId) };
        });
      }, 3000);
    };

    socketService.on('message:new', handleNewMessage);
    socketService.on('message:typing', handleTyping);

    return () => {
      socketService.off('message:new', handleNewMessage);
      socketService.off('message:typing', handleTyping);
    };
  }, [isAuthenticated, user, token, userId, selectedId, fetchConversations]);

  // Join/leave conversation socket rooms
  useEffect(() => {
    if (selectedId && socketService.connected) {
      socketService.joinConversation(selectedId);
      return () => { socketService.leaveConversation(selectedId); };
    }
  }, [selectedId]);

  // Fallback: poll only when socket is NOT connected
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (!socketService.connected) {
        fetchConversations();
        if (selectedId) fetchMessages(selectedId);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, selectedId, fetchConversations, fetchMessages]);

  // Auto-dismiss error toast
  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timeout);
  }, [error]);

  const selectedConversation = conversations.find(c => c.id === selectedId);

  // Helper: get the "other" participant (filter out current user)
  const getOtherParticipant = (conv: Conversation) => {
    return conv.participants.find(p => p.userId !== userId) || conv.participants[0];
  };

  const filteredConversations = conversations.filter(conv => {
    if (filter === 'unread' && conv.unreadCount === 0) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return conv.name.toLowerCase().includes(q) ||
        conv.participants.some(p => p.name.toLowerCase().includes(q));
    }
    return true;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedId || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic update
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: userId || '',
      senderName: 'You',
      content,
      messageType: 'text',
      isEdited: false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await api(`/messages/conversations/${selectedId}/messages`, {
        method: 'POST',
        body: { content, messageType: 'text' },
      });

      if (res.ok && res.data?.message) {
        // Replace temp message with real one
        setMessages(prev =>
          prev.map(m => m.id === tempMsg.id ? res.data.message : m)
        );
        // Update conversation list
        fetchConversations();
      } else {
        // Remove temp message on failure
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setError('Failed to send message');
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setError('Failed to send message');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSelectConversation = (convId: string) => {
    setSelectedId(convId);
    setShowMobileChat(true);
  };

  const handleBackToList = () => {
    setShowMobileChat(false);
    setSelectedId(null);
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <MessageSquare className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Sign in to view messages</h2>
          <p className="text-gray-500 dark:text-slate-400 mb-4">You need to be logged in to access your messages.</p>
          <a href="/signin?returnTo=/member/messages" className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors">
            Sign In
          </a>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-50 dark:bg-slate-950 flex flex-col">
      {/* Error Toast */}
      {error && (
        <div className="absolute top-4 right-4 z-50 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-in">
          {error}
          <button onClick={() => setError(null)} className="ml-3 font-bold">×</button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversations List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Messages</h1>
                {totalUnread > 0 && (
                  <p className="text-xs text-gray-500 dark:text-slate-400">{totalUnread} unread</p>
                )}
              </div>
              <button
                onClick={() => setShowNewConvo(true)}
                className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {/* New Conversation Form */}
            {showNewConvo && (
              <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700/40">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2">Start a new conversation</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter user email..."
                    value={newConvoEmail}
                    onChange={e => setNewConvoEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Escape' && setShowNewConvo(false)}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-emerald-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={async () => {
                      if (!newConvoEmail.trim() || creatingConvo) return;
                      setCreatingConvo(true);
                      try {
                        const q = newConvoEmail.trim();
                        const lookup = await api<{ users: Array<{ id: string; name: string; avatar?: string | null }> }>(
                          `/users/search?q=${encodeURIComponent(q)}&limit=1`
                        );

                        if (!lookup.ok) {
                          setError(lookup.error || 'Failed to search users');
                          return;
                        }

                        const matchedUserId = lookup.data?.users?.[0]?.id;
                        if (!matchedUserId) {
                          setError('User not found');
                          return;
                        }

                        const res = await api('/messages/conversations', {
                          method: 'POST',
                          body: { participantIds: [matchedUserId], type: 'direct' },
                        });
                        if (res.ok && res.data?.conversation) {
                          setShowNewConvo(false);
                          setNewConvoEmail('');
                          await fetchConversations();
                          setSelectedId(res.data.conversation.id);
                          setShowMobileChat(true);
                        } else {
                          setError(res.error || 'Could not start conversation');
                        }
                      } catch {
                        setError('Failed to create conversation');
                      } finally {
                        setCreatingConvo(false);
                      }
                    }}
                    disabled={!newConvoEmail.trim() || creatingConvo}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {creatingConvo ? '...' : 'Go'}
                  </button>
                  <button
                    onClick={() => { setShowNewConvo(false); setNewConvoEmail(''); }}
                    className="px-2 py-1.5 text-gray-500 dark:text-slate-400 text-sm hover:text-gray-700 dark:hover:text-white"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-emerald-500 outline-none"
              />
            </div>
            {/* Filters */}
            <div className="flex gap-2 mt-3">
              {[
                { key: 'all' as const, label: 'All' },
                { key: 'unread' as const, label: 'Unread' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === item.key
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredConversations.map((conv) => {
                  const otherParticipant = getOtherParticipant(conv);
                  const displayName = conv.name || otherParticipant?.name || 'Unknown';
                  const isSelected = selectedId === conv.id;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full p-4 text-left transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-slate-700/50'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                            {otherParticipant?.avatar ? (
                              <OptimizedImage
                                src={otherParticipant.avatar}
                                alt={displayName}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {getInitials(displayName)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-medium truncate ${
                              conv.unreadCount > 0
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-slate-300'
                            }`}>
                              {displayName}
                            </span>
                            {conv.lastMessage && (
                              <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0">
                                {formatTime(conv.lastMessage.createdAt)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <p className={`text-sm truncate ${
                              conv.unreadCount > 0
                                ? 'text-gray-800 dark:text-slate-200 font-medium'
                                : 'text-gray-500 dark:text-slate-400'
                            }`}>
                              {conv.lastMessage
                                ? (conv.lastMessage.senderId === userId ? 'You: ' : '') + conv.lastMessage.content
                                : 'No messages yet'}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="ml-2 min-w-[20px] h-5 bg-emerald-500 rounded-full text-xs text-white flex items-center justify-center flex-shrink-0 px-1.5">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 capitalize">
                              {conv.type}
                            </span>
                            {conv.isMuted && (
                              <BellOff className="w-3 h-3 text-gray-400 dark:text-slate-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-slate-400 font-medium">
                  {searchQuery ? 'No matching conversations' : 'No conversations yet'}
                </p>
                <p className="text-sm text-gray-400 dark:text-slate-500 mt-1">
                  {searchQuery ? 'Try a different search' : 'Start a conversation from a profile or connection'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-gray-50 dark:bg-slate-950 ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center gap-3 flex-shrink-0 bg-white dark:bg-slate-900">
                {/* Mobile back button */}
                <button
                  onClick={handleBackToList}
                  className="md:hidden p-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  {(() => { const p = getOtherParticipant(selectedConversation); return p?.avatar ? (
                    <OptimizedImage
                      src={p.avatar}
                      alt={selectedConversation.name}
                      width={40}
                      height={40}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {getInitials(selectedConversation.name || p?.name || '?')}
                    </span>
                  ); })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {selectedConversation.name || getOtherParticipant(selectedConversation)?.name || 'Conversation'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                    {selectedConversation.type} · {selectedConversation.participants.length} participant{selectedConversation.participants.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  </div>
                ) : messages.length > 0 ? (
                  <>
                    {messages.map((msg, idx) => {
                      const isMe = msg.senderId === userId;
                      const showDateSep = idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt);
                      return (
                        <React.Fragment key={msg.id}>
                          {showDateSep && (
                            <div className="flex items-center gap-3 py-2">
                              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                              <span className="text-xs font-medium text-gray-400 dark:text-slate-500 whitespace-nowrap">
                                {formatDateSeparator(msg.createdAt)}
                              </span>
                              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                            </div>
                          )}
                          <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%]`}>
                              {/* Sender name for others */}
                              {!isMe && (
                                <p className="text-xs text-gray-500 dark:text-slate-500 mb-1 ml-1">{msg.senderName}</p>
                              )}
                              <div className={`px-4 py-2.5 rounded-2xl ${
                                isMe
                                  ? 'bg-emerald-600 text-white rounded-br-md'
                                  : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 rounded-bl-md border border-gray-200 dark:border-slate-700'
                              }`}>
                                <p className="text-sm leading-relaxed">
                                  {msg.isDeleted ? <em className="text-gray-400 dark:text-slate-500">Message deleted</em> : msg.content}
                                </p>
                              </div>
                              <p className={`text-xs text-gray-400 dark:text-slate-500 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                                {formatMessageTime(msg.createdAt)}
                                {msg.isEdited && <span className="ml-1">(edited)</span>}
                              </p>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                    {/* Typing indicator */}
                    {selectedId && typingUsers[selectedId]?.length > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-2">
                          <div className="flex items-center gap-1 text-gray-400 dark:text-slate-500">
                            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
                            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
                            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
                            <span className="text-xs ml-1">typing...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <MessageSquare className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-slate-400 text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex-shrink-0 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      // Emit typing indicator (throttled)
                      if (selectedId && socketService.connected) {
                        const now = Date.now();
                        if (now - lastTypingEmitRef.current > 2000) {
                          lastTypingEmitRef.current = now;
                          socketService.sendTyping(selectedId, true);
                          setTimeout(() => socketService.sendTyping(selectedId, false), 2000);
                        }
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:border-emerald-500 outline-none text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mt-4">Select a conversation</h3>
                <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-sm">
                  Choose from your existing conversations or start a new one from a member's profile
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
