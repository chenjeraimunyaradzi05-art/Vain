/**
 * Feed Ranking Service
 * 
 * Implements a sophisticated feed ranking algorithm that considers:
 * - Recency: Time decay with configurable half-life
 * - Engagement: Likes, comments, shares with weighted scoring
 * - Relationship: Connection strength between users
 * - Quality: Author trust level and content quality signals
 * - Cultural Relevance: Indigenous community context (unique to Ngurra)
 */

import { prisma as prismaClient } from '../db';
import redisCacheClient from '../lib/redisCacheWrapper';

const prisma = prismaClient as any;
const redisCache = redisCacheClient as any;

// Feed ranking weights
interface FeedWeights {
  recency: number;
  engagement: number;
  relationship: number;
  quality: number;
  culturalRelevance: number;
}

// Default weights optimized for Ngurra community platform
const DEFAULT_WEIGHTS: FeedWeights = {
  recency: 0.30,          // Time decay
  engagement: 0.25,       // User interactions
  relationship: 0.20,     // Connection strength
  quality: 0.15,          // Author trust/verification
  culturalRelevance: 0.10 // Indigenous community relevance
};

// Configurable time decay parameters
const RECENCY_HALF_LIFE_HOURS = 6; // Posts lose half their recency score after 6 hours
const RECENCY_HALF_LIFE_MS = RECENCY_HALF_LIFE_HOURS * 60 * 60 * 1000;

// Engagement weights for different interaction types
const ENGAGEMENT_WEIGHTS = {
  like: 1,
  love: 2,
  support: 2,
  celebrate: 2,
  comment: 3,
  share: 5,
  save: 4
};

// Trust level multipliers
const TRUST_MULTIPLIERS: Record<string, number> = {
  elder: 1.2,      // Community elders get boost
  mentor: 1.1,     // Verified mentors
  verified: 1.0,   // Verified users
  trusted: 0.95,   // Long-standing community members
  normal: 0.8,     // Regular users
  new: 0.7         // New accounts (anti-spam)
};

// Cultural relevance keywords (Indigenous Australian context)
const CULTURAL_KEYWORDS = [
  'country', 'culture', 'community', 'dreaming', 'elder',
  'family', 'kinship', 'land', 'language', 'mob',
  'nation', 'spirit', 'story', 'traditional', 'yarning',
  'aboriginal', 'torres strait', 'indigenous', 'first nations',
  'welcome to country', 'acknowledgement', 'naidoc', 'reconciliation'
];

export interface PostWithAuthor {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  mediaUrls?: string[];
  likes: number;
  commentCount: number;
  shareCount: number;
  saveCount?: number;
  author: {
    id: string;
    name: string;
    avatar?: string | null;
    trustLevel?: string;
    followersCount?: number;
    isVerified?: boolean;
    isMentor?: boolean;
    isElder?: boolean;
  };
  userReaction?: { type: string }[];
  reactions?: Array<{ type: string; userId: string }>;
}

export interface RankedPost extends PostWithAuthor {
  score: number;
  scoreComponents: {
    recency: number;
    engagement: number;
    relationship: number;
    quality: number;
    culturalRelevance: number;
  };
}

export interface UserContext {
  userId: string;
  connections: string[];
  following: string[];
  interests?: string[];
  timezone?: string;
  preferredLanguage?: string;
}

export class FeedRankingService {
  private weights: FeedWeights;

  constructor(weights: Partial<FeedWeights> = {}) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Calculate the overall score for a post based on user context
   */
  calculateScore(post: PostWithAuthor, userContext: UserContext): RankedPost {
    const recencyScore = this.calculateRecencyScore(post.createdAt);
    const engagementScore = this.calculateEngagementScore(post);
    const relationshipScore = this.calculateRelationshipScore(post, userContext);
    const qualityScore = this.calculateQualityScore(post.author);
    const culturalScore = this.calculateCulturalRelevance(post.content);

    const totalScore = 
      recencyScore * this.weights.recency +
      engagementScore * this.weights.engagement +
      relationshipScore * this.weights.relationship +
      qualityScore * this.weights.quality +
      culturalScore * this.weights.culturalRelevance;

    return {
      ...post,
      score: totalScore,
      scoreComponents: {
        recency: recencyScore,
        engagement: engagementScore,
        relationship: relationshipScore,
        quality: qualityScore,
        culturalRelevance: culturalScore
      }
    };
  }

  /**
   * Calculate recency score with exponential time decay
   * Posts lose half their recency value after RECENCY_HALF_LIFE_HOURS
   */
  private calculateRecencyScore(createdAt: Date): number {
    const ageMs = Date.now() - createdAt.getTime();
    
    // Exponential decay: score = e^(-λt) where λ = ln(2) / half-life
    const decayConstant = Math.log(2) / RECENCY_HALF_LIFE_MS;
    const score = Math.exp(-decayConstant * ageMs);
    
    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate engagement score based on weighted interactions
   */
  private calculateEngagementScore(post: PostWithAuthor): number {
    // Calculate weighted engagement sum
    let weightedEngagement = 0;
    
    // Count reactions by type if available
    if (post.reactions) {
      const reactionCounts = post.reactions.reduce((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const [type, count] of Object.entries(reactionCounts)) {
        const weight = ENGAGEMENT_WEIGHTS[type as keyof typeof ENGAGEMENT_WEIGHTS] || 1;
        weightedEngagement += count * weight;
      }
    } else {
      // Fallback to aggregate counts
      weightedEngagement = 
        (post.likes || 0) * ENGAGEMENT_WEIGHTS.like +
        (post.commentCount || 0) * ENGAGEMENT_WEIGHTS.comment +
        (post.shareCount || 0) * ENGAGEMENT_WEIGHTS.share +
        (post.saveCount || 0) * ENGAGEMENT_WEIGHTS.save;
    }

    // Use logarithmic scaling to prevent viral posts from dominating
    // log(x+1) / log(100) normalizes to roughly 0-1 for reasonable engagement levels
    const normalizedScore = Math.log10(weightedEngagement + 1) / Math.log10(100);
    
    return Math.min(1, normalizedScore);
  }

  /**
   * Calculate relationship score based on connection strength
   */
  private calculateRelationshipScore(
    post: PostWithAuthor,
    userContext: UserContext
  ): number {
    const authorId = post.authorId;
    
    // Own posts get highest score
    if (authorId === userContext.userId) {
      return 1.0;
    }

    let score = 0.3; // Base score for non-connected users

    // Direct connection (friend/connection)
    if (userContext.connections.includes(authorId)) {
      score = 0.85;
    }
    // Following but not connected
    else if (userContext.following.includes(authorId)) {
      score = 0.7;
    }

    // Boost for mutual connections (would require async lookup)
    // In production, this would be pre-computed or cached

    return score;
  }

  /**
   * Calculate quality score based on author trust level and verification
   */
  private calculateQualityScore(author: PostWithAuthor['author']): number {
    let trustLevel = author.trustLevel || 'normal';
    
    // Override trust level based on special statuses
    if (author.isElder) trustLevel = 'elder';
    else if (author.isMentor) trustLevel = 'mentor';
    else if (author.isVerified) trustLevel = 'verified';

    const multiplier = TRUST_MULTIPLIERS[trustLevel] || TRUST_MULTIPLIERS.normal;
    
    // Factor in follower count (social proof) with diminishing returns
    const followerBoost = author.followersCount 
      ? Math.log10(author.followersCount + 1) / 10 
      : 0;

    return Math.min(1, multiplier * 0.8 + followerBoost);
  }

  /**
   * Calculate cultural relevance score for Indigenous community content
   * This is a unique feature for Ngurra Pathways
   */
  private calculateCulturalRelevance(content: string): number {
    const lowerContent = content.toLowerCase();
    
    // Count how many cultural keywords appear in the content
    let keywordMatches = 0;
    for (const keyword of CULTURAL_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        keywordMatches++;
      }
    }

    // Normalize: 3+ keywords = max score
    const score = Math.min(1, keywordMatches / 3);
    
    return score;
  }

  /**
   * Rank a list of posts for a user
   */
  async rankPosts(
    posts: PostWithAuthor[],
    userContext: UserContext
  ): Promise<RankedPost[]> {
    const rankedPosts = posts.map(post => this.calculateScore(post, userContext));
    
    // Sort by score descending
    rankedPosts.sort((a, b) => b.score - a.score);
    
    return rankedPosts;
  }

  /**
   * Get ranked feed for a user with caching
   */
  async getRankedFeed(
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<{
    posts: RankedPost[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    // Try to get from cache first
    const cacheKey = `feed:ranked:${userId}:${cursor || 'start'}`;
    const cached = await redisCache.get(cacheKey) as RankedPost[];
    
    if (cached) {
      return {
        posts: cached.slice(0, limit),
        nextCursor: cached.length > limit ? cached[limit - 1].id : null,
        hasMore: cached.length > limit
      };
    }

    // Build user context
    const userContext = await this.buildUserContext(userId);
    
    // Fetch candidate posts
    const posts = await this.fetchCandidatePosts(userId, cursor, limit * 3);
    
    // Rank posts
    const rankedPosts = await this.rankPosts(posts, userContext);
    
    // Cache for 5 minutes
    await redisCache.set(cacheKey, rankedPosts.slice(0, limit * 2), 300);

    const resultPosts = rankedPosts.slice(0, limit);
    
    return {
      posts: resultPosts,
      nextCursor: rankedPosts.length > limit ? rankedPosts[limit - 1].id : null,
      hasMore: rankedPosts.length > limit
    };
  }

  /**
   * Build user context for ranking calculations
   */
  private async buildUserContext(userId: string): Promise<UserContext> {
    // Try cache first
    const cacheKey = `user:context:${userId}`;
    const cached = await redisCache.get(cacheKey) as UserContext;
    if (cached) return cached;

    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        preferences: true
      }
    });

    // Fetch connections
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { receiverId: userId, status: 'accepted' }
        ]
      },
      select: {
        requesterId: true,
        receiverId: true
      }
    });

    const connectionIds = connections.map(c => 
      c.requesterId === userId ? c.receiverId : c.requesterId
    );

    // For now, following = connections (could be different in future)
    const following = connectionIds;

    const context: UserContext = {
      userId,
      connections: connectionIds,
      following
    };

    // Cache for 10 minutes
    await redisCache.set(cacheKey, context, 600);

    return context;
  }

  /**
   * Fetch candidate posts for ranking
   */
  private async fetchCandidatePosts(
    userId: string,
    cursor?: string,
    limit: number = 60
  ): Promise<PostWithAuthor[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get user's connections
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: userId, status: 'accepted' },
          { receiverId: userId, status: 'accepted' }
        ]
      },
      select: {
        requesterId: true,
        receiverId: true
      }
    });

    const connectionIds = connections.map(c => 
      c.requesterId === userId ? c.receiverId : c.requesterId
    );

    // Fetch posts from multiple sources
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          // User's own posts (last week)
          { 
            authorId: userId,
            createdAt: { gte: oneWeekAgo }
          },
          // Posts from connections (last 3 days)
          {
            authorId: { in: connectionIds },
            createdAt: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
          },
          // Trending posts (high engagement in last 24 hours)
          {
            createdAt: { gte: oneDayAgo },
            likes: { gte: 10 }
          },
          // Posts from mentors (last week)
          {
            author: { isMentor: true },
            createdAt: { gte: oneWeekAgo }
          }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
            // @ts-ignore - These fields may not exist in current schema
            trustLevel: true,
            followersCount: true,
            isVerified: true,
            isMentor: true
          }
        },
        reactions: {
          select: {
            type: true,
            userId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined
    });

    // Transform to expected format
    return posts.map(post => ({
      ...post,
      likes: post.reactions?.filter(r => r.type === 'like').length || 0,
      commentCount: 0, // Would need comment count aggregation
      shareCount: 0,
      author: {
        id: post.author.id,
        name: post.author.name,
        avatar: post.author.avatar,
        trustLevel: 'normal',
        followersCount: 0,
        isVerified: false,
        isMentor: false,
        isElder: false
      }
    })) as PostWithAuthor[];
  }

  /**
   * Invalidate feed cache when content changes
   */
  async invalidateFeedCache(userId: string): Promise<void> {
    // Pattern-based deletion
    await redisCache.deletePattern(`feed:ranked:${userId}:*`);
    await redisCache.deletePattern(`user:context:${userId}`);
  }

  /**
   * Invalidate caches for all followers when author creates post
   */
  async invalidateFollowerFeeds(authorId: string): Promise<void> {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { requesterId: authorId, status: 'accepted' },
          { receiverId: authorId, status: 'accepted' }
        ]
      },
      select: {
        requesterId: true,
        receiverId: true
      }
    });

    const followerIds = connections.map(c => 
      c.requesterId === authorId ? c.receiverId : c.requesterId
    );

    // Invalidate each follower's feed cache
    await Promise.all(
      followerIds.map(id => this.invalidateFeedCache(id))
    );
  }

  /**
   * Get trending posts (for discovery/explore)
   */
  async getTrendingPosts(limit: number = 20): Promise<PostWithAuthor[]> {
    const cacheKey = 'feed:trending';
    const cached = await redisCache.get(cacheKey) as PostWithAuthor[];
    if (cached) return cached.slice(0, limit);

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const posts = await prisma.post.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
        likes: { gte: 5 }
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        reactions: {
          select: {
            type: true,
            userId: true
          }
        }
      },
      orderBy: [
        { likes: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit * 2
    });

    const transformedPosts = posts.map(post => ({
      ...post,
      likes: post.reactions?.filter(r => r.type === 'like').length || 0,
      commentCount: 0,
      shareCount: 0,
      author: {
        id: post.author.id,
        name: post.author.name,
        avatar: post.author.avatar,
        trustLevel: 'normal',
        followersCount: 0,
        isVerified: false,
        isMentor: false,
        isElder: false
      }
    })) as PostWithAuthor[];

    // Cache for 15 minutes
    await redisCache.set(cacheKey, transformedPosts, 900);

    return transformedPosts.slice(0, limit);
  }

  /**
   * A/B test different ranking weights
   */
  async getExperimentalFeed(
    userId: string,
    experimentId: string,
    variant: 'control' | 'treatment'
  ): Promise<RankedPost[]> {
    // Define experiment variants
    const variants: Record<string, Record<'control' | 'treatment', Partial<FeedWeights>>> = {
      'exp-001-engagement': {
        control: {},
        treatment: { engagement: 0.35, recency: 0.25 }
      },
      'exp-002-cultural': {
        control: {},
        treatment: { culturalRelevance: 0.20, recency: 0.25 }
      }
    };

    const experimentWeights = variants[experimentId]?.[variant] || {};
    const experimentalRanker = new FeedRankingService(experimentWeights);

    const userContext = await this.buildUserContext(userId);
    const posts = await this.fetchCandidatePosts(userId, undefined, 60);
    
    return experimentalRanker.rankPosts(posts, userContext);
  }
}

// Export singleton instance
export const feedRankingService = new FeedRankingService();


