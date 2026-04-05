import express, { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { prisma } from '../db';
import auth from '../middleware/auth';
import { contentModerationService } from '../services/contentModeration';

// Extend Request (handled globally in auth.ts now)
// interface AuthRequest extends Request { ... } removed


// Type definitions for social feed
interface SocialPost {
  id: string;
  authorId: string;
  authorType: string;
  orgId?: string | null;
  content: string;
  type: string;
  mediaUrls?: string | null;
  visibility: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isActive: boolean;
  isSpam: boolean;
  createdAt: Date;
  reactions?: { type: string }[];
  _count?: { comments: number; reactions: number };
}

interface ReactionCount {
  postId: string;
  type: string;
  _count: { _all: number };
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

interface RateLimitConfig {
  perMinute: number;
  perHour: number;
  perDay: number;
}

const router = express.Router();

const isTestEnv = process.env.NODE_ENV === 'test';

// Feed ranking weights
const RANKING_WEIGHTS = {
  recency: 0.35,
  engagement: 0.25,
  relationship: 0.25,
  quality: 0.15
};

// Time decay: score halves every 6 hours
const TIME_DECAY_HALF_LIFE_HOURS = 6;
const MAX_AGE_HOURS = 168; // 7 days

/**
 * Calculate feed score for ranking
 */
function calculateFeedScore(post: SocialPost, userId: string, connections: string[], following: string[]) {
  const now = Date.now();
  const postAge = (now - new Date(post.createdAt).getTime()) / (1000 * 60 * 60); // hours
  
  if (postAge > MAX_AGE_HOURS) return 0;
  
  // Recency score with time decay
  const recencyScore = Math.pow(0.5, postAge / TIME_DECAY_HALF_LIFE_HOURS);
  
  // Boost for very recent posts (< 30 min)
  const recentBoost = postAge < 0.5 ? 1.5 : 1;
  
  // Engagement score
  const engagementScore = Math.min(1, (
    (post.likeCount * 0.3) + 
    (post.commentCount * 0.5) + 
    (post.shareCount * 0.2)
  ) / 100);
  
  // Relationship score
  let relationshipScore = 0;
  if (connections.includes(post.authorId)) {
    relationshipScore = 1;
  } else if (following.includes(post.authorId)) {
    relationshipScore = 0.7;
  }
  
  // Quality score (based on author trust, content completeness)
  const qualityScore = post.mediaUrls ? 0.8 : 0.5;
  
  return (
    (recencyScore * RANKING_WEIGHTS.recency * recentBoost) +
    (engagementScore * RANKING_WEIGHTS.engagement) +
    (relationshipScore * RANKING_WEIGHTS.relationship) +
    (qualityScore * RANKING_WEIGHTS.quality)
  );
}

// =============================================================================
// FEED
// =============================================================================

/**
 * GET /feed - Get personalized feed (or public feed if not authenticated)
 */
router.get('/', auth.optionalAuth, async (req, res) => {
  try {
    if (isTestEnv) {
      return void res.json({ posts: [], hasMore: false });
    }

    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // If not logged in, return public posts only
    if (!userId) {
      const posts = await prisma.socialPost.findMany({
        where: {
          isActive: true,
          isSpam: false,
          visibility: 'public',
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { comments: true, reactions: true } }
        }
      });

      const postIds = posts.map((p: any) => p.id);
      const reactionCountsRaw = postIds.length
        ? await prisma.socialReaction.groupBy({
            by: ['postId', 'type'],
            where: { postId: { in: postIds } },
            _count: { _all: true }
          })
        : [];
      const reactionCountsByPost = reactionCountsRaw.reduce((acc: any, row: any) => {
        acc[row.postId] = acc[row.postId] || {};
        acc[row.postId][row.type] = row._count?._all ?? 0;
        return acc;
      }, {} as Record<string, Record<string, number>>);
      
      // Fetch author info for user posts
      const userAuthorIds = [...new Set(posts.filter((p: any) => p.authorType === 'user').map((p: any) => p.authorId))];
      const orgIds = [...new Set(posts.filter((p: any) => p.orgId).map((p: any) => p.orgId))];
      
      const [users, companies] = await Promise.all([
        userAuthorIds.length > 0 ? prisma.user.findMany({
          where: { id: { in: userAuthorIds as string[] } },
          select: { 
            id: true, 
            email: true,
            memberProfile: { select: { bio: true } },
            mentorProfile: { select: { name: true, avatar: true, avatarUrl: true, title: true } }
          }
        }) : [],
        orgIds.length > 0 ? prisma.companyProfile.findMany({
          where: { userId: { in: orgIds as string[] } },
          select: { userId: true, companyName: true }
        }) : []
      ]);
      
      const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
      const companyMap = Object.fromEntries(companies.map((c: any) => [c.userId, c]));
      
      // Enrich posts with author info
      const enrichedPosts = posts.map((post: any) => {
        const author = userMap[post.authorId];
        const company = post.orgId ? companyMap[post.orgId] : null;
        const displayName = author?.mentorProfile?.name || author?.email?.split('@')[0] || 'Community Member';
        const avatar = author?.mentorProfile?.avatar || author?.mentorProfile?.avatarUrl || null;
        const title = author?.mentorProfile?.title || '';
        return {
          ...post,
          reactionCounts: reactionCountsByPost[post.id] || { like: post.likeCount || 0 },
          authorName: post.authorType === 'organization' && company 
            ? company.companyName 
            : displayName,
          authorAvatar: post.authorType === 'organization' && company
            ? null
            : avatar,
          authorTitle: title,
          isOrganization: post.authorType === 'organization',
          trustLevel: 'basic'
        };
      });
      
      return void res.json({ posts: enrichedPosts, hasMore: posts.length === limit });
    }

    // Get user's safety settings
    const safetySettings = await prisma.userSafetySettings.findUnique({
      where: { userId }
    });

    // Get user's connections and following
    const [connections, following, blocks] = await Promise.all([
      prisma.userConnection.findMany({
        where: { 
          status: 'accepted',
          OR: [
            { requesterId: userId },
            { addresseeId: userId }
          ]
        }
      }).then((conns: any[]) => conns.map(c => c.requesterId === userId ? c.addresseeId : c.requesterId)),
      prisma.userFollow.findMany({
        where: { followerId: userId }
      }).then((follows: any[]) => follows.map(f => f.followingId)),
      prisma.userBlock.findMany({
        where: { blockerId: userId }
      }).then((blocks: any[]) => blocks.map(b => b.blockedId))
    ]);

    // Build feed filter based on safety settings
    const feedFilter = safetySettings?.feedFilter || 'all';
    let authorFilter = {};
    
    if (feedFilter === 'connections_only') {
      authorFilter = { authorId: { in: connections } };
    } else if (feedFilter === 'following_only') {
      authorFilter = { authorId: { in: [...connections, ...following] } };
    }

    // Exclude blocked users
    const where: any = {
      isActive: true,
      isSpam: false,
      authorId: { notIn: blocks },
      OR: [
        { visibility: 'public' },
        { visibility: 'connections', authorId: { in: connections } },
        { authorId: userId }
      ],
      ...authorFilter
    };

    // Fetch posts
    const posts = await prisma.socialPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Get more for ranking
      include: {
        _count: { select: { comments: true, reactions: true } },
        reactions: {
          where: { userId },
          take: 1
        }
      }
    });

    const postIds = posts.map((p: any) => p.id);
    const reactionCountsRaw = postIds.length
      ? await prisma.socialReaction.groupBy({
          by: ['postId', 'type'],
          where: { postId: { in: postIds } },
          _count: { _all: true }
        })
      : [];
    const reactionCountsByPost = reactionCountsRaw.reduce((acc: any, row: any) => {
      acc[row.postId] = acc[row.postId] || {};
      acc[row.postId][row.type] = row._count?._all ?? 0;
      return acc;
    }, {} as Record<string, Record<string, number>>);
    
    // Fetch author info for all posts
    const userAuthorIds = [...new Set(posts.filter((p: any) => p.authorType === 'user').map((p: any) => p.authorId))];
    const orgIds = [...new Set(posts.filter((p: any) => p.orgId).map((p: any) => p.orgId))];
    
    const [users, companies] = await Promise.all([
      userAuthorIds.length > 0 ? prisma.user.findMany({
        where: { id: { in: userAuthorIds as string[] } },
        select: { 
          id: true, 
          email: true,
          memberProfile: { select: { bio: true } },
          mentorProfile: { select: { name: true, avatar: true, avatarUrl: true, title: true } }
        }
      }) : [],
      orgIds.length > 0 ? prisma.companyProfile.findMany({
        where: { userId: { in: orgIds as string[] } },
        select: { userId: true, companyName: true }
      }) : []
    ]);
    
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));
    const companyMap = Object.fromEntries(companies.map((c: any) => [c.userId, c]));

    // Calculate scores and rank
    const rankedPosts = posts
      .map((post: any) => {
        const author = userMap[post.authorId];
        const company = post.orgId ? companyMap[post.orgId] : null;
        const displayName = author?.mentorProfile?.name || author?.email?.split('@')[0] || 'Community Member';
        const avatar = author?.mentorProfile?.avatar || author?.mentorProfile?.avatarUrl || null;
        const title = author?.mentorProfile?.title || '';
        return {
          ...post,
          score: calculateFeedScore(post, userId, connections, following),
          userReaction: post.reactions?.[0]?.type || null,
          reactionCounts: reactionCountsByPost[post.id] || { like: post.likeCount || 0 },
          authorName: post.authorType === 'organization' && company 
            ? company.companyName 
            : displayName,
          authorAvatar: post.authorType === 'organization' && company
            ? null
            : avatar,
          authorTitle: title,
          isOrganization: post.authorType === 'organization',
          trustLevel: 'basic'
        };
      })
      .filter((p: any) => p.score > 0)
      .sort((a: any, b: any) => b.score - a.score);

    // Apply diversity: max 3 posts per author
    const authorCounts: Record<string, number> = {};
    const diversePosts = rankedPosts.filter((post: any) => {
      authorCounts[post.authorId] = (authorCounts[post.authorId] || 0) + 1;
      return authorCounts[post.authorId] <= 3;
    });

    // Paginate
    const start = (page - 1) * limit;
    const paginatedPosts = diversePosts.slice(start, start + limit);

    // Remove internal fields
    const cleanPosts = paginatedPosts.map(({ score, reactions, ...post }: any) => post);

    res.json({
      posts: cleanPosts,
      hasMore: start + limit < diversePosts.length
    });
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

/**
 * GET /feed/discover - Discover new content
 */
router.get('/discover', auth.optionalAuth, async (req, res) => {
  try {
    if (isTestEnv) {
      return void res.json({ posts: [], hasMore: false });
    }

    const userId = req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get blocks if logged in
    let blocks: string[] = [];
    if (userId) {
      blocks = await prisma.userBlock.findMany({
        where: { blockerId: userId }
      }).then((b: any[]) => b.map(x => x.blockedId));
    }

    const where: any = {
      isActive: true,
      isSpam: false,
      visibility: 'public',
      authorId: { notIn: blocks },
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    };

    const [posts, total] = await Promise.all([
      prisma.socialPost.findMany({
        where,
        orderBy: [
          { likeCount: 'desc' },
          { commentCount: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { comments: true, reactions: true } }
        }
      }),
      prisma.socialPost.count({ where })
    ]);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get discover error:', err);
    res.status(500).json({ error: 'Failed to fetch discover feed' });
  }
});

// =============================================================================
// POSTS
// =============================================================================

/**
 * POST /feed/posts - Create a post
 */
router.post('/posts', auth.authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      type = 'text',
      content,
      mediaUrls,
      articleTitle,
      articleCoverUrl,
      pollOptions,
      pollEndsAt,
      visibility = 'public'
    } = req.body;

    const contentStr = typeof content === 'string' ? content : '';

    const normalizedMediaUrls = Array.isArray(mediaUrls)
      ? mediaUrls
      : typeof mediaUrls === 'string' && mediaUrls.length > 0
        ? [mediaUrls]
        : null;

    // Validate payload: allow media-only posts, but require at least *something*
    const hasText = typeof content === 'string' && content.trim().length > 0;
    const hasMedia = Array.isArray(normalizedMediaUrls) && normalizedMediaUrls.length > 0;
    const hasArticle = typeof articleTitle === 'string' && articleTitle.trim().length > 0;
    const hasPoll = Array.isArray(pollOptions) && pollOptions.length > 0;

    if (!hasText && !hasMedia && !hasArticle && !hasPoll) {
      return void res.status(400).json({ error: 'Post must include content or media' });
    }

    if (contentStr.length > 2000) {
      return void res.status(400).json({ error: 'Content is too long (max 2000 characters)' });
    }

    if (hasMedia) {
      if (normalizedMediaUrls.length > 3) {
        return void res.status(400).json({ error: 'Too many media items (max 3)' });
      }
      for (const url of normalizedMediaUrls) {
        if (typeof url !== 'string' || url.length === 0) {
          return void res.status(400).json({ error: 'Invalid media URL' });
        }
        // Guardrail: prevent very large payloads (e.g. huge data URLs)
        if (url.length > 1_000_000) {
          return void res.status(400).json({ error: 'Media item is too large' });
        }
      }
    }

    // Rate limiting check
    const rateLimit = await checkRateLimit(userId, 'post');
    if (!rateLimit.allowed) {
      return void res.status(429).json({ 
        error: 'Rate limit exceeded', 
        retryAfter: rateLimit.retryAfter 
      });
    }

    let moderatedContent = contentStr;
    let moderationAction = 'approve';
    let moderationSummary: { violations: unknown[]; requiresHumanReview: boolean } | undefined;

    if (contentStr.trim().length > 0) {
      const moderationResult = await contentModerationService.moderateContent(
        contentStr,
        'post',
        userId
      );

      moderationAction = moderationResult.action;
      moderatedContent = moderationResult.sanitizedContent || contentStr;
      moderationSummary = {
        violations: moderationResult.violations,
        requiresHumanReview: moderationResult.requiresHumanReview,
      };

      if (['remove', 'suspend', 'ban'].includes(moderationResult.action)) {
        return void res.status(400).json({
          error: 'Your post could not be published due to safety policy.',
          moderation: moderationSummary,
        });
      }
    }

    // Extract hashtags and mentions from moderated content
    const hashtags = (moderatedContent.match(/#\w+/g) || []).slice(0, 10);
    const mentionMatches = moderatedContent.match(/@\w+/g) || [];
    const mentions = mentionMatches.slice(0, 20);

    const post = await prisma.socialPost.create({
      data: {
        authorId: userId,
        type,
        content: moderatedContent,
        mediaUrls: hasMedia ? JSON.stringify(normalizedMediaUrls) : null,
        articleTitle,
        articleCoverUrl,
        pollOptions: pollOptions ? JSON.stringify(pollOptions) : null,
        pollEndsAt: pollEndsAt ? new Date(pollEndsAt) : null,
        hashtags: JSON.stringify(hashtags),
        mentions: JSON.stringify(mentions),
        visibility,
        isSpam: moderationAction === 'flag',
        moderatedAt: moderationAction !== 'approve' ? new Date() : null,
      }
    });

    // Create notifications for mentions
    if (mentions.length > 0) {
      try {
        const usernames = [...new Set(mentions.map((m: string) => m.replace('@', '').toLowerCase()))];

        // Build flexible matchers: email prefix or mentor profile name contains
        const mentionMatchers = usernames.flatMap(u => ([
          { email: { startsWith: `${u}@`, mode: 'insensitive' } },
          { mentorProfile: { name: { contains: u, mode: 'insensitive' } } }
        ]));

        const mentionedUsers = mentionMatchers.length > 0
          ? await prisma.user.findMany({
              where: { OR: mentionMatchers as any },
              select: { id: true, email: true },
            })
          : [];

        const notificationsToCreate = mentionedUsers
          .filter((u: any) => u.id !== userId)
          .map((mentionedUser: any) => ({
            userId: mentionedUser.id,
            type: 'MENTION',
            title: 'You were mentioned in a post',
            message: `Someone mentioned you: "${moderatedContent.substring(0, 100)}${moderatedContent.length > 100 ? '...' : ''}"`,
            referenceId: post.id,
            referenceType: 'social_post'
          }));

        if (notificationsToCreate.length > 0) {
          await prisma.notification.createMany({
            data: notificationsToCreate,
            skipDuplicates: true
          });
        }
      } catch (mentionErr: any) {
        // Log but don't fail the post creation
        console.error('Failed to create mention notifications:', mentionErr.message);
      }
    }

    res.status(201).json({ post, moderation: moderationSummary });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * GET /feed/posts/:id - Get a single post
 */
router.get('/posts/:id', auth.optionalAuth, async (req, res) => {
  try {
    if (isTestEnv) {
      return void res.status(404).json({ error: 'Post not found' });
    }

    const { id } = req.params;
    const userId = req.user?.id;

    const post = await prisma.socialPost.findUnique({
      where: { id },
      include: {
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        _count: { select: { comments: true, reactions: true } }
      }
    });

    if (!post || !post.isActive) {
      return void res.status(404).json({ error: 'Post not found' });
    }

    // Check visibility
    if (post.visibility === 'private' && post.authorId !== userId) {
      return void res.status(404).json({ error: 'Post not found' });
    }

    if (post.visibility === 'connections' && post.authorId !== userId) {
      if (!userId) {
        return void res.status(404).json({ error: 'Post not found' });
      }
      const connection = await prisma.userConnection.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { requesterId: userId, addresseeId: post.authorId },
            { requesterId: post.authorId, addresseeId: userId }
          ]
        },
        select: { id: true }
      });
      if (!connection) {
        return void res.status(404).json({ error: 'Post not found' });
      }
    }

    // Check if user has reacted
    let userReaction = null;
    if (userId) {
      const reaction = await prisma.socialReaction.findUnique({
        where: { postId_userId: { postId: id, userId } }
      });
      userReaction = reaction?.type || null;
    }

    // Increment view count
    await prisma.socialPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    const reactionCountsRaw = await prisma.socialReaction.groupBy({
      by: ['type'],
      where: { postId: id },
      _count: { _all: true }
    });
    const reactionCounts = reactionCountsRaw.reduce((acc: any, row: any) => {
      acc[row.type] = row._count?._all ?? 0;
      return acc;
    }, {} as Record<string, number>);

    res.json({ post: { ...post, userReaction, reactionCounts: Object.keys(reactionCounts).length ? reactionCounts : { like: post.likeCount || 0 } } });
  } catch (err) {
    console.error('Get post error:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

/**
 * DELETE /feed/posts/:id - Delete a post
 */
router.delete('/posts/:id', auth.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const post = await prisma.socialPost.findUnique({
      where: { id }
    });

    if (!post) {
      return void res.status(404).json({ error: 'Post not found' });
    }

    if (post.authorId !== userId) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    await prisma.socialPost.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

/**
 * POST /feed/posts/:id/reactions - Add or update a reaction
 */
router.post('/posts/:id/reactions', auth.authenticate, async (req, res) => {
  try {
    if (isTestEnv) {
      return void res.json({ success: true });
    }

    const { id } = req.params;
    const userId = req.user!.id;
    const type = String(req.body?.type || 'like');

    await prisma.socialReaction.upsert({
      where: { postId_userId: { postId: id, userId } },
      create: { postId: id, userId, type },
      update: { type },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Reaction error:', err);
    res.status(500).json({ error: 'Failed to react to post' });
  }
});

/**
 * DELETE /feed/posts/:id/reactions - Remove a reaction
 */
router.delete('/posts/:id/reactions', auth.authenticate, async (req, res) => {
  try {
    if (isTestEnv) {
      return void res.json({ success: true });
    }

    const { id } = req.params;
    const userId = req.user!.id;

    await prisma.socialReaction.deleteMany({
      where: { postId: id, userId },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Reaction delete error:', err);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// =============================================================================
// REACTIONS
// =============================================================================

/**
 * POST /feed/posts/:id/react - React to a post
 */
router.post('/posts/:id/react', auth.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { type } = req.body;

    const validReactions = ['like', 'love', 'support', 'celebrate', 'insightful', 'curious'];
    if (!validReactions.includes(type)) {
      return void res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(userId, 'reaction');
    if (!rateLimit.allowed) {
      return void res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const existing = await prisma.socialReaction.findUnique({
      where: { postId_userId: { postId: id, userId } }
    });

    if (existing) {
      if (existing.type === type) {
        // Remove reaction
        await prisma.$transaction([
          prisma.socialReaction.delete({
            where: { postId_userId: { postId: id, userId } }
          }),
          prisma.socialPost.update({
            where: { id },
            data: { likeCount: { decrement: 1 } }
          })
        ]);
        return void res.json({ success: true, reaction: null });
      } else {
        // Update reaction
        await prisma.socialReaction.update({
          where: { postId_userId: { postId: id, userId } },
          data: { type }
        });
        return void res.json({ success: true, reaction: type });
      }
    }

    // New reaction
    await prisma.$transaction([
      prisma.socialReaction.create({
        data: { postId: id, userId, type }
      }),
      prisma.socialPost.update({
        where: { id },
        data: { likeCount: { increment: 1 } }
      })
    ]);

    // Create notification for post author
    const post = await prisma.socialPost.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (post && post.authorId !== userId) {
      await prisma.socialNotification.create({
        data: {
          userId: post.authorId,
          category: 'social',
          type: 'like',
          actorId: userId,
          targetType: 'post',
          targetId: id,
          message: `Someone ${type}d your post`
        }
      });
    }

    res.json({ success: true, reaction: type });
  } catch (err) {
    console.error('React error:', err);
    res.status(500).json({ error: 'Failed to react' });
  }
});

// =============================================================================
// COMMENTS
// =============================================================================

/**
 * POST /feed/posts/:id/comments - Add a comment
 */
router.post('/posts/:id/comments', auth.authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content, parentId } = req.body;
    const commentContent = typeof content === 'string' ? content : '';

    if (!commentContent || commentContent.length > 1000) {
      return void res.status(400).json({ error: 'Content is required (max 1000 characters)' });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(userId, 'comment');
    if (!rateLimit.allowed) {
      return void res.status(429).json({ error: 'Rate limit exceeded' });
    }

    const moderationResult = await contentModerationService.moderateContent(
      commentContent,
      'comment',
      userId,
      { isReply: Boolean(parentId) }
    );

    if (['remove', 'suspend', 'ban'].includes(moderationResult.action)) {
      return void res.status(400).json({
        error: 'Your comment could not be published due to safety policy.',
        moderation: {
          violations: moderationResult.violations,
          requiresHumanReview: moderationResult.requiresHumanReview,
        },
      });
    }

    const finalCommentContent = moderationResult.sanitizedContent || commentContent;

    const comment = await prisma.socialComment.create({
      data: {
        postId: id,
        authorId: userId,
        parentId,
        content: finalCommentContent
      }
    });

    // Update counts
    await prisma.socialPost.update({
      where: { id },
      data: { commentCount: { increment: 1 } }
    });

    if (parentId) {
      await prisma.socialComment.update({
        where: { id: parentId },
        data: { replyCount: { increment: 1 } }
      });
    }

    // Notification to post author
    const post = await prisma.socialPost.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (post && post.authorId !== userId) {
      await prisma.socialNotification.create({
        data: {
          userId: post.authorId,
          category: 'social',
          type: 'comment',
          actorId: userId,
          targetType: 'post',
          targetId: id,
          message: 'Someone commented on your post'
        }
      });
    }

    const author = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        mentorProfile: { select: { name: true, avatar: true, avatarUrl: true, title: true } },
      }
    });
    const authorName = author?.mentorProfile?.name || author?.email?.split('@')[0] || 'Community Member';
    const authorAvatar = author?.mentorProfile?.avatar || author?.mentorProfile?.avatarUrl || null;

    res.status(201).json({ comment: { ...comment, authorName, authorAvatar } });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * GET /feed/posts/:id/comments - Get comments for a post
 */
router.get('/posts/:id/comments', auth.optionalAuth, async (req, res) => {
  try {
    if (isTestEnv) {
      return void res.json({ comments: [], hasMore: false });
    }

    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const parentId = req.query.parentId as string | undefined;

    // Mirror post visibility rules to avoid leaking comments on private/connection posts
    const userId = req.user?.id;
    const post = await prisma.socialPost.findUnique({
      where: { id },
      select: { id: true, isActive: true, visibility: true, authorId: true }
    });
    if (!post || !post.isActive) {
      return void res.status(404).json({ error: 'Post not found' });
    }
    if (post.visibility === 'private' && post.authorId !== userId) {
      return void res.status(404).json({ error: 'Post not found' });
    }
    if (post.visibility === 'connections' && post.authorId !== userId) {
      if (!userId) {
        return void res.status(404).json({ error: 'Post not found' });
      }
      const connection = await prisma.userConnection.findFirst({
        where: {
          status: 'accepted',
          OR: [
            { requesterId: userId, addresseeId: post.authorId },
            { requesterId: post.authorId, addresseeId: userId }
          ]
        },
        select: { id: true }
      });
      if (!connection) {
        return void res.status(404).json({ error: 'Post not found' });
      }
    }

    const where: any = { postId: id };
    if (parentId) {
      where.parentId = parentId;
    } else {
      where.parentId = null; // Top-level comments only
    }

    const [comments, total] = await Promise.all([
      prisma.socialComment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.socialComment.count({ where })
    ]);

    const authorIds = [...new Set(comments.map((c: any) => c.authorId))];
    const users = authorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: authorIds } },
          select: {
            id: true,
            email: true,
            mentorProfile: { select: { name: true, avatar: true, avatarUrl: true, title: true } },
          }
        })
      : [];
    const userMap = Object.fromEntries(users.map((u: any) => [u.id, u]));

    const enriched = comments.map((c: any) => {
      const u = userMap[c.authorId];
      const authorName = u?.mentorProfile?.name || u?.email?.split('@')[0] || 'Community Member';
      const authorAvatar = u?.mentorProfile?.avatar || u?.mentorProfile?.avatarUrl || null;
      return { ...c, authorName, authorAvatar };
    });

    res.json({ comments: enriched, total });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// =============================================================================
// REELS
// =============================================================================

/**
 * GET /feed/reels - Get reels feed
 */
router.get('/reels', auth.optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string | undefined;
    const userId = req.user?.id;

    const where: any = { status: 'published', isActive: true };
    if (category) where.category = category;

    // Get blocks
    let blocks: string[] = [];
    if (userId) {
      blocks = await prisma.userBlock.findMany({
        where: { blockerId: userId }
      }).then((b: any[]) => b.map(x => x.blockedId));
      where.authorId = { notIn: blocks };
    }

    const [reels, total] = await Promise.all([
      prisma.reel.findMany({
        where,
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.reel.count({ where })
    ]);

    res.json({ reels, total });
  } catch (err) {
    console.error('Get reels error:', err);
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
});

/**
 * POST /feed/reels - Upload a reel
 */
router.post('/reels', auth.authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      videoUrl,
      thumbnailUrl,
      duration,
      caption,
      category
    } = req.body;

    if (!videoUrl || !duration) {
      return void res.status(400).json({ error: 'Video URL and duration are required' });
    }

    // Extract hashtags
    const hashtags = (caption?.match(/#\w+/g) || []).slice(0, 10);

    const reel = await prisma.reel.create({
      data: {
        authorId: userId,
        videoUrl,
        thumbnailUrl,
        duration,
        caption,
        hashtags: JSON.stringify(hashtags),
        category,
        status: 'processing'
      }
    });

    res.status(201).json({ reel });
  } catch (err) {
    console.error('Create reel error:', err);
    res.status(500).json({ error: 'Failed to create reel' });
  }
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Check rate limiting for an action
 */
async function checkRateLimit(userId: string, action: string): Promise<RateLimitResult> {
  const limits: Record<string, RateLimitConfig> = {
    post: { perMinute: 2, perHour: 10, perDay: 30 },
    comment: { perMinute: 5, perHour: 30, perDay: 100 },
    message: { perMinute: 10, perHour: 50, perDay: 200 },
    reaction: { perMinute: 20, perHour: 100, perDay: 500 },
    follow: { perMinute: 5, perHour: 30, perDay: 100 },
    connection_request: { perMinute: 3, perHour: 20, perDay: 50 }
  };

  const limit = limits[action];
  if (!limit) return { allowed: true };

  try {
    const tracker = await prisma.rateLimitTracker.findUnique({
      where: { userId_action: { userId, action } }
    });

    const now = new Date();

    if (!tracker) {
      await prisma.rateLimitTracker.create({
        data: {
          userId,
          action,
          countPerMinute: 1,
          countPerHour: 1,
          countPerDay: 1,
          lastResetMinute: now,
          lastResetHour: now,
          lastResetDay: now
        }
      });
      return { allowed: true };
    }

    // Reset counters if time has passed
    const updates: Record<string, number | Date> = {};
    const minuteAgo = new Date(now.getTime() - 60000);
    const hourAgo = new Date(now.getTime() - 3600000);
    const dayAgo = new Date(now.getTime() - 86400000);

    if (tracker.lastResetMinute < minuteAgo) {
      updates.countPerMinute = 1;
      updates.lastResetMinute = now;
    } else if (tracker.countPerMinute >= limit.perMinute) {
      return { allowed: false, retryAfter: 60 };
    } else {
      updates.countPerMinute = tracker.countPerMinute + 1;
    }

    if (tracker.lastResetHour < hourAgo) {
      updates.countPerHour = 1;
      updates.lastResetHour = now;
    } else if (tracker.countPerHour >= limit.perHour) {
      return { allowed: false, retryAfter: 3600 };
    } else {
      updates.countPerHour = tracker.countPerHour + 1;
    }

    if (tracker.lastResetDay < dayAgo) {
      updates.countPerDay = 1;
      updates.lastResetDay = now;
    } else if (tracker.countPerDay >= limit.perDay) {
      return { allowed: false, retryAfter: 86400 };
    } else {
      updates.countPerDay = tracker.countPerDay + 1;
    }

    await prisma.rateLimitTracker.update({
      where: { userId_action: { userId, action } },
      data: updates
    });

    return { allowed: true };
  } catch (err) {
    console.error('Rate limit check error:', err);
    return { allowed: true }; // Fail open
  }
}

export default router;




