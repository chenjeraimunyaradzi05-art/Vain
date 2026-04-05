import express from 'express';
import { prisma } from '../db';
import auth from '../middleware/auth';

const router = express.Router();

// =============================================================================
// ORGANIZATION PAGE CRUD
// =============================================================================

/**
 * GET /organizations - List organization pages with filters
 */
router.get('/', async (req: any, res: any) => {
  try {
    const { 
      type, 
      search, 
      industry,
      verified,
      womenFriendly,
      page = 1, 
      limit = 20,
      sortBy = 'followerCount',
      sortOrder = 'desc'
    } = req.query;

    const where: any = { isActive: true };
    
    if (type) where.type = type;
    if (verified === 'true') where.isVerified = true;
    if (womenFriendly === 'true') where.womenFriendly = true;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
        { tagline: { contains: search as string } }
      ];
    }

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [organizations, total] = await Promise.all([
      prisma.organizationPage.findMany({
        where,
        orderBy,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        select: {
          id: true,
          type: true,
          name: true,
          slug: true,
          tagline: true,
          logoUrl: true,
          coverImageUrl: true,
          city: true,
          state: true,
          followerCount: true,
          employeeCount: true,
          averageRating: true,
          reviewCount: true,
          isVerified: true,
          womenFriendly: true
        }
      }),
      prisma.organizationPage.count({ where })
    ]);

    res.json({
      organizations,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (err) {
    console.error('List organizations error:', err);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

/**
 * GET /organizations/:slug - Get organization page by slug
 */
router.get('/:slug', async (req: any, res: any) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    const org = await prisma.organizationPage.findUnique({
      where: { slug },
      include: {
        stories: {
          where: { status: 'published', isActive: true },
          orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
          take: 10
        },
        events: {
          where: { isActive: true, startDate: { gte: new Date() } },
          orderBy: { startDate: 'asc' },
          take: 5
        },
        reviews: {
          where: { status: 'approved' },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        policies: {
          where: { isPublic: true },
          orderBy: { sortOrder: 'asc' }
        },
        successPathways: {
          where: { isActive: true },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
          take: 5
        },
        _count: {
          select: { followers: true, reviews: true, events: true }
        }
      }
    });

    if (!org || !org.isActive) {
      return void res.status(404).json({ error: 'Organization not found' });
    }

    // Check if current user is following
    let isFollowing = false;
    if (userId) {
      const follow = await prisma.orgFollower.findUnique({
        where: { orgId_userId: { orgId: org.id, userId } }
      });
      isFollowing = !!follow;
    }

    res.json({ organization: { ...org, isFollowing } });
  } catch (err) {
    console.error('Get organization error:', err);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

/**
 * POST /organizations - Create organization page
 */
router.post('/', auth.authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const {
      type,
      name,
      tagline,
      description,
      deiCommitment,
      safetyCulture,
      logoUrl,
      coverImageUrl,
      website,
      email,
      phone,
      address,
      city,
      state,
      postcode,
      linkedinUrl,
      facebookUrl,
      instagramUrl,
      employeeCount
    } = req.body;

    if (!type || !name) {
      return void res.status(400).json({ error: 'Type and name are required' });
    }

    const validTypes = ['COMPANY', 'UNIVERSITY', 'TAFE_RTO', 'GOVERNMENT', 'INDUSTRY_ASSOCIATION', 'NON_PROFIT'];
    if (!validTypes.includes(type)) {
      return void res.status(400).json({ error: 'Invalid organization type' });
    }

    // Generate slug
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Check for existing slug and make unique
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.organizationPage.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const org = await prisma.organizationPage.create({
      data: {
        ownerId: userId,
        type,
        name,
        slug,
        tagline,
        description,
        deiCommitment,
        safetyCulture,
        logoUrl,
        coverImageUrl,
        website,
        email,
        phone,
        address,
        city,
        state,
        postcode,
        linkedinUrl,
        facebookUrl,
        instagramUrl,
        employeeCount,
        admins: {
          create: { userId, role: 'owner' }
        }
      }
    });

    res.status(201).json({ organization: org });
  } catch (err) {
    console.error('Create organization error:', err);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * PUT /organizations/:id - Update organization page
 */
router.put('/:id', auth.authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check admin access
    const admin = await prisma.orgAdmin.findUnique({
      where: { orgId_userId: { orgId: id, userId } }
    });

    if (!admin || !['owner', 'admin', 'editor'].includes(admin.role)) {
      return void res.status(403).json({ error: 'Not authorized to edit this organization' });
    }

    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.ownerId;
    delete updateData.slug; // Don't allow slug changes via this endpoint

    const org = await prisma.organizationPage.update({
      where: { id },
      data: updateData
    });

    res.json({ organization: org });
  } catch (err) {
    console.error('Update organization error:', err);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// =============================================================================
// FOLLOWING
// =============================================================================

/**
 * POST /organizations/:id/follow - Follow an organization
 */
router.post('/:id/follow', auth.authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if already following
    const existing = await prisma.orgFollower.findUnique({
      where: { orgId_userId: { orgId: id, userId } }
    });

    if (existing) {
      return void res.status(400).json({ error: 'Already following' });
    }

    await prisma.$transaction([
      prisma.orgFollower.create({
        data: { orgId: id, userId }
      }),
      prisma.organizationPage.update({
        where: { id },
        data: { followerCount: { increment: 1 } }
      })
    ]);

    res.json({ success: true, isFollowing: true });
  } catch (err) {
    console.error('Follow organization error:', err);
    res.status(500).json({ error: 'Failed to follow organization' });
  }
});

/**
 * DELETE /organizations/:id/follow - Unfollow an organization
 */
router.delete('/:id/follow', auth.authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const existing = await prisma.orgFollower.findUnique({
      where: { orgId_userId: { orgId: id, userId } }
    });

    if (!existing) {
      return void res.status(400).json({ error: 'Not following' });
    }

    await prisma.$transaction([
      prisma.orgFollower.delete({
        where: { orgId_userId: { orgId: id, userId } }
      }),
      prisma.organizationPage.update({
        where: { id },
        data: { followerCount: { decrement: 1 } }
      })
    ]);

    res.json({ success: true, isFollowing: false });
  } catch (err) {
    console.error('Unfollow organization error:', err);
    res.status(500).json({ error: 'Failed to unfollow organization' });
  }
});

// =============================================================================
// STORIES & REELS
// =============================================================================

/**
 * GET /organizations/:id/stories - Get organization stories
 */
router.get('/:id/stories', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { category, page = 1, limit = 20 } = req.query;

    const where: any = { orgId: id, status: 'published', isActive: true };
    if (category) where.category = category;

    const [stories, total] = await Promise.all([
      prisma.orgStory.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string)
      }),
      prisma.orgStory.count({ where })
    ]);

    res.json({ stories, total });
  } catch (err) {
    console.error('Get stories error:', err);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

/**
 * POST /organizations/:id/stories - Create a story
 */
router.post('/:id/stories', auth.authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check admin access
    const admin = await prisma.orgAdmin.findUnique({
      where: { orgId_userId: { orgId: id, userId } }
    });

    if (!admin) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    const { title, description, category, videoUrl, thumbnailUrl, duration } = req.body;

    const story = await prisma.orgStory.create({
      data: {
        orgId: id,
        authorId: userId,
        title,
        description,
        category,
        videoUrl,
        thumbnailUrl,
        duration,
        status: 'draft'
      }
    });

    res.status(201).json({ story });
  } catch (err) {
    console.error('Create story error:', err);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// =============================================================================
// REVIEWS
// =============================================================================

/**
 * GET /organizations/:id/reviews - Get organization reviews
 */
router.get('/:id/reviews', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt' } = req.query;

    const orderBy: any = {};
    orderBy[sortBy as string] = 'desc';

    const [reviews, total, stats] = await Promise.all([
      prisma.orgReview.findMany({
        where: { orgId: id, status: 'approved' },
        orderBy,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string)
      }),
      prisma.orgReview.count({ where: { orgId: id, status: 'approved' } }),
      prisma.orgReview.aggregate({
        where: { orgId: id, status: 'approved' },
        _avg: {
          overallRating: true,
          workLifeBalance: true,
          culture: true,
          management: true,
          opportunities: true,
          compensation: true
        }
      })
    ]);

    res.json({ reviews, total, stats: stats._avg });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * POST /organizations/:id/reviews - Submit a review
 */
router.post('/:id/reviews', auth.authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if user already reviewed
    const existing = await prisma.orgReview.findFirst({
      where: { orgId: id, authorId: userId }
    });

    if (existing) {
      return void res.status(400).json({ error: 'You have already reviewed this organization' });
    }

    const {
      overallRating,
      workLifeBalance,
      culture,
      management,
      opportunities,
      compensation,
      title,
      pros,
      cons,
      advice,
      jobTitle,
      employmentStatus,
      employmentType,
      yearsAtCompany,
      salary,
      isAnonymous = true
    } = req.body;

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return void res.status(400).json({ error: 'Overall rating (1-5) is required' });
    }

    const review = await prisma.orgReview.create({
      data: {
        orgId: id,
        authorId: userId,
        overallRating,
        workLifeBalance,
        culture,
        management,
        opportunities,
        compensation,
        title,
        pros,
        cons,
        advice,
        jobTitle,
        employmentStatus,
        employmentType,
        yearsAtCompany,
        salary,
        isAnonymous,
        status: 'pending'
      }
    });

    res.status(201).json({ review, message: 'Review submitted for approval' });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// =============================================================================
// EVENTS
// =============================================================================

/**
 * GET /organizations/:id/events - Get organization events
 */
router.get('/:id/events', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { upcoming = 'true', page = 1, limit = 10 } = req.query;

    const where: any = { orgId: id, isActive: true };
    if (upcoming === 'true') {
      where.startDate = { gte: new Date() };
    }

    const [events, total] = await Promise.all([
      prisma.orgEvent.findMany({
        where,
        orderBy: { startDate: 'asc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        include: {
          _count: { select: { attendees: true } }
        }
      }),
      prisma.orgEvent.count({ where })
    ]);

    res.json({ events, total });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * POST /organizations/:id/events/:eventId/register - Register for an event
 */
router.post('/:id/events/:eventId/register', auth.authenticate, async (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const event = await prisma.orgEvent.findUnique({
      where: { id: eventId },
      include: { _count: { select: { attendees: true } } }
    });

    if (!event) {
      return void res.status(404).json({ error: 'Event not found' });
    }

    if (event.maxAttendees && event._count.attendees >= event.maxAttendees) {
      return void res.status(400).json({ error: 'Event is full' });
    }

    // Check if already registered
    const existing = await prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } }
    });

    if (existing) {
      return void res.status(400).json({ error: 'Already registered' });
    }

    await prisma.$transaction([
      prisma.eventAttendee.create({
        data: {
          eventId,
          userId,
          status: event.requiresApproval ? 'registered' : 'approved'
        }
      }),
      prisma.orgEvent.update({
        where: { id: eventId },
        data: { attendeeCount: { increment: 1 } }
      })
    ]);

    res.json({ success: true, status: event.requiresApproval ? 'pending_approval' : 'registered' });
  } catch (err) {
    console.error('Register for event error:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

export default router;


