"use strict";

const { test, expect } = require('@playwright/test');

test.describe('Phase J: AI Wellness Integration', () => {
  test('wellness endpoint returns tips and community resources', async ({ request }) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

    const loginRes = await request.post(`${apiBase}/auth/login`, {
      data: { email: 'member@example.com', password: 'password123' },
    });
    expect(loginRes.ok()).toBeTruthy();
    const login = await loginRes.json();
    expect(login.token).toBeTruthy();

    // Test mental health area
    const wellnessRes = await request.post(`${apiBase}/ai/wellness`, {
      headers: { Authorization: `Bearer ${login.token}` },
      data: {
        userId: login.user?.id,
        area: 'mental',
      },
    });

    expect([200, 429]).toContain(wellnessRes.status());
    if (wellnessRes.status() === 429) {
      return;
    }

    const body = await wellnessRes.json();
    expect(body.ok).toBeTruthy();

    // Tips should be present
    expect(Array.isArray(body.tips)).toBeTruthy();
    expect(body.tips.length).toBeGreaterThan(0);

    // Community resources should be present for mental area
    expect(Array.isArray(body.communityResources)).toBeTruthy();
    expect(body.communityResources.length).toBeGreaterThan(0);

    // Each resource should have name and description
    body.communityResources.forEach((r) => {
      expect(typeof r.name).toBe('string');
      expect(typeof r.description).toBe('string');
    });

    // Elder support should be available
    expect(body.elderSupport).toBeTruthy();
    expect(body.elderSupport.available).toBe(true);
    expect(typeof body.elderSupport.description).toBe('string');
    expect(typeof body.elderSupport.requestPath).toBe('string');

    // Courses array should exist (may be empty)
    expect(Array.isArray(body.recommendedCourses)).toBeTruthy();

    // Source should be provided
    expect(['ai', 'fallback', 'safety']).toContain(body.source);
  });

  test('wellness endpoint returns resources for alcohol area', async ({ request }) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

    const loginRes = await request.post(`${apiBase}/auth/login`, {
      data: { email: 'member@example.com', password: 'password123' },
    });
    const login = await loginRes.json();

    const wellnessRes = await request.post(`${apiBase}/ai/wellness`, {
      headers: { Authorization: `Bearer ${login.token}` },
      data: { area: 'alcohol' },
    });

    expect([200, 429]).toContain(wellnessRes.status());
    if (wellnessRes.status() === 429) return;

    const body = await wellnessRes.json();
    expect(body.ok).toBeTruthy();
    expect(body.communityResources.length).toBeGreaterThan(0);

    // Should include drug/alcohol specific resources
    const hasRelevantResource = body.communityResources.some(
      (r) => r.name.toLowerCase().includes('drug') || r.name.toLowerCase().includes('alcohol')
    );
    expect(hasRelevantResource).toBeTruthy();
  });

  test('wellness UI page renders with crisis banner and data-testids', async ({ page }) => {
    const webBase = process.env.BASE_URL || 'http://127.0.0.1:3000';

    await page.goto(`${webBase}/ai-wellness`);

    // Page should load with data-testid
    await expect(page.locator('[data-testid="ai-wellness-page"]')).toBeVisible();

    // Mental area is default, so crisis banner should be visible
    await expect(page.locator('[data-testid="crisis-banner"]')).toBeVisible();

    // Wellness area buttons should be present
    await expect(page.locator('[data-testid="wellness-area-mental"]')).toBeVisible();
    await expect(page.locator('[data-testid="wellness-area-alcohol"]')).toBeVisible();
    await expect(page.locator('[data-testid="wellness-area-fitness"]')).toBeVisible();
    await expect(page.locator('[data-testid="wellness-area-general"]')).toBeVisible();

    // Get suggestions button should be present
    await expect(page.locator('[data-testid="get-wellness-btn"]')).toBeVisible();
  });
});
