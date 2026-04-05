import express from 'express';
import { prisma } from '../db';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = express.Router();

type MemoryStory = {
  id: string;
  authorName: string | null;
  title: string;
  content: string;
  story: string;
  outcome?: string | null;
  company?: string | null;
  role?: string | null;
  imageUrl?: string | null;
  isAnonymous: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  publishedAt: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type MemoryComment = {
  id: string;
  storyId: string;
  content: string;
  authorName: string;
  authorId: string | null;
  createdAt: Date;
  likes: number;
};

const memoryStories: MemoryStory[] = [];
const memoryLikes = new Map<string, Set<string>>();
const memoryComments = new Map<string, MemoryComment[]>();

function userKey(req: any): string {
  return req.user?.id || (req.headers['x-forwarded-for'] as string) || req.ip || 'anon';
}

router.use(optionalAuth);

function isAdmin(req: any) {
  return req.user?.userType === 'GOVERNMENT' ||
    (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY);
}

function requireAdmin(req: any, res: any, next: any) {
  if (!isAdmin(req)) return void res.status(403).json({ error: 'Admin access required' });
  return next();
}

// =============================================================================
// PUBLIC STORIES
// =============================================================================

/**
 * GET /stories - List published success stories
 */
router.get('/', async (req: any, res: any) => {
  try {
    const { featured, limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { isPublished: true };
    if (featured === 'true') where.isFeatured = true;

    const [stories, total] = await Promise.all([
      prisma.successStory.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: parseInt(limit),
        select: {
          id: true,
          authorName: true,
          title: true,
          content: true,
          story: true,
          outcome: true,
          company: true,
          role: true,
          imageUrl: true,
          isAnonymous: true,
          isFeatured: true,
          publishedAt: true,
          viewCount: true,
        },
      }),
      prisma.successStory.count({ where }),
    ]);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const memFiltered = memoryStories
      .filter((s) => s.isPublished)
      .filter((s) => (featured === 'true' ? s.isFeatured : true))
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    const memPage = memFiltered.slice((pageNum - 1) * limitNum, (pageNum - 1) * limitNum + limitNum);

    // Mask author name if anonymous
    const maskedStories = [...stories.map((s: any) => {
      const storyText = s.story || s.content;
      return {
        ...s,
        story: storyText,
        authorName: s.isAnonymous ? 'Community Member' : (s.authorName || 'Community Member'),
      };
    }), ...memPage.map((s: any) => ({
      ...s,
      story: s.story || s.content,
      authorName: s.isAnonymous ? 'Community Member' : (s.authorName || 'Community Member'),
      publishedAt: s.publishedAt,
      viewCount: s.viewCount,
    }))];

    res.json({
      stories: maskedStories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total + memFiltered.length,
        pages: Math.ceil((total + memFiltered.length) / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('List stories error:', err);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

/**
 * GET /stories/user/me - Get current user's stories
 */
router.get('/user/me', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const stories = await prisma.successStory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ stories });
  } catch (err) {
    console.error('Get user stories error:', err);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// =============================================================================
// STORY SUBMISSION
// =============================================================================

/**
 * POST /stories - Submit a new success story
 */
router.post('/', optionalAuth, async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    const {
      authorName,
      title,
      story: storyContent,
      content,
      outcome,
      company,
      role,
      imageUrl,
      isAnonymous,
      consentGiven,
    } = req.body;

    const finalStoryContent = storyContent || content;
    if (!title || !finalStoryContent) {
      return void res.status(400).json({ error: 'title and story/content are required' });
    }

    if (process.env.NODE_ENV === 'production' && !userId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    if (consentGiven !== true) {
      return void res.status(400).json({ error: 'Consent must be given to submit a story' });
    }

    // Try to persist if member profile exists; otherwise fall back to in-memory demo.
    if (userId) {
      const memberProfile = await prisma.memberProfile.findUnique({ where: { userId } });
      if (memberProfile) {
        const newStory = await prisma.successStory.create({
          data: {
            memberId: memberProfile.id,
            userId,
            authorName: authorName || null,
            title,
            content: finalStoryContent,
            story: finalStoryContent,
            outcome,
            company,
            role,
            imageUrl,
            isAnonymous: isAnonymous || false,
            status: 'pending',
            isPublished: false,
            isFeatured: false,
          },
        });

        return void res.status(201).json({
          story: newStory,
          message: 'Story submitted for review. Thank you for sharing!',
        });
      }
    }

    const now = new Date();
    const demoStory: MemoryStory = {
      id: `story_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      authorName: authorName || null,
      title,
      content: finalStoryContent,
      story: finalStoryContent,
      outcome: outcome || null,
      company: company || null,
      role: role || null,
      imageUrl: imageUrl || null,
      isAnonymous: !!isAnonymous,
      isFeatured: false,
      isPublished: true,
      publishedAt: now,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    memoryStories.unshift(demoStory);
    if (memoryStories.length > 100) memoryStories.pop();

    return void res.status(201).json({
      story: demoStory,
      message: 'Story submitted (demo).',
    });
  } catch (err) {
    console.error('Submit story error:', err);
    res.status(500).json({ error: 'Failed to submit story' });
  }
});

/**
 * POST /stories/:id/like - Toggle like on a story
 */
router.post('/:id/like', optionalAuth, async (req: any, res: any) => {
  try {
    const storyId = req.params.id;
    const key = userKey(req);

    const set = memoryLikes.get(storyId) || new Set<string>();
    set.add(key);
    memoryLikes.set(storyId, set);

    return void res.json({ ok: true, liked: true, likes: set.size });
  } catch (err) {
    console.error('Like story error:', err);
    return void res.status(500).json({ error: 'Failed to like story' });
  }
});

/**
 * DELETE /stories/:id/like - Remove like on a story
 */
router.delete('/:id/like', optionalAuth, async (req: any, res: any) => {
  try {
    const storyId = req.params.id;
    const key = userKey(req);

    const set = memoryLikes.get(storyId) || new Set<string>();
    set.delete(key);
    memoryLikes.set(storyId, set);

    return void res.json({ ok: true, liked: false, likes: set.size });
  } catch (err) {
    console.error('Unlike story error:', err);
    return void res.status(500).json({ error: 'Failed to unlike story' });
  }
});

/**
 * GET /stories/:id/comments - List story comments (demo)
 */
router.get('/:id/comments', async (req: any, res: any) => {
  try {
    const storyId = req.params.id;
    const comments = memoryComments.get(storyId) || [];
    return void res.json({ comments });
  } catch (err) {
    console.error('List comments error:', err);
    return void res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * POST /stories/:id/comments - Add story comment (demo)
 */
router.post('/:id/comments', optionalAuth, async (req: any, res: any) => {
  try {
    const storyId = req.params.id;
    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return void res.status(400).json({ error: 'content is required' });
    }

    const now = new Date();
    const comment: MemoryComment = {
      id: `comment_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      storyId,
      content: content.trim(),
      authorName: req.user?.email || 'Community Member',
      authorId: req.user?.id || null,
      createdAt: now,
      likes: 0,
    };

    const list = memoryComments.get(storyId) || [];
    list.push(comment);
    memoryComments.set(storyId, list);

    return void res.status(201).json({ comment });
  } catch (err) {
    console.error('Post comment error:', err);
    return void res.status(500).json({ error: 'Failed to post comment' });
  }
});

// =============================================================================
// ADMIN REVIEW
// =============================================================================

/**
 * GET /stories/admin/pending - List pending stories for review
 */
router.get('/admin/pending', authenticate, async (req: any, res: any) => {
  try {
    if (!isAdmin(req)) return void res.status(403).json({ error: 'Admin access required' });
    const stories = await prisma.successStory.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ stories });
  } catch (err) {
    console.error('List pending stories error:', err);
    res.status(500).json({ error: 'Failed to fetch pending stories' });
  }
});

/**
 * PUT /stories/admin/:id/review - Review a story
 */
router.put('/admin/:id/review', authenticate, async (req: any, res: any) => {
  try {
    if (!isAdmin(req)) return void res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;
    const { status } = req.body; // approved, rejected, featured

    if (!['approved', 'rejected', 'featured'].includes(status)) {
      return void res.status(400).json({ error: 'Invalid status' });
    }

    const story = await prisma.successStory.update({
      where: { id },
      data: {
        status,
        isPublished: ['approved', 'featured'].includes(status),
        isFeatured: status === 'featured',
        publishedAt: ['approved', 'featured'].includes(status) ? new Date() : null,
      },
    });

    res.json({ story });
  } catch (err) {
    console.error('Review story error:', err);
    res.status(500).json({ error: 'Failed to review story' });
  }
});

/**
 * GET /stories/:id - Get single published story
 */
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const mem = memoryStories.find((s) => s.id === id);
    if (mem) {
      mem.viewCount += 1;
      return void res.json({ story: { ...mem, story: mem.story || mem.content, authorName: mem.isAnonymous ? 'Community Member' : (mem.authorName || 'Community Member') } });
    }

    const story = await prisma.successStory.findUnique({
      where: { id },
      select: {
        id: true,
        authorName: true,
        title: true,
        content: true,
        story: true,
        outcome: true,
        company: true,
        role: true,
        imageUrl: true,
        isAnonymous: true,
        isFeatured: true,
        isPublished: true,
        publishedAt: true,
        viewCount: true,
      },
    });

    if (!story || story.isPublished !== true) {
      return void res.status(404).json({ error: 'Story not found' });
    }

    await prisma.successStory.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    const masked = {
      ...story,
      story: story.story || story.content,
      authorName: story.isAnonymous ? 'Community Member' : (story.authorName || 'Community Member'),
    };

    res.json({ story: masked });
  } catch (err) {
    console.error('Get story error:', err);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

export default router;



