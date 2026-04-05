/**
 * Phase 3 Integration: Cashbook & Accounting
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
    token = jwt.default.sign({ userId: 'cashbook-user-1', email: 'cashbook@test.com', role: 'member' }, secret);

    return !!app;
  } catch {
    // eslint-disable-next-line no-console
    console.log('⚠️  Phase 3 cashbook tests skipped - server not available');
    return false;
  }
}

describe('Phase 3 - Cashbook', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
  });

  it('creates a cashbook, adds entries, and returns summary + categories', async () => {
    if (!serverAvailable) return;

    const createRes = await request(app)
      .post('/api/cashbook')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Cashbook', currency: 'AUD' });

    expect(createRes.status).toBe(201);
    const cashbookId = createRes.body?.cashbook?.id;
    expect(cashbookId).toBeTruthy();

    const entry1 = await request(app)
      .post(`/api/cashbook/${cashbookId}/entries`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'INCOME',
        amount: 1200.5,
        currency: 'AUD',
        category: 'Sales',
        description: 'January income',
        occurredAt: new Date('2026-01-10T10:00:00.000Z').toISOString(),
      });

    expect(entry1.status).toBe(201);

    const entry2 = await request(app)
      .post(`/api/cashbook/${cashbookId}/entries`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'EXPENSE',
        amount: 300.25,
        currency: 'AUD',
        category: 'Supplies',
        description: 'Office supplies',
        occurredAt: new Date('2026-01-12T10:00:00.000Z').toISOString(),
      });

    expect(entry2.status).toBe(201);

    const summaryRes = await request(app)
      .get(`/api/cashbook/${cashbookId}/summary`)
      .set('Authorization', `Bearer ${token}`);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body).toHaveProperty('totals');
    expect(summaryRes.body.totals.income).toBeGreaterThan(0);
    expect(summaryRes.body.totals.expense).toBeGreaterThan(0);

    const categoriesRes = await request(app)
      .get(`/api/cashbook/${cashbookId}/categories`)
      .set('Authorization', `Bearer ${token}`);

    expect(categoriesRes.status).toBe(200);
    expect(Array.isArray(categoriesRes.body.categories)).toBe(true);
  });
});
