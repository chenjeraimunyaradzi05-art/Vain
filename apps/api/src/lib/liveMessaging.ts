// @ts-nocheck
/**
 * Live Messaging Library
 * 
 * Real-time WebSocket-based messaging for:
 * - Mentorship conversations
 * - Employer-candidate communication
 * - Support chat
 * 
 * Features:
 * - Presence tracking (online/offline/typing)
 * - Read receipts
 * - Message delivery confirmation
 * - Typing indicators
 * - Connection management
 */

import { prisma } from '../db';

/**
 * Message types for WebSocket protocol
 */
const MESSAGE_TYPES = {
  // Client -> Server
  AUTHENTICATE: 'authenticate',
  SEND_MESSAGE: 'send_message',
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  MARK_READ: 'mark_read',
  JOIN_CONVERSATION: 'join_conversation',
  LEAVE_CONVERSATION: 'leave_conversation',
  PING: 'ping',

  // Server -> Client
  AUTHENTICATED: 'authenticated',
  AUTH_ERROR: 'auth_error',
  NEW_MESSAGE: 'new_message',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  USER_TYPING: 'user_typing',
  USER_STOPPED_TYPING: 'user_stopped_typing',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  CONVERSATION_JOINED: 'conversation_joined',
  ERROR: 'error',
  PONG: 'pong'
};

/**
 * In-memory stores for connection management
 */
const connections = new Map(); // userId -> Set of WebSocket connections
const userPresence = new Map(); // userId -> { online: boolean, lastSeen: Date }
const typingStatus = new Map(); // `${conversationId}:${userId}` -> timeout handle

/**
 * Connection manager class
 */
class LiveMessagingManager {
  private connections: Map<any, any>;
  private userPresence: Map<any, any>;
  private typingStatus: Map<any, any>;

  constructor() {
    this.connections = connections;
    this.userPresence = userPresence;
    this.typingStatus = typingStatus;
  }

  /**
   * Register a new WebSocket connection
   * @param {string} userId - User ID
   * @param {WebSocket} ws - WebSocket connection
   */
  addConnection(userId, ws) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId).add(ws);

    // Update presence
    this.userPresence.set(userId, {
      online: true,
      lastSeen: new Date()
    });

    // Store userId on WebSocket for cleanup
    ws.userId = userId;
  }

  /**
   * Remove a WebSocket connection
   * @param {string} userId - User ID
   * @param {WebSocket} ws - WebSocket connection
   */
  removeConnection(userId, ws) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(ws);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
        // Update presence to offline
        this.userPresence.set(userId, {
          online: false,
          lastSeen: new Date()
        });
      }
    }
  }

  /**
   * Check if a user is online
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  isUserOnline(userId) {
    return this.connections.has(userId) && this.connections.get(userId).size > 0;
  }

  /**
   * Get user's presence status
   * @param {string} userId - User ID
   * @returns {object} Presence status
   */
  getUserPresence(userId) {
    return this.userPresence.get(userId) || { online: false, lastSeen: null };
  }

  /**
   * Send message to a specific user
   * @param {string} userId - Target user ID
   * @param {object} message - Message to send
   */
  sendToUser(userId, message) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const payload = JSON.stringify(message);
      userConnections.forEach(ws => {
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(payload);
        }
      });
    }
  }

  /**
   * Send message to all participants in a conversation
   * @param {string} conversationId - Conversation ID
   * @param {object} message - Message to send
   * @param {string} excludeUserId - User to exclude (e.g., sender)
   */
  async sendToConversation(conversationId, message, excludeUserId = null) {
    try {
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId, hasLeft: false },
        select: { userId: true }
      });

      participants.forEach(({ userId }) => {
        if (userId !== excludeUserId) {
          this.sendToUser(userId, message);
        }
      });
    } catch (err) {
      console.error('Send to conversation error:', err);
    }
  }

  /**
   * Set user typing status
   * @param {string} conversationId - Conversation ID
   * @param {string} userId - User ID
   * @param {boolean} isTyping - Whether user is typing
   */
  setTypingStatus(conversationId, userId, isTyping) {
    const key = `${conversationId}:${userId}`;
    
    // Clear existing timeout
    const existingTimeout = this.typingStatus.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.typingStatus.delete(key);
    }

    if (isTyping) {
      // Auto-stop typing after 5 seconds
      const timeout = setTimeout(() => {
        this.typingStatus.delete(key);
        this.sendToConversation(conversationId, {
          type: MESSAGE_TYPES.USER_STOPPED_TYPING,
          conversationId,
          userId
        }, userId);
      }, 5000);

      this.typingStatus.set(key, timeout);
    }
  }

  /**
   * Get all online users in a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<string[]>} Online user IDs
   */
  async getOnlineParticipants(conversationId) {
    try {
      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId, hasLeft: false },
        select: { userId: true }
      });

      return participants
        .filter(({ userId }) => this.isUserOnline(userId))
        .map(({ userId }) => userId);
    } catch (err) {
      console.error('Get online participants error:', err);
      return [];
    }
  }
}

// Singleton instance
const messagingManager = new LiveMessagingManager();

/**
 * Create a new message in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} senderId - Sender user ID
 * @param {object} messageData - Message content
 * @returns {Promise<object>} Created message
 */
async function createMessage(conversationId, senderId, messageData) {
  const { content, messageType = 'TEXT', attachments = [] } = messageData;

  // Create message
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      content,
      messageType,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : null
    },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          profile: {
            select: { name: true, avatar: true }
          }
        }
      }
    }
  });

  // Update conversation timestamp
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() }
  });

  // Increment unread count for other participants
  await prisma.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId: { not: senderId }
    },
    data: {
      unreadCount: { increment: 1 }
    }
  });

  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content,
    messageType: message.messageType,
    attachments: message.attachments ? JSON.parse(message.attachments) : [],
    sender: {
      id: message.sender.id,
      name: message.sender.profile?.name || message.sender.email?.split('@')[0],
      avatar: message.sender.profile?.avatar
    },
    createdAt: message.createdAt,
    status: 'sent'
  };
}

/**
 * Mark messages as read
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User marking as read
 * @param {string[]} messageIds - Optional specific message IDs
 * @returns {Promise<number>} Count of messages marked read
 */
async function markMessagesRead(conversationId, userId, messageIds = []) {
  const where: any = {
    conversationId,
    senderId: { not: userId },
    readAt: null
  };

  if (messageIds.length > 0) {
    where.id = { in: messageIds };
  }

  const updated = await prisma.message.updateMany({
    where,
    data: { readAt: new Date() }
  });

  // Reset unread count
  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: { conversationId, userId }
    },
    data: { unreadCount: 0 }
  });

  return updated.count;
}

/**
 * Get recent messages from a conversation
 * @param {string} conversationId - Conversation ID
 * @param {object} options - Pagination options
 * @returns {Promise<object>} Messages with pagination info
 */
async function getConversationMessages(conversationId, options: any = {}) {
  const { limit = 50, before = null, after = null } = options;

  const where: any = { conversationId };

  if (before) {
    where.createdAt = { lt: new Date(before) };
  } else if (after) {
    where.createdAt = { gt: new Date(after) };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          profile: {
            select: { name: true, avatar: true }
          }
        }
      }
    }
  });

  return {
    messages: messages.reverse().map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      content: m.isDeleted ? 'Message deleted' : m.content,
      messageType: m.messageType,
      attachments: m.attachments ? JSON.parse(m.attachments) : [],
      sender: {
        id: m.sender.id,
        name: m.sender.profile?.name || m.sender.email?.split('@')[0],
        avatar: m.sender.profile?.avatar
      },
      createdAt: m.createdAt,
      readAt: m.readAt,
      isDeleted: m.isDeleted
    })),
    hasMore: messages.length === limit
  };
}

/**
 * Get presence info for multiple users
 * @param {string[]} userIds - User IDs to check
 * @returns {object} Map of userId -> presence
 */
function getMultiplePresence(userIds) {
  const result = {};
  userIds.forEach(userId => {
    result[userId] = messagingManager.getUserPresence(userId);
  });
  return result;
}

/**
 * Handle incoming WebSocket message
 * @param {WebSocket} ws - WebSocket connection
 * @param {object} data - Parsed message data
 * @param {object} context - Auth context
 */
async function handleWebSocketMessage(ws, data, context) {
  const { type, ...payload } = data;

  try {
    switch (type) {
      case MESSAGE_TYPES.SEND_MESSAGE: {
        const { conversationId, content, messageType, attachments } = payload;
        
        // Verify user is participant
        const participant = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId: context.userId, hasLeft: false }
        });

        if (!participant) {
          ws.send(JSON.stringify({
            type: MESSAGE_TYPES.ERROR,
            error: 'Not a participant of this conversation'
          }));
          return;
        }

        // Create and broadcast message
        const message = await createMessage(conversationId, context.userId, {
          content,
          messageType,
          attachments
        });

        // Send confirmation to sender
        ws.send(JSON.stringify({
          type: MESSAGE_TYPES.MESSAGE_SENT,
          message,
          localId: payload.localId // Client-side ID for correlation
        }));

        // Broadcast to other participants
        messagingManager.sendToConversation(conversationId, {
          type: MESSAGE_TYPES.NEW_MESSAGE,
          message
        }, context.userId);

        // Stop typing indicator
        messagingManager.setTypingStatus(conversationId, context.userId, false);
        break;
      }

      case MESSAGE_TYPES.TYPING_START: {
        const { conversationId } = payload;
        messagingManager.setTypingStatus(conversationId, context.userId, true);
        messagingManager.sendToConversation(conversationId, {
          type: MESSAGE_TYPES.USER_TYPING,
          conversationId,
          userId: context.userId
        }, context.userId);
        break;
      }

      case MESSAGE_TYPES.TYPING_STOP: {
        const { conversationId } = payload;
        messagingManager.setTypingStatus(conversationId, context.userId, false);
        messagingManager.sendToConversation(conversationId, {
          type: MESSAGE_TYPES.USER_STOPPED_TYPING,
          conversationId,
          userId: context.userId
        }, context.userId);
        break;
      }

      case MESSAGE_TYPES.MARK_READ: {
        const { conversationId, messageIds } = payload;
        const count = await markMessagesRead(conversationId, context.userId, messageIds);
        
        // Notify senders that their messages were read
        messagingManager.sendToConversation(conversationId, {
          type: MESSAGE_TYPES.MESSAGE_READ,
          conversationId,
          readBy: context.userId,
          readAt: new Date().toISOString()
        }, context.userId);
        break;
      }

      case MESSAGE_TYPES.JOIN_CONVERSATION: {
        const { conversationId } = payload;
        
        // Verify access
        const participant = await prisma.conversationParticipant.findFirst({
          where: { conversationId, userId: context.userId, hasLeft: false }
        });

        if (participant) {
          // Get online participants
          const online = await messagingManager.getOnlineParticipants(conversationId);
          
          ws.send(JSON.stringify({
            type: MESSAGE_TYPES.CONVERSATION_JOINED,
            conversationId,
            onlineParticipants: online
          }));

          // Notify others that user joined
          messagingManager.sendToConversation(conversationId, {
            type: MESSAGE_TYPES.USER_ONLINE,
            conversationId,
            userId: context.userId
          }, context.userId);
        }
        break;
      }

      case MESSAGE_TYPES.PING: {
        ws.send(JSON.stringify({
          type: MESSAGE_TYPES.PONG,
          timestamp: Date.now()
        }));
        break;
      }

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (err) {
    console.error('WebSocket message handler error:', err);
    ws.send(JSON.stringify({
      type: MESSAGE_TYPES.ERROR,
      error: 'Failed to process message'
    }));
  }
}

/**
 * Get unread message counts for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} Unread counts by conversation
 */
async function getUnreadCounts(userId) {
  const participants = await prisma.conversationParticipant.findMany({
    where: { userId, hasLeft: false },
    select: {
      conversationId: true,
      unreadCount: true
    }
  });

  const total = participants.reduce((sum, p) => sum + p.unreadCount, 0);
  const byConversation = {};
  participants.forEach(p => {
    if (p.unreadCount > 0) {
      byConversation[p.conversationId] = p.unreadCount;
    }
  });

  return { total, byConversation };
}

// ============================================
// Step 43: Group Chat & Reactions Enhancement
// ============================================

// Available emoji reactions
const VALID_REACTIONS = ['👍', '❤️', '😊', '😮', '😢', '🎉', '🙏', '💪', '✅', '❌'];

/**
 * Create a group conversation
 * @param {string} creatorId - User creating the group
 * @param {object} groupData - Group configuration
 */
async function createGroupChat(creatorId, groupData) {
  const { name, participantIds, description = '', avatar = null } = groupData;
  
  if (!name || name.trim().length < 2) {
    throw new Error('Group name is required');
  }
  
  if (!participantIds || participantIds.length < 2) {
    throw new Error('Group must have at least 2 other participants');
  }
  
  // Create conversation
  const conversation = await prisma.conversation.create({
    data: {
      type: 'GROUP',
      name: name.trim(),
      description,
      avatar,
      createdBy: creatorId,
      participants: {
        createMany: {
          data: [
            { userId: creatorId, role: 'ADMIN' },
            ...participantIds.map(userId => ({ userId, role: 'MEMBER' }))
          ]
        }
      }
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { name: true, avatar: true } }
            }
          }
        }
      }
    }
  });
  
  // Create system message
  await createMessage(conversation.id, creatorId, {
    content: `Group "${name}" was created`,
    messageType: 'SYSTEM'
  });
  
  // Notify all participants
  participantIds.forEach(userId => {
    messagingManager.sendToUser(userId, {
      type: 'GROUP_CREATED',
      conversation: {
        id: conversation.id,
        name: conversation.name,
        type: 'GROUP'
      }
    });
  });
  
  return conversation;
}

/**
 * Add members to a group
 * @param {string} conversationId - Group conversation ID
 * @param {string} adderId - User adding members (must be admin)
 * @param {string[]} newMemberIds - User IDs to add
 */
async function addGroupMembers(conversationId, adderId, newMemberIds) {
  // Check if adder is admin
  const adderParticipant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId: adderId }
    }
  });
  
  if (!adderParticipant || adderParticipant.role !== 'ADMIN') {
    throw new Error('Only admins can add members');
  }
  
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });
  
  if (conversation?.type !== 'GROUP') {
    throw new Error('Can only add members to group chats');
  }
  
  // Add participants
  const added = [];
  for (const userId of newMemberIds) {
    const existing = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } }
    });
    
    if (!existing) {
      await prisma.conversationParticipant.create({
        data: { conversationId, userId, role: 'MEMBER' }
      });
      added.push(userId);
      
      // Notify new member
      messagingManager.sendToUser(userId, {
        type: 'ADDED_TO_GROUP',
        conversationId,
        groupName: conversation.name
      });
    } else if (existing.hasLeft) {
      await prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { hasLeft: false, leftAt: null }
      });
      added.push(userId);
    }
  }
  
  if (added.length > 0) {
    // System message
    const adderProfile = await prisma.profile.findUnique({ where: { userId: adderId } });
    await createMessage(conversationId, adderId, {
      content: `${adderProfile?.name || 'Someone'} added ${added.length} member(s) to the group`,
      messageType: 'SYSTEM'
    });
  }
  
  return { added };
}

/**
 * Remove member from group
 * @param {string} conversationId - Group conversation ID
 * @param {string} removerId - User removing member
 * @param {string} targetUserId - User to remove
 */
async function removeGroupMember(conversationId, removerId, targetUserId) {
  // Check permissions
  const removerParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: removerId } }
  });
  
  if (!removerParticipant || (removerParticipant.role !== 'ADMIN' && removerId !== targetUserId)) {
    throw new Error('Not authorized to remove this member');
  }
  
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
    data: { hasLeft: true, leftAt: new Date() }
  });
  
  // Notify removed user
  messagingManager.sendToUser(targetUserId, {
    type: 'REMOVED_FROM_GROUP',
    conversationId
  });
  
  // System message
  await createMessage(conversationId, removerId, {
    content: removerId === targetUserId ? 'Left the group' : 'A member was removed',
    messageType: 'SYSTEM'
  });
  
  return { success: true };
}

/**
 * Add reaction to a message
 * @param {string} messageId - Message ID
 * @param {string} userId - User adding reaction
 * @param {string} emoji - Reaction emoji
 */
async function addReaction(messageId, userId, emoji) {
  if (!VALID_REACTIONS.includes(emoji)) {
    throw new Error('Invalid reaction emoji');
  }
  
  const message = await prisma.message.findUnique({
    where: { id: messageId }
  });
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  // Parse existing reactions
  const reactions = message.reactions ? JSON.parse(message.reactions) : {};
  
  // Add reaction
  if (!reactions[emoji]) {
    reactions[emoji] = [];
  }
  
  if (!reactions[emoji].includes(userId)) {
    reactions[emoji].push(userId);
  }
  
  await prisma.message.update({
    where: { id: messageId },
    data: { reactions: JSON.stringify(reactions) }
  });
  
  // Notify conversation participants
  messagingManager.sendToConversation(message.conversationId, {
    type: 'REACTION_ADDED',
    messageId,
    userId,
    emoji,
    reactions
  });
  
  return { reactions };
}

/**
 * Remove reaction from a message
 * @param {string} messageId - Message ID
 * @param {string} userId - User removing reaction
 * @param {string} emoji - Reaction emoji to remove
 */
async function removeReaction(messageId, userId, emoji) {
  const message = await prisma.message.findUnique({
    where: { id: messageId }
  });
  
  if (!message) {
    throw new Error('Message not found');
  }
  
  const reactions = message.reactions ? JSON.parse(message.reactions) : {};
  
  if (reactions[emoji]) {
    reactions[emoji] = reactions[emoji].filter(id => id !== userId);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  }
  
  await prisma.message.update({
    where: { id: messageId },
    data: { reactions: JSON.stringify(reactions) }
  });
  
  messagingManager.sendToConversation(message.conversationId, {
    type: 'REACTION_REMOVED',
    messageId,
    userId,
    emoji,
    reactions
  });
  
  return { reactions };
}

/**
 * Update group settings (name, avatar, etc.)
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User making changes (must be admin)
 * @param {object} updates - Updates to apply
 */
async function updateGroupSettings(conversationId, userId, updates: any) {
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } }
  });
  
  if (!participant || participant.role !== 'ADMIN') {
    throw new Error('Only admins can update group settings');
  }
  
  const allowedUpdates: any = {};
  if (updates.name) allowedUpdates.name = updates.name.trim();
  if (updates.description !== undefined) allowedUpdates.description = updates.description;
  if (updates.avatar) allowedUpdates.avatar = updates.avatar;
  
  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: allowedUpdates
  });
  
  // Notify all participants
  messagingManager.sendToConversation(conversationId, {
    type: 'GROUP_UPDATED',
    conversationId,
    updates: allowedUpdates
  });
  
  return conversation;
}

/**
 * Promote/demote group member
 * @param {string} conversationId - Conversation ID  
 * @param {string} adminId - Admin making the change
 * @param {string} targetUserId - User to change role
 * @param {string} newRole - New role (ADMIN or MEMBER)
 */
async function changeGroupRole(conversationId, adminId, targetUserId, newRole) {
  const adminParticipant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: adminId } }
  });
  
  if (!adminParticipant || adminParticipant.role !== 'ADMIN') {
    throw new Error('Only admins can change roles');
  }
  
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: targetUserId } },
    data: { role: newRole }
  });
  
  messagingManager.sendToUser(targetUserId, {
    type: 'ROLE_CHANGED',
    conversationId,
    newRole
  });
  
  return { success: true };
}

export {
  MESSAGE_TYPES,
  VALID_REACTIONS,
  LiveMessagingManager,
  messagingManager,
  createMessage,
  markMessagesRead,
  getConversationMessages,
  getMultiplePresence,
  handleWebSocketMessage,
  getUnreadCounts,
  // Group chat
  createGroupChat,
  addGroupMembers,
  removeGroupMember,
  updateGroupSettings,
  changeGroupRole,
  // Reactions
  addReaction,
  removeReaction
};

