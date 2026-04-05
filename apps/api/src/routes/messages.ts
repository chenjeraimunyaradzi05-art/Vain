import express from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import auth from '../middleware/auth';

const router = express.Router();

// Helper to get user name and avatar from various profile types
function getUserDetails(user: any) {
    let name = user.email.split('@')[0];
    let avatar = null;

    if (user.mentorProfile) {
        name = user.mentorProfile.name || name;
        avatar = user.mentorProfile.avatar || user.mentorProfile.avatarUrl;
    } else if (user.companyProfile) {
        name = user.companyProfile.companyName || name;
    } else if (user.governmentProfile) {
        name = user.governmentProfile.agencyName || name;
    } else if (user.institutionProfile) {
        name = user.institutionProfile.institutionName || name;
    }
    return { name, avatar };
}

/**
 * GET /messages/conversations
 * Get all conversations for the authenticated user
 */
router.get('/conversations', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        
        // Get all conversations where user is a participant
        const participations = await prisma.conversationParticipant.findMany({
            where: {
                userId,
                hasLeft: false
            },
            include: {
                conversation: {
                    include: {
                        participants: true,
                        messages: {
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        }
                    }
                }
            },
            orderBy: {
                conversation: {
                    updatedAt: 'desc'
                }
            }
        });

        // Get user details for all participants
        const allUserIds = new Set<string>();
        participations.forEach((p: any) => {
            p.conversation.participants.forEach((part: any) => {
                allUserIds.add(part.userId);
            });
        });

        const users = await prisma.user.findMany({
            where: { id: { in: Array.from(allUserIds) } },
            select: {
                id: true,
                email: true,
                userType: true,
                memberProfile: true,
                companyProfile: true,
                mentorProfile: true,
                governmentProfile: true,
                institutionProfile: true,
            }
        });

        const userMap = new Map(users.map((u: any) => [u.id, u]));

        // Format response
        const conversations = participations.map((p: any) => {
            const conv = p.conversation;
            const otherParticipants = conv.participants
                .filter((part: any) => part.userId !== userId)
                .map((part: any) => {
                    const user = userMap.get(part.userId);
                    const details = user ? getUserDetails(user) : { name: 'Unknown', avatar: null };
                    return {
                        userId: part.userId,
                        name: details.name,
                        avatar: details.avatar,
                        role: part.role
                    };
                });

            const lastMessage = conv.messages[0];

            return {
                id: conv.id,
                type: conv.type,
                name: conv.name || otherParticipants.map(p => p.name).join(', '),
                participants: otherParticipants,
                lastMessage: lastMessage ? {
                    id: lastMessage.id,
                    content: lastMessage.isDeleted ? 'Message deleted' : lastMessage.content,
                    senderId: lastMessage.senderId,
                    messageType: lastMessage.messageType,
                    createdAt: lastMessage.createdAt
                } : null,
                unreadCount: p.unreadCount,
                isMuted: p.isMuted,
                updatedAt: conv.updatedAt
            };
        });

        res.json({ conversations });
    } catch (err) {
        console.error('Get conversations error:', err);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

/**
 * POST /messages/conversations
 * Start a new conversation
 */
router.post('/conversations', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { participantIds, name, type = 'direct', initialMessage } = req.body;

        if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            return void res.status(400).json({ error: 'participantIds is required' });
        }

        // For direct messages, check if conversation already exists
        if (type === 'direct' && participantIds.length === 1) {
            const existingConv = await prisma.conversation.findFirst({
                where: {
                    type: 'direct',
                    participants: {
                        every: {
                            userId: { in: [userId, participantIds[0]] }
                        }
                    }
                },
                include: {
                    participants: true
                }
            });

            if (existingConv && existingConv.participants.length === 2) {
                return void res.json({ 
                    conversation: { id: existingConv.id },
                    isExisting: true 
                });
            }
        }

        // Create conversation
        const conversation = await prisma.conversation.create({
            data: {
                type,
                name: type === 'group' ? name : null,
                creatorId: userId,
                participants: {
                    create: [
                        { userId, role: 'admin' },
                        ...participantIds.map(id => ({
                            userId: id,
                            role: 'member'
                        }))
                    ]
                }
            }
        });

        // Send initial message if provided
        if (initialMessage) {
            await prisma.directMessage.create({
                data: {
                    conversationId: conversation.id,
                    senderId: userId,
                    content: initialMessage,
                    messageType: 'text'
                }
            });

            // Update conversation timestamp
            await prisma.conversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() }
            });

            // Update unread counts for other participants
            await prisma.conversationParticipant.updateMany({
                where: {
                    conversationId: conversation.id,
                    userId: { not: userId }
                },
                data: {
                    unreadCount: { increment: 1 }
                }
            });
        }

        res.status(201).json({ 
            conversation: { id: conversation.id },
            isExisting: false
        });
    } catch (err) {
        console.error('Create conversation error:', err);
        res.status(500).json({ error: 'Failed to create conversation' });
    }
});

/**
 * GET /messages/conversations/:id
 * Get a specific conversation with messages
 */
router.get('/conversations/:id', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { limit = 50, before } = req.query;

        // Verify user is participant
        const participation = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId
                }
            }
        });

        if (!participation || participation.hasLeft) {
            return void res.status(404).json({ error: 'Conversation not found' });
        }

        // Get conversation with messages
        const whereMessages: any = { conversationId: id };
        if (before) {
            whereMessages.createdAt = { lt: new Date(before as string) };
        }

        const [conversation, messages] = await Promise.all([
            prisma.conversation.findUnique({
                where: { id },
                include: {
                    participants: true
                }
            }),
            prisma.directMessage.findMany({
                where: whereMessages,
                orderBy: { createdAt: 'desc' },
                take: parseInt(limit as string, 10)
            })
        ]);

        if (!conversation) {
            return void res.status(404).json({ error: 'Conversation not found' });
        }

        // Get user details for participants
        const userIds = conversation.participants.map((p: any) => p.userId);
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                email: true,
                userType: true,
                memberProfile: true,
                companyProfile: true,
                mentorProfile: true,
                governmentProfile: true,
                institutionProfile: true,
            }
        });

        const userMap = new Map(users.map((u: any) => [u.id, u]));

        // Mark as read
        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId
                }
            },
            data: {
                lastReadAt: new Date(),
                unreadCount: 0
            }
        });

        res.json({
            conversation: {
                id: conversation.id,
                type: conversation.type,
                name: conversation.name,
                participants: conversation.participants.map((p: any) => {
                    const user = userMap.get(p.userId);
                    const details = user ? getUserDetails(user) : { name: 'Unknown', avatar: null };
                    return {
                        userId: p.userId,
                        name: details.name,
                        avatar: details.avatar,
                        role: p.role,
                        hasLeft: p.hasLeft
                    };
                }),
                createdAt: conversation.createdAt
            },
            messages: messages.reverse().map((m: any) => {
                const user = userMap.get(m.senderId);
                const details = user ? getUserDetails(user) : { name: 'Unknown', avatar: null };
                return {
                    id: m.id,
                    senderId: m.senderId,
                    senderName: details.name,
                    senderAvatar: details.avatar,
                    content: m.isDeleted ? 'Message deleted' : m.content,
                    messageType: m.messageType,
                    mediaUrl: m.mediaUrl,
                    isEdited: m.isEdited,
                    isDeleted: m.isDeleted,
                    createdAt: m.createdAt
                };
            }),
            hasMore: messages.length === parseInt(limit as string, 10)
        });
    } catch (err) {
        console.error('Get conversation error:', err);
        res.status(500).json({ error: 'Failed to fetch conversation' });
    }
});

/**
 * POST /messages/conversations/:id/messages
 * Send a message in a conversation
 */
router.post('/conversations/:id/messages', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { content, messageType = 'text', mediaUrl, mediaType, fileName, fileSize } = req.body;

        if (!content && !mediaUrl) {
            return void res.status(400).json({ error: 'content or mediaUrl is required' });
        }

        // Verify user is participant
        const participation = await prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId
                }
            }
        });

        if (!participation || participation.hasLeft) {
            return void res.status(404).json({ error: 'Conversation not found' });
        }

        // Create message
        const message = await prisma.directMessage.create({
            data: {
                conversationId: id,
                senderId: userId,
                content: content || '',
                messageType,
                mediaUrl,
                mediaType,
                fileName,
                fileSize
            }
        });

        // Update conversation timestamp
        await prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() }
        });

        // Update unread counts for other participants
        await prisma.conversationParticipant.updateMany({
            where: {
                conversationId: id,
                userId: { not: userId }
            },
            data: {
                unreadCount: { increment: 1 }
            }
        });

        // Get sender info
        const sender = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                userType: true,
                memberProfile: true,
                companyProfile: true,
                mentorProfile: true,
                governmentProfile: true,
                institutionProfile: true,
            }
        });

        const details = sender ? getUserDetails(sender) : { name: 'You', avatar: null };

        res.status(201).json({
            message: {
                id: message.id,
                senderId: userId,
                senderName: details.name,
                senderAvatar: details.avatar,
                content: message.content,
                messageType: message.messageType,
                mediaUrl: message.mediaUrl,
                createdAt: message.createdAt
            }
        });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

/**
 * DELETE /messages/conversations/:id/messages/:messageId
 * Delete (soft) a message
 */
router.delete('/conversations/:id/messages/:messageId', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id, messageId } = req.params;

        // Verify message belongs to user
        const message = await prisma.directMessage.findFirst({
            where: {
                id: messageId,
                conversationId: id,
                senderId: userId
            }
        });

        if (!message) {
            return void res.status(404).json({ error: 'Message not found' });
        }

        // Soft delete
        await prisma.directMessage.update({
            where: { id: messageId },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                content: '' // Clear content
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Delete message error:', err);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

/**
 * POST /messages/conversations/:id/read
 * Mark conversation as read
 */
router.post('/conversations/:id/read', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId
                }
            },
            data: {
                lastReadAt: new Date(),
                unreadCount: 0
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ error: 'Failed to mark as read' });
    }
});

/**
 * POST /messages/conversations/:id/mute
 * Mute a conversation
 */
router.post('/conversations/:id/mute', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { duration } = req.body; // hours, or null for permanent

        const mutedUntil = duration 
            ? new Date(Date.now() + duration * 60 * 60 * 1000)
            : null;

        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId
                }
            },
            data: {
                isMuted: true,
                mutedUntil
            }
        });

        res.json({ success: true, mutedUntil });
    } catch (err) {
        console.error('Mute error:', err);
        res.status(500).json({ error: 'Failed to mute conversation' });
    }
});

/**
 * DELETE /messages/conversations/:id/mute
 * Unmute a conversation
 */
router.delete('/conversations/:id/mute', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId
                }
            },
            data: {
                isMuted: false,
                mutedUntil: null
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Unmute error:', err);
        res.status(500).json({ error: 'Failed to unmute conversation' });
    }
});

/**
 * DELETE /messages/conversations/:id
 * Leave a conversation
 */
router.delete('/conversations/:id', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        await prisma.conversationParticipant.update({
            where: {
                conversationId_userId: {
                    conversationId: id,
                    userId
                }
            },
            data: {
                hasLeft: true,
                leftAt: new Date()
            }
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Leave conversation error:', err);
        res.status(500).json({ error: 'Failed to leave conversation' });
    }
});

/**
 * GET /messages/unread-count
 * Get total unread message count
 */
router.get('/unread-count', auth.authenticate, async (req: any, res: any) => {
    try {
        const userId = req.user.id;

        const result = await prisma.conversationParticipant.aggregate({
            where: {
                userId,
                hasLeft: false,
                isMuted: false
            },
            _sum: {
                unreadCount: true
            }
        });

        res.json({ unreadCount: result._sum.unreadCount || 0 });
    } catch (err) {
        console.error('Unread count error:', err);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
});

export default router;


