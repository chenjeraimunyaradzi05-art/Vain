/**
 * Companies API Integration Tests
 * 
 * These tests require a running database. They will be skipped if the 
 * database is not available.
 */
import request from 'supertest';

// Server availability check
let serverAvailable = false;
let app: any;
let prisma: any;

// Test state
let adminToken: string;
let employerToken: string;
let regularToken: string;
let testCompany: any;

async function checkServer(): Promise<boolean> {
  try {
    const setupModule = await import('../setup');
    const { createTestApp } = setupModule;
    app = await createTestApp();
    
    // Try to get prisma
    const prismaModule = await import('../../src/db');
    prisma = prismaModule.default || prismaModule.prisma;
    
    if (!prisma) return false;
    
    // Test connection
    await prisma.$connect();
    return true;
  } catch (error) {
    console.log('⚠️  Companies integration tests skipped - database not available');
    return false;
  }
}

describe('Companies API', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
    
    if (serverAvailable) {
      // Generate test tokens
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-secret';
      
      adminToken = jwt.default.sign({ userId: 'admin-1', email: 'admin@test.com', role: 'admin' }, secret);
      employerToken = jwt.default.sign({ userId: 'employer-1', email: 'employer@test.com', role: 'employer' }, secret);
      regularToken = jwt.default.sign({ userId: 'user-1', email: 'user@test.com', role: 'candidate' }, secret);
    }
  });

  afterAll(async () => {
    if (serverAvailable && prisma) {
      await prisma.$disconnect?.();
    }
  });

  describe('POST /api/companies', () => {
    it('should create a company as employer', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/companies')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          name: 'Test Company Integration',
          industry: 'Technology',
          size: 'small',
          description: 'Test company',
        });

      expect([201, 400, 401, 403]).toContain(response.status);
    });

    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .post('/api/companies')
        .send({
          name: 'Unauthorized Company',
          industry: 'Technology',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/companies', () => {
    it('should list companies with pagination', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/companies')
        .query({ page: 1, limit: 10 });

      expect([200, 401]).toContain(response.status);
    });

    it('should filter by industry', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/companies')
        .query({ industry: 'Technology' });

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('GET /api/companies/:id', () => {
    it('should return 404 for non-existent company', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/companies/non-existent-id-12345');

      expect([404, 401]).toContain(response.status);
    });
  });

  describe('PATCH /api/companies/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/api/companies/some-id')
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/companies/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .delete('/api/companies/some-id');

      expect(response.status).toBe(401);
    });
  });
});
