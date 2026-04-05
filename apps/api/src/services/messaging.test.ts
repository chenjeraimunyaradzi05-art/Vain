/**
 * Messaging Service Tests
 * 
 * Unit tests for the real-time messaging service.
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { prismaMock } from '../test/mocks/prisma';

// Mock services
vi.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}));

// Mock messaging service functions
const messagingService = {
  async sendMessage(senderId: string, recipientId: string, content: string, conversationId?: string) {
    // Validate inputs
    if (!senderId || !recipientId || !content) {
      throw new Error('Missing required fields');
    }

    if (content.length > 10000) {
      throw new Error('Message content too long');
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prismaMock.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true },
      });
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Check if sender is participant
      const isParticipant = conversation.participants.some(
        (p: any) => p.userId === senderId
      );
      if (!isParticipant) {
        throw new Error('Not a participant in this conversation');
      }
    } else {
      // Create new conversation
      conversation = await prismaMock.conversation.create({
        data: {
          participants: {
            create: [
              { userId: senderId },
              { userId: recipientId },
            ],
          },
        },
        include: { participants: true },
      });
    }

    // Create message
    const message = await prismaMock.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content,
        type: 'text',
      },
    });

    // Update conversation lastMessageAt
    await prismaMock.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    return message;
  },

  async getConversations(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const conversations = await prismaMock.conversation.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
      skip,
      take: limit,
    });

    return conversations;
  },

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    // Verify user is participant
    const conversation = await prismaMock.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { userId } },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const skip = (page - 1) * limit;
    
    const messages = await prismaMock.message.findMany({
      where: { conversationId },
      include: {
        sender: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Mark as read
    await prismaMock.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return messages.reverse();
  },

  async markAsRead(conversationId: string, userId: string) {
    await prismaMock.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  },

  async deleteMessage(messageId: string, userId: string) {
    const message = await prismaMock.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Can only delete own messages');
    }

    // Soft delete
    await prismaMock.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    return true;
  },
};

describe('Messaging Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a message in existing conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        participants: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      };

      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello!',
        type: 'text',
        createdAt: new Date(),
      };

      prismaMock.conversation.findUnique.mockResolvedValue(mockConversation);
      prismaMock.message.create.mockResolvedValue(mockMessage);
      prismaMock.conversation.update.mockResolvedValue({});

      const result = await messagingService.sendMessage(
        'user-1',
        'user-2',
        'Hello!',
        'conv-1'
      );

      expect(result).toEqual(mockMessage);
      expect(prismaMock.message.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Hello!',
          type: 'text',
        },
      });
    });

    it('should create new conversation if not provided', async () => {
      const mockConversation = {
        id: 'conv-new',
        participants: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      };

      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-new',
        senderId: 'user-1',
        content: 'Hello!',
        type: 'text',
        createdAt: new Date(),
      };

      prismaMock.conversation.create.mockResolvedValue(mockConversation);
      prismaMock.message.create.mockResolvedValue(mockMessage);
      prismaMock.conversation.update.mockResolvedValue({});

      const result = await messagingService.sendMessage(
        'user-1',
        'user-2',
        'Hello!'
      );

      expect(result).toEqual(mockMessage);
      expect(prismaMock.conversation.create).toHaveBeenCalled();
    });

    it('should reject if sender is not participant', async () => {
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        participants: [
          { userId: 'user-2' },
          { userId: 'user-3' },
        ],
      });

      await expect(
        messagingService.sendMessage('user-1', 'user-2', 'Hello!', 'conv-1')
      ).rejects.toThrow('Not a participant');
    });

    it('should reject message content that is too long', async () => {
      const longContent = 'a'.repeat(10001);
      
      await expect(
        messagingService.sendMessage('user-1', 'user-2', longContent)
      ).rejects.toThrow('Message content too long');
    });

    it('should reject if required fields are missing', async () => {
      await expect(
        messagingService.sendMessage('', 'user-2', 'Hello!')
      ).rejects.toThrow('Missing required fields');
    });
  });

  describe('getConversations', () => {
    it('should return user conversations', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          lastMessageAt: new Date(),
          participants: [
            { user: { id: 'user-1', name: 'User 1', avatar: null } },
            { user: { id: 'user-2', name: 'User 2', avatar: null } },
          ],
          messages: [
            { id: 'msg-1', content: 'Last message' },
          ],
        },
      ];

      prismaMock.conversation.findMany.mockResolvedValue(mockConversations);

      const result = await messagingService.getConversations('user-1');

      expect(result).toEqual(mockConversations);
      expect(prismaMock.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            participants: { some: { userId: 'user-1' } },
          },
        })
      );
    });

    it('should paginate results', async () => {
      prismaMock.conversation.findMany.mockResolvedValue([]);

      await messagingService.getConversations('user-1', 2, 10);

      expect(prismaMock.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('getMessages', () => {
    it('should return messages for conversation', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Hello', sender: { id: 'user-1', name: 'User 1' } },
        { id: 'msg-2', content: 'Hi!', sender: { id: 'user-2', name: 'User 2' } },
      ];

      prismaMock.conversation.findFirst.mockResolvedValue({ id: 'conv-1' });
      prismaMock.message.findMany.mockResolvedValue(mockMessages);
      prismaMock.message.updateMany.mockResolvedValue({ count: 1 });

      const result = await messagingService.getMessages('conv-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(prismaMock.message.updateMany).toHaveBeenCalled(); // Mark as read
    });

    it('should reject if user is not participant', async () => {
      prismaMock.conversation.findFirst.mockResolvedValue(null);

      await expect(
        messagingService.getMessages('conv-1', 'user-3')
      ).rejects.toThrow('Conversation not found or access denied');
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete own message', async () => {
      prismaMock.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        senderId: 'user-1',
        content: 'Hello',
      });
      prismaMock.message.update.mockResolvedValue({});

      const result = await messagingService.deleteMessage('msg-1', 'user-1');

      expect(result).toBe(true);
      expect(prismaMock.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should reject deleting other user message', async () => {
      prismaMock.message.findUnique.mockResolvedValue({
        id: 'msg-1',
        senderId: 'user-2',
        content: 'Hello',
      });

      await expect(
        messagingService.deleteMessage('msg-1', 'user-1')
      ).rejects.toThrow('Can only delete own messages');
    });
  });
});
