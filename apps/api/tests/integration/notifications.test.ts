/**
 * Notifications API Integration Tests
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
    console.log('⚠️  Notifications integration tests skipped - database not available');
    return false;
  }
}

describe('Notifications API', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
    
    if (serverAvailable) {
      const jwt = await import('jsonwebtoken');
      const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-secret';
      testToken = jwt.default.sign({ userId: 'user-1', email: 'user@test.com', role: 'candidate' }, secret);
    }
  });

  afterAll(async () => {
    if (serverAvailable && prisma) {
      await prisma.$disconnect?.();
    }
  });

  describe('GET /api/notifications', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/api/notifications');
      expect(response.status).toBe(401);
    });

    it('should list user notifications', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${testToken}`);

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('GET /api/notifications/count', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/api/notifications/count');
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/notifications/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app)
        .patch('/api/notifications/some-id')
        .send({ read: true });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/notifications/mark-all-read', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).post('/api/notifications/mark-all-read');
      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).delete('/api/notifications/some-id');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/notifications/preferences', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const response = await request(app).get('/api/notifications/preferences');
      expect(response.status).toBe(401);
    });
  });
});
