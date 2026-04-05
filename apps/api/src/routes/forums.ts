// @ts-nocheck
import express from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import auth from '../middleware/auth';
import { moderateText } from '../lib/contentModeration';

const router = express.Router();
const authenticateJWT = auth.authenticate;

type VoteKey = string;
const threadUpvotes = new Map<string, Set<VoteKey>>();
const replyUpvotes = new Map<string, Set<VoteKey>>();

function voteKey(req: any): VoteKey {
  return req.user?.id || (req.headers['x-forwarded-for'] as string) || req.ip || 'anon';
}

function toggleUpvote(map: Map<string, Set<VoteKey>>, id: string, key: VoteKey) {
  const set = map.get(id) || new Set<VoteKey>();
  const had = set.has(key);
  if (had) set.delete(key);
  else set.add(key);
  map.set(id, set);
  return { upvoted: !had, upvotes: set.size };
}

// In-memory moderation flag store (fallback when prisma.contentFlag model is absent).
// Keeps local/dev/E2E functional without requiring schema migrations.
const memoryFlags = [];

function createMemoryFlag({ threadId, replyId, reporterId, reason, details, ai = null }) {
  const flag = {
    id: `flag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    threadId: threadId || null,
    replyId: replyId || null,
    reporterId: reporterId || null,
    reason: reason || 'unspecified',
    details: details || null,
    status: 'pending',
    action: 'none',
    ai: ai || null,
    createdAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
  };
  memoryFlags.unshift(flag);
  if (memoryFlags.length > 200) memoryFlags.pop();
  return flag;
}

function isAdmin(req: any) {
  return req.user?.userType === 'GOVERNMENT' ||
    (process.env.ADMIN_API_KEY && req.headers['x-admin-key'] === process.env.ADMIN_API_KEY);
}

function requireAdmin(req: any, res: any, next: any) {
  if (!isAdmin(req)) return void res.status(403).json({ error: 'Admin access required' });
  return next();
}

// =============================================================================
// CATEGORIES
// =============================================================================

/**
 * GET /forums/categories - List all forum categories
 */
router.get('/categories', async (req, res) => {
  try {
    // Check if ForumCategory model exists
    if (!prisma.forumCategory) {
      // Return demo categories
      return void res.json({ 
        categories: [
          { id: '1', name: 'General Discussion', slug: 'general', description: 'Open discussions', threadCount: 25, icon: '💬', color: 'blue' },
          { id: '2', name: 'Job Seeking Tips', slug: 'job-tips', description: 'Job hunting strategies', threadCount: 18, icon: '💼', color: 'green' },
          { id: '3', name: 'Mentorship', slug: 'mentorship', description: 'Connect with mentors', threadCount: 12, icon: '🤝', color: 'purple' },
          { id: '4', name: 'Training & Education', slug: 'training', description: 'Courses and certifications', threadCount: 24, icon: '📚', color: 'amber' },
          { id: '5', name: 'Success Stories', slug: 'success', description: 'Celebrate achievements', threadCount: 15, icon: '🎉', color: 'pink' },
        ]
      });
    }

    const categories = await prisma.forumCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { threads: true } },
      },
    });

    res.json({ 
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        icon: c.icon,
        color: c.color,
        threadCount: c._count?.threads || 0
      }))
    });
  } catch (err) {
    console.error('List categories error:', err);
    // Return demo data on error
    res.json({ 
      categories: [
        { id: '1', name: 'General Discussion', slug: 'general', description: 'Open discussions', threadCount: 25 },
        { id: '2', name: 'Job Seeking Tips', slug: 'job-tips', description: 'Job hunting strategies', threadCount: 18 },
        { id: '3', name: 'Mentorship', slug: 'mentorship', description: 'Connect with mentors', threadCount: 12 },
      ]
    });
  }
});

// =============================================================================
// THREADS
// =============================================================================

/**
 * GET /forums/threads - List threads (optionally by category)
 */
router.get('/threads', async (req, res) => {
  try {
    const { categoryId, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (categoryId) where.categoryId = categoryId;

    const [threads, total] = await Promise.all([
      prisma.forumThread.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limitNum,
        include: {
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.forumThread.count({ where }),
    ]);

    res.json({
      threads,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('List threads error:', err);
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

/**
 * GET /forums/threads/:slug - Get single thread with replies
 */
router.get('/threads/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const thread = await prisma.forumThread.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        category: true,
        replies: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    if (!thread) {
      return void res.status(404).json({ error: 'Thread not found' });
    }

    // Increment view count
    await prisma.forumThread.update({
      where: { id: thread.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({ thread });
  } catch (err) {
    console.error('Get thread error:', err);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

/**
 * GET /forums/threads/:threadId/replies - List replies for a thread
 */
router.get('/threads/:threadId/replies', async (req, res) => {
  try {
    const { threadId } = req.params;
    const thread = await prisma.forumThread.findFirst({ where: { OR: [{ id: threadId }, { slug: threadId }] } });
    if (!thread) return void res.status(404).json({ error: 'Thread not found' });

    const replies = await prisma.forumReply.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    res.json({ replies });
  } catch (err) {
    console.error('List replies error:', err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

/**
 * POST /forums/threads/:threadId/upvote - Toggle upvote for a thread
 */
router.post('/threads/:threadId/upvote', authenticateJWT, async (req, res) => {
  try {
    const { threadId } = req.params;
    const thread = await prisma.forumThread.findFirst({ where: { OR: [{ id: threadId }, { slug: threadId }] } });
    if (!thread) return void res.status(404).json({ error: 'Thread not found' });
    const result = toggleUpvote(threadUpvotes, thread.id, voteKey(req));
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Upvote thread error:', err);
    res.status(500).json({ error: 'Failed to upvote thread' });
  }
});

/**
 * POST /forums/replies/:replyId/upvote - Toggle upvote for a reply
 */
router.post('/replies/:replyId/upvote', authenticateJWT, async (req, res) => {
  try {
    const { replyId } = req.params;
    const reply = await prisma.forumReply.findUnique({ where: { id: replyId } });
    if (!reply) return void res.status(404).json({ error: 'Reply not found' });
    const result = toggleUpvote(replyUpvotes, reply.id, voteKey(req));
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Upvote reply error:', err);
    res.status(500).json({ error: 'Failed to upvote reply' });
  }
});

/**
 * POST /forums/threads - Create new thread
 */
router.post('/threads', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { categoryId, title, content } = req.body;

    if (!categoryId || !title || !content) {
      return void res.status(400).json({ error: 'categoryId, title, and content are required' });
    }

    // Generate slug
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const thread = await prisma.forumThread.create({
      data: {
        categoryId,
        authorId: userId,
        title,
        slug,
        content,
      },
    });

    // AI moderation (best-effort). If prisma.contentFlag doesn't exist, record to memory store.
    try {
      const mod = moderateText(`${title}\n\n${content}`);
      if (mod.flagged) {
        if ((prisma as any).contentFlag) {
          await (prisma as any).contentFlag.create({
            data: {
              threadId: thread.id,
              replyId: null,
              reporterId: userId,
              reason: 'ai',
              details: JSON.stringify({ ...mod, source: 'thread_create' }),
            },
          });
        } else {
          createMemoryFlag({
            threadId: thread.id,
            replyId: null,
            reporterId: userId,
            reason: 'ai',
            details: JSON.stringify({ ...mod, source: 'thread_create' }),
            ai: mod,
          });
        }
      }
    } catch (e) {
      // ignore moderation errors
    }

    res.status(201).json({ thread });
  } catch (err) {
    console.error('Create thread error:', err);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// =============================================================================
// REPLIES
// =============================================================================

/**
 * POST /forums/threads/:threadId/replies - Add reply to thread
 */
router.post('/threads/:threadId/replies', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { threadId } = req.params;
    const { content } = req.body;

    if (!content) {
      return void res.status(400).json({ error: 'content is required' });
    }

    // Check thread exists and not locked
    const thread = await prisma.forumThread.findUnique({ where: { id: threadId } });
    if (!thread) {
      return void res.status(404).json({ error: 'Thread not found' });
    }
    if (thread.isClosed) {
      return void res.status(403).json({ error: 'Thread is closed' });
    }

    const reply = await prisma.forumReply.create({
      data: {
        threadId,
        authorId: userId,
        content,
      },
    });

    // AI moderation (best-effort)
    try {
      const mod = moderateText(content);
      if (mod.flagged) {
        if ((prisma as any).contentFlag) {
          await (prisma as any).contentFlag.create({
            data: {
              threadId,
              replyId: reply.id,
              reporterId: userId,
              reason: 'ai',
              details: JSON.stringify({ ...mod, source: 'reply_create' }),
            },
          });
        } else {
          createMemoryFlag({
            threadId,
            replyId: reply.id,
            reporterId: userId,
            reason: 'ai',
            details: JSON.stringify({ ...mod, source: 'reply_create' }),
            ai: mod,
          });
        }
      }
    } catch (e) {
      // ignore moderation errors
    }

    res.status(201).json({ reply });
  } catch (err) {
    console.error('Create reply error:', err);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// =============================================================================
// MODERATION
// =============================================================================

/**
 * POST /forums/flag - Flag content for moderation
 */
router.post('/flag', authenticateJWT, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { threadId, replyId, reason, details } = req.body;

    if (!threadId && !replyId) {
      return void res.status(400).json({ error: 'threadId or replyId is required' });
    }
    if (!reason) {
      return void res.status(400).json({ error: 'reason is required' });
    }

    let flag;
    if ((prisma as any).contentFlag) {
      flag = await (prisma as any).contentFlag.create({
        data: {
          threadId: threadId || null,
          replyId: replyId || null,
          reporterId: userId,
          reason,
          details: details || null,
        },
      });
    } else {
      flag = createMemoryFlag({ threadId, replyId, reporterId: userId, reason, details });
    }

    res.status(201).json({ flag, message: 'Content flagged for review' });
  } catch (err) {
    console.error('Flag content error:', err);
    res.status(500).json({ error: 'Failed to flag content' });
  }
});

/**
 * GET /forums/flags - List pending flags (admin only)
 */
router.get('/flags', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    let flags;
    if ((prisma as any).contentFlag) {
      flags = await (prisma as any).contentFlag.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          thread: { select: { title: true, slug: true } },
          reply: { select: { content: true } },
        },
      });
    } else {
      flags = memoryFlags
        .filter((f) => f.status === 'pending')
        .slice(0, 50)
        .map((f) => ({
          ...f,
          thread: f.threadId ? { title: 'Thread', slug: null } : null,
          reply: f.replyId ? { content: 'Reply' } : null,
        }));
    }

    res.json({ flags });
  } catch (err) {
    console.error('List flags error:', err);
    res.status(500).json({ error: 'Failed to fetch flags' });
  }
});

/**
 * PUT /forums/flags/:id - Review a flag (admin only)
 */
router.put('/flags/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { status, action } = req.body;

    if (!['pending', 'resolved'].includes(String(status || 'pending'))) {
      return void res.status(400).json({ error: 'Invalid status' });
    }

    if (action && !['none', 'deleted'].includes(String(action))) {
      return void res.status(400).json({ error: 'Invalid action' });
    }

    let flag;
    if ((prisma as any).contentFlag) {
      flag = await (prisma as any).contentFlag.update({
        where: { id },
        data: {
          status,
          action: action || 'none',
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      });
    } else {
      const idx = memoryFlags.findIndex((f) => f.id === id);
      if (idx === -1) return void res.status(404).json({ error: 'Flag not found' });
      memoryFlags[idx] = {
        ...memoryFlags[idx],
        status: String(status || 'pending'),
        action: action || 'none',
        reviewedBy: userId || null,
        reviewedAt: new Date().toISOString(),
      };
      flag = memoryFlags[idx];
    }

    // Apply action if needed
    if (action === 'deleted' && (prisma as any).contentFlag) {
      if (flag.threadId) {
        await prisma.forumThread.delete({ where: { id: flag.threadId } });
      } else if (flag.replyId) {
        await prisma.forumReply.delete({ where: { id: flag.replyId } });
      }
    }

    res.json({ flag });
  } catch (err) {
    console.error('Review flag error:', err);
    res.status(500).json({ error: 'Failed to review flag' });
  }
});

export default router;



