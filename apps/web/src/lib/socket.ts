/**
 * Web Socket Service
 * 
 * Real-time communication layer for the web application
 * Provides:
 * - Real-time messaging
 * - Live notifications
 * - Presence tracking
 * - Live updates (feeds, comments, etc.)
 */

import { io, Socket } from 'socket.io-client';
import { EventEmitter } from 'events';

// Socket configuration
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3333';

// Types
export interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'audio' | 'location';
  messageType?: 'text' | 'image' | 'video' | 'file' | 'audio' | 'location';
  clientId?: string;
  replyTo?: string;
  createdAt: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName?: string;
  isTyping: boolean;
}

export interface PresenceUpdate {
  userId: string;
  status: 'online' | 'offline' | 'idle';
  lastSeen?: string;
  timestamp?: Date;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: string;
  read: boolean;
}

export interface FeedUpdate {
  type: 'new_post' | 'post_updated' | 'post_deleted' | 'new_comment' | 'new_reaction';
  postId: string;
  data?: Record<string, unknown>;
}

export interface ConnectionUpdate {
  type: 'request_received' | 'request_accepted' | 'connection_removed';
  userId: string;
  data?: Record<string, unknown>;
}

// Socket event types - aligned with server contract
export type SocketEventType = 
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'authenticated'
  | 'message:new'
  | 'message:sent'
  | 'message:updated'
  | 'message:deleted'
  | 'message:read'
  | 'message:delivered'
  | 'message:typing'
  | 'presence:update'
  | 'notification:new'
  | 'feed:update'
  | 'connection:update'
  | 'job:application'
  | 'job:status-change'
  | 'mentorship:request'
  | 'mentorship:session-reminder';

// Event handlers map
type EventHandler<T = unknown> = (data: T) => void;
type EventHandlers = Map<SocketEventType, Set<EventHandler>>;

class SocketService extends EventEmitter {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private eventHandlers: EventHandlers = new Map();
  private pendingMessages: Array<{ event: string; data: unknown }> = [];
  private isConnected: boolean = false;
  private userId: string | null = null;

  private constructor() {
    super();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialize socket connection
   */
  public connect(token: string): void {
    if (this.socket?.connected) {
      if (process.env.NODE_ENV === 'development') console.log('Socket already connected');
      return;
    }

    this.token = token;
    this.initializeSocket();
  }

  /**
   * Initialize socket with auth
   */
  private initializeSocket(): void {
    this.socket = io(SOCKET_URL, {
      auth: {
        token: this.token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 10000
    });

    this.setupEventListeners();
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      if (process.env.NODE_ENV === 'development') console.log('Socket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connect');
      this.flushPendingMessages();
    });

    this.socket.on('disconnect', (reason: string) => {
      if (process.env.NODE_ENV === 'development') console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnect', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;
      this.emit('error', error);
    });

    // Authentication
    this.socket.on('authenticated', (data: { userId: string }) => {
      if (process.env.NODE_ENV === 'development') console.log('Socket authenticated:', data.userId);
      this.userId = data.userId;
      this.emit('authenticated', data);
    });

    // Messages
    this.socket.on('message:new', (message: SocketMessage) => {
      const normalized: SocketMessage = {
        ...message,
        type: message.type || message.messageType || 'text',
        messageType: message.messageType || message.type || 'text',
      };
      this.emit('message:new', normalized);
    });

    this.socket.on('message:sent', (data: { clientId: string; messageId: string; timestamp: string }) => {
      this.emit('message:sent', data);
    });

    this.socket.on('message:updated', (message: SocketMessage) => {
      const normalized: SocketMessage = {
        ...message,
        type: message.type || message.messageType || 'text',
        messageType: message.messageType || message.type || 'text',
      };
      this.emit('message:updated', normalized);
    });

    this.socket.on('message:deleted', (data: { messageId: string; conversationId: string }) => {
      this.emit('message:deleted', data);
    });

    this.socket.on('message:read', (data: { conversationId: string; userId: string; messageIds: string[] }) => {
      this.emit('message:read', data);
    });

    // Typing indicators - server uses message:typing with isTyping boolean
    this.socket.on('message:typing', (data: TypingIndicator) => {
      if (data.isTyping) {
        this.emit('message:typing', data);
      } else {
        this.emit('message:typing', { ...data, isTyping: false });
      }
    });

    // Message delivered confirmation
    this.socket.on('message:delivered', (data: { messageId: string }) => {
      this.emit('message:delivered', data);
    });

    // Presence
    this.socket.on('presence:update', (data: PresenceUpdate) => {
      this.emit('presence:update', data);
    });

    // Notifications
    this.socket.on('notification:new', (notification: Notification) => {
      this.emit('notification:new', notification);
    });

    // Feed updates
    this.socket.on('feed:update', (update: FeedUpdate) => {
      this.emit('feed:update', update);
    });

    // Connection updates
    this.socket.on('connection:update', (update: ConnectionUpdate) => {
      this.emit('connection:update', update);
    });
  }

  /**
   * Disconnect socket
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.userId = null;
      this.token = null;
    }
  }

  /**
   * Check if connected
   */
  public get connected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get socket ID
   */
  public get socketId(): string | undefined {
    return this.socket?.id;
  }

  // ==================== Message Methods ====================

  /**
   * Send a message
   */
  public sendMessage(
    conversationId: string,
    content: string,
    type: SocketMessage['type'] = 'text',
    replyTo?: string,
    clientId?: string
  ): void {
    this.emitEvent('message:send', {
      conversationId,
      content,
      messageType: type,
      clientId,
    });
  }

  /**
   * Edit a message
   */
  public editMessage(messageId: string, content: string): void {
    this.emitEvent('message:edit', { messageId, content });
  }

  /**
   * Delete a message
   */
  public deleteMessage(messageId: string): void {
    this.emitEvent('message:delete', { messageId });
  }

  /**
   * Mark messages as read - aligned with server event name
   */
  public markAsRead(conversationId: string, messageIds: string[]): void {
    this.emitEvent('message:read', { conversationId, messageIds });
  }

  // ==================== Typing Methods ====================

  /**
   * Start typing indicator - uses server's message:typing event
   */
  public startTyping(conversationId: string): void {
    this.emitEvent('message:typing', { conversationId, isTyping: true });
  }

  /**
   * Stop typing indicator - uses server's message:typing event
   */
  public stopTyping(conversationId: string): void {
    this.emitEvent('message:typing', { conversationId, isTyping: false });
  }

  /**
   * Send typing indicator (combined method for convenience)
   */
  public sendTyping(conversationId: string, isTyping: boolean): void {
    this.emitEvent('message:typing', { conversationId, isTyping });
  }

  // ==================== Presence Methods ====================

  /**
   * Update presence status
   */
  public updatePresence(status: PresenceUpdate['status']): void {
    this.emitEvent('presence:update', status);
  }

  /**
   * Subscribe to user presence
   */
  public subscribeToPresence(userIds: string[]): void {
    this.emitEvent('presence:subscribe', { userIds });
  }

  /**
   * Unsubscribe from user presence
   */
  public unsubscribeFromPresence(userIds: string[]): void {
    this.emitEvent('presence:unsubscribe', { userIds });
  }

  // ==================== Room Methods ====================

  /**
   * Join a conversation room
   */
  public joinConversation(conversationId: string): void {
    this.emitEvent('conversation:join', conversationId);
  }

  /**
   * Leave a conversation room
   */
  public leaveConversation(conversationId: string): void {
    this.emitEvent('conversation:leave', conversationId);
  }

  /**
   * Join a group room
   */
  public joinGroup(groupId: string): void {
    this.emitEvent('group:join', { groupId });
  }

  /**
   * Leave a group room
   */
  public leaveGroup(groupId: string): void {
    this.emitEvent('group:leave', { groupId });
  }

  // ==================== Feed Methods ====================

  /**
   * Subscribe to feed updates
   */
  public subscribeFeed(): void {
    this.emitEvent('feed:subscribe', {});
  }

  /**
   * Unsubscribe from feed updates
   */
  public unsubscribeFeed(): void {
    this.emitEvent('feed:unsubscribe', {});
  }

  // ==================== Internal Methods ====================

  /**
   * Emit event with offline queuing
   */
  private emitEvent(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      // Queue for later
      this.pendingMessages.push({ event, data });
    }
  }

  /**
   * Flush pending messages after reconnect
   */
  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message && this.socket?.connected) {
        this.socket.emit(message.event, message.data);
      }
    }
  }

  /**
   * Add event listener with type safety
   */
  public addEventListener<T>(
    event: SocketEventType,
    handler: EventHandler<T>
  ): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as EventHandler);

    // Also add to EventEmitter
    this.on(event, handler);

    // Return cleanup function
    return () => {
      this.eventHandlers.get(event)?.delete(handler as EventHandler);
      this.off(event, handler);
    };
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance();

// Export for testing
export { SocketService };
