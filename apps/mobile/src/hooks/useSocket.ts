/**
 * Socket.io React Hooks
 * 
 * Provides easy-to-use hooks for real-time features:
 * - useSocket: Connection management
 * - useMessages: Real-time messaging
 * - useTypingIndicator: Typing indicators
 * - usePresence: Online/offline status
 * - useNotifications: Real-time notifications
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import socketService, { ConnectionState, MESSAGE_TYPES } from '../services/socket';

/**
 * Hook for socket connection management
 */
export function useSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    socketService.getConnectionState()
  );
  const [isConnected, setIsConnected] = useState(socketService.isConnected());

  useEffect(() => {
    const handleStateChange = (state: ConnectionState) => {
      setConnectionState(state);
      setIsConnected(state === ConnectionState.AUTHENTICATED);
    };

    socketService.events.on('stateChange', handleStateChange);

    // Initial state
    setConnectionState(socketService.getConnectionState());
    setIsConnected(socketService.isConnected());

    return () => {
      socketService.events.off('stateChange', handleStateChange);
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      await socketService.connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  const reconnect = useCallback(async () => {
    try {
      await socketService.reconnect();
    } catch (error) {
      console.error('Failed to reconnect:', error);
      throw error;
    }
  }, []);

  return {
    connectionState,
    isConnected,
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Message type interface
 */
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: string;
  clientId?: string;
}

interface TypingUser {
  userId: string;
  userName: string;
}

/**
 * Hook for real-time messaging in a conversation
 */
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [loading, setLoading] = useState(false);
  const pendingMessagesRef = useRef<Map<string, Message>>(new Map());

  // Join conversation when ID changes
  useEffect(() => {
    if (conversationId) {
      socketService.joinConversation(conversationId);
      return () => {
        socketService.leaveConversation();
      };
    }
  }, [conversationId]);

  // Set up message listeners
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => {
          // Check if this is a confirmation of our pending message
          if (message.clientId && pendingMessagesRef.current.has(message.clientId)) {
            pendingMessagesRef.current.delete(message.clientId);
            // Replace pending message with confirmed message
            return prev.map((m) =>
              m.clientId === message.clientId
                ? { ...message, status: 'sent' }
                : m
            );
          }
          // Add new message if not already present
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    };

    const handleMessageSent = (data: { clientId: string; messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === data.clientId
            ? { ...m, id: data.messageId, status: 'sent' }
            : m
        )
      );
    };

    const handleMessageDelivered = (data: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, status: 'delivered' } : m
        )
      );
    };

    const handleMessageRead = (data: { messageIds: string[] }) => {
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id) ? { ...m, status: 'read' } : m
        )
      );
    };

    const handleUserTyping = (data: { userId: string; userName: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.userId === data.userId)) {
            return prev;
          }
          return [...prev, { userId: data.userId, userName: data.userName }];
        });
      }
    };

    const handleUserStoppedTyping = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    };

    socketService.events.on('newMessage', handleNewMessage);
    socketService.events.on('messageSent', handleMessageSent);
    socketService.events.on('messageDelivered', handleMessageDelivered);
    socketService.events.on('messageRead', handleMessageRead);
    socketService.events.on('userTyping', handleUserTyping);
    socketService.events.on('userStoppedTyping', handleUserStoppedTyping);

    return () => {
      socketService.events.off('newMessage', handleNewMessage);
      socketService.events.off('messageSent', handleMessageSent);
      socketService.events.off('messageDelivered', handleMessageDelivered);
      socketService.events.off('messageRead', handleMessageRead);
      socketService.events.off('userTyping', handleUserTyping);
      socketService.events.off('userStoppedTyping', handleUserStoppedTyping);
    };
  }, [conversationId]);

  const sendMessage = useCallback(
    (content: string, type: string = 'text') => {
      if (!conversationId) return;

      const clientId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create optimistic message
      const optimisticMessage: Message = {
        id: clientId,
        conversationId,
        senderId: 'me', // Will be replaced with actual ID
        content,
        type,
        status: 'sending',
        createdAt: new Date().toISOString(),
        clientId,
      };

      pendingMessagesRef.current.set(clientId, optimisticMessage);
      setMessages((prev) => [...prev, optimisticMessage]);

      socketService.sendMessage(conversationId, content, type);
    },
    [conversationId]
  );

  const markAsRead = useCallback(
    (messageIds: string[]) => {
      if (!conversationId) return;
      socketService.markRead(conversationId, messageIds);
    },
    [conversationId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    pendingMessagesRef.current.clear();
  }, []);

  return {
    messages,
    typingUsers,
    loading,
    sendMessage,
    markAsRead,
    clearMessages,
    setMessages,
  };
}

/**
 * Hook for typing indicator
 */
export function useTypingIndicator(conversationId: string | null) {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(() => {
    if (!conversationId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socketService.startTyping(conversationId);

    // Auto-stop after 3 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(conversationId);
    }, 3000);
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    socketService.stopTyping(conversationId);
  }, [conversationId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (conversationId) {
        socketService.stopTyping(conversationId);
      }
    };
  }, [conversationId]);

  return { startTyping, stopTyping };
}

/**
 * Hook for user presence (online/offline status)
 */
export function usePresence(userIds: string[]) {
  const [presence, setPresence] = useState<Map<string, { online: boolean; lastSeen: Date | null }>>(
    new Map()
  );

  useEffect(() => {
    // Get initial presence from cache
    const initialPresence = socketService.getMultiplePresence(userIds);
    setPresence(initialPresence);

    const handleUserOnline = (data: { userId: string }) => {
      if (userIds.includes(data.userId)) {
        setPresence((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.userId, { online: true, lastSeen: new Date() });
          return newMap;
        });
      }
    };

    const handleUserOffline = (data: { userId: string; lastSeen: string }) => {
      if (userIds.includes(data.userId)) {
        setPresence((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.userId, { online: false, lastSeen: new Date(data.lastSeen) });
          return newMap;
        });
      }
    };

    socketService.events.on('userOnline', handleUserOnline);
    socketService.events.on('userOffline', handleUserOffline);

    return () => {
      socketService.events.off('userOnline', handleUserOnline);
      socketService.events.off('userOffline', handleUserOffline);
    };
  }, [userIds.join(',')]);

  const isOnline = useCallback(
    (userId: string): boolean => {
      return presence.get(userId)?.online || false;
    },
    [presence]
  );

  const getLastSeen = useCallback(
    (userId: string): Date | null => {
      return presence.get(userId)?.lastSeen || null;
    },
    [presence]
  );

  return { presence, isOnline, getLastSeen };
}

/**
 * Hook for real-time notifications
 */
export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleNewNotification = (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleNotificationRead = (data: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === data.notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    socketService.events.on('newNotification', handleNewNotification);
    socketService.events.on('notificationRead', handleNotificationRead);

    return () => {
      socketService.events.off('newNotification', handleNewNotification);
      socketService.events.off('notificationRead', handleNotificationRead);
    };
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    // This would typically be an API call + socket emit
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearAll,
    setNotifications,
    setUnreadCount,
  };
}

/**
 * Hook for real-time feed updates
 */
export function useFeedUpdates() {
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);

  useEffect(() => {
    const handleNewPost = () => {
      setNewPostsAvailable(true);
      setNewPostsCount((prev) => prev + 1);
    };

    const handlePostUpdated = (post: any) => {
      socketService.events.emit('postUpdateLocal', post);
    };

    const handleNewReaction = (reaction: any) => {
      socketService.events.emit('reactionLocal', reaction);
    };

    const handleNewComment = (comment: any) => {
      socketService.events.emit('commentLocal', comment);
    };

    socketService.events.on('newPost', handleNewPost);
    socketService.events.on('postUpdated', handlePostUpdated);
    socketService.events.on('newReaction', handleNewReaction);
    socketService.events.on('newComment', handleNewComment);

    return () => {
      socketService.events.off('newPost', handleNewPost);
      socketService.events.off('postUpdated', handlePostUpdated);
      socketService.events.off('newReaction', handleNewReaction);
      socketService.events.off('newComment', handleNewComment);
    };
  }, []);

  const clearNewPosts = useCallback(() => {
    setNewPostsAvailable(false);
    setNewPostsCount(0);
  }, []);

  return {
    newPostsAvailable,
    newPostsCount,
    clearNewPosts,
  };
}

/**
 * Hook for connection requests
 */
export function useConnectionUpdates() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  useEffect(() => {
    const handleConnectionRequest = (request: any) => {
      setPendingRequests((prev) => [request, ...prev]);
    };

    const handleConnectionAccepted = (data: { connectionId: string }) => {
      setPendingRequests((prev) =>
        prev.filter((r) => r.id !== data.connectionId)
      );
    };

    socketService.events.on('connectionRequest', handleConnectionRequest);
    socketService.events.on('connectionAccepted', handleConnectionAccepted);

    return () => {
      socketService.events.off('connectionRequest', handleConnectionRequest);
      socketService.events.off('connectionAccepted', handleConnectionAccepted);
    };
  }, []);

  return { pendingRequests, setPendingRequests };
}
