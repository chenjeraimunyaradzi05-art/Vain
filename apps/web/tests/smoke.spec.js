const { test, expect } = require('@playwright/test');
const { safeGoto, waitForAppReady } = require('./utils/test-helpers');

test('home page renders navigation', async ({ page }) => {
  await safeGoto(page, '/');
  await waitForAppReady(page, ['nav', 'header', 'main', '#__next']);
  // The navigation links should be visible - check for Career link (which goes to /jobs) or Jobs link
  await expect(page.getByRole('link', { name: /career|jobs/i }).first()).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: /community/i }).first()).toBeVisible({ timeout: 10000 });
});
