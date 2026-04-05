/**
 * Socket.io Service for Real-Time Features
 *
 * Handles:
 * - Real-time messaging
 * - Typing indicators
 * - Presence (online/offline status)
 * - Read receipts
 * - Notifications
 * - Feed updates
 */

// @ts-ignore - socket.io-client types may not be installed
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, Socket } from 'socket.io-client';
import EventEmitter from 'eventemitter3';

// Type definitions for socket events
interface AuthenticatedData {
  userId: string;
  [key: string]: unknown;
}

interface SocketError {
  message: string;
  code?: string;
  [key: string]: unknown;
}

interface MessageData {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  [key: string]: unknown;
}

interface MessageConfirmation {
  tempId: string;
  messageId: string;
  timestamp: string;
}

interface DeliveryReceipt {
  messageId: string;
  conversationId: string;
  deliveredAt: string;
}

interface ReadReceipt {
  messageId: string;
  conversationId: string;
  userId: string;
  readAt: string;
}

interface TypingData {
  conversationId: string;
  userId: string;
  userName?: string;
}

interface PresenceEvent {
  userId: string;
  lastSeen?: string;
}

interface ConversationData {
  conversationId: string;
  participants: string[];
}

interface PostData {
  id: string;
  authorId: string;
  content: string;
  [key: string]: unknown;
}

interface ReactionData {
  postId: string;
  userId: string;
  type: string;
}

interface CommentData {
  postId: string;
  commentId: string;
  authorId: string;
  content: string;
}

interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  [key: string]: unknown;
}

interface ConnectionRequestData {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: string;
}

interface ConnectionAcceptedData {
  connectionId: string;
  userId: string;
}

// API base URL - aligned with API server port
const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333';
const ACCESS_TOKEN_KEY = '@ngurra_auth_token';

// Message types - aligned with server's colon-separated event naming convention
export const MESSAGE_TYPES = {
  // Client -> Server (aligned with server)
  AUTHENTICATE: 'authenticate', // Note: Server uses JWT handshake auth, not event
  SEND_MESSAGE: 'message:send',
  TYPING: 'message:typing', // Combined typing event with isTyping boolean
  MARK_READ: 'message:read',
  JOIN_CONVERSATION: 'conversation:join',
  LEAVE_CONVERSATION: 'conversation:leave',
  PRESENCE_UPDATE: 'presence:update',
  NOTIFICATION_READ: 'notification:read',

  // Server -> Client (aligned with server)
  AUTHENTICATED: 'authenticated',
  AUTH_ERROR: 'auth_error',
  NEW_MESSAGE: 'message:new',
  MESSAGE_SENT: 'message:sent', // Server confirmation with messageId
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  USER_TYPING: 'message:typing', // Server broadcasts typing with userId
  PRESENCE_CHANGE: 'presence:update',
  CONVERSATION_JOINED: 'conversation:joined',
  ERROR: 'error',

  // Feed events
  FEED_UPDATE: 'feed:update',

  // Notification events
  NEW_NOTIFICATION: 'notification:new',

  // Job events
  JOB_APPLICATION: 'job:application',
  JOB_STATUS_CHANGE: 'job:status-change',

  // Mentorship events
  MENTORSHIP_REQUEST: 'mentorship:request',
  MENTORSHIP_SESSION_REMINDER: 'mentorship:session-reminder',

  // Connection events
  CONNECTION_UPDATE: 'connection:update',
};

// Connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error',
}

// Types
interface QueuedMessage {
  event: string;
  data: any;
  timestamp: number;
}

interface PresenceData {
  online: boolean;
  lastSeen: Date | null;
}

// Event emitter for broadcasting socket events
class SocketEventEmitter extends EventEmitter {}

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private messageQueue: QueuedMessage[] = [];
  private typingTimers: Map<string, NodeJS.Timeout> = new Map();
  private presenceCache: Map<string, PresenceData> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private currentConversationId: string | null = null;

  public events: SocketEventEmitter;

  private constructor() {
    this.events = new SocketEventEmitter();
  }

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Check if connected and authenticated
   */
  isConnected(): boolean {
    return this.connectionState === ConnectionState.AUTHENTICATED;
  }

  /**
   * Connect to Socket.io server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('[Socket] Already connected');
      return;
    }

    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      const error = new Error('Authentication token not available');
      this.connectionState = ConnectionState.ERROR;
      this.events.emit('stateChange', this.connectionState);
      this.events.emit('authError', {
        message: error.message,
        code: 'AUTH_TOKEN_MISSING',
      });
      throw error;
    }

    return new Promise((resolve, reject) => {
      this.connectionState = ConnectionState.CONNECTING;
      this.events.emit('stateChange', this.connectionState);

      this.socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 10000,
      });

      // Connection established
      this.socket.on('connect', () => {
        console.log('[Socket] Connected');
        this.connectionState = ConnectionState.CONNECTED;
        this.reconnectAttempts = 0;
        this.events.emit('stateChange', this.connectionState);
        this.startHeartbeat();
      });

      // Authentication success
      this.socket.on(MESSAGE_TYPES.AUTHENTICATED, (data: AuthenticatedData) => {
        console.log('[Socket] Authenticated', data);
        this.connectionState = ConnectionState.AUTHENTICATED;
        this.events.emit('stateChange', this.connectionState);
        this.flushMessageQueue();
        resolve();
      });

      // Authentication error
      this.socket.on(MESSAGE_TYPES.AUTH_ERROR, (error: SocketError) => {
        console.error('[Socket] Auth error:', error);
        this.connectionState = ConnectionState.ERROR;
        this.events.emit('stateChange', this.connectionState);
        this.events.emit('authError', error);
        reject(new Error(error.message || 'Authentication failed'));
      });

      // Disconnection
      this.socket.on('disconnect', (reason: string) => {
        console.log('[Socket] Disconnected:', reason);
        this.connectionState = ConnectionState.DISCONNECTED;
        this.events.emit('stateChange', this.connectionState);
        this.stopHeartbeat();

        if (reason === 'io server disconnect') {
          // Server disconnected us, try to reconnect
          this.socket?.connect();
        }
      });

      // Connection error
      this.socket.on('connect_error', (error: Error) => {
        console.error('[Socket] Connection error:', error.message);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.connectionState = ConnectionState.ERROR;
          this.events.emit('stateChange', this.connectionState);
          this.events.emit('maxReconnectFailed');
          reject(new Error('Max reconnection attempts reached'));
        }
      });

      // Set up message handlers
      this.setupMessageHandlers();
    });
  }

  /**
   * Set up handlers for incoming messages - aligned with server event names
   */
  private setupMessageHandlers() {
    if (!this.socket) return;

    // New message received
    this.socket.on(MESSAGE_TYPES.NEW_MESSAGE, (message: MessageData) => {
      this.events.emit('newMessage', message);
    });

    // Message sent confirmation
    this.socket.on(MESSAGE_TYPES.MESSAGE_SENT, (data: MessageConfirmation) => {
      this.events.emit('messageSent', data);
    });

    // Message delivered
    this.socket.on(MESSAGE_TYPES.MESSAGE_DELIVERED, (data: DeliveryReceipt) => {
      this.events.emit('messageDelivered', data);
    });

    // Message read
    this.socket.on(MESSAGE_TYPES.MESSAGE_READ, (data: ReadReceipt) => {
      this.events.emit('messageRead', data);
    });

    // Typing indicator - unified event with isTyping boolean
    this.socket.on(MESSAGE_TYPES.USER_TYPING, (data: TypingData & { isTyping?: boolean }) => {
      if (data.isTyping === false) {
        this.events.emit('userStoppedTyping', data);
      } else {
        this.events.emit('userTyping', data);
      }
    });

    // Presence updates - unified event
    this.socket.on(MESSAGE_TYPES.PRESENCE_CHANGE, (data: PresenceEvent & { status?: string }) => {
      const isOnline = data.status === 'online';
      this.presenceCache.set(data.userId, {
        online: isOnline,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : new Date(),
      });
      if (isOnline) {
        this.events.emit('userOnline', data);
      } else {
        this.events.emit('userOffline', data);
      }
    });

    // Conversation joined
    this.socket.on(MESSAGE_TYPES.CONVERSATION_JOINED, (data: ConversationData) => {
      this.events.emit('conversationJoined', data);
    });

    // Error
    this.socket.on(MESSAGE_TYPES.ERROR, (error: SocketError) => {
      console.error('[Socket] Error:', error);
      this.events.emit('error', error);
    });

    // Feed events - unified feed:update event
    this.socket.on(
      MESSAGE_TYPES.FEED_UPDATE,
      (data: { type: string; postId?: string; data?: unknown }) => {
        switch (data.type) {
          case 'new_post':
            this.events.emit('newPost', data);
            break;
          case 'post_updated':
            this.events.emit('postUpdated', data);
            break;
          case 'new_reaction':
            this.events.emit('newReaction', data);
            break;
          case 'new_comment':
            this.events.emit('newComment', data);
            break;
        }
      }
    );

    // Notification events
    this.socket.on(MESSAGE_TYPES.NEW_NOTIFICATION, (notification: NotificationData) => {
      this.events.emit('newNotification', notification);
    });

    // Job events
    this.socket.on(MESSAGE_TYPES.JOB_APPLICATION, (data: unknown) => {
      this.events.emit('jobApplication', data);
    });

    this.socket.on(MESSAGE_TYPES.JOB_STATUS_CHANGE, (data: unknown) => {
      this.events.emit('jobStatusChange', data);
    });

    // Mentorship events
    this.socket.on(MESSAGE_TYPES.MENTORSHIP_REQUEST, (data: unknown) => {
      this.events.emit('mentorshipRequest', data);
    });

    this.socket.on(MESSAGE_TYPES.MENTORSHIP_SESSION_REMINDER, (data: unknown) => {
      this.events.emit('mentorshipSessionReminder', data);
    });

    // Connection events
    this.socket.on(MESSAGE_TYPES.CONNECTION_UPDATE, (data: { type: string; userId?: string }) => {
      if (data.type === 'request_received') {
        this.events.emit('connectionRequest', data);
      } else if (data.type === 'request_accepted') {
        this.events.emit('connectionAccepted', data);
      }
    });
  }

  /**
   * Start heartbeat to keep connection alive
   * Note: Socket.io has built-in ping/pong (pingInterval/pingTimeout),
   * but we keep this for application-level activity tracking
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    // Socket.io handles low-level ping/pong automatically
    // This is for app-level presence refresh if needed
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        // Emit presence update instead of custom ping
        this.emit(MESSAGE_TYPES.PRESENCE_UPDATE, { status: 'online' });
      }
    }, 60000); // Every 60 seconds - less frequent since Socket.io handles keepalive
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.socket?.connected) {
        this.socket.emit(message.event, message.data);
      }
    }
  }

  /**
   * Emit an event, queue if not connected
   */
  emit(event: string, data: any): void {
    if (this.socket?.connected && this.connectionState === ConnectionState.AUTHENTICATED) {
      this.socket.emit(event, data);
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push({
        event,
        data,
        timestamp: Date.now(),
      });

      // Limit queue size
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift();
      }
    }
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    this.currentConversationId = conversationId;
    this.emit(MESSAGE_TYPES.JOIN_CONVERSATION, { conversationId });
  }

  /**
   * Leave current conversation room
   */
  leaveConversation(): void {
    if (this.currentConversationId) {
      this.emit(MESSAGE_TYPES.LEAVE_CONVERSATION, { conversationId: this.currentConversationId });
      this.currentConversationId = null;
    }
  }

  /**
   * Send a message
   */
  sendMessage(conversationId: string, content: string, type: string = 'text'): void {
    this.emit(MESSAGE_TYPES.SEND_MESSAGE, {
      conversationId,
      content,
      type,
      clientId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  }

  /**
   * Start typing indicator - uses unified message:typing event
   */
  startTyping(conversationId: string): void {
    // Clear existing timer for this conversation
    const existingTimer = this.typingTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.emit(MESSAGE_TYPES.TYPING, { conversationId, isTyping: true });

    // Auto-stop after 5 seconds
    const timer = setTimeout(() => {
      this.stopTyping(conversationId);
    }, 5000);

    this.typingTimers.set(conversationId, timer);
  }

  /**
   * Stop typing indicator - uses unified message:typing event
   */
  stopTyping(conversationId: string): void {
    const timer = this.typingTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(conversationId);
    }

    this.emit(MESSAGE_TYPES.TYPING, { conversationId, isTyping: false });
  }

  /**
   * Mark messages as read
   */
  markRead(conversationId: string, messageIds: string[]): void {
    this.emit(MESSAGE_TYPES.MARK_READ, { conversationId, messageIds });
  }

  /**
   * Get presence status for a user
   */
  getPresence(userId: string): PresenceData | null {
    return this.presenceCache.get(userId) || null;
  }

  /**
   * Get multiple presence statuses
   */
  getMultiplePresence(userIds: string[]): Map<string, PresenceData> {
    const result = new Map<string, PresenceData>();
    for (const userId of userIds) {
      const presence = this.presenceCache.get(userId);
      if (presence) {
        result.set(userId, presence);
      }
    }
    return result;
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.leaveConversation();

    // Clear all typing timers
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = ConnectionState.DISCONNECTED;
    this.events.emit('stateChange', this.connectionState);
  }

  /**
   * Reconnect with new token
   */
  async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }
}

// Export singleton instance
export const socketService = SocketService.getInstance();
export default socketService;
