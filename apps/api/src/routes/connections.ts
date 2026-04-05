/**
 * Connections Routes
 * Handles user connections, following, and messaging
 */
import express from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import authenticateJWT from '../middleware/auth';

const router = express.Router();

type UserSummary = {
  id: string;
  email: string;
  userType: string;
  name: string;
  avatar: string | null;
  headline: string;
  company: string | null;
};

async function getUserSummaries(userIds: string[]): Promise<Map<string, UserSummary>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: uniqueIds } },
    select: {
      id: true,
      email: true,
      userType: true,
      memberProfile: {
        select: {
          careerInterest: true,
          skillLevel: true,
          mobNation: true,
        },
      },
      mentorProfile: {
        select: {
          name: true,
          title: true,
          avatar: true,
          avatarUrl: true,
          industry: true,
          location: true,
        },
      },
      companyProfile: {
        select: {
          companyName: true,
          logo: true,
          industry: true,
          city: true,
          state: true,
        },
      },
      governmentProfile: {
        select: {
          agencyName: true,
        },
      },
      institutionProfile: {
        select: {
          institutionName: true,
          institutionType: true,
        },
      },
      fifoProfile: {
        select: {
          companyName: true,
          industry: true,
        },
      },
    },
  });

  const map = new Map<string, UserSummary>();

  for (const user of users) {
    const companyName = user.companyProfile?.companyName || user.fifoProfile?.companyName || null;
    const mentorName = user.mentorProfile?.name || null;
    const governmentName = user.governmentProfile?.agencyName || null;
    const institutionName = user.institutionProfile?.institutionName || null;

    const name =
      mentorName ||
      companyName ||
      governmentName ||
      institutionName ||
      user.email;

    const avatar =
      user.mentorProfile?.avatar ||
      user.mentorProfile?.avatarUrl ||
      user.companyProfile?.logo ||
      null;

    const headline =
      user.mentorProfile?.title ||
      user.memberProfile?.careerInterest ||
      user.companyProfile?.industry ||
      user.institutionProfile?.institutionType ||
      user.fifoProfile?.industry ||
      user.userType;

    map.set(user.id, {
      id: user.id,
      email: user.email,
      userType: user.userType,
      name,
      avatar,
      headline,
      company: companyName,
    });
  }

  return map;
}

// =============================================================================
// CONNECTIONS (Bidirectional friend-style)
// =============================================================================

/**
 * GET /connections - Get user's connections
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'accepted', page = 1, limit = 20 } = req.query;

    const where = {
      status,
      OR: [
        { requesterId: userId },
        { addresseeId: userId }
      ]
    };

    const [connections, total] = await Promise.all([
      prisma.userConnection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.userConnection.count({ where })
    ]);

    const otherUserIds = connections.map(c => (c.requesterId === userId ? c.addresseeId : c.requesterId));
    const userSummaryById = await getUserSummaries(otherUserIds);

    // Get the other user's ID for each connection
    const connectionData = connections.map(c => {
      const otherUserId = c.requesterId === userId ? c.addresseeId : c.requesterId;
      const summary = userSummaryById.get(otherUserId);
      return {
        id: c.id,
        userId: otherUserId,
        // Flattened identity fields for web UI convenience
        name: summary?.name,
        email: summary?.email,
        userType: summary?.userType,
        avatar: summary?.avatar,
        headline: summary?.headline,
        company: summary?.company,
        status: c.status,
        message: c.message,
        createdAt: c.createdAt,
        acceptedAt: c.acceptedAt,
        isSender: c.requesterId === userId,
      };
    });

    res.json({ connections: connectionData, total });
  } catch (err) {
    console.error('Get connections error:', err);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

/**
 * GET /connections/requests - Get pending connection requests
 */
router.get('/requests', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const [received, sent] = await Promise.all([
      prisma.userConnection.findMany({
        where: { addresseeId: userId, status: 'pending' },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.userConnection.findMany({
        where: { requesterId: userId, status: 'pending' },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const receivedUserIds = received.map(r => r.requesterId);
    const sentUserIds = sent.map(s => s.addresseeId);
    const userSummaryById = await getUserSummaries([...receivedUserIds, ...sentUserIds]);

    res.json({ 
      received: received.map(r => {
        const summary = userSummaryById.get(r.requesterId);
        return {
          ...r,
          userId: r.requesterId,
          name: summary?.name,
          email: summary?.email,
          userType: summary?.userType,
          avatar: summary?.avatar,
          headline: summary?.headline,
          company: summary?.company,
        };
      }),
      sent: sent.map(s => {
        const summary = userSummaryById.get(s.addresseeId);
        return {
          ...s,
          userId: s.addresseeId,
          name: summary?.name,
          email: summary?.email,
          userType: summary?.userType,
          avatar: summary?.avatar,
          headline: summary?.headline,
          company: summary?.company,
        };
      })
    });
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/**
 * POST /connections/request - Send a connection request
 */
router.post('/request', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { addresseeId, message } = req.body;

    if (!addresseeId) {
      return void res.status(400).json({ error: 'Addressee ID is required' });
    }

    if (addresseeId === userId) {
      return void res.status(400).json({ error: 'Cannot connect with yourself' });
    }

    // Check if blocked
    const blocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: addresseeId },
          { blockerId: addresseeId, blockedId: userId }
        ]
      }
    });

    if (blocked) {
      return void res.status(403).json({ error: 'Cannot send connection request' });
    }

    // Check addressee's safety settings
    const safetySettings = await prisma.userSafetySettings.findUnique({
      where: { userId: addresseeId }
    });

    if (safetySettings?.allowConnectionRequests === false) {
      return void res.status(403).json({ error: 'User is not accepting connection requests' });
    }

    // Check for existing connection
    const existing = await prisma.userConnection.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId },
          { requesterId: addresseeId, addresseeId: userId }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return void res.status(400).json({ error: 'Already connected' });
      }
      if (existing.status === 'pending') {
        return void res.status(400).json({ error: 'Connection request already pending' });
      }
      if (existing.status === 'blocked') {
        return void res.status(403).json({ error: 'Cannot send connection request' });
      }
    }

    // Rate limiting
    const recentRequests = await prisma.userConnection.count({
      where: {
        requesterId: userId,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      }
    });

    if (recentRequests >= 20) {
      return void res.status(429).json({ error: 'Too many connection requests. Please wait.' });
    }

    const connection = await prisma.userConnection.create({
      data: {
        requesterId: userId,
        addresseeId,
        message,
        status: 'pending'
      }
    });

    // Create notification
    await prisma.socialNotification.create({
      data: {
        userId: addresseeId,
        category: 'connection',
        type: 'connection_request',
        actorId: userId,
        message: 'Someone wants to connect with you'
      }
    });

    res.status(201).json({ connection });
  } catch (err) {
    console.error('Send request error:', err);
    res.status(500).json({ error: 'Failed to send connection request' });
  }
});

/**
 * PUT /connections/:id/accept - Accept a connection request
 */
router.put('/:id/accept', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const connection = await prisma.userConnection.findUnique({
      where: { id }
    });

    if (!connection || connection.addresseeId !== userId) {
      return void res.status(404).json({ error: 'Connection request not found' });
    }

    if (connection.status !== 'pending') {
      return void res.status(400).json({ error: 'Request is not pending' });
    }

    await prisma.userConnection.update({
      where: { id },
      data: { status: 'accepted', acceptedAt: new Date() }
    });

    // Notify requester
    await prisma.socialNotification.create({
      data: {
        userId: connection.requesterId,
        category: 'connection',
        type: 'connection_accepted',
        actorId: userId,
        message: 'Your connection request was accepted'
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Accept request error:', err);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

/**
 * PUT /connections/:id/reject - Reject a connection request
 */
router.put('/:id/reject', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const connection = await prisma.userConnection.findUnique({
      where: { id }
    });

    if (!connection || connection.addresseeId !== userId) {
      return void res.status(404).json({ error: 'Connection request not found' });
    }

    await prisma.userConnection.update({
      where: { id },
      data: { status: 'rejected' }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Reject request error:', err);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

/**
 * DELETE /connections/:id - Remove a connection
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const connection = await prisma.userConnection.findUnique({
      where: { id }
    });

    if (!connection || (connection.requesterId !== userId && connection.addresseeId !== userId)) {
      return void res.status(404).json({ error: 'Connection not found' });
    }

    await prisma.userConnection.delete({
      where: { id }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Remove connection error:', err);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
});

// =============================================================================
// FOLLOWING (Unidirectional follow-style)
// =============================================================================

/**
 * GET /connections/following - Get users/orgs I'm following
 */
router.get('/following', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, page = 1, limit = 20 } = req.query;

    const where: any = { followerId: userId };
    if (type) where.followType = type;

    const [following, total] = await Promise.all([
      prisma.userFollow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.userFollow.count({ where })
    ]);

    const followingUserIds = following
      .filter(f => f.followType === 'user')
      .map(f => f.followingId);
    const userSummaryById = await getUserSummaries(followingUserIds);

    const enriched = following.map(f => {
      const summary = f.followType === 'user' ? userSummaryById.get(f.followingId) : undefined;
      return {
        ...f,
        name: summary?.name,
        email: summary?.email,
        userType: summary?.userType,
        avatar: summary?.avatar,
        headline: summary?.headline,
        company: summary?.company,
      };
    });

    res.json({ following: enriched, total });
  } catch (err) {
    console.error('Get following error:', err);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

/**
 * GET /connections/followers - Get my followers
 */
router.get('/followers', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const where = { followingId: userId, followType: 'user' };

    const [followers, total] = await Promise.all([
      prisma.userFollow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.userFollow.count({ where })
    ]);

    const followerIds = followers.map(f => f.followerId);
    const userSummaryById = await getUserSummaries(followerIds);

    const enriched = followers.map(f => {
      const summary = userSummaryById.get(f.followerId);
      return {
        ...f,
        userId: f.followerId,
        name: summary?.name,
        email: summary?.email,
        userType: summary?.userType,
        avatar: summary?.avatar,
        headline: summary?.headline,
        company: summary?.company,
      };
    });

    res.json({ 
      followers: enriched,
      total 
    });
  } catch (err) {
    console.error('Get followers error:', err);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

/**
 * POST /connections/follow - Follow a user or organization
 */
router.post('/follow', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { followingId, followType = 'user' } = req.body;

    if (!followingId) {
      return void res.status(400).json({ error: 'Following ID is required' });
    }

    if (followType === 'user' && followingId === userId) {
      return void res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const existing = await prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId } }
    });

    if (existing) {
      return void res.status(400).json({ error: 'Already following' });
    }

    // Check blocks
    if (followType === 'user') {
      const blocked = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: followingId },
            { blockerId: followingId, blockedId: userId }
          ]
        }
      });

      if (blocked) {
        return void res.status(403).json({ error: 'Cannot follow this user' });
      }
    }

    // Rate limiting
    const recentFollows = await prisma.userFollow.count({
      where: {
        followerId: userId,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
      }
    });

    if (recentFollows >= 30) {
      return void res.status(429).json({ error: 'Too many follows. Please wait.' });
    }

    await prisma.userFollow.create({
      data: { followerId: userId, followingId, followType }
    });

    // Notify if following a user
    if (followType === 'user') {
      await prisma.socialNotification.create({
        data: {
          userId: followingId,
          category: 'connection',
          type: 'follow',
          actorId: userId,
          message: 'Someone started following you'
        }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Follow error:', err);
    res.status(500).json({ error: 'Failed to follow' });
  }
});

/**
 * DELETE /connections/follow/:id - Unfollow
 */
router.delete('/follow/:followingId', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { followingId } = req.params;

    await prisma.userFollow.delete({
      where: { followerId_followingId: { followerId: userId, followingId } }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Unfollow error:', err);
    res.status(500).json({ error: 'Failed to unfollow' });
  }
});

// =============================================================================
// MESSAGING
// =============================================================================

/**
 * GET /connections/conversations - Get user's conversations
 */
router.get('/conversations', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId, hasLeft: false }
        },
        isActive: true
      },
      include: {
        participants: {
          where: { hasLeft: false }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit)
    });

    res.json({ conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * POST /connections/conversations - Start a new conversation
 */
router.post('/conversations', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { participantIds, name, initialMessage } = req.body;

    if (!participantIds || participantIds.length === 0) {
      return void res.status(400).json({ error: 'Participants are required' });
    }

    // Check DM permissions for each participant
    for (const participantId of participantIds) {
      // Check blocks
      const blocked = await prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: participantId },
            { blockerId: participantId, blockedId: userId }
          ]
        }
      });

      if (blocked) {
        return void res.status(403).json({ error: 'Cannot message one or more users' });
      }

      // Check safety settings
      const safetySettings = await prisma.userSafetySettings.findUnique({
        where: { userId: participantId }
      });

      if (safetySettings) {
        if (safetySettings.dmPolicy === 'nobody') {
          return void res.status(403).json({ error: 'User is not accepting messages' });
        }

        if (safetySettings.dmPolicy === 'connections') {
          const isConnected = await prisma.userConnection.findFirst({
            where: {
              status: 'accepted',
              OR: [
                { requesterId: userId, addresseeId: participantId },
                { requesterId: participantId, addresseeId: userId }
              ]
            }
          });

          if (!isConnected) {
            return void res.status(403).json({ error: 'You must be connected to message this user' });
          }
        }

        if (safetySettings.dmPolicy === 'verified_only') {
          const trustScore = await prisma.userTrustScore.findUnique({
            where: { userId }
          });

          if (!trustScore || trustScore.trustLevel !== 'verified') {
            return void res.status(403).json({ error: 'Only verified users can message this user' });
          }
        }
      }
    }

    // Check if direct conversation already exists between two users
    if (participantIds.length === 1) {
      const existingConvo = await prisma.conversation.findFirst({
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

      if (existingConvo && existingConvo.participants.length === 2) {
        return void res.json({ conversation: existingConvo, isExisting: true });
      }
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: participantIds.length > 1 ? 'group' : 'direct',
        name: participantIds.length > 1 ? name : null,
        creatorId: userId,
        participants: {
          create: [
            { userId, role: 'admin' },
            ...participantIds.map(id => ({ userId: id, role: 'member' }))
          ]
        }
      },
      include: {
        participants: true
      }
    });

    // Add initial message if provided
    if (initialMessage) {
      await prisma.directMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          content: initialMessage
        }
      });
    }

    res.status(201).json({ conversation });
  } catch (err) {
    console.error('Start conversation error:', err);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

/**
 * GET /connections/conversations/:id/messages - Get messages in a conversation
 */
router.get('/conversations/:id/messages', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { before, limit = 50 } = req.query;

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } }
    });

    if (!participant || participant.hasLeft) {
      return void res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    const where: any = { conversationId: id, isDeleted: false };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await prisma.directMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    // Mark as read
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId } },
      data: { lastReadAt: new Date(), unreadCount: 0 }
    });

    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /connections/conversations/:id/messages - Send a message
 */
router.post('/conversations/:id/messages', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { content, messageType = 'text', mediaUrl, fileName, fileSize } = req.body;

    if (!content && !mediaUrl) {
      return void res.status(400).json({ error: 'Content or media is required' });
    }

    // Verify participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } }
    });

    if (!participant || participant.hasLeft) {
      return void res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Rate limiting
    const recentMessages = await prisma.directMessage.count({
      where: {
        senderId: userId,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) }
      }
    });

    if (recentMessages >= 10) {
      return void res.status(429).json({ error: 'Too many messages. Please slow down.' });
    }

    const message = await prisma.directMessage.create({
      data: {
        conversationId: id,
        senderId: userId,
        content,
        messageType,
        mediaUrl,
        fileName,
        fileSize
      }
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    });

    // Increment unread count for other participants
    await prisma.conversationParticipant.updateMany({
      where: { conversationId: id, userId: { not: userId }, hasLeft: false },
      data: { unreadCount: { increment: 1 } }
    });

    res.status(201).json({ message });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;


