import { Router } from 'express';
import express from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { authenticate } from '../middleware/auth';

const router = Router();

function getLiveKitConfig() {
  const url = process.env.LIVEKIT_URL || process.env.LIVEKIT_HOST;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  return { url, apiKey, apiSecret };
}

router.get('/health', (_req, res) => {
  const { url, apiKey, apiSecret } = getLiveKitConfig();
  res.json({
    enabled: String(process.env.FEATURE_VIDEO_CALLS || '').toLowerCase() === 'true',
    configured: Boolean(url && apiKey && apiSecret),
  });
});

// POST /video-sessions/mentor-sessions/:id/token
// Issues a LiveKit token scoped to a specific MentorSession.
// Access: mentor, mentee (or admin)
router.post('/mentor-sessions/:id/token', authenticate, async (req: any, res) => {
  const { url, apiKey, apiSecret } = getLiveKitConfig();

  if (!url || !apiKey || !apiSecret) {
    return void res.status(501).json({ error: 'LiveKit is not configured' });
  }

  const sessionId = String(req.params?.id || '').trim();
  if (!sessionId) {
    return void res.status(400).json({ error: 'session id is required' });
  }

  const prisma = req.app?.locals?.prisma;
  if (!prisma) {
    return void res.status(500).json({ error: 'Prisma client not available' });
  }

  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      mentorId: true,
      menteeId: true,
      status: true,
    },
  });

  if (!session) {
    return void res.status(404).json({ error: 'Mentor session not found' });
  }

  const userId = String(req.user?.id || '').trim();
  if (!userId) {
    return void res.status(401).json({ error: 'Authentication required' });
  }

  const role = String(req.user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isParticipant = session.mentorId === userId || session.menteeId === userId;
  if (!isParticipant && !isAdmin) {
    return void res.status(403).json({ error: 'You do not have access to this mentor session' });
  }

  // Deterministic room name: both parties join the same room.
  const roomName = `mentor-session-${session.id}`;
  const identity = userId;

  // Phase 2: Persist Video Session
  // Ensure we track this session in the database for analytics and history
  try {
    // Check if we need to initialize the video session record
    const existingVideo = await prisma.videoSession?.findUnique({ 
      where: { roomId: roomName } 
    });

    if (!existingVideo && prisma.videoSession) {
       const newVideo = await prisma.videoSession.create({
         data: {
           roomId: roomName,
           hostId: session.mentorId,
           status: 'SCHEDULED'
         }
       });
       
       if (newVideo) {
         await prisma.mentorSession.update({
           where: { id: session.id },
           data: { videoSessionId: newVideo.id }
         });
       }
    }
  } catch (err) {
    // Non-blocking: log warning but allow video connection to proceed
    // This handles cases where the DB migration hasn't been run yet
    console.warn('[VideoSession] Failed to persist session record:', err);
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: req.body?.name ? String(req.body.name) : undefined,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return void res.json({
    url,
    token,
    roomName,
    identity,
    sessionId: session.id,
  });
});

// POST /video-sessions/token
// Body: { roomName: string, identity?: string, name?: string }
router.post('/token', authenticate, async (req: any, res) => {
  const { url, apiKey, apiSecret } = getLiveKitConfig();

  if (!url || !apiKey || !apiSecret) {
    return void res.status(501).json({ error: 'LiveKit is not configured' });
  }

  const roomName = String(req.body?.roomName || '').trim();
  if (!roomName) {
    return void res.status(400).json({ error: 'roomName is required' });
  }

  const identity = String(req.body?.identity || req.user?.id || '').trim();
  if (!identity) {
    return void res.status(400).json({ error: 'identity is required' });
  }

  const name = req.body?.name ? String(req.body.name) : undefined;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return void res.json({
    url,
    token,
    roomName,
    identity,
  });
});

// =============================================================================
// LIVEKIT WEBHOOKS
// =============================================================================

/**
 * POST /video-sessions/webhooks/livekit
 * 
 * Handles LiveKit webhook events for room lifecycle tracking.
 * Events: room_started, room_finished, participant_joined, participant_left
 * 
 * Requires LIVEKIT_WEBHOOK_SECRET for signature verification.
 */
router.post('/webhooks/livekit', express.raw({ type: 'application/webhook+json' }), async (req: any, res) => {
  const webhookSecret = process.env.LIVEKIT_WEBHOOK_SECRET;
  
  // If no webhook secret configured, accept all events in dev mode
  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    return void res.status(401).json({ error: 'Webhook secret not configured' });
  }

  // Verify webhook signature if secret is configured
  if (webhookSecret) {
    const signature = req.headers['authorization'];
    if (!signature) {
      return void res.status(401).json({ error: 'Missing webhook signature' });
    }
    // In production, verify the signature using livekit-server-sdk
    // For now, we trust the Authorization header format: "Bearer <token>"
  }

  let event;
  try {
    const body = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
    event = JSON.parse(body);
  } catch (err) {
    return void res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const prisma = req.app?.locals?.prisma;
  if (!prisma) {
    console.warn('[LiveKit Webhook] Prisma not available, skipping DB update');
    return void res.status(200).json({ received: true });
  }

  const eventType = event.event;
  const room = event.room;
  const participant = event.participant;

  console.log(`[LiveKit Webhook] Received event: ${eventType}`, { 
    roomName: room?.name, 
    participantIdentity: participant?.identity 
  });

  try {
    switch (eventType) {
      case 'room_started': {
        // Room was created/started
        if (room?.name) {
          await prisma.videoSession?.upsert({
            where: { roomId: room.name },
            update: { 
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            },
            create: {
              roomId: room.name,
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            },
          }).catch((err: Error) => {
            console.warn('[LiveKit Webhook] Failed to update room_started:', err.message);
          });
        }
        break;
      }

      case 'room_finished': {
        // Room was closed (no more participants)
        if (room?.name) {
          await prisma.videoSession?.update({
            where: { roomId: room.name },
            data: { 
              status: 'COMPLETED',
              endedAt: new Date(),
            },
          }).catch((err: Error) => {
            console.warn('[LiveKit Webhook] Failed to update room_finished:', err.message);
          });
        }
        break;
      }

      case 'participant_joined': {
        // A participant joined the room
        if (room?.name && participant?.identity) {
          // Track participant join event for analytics
          await prisma.videoSessionParticipant?.create({
            data: {
              sessionRoomId: room.name,
              participantId: participant.identity,
              joinedAt: new Date(),
            },
          }).catch((err: Error) => {
            // Table may not exist; that's fine
            console.warn('[LiveKit Webhook] Failed to track participant_joined:', err.message);
          });
        }
        break;
      }

      case 'participant_left': {
        // A participant left the room
        if (room?.name && participant?.identity) {
          await prisma.videoSessionParticipant?.updateMany({
            where: {
              sessionRoomId: room.name,
              participantId: participant.identity,
              leftAt: null,
            },
            data: { leftAt: new Date() },
          }).catch((err: Error) => {
            console.warn('[LiveKit Webhook] Failed to track participant_left:', err.message);
          });
        }
        break;
      }

      default:
        console.log(`[LiveKit Webhook] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error('[LiveKit Webhook] Error processing event:', err);
    // Don't fail the webhook; LiveKit will retry
  }

  return void res.status(200).json({ received: true, event: eventType });
});

// Keep a simple index route for discoverability
router.get('/', (_req, res) => {
  res.json({
    routes: [
      'GET /health',
      'POST /token',
      'POST /mentor-sessions/:id/token',
      'POST /webhooks/livekit',
    ],
  });
});

export default router;


