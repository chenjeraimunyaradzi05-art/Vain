/**
 * Live Streaming & Audio Rooms Routes
 * Phase 8.4: Steps 776-800
 * Handles live streams, audio rooms, and real-time interactions
 */
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { prisma as prismaClient } from '../db';
import authenticateJWT from '../middleware/auth';

const prisma = prismaClient as any;

const router = express.Router();

function getLiveKitConfig() {
  return {
    url: process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST,
    apiKey: process.env.LIVEKIT_API_KEY,
    apiSecret: process.env.LIVEKIT_API_SECRET,
  };
}

function generateRoomName(type: string, id: string) {
  return `${type}-${id}-${Date.now().toString(36)}`;
}

async function generateLiveKitToken(roomName: string, identity: string, isHost: boolean) {
  const { apiKey, apiSecret } = getLiveKitConfig();
  if (!apiKey || !apiSecret) return null;

  const token = new AccessToken(apiKey, apiSecret, { identity });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: isHost,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}

// Helper to get user info
async function getUserInfo(userIds: string[]) {
  if (!userIds.length) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      mentorProfile: { select: { name: true, avatar: true, avatarUrl: true, title: true } },
    },
  });
  return Object.fromEntries(users.map(u => [u.id, {
    name: u.mentorProfile?.name || u.email?.split('@')[0] || 'Anonymous',
    avatar: u.mentorProfile?.avatar || u.mentorProfile?.avatarUrl || null,
    title: u.mentorProfile?.title || null,
  }]));
}

// =============================================================================
// LIVE STREAMS
// =============================================================================

/**
 * GET /live/streams - List live streams
 */
router.get('/streams', async (req, res) => {
  try {
    const { status, category, womenOnly, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;

    const where: any = {};
    
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['scheduled', 'live'] };
    }
    
    if (category) where.category = category;
    if (womenOnly === 'true') where.womenOnly = true;
    
    // Filter by visibility
    if (!userId) {
      where.visibility = 'public';
    } else {
      where.OR = [
        { visibility: 'public' },
        { hostId: userId },
        { coHosts: { some: { userId } } },
      ];
    }

    const [streams, total] = await Promise.all([
      prisma.liveStream.findMany({
        where,
        orderBy: [
          { status: 'asc' }, // live first
          { scheduledAt: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          _count: { select: { viewers: true, coHosts: true } },
        },
      }),
      prisma.liveStream.count({ where }),
    ]);

    // Enrich with host info
    const hostIds : string[] = ([...new Set(streams.map(s => s.hostId))]).filter((id): id is string => id !== null);
    const userInfo = await getUserInfo(hostIds);

    const enrichedStreams = streams.map(stream => ({
      ...stream,
      hostName: userInfo[stream.hostId]?.name || 'Anonymous',
      hostAvatar: userInfo[stream.hostId]?.avatar || null,
    }));

    res.json({ streams: enrichedStreams, total });
  } catch (err) {
    console.error('List streams error:', err);
    res.status(500).json({ error: 'Failed to list streams' });
  }
});

/**
 * POST /live/streams - Create a live stream
 */
router.post('/streams', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      category,
      visibility = 'public',
      scheduledAt,
      allowChat = true,
      allowQuestions = true,
      allowReactions = true,
      allowCoHosts = false,
      womenOnly = false,
      isRecorded = false,
      thumbnailUrl,
    } = req.body;

    if (!title || title.length < 3) {
      return void res.status(400).json({ error: 'Title is required (min 3 characters)' });
    }

    // Women-only verification
    if (womenOnly) {
      const verification = await prisma.womenVerification?.findUnique({
        where: { userId },
      });
      if (!verification?.isVerified) {
        return void res.status(403).json({ error: 'Women verification required for women-only streams' });
      }
    }

    // Generate room name
    const roomName = generateRoomName('stream', userId);

    const stream = await prisma.liveStream.create({
      data: {
        hostId: userId,
        title,
        description,
        category,
        visibility,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'live',
        allowChat,
        allowQuestions,
        allowReactions,
        allowCoHosts,
        womenOnly,
        isRecorded,
        thumbnailUrl,
        roomName,
      },
    });

    res.status(201).json({ stream });
  } catch (err) {
    console.error('Create stream error:', err);
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

/**
 * GET /live/streams/:id - Get stream details
 */
router.get('/streams/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
      include: {
        coHosts: true,
        _count: { select: { viewers: true, chatMessages: true, questions: true } },
      },
    });

    if (!stream) {
      return void res.status(404).json({ error: 'Stream not found' });
    }

    // Check visibility
    if (stream.visibility !== 'public' && stream.hostId !== userId) {
      const isCoHost = stream.coHosts.some(ch => ch.userId === userId);
      if (!isCoHost) {
        return void res.status(404).json({ error: 'Stream not found' });
      }
    }

    // Get host info
    const host = await prisma.user.findUnique({
      where: { id: stream.hostId },
      select: {
        id: true,
        email: true,
        mentorProfile: { select: { name: true, avatar: true, avatarUrl: true, title: true } },
      },
    });

    res.json({
      stream: {
        ...stream,
        hostName: host?.mentorProfile?.name || host?.email?.split('@')[0] || 'Anonymous',
        hostAvatar: host?.mentorProfile?.avatar || host?.mentorProfile?.avatarUrl || null,
        hostTitle: host?.mentorProfile?.title || null,
      },
    });
  } catch (err) {
    console.error('Get stream error:', err);
    res.status(500).json({ error: 'Failed to get stream' });
  }
});

/**
 * POST /live/streams/:id/go-live - Start streaming
 */
router.post('/streams/:id/go-live', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      return void res.status(404).json({ error: 'Stream not found' });
    }

    if (stream.hostId !== userId) {
      return void res.status(403).json({ error: 'Only the host can start the stream' });
    }

    if (stream.status === 'live') {
      return void res.status(400).json({ error: 'Stream is already live' });
    }

    if (stream.status === 'ended') {
      return void res.status(400).json({ error: 'Stream has already ended' });
    }

    // Generate LiveKit token for host
    const token = await generateLiveKitToken(stream.roomName!, userId, true);

    const updatedStream = await prisma.liveStream.update({
      where: { id },
      data: {
        status: 'live',
        startedAt: new Date(),
        roomToken: token,
      },
    });

    res.json({ stream: updatedStream, token });
  } catch (err) {
    console.error('Go live error:', err);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

/**
 * POST /live/streams/:id/end - End stream
 */
router.post('/streams/:id/end', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream || stream.hostId !== userId) {
      return void res.status(404).json({ error: 'Stream not found' });
    }

    const updatedStream = await prisma.liveStream.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });

    res.json({ stream: updatedStream });
  } catch (err) {
    console.error('End stream error:', err);
    res.status(500).json({ error: 'Failed to end stream' });
  }
});

/**
 * POST /live/streams/:id/join - Join as viewer
 */
router.post('/streams/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const guestId = !userId ? `guest-${Date.now().toString(36)}` : undefined;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream || stream.status !== 'live') {
      return void res.status(404).json({ error: 'Stream not found or not live' });
    }

    // Check women-only
    if (stream.womenOnly && userId) {
      const verification = await prisma.womenVerification?.findUnique({
        where: { userId },
      });
      if (!verification?.isVerified) {
        return void res.status(403).json({ error: 'This is a women-only stream' });
      }
    }

    // Create viewer record
    await prisma.streamViewer.create({
      data: {
        streamId: id,
        userId,
        guestId,
      },
    });

    // Update viewer count
    await prisma.liveStream.update({
      where: { id },
      data: {
        viewerCount: { increment: 1 },
      },
    });

    // Generate viewer token (can subscribe only)
    const identity = userId || guestId!;
    const token = await generateLiveKitToken(stream.roomName!, identity, false);

    res.json({ token, streamId: id });
  } catch (err) {
    console.error('Join stream error:', err);
    res.status(500).json({ error: 'Failed to join stream' });
  }
});

/**
 * POST /live/streams/:id/leave - Leave stream
 */
router.post('/streams/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (userId) {
      await prisma.streamViewer.updateMany({
        where: { streamId: id, userId, leftAt: null },
        data: { leftAt: new Date() },
      });

      await prisma.liveStream.update({
        where: { id },
        data: { viewerCount: { decrement: 1 } },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Leave stream error:', err);
    res.status(500).json({ error: 'Failed to leave stream' });
  }
});

/**
 * POST /live/streams/:id/chat - Send chat message
 */
router.post('/streams/:id/chat', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || content.length > 500) {
      return void res.status(400).json({ error: 'Content required (max 500 chars)' });
    }

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream || stream.status !== 'live' || !stream.allowChat) {
      return void res.status(400).json({ error: 'Chat not available' });
    }

    const message = await prisma.streamChatMessage.create({
      data: {
        streamId: id,
        userId,
        content,
      },
    });

    await prisma.liveStream.update({
      where: { id },
      data: { chatCount: { increment: 1 } },
    });

    res.status(201).json({ message });
  } catch (err) {
    console.error('Send chat error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * GET /live/streams/:id/chat - Get chat messages
 */
router.get('/streams/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { before, limit = 50 } = req.query;

    const where: any = { streamId: id, isDeleted: false };
    if (before) {
      where.createdAt = { lt: new Date(before as string) };
    }

    const messages = await prisma.streamChatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // Get user info
    const userIds = [...new Set(messages.map(m => m.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        mentorProfile: { select: { name: true, avatar: true, avatarUrl: true } },
      },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const enriched = messages.map(m => {
      const user = userMap[m.userId];
      return {
        ...m,
        userName: user?.mentorProfile?.name || user?.email?.split('@')[0] || 'Anonymous',
        userAvatar: user?.mentorProfile?.avatar || user?.mentorProfile?.avatarUrl || null,
      };
    });

    res.json({ messages: enriched.reverse() });
  } catch (err) {
    console.error('Get chat error:', err);
    res.status(500).json({ error: 'Failed to get chat' });
  }
});

/**
 * POST /live/streams/:id/questions - Ask a question
 */
router.post('/streams/:id/questions', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { question } = req.body;

    if (!question || question.length > 500) {
      return void res.status(400).json({ error: 'Question required (max 500 chars)' });
    }

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream || stream.status !== 'live' || !stream.allowQuestions) {
      return void res.status(400).json({ error: 'Q&A not available' });
    }

    const q = await prisma.streamQuestion.create({
      data: {
        streamId: id,
        userId,
        question,
      },
    });

    res.status(201).json({ question: q });
  } catch (err) {
    console.error('Ask question error:', err);
    res.status(500).json({ error: 'Failed to ask question' });
  }
});

/**
 * GET /live/streams/:id/questions - Get questions
 */
router.get('/streams/:id/questions', async (req, res) => {
  try {
    const { id } = req.params;

    const questions = await prisma.streamQuestion.findMany({
      where: { streamId: id },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
    });

    res.json({ questions });
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

/**
 * POST /live/streams/:id/questions/:qid/upvote - Upvote a question
 */
router.post('/streams/:id/questions/:qid/upvote', authenticateJWT, async (req, res) => {
  try {
    const { qid } = req.params;

    await prisma.streamQuestion.update({
      where: { id: qid },
      data: { upvotes: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Upvote question error:', err);
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

/**
 * POST /live/streams/:id/react - React to stream
 */
router.post('/streams/:id/react', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body; // like, love, fire, etc.

    await prisma.liveStream.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('React error:', err);
    res.status(500).json({ error: 'Failed to react' });
  }
});

// =============================================================================
// AUDIO ROOMS
// =============================================================================

/**
 * GET /live/rooms - List audio rooms
 */
router.get('/rooms', async (req, res) => {
  try {
    const { status, topic, womenOnly, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;

    const where: any = {};
    
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['scheduled', 'live'] };
    }
    
    if (topic) where.topic = topic;
    if (womenOnly === 'true') where.womenOnly = true;
    
    if (!userId) {
      where.visibility = 'public';
    }

    const [rooms, total] = await Promise.all([
      prisma.audioRoom.findMany({
        where,
        orderBy: [
          { status: 'asc' },
          { scheduledAt: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          _count: { select: { participants: true } },
        },
      }),
      prisma.audioRoom.count({ where }),
    ]);

    // Enrich with host info
    const hostIds = [...new Set(rooms.map(r => r.hostId))];
    const hosts = await prisma.user.findMany({
      where: { id: { in: hostIds } },
      select: {
        id: true,
        email: true,
        mentorProfile: { select: { name: true, avatar: true, avatarUrl: true } },
      },
    });
    const hostMap = Object.fromEntries(hosts.map(h => [h.id, h]));

    const enrichedRooms = rooms.map(room => {
      const host = hostMap[room.hostId];
      return {
        ...room,
        hostName: host?.mentorProfile?.name || host?.email?.split('@')[0] || 'Anonymous',
        hostAvatar: host?.mentorProfile?.avatar || host?.mentorProfile?.avatarUrl || null,
      };
    });

    res.json({ rooms: enrichedRooms, total });
  } catch (err) {
    console.error('List rooms error:', err);
    res.status(500).json({ error: 'Failed to list rooms' });
  }
});

/**
 * POST /live/rooms - Create an audio room
 */
router.post('/rooms', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      topic,
      visibility = 'public',
      scheduledAt,
      allowHandRaise = true,
      maxSpeakers = 10,
      maxListeners,
      womenOnly = false,
      isRecorded = false,
    } = req.body;

    if (!title || title.length < 3) {
      return void res.status(400).json({ error: 'Title is required (min 3 characters)' });
    }

    // Women-only verification
    if (womenOnly) {
      const verification = await prisma.womenVerification?.findUnique({
        where: { userId },
      });
      if (!verification?.isVerified) {
        return void res.status(403).json({ error: 'Women verification required for women-only rooms' });
      }
    }

    const roomName = generateRoomName('audio', userId);

    const room = await prisma.audioRoom.create({
      data: {
        hostId: userId,
        title,
        description,
        topic: topic || null,
        visibility,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'live',
        allowRequests: allowHandRaise,
        maxSpeakers,
        maxListeners,
        womenOnly,
        isRecorded,
        roomName,
        participants: {
          create: { userId, role: 'host', canSpeak: true, canModerate: true },
        },
      },
    });

    res.status(201).json({ room });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

/**
 * GET /live/rooms/:id - Get room details
 */
router.get('/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const room = await prisma.audioRoom.findUnique({
      where: { id },
      include: {
        participants: { where: { role: { in: ['host', 'cohost', 'speaker'] } } },
        _count: { select: { participants: true } },
      },
    });

    if (!room) {
      return void res.status(404).json({ error: 'Room not found' });
    }

    // Get speaker info
    const speakerIds = room.participants.map(s => s.userId);
    const userInfo = await getUserInfo([...speakerIds, room.hostId]);

    const enrichedSpeakers = room.participants.map(s => ({
      ...s,
      name: userInfo[s.userId]?.name || 'Anonymous',
      avatar: userInfo[s.userId]?.avatar || null,
      title: userInfo[s.userId]?.title || null,
    }));

    const host = userInfo[room.hostId];

    res.json({
      room: {
        ...room,
        speakers: enrichedSpeakers,
        hostName: host?.name || 'Anonymous',
        hostAvatar: host?.avatar || null,
      },
    });
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

/**
 * POST /live/rooms/:id/start - Start room
 */
router.post('/rooms/:id/start', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const room = await prisma.audioRoom.findUnique({
      where: { id },
    });

    if (!room || room.hostId !== userId) {
      return void res.status(404).json({ error: 'Room not found' });
    }

    if (room.status === 'live') {
      return void res.status(400).json({ error: 'Room is already live' });
    }

    const token = await generateLiveKitToken(room.roomName!, userId, true);

    const updatedRoom = await prisma.audioRoom.update({
      where: { id },
      data: {
        status: 'live',
        startedAt: new Date(),
        roomToken: token,
      },
    });

    res.json({ room: updatedRoom, token });
  } catch (err) {
    console.error('Start room error:', err);
    res.status(500).json({ error: 'Failed to start room' });
  }
});

/**
 * POST /live/rooms/:id/end - End room
 */
router.post('/rooms/:id/end', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const room = await prisma.audioRoom.findUnique({
      where: { id },
    });

    if (!room || room.hostId !== userId) {
      return void res.status(404).json({ error: 'Room not found' });
    }

    const updatedRoom = await prisma.audioRoom.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: new Date(),
      },
    });

    res.json({ room: updatedRoom });
  } catch (err) {
    console.error('End room error:', err);
    res.status(500).json({ error: 'Failed to end room' });
  }
});

/**
 * POST /live/rooms/:id/join - Join as listener
 */
router.post('/rooms/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const guestId = !userId ? `guest-${Date.now().toString(36)}` : undefined;

    const room = await prisma.audioRoom.findUnique({
      where: { id },
    });

    if (!room || room.status !== 'live') {
      return void res.status(404).json({ error: 'Room not found or not live' });
    }

    // Check max listeners
    if (room.maxListeners && room.listenerCount >= room.maxListeners) {
      return void res.status(400).json({ error: 'Room is full' });
    }

    // Check women-only
    if (room.womenOnly && userId) {
      const verification = await prisma.womenVerification?.findUnique({
        where: { userId },
      });
      if (!verification?.isVerified) {
        return void res.status(403).json({ error: 'This is a women-only room' });
      }
    }

    await prisma.audioRoomParticipant.create({
      data: {
        roomId: id,
        userId: userId || guestId!,
        role: 'listener',
        canSpeak: false,
      },
    });

    await prisma.audioRoom.update({
      where: { id },
      data: {
        listenerCount: { increment: 1 },
      },
    });

    // Generate listener token (subscribe only)
    const identity = userId || guestId!;
    const token = await generateLiveKitToken(room.roomName!, identity, false);

    res.json({ token, roomId: id });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

/**
 * POST /live/rooms/:id/leave - Leave room
 */
router.post('/rooms/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (userId) {
      // Remove from speakers if applicable (not host)
      await prisma.audioRoomParticipant.updateMany({
        where: { roomId: id, userId, role: { not: 'host' } },
        data: { leftAt: new Date(), status: 'left' },
      });

      // Mark listener as left
      await prisma.audioRoomParticipant.updateMany({
        where: { roomId: id, userId, leftAt: null },
        data: { leftAt: new Date() },
      });

      await prisma.audioRoom.update({
        where: { id },
        data: { listenerCount: { decrement: 1 } },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Leave room error:', err);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

/**
 * POST /live/rooms/:id/raise-hand - Raise hand to speak
 */
router.post('/rooms/:id/raise-hand', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const room = await prisma.audioRoom.findUnique({
      where: { id },
    });

    if (!room || room.status !== 'live' || !room.allowHandRaise) {
      return void res.status(400).json({ error: 'Cannot raise hand' });
    }

    // Check if already a speaker
    const existingSpeaker = await prisma.audioRoomParticipant.findFirst({
      where: { roomId: id, userId, role: { in: ['host', 'cohost', 'speaker'] } },
    });

    if (existingSpeaker) {
      return void res.status(400).json({ error: 'Already a speaker' });
    }

    // Update participant to have handRaised
    await prisma.audioRoomParticipant.updateMany({
      where: { roomId: id, userId },
      data: { handRaised: true },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Raise hand error:', err);
    res.status(500).json({ error: 'Failed to raise hand' });
  }
});

/**
 * POST /live/rooms/:id/lower-hand - Lower hand
 */
router.post('/rooms/:id/lower-hand', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await prisma.audioRoomParticipant.updateMany({
      where: { roomId: id, userId },
      data: { handRaised: false },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Lower hand error:', err);
    res.status(500).json({ error: 'Failed to lower hand' });
  }
});

/**
 * GET /live/rooms/:id/hand-raises - Get hand raises (host only)
 */
router.get('/rooms/:id/hand-raises', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const room = await prisma.audioRoom.findUnique({
      where: { id },
    });

    if (!room || room.hostId !== userId) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    const handRaises = await prisma.audioRoomParticipant.findMany({
      where: { roomId: id, handRaised: true },
      orderBy: { joinedAt: 'asc' },
    });

    // Get user info
    const userIds = handRaises.map(h => h.userId);
    const userInfo = await getUserInfo(userIds);

    const enriched = handRaises.map(h => ({
      ...h,
      name: userInfo[h.userId]?.name || 'Anonymous',
      avatar: userInfo[h.userId]?.avatar || null,
    }));

    res.json({ handRaises: enriched });
  } catch (err) {
    console.error('Get hand raises error:', err);
    res.status(500).json({ error: 'Failed to get hand raises' });
  }
});

/**
 * POST /live/rooms/:id/invite-speaker - Invite user to speak (host only)
 */
router.post('/rooms/:id/invite-speaker', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { speakerId } = req.body;

    const room = await prisma.audioRoom.findUnique({
      where: { id },
      include: { participants: { where: { role: { in: ['host', 'cohost', 'speaker'] } } } },
    });

    if (!room || room.hostId !== userId) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    if (room.participants.length >= room.maxSpeakers) {
      return void res.status(400).json({ error: 'Max speakers reached' });
    }

    // Update participant to speaker role
    await prisma.audioRoomParticipant.updateMany({
      where: { roomId: id, userId: speakerId },
      data: { role: 'speaker', canSpeak: true, handRaised: false },
    });

    // Update speaker count
    await prisma.audioRoom.update({
      where: { id },
      data: { speakerCount: { increment: 1 } },
    });

    // Generate speaker token (can publish)
    const token = await generateLiveKitToken(room.roomName!, speakerId, true);

    res.json({ success: true, token });
  } catch (err) {
    console.error('Invite speaker error:', err);
    res.status(500).json({ error: 'Failed to invite speaker' });
  }
});

/**
 * POST /live/rooms/:id/remove-speaker - Remove speaker (host only)
 */
router.post('/rooms/:id/remove-speaker', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { speakerId } = req.body;

    const room = await prisma.audioRoom.findUnique({
      where: { id },
    });

    if (!room || room.hostId !== userId) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    if (speakerId === room.hostId) {
      return void res.status(400).json({ error: 'Cannot remove host' });
    }

    // Demote to listener
    await prisma.audioRoomParticipant.updateMany({
      where: { roomId: id, userId: speakerId },
      data: { role: 'listener', canSpeak: false },
    });

    await prisma.audioRoom.update({
      where: { id },
      data: { speakerCount: { decrement: 1 } },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Remove speaker error:', err);
    res.status(500).json({ error: 'Failed to remove speaker' });
  }
});

export default router;

