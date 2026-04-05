/**
 * API Service Tests
 *
 * Tests for the mobile API client
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { connectionsApi, feedApi, groupsApi } from '../services/api';

// Mock modules
jest.mock('@react-native-async-storage/async-storage');

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const AUTH_TOKEN_KEY = '@ngurra_auth_token';
const REFRESH_TOKEN_KEY = '@ngurra_refresh_token';

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();

    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === AUTH_TOKEN_KEY) {
        return Promise.resolve('test-auth-token');
      }

      if (key === REFRESH_TOKEN_KEY) {
        return Promise.resolve(null);
      }

      return Promise.resolve(null);
    });
  });

  describe('Feed API', () => {
    it('should fetch feed with default parameters', async () => {
      const mockResponse = {
        posts: [{ id: '1', content: 'Test post' }],
        hasMore: true,
        nextCursor: 'cursor-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await feedApi.getFeed();

      expect(mockFetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should create a post', async () => {
      const postData = {
        content: 'Test post content',
        visibility: 'public',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '1', ...postData }),
      });

      const result = await feedApi.createPost(postData);

      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
    });

    it('should react to a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await feedApi.reactToPost('post-123', 'like');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should comment on a post', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'comment-1', content: 'Nice!' }),
      });

      await feedApi.addComment('post-123', 'Nice!');

      expect(mockFetch).toHaveBeenCalled();
      const [url, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
    });
  });

  describe('Connections API', () => {
    it('should get connections list', async () => {
      const mockConnections = {
        connections: [
          { id: '1', name: 'User 1' },
          { id: '2', name: 'User 2' },
        ],
        total: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockConnections),
      });

      const result = await connectionsApi.getConnections();

      expect(result).toEqual(mockConnections);
    });

    it('should send connection request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await connectionsApi.sendRequest('user-123', 'Hi!');

      const [url, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
    });

    it('should accept connection request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await connectionsApi.acceptRequest('request-123');

      const [url, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('PUT');
    });

    it('should reject connection request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await connectionsApi.rejectRequest('request-123');

      const [url, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('PUT');
    });

    it('should follow a user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await connectionsApi.followUser('user-123');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should unfollow a user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await connectionsApi.unfollowUser('user-123');

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Groups API', () => {
    it('should discover groups', async () => {
      const mockGroups = {
        groups: [
          { id: '1', name: 'Tech Group' },
          { id: '2', name: 'Career Group' },
        ],
        total: 2,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGroups),
      });

      const result = await groupsApi.getGroups();

      expect(result).toEqual(mockGroups);
    });

    it('should get user groups', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ groups: [] }),
      });

      await groupsApi.getMyGroups();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should create a group', async () => {
      const groupData = {
        name: 'New Group',
        description: 'A new community group',
        groupType: 'community',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '1', ...groupData }),
      });

      const result = await groupsApi.createGroup(groupData);

      const [url, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
    });

    it('should join a group', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await groupsApi.joinGroup('group-123');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should leave a group', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await groupsApi.leaveGroup('group-123');

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should get group details', async () => {
      const mockGroup = {
        id: 'group-123',
        name: 'Test Group',
        memberCount: 50,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGroup),
      });

      const result = await groupsApi.getGroup('group-123');

      expect(result).toEqual(mockGroup);
    });

    it('should get featured groups', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ groups: [] }),
      });

      await groupsApi.getGroups({ featured: true });

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(feedApi.getFeed()).rejects.toThrow();
    });

    it('should handle unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(feedApi.getFeed()).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      await expect(feedApi.getFeed()).rejects.toThrow();
    });
  });

  describe('Authentication', () => {
    it('should include auth header when token exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ posts: [] }),
      });

      await feedApi.getFeed();

      const [url, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer test-auth-token');
    });

    it('should not include auth header when no token', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ posts: [] }),
      });

      await feedApi.getFeed();

      const [url, options] = mockFetch.mock.calls[0];
      expect(mockFetch).toHaveBeenCalled();
      expect(options.headers.Authorization).toBeUndefined();
    });
  });
});
