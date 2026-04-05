/**
 * Socket React Hooks
 * 
 * Custom hooks for integrating real-time socket functionality
 * in React components
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  socketService,
  SocketMessage,
  TypingIndicator,
  PresenceUpdate,
  Notification,
  FeedUpdate,
  ConnectionUpdate,
  SocketEventType
} from './socket';

// ==================== Core Socket Hook ====================

/**
 * Main hook for socket connection management
 */
export function useSocket(token: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) {
      socketService.disconnect();
      setIsConnected(false);
      setIsAuthenticated(false);
      return;
    }

    socketService.connect(token);

    const handleConnect = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsAuthenticated(false);
    };

    const handleAuthenticated = () => {
      setIsAuthenticated(true);
    };

    const handleError = (err: Error) => {
      setError(err);
    };

    const cleanupConnect = socketService.addEventListener('connect', handleConnect);
    const cleanupDisconnect = socketService.addEventListener('disconnect', handleDisconnect);
    const cleanupAuth = socketService.addEventListener('authenticated', handleAuthenticated);
    const cleanupError = socketService.addEventListener('error', handleError);

    return () => {
      cleanupConnect();
      cleanupDisconnect();
      cleanupAuth();
      cleanupError();
    };
  }, [token]);

  return {
    isConnected,
    isAuthenticated,
    error,
    disconnect: () => socketService.disconnect()
  };
}

// ==================== Messaging Hooks ====================

/**
 * Hook for real-time messaging in a conversation
 */
export function useConversation(conversationId: string | null) {
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!conversationId) return;

    const typingTimeouts = typingTimeoutRef.current;

    // Join conversation room
    socketService.joinConversation(conversationId);

    // Handle new messages
    const handleNewMessage = (message: SocketMessage) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
      }
    };

    // Handle message updates
    const handleMessageUpdated = (message: SocketMessage) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => 
          prev.map(m => m.id === message.id ? message : m)
        );
      }
    };

    // Handle message deletions
    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.filter(m => m.id !== data.messageId));
      }
    };

    // Handle typing indicators - unified handler for message:typing with isTyping boolean
    const handleTyping = (data: TypingIndicator) => {
      if (data.conversationId === conversationId) {
        if (data.isTyping) {
          setTypingUsers(prev => new Map(prev).set(data.userId, data));
          
          // Clear existing timeout
          const existing = typingTimeouts.get(data.userId);
          if (existing) clearTimeout(existing);
          
          // Auto-clear after 5 seconds
          const timeout = setTimeout(() => {
            setTypingUsers(prev => {
              const next = new Map(prev);
              next.delete(data.userId);
              return next;
            });
          }, 5000);
          
          typingTimeouts.set(data.userId, timeout);
        } else {
          // isTyping === false means stop typing
          setTypingUsers(prev => {
            const next = new Map(prev);
            next.delete(data.userId);
            return next;
          });
          
          const timeout = typingTimeouts.get(data.userId);
          if (timeout) {
            clearTimeout(timeout);
            typingTimeouts.delete(data.userId);
          }
        }
      }
    };

    const cleanupNewMessage = socketService.addEventListener('message:new', handleNewMessage);
    const cleanupUpdated = socketService.addEventListener('message:updated', handleMessageUpdated);
    const cleanupDeleted = socketService.addEventListener('message:deleted', handleMessageDeleted);
    const cleanupTyping = socketService.addEventListener('message:typing', handleTyping);

    return () => {
      socketService.leaveConversation(conversationId);
      cleanupNewMessage();
      cleanupUpdated();
      cleanupDeleted();
      cleanupTyping();
      
      // Clear all typing timeouts
      typingTimeouts.forEach(clearTimeout);
      typingTimeouts.clear();
    };
  }, [conversationId]);

  const sendMessage = useCallback((
    content: string,
    type: SocketMessage['type'] = 'text',
    replyTo?: string
  ) => {
    if (conversationId) {
      socketService.sendMessage(conversationId, content, type, replyTo);
    }
  }, [conversationId]);

  const startTyping = useCallback(() => {
    if (conversationId) {
      socketService.startTyping(conversationId);
    }
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (conversationId) {
      socketService.stopTyping(conversationId);
    }
  }, [conversationId]);

  const markAsRead = useCallback((messageIds: string[]) => {
    if (conversationId) {
      socketService.markAsRead(conversationId, messageIds);
    }
  }, [conversationId]);

  return {
    messages,
    typingUsers: Array.from(typingUsers.values()),
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    setMessages
  };
}

// ==================== Typing Indicator Hook ====================

/**
 * Hook for managing typing indicator with debounce
 */
export function useTypingIndicator(conversationId: string | null) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const handleTyping = useCallback(() => {
    if (!conversationId) return;

    // Start typing if not already
    if (!isTypingRef.current) {
      socketService.startTyping(conversationId);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (conversationId && isTypingRef.current) {
        socketService.stopTyping(conversationId);
        isTypingRef.current = false;
      }
    }, 2000);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (conversationId && isTypingRef.current) {
      socketService.stopTyping(conversationId);
      isTypingRef.current = false;
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (conversationId && isTypingRef.current) {
        socketService.stopTyping(conversationId);
      }
    };
  }, [conversationId]);

  return { handleTyping, stopTyping };
}

// ==================== Presence Hook ====================

/**
 * Hook for tracking user presence
 */
export function usePresence(userIds: string[]) {
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceUpdate>>(new Map());

  useEffect(() => {
    if (userIds.length === 0) return;

    // Subscribe to presence updates
    socketService.subscribeToPresence(userIds);

    const handlePresenceUpdate = (update: PresenceUpdate) => {
      if (userIds.includes(update.userId)) {
        setPresenceMap(prev => new Map(prev).set(update.userId, update));
      }
    };

    const cleanup = socketService.addEventListener('presence:update', handlePresenceUpdate);

    return () => {
      socketService.unsubscribeFromPresence(userIds);
      cleanup();
    };
  }, [userIds]);

  const updateMyPresence = useCallback((status: PresenceUpdate['status']) => {
    socketService.updatePresence(status);
  }, []);

  return {
    presenceMap,
    getPresence: (userId: string) => presenceMap.get(userId),
    updateMyPresence
  };
}

// ==================== Notifications Hook ====================

/**
 * Hook for real-time notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleNewNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const cleanup = socketService.addEventListener('notification:new', handleNewNotification);

    return cleanup;
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications
  };
}

// ==================== Feed Hook ====================

/**
 * Hook for real-time feed updates
 */
export function useFeedUpdates() {
  const [feedUpdates, setFeedUpdates] = useState<FeedUpdate[]>([]);

  useEffect(() => {
    socketService.subscribeFeed();

    const handleFeedUpdate = (update: FeedUpdate) => {
      setFeedUpdates(prev => [update, ...prev.slice(0, 99)]); // Keep last 100
    };

    const cleanup = socketService.addEventListener('feed:update', handleFeedUpdate);

    return () => {
      socketService.unsubscribeFeed();
      cleanup();
    };
  }, []);

  const clearUpdates = useCallback(() => {
    setFeedUpdates([]);
  }, []);

  return {
    feedUpdates,
    hasNewPosts: feedUpdates.some(u => u.type === 'new_post'),
    clearUpdates
  };
}

// ==================== Connection Updates Hook ====================

/**
 * Hook for real-time connection updates
 */
export function useConnectionUpdates() {
  const [connectionUpdates, setConnectionUpdates] = useState<ConnectionUpdate[]>([]);

  useEffect(() => {
    const handleConnectionUpdate = (update: ConnectionUpdate) => {
      setConnectionUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50
    };

    const cleanup = socketService.addEventListener('connection:update', handleConnectionUpdate);

    return cleanup;
  }, []);

  const clearUpdates = useCallback(() => {
    setConnectionUpdates([]);
  }, []);

  return {
    connectionUpdates,
    hasPendingRequests: connectionUpdates.some(u => u.type === 'request_received'),
    clearUpdates
  };
}

// ==================== Generic Event Hook ====================

/**
 * Generic hook for listening to any socket event
 */
export function useSocketEvent<T = unknown>(
  event: SocketEventType,
  handler: (data: T) => void
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const wrappedHandler = (data: T) => {
      handlerRef.current(data);
    };

    const cleanup = socketService.addEventListener(event, wrappedHandler);
    return cleanup;
  }, [event]);
}

// ==================== Online Status Hook ====================

/**
 * Hook for tracking browser online/offline status
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
