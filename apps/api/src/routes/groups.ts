// @ts-nocheck
/**
 * Community Groups Routes
 * Handles community groups with membership, posts, events, and moderation
 */
import express from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import authenticateJWT from '../middleware/auth';

const router = express.Router();

const groupAnnouncements = new Map<string, any[]>();
const groupResources = new Map<string, any[]>();
const groupChallenges = new Map<string, any[]>();
const groupLiveRooms = new Map<string, any[]>();
const groupBadges = new Map<string, any[]>();
const groupCohorts = new Map<string, any[]>();

async function isGroupModerator(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } }
  });
  return membership && ['owner', 'admin', 'moderator'].includes(membership.role);
}

// =============================================================================
// GROUP CRUD
// =============================================================================

/**
 * GET /groups - List community groups
 */
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      search, 
      womenOnly,
      featured,
      page = 1, 
      limit = 20 
    } = req.query;
    const userId = req.user?.id;

    const where: any = { 
      isActive: true,
      OR: [
        { visibility: 'public' },
        { visibility: 'private' }
      ]
    };
    
    if (type) where.groupType = type;
    if (womenOnly === 'true') where.womenOnly = true;
    if (featured === 'true') where.isFeatured = true;
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } }
          ]
        }
      ];
    }

    const [groups, total] = await Promise.all([
      prisma.communityGroup.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { memberCount: 'desc' }],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          coverImageUrl: true,
          iconUrl: true,
          groupType: true,
          category: true,
          visibility: true,
          membershipType: true,
          womenOnly: true,
          memberCount: true,
          postCount: true,
          isOfficial: true,
          isFeatured: true
        }
      }),
      prisma.communityGroup.count({ where })
    ]);

    // Check membership status for current user
    let groupsWithMembership = groups;
    if (userId) {
      const memberships = await prisma.groupMember.findMany({
        where: { 
          userId, 
          groupId: { in: groups.map(g => g.id) } 
        }
      });
      const membershipMap = new Map(memberships.map(m => [m.groupId, m]));
      
      groupsWithMembership = groups.map(g => {
        const membership = membershipMap.get(g.id) as any;
        return {
          ...g,
          isMember: membershipMap.has(g.id),
          memberRole: membership?.role || null,
          memberStatus: membership?.status || null
        };
      });
    }

    res.json({
      groups: groupsWithMembership,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('List groups error:', err);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

/**
 * GET /groups/:slug - Get group by slug
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user?.id;

    const group = await prisma.communityGroup.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { members: true, posts: true, events: true }
        }
      }
    });

    if (!group || !group.isActive) {
      return void res.status(404).json({ error: 'Group not found' });
    }

    // Check if secret group and user is not a member
    if (group.visibility === 'secret') {
      if (!userId) {
        return void res.status(404).json({ error: 'Group not found' });
      }
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } }
      });
      if (!membership || membership.status !== 'active') {
        return void res.status(404).json({ error: 'Group not found' });
      }
    }

    // Check membership
    let membership = null;
    if (userId) {
      membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId } }
      });
    }

    res.json({
      group: {
        ...group,
        isMember: membership?.status === 'active',
        memberRole: membership?.role || null,
        memberStatus: membership?.status || null
      }
    });
  } catch (err) {
    console.error('Get group error:', err);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

/**
 * POST /groups - Create a new group
 */
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      coverImageUrl,
      iconUrl,
      groupType,
      category,
      visibility = 'public',
      membershipType = 'open',
      womenOnly = false,
      safetyMode = true,
      rules
    } = req.body;

    if (!name || !groupType) {
      return void res.status(400).json({ error: 'Name and group type are required' });
    }

    const validTypes = ['industry', 'role', 'life_stage', 'location', 'interest'];
    if (!validTypes.includes(groupType)) {
      return void res.status(400).json({ error: 'Invalid group type' });
    }

    // Generate slug
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.communityGroup.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const group = await prisma.communityGroup.create({
      data: {
        creatorId: userId,
        name,
        slug,
        description,
        coverImageUrl,
        iconUrl,
        groupType,
        category,
        visibility,
        membershipType,
        womenOnly,
        safetyMode,
        rules,
        memberCount: 1,
        members: {
          create: {
            userId,
            role: 'owner',
            status: 'active'
          }
        }
      }
    });

    res.status(201).json({ group });
  } catch (err) {
    console.error('Create group error:', err);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// =============================================================================
// MEMBERSHIP
// =============================================================================

/**
 * POST /groups/:id/join - Join a group
 */
router.post('/:id/join', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const group = await prisma.communityGroup.findUnique({
      where: { id }
    });

    if (!group || !group.isActive) {
      return void res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (existing) {
      if (existing.status === 'active') {
        return void res.status(400).json({ error: 'Already a member' });
      }
      if (existing.status === 'pending') {
        return void res.status(400).json({ error: 'Join request pending' });
      }
      if (existing.status === 'banned') {
        return void res.status(403).json({ error: 'You are banned from this group' });
      }
    }

    // Check membership type
    if (group.membershipType === 'invite_only') {
      return void res.status(403).json({ error: 'This group is invite-only' });
    }

    const status = group.membershipType === 'approval' ? 'pending' : 'active';

    if (existing) {
      await prisma.groupMember.update({
        where: { groupId_userId: { groupId: id, userId } },
        data: { status, joinedAt: new Date() }
      });
    } else {
      await prisma.groupMember.create({
        data: {
          groupId: id,
          userId,
          role: 'member',
          status
        }
      });
    }

    if (status === 'active') {
      await prisma.communityGroup.update({
        where: { id },
        data: { memberCount: { increment: 1 } }
      });
    }

    res.json({ 
      success: true, 
      status,
      message: status === 'pending' ? 'Join request submitted' : 'Joined successfully'
    });
  } catch (err) {
    console.error('Join group error:', err);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

/**
 * DELETE /groups/:id/leave - Leave a group
 */
router.delete('/:id/leave', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!membership || membership.status !== 'active') {
      return void res.status(400).json({ error: 'Not a member' });
    }

    if (membership.role === 'owner') {
      return void res.status(400).json({ error: 'Owner cannot leave. Transfer ownership first.' });
    }

    await prisma.$transaction([
      prisma.groupMember.delete({
        where: { groupId_userId: { groupId: id, userId } }
      }),
      prisma.communityGroup.update({
        where: { id },
        data: { memberCount: { decrement: 1 } }
      })
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('Leave group error:', err);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

/**
 * GET /groups/:id/members - Get group members
 */
router.get('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, page = 1, limit = 20 } = req.query;

    const where: any = { groupId: id, status: 'active' };
    if (role) where.role = role;

    const [members, total] = await Promise.all([
      prisma.groupMember.findMany({
        where,
        orderBy: [
          { role: 'asc' },
          { reputation: 'desc' }
        ],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.groupMember.count({ where })
    ]);

    res.json({ members, total });
  } catch (err) {
    console.error('Get members error:', err);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// =============================================================================
// GROUP POSTS
// =============================================================================

/**
 * GET /groups/:id/posts - Get group posts
 */
router.get('/:id/posts', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;

    // Check membership for private/secret groups
    const group = await prisma.communityGroup.findUnique({
      where: { id }
    });

    if (!group) {
      return void res.status(404).json({ error: 'Group not found' });
    }

    if (group.visibility !== 'public') {
      if (!userId) {
        return void res.status(403).json({ error: 'Must be logged in to view posts' });
      }
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId } }
      });
      if (!membership || membership.status !== 'active') {
        return void res.status(403).json({ error: 'Must be a member to view posts' });
      }
    }

    const where: any = { groupId: id, isApproved: true };
    if (type) where.type = type;

    const [posts, total] = await Promise.all([
      prisma.groupPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          _count: { select: { comments: true, reactions: true } },
          reactions: userId ? {
            where: { userId },
            take: 1
          } : false
        }
      }),
      prisma.groupPost.count({ where })
    ]);

    const postsWithReactions = posts.map(p => ({
      ...p,
      userReaction: p.reactions?.[0]?.type || null,
      reactions: undefined
    }));

    res.json({ posts: postsWithReactions, total });
  } catch (err) {
    console.error('Get posts error:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

/**
 * POST /groups/:id/posts - Create a post
 */
router.post('/:id/posts', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!membership || membership.status !== 'active') {
      return void res.status(403).json({ error: 'Must be a member to post' });
    }

    if (membership.status === 'muted') {
      return void res.status(403).json({ error: 'You are muted in this group' });
    }

    const { type = 'text', title, content, mediaUrls, pollOptions, pollEndsAt, isAnonymous = false } = req.body;

    if (!content) {
      return void res.status(400).json({ error: 'Content is required' });
    }

    // Check content length
    if (content.length > 2000) {
      return void res.status(400).json({ error: 'Content exceeds 2000 character limit' });
    }

    const post = await prisma.groupPost.create({
      data: {
        groupId: id,
        authorId: userId,
        type,
        title,
        content,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        pollOptions: pollOptions ? JSON.stringify(pollOptions) : null,
        pollEndsAt: pollEndsAt ? new Date(pollEndsAt) : null,
        isAnonymous
      }
    });

    // Update group post count
    await prisma.communityGroup.update({
      where: { id },
      data: { postCount: { increment: 1 } }
    });

    // Update member post count
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId: id, userId } },
      data: { postCount: { increment: 1 } }
    });

    res.status(201).json({ post });
  } catch (err) {
    console.error('Create post error:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

/**
 * POST /groups/:id/posts/:postId/react - React to a post
 */
router.post('/:id/posts/:postId/react', authenticateJWT, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const { type } = req.body;

    const validReactions = ['like', 'love', 'support', 'celebrate', 'insightful', 'curious'];
    if (!validReactions.includes(type)) {
      return void res.status(400).json({ error: 'Invalid reaction type' });
    }

    // Check if already reacted
    const existing = await prisma.groupPostReaction.findUnique({
      where: { postId_userId: { postId, userId } }
    });

    if (existing) {
      if (existing.type === type) {
        // Remove reaction
        await prisma.$transaction([
          prisma.groupPostReaction.delete({
            where: { postId_userId: { postId, userId } }
          }),
          prisma.groupPost.update({
            where: { id: postId },
            data: { likeCount: { decrement: 1 } }
          })
        ]);
        return void res.json({ success: true, reaction: null });
      } else {
        // Update reaction type
        await prisma.groupPostReaction.update({
          where: { postId_userId: { postId, userId } },
          data: { type }
        });
        return void res.json({ success: true, reaction: type });
      }
    }

    // Add new reaction
    await prisma.$transaction([
      prisma.groupPostReaction.create({
        data: { postId, userId, type }
      }),
      prisma.groupPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } }
      })
    ]);

    res.json({ success: true, reaction: type });
  } catch (err) {
    console.error('React to post error:', err);
    res.status(500).json({ error: 'Failed to react' });
  }
});

/**
 * POST /groups/:id/posts/:postId/comments - Add a comment
 */
router.post('/:id/posts/:postId/comments', authenticateJWT, async (req, res) => {
  try {
    const { id, postId } = req.params;
    const userId = req.user.id;
    const { content, parentId } = req.body;

    // Check membership
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!membership || membership.status !== 'active') {
      return void res.status(403).json({ error: 'Must be a member to comment' });
    }

    if (content.length > 1000) {
      return void res.status(400).json({ error: 'Comment exceeds 1000 character limit' });
    }

    const comment = await prisma.groupPostComment.create({
      data: {
        postId,
        authorId: userId,
        parentId,
        content
      }
    });

    await prisma.groupPost.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } }
    });

    res.status(201).json({ comment });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// =============================================================================
// GROUP EVENTS
// =============================================================================

/**
 * GET /groups/:id/events - Get group events
 */
router.get('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const { upcoming = 'true' } = req.query;

    const where: any = { groupId: id, isActive: true };
    if (upcoming === 'true') {
      where.startDate = { gte: new Date() };
    }

    const events = await prisma.groupEvent.findMany({
      where,
      orderBy: { startDate: 'asc' }
    });

    res.json({ events });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

/**
 * POST /groups/:id/events - Create a group event
 */
router.post('/:id/events', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if admin/moderator
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!membership || !['owner', 'admin', 'moderator'].includes(membership.role)) {
      return void res.status(403).json({ error: 'Not authorized to create events' });
    }

    const { title, description, startDate, endDate, isOnline, location, meetingUrl, maxAttendees } = req.body;

    const event = await prisma.groupEvent.create({
      data: {
        groupId: id,
        creatorId: userId,
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isOnline,
        location,
        meetingUrl,
        maxAttendees
      }
    });

    res.status(201).json({ event });
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// =============================================================================
// GROUP ANNOUNCEMENTS
// =============================================================================

router.get('/:id/announcements', async (req, res) => {
  try {
    const { id } = req.params;
    const announcements = groupAnnouncements.get(id) || [];
    res.json({ announcements });
  } catch (err) {
    console.error('Get announcements error:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.post('/:id/announcements', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, body, pinned = false } = req.body;
    if (!title || !body) return void res.status(400).json({ error: 'Title and body are required' });

    const allowed = await isGroupModerator(id, userId);
    if (!allowed) return void res.status(403).json({ error: 'Not authorized' });

    const list = groupAnnouncements.get(id) || [];
    const announcement = { id: `${Date.now()}`, title, body, pinned, createdAt: new Date().toISOString() };
    list.unshift(announcement);
    groupAnnouncements.set(id, list.slice(0, 50));
    res.status(201).json({ announcement });
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// =============================================================================
// GROUP RESOURCES
// =============================================================================

router.get('/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const resources = groupResources.get(id) || [];
    res.json({ resources });
  } catch (err) {
    console.error('Get resources error:', err);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

router.post('/:id/resources', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, url, type = 'link', description } = req.body;
    if (!title || !url) return void res.status(400).json({ error: 'Title and url are required' });

    const allowed = await isGroupModerator(id, userId);
    if (!allowed) return void res.status(403).json({ error: 'Not authorized' });

    const list = groupResources.get(id) || [];
    const resource = { id: `${Date.now()}`, title, url, type, description: description || null, createdAt: new Date().toISOString() };
    list.unshift(resource);
    groupResources.set(id, list.slice(0, 100));
    res.status(201).json({ resource });
  } catch (err) {
    console.error('Create resource error:', err);
    res.status(500).json({ error: 'Failed to create resource' });
  }
});

// =============================================================================
// GROUP LEADERBOARD & ANALYTICS
// =============================================================================

router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { id } = req.params;
    let leaderboard: any[] = [];

    try {
      const members = await prisma.groupMember.findMany({
        where: { groupId: id },
        orderBy: { postCount: 'desc' },
        take: 20,
        include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } }
      });
      leaderboard = members.map((m) => ({
        userId: m.userId,
        name: `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || 'Member',
        avatar: m.user?.avatar || null,
        postCount: m.postCount || 0,
        role: m.role
      }));
    } catch {
      leaderboard = [];
    }

    res.json({ leaderboard });
  } catch (err) {
    console.error('Get leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

router.get('/:id/analytics', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const allowed = await isGroupModerator(id, userId);
    if (!allowed) return void res.status(403).json({ error: 'Not authorized' });

    let members = 0;
    let posts = 0;
    let events = 0;
    try {
      [members, posts, events] = await Promise.all([
        prisma.groupMember.count({ where: { groupId: id } }),
        prisma.groupPost.count({ where: { groupId: id } }),
        prisma.groupEvent.count({ where: { groupId: id } })
      ]);
    } catch {
      // ignore
    }

    res.json({ analytics: { members, posts, events } });
  } catch (err) {
    console.error('Get analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// =============================================================================
// GROUP CHALLENGES
// =============================================================================

router.get('/:id/challenges', async (req, res) => {
  try {
    const { id } = req.params;
    const challenges = groupChallenges.get(id) || [];
    res.json({ challenges });
  } catch (err) {
    console.error('Get challenges error:', err);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

router.post('/:id/challenges', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, points = 10 } = req.body;
    if (!title) return void res.status(400).json({ error: 'Title is required' });

    const allowed = await isGroupModerator(id, userId);
    if (!allowed) return void res.status(403).json({ error: 'Not authorized' });

    const list = groupChallenges.get(id) || [];
    const challenge = { id: `${Date.now()}`, title, description: description || null, points, participants: [] };
    list.unshift(challenge);
    groupChallenges.set(id, list.slice(0, 50));
    res.status(201).json({ challenge });
  } catch (err) {
    console.error('Create challenge error:', err);
    res.status(500).json({ error: 'Failed to create challenge' });
  }
});

router.post('/:id/challenges/:challengeId/join', authenticateJWT, async (req, res) => {
  try {
    const { id, challengeId } = req.params;
    const userId = req.user.id;
    const list = groupChallenges.get(id) || [];
    const challenge = list.find((c) => c.id === challengeId);
    if (!challenge) return void res.status(404).json({ error: 'Challenge not found' });

    challenge.participants = challenge.participants || [];
    if (!challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
    }
    groupChallenges.set(id, list);

    res.json({ success: true, challenge });
  } catch (err) {
    console.error('Join challenge error:', err);
    res.status(500).json({ error: 'Failed to join challenge' });
  }
});

// =============================================================================
// GROUP LIVE ROOMS & COHORTS
// =============================================================================

router.get('/:id/live-rooms', async (req, res) => {
  try {
    const { id } = req.params;
    const rooms = groupLiveRooms.get(id) || [];
    res.json({ rooms });
  } catch (err) {
    console.error('Get live rooms error:', err);
    res.status(500).json({ error: 'Failed to fetch live rooms' });
  }
});

router.post('/:id/live-rooms', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description } = req.body;
    if (!title) return void res.status(400).json({ error: 'Title is required' });

    const allowed = await isGroupModerator(id, userId);
    if (!allowed) return void res.status(403).json({ error: 'Not authorized' });

    const list = groupLiveRooms.get(id) || [];
    const room = { id: `${Date.now()}`, title, description: description || null, createdAt: new Date().toISOString() };
    list.unshift(room);
    groupLiveRooms.set(id, list.slice(0, 20));
    res.status(201).json({ room });
  } catch (err) {
    console.error('Create live room error:', err);
    res.status(500).json({ error: 'Failed to create live room' });
  }
});

router.get('/:id/cohorts', async (req, res) => {
  try {
    const { id } = req.params;
    const cohorts = groupCohorts.get(id) || [];
    res.json({ cohorts });
  } catch (err) {
    console.error('Get cohorts error:', err);
    res.status(500).json({ error: 'Failed to fetch cohorts' });
  }
});

router.post('/:id/cohorts', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description } = req.body;
    if (!title) return void res.status(400).json({ error: 'Title is required' });

    const allowed = await isGroupModerator(id, userId);
    if (!allowed) return void res.status(403).json({ error: 'Not authorized' });

    const list = groupCohorts.get(id) || [];
    const cohort = { id: `${Date.now()}`, title, description: description || null, createdAt: new Date().toISOString() };
    list.unshift(cohort);
    groupCohorts.set(id, list.slice(0, 20));
    res.status(201).json({ cohort });
  } catch (err) {
    console.error('Create cohort error:', err);
    res.status(500).json({ error: 'Failed to create cohort' });
  }
});

// =============================================================================
// GROUP BADGES
// =============================================================================

router.get('/:id/badges', async (req, res) => {
  try {
    const { id } = req.params;
    const badges = groupBadges.get(id) || [];
    res.json({ badges });
  } catch (err) {
    console.error('Get badges error:', err);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

router.post('/:id/badges', authenticateJWT, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, description } = req.body;
    if (!name) return void res.status(400).json({ error: 'Name is required' });

    const allowed = await isGroupModerator(id, userId);
    if (!allowed) return void res.status(403).json({ error: 'Not authorized' });

    const list = groupBadges.get(id) || [];
    const badge = { id: `${Date.now()}`, name, description: description || null };
    list.unshift(badge);
    groupBadges.set(id, list.slice(0, 50));
    res.status(201).json({ badge });
  } catch (err) {
    console.error('Create badge error:', err);
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

// =============================================================================
// MODERATION
// =============================================================================

/**
 * PUT /groups/:id/members/:userId/role - Update member role
 */
router.put('/:id/members/:memberId/role', authenticateJWT, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;
    const { role } = req.body;

    // Check if owner/admin
    const adminMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!adminMembership || !['owner', 'admin'].includes(adminMembership.role)) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    // Only owner can make someone admin
    if (role === 'admin' && adminMembership.role !== 'owner') {
      return void res.status(403).json({ error: 'Only owner can assign admin role' });
    }

    // Cannot change owner role
    const targetMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: memberId } }
    });

    if (targetMembership?.role === 'owner') {
      return void res.status(400).json({ error: 'Cannot change owner role' });
    }

    await prisma.groupMember.update({
      where: { groupId_userId: { groupId: id, userId: memberId } },
      data: { role }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * POST /groups/:id/members/:userId/ban - Ban a member
 */
router.post('/:id/members/:memberId/ban', authenticateJWT, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    // Check if admin/moderator
    const adminMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } }
    });

    if (!adminMembership || !['owner', 'admin', 'moderator'].includes(adminMembership.role)) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    // Cannot ban owner/admin if you're not owner
    const targetMembership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId: memberId } }
    });

    if (targetMembership?.role === 'owner') {
      return void res.status(400).json({ error: 'Cannot ban owner' });
    }

    if (targetMembership?.role === 'admin' && adminMembership.role !== 'owner') {
      return void res.status(403).json({ error: 'Only owner can ban admins' });
    }

    await prisma.$transaction([
      prisma.groupMember.update({
        where: { groupId_userId: { groupId: id, userId: memberId } },
        data: { 
          status: 'banned', 
          bannedAt: new Date(),
          banReason: reason 
        }
      }),
      prisma.communityGroup.update({
        where: { id },
        data: { memberCount: { decrement: 1 } }
      })
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('Ban member error:', err);
    res.status(500).json({ error: 'Failed to ban member' });
  }
});

export default router;


