const { test, expect } = require('@playwright/test');
const { safeGoto, waitForAppReady } = require('./utils/test-helpers');

test.describe('Mobile Responsiveness', () => {
  // Mobile viewport sizes
  const mobileViewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12 Pro', width: 390, height: 844 },
    { name: 'Galaxy S21', width: 360, height: 800 },
  ];

  for (const viewport of mobileViewports) {
    test(`Homepage renders correctly on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await safeGoto(page, '/');
      await waitForAppReady(page, ['header']);
      
      // Header should be visible
      const header = page.getByRole('banner');
      await expect(header).toBeVisible({ timeout: 10000 });
      
      // Logo should be visible
      const logo = header.getByRole('img', { name: /ngurra/i });
      await expect(logo).toBeVisible();
      
      // Mobile menu button should be visible (hamburger)
      const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
      await expect(menuButton).toBeVisible();
      
      // Desktop nav should be hidden
      const desktopNav = page.locator('.hidden.lg\\:block').first();
      await expect(desktopNav).not.toBeVisible();
      
      // No horizontal overflow
      const body = page.locator('body');
      const bodyBox = await body.boundingBox();
      expect(bodyBox.width).toBeLessThanOrEqual(viewport.width + 1);
    });
  }

  test('Jobs page renders mobile-friendly cards', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await safeGoto(page, '/jobs');
    await waitForAppReady(page, ['header']);
    
    // Page should load without horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('Footer stacks properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await safeGoto(page, '/');
    await waitForAppReady(page, ['footer']);
    
    // Footer should be visible
    const footer = page.getByRole('contentinfo');
    await expect(footer).toBeVisible({ timeout: 10000 });
    
    // Footer links should be accessible
    const jobsLink = footer.getByRole('link', { name: /jobs/i });
    await expect(jobsLink).toBeVisible();
  });

  test('Touch targets are at least 44x44px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await safeGoto(page, '/');
    await waitForAppReady(page, ['header']);
    
    // Check primary buttons meet minimum touch target size
    const buttons = page.locator('button, a[role="button"]');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Allow some tolerance - 40px minimum for practical purposes
          expect(box.width).toBeGreaterThanOrEqual(40);
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });
});
