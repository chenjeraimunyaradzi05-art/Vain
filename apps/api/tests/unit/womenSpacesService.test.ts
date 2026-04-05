/**
 * Women Spaces Service Tests
 * Phase 2 Steps 101-125
 */

import type { WomenSpaceType } from '@prisma/client';
import {
  createWomenSpace,
  joinSpace,
  getAccessibleSpaces,
  createPost,
  getSpacePosts,
  joinSupportCircle,
  flagPost,
} from '../../src/services/womenSpaces';
function createMockPrisma() {
  return {
    womenSpace: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    womenSpaceMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    womenVerification: {
      findUnique: jest.fn(),
    },
    womenSpacePost: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    womenSpacePostLike: {
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    womenSpaceComment: {
      create: jest.fn(),
    },
    supportCircle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    supportCircleMember: {
      create: jest.fn(),
    },
  };
}

jest.mock('../../src/db', () => {
  const prisma = createMockPrisma();
  return { prisma };
});

const { prisma: mockPrisma } = jest.requireMock('../../src/db') as {
  prisma: ReturnType<typeof createMockPrisma>;
};

jest.mock('../../src/lib/securityAudit', () => {
  const logSecurityEvent = jest.fn();
  return {
    logSecurityEvent,
    SecurityEventType: {
      CONTENT_FLAGGED: 'CONTENT_FLAGGED',
    },
  };
});

const { logSecurityEvent } = jest.requireMock('../../src/lib/securityAudit') as {
  logSecurityEvent: jest.Mock;
  SecurityEventType: { CONTENT_FLAGGED: string };
};

const spaceType = 'SUPPORT' as unknown as WomenSpaceType;

describe('womenSpacesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a women space with defaults and admin membership', async () => {
    mockPrisma.womenSpace.create.mockResolvedValue({ id: 'space-1', members: [] });

    const space = await createWomenSpace('user-1', {
      name: 'Sisterhood',
      spaceType,
    });

    expect(mockPrisma.womenSpace.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visibility: 'PUBLIC',
          moderatorIds: ['user-1'],
          memberCount: 1,
          members: { create: { userId: 'user-1', role: 'admin' } },
        }),
      })
    );
    expect(space.id).toBe('space-1');
  });

  it('denies joining a space when verification is missing', async () => {
    mockPrisma.womenSpace.findUnique.mockResolvedValue({ id: 'space-1', isActive: true, visibility: 'PUBLIC' });
    mockPrisma.womenVerification.findUnique.mockResolvedValue({ canAccessWomenSpaces: false });

    await expect(joinSpace('user-1', 'space-1')).rejects.toThrow('Access denied - verification required');
  });

  it('returns accessible spaces with First Nations visibility when permitted', async () => {
    mockPrisma.womenVerification.findUnique.mockResolvedValue({
      canAccessWomenSpaces: true,
      canAccessFirstNationsSpaces: true,
    });
    mockPrisma.womenSpaceMember.findMany.mockResolvedValue([{ spaceId: 'member-space' }]);
    mockPrisma.womenSpace.findMany.mockResolvedValue([
      { id: 'public-space' },
      { id: 'first-nations-space' },
    ]);

    const spaces = await getAccessibleSpaces('user-1');

    expect(mockPrisma.womenSpace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ visibility: { in: ['PUBLIC', 'FIRST_NATIONS'] } }),
            expect.objectContaining({ id: { in: ['member-space'] } }),
          ]),
        }),
      })
    );
    expect(spaces).toHaveLength(2);
  });

  it('creates a post as pending when approval is required', async () => {
    mockPrisma.womenSpaceMember.findUnique.mockResolvedValue({ id: 'membership-1' });
    mockPrisma.womenSpace.findUnique.mockResolvedValue({ id: 'space-1', requiresApproval: true });
    mockPrisma.womenSpacePost.create.mockResolvedValue({ id: 'post-1', status: 'PENDING' });
    mockPrisma.womenSpaceMember.update.mockResolvedValue({});

    const post = await createPost('user-1', {
      spaceId: 'space-1',
      content: 'Hello sisters',
    });

    expect(post.status).toBe('PENDING');
    expect(mockPrisma.womenSpaceMember.update).toHaveBeenCalledTimes(1);
  });

  it('hides anonymous authors when not requested', async () => {
    mockPrisma.womenSpacePost.findMany.mockResolvedValue([
      {
        id: 'post-1',
        spaceId: 'space-1',
        status: 'APPROVED',
        isAnonymous: true,
        authorId: 'user-1',
        author: { id: 'user-1', name: 'Test User' },
        _count: { comments: 0, likes: 0 },
      },
    ]);

    const result = await getSpacePosts('space-1');

    expect(result.posts[0].author).toBeNull();
    expect(result.posts[0].authorId).toBeNull();
  });

  it('prevents joining a full support circle', async () => {
    mockPrisma.supportCircle.findUnique.mockResolvedValue({
      id: 'circle-1',
      isActive: true,
      isOpen: true,
      maxMembers: 5,
      _count: { members: 5 },
    });

    await expect(joinSupportCircle('user-1', 'circle-1')).rejects.toThrow('Circle is full');
  });

  it('flags a post and logs a security event', async () => {
    mockPrisma.womenSpacePost.update.mockResolvedValue({ id: 'post-1', status: 'FLAGGED' });

    const post = await flagPost('post-1', 'reporter-1', 'Inappropriate');

    expect(post.status).toBe('FLAGGED');
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'post-1',
        userId: 'reporter-1',
        metadata: { reason: 'Inappropriate' },
      })
    );
  });
});
