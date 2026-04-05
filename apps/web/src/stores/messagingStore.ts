'use client';

/**
 * Messaging Store
 * 
 * Real-time messaging state management with Socket.io support.
 * Handles conversations, messages, presence, and typing indicators.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import api from '@/lib/apiClient';
import { socketService } from '@/lib/socket';
import type { SocketMessage, TypingIndicator, PresenceUpdate } from '@/lib/socket';
import { getAccessToken } from '@/lib/tokenStore';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, unknown>;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

interface Participant {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'member' | 'admin' | 'moderator';
  isOnline: boolean;
  lastSeen?: string;
  isTyping: boolean;
}

interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'mentorship' | 'support';
  title?: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface MessagingState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Record<string, Message[]>; // conversationId -> messages
  totalUnread: number;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  typingUsers: Record<string, string[]>; // conversationId -> userIds
}

interface MessagingActions {
  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Conversations
  loadConversations: () => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  createConversation: (participantIds: string[], type?: string, title?: string) => Promise<string | null>;
  
  // Messages
  loadMessages: (conversationId: string, before?: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string, type?: string) => Promise<boolean>;
  markAsRead: (conversationId: string) => Promise<void>;
  
  // Real-time handlers
  handleNewMessage: (message: Message) => void;
  handleMessageDelivered: (messageId: string, deliveredAt: string) => void;
  handleMessageRead: (conversationId: string, userId: string, readAt: string) => void;
  handleUserTyping: (conversationId: string, userId: string) => void;
  handleUserStoppedTyping: (conversationId: string, userId: string) => void;
  handlePresenceChange: (userId: string, isOnline: boolean) => void;
  
  // Typing
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  
  // State
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  clearMessages: () => void;
}

type MessagingStore = MessagingState & MessagingActions;

let typingTimeouts: Record<string, NodeJS.Timeout> = {};
let eventCleanups: (() => void)[] = [];

function clearTypingTimeouts() {
  Object.values(typingTimeouts).forEach((timeout) => clearTimeout(timeout));
  typingTimeouts = {};
}

export const useMessagingStore = create<MessagingStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    conversations: [],
    activeConversationId: null,
    messages: {},
    totalUnread: 0,
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    typingUsers: {},

    // Connection
    connect: async () => {
      if (socketService.connected || get().isConnecting) {
        return;
      }

      set({ isConnecting: true, connectionError: null });

      try {
        const token = getAccessToken();
        if (!token) {
          set({
            isConnecting: false,
            connectionError: 'Missing authentication token',
          });
          return;
        }

        // Clean up previous listeners
        eventCleanups.forEach(fn => fn());
        eventCleanups = [];

        // Connect via Socket.io
        socketService.connect(token);

        // Connection state listeners
        eventCleanups.push(
          socketService.addEventListener('connect', () => {
            set({ isConnected: true, isConnecting: false, connectionError: null });
          })
        );

        eventCleanups.push(
          socketService.addEventListener('disconnect', () => {
            set({ isConnected: false });
          })
        );

        eventCleanups.push(
          socketService.addEventListener('error', (error: unknown) => {
            const msg = error instanceof Error ? error.message : 'Connection error';
            set({ connectionError: msg, isConnecting: false });
          })
        );

        // Real-time message handler
        eventCleanups.push(
          socketService.addEventListener('message:new', (incoming: unknown) => {
            const msg = incoming as SocketMessage & { clientId?: string; senderName?: string };
            const convMessages = get().messages[msg.conversationId] || [];

            // Deduplicate by real message ID
            if (convMessages.some(m => m.id === msg.id)) return;

            // Check if this confirms our optimistic message
            if (msg.clientId && convMessages.some(m => m.id === msg.clientId)) {
              set((state) => ({
                messages: {
                  ...state.messages,
                  [msg.conversationId]: (state.messages[msg.conversationId] || []).map(m =>
                    m.id === msg.clientId
                      ? { ...m, id: msg.id, status: 'sent' as const, createdAt: msg.createdAt }
                      : m
                  ),
                },
              }));
              return;
            }

            // New incoming message
            get().handleNewMessage({
              id: msg.id,
              conversationId: msg.conversationId,
              senderId: msg.senderId,
              senderName: msg.senderName || '',
              content: msg.content,
              type: (msg.type || 'text') as Message['type'],
              createdAt: msg.createdAt,
              status: 'delivered',
            });
          })
        );

        // Optimistic send confirmation
        eventCleanups.push(
          socketService.addEventListener('message:sent', (data: unknown) => {
            const { clientId, messageId, timestamp } = data as { clientId: string; messageId: string; timestamp: string };
            set((state) => {
              const newMessages = { ...state.messages };
              for (const convId in newMessages) {
                newMessages[convId] = newMessages[convId].map((m) =>
                  m.id === clientId
                    ? { ...m, id: messageId, status: 'sent' as const, createdAt: timestamp }
                    : m
                );
              }
              return { messages: newMessages };
            });
          })
        );

        // Message delivered
        eventCleanups.push(
          socketService.addEventListener('message:delivered', (data: unknown) => {
            const { messageId } = data as { messageId: string };
            get().handleMessageDelivered(messageId, new Date().toISOString());
          })
        );

        // Message read
        eventCleanups.push(
          socketService.addEventListener('message:read', (data: unknown) => {
            const { conversationId, userId } = data as { conversationId: string; userId: string };
            get().handleMessageRead(conversationId, userId, new Date().toISOString());
          })
        );

        // Typing indicators
        eventCleanups.push(
          socketService.addEventListener('message:typing', (data: unknown) => {
            const typing = data as TypingIndicator;
            if (typing.isTyping) {
              get().handleUserTyping(typing.conversationId, typing.userId);
            } else {
              get().handleUserStoppedTyping(typing.conversationId, typing.userId);
            }
          })
        );

        // Presence updates
        eventCleanups.push(
          socketService.addEventListener('presence:update', (data: unknown) => {
            const presence = data as PresenceUpdate;
            get().handlePresenceChange(presence.userId, presence.status === 'online');
          })
        );

        // If already connected synchronously
        if (socketService.connected) {
          set({ isConnected: true, isConnecting: false, connectionError: null });
        }
      } catch (err) {
        set({ 
          isConnecting: false, 
          connectionError: err instanceof Error ? err.message : 'Connection failed' 
        });
      }
    },

    disconnect: () => {
      eventCleanups.forEach(fn => fn());
      eventCleanups = [];
      socketService.disconnect();
      clearTypingTimeouts();
      set({ isConnected: false, isConnecting: false });
    },

    // Conversations
    loadConversations: async () => {
      try {
        const { ok, data } = await api<{ conversations: Conversation[]; totalUnread: number }>('/messages/conversations');
        if (ok && data) {
          set({ 
            conversations: data.conversations || [],
            totalUnread: data.totalUnread || 0,
          });
        }
      } catch (err) {
        console.error('Failed to load conversations:', err);
      }
    },

    setActiveConversation: (id) => {
      set({ activeConversationId: id });
      if (id) {
        get().loadMessages(id);
        get().markAsRead(id);
      }
    },

    createConversation: async (participantIds, type = 'direct', title) => {
      try {
        const { ok, data } = await api<{ conversation: Conversation }>('/messages/conversations', {
          method: 'POST',
          body: { participantIds, type, title },
        });
        if (ok && data?.conversation) {
          set((state) => ({
            conversations: [data.conversation, ...state.conversations],
          }));
          return data.conversation.id;
        }
        return null;
      } catch (err) {
        console.error('Failed to create conversation:', err);
        return null;
      }
    },

    // Messages
    loadMessages: async (conversationId, before) => {
      try {
        const url = before 
          ? `/messages/conversations/${conversationId}?before=${before}`
          : `/messages/conversations/${conversationId}`;
        
        const { ok, data } = await api<{ messages: Message[] }>(url);
        if (ok && data?.messages) {
          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: before
                ? [...data.messages, ...(state.messages[conversationId] || [])]
                : data.messages,
            },
          }));
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    },

    sendMessage: async (conversationId, content, type = 'text') => {
      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        conversationId,
        senderId: 'self',
        senderName: 'You',
        content,
        type: type as Message['type'],
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // Optimistic update
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: [...(state.messages[conversationId] || []), tempMessage],
        },
      }));

      try {
        // Send via Socket.io if connected
        if (socketService.connected) {
          socketService.sendMessage(conversationId, content, type as SocketMessage['type'], undefined, tempId);
          return true;
        }

        // Fallback to REST API
        const { ok, data } = await api<{ message: Message }>(`/messages/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: { content, type },
        });

        if (ok && data?.message) {
          // Replace temp message with real one
          set((state) => ({
            messages: {
              ...state.messages,
              [conversationId]: state.messages[conversationId]?.map((m) =>
                m.id === tempId ? { ...data.message, status: 'sent' } : m
              ) || [],
            },
          }));
          return true;
        }
        
        // Mark as failed
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: state.messages[conversationId]?.map((m) =>
              m.id === tempId ? { ...m, status: 'failed' } : m
            ) || [],
          },
        }));
        return false;
      } catch (err) {
        // Mark as failed
        set((state) => ({
          messages: {
            ...state.messages,
            [conversationId]: state.messages[conversationId]?.map((m) =>
              m.id === tempId ? { ...m, status: 'failed' } : m
            ) || [],
          },
        }));
        return false;
      }
    },

    markAsRead: async (conversationId) => {
      try {
        await api(`/messages/conversations/${conversationId}/read`, { method: 'POST' });
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          ),
          totalUnread: state.conversations.reduce(
            (sum, c) => sum + (c.id === conversationId ? 0 : c.unreadCount),
            0
          ),
        }));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    },

    // Real-time handlers
    handleNewMessage: (message) => {
      set((state) => {
        const existingMessages = state.messages[message.conversationId] || [];
        const messageExists = existingMessages.some((m) => m.id === message.id);
        
        if (messageExists) return state;

        const newMessages = [...existingMessages, message];
        const newConversations = state.conversations.map((c) => {
          if (c.id === message.conversationId) {
            return {
              ...c,
              lastMessage: message,
              unreadCount: state.activeConversationId === c.id ? 0 : c.unreadCount + 1,
              updatedAt: message.createdAt,
            };
          }
          return c;
        });

        return {
          messages: {
            ...state.messages,
            [message.conversationId]: newMessages,
          },
          conversations: newConversations.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          ),
          totalUnread: newConversations.reduce((sum, c) => sum + c.unreadCount, 0),
        };
      });
    },

    handleMessageDelivered: (messageId, deliveredAt) => {
      set((state) => {
        const newMessages = { ...state.messages };
        for (const convId in newMessages) {
          newMessages[convId] = newMessages[convId].map((m) =>
            m.id === messageId ? { ...m, deliveredAt, status: 'delivered' } : m
          );
        }
        return { messages: newMessages };
      });
    },

    handleMessageRead: (conversationId, userId, readAt) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: state.messages[conversationId]?.map((m) => ({
            ...m,
            readAt: m.readAt || readAt,
            status: 'read',
          })) || [],
        },
      }));
    },

    handleUserTyping: (conversationId, userId) => {
      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: [...new Set([...(state.typingUsers[conversationId] || []), userId])],
        },
      }));

      // Clear typing after 3 seconds
      const key = `${conversationId}:${userId}`;
      if (typingTimeouts[key]) {
        clearTimeout(typingTimeouts[key]);
      }
      typingTimeouts[key] = setTimeout(() => {
        get().handleUserStoppedTyping(conversationId, userId);
      }, 3000);
    },

    handleUserStoppedTyping: (conversationId, userId) => {
      const key = `${conversationId}:${userId}`;
      if (typingTimeouts[key]) {
        clearTimeout(typingTimeouts[key]);
        delete typingTimeouts[key];
      }

      set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [conversationId]: (state.typingUsers[conversationId] || []).filter((id) => id !== userId),
        },
      }));
    },

    handlePresenceChange: (userId, isOnline) => {
      set((state) => ({
        conversations: state.conversations.map((c) => ({
          ...c,
          participants: c.participants.map((p) =>
            p.userId === userId ? { ...p, isOnline, lastSeen: isOnline ? undefined : new Date().toISOString() } : p
          ),
        })),
      }));
    },

    // Typing
    sendTypingStart: (conversationId) => {
      socketService.startTyping(conversationId);
    },

    sendTypingStop: (conversationId) => {
      socketService.stopTyping(conversationId);
    },

    // State
    setConnected: (connected) => set({ isConnected: connected }),
    setConnectionError: (error) => set({ connectionError: error }),
    clearMessages: () => set({ messages: {}, conversations: [], totalUnread: 0 }),
  }))
);

