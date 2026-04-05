/**
 * Advanced Recommendation Engine
 * 
 * Multi-modal recommendation system using:
 * - Collaborative filtering (user-user and item-item)
 * - Content-based filtering
 * - Hybrid approaches
 * - Real-time personalization
 * 
 * Supports recommendations for:
 * - People/Connections
 * - Mentors
 * - Groups
 * - Content/Posts
 * - Events
 * - Learning resources
 */

// In-memory caches for similarity matrices (would use Redis in production)
const userSimilarityCache = new Map<string, Map<string, number>>();
const itemSimilarityCache = new Map<string, Map<string, number>>();
const userInteractionsCache = new Map<string, UserInteractions>();

export const clearRecommendationCaches = () => {
  userSimilarityCache.clear();
  itemSimilarityCache.clear();
  userInteractionsCache.clear();
};

interface UserInteractions {
  likes: Set<string>;
  comments: Set<string>;
  shares: Set<string>;
  views: Set<string>;
  follows: Set<string>;
  joins: Set<string>;
  timestamps: Map<string, number>;
}

interface RecommendationOptions {
  limit?: number;
  offset?: number;
  minScore?: number;
  diversity?: number; // 0-1, how much to prioritize diversity over relevance
  excludeIds?: string[];
  boostFactors?: Record<string, number>;
}

interface RecommendationResult<T> {
  item: T;
  score: number;
  reasons: string[];
  confidence: number;
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Jaccard similarity between two sets
 */
function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  
  return intersection.size / union.size;
}

/**
 * Time decay factor for interactions
 */
function timeDecay(timestamp: number, halfLifeDays: number = 14): number {
  const now = Date.now();
  const ageInDays = (now - timestamp) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageInDays / halfLifeDays);
}

/**
 * Build user interaction profile from database
 */
async function buildUserInteractionProfile(
  prisma: any,
  userId: string
): Promise<UserInteractions> {
  // Check cache first
  const cached = userInteractionsCache.get(userId);
  if (cached) return cached;

  const interactions: UserInteractions = {
    likes: new Set(),
    comments: new Set(),
    shares: new Set(),
    views: new Set(),
    follows: new Set(),
    joins: new Set(),
    timestamps: new Map(),
  };

  try {
    // Get post reactions
    const reactions = await prisma.postReaction.findMany({
      where: { userId },
      select: { postId: true, createdAt: true },
    });
    reactions.forEach((r: any) => {
      interactions.likes.add(r.postId);
      interactions.timestamps.set(r.postId, new Date(r.createdAt).getTime());
    });

    // Get comments
    const comments = await prisma.postComment.findMany({
      where: { authorId: userId },
      select: { postId: true, createdAt: true },
    });
    comments.forEach((c: any) => {
      interactions.comments.add(c.postId);
      interactions.timestamps.set(c.postId, new Date(c.createdAt).getTime());
    });

    // Get connections/follows
    const connections = await prisma.connection.findMany({
      where: { 
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: 'accepted',
      },
      select: { senderId: true, receiverId: true, updatedAt: true },
    });
    connections.forEach((c: any) => {
      const otherId = c.senderId === userId ? c.receiverId : c.senderId;
      interactions.follows.add(otherId);
    });

    // Get group memberships
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true, joinedAt: true },
    });
    memberships.forEach((m: any) => {
      interactions.joins.add(m.groupId);
    });

    // Cache for 5 minutes
    userInteractionsCache.set(userId, interactions);
    setTimeout(() => userInteractionsCache.delete(userId), 5 * 60 * 1000);

    return interactions;
  } catch (error) {
    console.error('[Recommendations] Error building interaction profile:', error);
    return interactions;
  }
}

/**
 * Calculate user-user similarity for collaborative filtering
 */
async function calculateUserSimilarity(
  prisma: any,
  userA: string,
  userB: string
): Promise<number> {
  const cacheKey = [userA, userB].sort().join(':');
  
  // Check cache
  const cached = userSimilarityCache.get(cacheKey);
  if (cached) {
    const similarity = cached.get(cacheKey);
    if (similarity !== undefined) return similarity;
  }

  const interactionsA = await buildUserInteractionProfile(prisma, userA);
  const interactionsB = await buildUserInteractionProfile(prisma, userB);

  // Calculate similarity across interaction types
  const weights = {
    likes: 0.3,
    comments: 0.25,
    shares: 0.2,
    follows: 0.15,
    joins: 0.1,
  };

  let similarity = 0;
  similarity += jaccardSimilarity(interactionsA.likes, interactionsB.likes) * weights.likes;
  similarity += jaccardSimilarity(interactionsA.comments, interactionsB.comments) * weights.comments;
  similarity += jaccardSimilarity(interactionsA.follows, interactionsB.follows) * weights.follows;
  similarity += jaccardSimilarity(interactionsA.joins, interactionsB.joins) * weights.joins;

  // Cache result
  if (!userSimilarityCache.has(cacheKey)) {
    userSimilarityCache.set(cacheKey, new Map());
  }
  userSimilarityCache.get(cacheKey)!.set(cacheKey, similarity);

  return similarity;
}

/**
 * Get similar users for collaborative filtering
 */
async function getSimilarUsers(
  prisma: any,
  userId: string,
  limit: number = 50
): Promise<Array<{ userId: string; similarity: number }>> {
  // Get users with overlapping interactions
  const userInteractions = await buildUserInteractionProfile(prisma, userId);
  
  // Find users who interacted with same content
  const candidateUsers = new Set<string>();
  
  // Get users who liked same posts
  const likedPosts = [...userInteractions.likes];
  if (likedPosts.length > 0) {
    const similarLikers = await prisma.postReaction.findMany({
      where: { 
        postId: { in: likedPosts },
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ['userId'],
      take: 200,
    });
    similarLikers.forEach((u: any) => candidateUsers.add(u.userId));
  }

  // Get users in same groups
  const groups = [...userInteractions.joins];
  if (groups.length > 0) {
    const groupMembers = await prisma.groupMember.findMany({
      where: { 
        groupId: { in: groups },
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ['userId'],
      take: 200,
    });
    groupMembers.forEach((u: any) => candidateUsers.add(u.userId));
  }

  // Calculate similarity scores
  const similarities: Array<{ userId: string; similarity: number }> = [];
  
  for (const candidateId of candidateUsers) {
    const similarity = await calculateUserSimilarity(prisma, userId, candidateId);
    if (similarity > 0.1) {
      similarities.push({ userId: candidateId, similarity });
    }
  }

  // Sort by similarity and return top N
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * People/Connection Recommendations
 * Uses multiple signals to suggest connections
 */
export async function getConnectionRecommendations(
  prisma: any,
  userId: string,
  options: RecommendationOptions = {}
): Promise<RecommendationResult<any>[]> {
  const { limit = 20, offset = 0, minScore = 0.3, excludeIds = [] } = options;

  try {
    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        connections: true,
        sentConnections: true,
      },
    });

    if (!user) return [];

    // Get existing connections to exclude
    const existingConnectionIds = new Set([
      ...user.connections?.map((c: any) => c.senderId) || [],
      ...user.connections?.map((c: any) => c.receiverId) || [],
      ...user.sentConnections?.map((c: any) => c.receiverId) || [],
      ...excludeIds,
      userId,
    ]);

    // Get similar users from collaborative filtering
    const similarUsers = await getSimilarUsers(prisma, userId, 100);

    // Get candidates based on multiple signals
    const candidates = await prisma.user.findMany({
      where: {
        id: { notIn: [...existingConnectionIds] },
        status: 'active',
      },
      include: {
        skills: true,
        profile: true,
      },
      take: 200,
    });

    // Score each candidate
    const scored: RecommendationResult<any>[] = [];

    for (const candidate of candidates) {
      const reasons: string[] = [];
      let score = 0;

      // 1. Collaborative filtering score (similar users like them)
      const cfScore = similarUsers.find(s => s.userId === candidate.id)?.similarity || 0;
      score += cfScore * 0.35;
      if (cfScore > 0.3) {
        reasons.push('People like you connected with them');
      }

      // 2. Skill overlap
      const userSkills = new Set(user.skills?.map((s: any) => s.name?.toLowerCase()) || []);
      const candidateSkills = new Set(candidate.skills?.map((s: any) => s.name?.toLowerCase()) || []);
      const skillOverlap = jaccardSimilarity(userSkills, candidateSkills);
      score += skillOverlap * 0.25;
      if (skillOverlap > 0.2) {
        reasons.push('Similar skills');
      }

      // 3. Industry match
      if (user.industry && candidate.industry && 
          user.industry.toLowerCase() === candidate.industry.toLowerCase()) {
        score += 0.15;
        reasons.push('Same industry');
      }

      // 4. Location proximity
      if (user.location && candidate.location) {
        const sameLocation = user.location.toLowerCase() === candidate.location.toLowerCase();
        const sameState = extractState(user.location) === extractState(candidate.location);
        if (sameLocation) {
          score += 0.1;
          reasons.push('Same location');
        } else if (sameState) {
          score += 0.05;
          reasons.push('Same region');
        }
      }

      // 5. Indigenous community boost
      if (user.isIndigenous && candidate.isIndigenous) {
        score += 0.1;
        reasons.push('Aboriginal/Torres Strait Islander community');
      }

      // 6. Mutual connections
      const mutualCount = await countMutualConnections(prisma, userId, candidate.id);
      if (mutualCount > 0) {
        score += Math.min(mutualCount * 0.02, 0.1);
        reasons.push(`${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`);
      }

      // Apply diversity boost for different backgrounds
      if (options.diversity && options.diversity > 0) {
        const diversityBoost = (1 - skillOverlap) * options.diversity * 0.1;
        score += diversityBoost;
      }

      if (score >= minScore) {
        scored.push({
          item: candidate,
          score: Math.round(score * 100) / 100,
          reasons,
          confidence: calculateConfidence(reasons.length, cfScore),
        });
      }
    }

    // Sort by score and paginate
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

  } catch (error) {
    console.error('[Recommendations] Connection error:', error);
    return [];
  }
}

/**
 * Mentor Recommendations
 * Specialized recommendations for mentor matching
 */
export async function getMentorRecommendations(
  prisma: any,
  userId: string,
  options: RecommendationOptions = {}
): Promise<RecommendationResult<any>[]> {
  const { limit = 20, offset = 0, minScore = 0.3 } = options;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        preferences: true,
      },
    });

    if (!user) return [];

    // Get available mentors
    const mentors = await prisma.mentor.findMany({
      where: {
        userId: { not: userId },
        isAvailable: true,
        status: 'approved',
      },
      include: {
        user: {
          include: { skills: true },
        },
        specializations: true,
        reviews: {
          select: { rating: true },
        },
      },
      take: 100,
    });

    const scored: RecommendationResult<any>[] = [];

    for (const mentor of mentors) {
      const reasons: string[] = [];
      let score = 0;

      // 1. Skill alignment - mentor has skills user wants to learn
      const userGoals = user.preferences?.learningGoals || [];
      const mentorSkills = mentor.specializations?.map((s: any) => s.name?.toLowerCase()) || [];
      const goalMatch = userGoals.filter((g: string) => 
        mentorSkills.some((s: string) => s.includes(g.toLowerCase()) || g.toLowerCase().includes(s))
      ).length;
      const goalScore = userGoals.length > 0 ? goalMatch / userGoals.length : 0.5;
      score += goalScore * 0.35;
      if (goalScore > 0.3) {
        reasons.push('Expertise in your areas of interest');
      }

      // 2. Industry experience
      if (mentor.industry && user.industry && 
          mentor.industry.toLowerCase().includes(user.industry.toLowerCase())) {
        score += 0.2;
        reasons.push('Industry expertise');
      }

      // 3. Rating and reviews
      const avgRating = mentor.reviews?.length > 0
        ? mentor.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / mentor.reviews.length
        : 3;
      score += (avgRating / 5) * 0.15;
      if (avgRating >= 4.5) {
        reasons.push('Highly rated mentor');
      }

      // 4. Cultural match
      if (user.isIndigenous && mentor.user?.isIndigenous) {
        score += 0.15;
        reasons.push('Indigenous mentor');
      }

      // 5. Experience level appropriateness
      const userExp = user.yearsExperience || 0;
      const mentorExp = mentor.yearsExperience || 10;
      const expGap = mentorExp - userExp;
      if (expGap >= 3 && expGap <= 15) {
        score += 0.1;
        reasons.push('Appropriate experience level');
      }

      // 6. Availability and responsiveness
      if (mentor.responseRate && mentor.responseRate > 0.8) {
        score += 0.05;
        reasons.push('Responsive mentor');
      }

      if (score >= minScore) {
        scored.push({
          item: mentor,
          score: Math.round(score * 100) / 100,
          reasons,
          confidence: calculateConfidence(reasons.length, avgRating / 5),
        });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

  } catch (error) {
    console.error('[Recommendations] Mentor error:', error);
    return [];
  }
}

/**
 * Group Recommendations
 */
export async function getGroupRecommendations(
  prisma: any,
  userId: string,
  options: RecommendationOptions = {}
): Promise<RecommendationResult<any>[]> {
  const { limit = 20, offset = 0, minScore = 0.2 } = options;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { skills: true },
    });

    if (!user) return [];

    // Get user's current groups
    const userMemberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const userGroupIds = new Set(userMemberships.map((m: any) => m.groupId));

    // Get similar users' groups (collaborative filtering)
    const similarUsers = await getSimilarUsers(prisma, userId, 30);
    const similarUserIds = similarUsers.map(u => u.userId);

    // Get groups that similar users belong to
    const similarUsersGroups = await prisma.groupMember.findMany({
      where: {
        userId: { in: similarUserIds },
        groupId: { notIn: [...userGroupIds] },
      },
      include: {
        group: {
          include: {
            _count: { select: { members: true } },
          },
        },
      },
    });

    // Score groups by how many similar users belong to them
    const groupScores = new Map<string, { count: number; group: any }>();
    for (const membership of similarUsersGroups) {
      const existing = groupScores.get(membership.groupId);
      if (existing) {
        existing.count++;
      } else {
        groupScores.set(membership.groupId, { count: 1, group: membership.group });
      }
    }

    // Get additional groups by topic match
    const userTopics = user.skills?.map((s: any) => s.name) || [];
    const topicGroups = await prisma.group.findMany({
      where: {
        id: { notIn: [...userGroupIds] },
        isActive: true,
        OR: [
          { topics: { hasSome: userTopics } },
          { category: user.industry },
        ],
      },
      include: {
        _count: { select: { members: true } },
      },
      take: 50,
    });

    // Combine and score all groups
    const allGroups = new Map<string, { group: any; cfScore: number }>();
    
    for (const [groupId, data] of groupScores) {
      allGroups.set(groupId, {
        group: data.group,
        cfScore: data.count / similarUsers.length,
      });
    }

    for (const group of topicGroups) {
      if (!allGroups.has(group.id)) {
        allGroups.set(group.id, { group, cfScore: 0 });
      }
    }

    const scored: RecommendationResult<any>[] = [];

    for (const [groupId, data] of allGroups) {
      const group = data.group;
      if (!group) continue;

      const reasons: string[] = [];
      let score = 0;

      // 1. Collaborative filtering score
      score += data.cfScore * 0.4;
      if (data.cfScore > 0.2) {
        reasons.push('Popular with people like you');
      }

      // 2. Topic match
      const groupTopics = group.topics || [];
      const topicMatch = userTopics.filter((t: string) => 
        groupTopics.some((gt: string) => gt.toLowerCase().includes(t.toLowerCase()))
      ).length;
      if (topicMatch > 0) {
        score += Math.min(topicMatch * 0.15, 0.3);
        reasons.push('Matches your interests');
      }

      // 3. Size factor (not too small, not too big)
      const memberCount = group._count?.members || 0;
      if (memberCount >= 10 && memberCount <= 500) {
        score += 0.1;
        reasons.push('Active community');
      }

      // 4. Indigenous focus
      if (user.isIndigenous && group.isIndigenousFocused) {
        score += 0.15;
        reasons.push('Indigenous community');
      }

      // 5. Location relevance
      if (group.location && user.location && 
          group.location.toLowerCase().includes(extractState(user.location))) {
        score += 0.05;
        reasons.push('Local community');
      }

      if (score >= minScore) {
        scored.push({
          item: group,
          score: Math.round(score * 100) / 100,
          reasons,
          confidence: calculateConfidence(reasons.length, data.cfScore),
        });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

  } catch (error) {
    console.error('[Recommendations] Group error:', error);
    return [];
  }
}

/**
 * Content/Post Recommendations
 * For personalized feed
 */
export async function getContentRecommendations(
  prisma: any,
  userId: string,
  options: RecommendationOptions = {}
): Promise<RecommendationResult<any>[]> {
  const { limit = 50, offset = 0, minScore = 0.1 } = options;

  try {
    const interactions = await buildUserInteractionProfile(prisma, userId);
    const similarUsers = await getSimilarUsers(prisma, userId, 20);

    // Get posts that similar users engaged with
    const similarUserIds = similarUsers.map(u => u.userId);
    
    const candidatePosts = await prisma.socialPost.findMany({
      where: {
        authorId: { not: userId },
        id: { notIn: [...interactions.likes, ...interactions.comments] },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
        visibility: 'public',
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reactions: {
          where: { userId: { in: similarUserIds } },
        },
        _count: { select: { reactions: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const scored: RecommendationResult<any>[] = [];

    for (const post of candidatePosts) {
      const reasons: string[] = [];
      let score = 0;

      // 1. Similar users' engagement
      const similarEngagement = post.reactions?.length || 0;
      if (similarEngagement > 0) {
        score += Math.min(similarEngagement * 0.1, 0.4);
        reasons.push('Liked by people like you');
      }

      // 2. From followed users
      if (interactions.follows.has(post.authorId)) {
        score += 0.3;
        reasons.push('From a connection');
      }

      // 3. Engagement rate
      const totalEngagement = (post._count?.reactions || 0) + (post._count?.comments || 0);
      if (totalEngagement > 10) {
        score += 0.1;
        reasons.push('Popular post');
      }

      // 4. Recency
      const recencyScore = timeDecay(new Date(post.createdAt).getTime(), 3);
      score += recencyScore * 0.2;

      if (score >= minScore) {
        scored.push({
          item: post,
          score: Math.round(score * 100) / 100,
          reasons,
          confidence: calculateConfidence(reasons.length, recencyScore),
        });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

  } catch (error) {
    console.error('[Recommendations] Content error:', error);
    return [];
  }
}

// Helper functions

function extractState(location: string): string {
  const states = ['nsw', 'vic', 'qld', 'wa', 'sa', 'tas', 'nt', 'act'];
  const lower = location.toLowerCase();
  return states.find(s => lower.includes(s)) || '';
}

async function countMutualConnections(prisma: any, userA: string, userB: string): Promise<number> {
  try {
    // Get userA's connections
    const connectionsA = await prisma.connection.findMany({
      where: {
        OR: [{ senderId: userA }, { receiverId: userA }],
        status: 'accepted',
      },
      select: { senderId: true, receiverId: true },
    });
    const userAConnections = new Set(
      connectionsA.map((c: any) => c.senderId === userA ? c.receiverId : c.senderId)
    );

    // Get userB's connections
    const connectionsB = await prisma.connection.findMany({
      where: {
        OR: [{ senderId: userB }, { receiverId: userB }],
        status: 'accepted',
      },
      select: { senderId: true, receiverId: true },
    });
    const userBConnections = new Set(
      connectionsB.map((c: any) => c.senderId === userB ? c.receiverId : c.senderId)
    );

    // Count intersection
    let count = 0;
    for (const id of userAConnections) {
      if (userBConnections.has(id)) count++;
    }
    return count;
  } catch {
    return 0;
  }
}

function calculateConfidence(reasonCount: number, primaryScore: number): number {
  // More reasons and higher primary score = higher confidence
  const reasonFactor = Math.min(reasonCount / 5, 1) * 0.5;
  const scoreFactor = primaryScore * 0.5;
  return Math.round((reasonFactor + scoreFactor) * 100) / 100;
}

// Export helper functions for testing
export { getSimilarUsers, buildUserInteractionProfile };
