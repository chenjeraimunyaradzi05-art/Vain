// @ts-nocheck
/**
 * Live Messaging API Routes
 * 
 * REST API endpoints for real-time messaging
 * WebSocket connections handled separately in server setup
 * 
 * Endpoints:
 * - GET /live-messages/conversations/:id/messages - Get messages with pagination
 * - GET /live-messages/unread - Get unread message counts
 * - GET /live-messages/presence - Get presence for users
 * - POST /live-messages/conversations/:id/read - Mark messages as read
 * - GET /live-messages/config - Get WebSocket connection config
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import { prisma } from '../db';
import {
  getConversationMessages,
  markMessagesRead,
  getUnreadCounts,
  getMultiplePresence,
  messagingManager,
  MESSAGE_TYPES
} from '../lib/liveMessaging';

const router = express.Router();

/**
 * Middleware to verify conversation access
 */
async function verifyConversationAccess(req, res, next) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
        hasLeft: false
      }
    });

    if (!participant) {
      return void res.status(403).json({ error: 'Not a participant of this conversation' });
    }

    req.participant = participant;
    next();
  } catch (err) {
    console.error('Conversation access verification error:', err);
    res.status(500).json({ error: 'Failed to verify conversation access' });
  }
}

/**
 * GET /live-messages/config
 * Get WebSocket connection configuration
 */
router.get('/config', authenticateJWT, (req, res) => {
  const wsProtocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws';
  const wsHost = process.env.WS_HOST || process.env.API_HOST || 'localhost:3001';
  
  res.json({
    websocketUrl: `${wsProtocol}://${wsHost}/ws/messages`,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    messageTypes: MESSAGE_TYPES
  });
});

/**
 * GET /live-messages/unread
 * Get total unread message count and by conversation
 */
router.get('/unread', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const unread = await getUnreadCounts(userId);

    res.json(unread);
  } catch (err) {
    console.error('Get unread counts error:', err);
    res.status(500).json({ error: 'Failed to get unread counts' });
  }
});

/**
 * GET /live-messages/presence
 * Get online status for specified users
 */
router.get('/presence', authenticateJWT, async (req, res) => {
  try {
    const { userIds } = req.query;
    
    if (!userIds) {
      return void res.status(400).json({ error: 'userIds query parameter required' });
    }

    const ids = Array.isArray(userIds) ? userIds : userIds.split(',');
    const presence = getMultiplePresence(ids);

    res.json({ presence });
  } catch (err) {
    console.error('Get presence error:', err);
    res.status(500).json({ error: 'Failed to get presence' });
  }
});

/**
 * GET /live-messages/conversations/:conversationId/messages
 * Get messages from a conversation with pagination
 */
router.get(
  '/conversations/:conversationId/messages',
  authenticateJWT,
  verifyConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { limit = 50, before, after } = req.query;

      const result = await getConversationMessages(conversationId, {
        limit: Math.min(100, Number(limit)),
        before,
        after
      });

      res.json(result);
    } catch (err) {
      console.error('Get messages error:', err);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }
);

/**
 * POST /live-messages/conversations/:conversationId/read
 * Mark messages as read
 */
router.post(
  '/conversations/:conversationId/read',
  authenticateJWT,
  verifyConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { messageIds } = req.body;
      const userId = req.user.id;

      const count = await markMessagesRead(
        conversationId,
        userId,
        Array.isArray(messageIds) ? messageIds : []
      );

      // Notify others via WebSocket
      messagingManager.sendToConversation(conversationId, {
        type: MESSAGE_TYPES.MESSAGE_READ,
        conversationId,
        readBy: userId,
        readAt: new Date().toISOString()
      }, userId);

      res.json({ 
        success: true, 
        markedRead: count 
      });
    } catch (err) {
      console.error('Mark read error:', err);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  }
);

/**
 * GET /live-messages/conversations/:conversationId/online
 * Get online participants in a conversation
 */
router.get(
  '/conversations/:conversationId/online',
  authenticateJWT,
  verifyConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const online = await messagingManager.getOnlineParticipants(conversationId);

      res.json({ 
        conversationId,
        onlineParticipants: online,
        count: online.length
      });
    } catch (err) {
      console.error('Get online participants error:', err);
      res.status(500).json({ error: 'Failed to get online participants' });
    }
  }
);

/**
 * GET /live-messages/conversations/:conversationId/typing
 * Get users currently typing in a conversation
 */
router.get(
  '/conversations/:conversationId/typing',
  authenticateJWT,
  verifyConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      // Get all typing status keys for this conversation
      const typingUsers = [];
      // @ts-ignore
      for (const [key] of messagingManager.typingStatus) {
        if (key.startsWith(`${conversationId}:`)) {
          const typingUserId = key.split(':')[1];
          if (typingUserId !== userId) {
            typingUsers.push(typingUserId);
          }
        }
      }

      res.json({
        conversationId,
        typingUsers
      });
    } catch (err) {
      console.error('Get typing status error:', err);
      res.status(500).json({ error: 'Failed to get typing status' });
    }
  }
);

/**
 * POST /live-messages/conversations/:conversationId/send
 * Send a message (REST fallback when WebSocket unavailable)
 */
router.post(
  '/conversations/:conversationId/send',
  authenticateJWT,
  verifyConversationAccess,
  async (req, res) => {
    try {
      const { conversationId } = req.params;
      const { content, messageType = 'TEXT', attachments = [] } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return void res.status(400).json({ error: 'Message content required' });
      }

      // Import createMessage
      const { createMessage } = require('../lib/liveMessaging');
      
      const message = await createMessage(conversationId, userId, {
        content: content.trim(),
        messageType,
        attachments
      });

      // Broadcast to other participants via WebSocket
      messagingManager.sendToConversation(conversationId, {
        type: MESSAGE_TYPES.NEW_MESSAGE,
        message
      }, userId);

      res.status(201).json({ message });
    } catch (err) {
      console.error('Send message error:', err);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

/**
 * GET /live-messages/stats
 * Get messaging statistics for the user
 */
router.get('/stats', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get conversation count
    const conversationCount = await prisma.conversationParticipant.count({
      where: { userId, hasLeft: false }
    });

    // Get total messages sent
    const messagesSent = await prisma.message.count({
      where: { senderId: userId }
    });

    // Get unread count
    const unread = await getUnreadCounts(userId);

    // Get active conversations (messages in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const activeConversations = await prisma.conversation.count({
      where: {
        participants: {
          some: { userId, hasLeft: false }
        },
        messages: {
          some: { createdAt: { gte: weekAgo } }
        }
      }
    });

    res.json({
      conversationCount,
      activeConversations,
      messagesSent,
      unreadTotal: unread.total,
      unreadByConversation: unread.byConversation
    });
  } catch (err) {
    console.error('Get messaging stats error:', err);
    res.status(500).json({ error: 'Failed to get messaging stats' });
  }
});

export default router;



