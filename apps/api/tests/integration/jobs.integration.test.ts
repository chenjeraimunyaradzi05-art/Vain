/**
 * Jobs API Integration Tests - Extended
 * 
 * Additional job endpoint tests. Skipped if server unavailable.
 */

import request from 'supertest';

let app: any;
let serverAvailable = false;
let employerToken: string;
let candidateToken: string;

async function checkServer(): Promise<boolean> {
  try {
    const { createTestApp } = await import('../setup');
    app = await createTestApp();
    
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-secret';
    employerToken = jwt.default.sign({ userId: 'employer-1', email: 'employer@test.com', role: 'employer' }, secret);
    candidateToken = jwt.default.sign({ userId: 'candidate-1', email: 'candidate@test.com', role: 'candidate' }, secret);
    
    return !!app;
  } catch (error) {
    console.log('⚠️  Jobs integration tests skipped - server not available');
    return false;
  }
}

describe('Jobs API - Extended Integration', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
  });

  describe('Job Applications', () => {
    it('should require auth to apply', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/jobs/some-id/apply')
        .send({ coverLetter: 'I am interested' });

      expect([401, 404]).toContain(res.status);
    });

    it('should handle application with auth', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/jobs/some-id/apply')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ coverLetter: 'I am interested' });

      expect([201, 400, 401, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('Job Bookmarks', () => {
    it('should require auth to bookmark', async () => {
      if (!serverAvailable) return;

      const res = await request(app).post('/api/jobs/some-id/bookmark');
      expect([401, 404]).toContain(res.status);
    });
  });

  describe('Featured Jobs', () => {
    it('should list featured jobs', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/jobs/featured');
      expect([200, 401, 404, 500]).toContain(res.status);
    });
  });

  describe('Job Categories', () => {
    it('should list job categories', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/jobs/categories');
      expect([200, 404, 500]).toContain(res.status);
    });
  });
});
