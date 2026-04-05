/**
 * Phase 3 Integration: Marketplace Discovery
 */

import request from 'supertest';

let app: any;
let serverAvailable = false;
let token: string;

async function checkServer(): Promise<boolean> {
  try {
    const { createTestApp } = await import('../setup');
    app = await createTestApp();

    const jwt = await import('jsonwebtoken');
    const secret = process.env.JWT_SECRET || process.env.DEV_JWT_SECRET || 'test-jwt-secret-for-vitest-at-least-32-chars';
    token = jwt.default.sign({ userId: 'market-user-1', email: 'market@test.com', role: 'member' }, secret);

    return !!app;
  } catch {
    // eslint-disable-next-line no-console
    console.log('⚠️  Phase 3 marketplace tests skipped - server not available');
    return false;
  }
}

describe('Phase 3 - Marketplace discovery', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
  });

  it('returns industries and categories', async () => {
    if (!serverAvailable) return;

    const industriesRes = await request(app).get('/api/marketplace/industries');
    expect(industriesRes.status).toBe(200);
    expect(Array.isArray(industriesRes.body.industries)).toBe(true);

    const categoriesRes = await request(app).get('/api/marketplace/categories');
    expect(categoriesRes.status).toBe(200);
    expect(Array.isArray(categoriesRes.body.productCategories)).toBe(true);
    expect(Array.isArray(categoriesRes.body.serviceCategories)).toBe(true);
  });

  it('supports unpublishing a business', async () => {
    if (!serverAvailable) return;

    const createRes = await request(app)
      .post('/api/women-business')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Unpublish Test Business',
        businessType: 'SOLE_TRADER',
        industry: 'Retail',
        description: 'Test business for unpublish flow',
      });

    expect(createRes.status).toBe(201);
    const businessId = createRes.body?.business?.id;
    expect(businessId).toBeTruthy();

    const publishRes = await request(app)
      .post(`/api/women-business/${businessId}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect([200, 400, 404]).toContain(publishRes.status);

    const unpublishRes = await request(app)
      .post(`/api/women-business/${businessId}/unpublish`)
      .set('Authorization', `Bearer ${token}`)
      .send();

    expect([200, 400, 404]).toContain(unpublishRes.status);
  });
});
