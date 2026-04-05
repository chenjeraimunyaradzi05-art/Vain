/**
 * Messaging Store - Zustand state management for real-time messaging
 * 
 * Manages:
 * - Conversations list
 * - Messages within conversations
 * - Real-time message updates
 * - Typing indicators
 * - Read receipts
 * - Message sending with offline queue
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { socketService, MESSAGE_TYPES } from '../services/socket';

// Types
export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export interface Message {
  id: string;
  tempId?: string; // For optimistic updates
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  mediaUrl?: string;
  createdAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  readBy?: string[];
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
  };
  reactions?: Array<{
    userId: string;
    emoji: string;
  }>;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string; // For groups
  avatar?: string; // For groups
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TypingUser {
  conversationId: string;
  userId: string;
  userName: string;
  timestamp: number;
}

interface MessagingState {
  // Data
  conversations: Conversation[];
  messages: Record<string, Message[]>; // Messages by conversation ID
  typingUsers: TypingUser[];
  onlineUsers: Set<string>;
  
  // Current state
  activeConversationId: string | null;
  
  // Pagination
  conversationsCursor: string | null;
  conversationsHasMore: boolean;
  messageCursors: Record<string, string | null>;
  messageHasMore: Record<string, boolean>;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isSending: boolean;
  
  // Error state
  error: string | null;
  
  // Offline queue
  offlineQueue: Array<{
    tempId: string;
    conversationId: string;
    content: string;
    type: Message['type'];
    mediaUrl?: string;
    replyToId?: string;
  }>;
  
  // Actions
  fetchConversations: (refresh?: boolean) => Promise<void>;
  fetchMessages: (conversationId: string, refresh?: boolean) => Promise<void>;
  createConversation: (participantIds: string[], name?: string) => Promise<Conversation | null>;
  
  // Messaging
  sendMessage: (
    conversationId: string,
    content: string,
    type?: Message['type'],
    mediaUrl?: string,
    replyToId?: string
  ) => Promise<void>;
  resendMessage: (tempId: string) => Promise<void>;
  deleteMessage: (messageId: string, conversationId: string) => Promise<void>;
  addReaction: (messageId: string, conversationId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, conversationId: string) => Promise<void>;
  
  // Read receipts
  markAsRead: (conversationId: string) => Promise<void>;
  
  // Typing indicators
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  
  // Conversation management
  setActiveConversation: (conversationId: string | null) => void;
  pinConversation: (conversationId: string) => Promise<void>;
  unpinConversation: (conversationId: string) => Promise<void>;
  muteConversation: (conversationId: string) => Promise<void>;
  unmuteConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  
  // Real-time handlers
  handleNewMessage: (message: Message) => void;
  handleMessageSent: (data: { tempId: string; messageId: string; timestamp: string }) => void;
  handleMessageDelivered: (data: { messageId: string; conversationId: string }) => void;
  handleMessageRead: (data: { messageId: string; conversationId: string; userId: string }) => void;
  handleUserTyping: (data: { conversationId: string; userId: string; userName: string }) => void;
  handleUserStoppedTyping: (data: { conversationId: string; userId: string }) => void;
  handleUserOnline: (userId: string) => void;
  handleUserOffline: (userId: string) => void;
  
  // Utility
  getUnreadCount: () => number;
  clearError: () => void;
  flushOfflineQueue: () => Promise<void>;
  reset: () => void;
}

// Helper to generate temp ID
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to update conversation in list
const updateConversation = (
  conversations: Conversation[],
  conversationId: string,
  update: Partial<Conversation>
): Conversation[] => {
  return conversations.map(c => 
    c.id === conversationId ? { ...c, ...update } : c
  );
};

// Helper to update message in list
const updateMessage = (
  messages: Message[],
  messageId: string,
  update: Partial<Message>
): Message[] => {
  return messages.map(m => 
    m.id === messageId || m.tempId === messageId ? { ...m, ...update } : m
  );
};

export const useMessagingStore = create<MessagingState>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      messages: {},
      typingUsers: [],
      onlineUsers: new Set<string>(),
      activeConversationId: null,
      conversationsCursor: null,
      conversationsHasMore: true,
      messageCursors: {},
      messageHasMore: {},
      isLoading: false,
      isRefreshing: false,
      isSending: false,
      error: null,
      offlineQueue: [],

      // Fetch conversations
      fetchConversations: async (refresh = false) => {
        const { conversationsCursor, isLoading, isRefreshing } = get();
        
        if (isLoading || isRefreshing) return;
        
        set({ 
          isLoading: !refresh, 
          isRefreshing: refresh,
          error: null 
        });

        try {
          const response = await api.messaging.getConversations(
            refresh ? undefined : conversationsCursor || undefined
          );
          
          set(state => ({
            conversations: refresh 
              ? response.conversations 
              : [...state.conversations, ...response.conversations],
            conversationsCursor: response.nextCursor,
            conversationsHasMore: response.hasMore,
            isLoading: false,
            isRefreshing: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch conversations',
            isLoading: false,
            isRefreshing: false
          });
        }
      },

      // Fetch messages for a conversation
      fetchMessages: async (conversationId: string, refresh = false) => {
        const { messageCursors, isLoading } = get();
        
        if (isLoading) return;
        
        set({ isLoading: true, error: null });

        try {
          const cursor = refresh ? undefined : messageCursors[conversationId] || undefined;
          const response = await api.messaging.getMessages(conversationId, cursor);
          
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: refresh
                ? response.messages
                : [...(state.messages[conversationId] || []), ...response.messages]
            },
            messageCursors: {
              ...state.messageCursors,
              [conversationId]: response.nextCursor
            },
            messageHasMore: {
              ...state.messageHasMore,
              [conversationId]: response.hasMore
            },
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch messages',
            isLoading: false
          });
        }
      },

      // Create new conversation
      createConversation: async (participantIds: string[], name?: string) => {
        set({ isLoading: true, error: null });

        try {
          const conversation = await api.messaging.createConversation(participantIds, name);
          
          set(state => ({
            conversations: [conversation, ...state.conversations],
            isLoading: false
          }));

          return conversation;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to create conversation',
            isLoading: false
          });
          return null;
        }
      },

      // Send message
      sendMessage: async (
        conversationId: string,
        content: string,
        type: Message['type'] = 'text',
        mediaUrl?: string,
        replyToId?: string
      ) => {
        const tempId = generateTempId();
        
        // Get reply info if replying
        let replyTo: Message['replyTo'] | undefined;
        if (replyToId) {
          const messages = get().messages[conversationId] || [];
          const replyMessage = messages.find(m => m.id === replyToId);
          if (replyMessage) {
            replyTo = {
              id: replyMessage.id,
              content: replyMessage.content,
              senderId: replyMessage.senderId,
              senderName: '' // Would need to look up user name
            };
          }
        }

        // Create optimistic message
        const optimisticMessage: Message = {
          id: tempId,
          tempId,
          conversationId,
          senderId: 'current_user', // Will be replaced by actual user ID
          content,
          type,
          mediaUrl,
          createdAt: new Date().toISOString(),
          status: 'sending',
          replyTo
        };

        // Add to messages optimistically
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: [
              optimisticMessage,
              ...(state.messages[conversationId] || [])
            ]
          },
          isSending: true
        }));

        // Try to send via socket
        if (socketService.isConnected()) {
          socketService.sendMessage(conversationId, content, tempId);
        } else {
          // Add to offline queue
          set(state => ({
            offlineQueue: [
              ...state.offlineQueue,
              { tempId, conversationId, content, type, mediaUrl, replyToId }
            ],
            messages: {
              ...state.messages,
              [conversationId]: updateMessage(
                state.messages[conversationId] || [],
                tempId,
                { status: 'failed' }
              )
            },
            isSending: false
          }));
        }
      },

      // Resend failed message
      resendMessage: async (tempId: string) => {
        const { offlineQueue, messages } = get();
        const queuedMessage = offlineQueue.find(m => m.tempId === tempId);
        
        if (!queuedMessage) return;

        // Update status to sending
        set(state => ({
          messages: {
            ...state.messages,
            [queuedMessage.conversationId]: updateMessage(
              state.messages[queuedMessage.conversationId] || [],
              tempId,
              { status: 'sending' }
            )
          }
        }));

        if (socketService.isConnected()) {
          socketService.sendMessage(
            queuedMessage.conversationId,
            queuedMessage.content,
            tempId
          );
          
          // Remove from queue
          set(state => ({
            offlineQueue: state.offlineQueue.filter(m => m.tempId !== tempId)
          }));
        }
      },

      // Delete message
      deleteMessage: async (messageId: string, conversationId: string) => {
        const { messages } = get();
        const deletedMessage = messages[conversationId]?.find(m => m.id === messageId);

        // Optimistic delete
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: (state.messages[conversationId] || []).filter(
              m => m.id !== messageId
            )
          }
        }));

        try {
          await api.messaging.deleteMessage(messageId);
        } catch (error: any) {
          // Revert on error
          if (deletedMessage) {
            set(state => ({
              messages: {
                ...state.messages,
                [conversationId]: [
                  deletedMessage,
                  ...(state.messages[conversationId] || [])
                ].sort((a, b) => 
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                )
              },
              error: error.message
            }));
          }
        }
      },

      // Add reaction to message
      addReaction: async (messageId: string, conversationId: string, emoji: string) => {
        // Optimistic update
        set(state => ({
          messages: {
            ...state.messages,
            [conversationId]: updateMessage(
              state.messages[conversationId] || [],
              messageId,
              {
                reactions: [
                  ...(state.messages[conversationId]?.find(m => m.id === messageId)?.reactions || []),
                  { userId: 'current_user', emoji }
                ]
              }
            )
          }
        }));

        try {
          await api.messaging.addReaction(messageId, emoji);
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      // Remove reaction from message
      removeReaction: async (messageId: string, conversationId: string) => {
        try {
          await api.messaging.removeReaction(messageId);
          
          set(state => ({
            messages: {
              ...state.messages,
              [conversationId]: updateMessage(
                state.messages[conversationId] || [],
                messageId,
                {
                  reactions: state.messages[conversationId]
                    ?.find(m => m.id === messageId)
                    ?.reactions?.filter(r => r.userId !== 'current_user')
                }
              )
            }
          }));
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      // Mark conversation as read
      markAsRead: async (conversationId: string) => {
        // Update locally immediately
        set(state => ({
          conversations: updateConversation(
            state.conversations,
            conversationId,
            { unreadCount: 0 }
          )
        }));

        // Send via socket
        socketService.markAsRead(conversationId);
      },

      // Start typing indicator
      startTyping: (conversationId: string) => {
        socketService.sendTyping(conversationId, true);
      },

      // Stop typing indicator
      stopTyping: (conversationId: string) => {
        socketService.sendTyping(conversationId, false);
      },

      // Set active conversation
      setActiveConversation: (conversationId: string | null) => {
        const { activeConversationId } = get();
        
        // Leave previous conversation room
        if (activeConversationId) {
          socketService.leaveConversation(activeConversationId);
        }
        
        // Join new conversation room
        if (conversationId) {
          socketService.joinConversation(conversationId);
        }
        
        set({ activeConversationId: conversationId });
      },

      // Pin conversation
      pinConversation: async (conversationId: string) => {
        set(state => ({
          conversations: updateConversation(
            state.conversations,
            conversationId,
            { isPinned: true }
          )
        }));

        try {
          await api.messaging.pinConversation(conversationId);
        } catch (error: any) {
          set(state => ({
            conversations: updateConversation(
              state.conversations,
              conversationId,
              { isPinned: false }
            ),
            error: error.message
          }));
        }
      },

      // Unpin conversation
      unpinConversation: async (conversationId: string) => {
        set(state => ({
          conversations: updateConversation(
            state.conversations,
            conversationId,
            { isPinned: false }
          )
        }));

        try {
          await api.messaging.unpinConversation(conversationId);
        } catch (error: any) {
          set(state => ({
            conversations: updateConversation(
              state.conversations,
              conversationId,
              { isPinned: true }
            ),
            error: error.message
          }));
        }
      },

      // Mute conversation
      muteConversation: async (conversationId: string) => {
        set(state => ({
          conversations: updateConversation(
            state.conversations,
            conversationId,
            { isMuted: true }
          )
        }));

        try {
          await api.messaging.muteConversation(conversationId);
        } catch (error: any) {
          set(state => ({
            conversations: updateConversation(
              state.conversations,
              conversationId,
              { isMuted: false }
            ),
            error: error.message
          }));
        }
      },

      // Unmute conversation
      unmuteConversation: async (conversationId: string) => {
        set(state => ({
          conversations: updateConversation(
            state.conversations,
            conversationId,
            { isMuted: false }
          )
        }));

        try {
          await api.messaging.unmuteConversation(conversationId);
        } catch (error: any) {
          set(state => ({
            conversations: updateConversation(
              state.conversations,
              conversationId,
              { isMuted: true }
            ),
            error: error.message
          }));
        }
      },

      // Archive conversation
      archiveConversation: async (conversationId: string) => {
        const { conversations } = get();
        const conversation = conversations.find(c => c.id === conversationId);

        // Optimistic remove
        set(state => ({
          conversations: state.conversations.filter(c => c.id !== conversationId)
        }));

        try {
          await api.messaging.archiveConversation(conversationId);
        } catch (error: any) {
          // Revert on error
          if (conversation) {
            set(state => ({
              conversations: [...state.conversations, conversation],
              error: error.message
            }));
          }
        }
      },

      // Real-time: Handle new message
      handleNewMessage: (message: Message) => {
        set(state => {
          const conversationId = message.conversationId;
          const existingMessages = state.messages[conversationId] || [];
          
          // Don't add if already exists
          if (existingMessages.some(m => m.id === message.id)) {
            return state;
          }

          // Update conversation's last message and unread count
          const isActive = state.activeConversationId === conversationId;
          
          return {
            messages: {
              ...state.messages,
              [conversationId]: [message, ...existingMessages]
            },
            conversations: state.conversations.map(c => {
              if (c.id !== conversationId) return c;
              return {
                ...c,
                lastMessage: message,
                unreadCount: isActive ? c.unreadCount : c.unreadCount + 1,
                updatedAt: message.createdAt
              };
            })
          };
        });
      },

      // Real-time: Handle message sent confirmation
      handleMessageSent: (data) => {
        set(state => {
          // Find and update the temp message
          for (const [convId, messages] of Object.entries(state.messages)) {
            const index = messages.findIndex(m => m.tempId === data.tempId);
            if (index !== -1) {
              return {
                messages: {
                  ...state.messages,
                  [convId]: updateMessage(messages, data.tempId, {
                    id: data.messageId,
                    status: 'sent',
                    createdAt: data.timestamp
                  })
                },
                isSending: false
              };
            }
          }
          return { isSending: false };
        });
      },

      // Real-time: Handle message delivered
      handleMessageDelivered: (data) => {
        set(state => ({
          messages: {
            ...state.messages,
            [data.conversationId]: updateMessage(
              state.messages[data.conversationId] || [],
              data.messageId,
              { status: 'delivered' }
            )
          }
        }));
      },

      // Real-time: Handle message read
      handleMessageRead: (data) => {
        set(state => ({
          messages: {
            ...state.messages,
            [data.conversationId]: updateMessage(
              state.messages[data.conversationId] || [],
              data.messageId,
              { 
                status: 'read',
                readBy: [
                  ...(state.messages[data.conversationId]?.find(m => m.id === data.messageId)?.readBy || []),
                  data.userId
                ]
              }
            )
          }
        }));
      },

      // Real-time: Handle user typing
      handleUserTyping: (data) => {
        set(state => {
          // Remove existing typing indicator for this user
          const filteredTyping = state.typingUsers.filter(
            t => !(t.conversationId === data.conversationId && t.userId === data.userId)
          );
          
          return {
            typingUsers: [
              ...filteredTyping,
              {
                conversationId: data.conversationId,
                userId: data.userId,
                userName: data.userName,
                timestamp: Date.now()
              }
            ]
          };
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
          set(state => ({
            typingUsers: state.typingUsers.filter(
              t => !(t.conversationId === data.conversationId && t.userId === data.userId)
            )
          }));
        }, 5000);
      },

      // Real-time: Handle user stopped typing
      handleUserStoppedTyping: (data) => {
        set(state => ({
          typingUsers: state.typingUsers.filter(
            t => !(t.conversationId === data.conversationId && t.userId === data.userId)
          )
        }));
      },

      // Real-time: Handle user online
      handleUserOnline: (userId: string) => {
        set(state => {
          const newOnlineUsers = new Set(state.onlineUsers);
          newOnlineUsers.add(userId);
          
          return {
            onlineUsers: newOnlineUsers,
            conversations: state.conversations.map(c => ({
              ...c,
              participants: c.participants.map(p => 
                p.id === userId ? { ...p, isOnline: true } : p
              )
            }))
          };
        });
      },

      // Real-time: Handle user offline
      handleUserOffline: (userId: string) => {
        set(state => {
          const newOnlineUsers = new Set(state.onlineUsers);
          newOnlineUsers.delete(userId);
          
          return {
            onlineUsers: newOnlineUsers,
            conversations: state.conversations.map(c => ({
              ...c,
              participants: c.participants.map(p => 
                p.id === userId 
                  ? { ...p, isOnline: false, lastSeen: new Date().toISOString() } 
                  : p
              )
            }))
          };
        });
      },

      // Get total unread count
      getUnreadCount: () => {
        return get().conversations.reduce((sum, c) => sum + c.unreadCount, 0);
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Flush offline queue
      flushOfflineQueue: async () => {
        const { offlineQueue } = get();
        
        if (!socketService.isConnected() || offlineQueue.length === 0) return;

        for (const message of offlineQueue) {
          socketService.sendMessage(message.conversationId, message.content, message.tempId);
        }

        set({ offlineQueue: [] });
      },

      // Reset store
      reset: () => set({
        conversations: [],
        messages: {},
        typingUsers: [],
        onlineUsers: new Set<string>(),
        activeConversationId: null,
        conversationsCursor: null,
        conversationsHasMore: true,
        messageCursors: {},
        messageHasMore: {},
        isLoading: false,
        isRefreshing: false,
        isSending: false,
        error: null,
        offlineQueue: []
      })
    }),
    {
      name: 'messaging-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist conversations and recent messages
      partialize: (state) => ({
        conversations: state.conversations.slice(0, 50),
        // Keep last 30 messages per conversation for offline access
        messages: Object.fromEntries(
          Object.entries(state.messages).map(([convId, msgs]) => [
            convId,
            msgs.slice(0, 30)
          ])
        ),
        offlineQueue: state.offlineQueue
      }),
      // Custom serialization for Set
      serialize: (state) => JSON.stringify({
        ...state,
        state: {
          ...state.state,
          onlineUsers: Array.from(state.state.onlineUsers || [])
        }
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          ...parsed,
          state: {
            ...parsed.state,
            onlineUsers: new Set(parsed.state.onlineUsers || [])
          }
        };
      }
    }
  )
);
