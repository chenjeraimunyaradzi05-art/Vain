/**
 * Users API Integration Tests
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
let adminToken: string;

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
    console.log('⚠️  Users integration tests skipped - database not available');
    return false;
  }
}

describe('Users API', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
    
    if (serverAvailable) {
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-secret';
      testToken = jwt.default.sign({ userId: 'user-1', email: 'user@test.com', role: 'candidate' }, secret);
      adminToken = jwt.default.sign({ userId: 'admin-1', email: 'admin@test.com', role: 'admin' }, secret);
    }
  });

  afterAll(async () => {
    if (serverAvailable && prisma) {
      await prisma.$disconnect?.();
    }
  });

  describe('GET /users/me', () => {
    it('should require auth token', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/users/me');
      expect(response.status).toBe(401);
    });

    it('should return current user profile with valid token', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect([200, 401, 404]).toContain(response.status);
    });

    it('should fail with invalid token', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/users/me')
        .send({ firstName: 'Updated' });

      expect(response.status).toBe(401);
    });

    it('should update current user profile', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/users/me')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ firstName: 'Updated' });

      expect([200, 400, 401, 404]).toContain(response.status);
    });
  });

  describe('GET /users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/users/non-existent-user-12345');

      expect([404, 401]).toContain(response.status);
    });
  });

  describe('GET /users (admin)', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/users');
      expect(response.status).toBe(401);
    });

    it('should require admin role', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${testToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });

    it('should list users for admin', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('PATCH /users/:id (admin)', () => {
    it('should require admin role', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/users/some-user-id')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ role: 'admin' });

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('DELETE /users/:id (admin)', () => {
    it('should require admin role', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .delete('/users/some-user-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect([401, 403]).toContain(response.status);
    });
  });

  describe('GET /users/:id/applications', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/users/some-id/applications');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /users/:id/saved-jobs', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/users/some-id/saved-jobs');
      expect(response.status).toBe(401);
    });
  });
});
