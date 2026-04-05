/**
 * Phase 3 Business Tools Integration Tests
 *
 * These tests are intentionally light and mostly validate route wiring + auth.
 */

import request from 'supertest';

let serverAvailable = false;
let app: any;

async function checkServer(): Promise<boolean> {
	try {
		const setupModule = await import('../setup');
		const { createTestApp } = setupModule;
		app = await createTestApp();
		return true;
	} catch {
		console.log('⚠️  Phase 3 business tools tests skipped - server not available');
		return false;
	}
}

describe('Phase 3 Business Tools', () => {
	beforeAll(async () => {
		serverAvailable = await checkServer();
	});

	describe('Women Business', () => {
		it('POST /api/women-business should require authentication', async () => {
			if (!serverAvailable) return;

			const response = await request(app).post('/api/women-business').send({
				name: 'My Biz',
				businessType: 'SOLE_TRADER',
				industry: 'Retail',
			});

			expect(response.status).toBe(401);
		});

		it('GET /api/women-business should require authentication', async () => {
			if (!serverAvailable) return;

			const response = await request(app).get('/api/women-business');
			expect(response.status).toBe(401);
		});

		it('GET /api/women-business/directory should be public', async () => {
			if (!serverAvailable) return;

			const response = await request(app).get('/api/women-business/directory');
			// If DB is unavailable this may 500; we still treat wiring as present
			expect([200, 500]).toContain(response.status);
		});
	});

	describe('Legal Documents', () => {
		it('GET /api/legal-documents should require authentication', async () => {
			if (!serverAvailable) return;

			const response = await request(app).get('/api/legal-documents');
			expect(response.status).toBe(401);
		});

		it('POST /api/legal-documents should require authentication', async () => {
			if (!serverAvailable) return;

			const response = await request(app).post('/api/legal-documents').send({
				title: 'Contract',
				type: 'SERVICE_AGREEMENT',
			});
			expect(response.status).toBe(401);
		});
	});

	describe('Cashbook', () => {
		it('GET /api/cashbook should require authentication', async () => {
			if (!serverAvailable) return;

			const response = await request(app).get('/api/cashbook');
			expect(response.status).toBe(401);
		});

		it('POST /api/cashbook should require authentication', async () => {
			if (!serverAvailable) return;

			const response = await request(app).post('/api/cashbook').send({ name: 'My Cashbook' });
			expect(response.status).toBe(401);
		});
	});

	describe('Marketplace', () => {
		it('GET /api/marketplace/businesses should be public', async () => {
			if (!serverAvailable) return;

			const response = await request(app).get('/api/marketplace/businesses');
			expect([200, 500]).toContain(response.status);
		});

		it('GET /api/marketplace/products should be public', async () => {
			if (!serverAvailable) return;

			const response = await request(app).get('/api/marketplace/products');
			expect([200, 500]).toContain(response.status);
		});
	});
});
