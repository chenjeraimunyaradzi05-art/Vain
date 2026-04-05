'use client';

/**
 * Real-time Chat Component
 * 
 * Full-featured chat interface with Socket.io support for live messaging.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMessagingStore } from '@/stores/messagingStore';
import { useAuthStore } from '@/stores/authStore';
import OptimizedImage from '@/components/ui/OptimizedImage';
import {
  MessageCircle,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  File,
  X,
  Users,
  Circle,
} from 'lucide-react';

interface ChatProps {
  conversationId?: string;
  onClose?: () => void;
  embedded?: boolean;
}

export default function Chat({ conversationId: propConversationId, onClose, embedded = false }: ChatProps) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    activeConversationId,
    typingUsers,
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    loadConversations,
    setActiveConversation,
    sendMessage,
    sendTypingStart,
    sendTypingStop,
  } = useMessagingStore();

  const currentConversationId = propConversationId || activeConversationId;
  const currentConversation = conversations.find((c) => c.id === currentConversationId);
  const currentMessages = useMemo(
    () => (currentConversationId ? messages[currentConversationId] || [] : []),
    [currentConversationId, messages]
  );
  const currentTypingUsers = useMemo(
    () => (currentConversationId ? typingUsers[currentConversationId] || [] : []),
    [currentConversationId, typingUsers]
  );

  // Connect to WebSocket on mount
  useEffect(() => {
    if (!isConnected && !isConnecting) {
      connect();
    }
    loadConversations();

    return () => {
      // Don't disconnect on unmount if we're just switching views
      // disconnect();
    };
  }, [connect, isConnected, isConnecting, loadConversations]);

  // Set active conversation from prop
  useEffect(() => {
    if (propConversationId && propConversationId !== activeConversationId) {
      setActiveConversation(propConversationId);
    }
  }, [propConversationId, activeConversationId, setActiveConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!currentConversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      sendTypingStart(currentConversationId);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStop(currentConversationId);
    }, 2000);
  }, [currentConversationId, isTyping, sendTypingStart, sendTypingStop]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentConversationId) return;

    const text = messageText.trim();
    setMessageText('');
    
    // Stop typing
    if (isTyping) {
      setIsTyping(false);
      sendTypingStop(currentConversationId);
    }

    await sendMessage(currentConversationId, text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    }
  };

  const renderMessageStatus = (status: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-slate-500" />;
      case 'sent':
        return <Check className="w-3 h-3 text-slate-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-slate-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-400" />;
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-400" />;
      default:
        return null;
    }
  };

  const getOtherParticipants = () => {
    if (!currentConversation) return [];
    return currentConversation.participants.filter((p) => p.userId !== user?.id);
  };

  const containerClass = embedded
    ? 'h-full flex flex-col bg-slate-900'
    : 'fixed inset-0 z-50 flex bg-slate-900 md:relative md:h-[600px] md:rounded-xl md:shadow-2xl';

  return (
    <div className={containerClass}>
      {/* Sidebar - Conversation List */}
      {!embedded && (!currentConversationId || window.innerWidth >= 768) && (
        <div className="w-full md:w-80 border-r border-slate-700 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Messages</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                >
                  <Search className="w-5 h-5" />
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            
            {showSearch && (
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
              />
            )}

            {/* Connection Status */}
            {connectionError ? (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Connection error</span>
              </div>
            ) : isConnecting ? (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <Circle className="w-4 h-4 animate-pulse" />
                <span>Connecting...</span>
              </div>
            ) : isConnected ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Circle className="w-4 h-4" />
                <span>Connected</span>
              </div>
            ) : null}
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations
                .filter((c) =>
                  !searchQuery ||
                  c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.participants.some((p) =>
                    p.userName.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                )
                .map((conversation) => {
                  const otherParticipants = conversation.participants.filter(
                    (p) => p.userId !== user?.id
                  );
                  const isActive = conversation.id === currentConversationId;
                  const hasOnline = otherParticipants.some((p) => p.isOnline);

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setActiveConversation(conversation.id)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-slate-800 transition-colors ${
                        isActive ? 'bg-slate-800' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
                          {conversation.type === 'group' ? (
                            <Users className="w-6 h-6 text-white" />
                          ) : otherParticipants[0]?.userAvatar ? (
                            <OptimizedImage
                              src={otherParticipants[0].userAvatar}
                              alt={`${otherParticipants[0]?.userName || 'User'} avatar`}
                              width={48}
                              height={48}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold">
                              {otherParticipants[0]?.userName?.charAt(0) || '?'}
                            </span>
                          )}
                        </div>
                        {hasOnline && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-white truncate">
                            {conversation.title ||
                              otherParticipants.map((p) => p.userName).join(', ')}
                          </h3>
                          {conversation.lastMessage && (
                            <span className="text-xs text-slate-500">
                              {formatTime(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 truncate">
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>

                      {/* Unread Badge */}
                      {conversation.unreadCount > 0 && (
                        <span className="flex-shrink-0 w-5 h-5 bg-purple-600 rounded-full text-xs text-white flex items-center justify-center">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      {currentConversationId && currentConversation ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-700 flex items-center gap-4">
            <button
              onClick={() => setActiveConversation(null)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
                  {currentConversation.type === 'group' ? (
                    <Users className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-white font-semibold">
                      {getOtherParticipants()[0]?.userName?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                {getOtherParticipants().some((p) => p.isOnline) && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900" />
                )}
              </div>

              <div className="min-w-0">
                <h3 className="font-medium text-white truncate">
                  {currentConversation.title ||
                    getOtherParticipants()
                      .map((p) => p.userName)
                      .join(', ')}
                </h3>
                <p className="text-xs text-slate-400">
                  {currentTypingUsers.length > 0
                    ? `${currentTypingUsers.length === 1 ? 'typing' : 'multiple people typing'}...`
                    : getOtherParticipants().some((p) => p.isOnline)
                    ? 'Online'
                    : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <Video className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {currentMessages.map((message, index) => {
              const isOwn = message.senderId === user?.id || message.senderId === 'self';
              const showDate =
                index === 0 ||
                formatDate(message.createdAt) !==
                  formatDate(currentMessages[index - 1].createdAt);

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 text-xs text-slate-400 bg-slate-800 rounded-full">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        isOwn
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700 text-white'
                      } rounded-2xl px-4 py-2`}
                    >
                      {!isOwn && (
                        <p className="text-xs text-purple-300 mb-1">
                          {message.senderName}
                        </p>
                      )}

                      {message.type === 'image' ? (
                        <OptimizedImage
                          src={message.content}
                          alt="Shared image"
                          width={640}
                          height={360}
                          className="rounded-lg max-w-full h-auto"
                        />
                      ) : message.type === 'file' ? (
                        <a
                          href={message.content}
                          className="flex items-center gap-2 text-sm underline"
                        >
                          <File className="w-4 h-4" />
                          Download file
                        </a>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}

                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          isOwn ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span className="text-xs opacity-70">
                          {formatTime(message.createdAt)}
                        </span>
                        {isOwn && renderMessageStatus(message.status)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {currentTypingUsers.length > 0 && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex items-end gap-2">
              <button className="p-2 text-slate-400 hover:text-white">
                <Paperclip className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-400 hover:text-white">
                <ImageIcon className="w-5 h-5" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ maxHeight: '120px' }}
                />
              </div>

              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <Smile className="w-5 h-5" />
              </button>

              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim()}
                className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* No Conversation Selected */
        !embedded && (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-900">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">
                Select a conversation
              </h3>
              <p className="text-sm text-slate-500">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
