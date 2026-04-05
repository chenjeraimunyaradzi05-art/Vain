import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { BadRequestError, NotFoundError, ForbiddenError } from '../lib/errors';
import { z } from 'zod';
import { notificationService } from '../services/notificationService';
import { queueEmail } from '../lib/emailQueue';

const router = Router();

// =============================================================================
// Mentor Profile & Availability
// =============================================================================

router.get('/mentor/profile', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const profile = await prisma.mentorProfile.findUnique({
      where: { userId },
    });
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.put('/mentor/profile', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const data: any = {
      bio: req.body?.bio,
      skills: Array.isArray(req.body?.skills) ? req.body.skills.join(',') : req.body?.skills,
      availability: req.body?.availability,
      maxCapacity: req.body?.maxMentees ? Number(req.body.maxMentees) : undefined,
      title: req.body?.title,
    };

    const profile = await prisma.mentorProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: { ...data },
    });

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

router.put('/mentor/availability', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const slots = Array.isArray(req.body?.slots) ? req.body.slots : [];
    const timezone = String(req.body?.timezone || 'Australia/Sydney');

    await prisma.mentorAvailabilitySlot.deleteMany({
      where: { mentorId: userId },
    });

    if (slots.length > 0) {
      await prisma.mentorAvailabilitySlot.createMany({
        data: slots.map((slot: any) => ({
          mentorId: userId,
          dayOfWeek: Number(slot.dayOfWeek),
          startTime: String(slot.startTime),
          endTime: String(slot.endTime),
          timezone,
        })),
      });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Validation schemas
const mentorshipRequestSchema = z.object({
  mentorId: z.string().uuid(),
  message: z.string().min(10).max(1000).optional(),
  goals: z.array(z.string()).optional(),
});

const mentorshipUpdateSchema = z.object({
  status: z.enum(['pending', 'active', 'completed', 'cancelled']).optional(),
  notes: z.string().max(2000).optional(),
});

const mentorshipSessionSchema = z.object({
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(180), // minutes
  topic: z.string().min(3).max(200),
  notes: z.string().max(1000).optional(),
  meetingLink: z.string().url().optional(),
});

// MentorSession (Phase B) schemas (used by /mentorship/sessions/* on the web)
const mentorSessionCreateSchema = z.object({
  mentorId: z.string().min(1),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(180),
  topic: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

const mentorSessionNotesSchema = z.object({
  notes: z.string().max(5000),
});

const mentorSessionRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(5000).optional(),
});

const mentorSessionFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  feedback: z.string().max(5000).optional(),
  wouldRecommend: z.boolean().nullable().optional(),
  topicsDiscussed: z.array(z.string()).optional(),
});

/**
 * @route GET /mentorship
 * @desc List mentorship connections
 * @access Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;
    const { role, status, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filters
    const where: Record<string, unknown> = {};

    // Admins can see all, others see their own
    if (userRole !== 'admin') {
      if (role === 'mentor') {
        where.mentorId = userId;
      } else if (role === 'mentee') {
        where.menteeId = userId;
      } else {
        where.OR = [{ mentorId: userId }, { menteeId: userId }];
      }
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    const [mentorships, total] = await Promise.all([
      prisma.mentorship.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          mentor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              bio: true,
              skills: true,
            },
          },
          mentee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              bio: true,
              interests: true,
            },
          },
          _count: {
            select: { sessions: true },
          },
        },
      }),
      prisma.mentorship.count({ where }),
    ]);

    res.json({
      data: mentorships,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/sessions
 * @desc List mentor sessions for the current user
 * @access Private (Participants)
 */
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;

    const sessions = await prisma.mentorSession.findMany({
      where: {
        OR: [{ mentorId: userId }, { menteeId: userId }],
      },
      orderBy: { scheduledAt: 'desc' },
      include: {
        mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
        mentee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /mentorship/sessions
 * @desc Create a mentor session (book a session)
 * @access Private
 */
router.post('/sessions', authenticate, validateRequest(z.object({ body: mentorSessionCreateSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const menteeId = (req as any).user!.id;
    const { mentorId, scheduledAt, duration, topic, notes } = req.body;

    const mentor = await prisma.user.findUnique({
      where: { id: mentorId },
      select: { id: true, userType: true },
    });

    if (!mentor) {
      throw new NotFoundError('Mentor');
    }

    if (mentor.userType !== 'MENTOR') {
      throw new BadRequestError('Selected user is not a mentor');
    }

    if (mentorId === menteeId) {
      throw new BadRequestError('You cannot book a session with yourself');
    }

    const session = await prisma.mentorSession.create({
      data: {
        mentorId,
        menteeId,
        scheduledAt: new Date(scheduledAt),
        duration,
        status: 'SCHEDULED',
        topic,
        notes,
      },
      include: {
        mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
        mentee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/sessions/:sessionId
 * @desc Get mentor session details
 * @access Private (Participants)
 */
router.get('/sessions/:sessionId', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const { sessionId } = req.params;

    const session = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
        mentee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    if (!session) {
      throw new NotFoundError('Session');
    }

    const isParticipant = session.mentorId === userId || session.menteeId === userId;
    if (!isParticipant) {
      throw new ForbiddenError('You do not have access to this session');
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /mentorship/sessions/:sessionId/notes
 * @desc Update session notes
 * @access Private (Participants)
 */
router.patch('/sessions/:sessionId/notes', authenticate, validateRequest(z.object({ body: mentorSessionNotesSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const { sessionId } = req.params;
    const { notes } = req.body;

    const existing = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { id: true, mentorId: true, menteeId: true },
    });

    if (!existing) {
      throw new NotFoundError('Session');
    }

    const isParticipant = existing.mentorId === userId || existing.menteeId === userId;
    if (!isParticipant) {
      throw new ForbiddenError('You do not have access to this session');
    }

    const session = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: { notes },
      include: {
        mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
        mentee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /mentorship/sessions/:sessionId/cancel
 * @desc Cancel a mentor session
 * @access Private (Participants)
 */
router.post('/sessions/:sessionId/cancel', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const { sessionId } = req.params;

    const existing = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { id: true, mentorId: true, menteeId: true },
    });

    if (!existing) {
      throw new NotFoundError('Session');
    }

    const isParticipant = existing.mentorId === userId || existing.menteeId === userId;
    if (!isParticipant) {
      throw new ForbiddenError('You do not have access to this session');
    }

    const session = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
      include: {
        mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
        mentee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /mentorship/sessions/:sessionId/rate
 * @desc Rate a mentor session
 * @access Private (Participants)
 */
router.post('/sessions/:sessionId/rate', authenticate, validateRequest(z.object({ body: mentorSessionRatingSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;

    const existing = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { id: true, mentorId: true, menteeId: true },
    });

    if (!existing) {
      throw new NotFoundError('Session');
    }

    const isParticipant = existing.mentorId === userId || existing.menteeId === userId;
    if (!isParticipant) {
      throw new ForbiddenError('You do not have access to this session');
    }

    const session = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: { rating, feedback },
      include: {
        mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
        mentee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /mentorship/sessions/:sessionId/feedback
 * @desc Submit session feedback (richer payload)
 * @access Private (Participants)
 */
router.post('/sessions/:sessionId/feedback', authenticate, validateRequest(z.object({ body: mentorSessionFeedbackSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const { sessionId } = req.params;
    const { rating, feedback, wouldRecommend, topicsDiscussed } = req.body;

    const existing = await prisma.mentorSession.findUnique({
      where: { id: sessionId },
      select: { id: true, mentorId: true, menteeId: true },
    });

    if (!existing) {
      throw new NotFoundError('Session');
    }

    const isParticipant = existing.mentorId === userId || existing.menteeId === userId;
    if (!isParticipant) {
      throw new ForbiddenError('You do not have access to this session');
    }

    const feedbackPayload = {
      feedback,
      wouldRecommend,
      topicsDiscussed,
      submittedAt: new Date().toISOString(),
    };

    const session = await prisma.mentorSession.update({
      where: { id: sessionId },
      data: {
        rating,
        feedback: typeof feedbackPayload === 'string' ? feedbackPayload : JSON.stringify(feedbackPayload),
      },
      include: {
        mentor: { select: { id: true, name: true, email: true, avatarUrl: true } },
        mentee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /mentorship/request
 * @desc Request mentorship from a mentor
 * @access Private
 */
router.post('/request', authenticate, validateRequest(z.object({ body: mentorshipRequestSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const menteeId = (req as any).user!.id;
    const { mentorId, message, goals } = req.body;

    // Check mentor exists and is a mentor
    const mentor = await prisma.user.findUnique({
      where: { id: mentorId },
    });

    if (!mentor) {
      throw new NotFoundError('Mentor');
    }

    if (mentor.role !== 'mentor') {
      throw new BadRequestError('Selected user is not a mentor');
    }

    if (mentorId === menteeId) {
      throw new BadRequestError('You cannot request mentorship from yourself');
    }

    // Check for existing active mentorship
    const existing = await prisma.mentorship.findFirst({
      where: {
        mentorId,
        menteeId,
        status: { in: ['pending', 'active'] },
      },
    });

    if (existing) {
      throw new BadRequestError('You already have a pending or active mentorship with this mentor');
    }

    const mentorship = await prisma.mentorship.create({
      data: {
        mentorId,
        menteeId,
        message,
        goals,
        status: 'pending',
      },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Send notification to mentor about the new request
    try {
      const mentee = await prisma.user.findUnique({
        where: { id: menteeId },
        select: { firstName: true, lastName: true }
      });
      const menteeName = `${mentee?.firstName || ''} ${mentee?.lastName || ''}`.trim() || 'A member';

      if (mentorship.mentor?.id) {
        await notificationService.send({
          userId: mentorship.mentor.id,
          type: 'MENTORSHIP_REQUEST',
          title: 'New Mentorship Request',
          body: `${menteeName} would like you to be their mentor`,
          data: { mentorshipId: mentorship.id, menteeId },
          actionUrl: `/mentorship/${mentorship.id}`,
          priority: 'MEDIUM'
        });

        if (mentorship.mentor.email) {
          await queueEmail({
            to: mentorship.mentor.email,
            subject: 'New Mentorship Request - Ngurra Pathways',
            template: 'mentorship-request',
            templateData: {
              recipientName: mentorship.mentor.firstName,
              menteeName,
              message: message || 'No message provided',
              goals: goals?.join(', ') || 'Not specified',
              mentorshipUrl: `${process.env.WEB_URL || 'https://ngurrapathways.com.au'}/mentorship/${mentorship.id}`
            },
            userId: mentorship.mentor.id,
            type: 'MENTORSHIP_REQUEST'
          });
        }
      }
    } catch (notifyError) {
      console.error('Failed to send mentorship request notification:', notifyError);
    }

    res.status(201).json({ data: mentorship });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/:id
 * @desc Get mentorship details
 * @access Private (Participants, Admin)
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;

    const mentorship = await prisma.mentorship.findUnique({
      where: { id },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            skills: true,
            email: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            bio: true,
            interests: true,
            email: true,
          },
        },
        sessions: {
          orderBy: { scheduledAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!mentorship) {
      throw new NotFoundError('Mentorship');
    }

    // Check access
    const isParticipant = mentorship.mentorId === userId || mentorship.menteeId === userId;
    const isAdmin = userRole === 'admin';

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenError('You do not have access to this mentorship');
    }

    res.json({ data: mentorship });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PATCH /mentorship/:id
 * @desc Update mentorship (accept/reject/complete)
 * @access Private (Mentor for accept/reject, Both for complete)
 */
router.patch('/:id', authenticate, validateRequest(z.object({ body: mentorshipUpdateSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const userRole = (req as any).user!.role;
    const { status, notes } = req.body;

    const mentorship = await prisma.mentorship.findUnique({
      where: { id },
    });

    if (!mentorship) {
      throw new NotFoundError('Mentorship');
    }

    // Check access and validate status transitions
    const isMentor = mentorship.mentorId === userId;
    const isMentee = mentorship.menteeId === userId;
    const isAdmin = userRole === 'admin';

    if (!isMentor && !isMentee && !isAdmin) {
      throw new ForbiddenError('You do not have access to this mentorship');
    }

    // Validate status transitions
    if (status) {
      const validTransitions: Record<string, string[]> = {
        pending: ['active', 'cancelled'],
        active: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      };

      if (!validTransitions[mentorship.status]?.includes(status)) {
        throw new BadRequestError(`Cannot transition from ${mentorship.status} to ${status}`);
      }

      // Only mentor can accept (pending -> active)
      if (mentorship.status === 'pending' && status === 'active' && !isMentor && !isAdmin) {
        throw new ForbiddenError('Only the mentor can accept mentorship requests');
      }
    }

    const updatedMentorship = await prisma.mentorship.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes && { notes }),
      },
      include: {
        mentor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        mentee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send notification about status change to the other participant
    try {
      const otherUserId = userId === updatedMentorship.mentorId 
        ? updatedMentorship.menteeId 
        : updatedMentorship.mentorId;
      
      const otherUser = userId === updatedMentorship.mentorId 
        ? updatedMentorship.mentee 
        : updatedMentorship.mentor;
      
      const senderName = userId === updatedMentorship.mentorId
        ? `${updatedMentorship.mentor.firstName} ${updatedMentorship.mentor.lastName}`.trim()
        : `${updatedMentorship.mentee.firstName} ${updatedMentorship.mentee.lastName}`.trim();

      const statusMessages: Record<string, string> = {
        active: 'Your mentorship request has been accepted!',
        completed: 'Your mentorship has been marked as completed',
        cancelled: 'The mentorship has been cancelled'
      };

      if (status && otherUserId) {
        await notificationService.send({
          userId: otherUserId,
          type: status === 'active' ? 'MENTORSHIP_REQUEST' : 'MENTORSHIP_SESSION',
          title: statusMessages[status] || 'Mentorship Update',
          body: `Mentorship with ${senderName}`,
          data: { mentorshipId: id, status },
          actionUrl: `/mentorship/${id}`,
          priority: status === 'active' ? 'HIGH' : 'MEDIUM'
        });
      }
    } catch (notifyError) {
      console.error('Failed to send mentorship status notification:', notifyError);
    }

    res.json({ data: updatedMentorship });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /mentorship/:id/sessions
 * @desc Schedule a mentorship session
 * @access Private (Participants)
 */
router.get('/:id/sessions', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;
    const userId = (req as any).user!.id;

    const mentorship = await prisma.mentorship.findUnique({
      where: { id },
    });

    if (!mentorship) {
      throw new NotFoundError('Mentorship');
    }

    const isParticipant = mentorship.mentorId === userId || mentorship.menteeId === userId;
    const isAdmin = (req as any).user?.userType === 'ADMIN' || (req as any).user?.role === 'ADMIN';

    if (!isParticipant && !isAdmin) {
      throw new ForbiddenError('You do not have access to this mentorship');
    }

    const sessions = await prisma.mentorshipSession.findMany({
      where: { mentorshipId: id },
      orderBy: { scheduledAt: 'desc' },
    });

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/sessions', authenticate, validateRequest(z.object({ body: mentorshipSessionSchema })), async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const { scheduledAt, duration, topic, notes, meetingLink } = req.body;

    const mentorship = await prisma.mentorship.findUnique({
      where: { id },
    });

    if (!mentorship) {
      throw new NotFoundError('Mentorship');
    }

    // Check access
    const isParticipant = mentorship.mentorId === userId || mentorship.menteeId === userId;

    if (!isParticipant) {
      throw new ForbiddenError('You do not have access to this mentorship');
    }

    if (mentorship.status !== 'active') {
      throw new BadRequestError('Can only schedule sessions for active mentorships');
    }

    const session = await prisma.mentorshipSession.create({
      data: {
        mentorshipId: id,
        scheduledAt: new Date(scheduledAt),
        duration,
        topic,
        notes,
        meetingLink,
        scheduledById: userId,
        status: 'scheduled',
      },
    });

    // Send session notification and calendar invite
    try {
      const otherUserId = userId === mentorship.mentorId 
        ? mentorship.menteeId 
        : mentorship.mentorId;
      
      const scheduler = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true }
      });
      const schedulerName = `${scheduler?.firstName || ''} ${scheduler?.lastName || ''}`.trim() || 'Your mentor/mentee';
      
      const otherUser = await prisma.user.findUnique({
        where: { id: otherUserId },
        select: { id: true, email: true, firstName: true }
      });

      if (otherUser) {
        // Send in-app notification
        await notificationService.send({
          userId: otherUser.id,
          type: 'MENTORSHIP_SESSION',
          title: 'Mentorship Session Scheduled',
          body: `${schedulerName} scheduled a session: ${topic}`,
          data: { 
            mentorshipId: id, 
            sessionId: session.id,
            scheduledAt,
            duration,
            meetingLink 
          },
          actionUrl: `/mentorship/${id}/sessions/${session.id}`,
          priority: 'HIGH'
        });

        // Send email with calendar invite
        if (otherUser.email) {
          await queueEmail({
            to: otherUser.email,
            subject: `Mentorship Session Scheduled: ${topic}`,
            template: 'session-scheduled',
            templateData: {
              recipientName: otherUser.firstName,
              schedulerName,
              topic,
              scheduledAt: new Date(scheduledAt).toLocaleString('en-AU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
              }),
              duration: `${duration} minutes`,
              meetingLink: meetingLink || 'To be confirmed',
              notes: notes || '',
              sessionUrl: `${process.env.WEB_URL || 'https://ngurrapathways.com.au'}/mentorship/${id}/sessions/${session.id}`
            },
            userId: otherUser.id,
            type: 'MENTORSHIP_SESSION'
          });
        }
      }
    } catch (notifyError) {
      console.error('Failed to send session notification:', notifyError);
    }

    res.status(201).json({ data: session });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /mentorship/:id/feedback
 * @desc Submit feedback for a mentorship session
 * @access Private (Participants)
 */
router.post('/:id/feedback', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;
    const userId = (req as any).user!.id;
    const rating = Number(req.body?.rating);
    const comment = req.body?.feedback ? String(req.body.feedback) : undefined;
    const sessionId = req.body?.sessionId ? String(req.body.sessionId) : null;

    if (!sessionId || Number.isNaN(rating) || rating < 1 || rating > 5) {
      throw new BadRequestError('Invalid feedback payload');
    }

    const session = await prisma.mentorshipSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.mentorshipId !== id) {
      throw new NotFoundError('Mentorship session');
    }

    const mentorship = await prisma.mentorship.findUnique({
      where: { id },
    });

    if (!mentorship) {
      throw new NotFoundError('Mentorship');
    }

    const isParticipant = mentorship.mentorId === userId || mentorship.menteeId === userId;
    if (!isParticipant) {
      throw new ForbiddenError('You do not have access to this mentorship');
    }

    const toUserId = mentorship.mentorId === userId ? mentorship.menteeId : mentorship.mentorId;

    const feedback = await prisma.sessionFeedback.upsert({
      where: {
        sessionId_fromUserId: {
          sessionId,
          fromUserId: userId,
        },
      },
      create: {
        sessionId,
        fromUserId: userId,
        toUserId,
        rating,
        comment,
      },
      update: {
        rating,
        comment,
      },
    });

    res.status(201).json({ feedback });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/mentors
 * @desc List available mentors
 * @access Public
 */
router.get('/mentors', async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { skills, location, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {
      userType: 'MENTOR',
    };

    const [mentors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          avatarUrl: true,
          bio: true,
          skills: true,
          location: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: mentors.map(m => ({
        ...m,
        name: m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/mentors/:id
 * @desc Get a specific mentor's profile
 * @access Public
 */
router.get('/mentors/:id', async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;

    const mentor = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        skills: true,
        location: true,
        userType: true,
      },
    });

    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    res.json({
      data: {
        ...mentor,
        name: mentor.name || `${mentor.firstName || ''} ${mentor.lastName || ''}`.trim(),
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/mentors/:id/reviews
 * @desc Get reviews for a mentor
 * @access Public
 */
router.get('/mentors/:id/reviews', async (req, res, next) => {
  try {
    const { id } = req.params;
    // Return empty reviews for now - can be implemented later
    res.json({ data: [], total: 0 });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/mentors/:id/slots
 * @desc Get available booking slots for a mentor
 * @access Private
 */
router.get('/mentors/:id/slots', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;

    const slots = await prisma.mentorAvailabilitySlot.findMany({
      where: { 
        mentorId: id,
        startTime: { gte: new Date() }
      },
      orderBy: { startTime: 'asc' },
      take: 50,
    });

    res.json({ data: slots });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/mentors/:id/availability
 * @desc Get mentor availability calendar
 * @access Public
 */
router.get('/mentors/:id/availability', async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { id } = req.params;

    const slots = await prisma.mentorAvailabilitySlot.findMany({
      where: { 
        mentorId: id,
        startTime: { gte: new Date() }
      },
      orderBy: { startTime: 'asc' },
      take: 100,
    });

    res.json({ data: slots });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/matches
 * @desc Get mentorship matches for the current user
 * @access Private
 */
router.get('/matches', authenticate, async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;

    const mentorships = await prisma.mentorship.findMany({
      where: {
        OR: [
          { mentorId: userId },
          { menteeId: userId }
        ]
      },
      include: {
        mentor: {
          select: { id: true, firstName: true, lastName: true, name: true, avatarUrl: true }
        },
        mentee: {
          select: { id: true, firstName: true, lastName: true, name: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: mentorships });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /mentorship/mentors/available
 * @desc List available mentors (legacy route)
 * @access Public
 */
router.get('/mentors/available', async (req, res, next) => {
  try {
    const { prisma } = req.app.locals;
    const { skills, location, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {
      role: 'mentor',
      isActive: true,
    };

    if (skills && typeof skills === 'string') {
      where.skills = { hasSome: skills.split(',') };
    }

    if (location && typeof location === 'string') {
      where.location = { contains: location, mode: 'insensitive' };
    }

    const [mentors, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          bio: true,
          skills: true,
          location: true,
          _count: {
            select: {
              mentorshipsAsMentor: {
                where: { status: 'active' },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: mentors,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// =============================================================================
// Phase 7: Mentorship & Community Enhancements
// =============================================================================

// Preferences & availability (lightweight scheduling preferences)
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;

    const settings = await prisma.userSchedulingSettings.findUnique({
      where: { userId },
    });

    res.json({
      preferences: {
        timezone: settings?.timezone || 'Australia/Sydney',
        availabilitySlots: settings?.availabilitySlots ? JSON.parse(settings.availabilitySlots) : [],
        defaultDuration: settings?.defaultDuration || 30,
        bufferBefore: settings?.bufferBefore || 5,
        bufferAfter: settings?.bufferAfter || 5,
        autoConfirm: settings?.autoConfirm || false,
        allowReschedule: settings?.allowReschedule ?? true,
        maxDailyMeetings: settings?.maxDailyMeetings || 8,
      },
    });
  } catch (error) {
    console.error('[Mentorship] Preferences error:', error);
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

router.post('/preferences', authenticate, async (req, res) => {
  try {
    const { prisma } = req.app.locals;
    const userId = (req as any).user!.id;
    const {
      timezone,
      availabilitySlots,
      defaultDuration,
      bufferBefore,
      bufferAfter,
      autoConfirm,
      allowReschedule,
      maxDailyMeetings,
    } = req.body || {};

    const settings = await prisma.userSchedulingSettings.upsert({
      where: { userId },
      create: {
        userId,
        timezone: timezone || 'Australia/Sydney',
        availabilitySlots: availabilitySlots ? JSON.stringify(availabilitySlots) : null,
        defaultDuration: defaultDuration || 30,
        bufferBefore: bufferBefore || 5,
        bufferAfter: bufferAfter || 5,
        autoConfirm: !!autoConfirm,
        allowReschedule: allowReschedule !== false,
        maxDailyMeetings: maxDailyMeetings || 8,
      },
      update: {
        timezone: timezone || undefined,
        availabilitySlots: availabilitySlots ? JSON.stringify(availabilitySlots) : undefined,
        defaultDuration: defaultDuration || undefined,
        bufferBefore: bufferBefore || undefined,
        bufferAfter: bufferAfter || undefined,
        autoConfirm: autoConfirm !== undefined ? !!autoConfirm : undefined,
        allowReschedule: allowReschedule !== undefined ? !!allowReschedule : undefined,
        maxDailyMeetings: maxDailyMeetings || undefined,
      },
    });

    res.json({
      preferences: {
        timezone: settings.timezone,
        availabilitySlots: settings.availabilitySlots ? JSON.parse(settings.availabilitySlots) : [],
        defaultDuration: settings.defaultDuration,
        bufferBefore: settings.bufferBefore,
        bufferAfter: settings.bufferAfter,
        autoConfirm: settings.autoConfirm,
        allowReschedule: settings.allowReschedule,
        maxDailyMeetings: settings.maxDailyMeetings,
      },
    });
  } catch (error) {
    console.error('[Mentorship] Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Mentor network visualization
router.get('/network', authenticate, async (req, res) => {
  try {
    const { prisma } = req.app.locals;
    const mentorships = await prisma.mentorship.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        mentor: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        mentee: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });

    const nodeMap = new Map<string, any>();
    const edges = mentorships.map((m) => {
      const mentorName = `${m.mentor?.firstName || ''} ${m.mentor?.lastName || ''}`.trim();
      const menteeName = `${m.mentee?.firstName || ''} ${m.mentee?.lastName || ''}`.trim();

      if (m.mentor?.id && !nodeMap.has(m.mentor.id)) {
        nodeMap.set(m.mentor.id, { id: m.mentor.id, name: mentorName || 'Mentor', avatar: m.mentor.avatar });
      }
      if (m.mentee?.id && !nodeMap.has(m.mentee.id)) {
        nodeMap.set(m.mentee.id, { id: m.mentee.id, name: menteeName || 'Mentee', avatar: m.mentee.avatar });
      }

      return {
        id: m.id,
        source: m.mentorId,
        target: m.menteeId,
        status: m.status,
      };
    });

    res.json({ nodes: Array.from(nodeMap.values()), edges });
  } catch (error) {
    console.error('[Mentorship] Network error:', error);
    res.status(500).json({ error: 'Failed to load network' });
  }
});

// Peer mentoring circles
router.get('/circles', authenticate, async (req, res) => {
  try {
    const { prisma } = req.app.locals;
    const mentors = await prisma.mentorProfile.findMany({
      take: 30,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    const circles = mentors.reduce((acc: any[], mentor) => {
      const topic = mentor.industry || 'Community Support';
      let circle = acc.find((c) => c.topic === topic);
      if (!circle) {
        circle = { id: `circle-${acc.length + 1}`, topic, members: [] };
        acc.push(circle);
      }
      circle.members.push({
        id: mentor.userId,
        name: mentor.user?.name || mentor.user?.email,
        avatarUrl: mentor.user?.avatarUrl || null,
      });
      return acc;
    }, []);

    res.json({ circles });
  } catch (error) {
    console.error('[Mentorship] Circles error:', error);
    res.status(500).json({ error: 'Failed to load circles' });
  }
});

router.post('/circles/:id/join', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true, circleId: id, status: 'JOINED' });
  } catch (error) {
    console.error('[Mentorship] Join circle error:', error);
    res.status(500).json({ error: 'Failed to join circle' });
  }
});

router.post('/circles/:id/leave', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true, circleId: id, status: 'LEFT' });
  } catch (error) {
    console.error('[Mentorship] Leave circle error:', error);
    res.status(500).json({ error: 'Failed to leave circle' });
  }
});

// Group mentorship sessions
router.get('/groups', authenticate, async (_req, res) => {
  res.json({
    groups: [
      {
        id: 'group-1',
        title: 'Women in Tech Circle',
        topic: 'Career growth and confidence',
        nextSession: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
        capacity: 12,
        spotsLeft: 4,
      },
      {
        id: 'group-2',
        title: 'Community Leadership Yarning',
        topic: 'Leadership and community impact',
        nextSession: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
        capacity: 10,
        spotsLeft: 2,
      },
    ],
  });
});

router.post('/groups/:id/rsvp', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true, groupId: id, status: 'RSVPED' });
  } catch (error) {
    console.error('[Mentorship] RSVP group error:', error);
    res.status(500).json({ error: 'Failed to RSVP to group' });
  }
});

router.post('/groups/:id/rsvp/cancel', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    res.json({ success: true, groupId: id, status: 'CANCELLED' });
  } catch (error) {
    console.error('[Mentorship] Cancel RSVP error:', error);
    res.status(500).json({ error: 'Failed to cancel RSVP' });
  }
});

// Reverse mentoring recommendations
router.get('/reverse', authenticate, async (req, res) => {
  try {
    const { prisma } = req.app.locals;
    const mentors = await prisma.mentorProfile.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    });

    res.json({
      matches: mentors.map((mentor) => ({
        id: mentor.userId,
        name: mentor.user?.name || mentor.user?.email,
        specialty: mentor.skills || mentor.expertise || 'Peer mentoring',
        reason: 'Reverse mentoring match based on emerging skills',
      })),
    });
  } catch (error) {
    console.error('[Mentorship] Reverse mentoring error:', error);
    res.status(500).json({ error: 'Failed to load reverse mentoring matches' });
  }
});

router.post('/reverse/request', authenticate, async (req, res) => {
  try {
    const { matchId } = req.body || {};
    if (!matchId) {
      return void res.status(400).json({ error: 'matchId is required' });
    }
    res.json({ success: true, matchId, status: 'REQUESTED' });
  } catch (error) {
    console.error('[Mentorship] Reverse request error:', error);
    res.status(500).json({ error: 'Failed to request reverse mentoring' });
  }
});

export default router;

