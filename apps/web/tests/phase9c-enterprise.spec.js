"use strict";

const { test, expect } = require('@playwright/test');

test('Phase 9C: enterprise API docs are served', async ({ request }) => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

  const specRes = await request.get(`${apiBase}/api/docs/openapi.json`);
  expect(specRes.ok()).toBeTruthy();
  const spec = await specRes.json();
  expect(spec.openapi).toBeTruthy();
  expect(String(spec.info?.title || '')).toContain('Ngurra');

  const docsRes = await request.get(`${apiBase}/api/docs/`);
  expect(docsRes.ok()).toBeTruthy();
  const html = await docsRes.text();
  expect(/swagger/i.test(html)).toBeTruthy();
});
