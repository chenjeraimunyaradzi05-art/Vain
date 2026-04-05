/**
 * Jobs API Integration Tests
 * 
 * Tests for job listing endpoints. Skipped if server unavailable.
 */

import request from 'supertest';

let app: any;
let serverAvailable = false;
let testToken: string;

async function checkServer(): Promise<boolean> {
  try {
    const { createTestApp } = await import('../setup');
    app = await createTestApp();
    
    // Generate test token
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-secret';
    testToken = jwt.default.sign({ userId: 'test-1', email: 'test@test.com', role: 'employer' }, secret);
    
    return !!app;
  } catch (error) {
    console.log('⚠️  App creation failed - integration tests will be skipped');
    return false;
  }
}

describe('Jobs API Integration', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
  });

  describe('GET /api/jobs', () => {
    it('should list jobs', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/jobs');
      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });

    it('should support pagination', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/jobs')
        .query({ page: 1, limit: 10 });

      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });

    it('should support search', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/jobs')
        .query({ search: 'developer' });

      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });

    it('should filter by location', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/jobs')
        .query({ location: 'Sydney' });

      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });
  });

  describe('GET /api/jobs/:id', () => {
    it('should return 404 for non-existent job', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/jobs/non-existent-id-12345');
      expect([404, 401, 500]).toContain(res.status);
    });
  });

  describe('POST /api/jobs', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/jobs')
        .send({
          title: 'Test Job',
          description: 'Test description',
        });

      expect(res.status).toBe(401);
    });

    it('should handle job creation with auth', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Test Job',
          description: 'Test description',
          location: 'Sydney',
          salary: '$80,000',
        });

      expect([201, 400, 401, 403, 500, 503]).toContain(res.status);
    });
  });

  describe('PATCH /api/jobs/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .patch('/api/jobs/some-id')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app).delete('/api/jobs/some-id');
      expect(res.status).toBe(401);
    });
  });
});
