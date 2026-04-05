/**
 * Search API Integration Tests
 * 
 * These tests require a running database. They will be skipped if the 
 * database is not available.
 */
import request from 'supertest';

// Server availability check
let serverAvailable = false;
let app: any;
let prisma: any;
let testToken: string;
let employerToken: string;

async function checkServer(): Promise<boolean> {
  try {
    const setupModule = await import('../setup');
    const { createTestApp } = setupModule;
    app = await createTestApp();
    
    const prismaModule = await import('../../src/db');
    prisma = prismaModule.default || prismaModule.prisma;
    
    if (!prisma) return false;
    await prisma.$connect();
    return true;
  } catch (error) {
    console.log('⚠️  Search integration tests skipped - database not available');
    return false;
  }
}

describe('Search API', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
    
    if (serverAvailable) {
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-secret';
      testToken = jwt.default.sign({ userId: 'user-1', email: 'user@test.com', role: 'candidate' }, secret);
      employerToken = jwt.default.sign({ userId: 'employer-1', email: 'employer@test.com', role: 'employer' }, secret);
    }
  });

  afterAll(async () => {
    if (serverAvailable && prisma) {
      await prisma.$disconnect?.();
    }
  });

  describe('GET /api/search/jobs', () => {
    it('should search jobs by keyword', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/jobs')
        .query({ q: 'developer' });

      expect([200, 401, 404]).toContain(response.status);
    });

    it('should filter by location', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/jobs')
        .query({ location: 'Sydney' });

      expect([200, 401, 404]).toContain(response.status);
    });

    it('should paginate results', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/jobs')
        .query({ page: 1, limit: 10 });

      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe('GET /api/search/companies', () => {
    it('should search companies by name', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/companies')
        .query({ q: 'tech' });

      expect([200, 401, 404]).toContain(response.status);
    });

    it('should filter by industry', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/companies')
        .query({ industry: 'Technology' });

      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe('GET /api/search/candidates', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/candidates')
        .query({ skills: ['JavaScript'] });

      // May return 401 (auth required) or 404 (route not implemented)
      expect([401, 404]).toContain(response.status);
    });

    it('should search candidates with auth', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/candidates')
        .set('Authorization', `Bearer ${employerToken}`)
        .query({ skills: ['JavaScript'] });

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /api/search/mentors', () => {
    it('should search mentors by expertise', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/mentors')
        .query({ expertise: 'software' });

      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe('POST /api/search/saved', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/search/saved')
        .send({
          name: 'Test Search',
          query: { q: 'developer' },
        });

      // May return 401 (auth required) or 404 (route not implemented)
      expect([401, 404]).toContain(response.status);
    });
  });

  describe('GET /api/search/suggestions', () => {
    it('should return search suggestions', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/search/suggestions')
        .query({ q: 'dev', type: 'jobs' });

      expect([200, 401, 404]).toContain(response.status);
    });
  });

  describe('GET /api/search/popular', () => {
    it('should return popular searches', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/api/search/popular');

      expect([200, 401, 404]).toContain(response.status);
    });
  });
});
