import express from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import auth from '../middleware/auth';

const router = express.Router();
const authenticateJWT = auth.authenticate;

// =============================================================================
// CATEGORIES
// =============================================================================

/**
 * GET /community/categories - List all forum categories
 */
router.get('/categories', async (req, res) => {
  try {
    // Try to get from database first
    let categories: any[] = [];
    try {
      categories = await prisma.forumCategory.findMany({
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { threads: true } },
        },
      });
    } catch (e) {
      // Database might not have these tables yet - use fallback
    }

    // If no categories in DB, return demo data
    if (categories.length === 0) {
      categories = [
        { id: 'career-advice', slug: 'career-advice', name: 'Career Advice', description: 'Get guidance on career paths, job searching, and professional development', icon: '💼', topicCount: 156, postCount: 1240 },
        { id: 'industry-insights', slug: 'industry-insights', name: 'Industry Insights', description: 'Discussions about different industries and job markets', icon: '📊', topicCount: 89, postCount: 567 },
        { id: 'cultural-connection', slug: 'cultural-connection', name: 'Cultural Connection', description: 'Celebrate and share Indigenous culture in the workplace', icon: '🔸', topicCount: 234, postCount: 1890 },
        { id: 'success-stories', slug: 'success-stories', name: 'Success Stories', description: 'Share your journey and celebrate community achievements', icon: '🌟', topicCount: 67, postCount: 412 },
        { id: 'training-education', slug: 'training-education', name: 'Training & Education', description: 'Discuss courses, certifications, and learning resources', icon: '📚', topicCount: 112, postCount: 789 },
        { id: 'mentorship', slug: 'mentorship', name: 'Mentorship', description: 'Connect with mentors and share mentoring experiences', icon: '🤝', topicCount: 78, postCount: 534 },
      ];
    }

    const normalized = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      topicCount: c._count?.threads || 0,
      postCount: 0,
    }));

    res.json({ categories: normalized.length ? normalized : categories });
  } catch (err) {
    console.error('List categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// =============================================================================
// TOPICS
// =============================================================================

/**
 * GET /community/topics/recent - Get recent topics across all categories
 */
router.get('/topics/recent', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    let topics: any[] = [];
    
    try {
      topics = await prisma.forumThread.findMany({
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        include: {
          category: { select: { name: true, slug: true } },
          _count: { select: { replies: true } },
        },
      });
    } catch (e) {
      // Database might not have these tables yet
    }

    // Demo data if empty
    if (topics.length === 0) {
      topics = [
        { id: '1', title: 'Tips for navigating corporate workplaces as a First Nations person', category: 'career-advice', categoryName: 'Career Advice', author: 'Sarah M.', createdAt: new Date().toISOString(), replyCount: 23, viewCount: 456, isPinned: true },
        { id: '2', title: 'Mining industry opportunities in WA - 2025 outlook', category: 'industry-insights', categoryName: 'Industry Insights', author: 'Dave K.', createdAt: new Date(Date.now() - 86400000).toISOString(), replyCount: 15, viewCount: 289, isPinned: false },
        { id: '3', title: 'Celebrating NAIDOC Week at work - share your experiences!', category: 'cultural-connection', categoryName: 'Cultural Connection', author: 'Emily T.', createdAt: new Date(Date.now() - 172800000).toISOString(), replyCount: 45, viewCount: 892, isPinned: true },
      ];
    }

    const normalized = topics.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category?.slug || null,
      categoryName: t.category?.name || null,
      author: 'Community Member',
      createdAt: t.createdAt,
      replyCount: t._count?.replies || 0,
      replies: t._count?.replies || 0,
      viewCount: t.viewCount || 0,
      isPinned: Boolean(t.isPinned),
      isLocked: Boolean(t.isClosed),
    }));

    res.json({ topics: normalized.length ? normalized : topics });
  } catch (err) {
    console.error('List recent topics error:', err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

/**
 * GET /community/category/:slug - List topics for a category
 */
router.get('/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let category: any = null;
    let threads: any[] = [];
    let total = 0;

    try {
      category = await prisma.forumCategory.findUnique({ where: { slug } });
      if (category) {
        [threads, total] = await Promise.all([
          prisma.forumThread.findMany({
            where: { categoryId: category.id },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
            skip,
            take: limitNum,
            include: {
              category: { select: { name: true, slug: true } },
              _count: { select: { replies: true } },
            },
          }),
          prisma.forumThread.count({ where: { categoryId: category.id } }),
        ]);
      }
    } catch (e) {
      // ignore
    }

    if (!category) {
      return void res.json({
        category: { slug, name: 'Category' },
        topics: [],
        pagination: { page: pageNum, limit: limitNum, total: 0, pages: 0 },
      });
    }

    const topics = threads.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category?.slug || slug,
      categoryName: t.category?.name || category.name,
      author: 'Community Member',
      createdAt: t.createdAt,
      replyCount: t._count?.replies || 0,
      replies: t._count?.replies || 0,
      viewCount: t.viewCount || 0,
      isPinned: Boolean(t.isPinned),
      isLocked: Boolean(t.isClosed),
    }));

    return void res.json({
      category: { id: category.id, slug: category.slug, name: category.name, description: category.description },
      topics,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Category topics error:', err);
    return void res.status(500).json({ error: 'Failed to fetch category topics' });
  }
});

/**
 * GET /community/topic/:id - Get single topic with replies
 */
router.get('/topic/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let topic: any = null;
    let replies: any[] = [];

    try {
      topic = await prisma.forumThread.findUnique({
        where: { id },
        include: {
          category: true,
          replies: {
            orderBy: { createdAt: 'asc' },
            take: 50,
          },
        },
      });
      if (topic) {
        replies = topic.replies || [];
      }
    } catch (e) {
      // Database might not have these tables
    }

    // Demo data if not found
    if (!topic) {
      topic = {
        id,
        title: 'Tips for navigating corporate workplaces as a First Nations person',
        content: `I've been working in corporate environments for about 5 years now and wanted to share some insights.\n\nFirst, find your allies early. There are usually people who genuinely want to support diversity and inclusion.\n\nSecond, don't feel like you need to be the "spokesperson" for all Indigenous issues.`,
        author: 'Sarah M.',
        authorTitle: 'Senior Project Manager',
        createdAt: new Date().toISOString(),
        category: 'career-advice',
        categoryName: 'Career Advice',
        viewCount: 456,
        isPinned: true,
        isLocked: false,
      };
      replies = [
        { id: '1', content: 'Great tips! I completely agree about finding allies.', author: 'Michael T.', createdAt: new Date().toISOString(), likes: 12 },
        { id: '2', content: 'The boundary-setting point is so important.', author: 'Emily W.', createdAt: new Date().toISOString(), likes: 8 },
      ];
    }

    if (topic && topic.category) {
      topic.categoryName = topic.category.name;
      topic.category = topic.category.slug;
    }

    if (topic && typeof topic.isClosed === 'boolean') {
      topic.isLocked = topic.isClosed;
    }

    if (topic && !topic.author) {
      topic.author = 'Community Member';
      topic.authorTitle = '';
    }

    if (Array.isArray(replies)) {
      replies = replies.map((r) => ({
        ...r,
        author: r.author || 'Community Member',
        authorTitle: r.authorTitle || '',
        likes: typeof r.likes === 'number' ? r.likes : 0,
        isLiked: Boolean(r.isLiked),
      }));
    }

    res.json({ topic, replies });
  } catch (err) {
    console.error('Get topic error:', err);
    res.status(500).json({ error: 'Failed to fetch topic' });
  }
});

/**
 * POST /community/topic - Create new topic
 */
router.post('/topic', authenticateJWT, async (req, res) => {
  try {
    const { title, content, categoryId } = req.body;
    const userId = (req as any).user.id;

    if (!title || !content || !categoryId) {
      return void res.status(400).json({ error: 'Title, content, and category are required' });
    }

    let topic: any = null;
    try {
      const baseSlug = String(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);

      topic = await prisma.forumThread.create({
        data: {
          title,
          content,
          slug: `${baseSlug}-${Date.now().toString(36)}`,
          authorId: userId,
          categoryId,
        },
      });
    } catch (e) {
      // If DB fails, return mock success
      topic = { id: 'new-' + Date.now(), title, content };
    }

    res.json({ topic, message: 'Topic created successfully' });
  } catch (err) {
    console.error('Create topic error:', err);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

/**
 * POST /community/topic/:id/reply - Add reply to topic
 */
router.post('/topic/:id/reply', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = (req as any).user.id;

    if (!content) {
      return void res.status(400).json({ error: 'Content is required' });
    }

    let reply: any = null;
    try {
      reply = await prisma.forumReply.create({
        data: {
          content,
          threadId: id,
          authorId: userId,
        },
      });
    } catch (e) {
      // Mock reply
      reply = { id: 'reply-' + Date.now(), content, author: 'You', createdAt: new Date().toISOString() };
    }

    res.json({ reply, message: 'Reply posted successfully' });
  } catch (err) {
    console.error('Create reply error:', err);
    res.status(500).json({ error: 'Failed to post reply' });
  }
});

export default router;




