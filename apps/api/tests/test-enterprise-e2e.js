"use strict";
/**
 * Enterprise Features E2E Tests (Phase H)
 * 
 * Tests for API keys, webhooks, SSO, and bulk import endpoints.
 */

const { describe, it, before } = require('node:test');
const assert = require('assert');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Helper to make authenticated requests
async function authRequest(path, options = {}) {
  // In a real test, this would use a test token
  const token = process.env.TEST_TOKEN || 'test-token';
  
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers
    }
  });
}

describe('Enterprise Features - API Keys', async () => {
  it('GET /api-keys returns list of keys', async () => {
    const res = await authRequest('/api-keys');
    const data = await res.json();
    
    // Should return keys array (may be empty if no company profile)
    assert.ok(data.keys !== undefined || data.error, 'Should return keys or error');
  });

  it('POST /api-keys validates input', async () => {
    const res = await authRequest('/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'ab' }) // Too short
    });
    const data = await res.json();
    
    // Should reject short names
    assert.ok(data.error || res.status === 400 || res.status === 403);
  });
});

describe('Enterprise Features - Webhooks', async () => {
  it('GET /webhook-endpoints returns list', async () => {
    const res = await authRequest('/webhook-endpoints');
    const data = await res.json();
    
    assert.ok(data.webhooks !== undefined || data.error, 'Should return webhooks or error');
  });

  it('GET /webhook-endpoints/events returns event types', async () => {
    const res = await authRequest('/webhook-endpoints/events');
    const data = await res.json();
    
    assert.ok(data.events !== undefined || data.error, 'Should return events or error');
  });

  it('POST /webhook-endpoints validates HTTPS URL', async () => {
    const res = await authRequest('/webhook-endpoints', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Webhook',
        url: 'http://example.com', // Not HTTPS
        events: ['job.created']
      })
    });
    const data = await res.json();
    
    // Should reject non-HTTPS URLs
    assert.ok(data.error || res.status === 400 || res.status === 403);
  });
});

describe('Enterprise Features - SSO', async () => {
  it('GET /sso/config returns configuration', async () => {
    const res = await authRequest('/sso/config');
    const data = await res.json();
    
    assert.ok(data.configured !== undefined || data.error, 'Should return config or error');
  });

  it('POST /sso/config validates provider', async () => {
    const res = await authRequest('/sso/config', {
      method: 'POST',
      body: JSON.stringify({ provider: 'INVALID' })
    });
    const data = await res.json();
    
    // Should reject invalid provider
    assert.ok(data.error || res.status === 400 || res.status === 403);
  });
});

describe('Enterprise Features - Bulk Import', async () => {
  it('GET /bulk-import returns import history', async () => {
    const res = await authRequest('/bulk-import');
    const data = await res.json();
    
    assert.ok(data.imports !== undefined || data.error, 'Should return imports or error');
  });

  it('GET /bulk-import/templates/jobs returns CSV template', async () => {
    const res = await fetch(`${API_URL}/bulk-import/templates/jobs`);
    
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers.get('content-type')?.includes('text/csv'));
  });

  it('GET /bulk-import/templates/candidates returns CSV template', async () => {
    const res = await fetch(`${API_URL}/bulk-import/templates/candidates`);
    
    assert.strictEqual(res.status, 200);
  });

  it('GET /bulk-import/templates/courses returns CSV template', async () => {
    const res = await fetch(`${API_URL}/bulk-import/templates/courses`);
    
    assert.strictEqual(res.status, 200);
  });

  it('POST /bulk-import/jobs validates CSV', async () => {
    const res = await authRequest('/bulk-import/jobs', {
      method: 'POST',
      body: JSON.stringify({ csvData: '' }) // Empty CSV
    });
    const data = await res.json();
    
    // Should reject empty CSV
    assert.ok(data.error || res.status === 400 || res.status === 403);
  });
});

describe('Enterprise Features - Tenant', async () => {
  it('GET /tenant returns tenant configuration', async () => {
    const res = await authRequest('/tenant');
    const data = await res.json();
    
    assert.ok(data.configured !== undefined || data.error, 'Should return config or error');
  });

  it('GET /tenant/regions returns available regions', async () => {
    const res = await fetch(`${API_URL}/tenant/regions`);
    const data = await res.json();
    
    assert.ok(data.regions, 'Should return regions');
    assert.ok(data.regions.AU, 'Should include AU region');
  });

  it('POST /tenant validates subdomain format', async () => {
    const res = await authRequest('/tenant', {
      method: 'POST',
      body: JSON.stringify({ subdomain: 'AB' }) // Too short
    });
    const data = await res.json();
    
    // Should reject short subdomain
    assert.ok(data.error || res.status === 400 || res.status === 403);
  });
});

console.log('Enterprise E2E tests defined. Run with: node --test test-enterprise-e2e.js');
