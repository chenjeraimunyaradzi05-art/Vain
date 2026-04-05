/**
 * Socket.io Server Setup
 * 
 * Real-time communication layer for the API.
 * Provides:
 * - Real-time messaging
 * - Live notifications
 * - Presence tracking
 * - Typing indicators
 * - Job/Mentorship event notifications
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { logger } from './logger';
import { prisma } from '../db';

// Types
interface AuthenticatedSocket extends Socket {
  userId: string;
  userType: string;
}

interface TypingData {
  conversationId: string;
  isTyping: boolean;
}

interface MessageData {
  conversationId: string;
  content: string;
  messageType?: string;
  clientId?: string; // For optimistic UI confirmation
}

interface PresenceData {
  userId: string;
  status: 'online' | 'offline' | 'idle';
  timestamp: Date;
}

// Socket server instance
let io: Server | null = null;

// Connection tracking
const connectedUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

// Metrics tracking
const socketMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  messagesReceived: 0,
  messagesSent: 0,
  errors: 0,
  lastResetTime: new Date(),
};

/**
 * Initialize Socket.io server with Redis adapter for scaling
 */
export function setupSocket(httpServer: HttpServer): Server {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || frontendUrl)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Setup Redis adapter for horizontal scaling (optional)
  setupRedisAdapter();

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', handleConnection);

  logger.info('🔌 Socket.io server initialized');

  return io;
}

/**
 * Setup Redis adapter for multi-instance scaling
 */
async function setupRedisAdapter(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl || !io) {
    logger.info('⚠️ Redis adapter not configured - using in-memory only');
    return;
  }

  try {
    const pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        pubClient.on('ready', resolve);
        pubClient.on('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        subClient.on('ready', resolve);
        subClient.on('error', reject);
      }),
    ]);

    io.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.io Redis adapter connected');
  } catch (error) {
    logger.warn('⚠️ Redis adapter failed, using in-memory fallback:', error);
  }
}

/**
 * JWT authentication middleware for sockets
 */
function authenticateSocket(socket: Socket, next: (err?: Error) => void): void {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new Error('Authentication error: JWT not configured'));
    }

    const payload = jwt.verify(token, jwtSecret) as { id: string; userType?: string };
    (socket as AuthenticatedSocket).userId = payload.id;
    (socket as AuthenticatedSocket).userType = payload.userType || 'MEMBER';
    next();
  } catch (error) {
    logger.warn('Socket auth failed:', error);
    next(new Error('Authentication error: Invalid token'));
  }
}

/**
 * Handle new socket connection
 */
function handleConnection(socket: Socket): void {
  const authSocket = socket as AuthenticatedSocket;
  const userId = authSocket.userId;

  // Update metrics
  socketMetrics.totalConnections++;
  socketMetrics.activeConnections++;

  logger.info(`User ${userId} connected via socket ${socket.id}`);

  // Track connection
  if (!connectedUsers.has(userId)) {
    connectedUsers.set(userId, new Set());
  }
  connectedUsers.get(userId)!.add(socket.id);

  // Join user-specific room
  socket.join(`user:${userId}`);

  // Emit authenticated event
  socket.emit('authenticated', { userId });

  // Broadcast presence update
  broadcastPresence(userId, 'online');

  // Setup event handlers
  setupEventHandlers(authSocket);

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    handleDisconnect(authSocket, reason);
  });
}

/**
 * Setup all event handlers for a socket
 */
function setupEventHandlers(socket: AuthenticatedSocket): void {
  const userId = socket.userId;

  // ==================== Messaging Events ====================

  // Join a conversation room
  socket.on('conversation:join', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    logger.debug(`User ${userId} joined conversation ${conversationId}`);
  });

  // Leave a conversation room
  socket.on('conversation:leave', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
    logger.debug(`User ${userId} left conversation ${conversationId}`);
  });

  // Typing indicator
  socket.on('message:typing', (data: TypingData) => {
    socket.to(`conversation:${data.conversationId}`).emit('message:typing', {
      userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  });

  // Send message (optional - can also use REST API)
  socket.on('message:send', async (data: MessageData) => {
    socketMetrics.messagesReceived++;
    try {
      // Persist message to database
      const message = await prisma.directMessage.create({
        data: {
          conversationId: data.conversationId,
          senderId: userId,
          content: data.content,
          messageType: data.messageType || 'text',
        },
      });

      // Broadcast to conversation room
      io?.to(`conversation:${data.conversationId}`).emit('message:new', {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        content: message.content,
        messageType: message.messageType,
        createdAt: message.createdAt,
        clientId: data.clientId, // Include clientId for optimistic UI matching
      });
      socketMetrics.messagesSent++;

      // Send confirmation to sender with clientId for optimistic UI
      if (data.clientId) {
        socket.emit('message:sent', { 
          clientId: data.clientId, 
          messageId: message.id,
          timestamp: message.createdAt.toISOString(),
        });
      }

      // Send delivery confirmation to sender
      socket.emit('message:delivered', { messageId: message.id });

      // Notify other participants
      await notifyConversationParticipants(data.conversationId, userId, message);
    } catch (error) {
      socketMetrics.errors++;
      logger.error('Failed to send message:', error);
      socket.emit('error', { message: 'Failed to send message', clientId: data.clientId });
    }
  });

  // Mark messages as read
  socket.on('message:read', async (data: { conversationId: string; messageIds: string[] }) => {
    try {
      await prisma.directMessage.updateMany({
        where: {
          id: { in: data.messageIds },
          conversationId: data.conversationId,
        },
        data: {
          // Update readBy field (would need JSON handling in real implementation)
        },
      });

      socket.to(`conversation:${data.conversationId}`).emit('message:read', {
        conversationId: data.conversationId,
        userId,
        messageIds: data.messageIds,
      });
    } catch (error) {
      logger.error('Failed to mark messages as read:', error);
    }
  });

  // ==================== Presence Events ====================

  // Update presence status
  socket.on('presence:update', (status: 'online' | 'idle' | 'offline') => {
    broadcastPresence(userId, status);
  });

  // ==================== Notification Events ====================

  // Mark notification as read
  socket.on('notification:read', async (notificationId: string) => {
    try {
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true },
      });
    } catch (error) {
      socketMetrics.errors++;
      logger.error('Failed to mark notification as read:', error);
    }
  });
}

/**
 * Handle socket disconnection
 */
function handleDisconnect(socket: AuthenticatedSocket, reason: string): void {
  const userId = socket.userId;

  // Update metrics
  socketMetrics.activeConnections--;

  logger.info(`User ${userId} disconnected: ${reason}`);

  // Remove from tracking
  const userSockets = connectedUsers.get(userId);
  if (userSockets) {
    userSockets.delete(socket.id);
    if (userSockets.size === 0) {
      connectedUsers.delete(userId);
      // Only broadcast offline if no more connections
      broadcastPresence(userId, 'offline');
    }
  }
}

/**
 * Broadcast presence update
 */
function broadcastPresence(userId: string, status: 'online' | 'offline' | 'idle'): void {
  const presenceData: PresenceData = {
    userId,
    status,
    timestamp: new Date(),
  };

  io?.emit('presence:update', presenceData);
}

/**
 * Notify conversation participants about new message
 */
async function notifyConversationParticipants(
  conversationId: string,
  senderId: string,
  message: any
): Promise<void> {
  try {
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
        userId: { not: senderId },
        hasLeft: false,
      },
    });

    for (const participant of participants) {
      // Create notification
      await prisma.notification.create({
        data: {
          userId: participant.userId,
          title: 'New Message',
          message: message.content.substring(0, 100),
          type: 'message',
          link: `/messages/${conversationId}`,
        },
      });

      // Emit to user room
      io?.to(`user:${participant.userId}`).emit('notification:new', {
        type: 'message',
        title: 'New Message',
        message: message.content.substring(0, 100),
        conversationId,
      });
    }
  } catch (error) {
    logger.error('Failed to notify participants:', error);
  }
}

// ==================== Public API for emitting events ====================

/**
 * Emit notification to a specific user
 */
export function emitNotification(userId: string, notification: {
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
}): void {
  io?.to(`user:${userId}`).emit('notification:new', notification);
}

/**
 * Emit job application event to employer
 */
export function emitJobApplication(employerId: string, data: {
  jobId: string;
  jobTitle: string;
  applicantName: string;
  applicantId: string;
  appliedAt: Date;
}): void {
  io?.to(`user:${employerId}`).emit('job:application', data);
  
  // Also emit as notification
  emitNotification(employerId, {
    type: 'job_applied',
    title: '✨ New Application Received',
    message: `${data.applicantName} applied for ${data.jobTitle}`,
    data,
    actionUrl: `/company/jobs/${data.jobId}/applications`,
  });
}

/**
 * Emit job status change to applicant
 */
export function emitJobStatusChange(applicantId: string, data: {
  applicationId: string;
  jobTitle: string;
  oldStatus: string;
  newStatus: string;
}): void {
  io?.to(`user:${applicantId}`).emit('job:status-change', data);
  
  emitNotification(applicantId, {
    type: 'application_status',
    title: '📊 Application Status Updated',
    message: `Your application for ${data.jobTitle} is now ${data.newStatus}`,
    data,
    actionUrl: `/member/applications/${data.applicationId}`,
  });
}

/**
 * Emit mentorship request to mentor
 */
export function emitMentorshipRequest(mentorId: string, data: {
  requestId: string;
  menteeName: string;
  menteeId: string;
  message?: string;
}): void {
  io?.to(`user:${mentorId}`).emit('mentorship:request', data);
  
  emitNotification(mentorId, {
    type: 'mentorship_request',
    title: '🤝 Mentorship Request',
    message: `${data.menteeName} would like you to be their mentor`,
    data,
    actionUrl: `/mentor/requests/${data.requestId}`,
  });
}

/**
 * Emit session reminder to both mentor and mentee
 */
export function emitSessionReminder(userIds: string[], data: {
  sessionId: string;
  sessionTime: Date;
  partnerName: string;
  minutesUntilStart: number;
}): void {
  for (const userId of userIds) {
    io?.to(`user:${userId}`).emit('mentorship:session-reminder', data);
    
    emitNotification(userId, {
      type: 'mentorship_session_reminder',
      title: '📅 Upcoming Session',
      message: `Session with ${data.partnerName} starts in ${data.minutesUntilStart} minutes`,
      data,
      actionUrl: `/mentorship/sessions/${data.sessionId}`,
    });
  }
}

/**
 * Check if a user is currently online
 */
export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.size > 0;
}

/**
 * Get count of connected users
 */
export function getConnectedUserCount(): number {
  return connectedUsers.size;
}

/**
 * Get Socket.io metrics for observability
 */
export function getSocketMetrics(): {
  totalConnections: number;
  activeConnections: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  connectedUsers: number;
  uptime: number;
} {
  return {
    ...socketMetrics,
    connectedUsers: connectedUsers.size,
    uptime: Date.now() - socketMetrics.lastResetTime.getTime(),
  };
}

/**
 * Reset socket metrics (for testing or periodic resets)
 */
export function resetSocketMetrics(): void {
  socketMetrics.totalConnections = 0;
  socketMetrics.messagesReceived = 0;
  socketMetrics.messagesSent = 0;
  socketMetrics.errors = 0;
  socketMetrics.lastResetTime = new Date();
}

/**
 * Get the Socket.io server instance
 */
export function getIO(): Server | null {
  return io;
}

export default {
  setupSocket,
  emitNotification,
  emitJobApplication,
  emitJobStatusChange,
  emitMentorshipRequest,
  emitSessionReminder,
  isUserOnline,
  getConnectedUserCount,
  getSocketMetrics,
  resetSocketMetrics,
  getIO,
};
