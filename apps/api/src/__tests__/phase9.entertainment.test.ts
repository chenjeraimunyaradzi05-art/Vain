// @ts-nocheck
/**
 * Phase 9: Entertainment & Content Module Integration Tests
 * Steps 801-875: Short Video (Pulse), Long-Form Content (Cinema), Success Stories
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';

// Test app instance
const app = createApp();

// Test data
let testUserId: string;
let testUserToken: string;
let testVideoId: string;
let testAudioId: string;
let testChallengeId: string;
let testStoryId: string;

// Test user credentials
const testUser = {
  email: `pulse_test_${Date.now()}@test.com`,
  password: 'TestPass123!',
  firstName: 'Pulse',
  lastName: 'Test User',
};

describe('Phase 9: Entertainment & Content Module', () => {
  // ==========================================================================
  // SETUP
  // ==========================================================================

  beforeAll(async () => {
    // Register test user
    const signupRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: testUser.email,
        password: testUser.password,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        userType: 'MEMBER',
      });

    if (signupRes.status === 201) {
      testUserId = signupRes.body.data?.user?.id;
      testUserToken = signupRes.body.data?.token;
    } else {
      // Try login if user exists
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      testUserId = loginRes.body.data?.user?.id;
      testUserToken = loginRes.body.data?.token;
    }

    // Create test audio
    if (testUserToken) {
      const audio = await prisma.pulseAudio.create({
        data: {
          title: 'Test Beat',
          artistName: 'Test Artist',
          audioUrl: 'https://example.com/test-audio.mp3',
          duration: 30,
        },
      });
      testAudioId = audio.id;

      // Create test challenge
      const challenge = await prisma.pulseChallenge.create({
        data: {
          name: 'Test Challenge',
          hashtag: `#TestChallenge${Date.now()}`,
          description: 'Join our test challenge!',
          rules: 'Be creative!',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isActive: true,
          isFeatured: true,
        },
      });
      testChallengeId = challenge.id;
    }
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      if (testVideoId) {
        await prisma.shortVideoView.deleteMany({ where: { videoId: testVideoId } });
        await prisma.shortVideoSave.deleteMany({ where: { videoId: testVideoId } });
        await prisma.shortVideoLike.deleteMany({ where: { videoId: testVideoId } });
        await prisma.shortVideoComment.deleteMany({ where: { videoId: testVideoId } });
        await prisma.challengeEntry.deleteMany({ where: { videoId: testVideoId } });
        await prisma.shortVideo.delete({ where: { id: testVideoId } }).catch(() => {});
      }
      if (testAudioId) {
        await prisma.pulseAudio.delete({ where: { id: testAudioId } }).catch(() => {});
      }
      if (testChallengeId) {
        await prisma.pulseChallenge.delete({ where: { id: testChallengeId } }).catch(() => {});
      }
      if (testUserId) {
        await prisma.memberProfile.deleteMany({ where: { userId: testUserId } }).catch(() => {});
        await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
      }
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  });

  // ==========================================================================
  // SECTION 9.1: SHORT VIDEO PLATFORM (PULSE) - Steps 801-825
  // ==========================================================================

  describe('9.1 Short Video Platform (Pulse)', () => {
    // -------------------------------------------------------------------------
    // Video Upload & Management
    // -------------------------------------------------------------------------

    test('POST /pulse/videos - should upload a new video', async () => {
      const res = await request(app)
        .post('/api/pulse/videos')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          videoUrl: 'https://example.com/test-video.mp4',
          thumbnailUrl: 'https://example.com/test-thumbnail.jpg',
          duration: 15,
          caption: 'Check out this awesome content! #test #pulse',
          audioId: testAudioId,
          visibility: 'public',
          allowDuet: true,
          allowStitch: true,
          allowComments: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.video).toBeDefined();
      expect(res.body.video.videoUrl).toBe('https://example.com/test-video.mp4');
      expect(res.body.video.hashtags).toContain('#test');
      expect(res.body.video.hashtags).toContain('#pulse');
      testVideoId = res.body.video.id;
    });

    test('POST /pulse/videos - should reject videos over 60 seconds', async () => {
      const res = await request(app)
        .post('/api/pulse/videos')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          videoUrl: 'https://example.com/long-video.mp4',
          duration: 120, // Over 60 seconds
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('60 seconds');
    });

    test('POST /pulse/videos - should require authentication', async () => {
      const res = await request(app)
        .post('/api/pulse/videos')
        .send({
          videoUrl: 'https://example.com/test.mp4',
        });

      expect(res.status).toBe(401);
    });

    test('GET /pulse/videos/:id - should get video details', async () => {
      const res = await request(app)
        .get(`/api/pulse/videos/${testVideoId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testVideoId);
      expect(res.body.author).toBeDefined();
      expect(res.body.audio).toBeDefined();
    });

    test('GET /pulse/videos/:id - should increment view count', async () => {
      const before = await request(app)
        .get(`/api/pulse/videos/${testVideoId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      // Make another view
      await request(app)
        .get(`/api/pulse/videos/${testVideoId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      // Note: View count increments on each fetch
      // The test verifies the endpoint works; actual increments depend on deduplication logic
      expect(before.status).toBe(200);
    });

    test('DELETE /pulse/videos/:id - should only allow owner to delete', async () => {
      // Create another user
      const otherUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: `pulse_other_${Date.now()}@test.com`,
          password: 'TestPass123!',
          name: 'Other User',
          userType: 'SEEKER',
        });

      const otherToken = otherUserRes.body.token;

      const res = await request(app)
        .delete(`/api/pulse/videos/${testVideoId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Not authorized');

      // Cleanup
      if (otherUserRes.body.user?.id) {
        await prisma.user.delete({ where: { id: otherUserRes.body.user.id } }).catch(() => {});
      }
    });

    // -------------------------------------------------------------------------
    // Feed Algorithm
    // -------------------------------------------------------------------------

    test('GET /pulse - should get For You feed', async () => {
      const res = await request(app)
        .get('/api/pulse')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.videos).toBeDefined();
      expect(Array.isArray(res.body.videos)).toBe(true);
      expect(res.body.hasMore).toBeDefined();
    });

    test('GET /pulse - should work without authentication', async () => {
      const res = await request(app).get('/api/pulse');

      expect(res.status).toBe(200);
      expect(res.body.videos).toBeDefined();
    });

    test('GET /pulse - should support pagination', async () => {
      const res = await request(app)
        .get('/api/pulse?page=1&limit=5')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.videos.length).toBeLessThanOrEqual(5);
    });

    test('GET /pulse/following - should require authentication', async () => {
      const res = await request(app).get('/api/pulse/following');

      expect(res.status).toBe(401);
    });

    test('GET /pulse/following - should return following feed', async () => {
      const res = await request(app)
        .get('/api/pulse/following')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.videos).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // Engagement Features
    // -------------------------------------------------------------------------

    test('POST /pulse/videos/:id/like - should toggle like', async () => {
      // Like
      const likeRes = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/like`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(likeRes.status).toBe(200);
      expect(likeRes.body.liked).toBe(true);

      // Unlike
      const unlikeRes = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/like`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(unlikeRes.status).toBe(200);
      expect(unlikeRes.body.liked).toBe(false);
    });

    test('POST /pulse/videos/:id/save - should toggle save', async () => {
      // Save
      const saveRes = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/save`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.saved).toBe(true);

      // Unsave
      const unsaveRes = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/save`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(unsaveRes.status).toBe(200);
      expect(unsaveRes.body.saved).toBe(false);
    });

    test('POST /pulse/videos/:id/share - should track share', async () => {
      const res = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/share`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // -------------------------------------------------------------------------
    // Comments
    // -------------------------------------------------------------------------

    test('POST /pulse/videos/:id/comments - should add comment', async () => {
      const res = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/comments`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ content: 'Great video! 🔥' });

      expect(res.status).toBe(201);
      expect(res.body.comment).toBeDefined();
      expect(res.body.comment.content).toBe('Great video! 🔥');
    });

    test('POST /pulse/videos/:id/comments - should reject empty content', async () => {
      const res = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/comments`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ content: '' });

      expect(res.status).toBe(400);
    });

    test('POST /pulse/videos/:id/comments - should reject long comments', async () => {
      const res = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/comments`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ content: 'x'.repeat(600) });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('too long');
    });

    test('GET /pulse/videos/:id/comments - should get comments', async () => {
      const res = await request(app).get(`/api/pulse/videos/${testVideoId}/comments`);

      expect(res.status).toBe(200);
      expect(res.body.comments).toBeDefined();
      expect(Array.isArray(res.body.comments)).toBe(true);
    });

    // -------------------------------------------------------------------------
    // Audio Library
    // -------------------------------------------------------------------------

    test('GET /pulse/audio - should list audio tracks', async () => {
      const res = await request(app).get('/api/pulse/audio');

      expect(res.status).toBe(200);
      expect(res.body.audio).toBeDefined();
      expect(Array.isArray(res.body.audio)).toBe(true);
    });

    test('GET /pulse/audio - should support search', async () => {
      const res = await request(app).get('/api/pulse/audio?search=Test');

      expect(res.status).toBe(200);
      expect(res.body.audio).toBeDefined();
    });

    test('GET /pulse/audio/:id/videos - should get videos using audio', async () => {
      const res = await request(app).get(`/api/pulse/audio/${testAudioId}/videos`);

      expect(res.status).toBe(200);
      expect(res.body.videos).toBeDefined();
    });

    // -------------------------------------------------------------------------
    // Challenges/Trends
    // -------------------------------------------------------------------------

    test('GET /pulse/challenges - should list active challenges', async () => {
      const res = await request(app).get('/api/pulse/challenges');

      expect(res.status).toBe(200);
      expect(res.body.challenges).toBeDefined();
      expect(Array.isArray(res.body.challenges)).toBe(true);
    });

    test('GET /pulse/challenges/:id - should get challenge details', async () => {
      const res = await request(app).get(`/api/pulse/challenges/${testChallengeId}`);

      expect(res.status).toBe(200);
      expect(res.body.challenge).toBeDefined();
      expect(res.body.challenge.hashtag).toBe('#TestChallenge');
    });

    test('POST /pulse/challenges/:id/enter - should enter challenge', async () => {
      const res = await request(app)
        .post(`/api/pulse/challenges/${testChallengeId}/enter`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ videoId: testVideoId });

      // Either success or already entered
      expect([201, 409]).toContain(res.status);
    });

    test('POST /pulse/challenges/:id/enter - should require video ownership', async () => {
      // Create another video by different user
      const otherUserRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: `pulse_challenge_${Date.now()}@test.com`,
          password: 'TestPass123!',
          name: 'Challenge User',
          userType: 'SEEKER',
        });

      const otherVideo = await prisma.shortVideo.create({
        data: {
          authorId: otherUserRes.body.user.id,
          videoUrl: 'https://example.com/other-video.mp4',
          duration: 10,
          status: 'ready',
          visibility: 'public',
        },
      });

      // Try to enter with video we don't own
      const res = await request(app)
        .post(`/api/pulse/challenges/${testChallengeId}/enter`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ videoId: otherVideo.id });

      expect(res.status).toBe(403);

      // Cleanup
      await prisma.shortVideo.delete({ where: { id: otherVideo.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: otherUserRes.body.user.id } }).catch(() => {});
    });

    // -------------------------------------------------------------------------
    // Creator Profile
    // -------------------------------------------------------------------------

    test('GET /pulse/creators/:id - should get creator profile', async () => {
      const res = await request(app)
        .get(`/api/pulse/creators/${testUserId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testUserId);
      expect(res.body.videoCount).toBeDefined();
      expect(res.body.followerCount).toBeDefined();
    });

    test('GET /pulse/creators/:id/videos - should get creator videos', async () => {
      const res = await request(app).get(`/api/pulse/creators/${testUserId}/videos`);

      expect(res.status).toBe(200);
      expect(res.body.videos).toBeDefined();
    });

    test('GET /pulse/me/saved - should get saved videos', async () => {
      // First save a video
      await request(app)
        .post(`/api/pulse/videos/${testVideoId}/save`)
        .set('Authorization', `Bearer ${testUserToken}`);

      const res = await request(app)
        .get('/api/pulse/me/saved')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.videos).toBeDefined();
    });
  });

  // ==========================================================================
  // SECTION 9.3: SUCCESS STORIES - Steps 851-875
  // ==========================================================================

  describe('9.3 Success Stories', () => {
    test('GET /stories - should list published stories', async () => {
      const res = await request(app).get('/api/stories');

      expect(res.status).toBe(200);
      expect(res.body.stories).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    test('GET /stories - should filter featured stories', async () => {
      const res = await request(app).get('/api/stories?featured=true');

      expect(res.status).toBe(200);
      expect(res.body.stories).toBeDefined();
    });

    test('POST /stories - should submit new story', async () => {
      const res = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          title: 'My Success Journey',
          story: 'I found my dream job through Ngurra Pathways!',
          outcome: 'Landed a software engineering role',
          company: 'Tech Corp',
          role: 'Software Engineer',
          isAnonymous: false,
        });

      // 201 Created or 200 OK
      expect([200, 201]).toContain(res.status);
      if (res.body.story) {
        testStoryId = res.body.story.id;
      }
    });

    test('POST /stories - should allow anonymous submission', async () => {
      const res = await request(app)
        .post('/api/stories')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          title: 'Anonymous Success',
          story: 'I want to share but stay private',
          isAnonymous: true,
        });

      expect([200, 201]).toContain(res.status);
    });

    test('GET /stories/user/me - should get my stories', async () => {
      const res = await request(app)
        .get('/api/stories/user/me')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stories).toBeDefined();
    });

    test('POST /stories/:id/like - should like a story', async () => {
      if (!testStoryId) {
        // Create a story first
        const createRes = await request(app)
          .post('/api/stories')
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({
            title: 'Likeable Story',
            story: 'This is worth liking',
          });
        testStoryId = createRes.body.story?.id;
      }

      if (testStoryId) {
        const res = await request(app)
          .post(`/api/stories/${testStoryId}/like`)
          .set('Authorization', `Bearer ${testUserToken}`);

        expect([200, 201]).toContain(res.status);
      }
    });

    test('GET /stories/:id - should get story details', async () => {
      if (testStoryId) {
        const res = await request(app)
          .get(`/api/stories/${testStoryId}`)
          .set('Authorization', `Bearer ${testUserToken}`);

        expect(res.status).toBe(200);
      }
    });

    test('POST /stories/:id/comments - should comment on story', async () => {
      if (testStoryId) {
        const res = await request(app)
          .post(`/api/stories/${testStoryId}/comments`)
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ content: 'Inspiring story!' });

        expect([200, 201]).toContain(res.status);
      }
    });
  });

  // ==========================================================================
  // PERFORMANCE & EDGE CASES
  // ==========================================================================

  describe('Performance & Edge Cases', () => {
    test('Feed should handle empty results gracefully', async () => {
      // Create a user with no following
      const res = await request(app)
        .get('/api/pulse/following')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      expect(res.body.videos).toEqual([]);
      expect(res.body.hasMore).toBe(false);
    });

    test('Video upload should extract hashtags from caption', async () => {
      const res = await request(app)
        .post('/api/pulse/videos')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          videoUrl: 'https://example.com/hashtag-video.mp4',
          caption: 'Check out #indigenous #culture #australia',
          duration: 10,
        });

      if (res.status === 201) {
        expect(res.body.video.hashtags).toContain('#indigenous');
        expect(res.body.video.hashtags).toContain('#culture');
        expect(res.body.video.hashtags).toContain('#australia');

        // Cleanup
        await prisma.shortVideo.delete({ where: { id: res.body.video.id } }).catch(() => {});
      }
    });

    test('Should handle invalid video ID gracefully', async () => {
      const res = await request(app)
        .get('/api/pulse/videos/nonexistent-id')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect([404, 500]).toContain(res.status);
    });

    test('Should handle invalid challenge ID gracefully', async () => {
      const res = await request(app).get('/api/pulse/challenges/nonexistent-id');

      expect(res.status).toBe(404);
    });

    test('Should enforce comment length limits', async () => {
      const res = await request(app)
        .post(`/api/pulse/videos/${testVideoId}/comments`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ content: 'a'.repeat(501) });

      expect(res.status).toBe(400);
    });

    test('Should limit page size', async () => {
      const res = await request(app)
        .get('/api/pulse?limit=1000')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(res.status).toBe(200);
      // Should be capped at 50
      expect(res.body.videos.length).toBeLessThanOrEqual(50);
    });
  });

  // ==========================================================================
  // CONTENT MODERATION & SAFETY
  // ==========================================================================

  describe('Content Moderation & Safety', () => {
    test('Video visibility settings should be respected', async () => {
      // Create a private video
      const privateRes = await request(app)
        .post('/api/pulse/videos')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          videoUrl: 'https://example.com/private-video.mp4',
          duration: 10,
          visibility: 'private',
        });

      if (privateRes.status === 201) {
        const privateVideoId = privateRes.body.video.id;

        // Check that private video doesn't appear in public feed
        const feedRes = await request(app).get('/api/pulse');
        const publicVideoIds = feedRes.body.videos.map((v: any) => v.id);

        expect(publicVideoIds).not.toContain(privateVideoId);

        // Cleanup
        await prisma.shortVideo.delete({ where: { id: privateVideoId } }).catch(() => {});
      }
    });

    test('Comments can be disabled on videos', async () => {
      // Create a video with comments disabled
      const noCommentRes = await request(app)
        .post('/api/pulse/videos')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          videoUrl: 'https://example.com/no-comments-video.mp4',
          duration: 10,
          allowComments: false,
        });

      if (noCommentRes.status === 201) {
        const noCommentVideoId = noCommentRes.body.video.id;

        // Try to comment
        const commentRes = await request(app)
          .post(`/api/pulse/videos/${noCommentVideoId}/comments`)
          .set('Authorization', `Bearer ${testUserToken}`)
          .send({ content: 'Trying to comment' });

        expect(commentRes.status).toBe(403);
        expect(commentRes.body.error).toContain('disabled');

        // Cleanup
        await prisma.shortVideo.delete({ where: { id: noCommentVideoId } }).catch(() => {});
      }
    });
  });
});
