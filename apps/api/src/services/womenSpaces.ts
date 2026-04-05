/**
 * Women's Spaces Service
 * Phase 2 Steps 101-125: Women-only discussion spaces, posts, and support circles
 */

import { prisma } from '../db';
import type { WomenSpaceType, SpaceVisibility, ModerationStatus } from '@prisma/client';
import { logSecurityEvent, SecurityEventType } from '../lib/securityAudit';

// ==========================================
// Space Management (Steps 101-110)
// ==========================================

interface CreateSpaceInput {
  name: string;
  description?: string;
  spaceType: WomenSpaceType;
  visibility?: SpaceVisibility;
  coverImageUrl?: string;
  iconEmoji?: string;
  requiresApproval?: boolean;
  moderatorIds?: string[];
  hasWelcomeToCountry?: boolean;
  acknowledgesCountry?: string;
}

/**
 * Create a new women-only discussion space
 */
export async function createWomenSpace(creatorId: string, input: CreateSpaceInput) {
  const space = await prisma.womenSpace.create({
    data: {
      name: input.name,
      description: input.description,
      spaceType: input.spaceType,
      visibility: input.visibility || 'PUBLIC',
      coverImageUrl: input.coverImageUrl,
      iconEmoji: input.iconEmoji,
      requiresApproval: input.requiresApproval || false,
      moderatorIds: input.moderatorIds || [creatorId],
      hasWelcomeToCountry: input.hasWelcomeToCountry || false,
      acknowledgesCountry: input.acknowledgesCountry,
      memberCount: 1,
      members: {
        create: {
          userId: creatorId,
          role: 'admin',
        },
      },
    },
    include: {
      members: true,
    },
  });

  return space;
}

/**
 * Get spaces accessible to a user based on their verification status
 */
export async function getAccessibleSpaces(userId: string) {
  // Check user's verification status
  const verification = await prisma.womenVerification.findUnique({
    where: { userId },
  });

  if (!verification?.canAccessWomenSpaces) {
    return [];
  }

  const visibilityFilter: SpaceVisibility[] = ['PUBLIC'];
  
  if (verification.canAccessFirstNationsSpaces) {
    visibilityFilter.push('FIRST_NATIONS');
  }

  // Get spaces the user is a member of (includes INVITE_ONLY)
  const memberSpaceIds = await prisma.womenSpaceMember.findMany({
    where: { userId },
    select: { spaceId: true },
  });

  const spaces = await prisma.womenSpace.findMany({
    where: {
      isActive: true,
      OR: [
        { visibility: { in: visibilityFilter } },
        { id: { in: memberSpaceIds.map(m => m.spaceId) } },
      ],
    },
    orderBy: [
      { isPinned: 'desc' },
      { memberCount: 'desc' },
    ],
  });

  return spaces;
}

/**
 * Join a space
 */
export async function joinSpace(userId: string, spaceId: string) {
  const space = await prisma.womenSpace.findUnique({
    where: { id: spaceId },
  });

  if (!space || !space.isActive) {
    throw new Error('Space not found');
  }

  // Check access permissions
  const verification = await prisma.womenVerification.findUnique({
    where: { userId },
  });

  if (!verification?.canAccessWomenSpaces) {
    throw new Error('Access denied - verification required');
  }

  if (space.visibility === 'FIRST_NATIONS' && !verification.canAccessFirstNationsSpaces) {
    throw new Error('Access denied - First Nations verification required');
  }

  if (space.visibility === 'INVITE_ONLY') {
    throw new Error('This space is invite-only');
  }

  const member = await prisma.womenSpaceMember.upsert({
    where: {
      spaceId_userId: { spaceId, userId },
    },
    create: {
      spaceId,
      userId,
      role: 'member',
    },
    update: {
      isMuted: false,
    },
  });

  // Update member count
  await prisma.womenSpace.update({
    where: { id: spaceId },
    data: { memberCount: { increment: 1 } },
  });

  return member;
}

/**
 * Leave a space
 */
export async function leaveSpace(userId: string, spaceId: string) {
  await prisma.womenSpaceMember.delete({
    where: {
      spaceId_userId: { spaceId, userId },
    },
  });

  await prisma.womenSpace.update({
    where: { id: spaceId },
    data: { memberCount: { decrement: 1 } },
  });
}

// ==========================================
// Posts & Comments (Steps 116-122)
// ==========================================

interface CreatePostInput {
  spaceId: string;
  content: string;
  imageUrls?: string[];
  isAnonymous?: boolean;
}

/**
 * Create a post in a women's space
 */
export async function createPost(authorId: string, input: CreatePostInput) {
  // Verify membership
  const membership = await prisma.womenSpaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId: input.spaceId, userId: authorId },
    },
  });

  if (!membership) {
    throw new Error('You must be a member to post');
  }

  const space = await prisma.womenSpace.findUnique({
    where: { id: input.spaceId },
  });

  const post = await prisma.womenSpacePost.create({
    data: {
      spaceId: input.spaceId,
      authorId,
      content: input.content,
      imageUrls: input.imageUrls || [],
      isAnonymous: input.isAnonymous || false,
      status: space?.requiresApproval ? 'PENDING' : 'APPROVED',
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Update post count for member
  await prisma.womenSpaceMember.update({
    where: { spaceId_userId: { spaceId: input.spaceId, userId: authorId } },
    data: { postCount: { increment: 1 } },
  });

  return post;
}

/**
 * Get posts in a space
 */
export async function getSpacePosts(spaceId: string, options?: {
  limit?: number;
  cursor?: string;
  includeAnonymousAuthors?: boolean;
}) {
  const limit = options?.limit || 20;

  const posts = await prisma.womenSpacePost.findMany({
    where: {
      spaceId,
      status: 'APPROVED',
    },
    orderBy: [
      { isPinned: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit + 1,
    cursor: options?.cursor ? { id: options.cursor } : undefined,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          comments: true,
          likes: true,
        },
      },
    },
  });

  // Handle anonymous posts
  const processedPosts = posts.map(post => {
    if (post.isAnonymous && !options?.includeAnonymousAuthors) {
      return {
        ...post,
        author: null,
        authorId: null,
      };
    }
    return post;
  });

  const hasMore = processedPosts.length > limit;
  if (hasMore) processedPosts.pop();

  return {
    posts: processedPosts,
    hasMore,
    nextCursor: hasMore ? processedPosts[processedPosts.length - 1]?.id : null,
  };
}

/**
 * Like a post
 */
export async function likePost(userId: string, postId: string) {
  const like = await prisma.womenSpacePostLike.upsert({
    where: {
      postId_userId: { postId, userId },
    },
    create: {
      postId,
      userId,
    },
    update: {},
  });

  await prisma.womenSpacePost.update({
    where: { id: postId },
    data: { likeCount: { increment: 1 } },
  });

  return like;
}

/**
 * Unlike a post
 */
export async function unlikePost(userId: string, postId: string) {
  await prisma.womenSpacePostLike.delete({
    where: {
      postId_userId: { postId, userId },
    },
  });

  await prisma.womenSpacePost.update({
    where: { id: postId },
    data: { likeCount: { decrement: 1 } },
  });
}

/**
 * Add a comment to a post
 */
export async function addComment(
  authorId: string,
  postId: string,
  content: string,
  options?: { parentId?: string; isAnonymous?: boolean }
) {
  const post = await prisma.womenSpacePost.findUnique({
    where: { id: postId },
    include: { space: true },
  });

  if (!post) {
    throw new Error('Post not found');
  }

  // Verify membership
  const membership = await prisma.womenSpaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId: post.spaceId, userId: authorId },
    },
  });

  if (!membership) {
    throw new Error('You must be a member to comment');
  }

  const comment = await prisma.womenSpaceComment.create({
    data: {
      postId,
      authorId,
      content,
      parentId: options?.parentId,
      isAnonymous: options?.isAnonymous || false,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  await prisma.womenSpacePost.update({
    where: { id: postId },
    data: { commentCount: { increment: 1 } },
  });

  return comment;
}

// ==========================================
// Support Circles (Steps 123-125)
// ==========================================

interface CreateCircleInput {
  name: string;
  description?: string;
  topic: string;
  maxMembers?: number;
  meetingDay?: string;
  meetingTime?: string;
  timezone?: string;
  meetingUrl?: string;
}

/**
 * Create a support circle
 */
export async function createSupportCircle(facilitatorId: string, input: CreateCircleInput) {
  const circle = await prisma.supportCircle.create({
    data: {
      name: input.name,
      description: input.description,
      topic: input.topic,
      maxMembers: input.maxMembers || 8,
      facilitatorId,
      meetingDay: input.meetingDay,
      meetingTime: input.meetingTime,
      timezone: input.timezone || 'Australia/Sydney',
      meetingUrl: input.meetingUrl,
      memberCount: 1,
      members: {
        create: {
          userId: facilitatorId,
          role: 'facilitator',
        },
      },
    },
  });

  return circle;
}

/**
 * Get open support circles
 */
export async function getOpenCircles(topic?: string) {
  const circles = await prisma.supportCircle.findMany({
    where: {
      isActive: true,
      isOpen: true,
      ...(topic && { topic }),
    },
    include: {
      facilitator: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { nextMeetingAt: 'asc' },
  });

  // Filter out full circles
  return circles.filter(c => c._count.members < c.maxMembers);
}

/**
 * Join a support circle
 */
export async function joinSupportCircle(userId: string, circleId: string) {
  const circle = await prisma.supportCircle.findUnique({
    where: { id: circleId },
    include: {
      _count: { select: { members: true } },
    },
  });

  if (!circle || !circle.isActive) {
    throw new Error('Circle not found');
  }

  if (!circle.isOpen) {
    throw new Error('This circle is not accepting new members');
  }

  if (circle._count.members >= circle.maxMembers) {
    throw new Error('Circle is full');
  }

  const member = await prisma.supportCircleMember.create({
    data: {
      circleId,
      userId,
      role: 'member',
    },
  });

  await prisma.supportCircle.update({
    where: { id: circleId },
    data: { memberCount: { increment: 1 } },
  });

  return member;
}

// ==========================================
// Moderation (Step 107)
// ==========================================

/**
 * Flag a post for review
 */
export async function flagPost(postId: string, reporterId: string, reason: string) {
  const post = await prisma.womenSpacePost.update({
    where: { id: postId },
    data: {
      status: 'FLAGGED',
      flaggedReason: reason,
    },
  });

  await logSecurityEvent({
    eventType: SecurityEventType.CONTENT_FLAGGED,
    userId: reporterId,
    resourceType: 'post',
    resourceId: postId,
    action: 'flag',
    outcome: 'success',
    metadata: { reason },
  });

  return post;
}

/**
 * Moderate a post (approve, remove, archive)
 */
export async function moderatePost(
  postId: string,
  moderatorId: string,
  action: 'approve' | 'remove' | 'archive'
) {
  const statusMap: Record<string, ModerationStatus> = {
    approve: 'APPROVED',
    remove: 'REMOVED',
    archive: 'ARCHIVED',
  };

  const post = await prisma.womenSpacePost.update({
    where: { id: postId },
    data: {
      status: statusMap[action],
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
    },
  });

  return post;
}

export const womenSpacesService = {
  createWomenSpace,
  getAccessibleSpaces,
  joinSpace,
  leaveSpace,
  createPost,
  getSpacePosts,
  likePost,
  unlikePost,
  addComment,
  createSupportCircle,
  getOpenCircles,
  joinSupportCircle,
  flagPost,
  moderatePost,
};
