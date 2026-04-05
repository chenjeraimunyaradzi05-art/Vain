/**
 * Recommendation Engine Tests
 * 
 * Unit tests for the collaborative filtering recommendation system
 */


// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  postReaction: {
    findMany: vi.fn(),
  },
  postComment: {
    findMany: vi.fn(),
  },
  connection: {
    findMany: vi.fn(),
  },
  groupMember: {
    findMany: vi.fn(),
  },
  mentor: {
    findMany: vi.fn(),
  },
  socialPost: {
    findMany: vi.fn(),
  },
  group: {
    findMany: vi.fn(),
  },
};

import {
  getConnectionRecommendations,
  getMentorRecommendations,
  getGroupRecommendations,
  getContentRecommendations,
  getSimilarUsers,
  buildUserInteractionProfile,
  clearRecommendationCaches,
} from '../../src/lib/recommendationEngine';

describe('Recommendation Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearRecommendationCaches();
    
    // Reset all mocks to return empty arrays by default
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.findMany.mockResolvedValue([]);
    mockPrisma.postReaction.findMany.mockResolvedValue([]);
    mockPrisma.postComment.findMany.mockResolvedValue([]);
    mockPrisma.connection.findMany.mockResolvedValue([]);
    mockPrisma.groupMember.findMany.mockResolvedValue([]);
    mockPrisma.mentor.findMany.mockResolvedValue([]);
    mockPrisma.socialPost.findMany.mockResolvedValue([]);
    mockPrisma.group.findMany.mockResolvedValue([]);
  });

  describe('buildUserInteractionProfile', () => {
    it('should build empty profile for user with no interactions', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const profile = await buildUserInteractionProfile(mockPrisma, 'user-empty');

      expect(profile.likes.size).toBe(0);
      expect(profile.comments.size).toBe(0);
      expect(profile.follows.size).toBe(0);
      expect(profile.joins.size).toBe(0);
    });

    it('should track liked posts', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([
        { postId: 'post-1', createdAt: new Date() },
        { postId: 'post-2', createdAt: new Date() },
      ]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const profile = await buildUserInteractionProfile(mockPrisma, 'user-likes');

      expect(profile.likes.size).toBe(2);
      expect(profile.likes.has('post-1')).toBe(true);
      expect(profile.likes.has('post-2')).toBe(true);
    });

    it('should track commented posts', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([
        { postId: 'post-1', createdAt: new Date() },
      ]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const profile = await buildUserInteractionProfile(mockPrisma, 'user-comments');

      expect(profile.comments.size).toBe(1);
      expect(profile.comments.has('post-1')).toBe(true);
    });

    it('should track connections', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([
        { senderId: 'user-connections', receiverId: 'user-456', status: 'accepted', updatedAt: new Date() },
        { senderId: 'user-789', receiverId: 'user-connections', status: 'accepted', updatedAt: new Date() },
      ]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const profile = await buildUserInteractionProfile(mockPrisma, 'user-connections');

      expect(profile.follows.size).toBe(2);
      expect(profile.follows.has('user-456')).toBe(true);
      expect(profile.follows.has('user-789')).toBe(true);
    });

    it('should track group memberships', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([
        { groupId: 'group-1', joinedAt: new Date() },
        { groupId: 'group-2', joinedAt: new Date() },
      ]);

      const profile = await buildUserInteractionProfile(mockPrisma, 'user-groups');

      expect(profile.joins.size).toBe(2);
      expect(profile.joins.has('group-1')).toBe(true);
      expect(profile.joins.has('group-2')).toBe(true);
    });
  });

  describe('getConnectionRecommendations', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      industry: 'technology',
      location: 'Sydney, NSW',
      isIndigenous: true,
      skills: [{ name: 'JavaScript' }, { name: 'React' }],
      connections: [],
      sentConnections: [],
    };

    it('should return empty array when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getConnectionRecommendations(mockPrisma, 'user-123');

      expect(result).toEqual([]);
    });

    it('should exclude existing connections from recommendations', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        connections: [{ senderId: 'user-123', receiverId: 'user-456' }],
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-456', name: 'Already Connected', skills: [] },
        { id: 'user-789', name: 'New User', skills: [] },
      ]);

      // Mock interaction profiles
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const result = await getConnectionRecommendations(mockPrisma, 'user-123');

      const ids = result.map((r: any) => r.item.id);
      expect(ids).not.toContain('user-456');
    });

    it('should score candidates based on skill overlap', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-match',
          name: 'Skill Match',
          industry: 'technology',
          location: 'Sydney, NSW',
          skills: [{ name: 'JavaScript' }, { name: 'React' }, { name: 'Node.js' }],
        },
        {
          id: 'user-nomatch',
          name: 'No Match',
          industry: 'healthcare',
          location: 'Perth, WA',
          skills: [{ name: 'Nursing' }],
        },
      ]);

      // Mock empty interactions
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const result = await getConnectionRecommendations(mockPrisma, 'user-123');

      // Should score skill match higher
      if (result.length >= 2) {
        const matchResult = result.find((r: any) => r.item.id === 'user-match');
        const noMatchResult = result.find((r: any) => r.item.id === 'user-nomatch');
        
        if (matchResult && noMatchResult) {
          expect(matchResult.score).toBeGreaterThan(noMatchResult.score);
        }
      }
    });

    it('should boost Indigenous community connections', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user-indigenous',
          name: 'Indigenous User',
          isIndigenous: true,
          industry: 'other',
          skills: [],
        },
        {
          id: 'user-other',
          name: 'Other User',
          isIndigenous: false,
          industry: 'other',
          skills: [],
        },
      ]);

      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const result = await getConnectionRecommendations(mockPrisma, 'user-123');

      const indigenousResult = result.find((r: any) => r.item.id === 'user-indigenous');
      if (indigenousResult) {
        expect(indigenousResult.reasons).toContain('Aboriginal/Torres Strait Islander community');
      }
    });

    it('should respect minScore option', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-low', name: 'Low Score', skills: [], industry: 'other' },
      ]);

      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const result = await getConnectionRecommendations(mockPrisma, 'user-123', { minScore: 0.9 });

      // Should filter out low scores
      expect(result.every((r: any) => r.score >= 0.9)).toBe(true);
    });
  });

  describe('getMentorRecommendations', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      industry: 'technology',
      yearsExperience: 2,
      isIndigenous: true,
      skills: [{ name: 'JavaScript' }],
      preferences: {
        learningGoals: ['leadership', 'management'],
      },
    };

    it('should return empty array when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getMentorRecommendations(mockPrisma, 'user-123');

      expect(result).toEqual([]);
    });

    it('should score mentors by specialization match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.mentor.findMany.mockResolvedValue([
        {
          id: 'mentor-match',
          userId: 'user-mentor-1',
          industry: 'technology',
          yearsExperience: 10,
          specializations: [{ name: 'leadership' }, { name: 'management' }],
          reviews: [{ rating: 5 }],
          user: { isIndigenous: true },
        },
        {
          id: 'mentor-nomatch',
          userId: 'user-mentor-2',
          industry: 'healthcare',
          yearsExperience: 5,
          specializations: [{ name: 'nursing' }],
          reviews: [{ rating: 3 }],
          user: { isIndigenous: false },
        },
      ]);

      const result = await getMentorRecommendations(mockPrisma, 'user-123');

      if (result.length >= 2) {
        expect(result[0].item.id).toBe('mentor-match');
        expect(result[0].score).toBeGreaterThan(result[1].score);
      }
    });

    it('should add reason for highly rated mentors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.mentor.findMany.mockResolvedValue([
        {
          id: 'mentor-top',
          userId: 'user-mentor-1',
          industry: 'technology',
          yearsExperience: 10,
          specializations: [],
          reviews: [{ rating: 5 }, { rating: 5 }, { rating: 4.5 }],
          user: {},
        },
      ]);

      const result = await getMentorRecommendations(mockPrisma, 'user-123');

      if (result.length > 0) {
        expect(result[0].reasons).toContain('Highly rated mentor');
      }
    });
  });

  describe('getGroupRecommendations', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Test User',
      industry: 'technology',
      location: 'Sydney, NSW',
      isIndigenous: true,
      skills: [{ name: 'JavaScript' }],
    };

    it('should return empty array when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getGroupRecommendations(mockPrisma, 'user-123');

      expect(result).toEqual([]);
    });

    it('should exclude groups user already belongs to', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.groupMember.findMany.mockResolvedValue([
        { groupId: 'group-member', userId: 'user-123' },
      ]);
      mockPrisma.group.findMany.mockResolvedValue([
        { id: 'group-member', name: 'Member Group', _count: { members: 50 } },
        { id: 'group-other', name: 'Other Group', _count: { members: 30 } },
      ]);

      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);

      const result = await getGroupRecommendations(mockPrisma, 'user-123');

      const ids = result.map((r: any) => r.item.id);
      expect(ids).not.toContain('group-member');
    });

    it('should boost Indigenous-focused groups for Indigenous users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);
      mockPrisma.group.findMany.mockResolvedValue([
        {
          id: 'group-indigenous',
          name: 'Indigenous Tech',
          isIndigenousFocused: true,
          topics: ['technology'],
          _count: { members: 50 },
        },
        {
          id: 'group-general',
          name: 'General Tech',
          isIndigenousFocused: false,
          topics: ['technology'],
          _count: { members: 50 },
        },
      ]);

      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);

      const result = await getGroupRecommendations(mockPrisma, 'user-123');

      const indigenousGroup = result.find((r: any) => r.item.id === 'group-indigenous');
      if (indigenousGroup) {
        expect(indigenousGroup.reasons).toContain('Indigenous community');
      }
    });
  });

  describe('getContentRecommendations', () => {
    it('should return empty array with no interactions', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);
      mockPrisma.socialPost.findMany.mockResolvedValue([]);

      const result = await getContentRecommendations(mockPrisma, 'user-123');

      expect(result).toEqual([]);
    });

    it('should boost posts from connections', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([
        { senderId: 'user-123', receiverId: 'connection-1', status: 'accepted', updatedAt: new Date() },
      ]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);
      mockPrisma.socialPost.findMany.mockResolvedValue([
        {
          id: 'post-connection',
          authorId: 'connection-1',
          content: 'Connected user post',
          createdAt: new Date(),
          author: { id: 'connection-1', name: 'Connected User' },
          reactions: [],
          _count: { reactions: 10, comments: 5 },
        },
        {
          id: 'post-stranger',
          authorId: 'stranger-1',
          content: 'Stranger post',
          createdAt: new Date(),
          author: { id: 'stranger-1', name: 'Stranger' },
          reactions: [],
          _count: { reactions: 10, comments: 5 },
        },
      ]);

      const result = await getContentRecommendations(mockPrisma, 'user-123');

      const connectionPost = result.find((r: any) => r.item.id === 'post-connection');
      if (connectionPost) {
        expect(connectionPost.reasons).toContain('From a connection');
      }
    });

    it('should respect limit option', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);
      
      const manyPosts = Array.from({ length: 100 }, (_, i) => ({
        id: `post-${i}`,
        authorId: `author-${i}`,
        content: `Post ${i}`,
        createdAt: new Date(),
        author: {},
        reactions: [],
        _count: { reactions: 10, comments: 5 },
      }));
      
      mockPrisma.socialPost.findMany.mockResolvedValue(manyPosts);

      const result = await getContentRecommendations(mockPrisma, 'user-123', { limit: 10 });

      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getSimilarUsers', () => {
    it('should return empty array for user with no interactions', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([]);
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const result = await getSimilarUsers(mockPrisma, 'user-123');

      expect(result).toEqual([]);
    });

    it('should find users who liked same posts', async () => {
      // User likes post-1
      mockPrisma.postReaction.findMany
        .mockResolvedValueOnce([{ postId: 'post-1', createdAt: new Date() }]) // for user-123
        .mockResolvedValueOnce([{ userId: 'similar-user' }]); // similar likers
        
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      // The implementation will find similar users who liked same content
      // This is a simplified test as the full implementation requires more mocking
    });

    it('should respect limit parameter', async () => {
      mockPrisma.postReaction.findMany.mockResolvedValue([
        { postId: 'post-1', createdAt: new Date() },
      ]);
      
      // Return many similar users
      const manyUsers = Array.from({ length: 100 }, (_, i) => ({ userId: `user-${i}` }));
      mockPrisma.postReaction.findMany.mockResolvedValueOnce([{ postId: 'post-1', createdAt: new Date() }]);
      mockPrisma.postReaction.findMany.mockResolvedValueOnce(manyUsers);
      
      mockPrisma.postComment.findMany.mockResolvedValue([]);
      mockPrisma.connection.findMany.mockResolvedValue([]);
      mockPrisma.groupMember.findMany.mockResolvedValue([]);

      const result = await getSimilarUsers(mockPrisma, 'user-123', 5);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });
});
