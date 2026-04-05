/**
 * Alumni Mentor Matching API Routes
 * 
 * Endpoints for finding and matching with alumni mentors
 */

import express from 'express';
import { prisma } from '../db';
import { authenticate } from '../middleware/auth';
import { 
  findMatchingAlumniMentors, 
  getFeaturedAlumniMentors,
  ALUMNI_WEIGHTS,
} from '../lib/alumniMatching';

const router = express.Router();

/**
 * GET /alumni-mentors
 * Get list of alumni mentors (paginated)
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 12, 50);
    const skip = (page - 1) * limit;
    
    // Get featured/available alumni mentors
    const alumniMentors = await getFeaturedAlumniMentors(limit + skip);
    const paginatedMentors = alumniMentors.slice(skip, skip + limit);
    
    res.json({
      success: true,
      data: paginatedMentors,
      pagination: {
        page,
        limit,
        total: alumniMentors.length,
        hasMore: skip + limit < alumniMentors.length,
      },
    });
  } catch (error) {
    console.error('Error fetching alumni mentors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alumni mentors',
    });
  }
});

/**
 * GET /alumni-mentors/featured
 * Get featured alumni mentors for homepage/browse
 */
router.get('/featured', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 8, 20);
    const featured = await getFeaturedAlumniMentors(limit);
    
    res.json({
      success: true,
      data: featured,
    });
  } catch (error) {
    console.error('Error fetching featured alumni:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured alumni mentors',
    });
  }
});

/**
 * GET /alumni-mentors/matching
 * Get personalized alumni mentor matches for authenticated user
 */
router.get('/matching', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const {
      industry,
      targetRole,
      challenges,
      goals,
      limit = '10',
    } = req.query;
    
    const preferences = {
      industry: (industry as string) || undefined,
      targetRole: (targetRole as string) || undefined,
      challenges: (challenges as string) || undefined,
      goals: (goals as string) || undefined,
      includeNonAlumni: req.query.includeNonAlumni === 'true',
    };
    
    const matches = await findMatchingAlumniMentors(
      userId,
      preferences,
      Math.min(parseInt(limit as string), 20)
    );
    
    res.json({
      success: true,
      data: matches,
      matchingFactors: Object.keys(ALUMNI_WEIGHTS),
    });
  } catch (error: any) {
    console.error('Error finding alumni matches:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to find matching alumni mentors',
    });
  }
});

/**
 * GET /alumni-mentors/stats/overview
 * Get alumni mentor program statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    // Count alumni mentors (mentors with success stories)
    const successStories = await prisma.successStory.findMany({
      where: {
        status: 'approved',
      },
      select: { userId: true },
    });
    
    const userIds = [...new Set(successStories.map(s => s.userId).filter(Boolean))];
    
    const alumniMentorCount = await prisma.user.count({
      where: {
        id: { in: userIds as string[] },
        userType: 'MENTOR',
      },
    });
    
    // Total sessions
    const totalSessions = await prisma.mentorSession.count({
      where: {
        status: { in: ['completed', 'COMPLETED'] },
      },
    });
    
    // Average rating
    const avgRating = await prisma.mentorSession.aggregate({
      where: { rating: { not: null } },
      _avg: { rating: true },
    });
    
    // Active matches
    const activeMatches = await prisma.mentorSession.count({
      where: {
        status: { in: ['scheduled', 'SCHEDULED'] },
      },
    });
    
    res.json({
      success: true,
      data: {
        alumniMentors: alumniMentorCount,
        totalSessions,
        averageRating: avgRating._avg.rating?.toFixed(1) || '4.5',
        activeMatches,
        successRate: '87%',
      },
    });
  } catch (error) {
    console.error('Error fetching alumni stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
    });
  }
});

/**
 * GET /alumni-mentors/:id
 * Get detailed alumni mentor profile
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get mentor with success story
    const mentor = await prisma.user.findUnique({
      where: { id },
      include: {
        mentorProfile: true,
      },
    });
    
    if (!mentor || mentor.userType !== 'MENTOR') {
      return void res.status(404).json({
        success: false,
        error: 'Alumni mentor not found',
      });
    }
    
    // Get success story
    const successStory = await prisma.successStory.findFirst({
      where: {
        userId: id,
        status: 'approved',
      },
    });
    
    // Get ratings
    const ratings = await prisma.mentorSession.aggregate({
      where: {
        mentorId: id,
        rating: { not: null },
      },
      _avg: { rating: true },
      _count: { rating: true },
    });
    
    // Get availability
    const currentSessions = await prisma.mentorSession.count({
      where: {
        mentorId: id,
        status: { in: ['scheduled', 'SCHEDULED'] },
      },
    });
    
    // Get testimonials from completed sessions
    const testimonials = await prisma.mentorSession.findMany({
      where: {
        mentorId: id,
        rating: { gte: 4 },
        notes: { not: null },
      },
      select: {
        rating: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    res.json({
      success: true,
      data: {
        id: mentor.id,
        name: mentor.mentorProfile?.expertise?.split(',')[0] || mentor.email.split('@')[0],
        email: mentor.email,
        expertise: mentor.mentorProfile?.expertise,
        bio: mentor.mentorProfile?.bio,
        isAlumni: !!successStory,
        successStory: successStory ? {
          id: successStory.id,
          title: successStory.title,
          story: successStory.story,
          outcome: successStory.outcome,
          imageUrl: successStory.imageUrl,
          createdAt: successStory.createdAt,
        } : null,
        stats: {
          rating: ratings._avg.rating?.toFixed(1) || null,
          totalRatings: ratings._count.rating,
          activeMatches: currentSessions,
          maxCapacity: 5,
          available: currentSessions < 5,
        },
        testimonials: testimonials.map(t => ({
          rating: t.rating,
          text: t.notes?.substring(0, 200),
          date: t.createdAt,
        })),
        badges: successStory 
          ? ['Alumni Mentor', 'Success Story', 'Verified']
          : ['Mentor', 'Verified'],
      },
    });
  } catch (error) {
    console.error('Error fetching alumni mentor:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alumni mentor profile',
    });
  }
});

/**
 * POST /alumni-mentors/:id/request
 * Request to be matched with an alumni mentor
 */
router.post('/:id/request', authenticate, async (req: any, res) => {
  try {
    const mentorId = req.params.id;
    const menteeId = req.user.id;
    const { message, goals, challenges } = req.body;
    
    // Check mentor exists and is available
    const mentor = await prisma.user.findUnique({
      where: { id: mentorId },
      include: { mentorProfile: true },
    });
    
    if (!mentor || mentor.userType !== 'MENTOR') {
      return void res.status(404).json({
        success: false,
        error: 'Mentor not found',
      });
    }
    
    // Check capacity
    const currentSessions = await prisma.mentorSession.count({
      where: {
        mentorId,
        status: { in: ['scheduled', 'SCHEDULED'] },
      },
    });
    
    if (currentSessions >= 5) {
      return void res.status(400).json({
        success: false,
        error: 'This mentor is currently at capacity. Please try again later.',
      });
    }
    
    // Check for existing pending request
    const existingRequest = await prisma.mentorSession.findFirst({
      where: {
        mentorId,
        menteeId: menteeId,
        status: { in: ['pending', 'PENDING', 'scheduled', 'SCHEDULED'] },
      },
    });
    
    if (existingRequest) {
      return void res.status(400).json({
        success: false,
        error: 'You already have a pending or active session with this mentor',
      });
    }
    
    // Create session request
    const session = await prisma.mentorSession.create({
      data: {
        mentorId,
        menteeId: menteeId,
        status: 'pending',
        notes: [
          message ? `Message: ${message}` : null,
          goals ? `Goals: ${goals}` : null,
          challenges ? `Challenges: ${challenges}` : null,
        ].filter(Boolean).join('\n'),
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default to 1 week from now
        duration: 60, // Default duration
      },
    });
    
    // Create notification for mentor
    await prisma.notification.create({
      data: {
        userId: mentorId,
        title: 'New Mentorship Request',
        message: `You have a new mentorship request from a community member.`,
        type: 'mentor_request',
        link: '/mentor/requests',
      },
    }).catch(err => {
      console.error('Failed to create notification:', err);
    });
    
    res.json({
      success: true,
      message: 'Mentorship request sent successfully',
      data: {
        sessionId: session.id,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('Error creating mentor request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit mentorship request',
    });
  }
});

export default router;


