/**
 * Phase 3 Integration: Legal Document Lab
 *
 * Focuses on template library + rendering endpoints.
 * (DB-backed create/export is covered indirectly and may depend on DB availability.)
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
    token = jwt.default.sign({ userId: 'phase3-user-1', email: 'phase3@test.com', role: 'member' }, secret);

    return !!app;
  } catch {
    // eslint-disable-next-line no-console
    console.log('⚠️  Phase 3 legal documents tests skipped - server not available');
    return false;
  }
}

describe('Phase 3 - Legal Document Lab', () => {
  beforeAll(async () => {
    serverAvailable = await checkServer();
  });

  it('lists available legal document templates', async () => {
    if (!serverAvailable) return;

    const res = await request(app)
      .get('/api/legal-documents/templates')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('templates');
    expect(Array.isArray(res.body.templates)).toBe(true);
    expect(res.body.templates.length).toBeGreaterThan(0);
  });

  it('renders an NDA template with variable substitution', async () => {
    if (!serverAvailable) return;

    const res = await request(app)
      .post('/api/legal-documents/templates/render')
      .set('Authorization', `Bearer ${token}`)
      .send({
        templateId: 'nda-basic',
        variables: {
          effectiveDate: '2026-01-16',
          disclosingParty: { name: 'Gimbi Pty Ltd' },
          receivingParty: { name: 'Example Co' },
          termMonths: 12,
          governingLaw: 'New South Wales, Australia',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('content');
    expect(String(res.body.content)).toContain('NON-DISCLOSURE AGREEMENT');
    expect(String(res.body.content)).toContain('Gimbi Pty Ltd');
    expect(String(res.body.content)).toContain('Example Co');
    expect(res.body).toHaveProperty('missingVariables');
    expect(Array.isArray(res.body.missingVariables)).toBe(true);
    expect(res.body.missingVariables.length).toBe(0);
  });
});
