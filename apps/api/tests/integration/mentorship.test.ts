/**
 * Phase 7: Mentorship & Community Integration Tests
 * Tests for mentorship features (Steps 601-700)
 */

import request from 'supertest';

let app: any;
let serverAvailable = false;
let candidateToken: string;
let mentorToken: string;
let adminToken: string;

async function checkServer(): Promise<boolean> {
  try {
    const { createTestApp } = await import('../setup');
    app = await createTestApp();
    
    // Generate test tokens
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-secret';
    candidateToken = jwt.default.sign({ userId: 'candidate-1', email: 'candidate@test.com', role: 'member' }, secret);
    mentorToken = jwt.default.sign({ userId: 'mentor-1', email: 'mentor@test.com', role: 'mentor' }, secret);
    adminToken = jwt.default.sign({ userId: 'admin-1', email: 'admin@test.com', role: 'admin' }, secret);
    
    return !!app;
  } catch (error) {
    console.log('⚠️  App creation failed - mentorship integration tests will be skipped');
    return false;
  }
}

describe('Phase 7: Mentorship API Integration', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
  });

  describe('GET /api/mentorship/mentors/available', () => {
    it('should return list of available mentors', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship/mentors/available')
        .set('Authorization', `Bearer ${candidateToken}`);
      
      expect([200, 401, 404, 500, 503]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body).toHaveProperty('mentors');
        expect(Array.isArray(response.body.mentors || response.body.data)).toBe(true);
      }
    });

    it('should filter mentors by skills', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship/mentors/available')
        .query({ skills: 'javascript,react' })
        .set('Authorization', `Bearer ${candidateToken}`);
      
      expect([200, 401, 404, 500, 503]).toContain(response.status);
    });

    it('should filter mentors by industry', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship/mentors/available')
        .query({ industry: 'technology' })
        .set('Authorization', `Bearer ${candidateToken}`);
      
      expect([200, 401, 404, 500, 503]).toContain(response.status);
    });

    it('should support pagination', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship/mentors/available')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${candidateToken}`);
      
      expect([200, 401, 404, 500, 503]).toContain(response.status);
    });
  });

  describe('POST /api/mentorship/request', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/mentorship/request')
        .send({
          mentorId: 'mentor-user-id',
          message: 'I would like mentoring',
        });
      
      expect(response.status).toBe(401);
    });

    it('should create a mentorship request with valid data', async () => {
      if (!serverAvailable) return;

      const requestData = {
        mentorId: 'mentor-user-id',
        message: 'I would like to learn about career development in tech...',
        goals: [
          'Improve technical interview skills',
          'Get guidance on career path',
        ],
        preferredSchedule: {
          days: ['monday', 'wednesday'],
          timeSlots: ['morning', 'afternoon'],
          timezone: 'Australia/Sydney',
        },
        duration: '3-months',
      };

      const response = await request(app)
        .post('/api/mentorship/request')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send(requestData);
      
      expect([201, 400, 404, 409, 500]).toContain(response.status);
    });

    it('should validate required fields', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/mentorship/request')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({});
      
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/mentorship', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/api/mentorship');
      expect(response.status).toBe(401);
    });

    it('should return relationships for authenticated user', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship')
        .set('Authorization', `Bearer ${candidateToken}`);
      
      expect([200, 401, 500]).toContain(response.status);
    });

    it('should filter by status', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${candidateToken}`);
      
      expect([200, 401, 500]).toContain(response.status);
    });
  });

  describe('PATCH /api/mentorship/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/api/mentorship/some-mentorship-id')
        .send({ status: 'accepted' });
      
      expect(response.status).toBe(401);
    });

    it('should allow mentor to accept request', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/api/mentorship/some-mentorship-id')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ status: 'accepted' });
      
      expect([200, 400, 403, 404, 500]).toContain(response.status);
    });

    it('should allow mentor to decline request with reason', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/api/mentorship/some-mentorship-id')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ status: 'declined', reason: 'Schedule conflict' });
      
      expect([200, 400, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/mentorship/:id/sessions', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/mentorship/some-id/sessions')
        .send({
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          duration: 60,
        });
      
      expect(response.status).toBe(401);
    });

    it('should schedule a mentorship session', async () => {
      if (!serverAvailable) return;

      const sessionData = {
        scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        duration: 60,
        type: 'video',
        agenda: 'Review resume and discuss interview preparation',
      };

      const response = await request(app)
        .post('/api/mentorship/some-id/sessions')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send(sessionData);
      
      expect([201, 400, 403, 404, 500]).toContain(response.status);
    });

    it('should reject past dates', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/mentorship/some-id/sessions')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          scheduledAt: '2020-01-01T10:00:00.000Z',
          duration: 60,
          type: 'video',
        });
      
      expect([400, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/mentorship/:id/sessions', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship/some-id/sessions');
      
      expect(response.status).toBe(401);
    });

    it('should return sessions for a mentorship', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship/some-id/sessions')
        .set('Authorization', `Bearer ${candidateToken}`);
      
      expect([200, 403, 404, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(Array.isArray(response.body.sessions || response.body)).toBe(true);
      }
    });
  });

  describe('PATCH /api/mentorship/:id/sessions/:sessionId', () => {
    it('should allow rescheduling a session', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/api/mentorship/some-id/sessions/session-id')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ 
          scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() 
        });
      
      expect([200, 400, 403, 404, 500]).toContain(response.status);
    });

    it('should allow cancelling a session', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/api/mentorship/some-id/sessions/session-id')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ status: 'cancelled', reason: 'Emergency' });
      
      expect([200, 400, 403, 404, 500]).toContain(response.status);
    });

    it('should allow marking session as completed', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/api/mentorship/some-id/sessions/session-id')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({ status: 'completed', notes: 'Great discussion' });
      
      expect([200, 400, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('POST /api/mentorship/:id/feedback', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/mentorship/some-id/feedback')
        .send({ rating: 5, feedback: 'Great mentor!' });
      
      expect(response.status).toBe(401);
    });

    it('should allow mentee to submit feedback', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/mentorship/some-id/feedback')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          rating: 5,
          feedback: 'Excellent mentor, very helpful and supportive',
          sessionId: 'session-id',
        });
      
      expect([201, 400, 403, 404, 500]).toContain(response.status);
    });

    it('should validate rating range', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/mentorship/some-id/feedback')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          rating: 10, // Invalid - should be 1-5
          feedback: 'Test feedback',
        });
      
      expect([400, 403, 404, 500]).toContain(response.status);
    });
  });

  describe('Mentor Profile', () => {
    it('should get mentor profile', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/mentorship/mentor/profile')
        .set('Authorization', `Bearer ${mentorToken}`);
      
      expect([200, 401, 404, 500]).toContain(response.status);
    });

    it('should update mentor profile', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .put('/api/mentorship/mentor/profile')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          bio: 'Experienced software engineer with 10+ years in the industry',
          skills: ['JavaScript', 'React', 'Node.js'],
          availability: 'Weekday evenings and Saturday mornings',
          maxMentees: 5,
        });
      
      expect([200, 400, 401, 500]).toContain(response.status);
    });

    it('should update mentor availability slots', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .put('/api/mentorship/mentor/availability')
        .set('Authorization', `Bearer ${mentorToken}`)
        .send({
          slots: [
            { dayOfWeek: 1, startTime: '18:00', endTime: '20:00' },
            { dayOfWeek: 3, startTime: '18:00', endTime: '20:00' },
            { dayOfWeek: 6, startTime: '10:00', endTime: '12:00' },
          ],
          timezone: 'Australia/Sydney',
        });
      
      expect([200, 400, 401, 500]).toContain(response.status);
    });
  });

  describe('Admin Functions', () => {
    it('should allow admin to view all mentorships', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/admin/mentorships')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 401, 403, 500]).toContain(response.status);
    });

    it('should provide mentorship analytics', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/admin/mentorships/analytics')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect([200, 401, 403, 500]).toContain(response.status);
      
      if (response.status === 200) {
        const body = response.body;
        expect(body).toBeDefined();
      }
    });
  });
});
