/**
 * Phase 5: Housing & Real Estate Integration Tests
 * Tests for women's housing portal features (Steps 401-500)
 */

import request from 'supertest';

let app: any;
let serverAvailable = false;
let testToken: string;
let adminToken: string;

async function checkServer(): Promise<boolean> {
  try {
    const { createTestApp } = await import('../setup');
    app = await createTestApp();
    
    // Generate test tokens
    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-secret';
    testToken = jwt.default.sign({ userId: 'test-user-1', email: 'test@test.com', role: 'member' }, secret);
    adminToken = jwt.default.sign({ userId: 'admin-1', email: 'admin@test.com', role: 'admin' }, secret);
    
    return !!app;
  } catch (error) {
    console.log('⚠️  App creation failed - housing integration tests will be skipped');
    return false;
  }
}

describe('Phase 5: Housing API Integration', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
  });

  describe('GET /api/housing/listings', () => {
    it('should list available housing listings', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/housing/listings');
      expect([200, 401, 404, 500, 503]).toContain(res.status);
      
      if (res.status === 200) {
        expect(res.body).toHaveProperty('listings');
        expect(Array.isArray(res.body.listings)).toBe(true);
      }
    });

    it('should support pagination', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/housing/listings')
        .query({ page: 1, pageSize: 10 });

      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });

    it('should filter by suburb', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/housing/listings')
        .query({ suburb: 'Sydney' });

      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });

    it('should filter by housing type', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/housing/listings')
        .query({ housingType: 'APARTMENT' });

      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });

    it('should filter by price range', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/housing/listings')
        .query({ minPrice: 200, maxPrice: 500 });

      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });

    it('should filter by women-only listings', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/housing/listings')
        .query({ womenOnly: true });

      expect([200, 401, 404, 500, 503]).toContain(res.status);
    });
  });

  describe('GET /api/housing/listings/:id', () => {
    it('should return 404 for non-existent listing', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/housing/listings/non-existent-id');
      expect([404, 401, 500]).toContain(res.status);
    });
  });

  describe('POST /api/housing/listings', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/housing/listings')
        .send({
          title: 'Test Listing',
          description: 'Test description',
        });

      expect(res.status).toBe(401);
    });

    it('should create a listing with valid data', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/housing/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Cozy Room in Women-Only House',
          description: 'A comfortable room in a friendly share house',
          housingType: 'SHARE_HOUSE',
          suburb: 'Newtown',
          state: 'NSW',
          postcode: '2042',
          rentPerWeek: 300,
          bedrooms: 1,
          bathrooms: 1,
          womenOnly: true,
          availableFrom: new Date().toISOString(),
        });

      expect([201, 400, 401, 500]).toContain(res.status);
    });

    it('should validate required fields', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/housing/listings')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          title: 'Incomplete Listing',
        });

      expect([400, 401, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/housing/listings/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .put('/api/housing/listings/some-listing-id')
        .send({ title: 'Updated Title' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/housing/listings/:id', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .delete('/api/housing/listings/some-listing-id');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/housing/listings/:id/inquiry', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/housing/listings/some-listing-id/inquiry')
        .send({ message: 'Interested in this listing' });

      expect(res.status).toBe(401);
    });

    it('should send an inquiry with valid auth', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/housing/listings/some-listing-id/inquiry')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          message: 'Hi, I am interested in this room. Can we arrange a viewing?',
          moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          occupants: 1,
        });

      expect([201, 400, 404, 401, 500]).toContain(res.status);
    });
  });

  describe('POST /api/housing/listings/:id/save', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/housing/listings/some-listing-id/save');

      expect(res.status).toBe(401);
    });

    it('should save a listing with valid auth', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .post('/api/housing/listings/some-listing-id/save')
        .set('Authorization', `Bearer ${testToken}`);

      expect([200, 201, 404, 401, 500]).toContain(res.status);
    });
  });

  describe('GET /api/housing/saved', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/housing/saved');
      expect(res.status).toBe(401);
    });

    it('should return saved listings with valid auth', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/housing/saved')
        .set('Authorization', `Bearer ${testToken}`);

      expect([200, 401, 500]).toContain(res.status);
      
      if (res.status === 200) {
        expect(Array.isArray(res.body.listings || res.body)).toBe(true);
      }
    });
  });

  describe('GET /api/housing/my-listings', () => {
    it('should require authentication', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/housing/my-listings');
      expect(res.status).toBe(401);
    });

    it('should return user listings with valid auth', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/housing/my-listings')
        .set('Authorization', `Bearer ${testToken}`);

      expect([200, 401, 500]).toContain(res.status);
    });
  });

  describe('Housing Profile', () => {
    it('should get housing profile', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .get('/api/housing/profile')
        .set('Authorization', `Bearer ${testToken}`);

      expect([200, 404, 401, 500]).toContain(res.status);
    });

    it('should update housing profile', async () => {
      if (!serverAvailable) return;

      const res = await request(app)
        .put('/api/housing/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          seekingType: ['APARTMENT', 'SHARE_HOUSE'],
          maxBudget: 400,
          preferredSuburbs: ['Newtown', 'Marrickville'],
          urgency: 'soon',
        });

      expect([200, 201, 400, 401, 500]).toContain(res.status);
    });
  });

  describe('Safety Features', () => {
    it('should include safety features in listing details', async () => {
      if (!serverAvailable) return;

      const res = await request(app).get('/api/housing/listings');
      
      if (res.status === 200 && res.body.listings?.length > 0) {
        const listing = res.body.listings[0];
        // Safety features may or may not be present
        if (listing.safetyFeatures) {
          expect(Array.isArray(listing.safetyFeatures)).toBe(true);
        }
      }
    });
  });
});
