// @ts-nocheck
'use strict';

/**
 * Content Recommendations Engine
 * Step 39: Personalized content discovery
 * 
 * Provides:
 * - Forum thread recommendations based on interests
 * - Success story suggestions by industry
 * - Trending content sections
 * - Personalized feed algorithm
 * - Content discovery features
 */

const { prisma } = require('../db');
const logger = require('./logger');
const redisCache = require('./redisCache');

/**
 * Get personalized content feed for a user
 * @param {string} userId - User ID
 * @param {object} options - Feed options
 */
async function getPersonalizedFeed(userId, options = {}) {
  const {
    limit = 20,
    includeForums = true,
    includeStories = true,
    includeEvents = true,
    includeAnnouncements = true
  } = options;

  try {
    // Get user preferences and history
    const userContext = await getUserContext(userId);

    const feedItems = [];

    // Get content from each source
    if (includeForums) {
      const forums = await getRecommendedForums(userContext, Math.ceil(limit * 0.3));
      feedItems.push(...forums.map(f => ({ type: 'forum', ...f })));
    }

    if (includeStories) {
      const stories = await getRecommendedStories(userContext, Math.ceil(limit * 0.3));
      feedItems.push(...stories.map(s => ({ type: 'story', ...s })));
    }

    if (includeEvents) {
      const events = await getUpcomingEvents(userContext, Math.ceil(limit * 0.2));
      feedItems.push(...events.map(e => ({ type: 'event', ...e })));
    }

    if (includeAnnouncements) {
      const announcements = await getRelevantAnnouncements(userContext, Math.ceil(limit * 0.2));
      feedItems.push(...announcements.map(a => ({ type: 'announcement', ...a })));
    }

    // Score and sort feed items
    const scoredItems = feedItems.map(item => ({
      ...item,
      feedScore: calculateFeedScore(item, userContext)
    }));

    // Sort by score with recency boost
    scoredItems.sort((a, b) => b.feedScore - a.feedScore);

    return {
      feed: scoredItems.slice(0, limit),
      userInterests: userContext.interests,
      timestamp: new Date()
    };
  } catch (error) {
    logger.error('Personalized feed error', { userId, error: error.message });
    return { feed: [], error: error.message };
  }
}

/**
 * Get user context for personalization
 */
async function getUserContext(userId) {
  if (!userId) {
    return { 
      interests: [], 
      industry: null, 
      location: null, 
      engagedTopics: [],
      isAnonymous: true 
    };
  }

  try {
    const cacheKey = `user_context:${userId}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        skills: { include: { skill: true } },
        forumReplies: {
          select: { thread: { select: { category: true, tags: true } } },
          take: 20,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    // Extract engaged topics from forum activity
    const engagedTopics = new Set();
    user?.forumReplies?.forEach(reply => {
      if (reply.thread?.category) engagedTopics.add(reply.thread.category);
      if (reply.thread?.tags) {
        reply.thread.tags.split(',').forEach(t => engagedTopics.add(t.trim()));
      }
    });

    const context = {
      interests: user?.skills?.map(s => s.skill?.name) || [],
      industry: user?.profile?.industry || null,
      location: user?.profile?.location || null,
      engagedTopics: Array.from(engagedTopics),
      userType: user?.userType || null,
      isAnonymous: false
    };

    await redisCache.set(cacheKey, context, 3600); // Cache 1 hour
    return context;
  } catch (error) {
    return { interests: [], industry: null, location: null, engagedTopics: [], isAnonymous: true };
  }
}

/**
 * Get recommended forum threads
 */
async function getRecommendedForums(userContext, limit = 10) {
  try {
    const whereClause = {
      isPublished: true,
      isLocked: false
    };

    // Filter by user's engaged topics if available
    if (userContext.engagedTopics?.length > 0) {
      whereClause.OR = [
        { category: { in: userContext.engagedTopics } },
        { tags: { contains: userContext.engagedTopics[0] } }
      ];
    }

    const threads = await prisma.forumThread.findMany({
      where: whereClause,
      include: {
        author: { select: { name: true } },
        _count: { select: { replies: true } }
      },
      orderBy: [
        { isPinned: 'desc' },
        { lastActivityAt: 'desc' }
      ],
      take: limit * 2 // Get extra for scoring
    });

    // Score and return top threads
    return threads
      .map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        author: t.author?.name || 'Anonymous',
        replyCount: t._count.replies,
        isPinned: t.isPinned,
        createdAt: t.createdAt,
        lastActivityAt: t.lastActivityAt,
        relevanceScore: calculateRelevance(t, userContext)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    logger.error('Recommended forums error', { error: error.message });
    return [];
  }
}

/**
 * Get recommended success stories
 */
async function getRecommendedStories(userContext, limit = 10) {
  try {
    const whereClause = {
      isPublished: true,
      isApproved: true
    };

    // Filter by industry if available
    if (userContext.industry) {
      whereClause.industry = { contains: userContext.industry, mode: 'insensitive' };
    }

    const stories = await prisma.successStory.findMany({
      where: whereClause,
      include: {
        author: { select: { name: true, profile: true } }
      },
      orderBy: [
        { isFeatured: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit * 2
    });

    return stories
      .map(s => ({
        id: s.id,
        title: s.title,
        summary: s.summary || s.content?.slice(0, 200),
        author: s.author?.name || 'Community Member',
        industry: s.industry,
        viewCount: s.viewCount || 0,
        isFeatured: s.isFeatured,
        createdAt: s.createdAt,
        relevanceScore: calculateStoryRelevance(s, userContext)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  } catch (error) {
    logger.error('Recommended stories error', { error: error.message });
    return [];
  }
}

/**
 * Get upcoming cultural events
 */
async function getUpcomingEvents(userContext, limit = 5) {
  try {
    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const events = await prisma.culturalEvent.findMany({
      where: {
        isPublished: true,
        startDate: {
          gte: now,
          lte: twoWeeksFromNow
        }
      },
      orderBy: { startDate: 'asc' },
      take: limit
    });

    return events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description?.slice(0, 150),
      startDate: e.startDate,
      endDate: e.endDate,
      location: e.location,
      isOnline: e.isOnline,
      category: e.category
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Get relevant announcements
 */
async function getRelevantAnnouncements(userContext, limit = 5) {
  try {
    const now = new Date();

    const whereClause = {
      isPublished: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } }
      ]
    };

    // Filter by target audience
    if (userContext.userType) {
      whereClause.targetAudience = {
        in: [userContext.userType, 'all', null]
      };
    }

    const announcements = await prisma.announcement.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    });

    return announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content?.slice(0, 200),
      priority: a.priority,
      category: a.category,
      createdAt: a.createdAt
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Get trending content across all types
 */
async function getTrendingContent(options = {}) {
  const { limit = 10, timeframe = 7 } = options; // days
  const since = new Date(Date.now() - timeframe * 24 * 60 * 60 * 1000);

  try {
    const cacheKey = `trending_content:${timeframe}`;
    const cached = await redisCache.get(cacheKey);
    if (cached) return cached;

    const trending = {
      threads: [],
      stories: [],
      topics: []
    };

    // Trending forum threads by engagement
    const threads = await prisma.forumThread.findMany({
      where: {
        isPublished: true,
        lastActivityAt: { gte: since }
      },
      include: {
        _count: { select: { replies: true } }
      },
      orderBy: { viewCount: 'desc' },
      take: limit
    });

    trending.threads = threads.map(t => ({
      id: t.id,
      title: t.title,
      category: t.category,
      viewCount: t.viewCount || 0,
      replyCount: t._count.replies,
      trendScore: (t.viewCount || 0) + (t._count.replies * 5)
    }));

    // Trending success stories
    const stories = await prisma.successStory.findMany({
      where: {
        isPublished: true,
        createdAt: { gte: since }
      },
      orderBy: { viewCount: 'desc' },
      take: Math.ceil(limit / 2)
    });

    trending.stories = stories.map(s => ({
      id: s.id,
      title: s.title,
      industry: s.industry,
      viewCount: s.viewCount || 0
    }));

    // Trending topics from forum categories and tags
    const topicCounts = await prisma.forumThread.groupBy({
      by: ['category'],
      where: {
        lastActivityAt: { gte: since }
      },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
      take: limit
    });

    trending.topics = topicCounts.map(t => ({
      topic: t.category,
      postCount: typeof t._count === 'number' ? t._count : t._count.category
    }));

    await redisCache.set(cacheKey, trending, 3600); // Cache 1 hour
    return trending;
  } catch (error) {
    logger.error('Trending content error', { error: error.message });
    return { threads: [], stories: [], topics: [] };
  }
}

/**
 * Get content discovery page data
 */
async function getDiscoveryPageData(userId = null, options = {}) {
  const { limit = 20 } = options;

  try {
    const userContext = await getUserContext(userId);

    const [
      trending,
      forYou,
      latestStories,
      upcomingEvents,
      popularTopics
    ] = await Promise.all([
      getTrendingContent({ limit: 5 }),
      userId ? getPersonalizedFeed(userId, { limit: 6 }) : { feed: [] },
      getRecommendedStories(userContext, 4),
      getUpcomingEvents(userContext, 4),
      getPopularTopics(5)
    ]);

    return {
      trending,
      forYou: forYou.feed,
      latestStories,
      upcomingEvents,
      popularTopics,
      isPersonalized: !!userId
    };
  } catch (error) {
    logger.error('Discovery page error', { error: error.message });
    return { error: error.message };
  }
}

/**
 * Get popular topics/categories
 */
async function getPopularTopics(limit = 10) {
  try {
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const topics = await prisma.forumThread.groupBy({
      by: ['category'],
      where: {
        isPublished: true,
        createdAt: { gte: lastMonth }
      },
      _count: true,
      orderBy: { _count: { category: 'desc' } },
      take: limit
    });

    return topics.map(t => ({
      name: t.category,
      threadCount: typeof t._count === 'number' ? t._count : t._count.category
    }));
  } catch (error) {
    return [];
  }
}

/**
 * Calculate relevance score for forum thread
 */
function calculateRelevance(thread, userContext) {
  let score = 0;

  // Recency boost (last 24 hours = +20, last week = +10)
  const ageHours = (Date.now() - new Date(thread.lastActivityAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 24) score += 20;
  else if (ageHours < 168) score += 10;

  // Engagement boost
  score += Math.min(20, thread._count?.replies * 2);

  // Pinned boost
  if (thread.isPinned) score += 15;

  // Topic match
  if (userContext.engagedTopics?.includes(thread.category)) score += 25;

  // Industry match (for career-related threads)
  if (userContext.industry && thread.tags?.toLowerCase().includes(userContext.industry.toLowerCase())) {
    score += 15;
  }

  return score;
}

/**
 * Calculate relevance score for success story
 */
function calculateStoryRelevance(story, userContext) {
  let score = 0;

  // Featured boost
  if (story.isFeatured) score += 20;

  // Popularity
  score += Math.min(30, Math.log10((story.viewCount || 1) + 1) * 10);

  // Industry match
  if (userContext.industry && story.industry?.toLowerCase() === userContext.industry.toLowerCase()) {
    score += 30;
  }

  // Recency
  const ageDays = (Date.now() - new Date(story.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays < 7) score += 15;
  else if (ageDays < 30) score += 5;

  return score;
}

/**
 * Calculate overall feed score for an item
 */
function calculateFeedScore(item, userContext) {
  let score = item.relevanceScore || 0;

  // Type diversity (mix content types)
  const typeBoosts = {
    announcement: 10, // Important updates first
    event: 8,         // Time-sensitive
    story: 5,         // Inspirational
    forum: 3          // Discussion
  };
  score += typeBoosts[item.type] || 0;

  // Recency normalization
  const createdAt = item.createdAt || item.lastActivityAt;
  if (createdAt) {
    const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    // Decay over time but don't penalize too much
    score = score * (1 - Math.min(0.5, ageHours / 720)); // 30 days = 50% decay
  }

  return score;
}

/**
 * Track content engagement for improving recommendations
 * @param {string} userId - User ID
 * @param {string} contentType - Type of content
 * @param {string} contentId - Content ID
 * @param {string} action - Engagement type (view, like, share, comment)
 */
async function trackEngagement(userId, contentType, contentId, action) {
  try {
    await prisma.contentEngagement.create({
      data: {
        userId,
        contentType,
        contentId,
        action,
        createdAt: new Date()
      }
    });

    // Invalidate user context cache
    await redisCache.del(`user_context:${userId}`);
  } catch (error) {
    // Model might not exist, silent fail
  }
}
