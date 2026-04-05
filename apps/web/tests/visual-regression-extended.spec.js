"use strict";

/**
 * Visual Regression Testing Configuration
 * 
 * Extended Playwright tests for visual regression testing using screenshots.
 */

const { test, expect } = require('@playwright/test');
const { safeGoto, waitForAppReady } = require('./utils/test-helpers');

// Visual regression test configuration
const VISUAL_CONFIG = {
  // Maximum allowed pixel difference (percentage)
  threshold: 0.1,
  
  // Animation stabilization delay
  animationDelay: 500,
  
  // Viewport sizes to test
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 720 },
    { name: 'wide', width: 1920, height: 1080 },
  ],
};

/**
 * Helper to take stabilized screenshots
 */
async function takeStableScreenshot(page, name, options = {}) {
  // Wait for animations to complete
  await page.waitForTimeout(VISUAL_CONFIG.animationDelay);
  
  // Wait for any loading states to resolve
  await page.waitForLoadState('networkidle');
  
  // Hide dynamic content that could cause flaky tests
  await page.evaluate(() => {
    // Hide timestamps, dates, etc.
    document.querySelectorAll('[data-testid="timestamp"], time, .relative-time').forEach(el => {
      el.style.visibility = 'hidden';
    });
    
    // Hide avatar images that might load dynamically
    document.querySelectorAll('img[src*="avatar"]').forEach(el => {
      el.style.visibility = 'hidden';
    });
  });

  return page.screenshot({
    fullPage: options.fullPage ?? false,
    ...options,
  });
}

test.describe('Visual Regression - Public Pages', () => {
  test.describe.configure({ mode: 'parallel' });

  test('homepage visual snapshot', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['main']);
    
    await expect(page).toHaveScreenshot('homepage.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      animations: 'disabled',
    });
  });

  test('jobs listing visual snapshot', async ({ page }) => {
    await safeGoto(page, '/jobs');
    await waitForAppReady(page, ['main']);
    
    await expect(page).toHaveScreenshot('jobs-listing.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      animations: 'disabled',
    });
  });

  test('login page visual snapshot', async ({ page }) => {
    await safeGoto(page, '/login');
    await waitForAppReady(page, ['form']);
    
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      animations: 'disabled',
    });
  });

  test('register page visual snapshot', async ({ page }) => {
    await safeGoto(page, '/register');
    await waitForAppReady(page, ['form']);
    
    await expect(page).toHaveScreenshot('register.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      animations: 'disabled',
    });
  });

  test('mentorship page visual snapshot', async ({ page }) => {
    await safeGoto(page, '/mentorship');
    await waitForAppReady(page, ['main']);
    
    await expect(page).toHaveScreenshot('mentorship.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Responsive', () => {
  for (const viewport of VISUAL_CONFIG.viewports) {
    test(`homepage at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await safeGoto(page, '/');
      await waitForAppReady(page, ['main']);
      
      await expect(page).toHaveScreenshot(`homepage-${viewport.name}.png`, {
        maxDiffPixelRatio: VISUAL_CONFIG.threshold,
        animations: 'disabled',
      });
    });
  }
});

test.describe('Visual Regression - Components', () => {
  test('navigation menu visual snapshot', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['nav', 'header']);
    
    const nav = page.locator('nav, header').first();
    if (await nav.isVisible()) {
      await expect(nav).toHaveScreenshot('navigation.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.threshold,
        animations: 'disabled',
      });
    }
  });

  test('footer visual snapshot', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['footer']);
    
    const footer = page.locator('footer').first();
    if (await footer.isVisible()) {
      await expect(footer).toHaveScreenshot('footer.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.threshold,
        animations: 'disabled',
      });
    }
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test('homepage dark mode', async ({ page }) => {
    // Enable dark mode via media query emulation
    await page.emulateMedia({ colorScheme: 'dark' });
    await safeGoto(page, '/');
    await waitForAppReady(page, ['main']);
    
    await expect(page).toHaveScreenshot('homepage-dark.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      animations: 'disabled',
    });
  });

  test('login dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await safeGoto(page, '/login');
    await waitForAppReady(page, ['form']);
    
    await expect(page).toHaveScreenshot('login-dark.png', {
      maxDiffPixelRatio: VISUAL_CONFIG.threshold,
      animations: 'disabled',
    });
  });
});

test.describe('Visual Regression - Error States', () => {
  test('404 page visual snapshot', async ({ page }) => {
    await safeGoto(page, '/nonexistent-page-12345');
    await page.waitForLoadState('networkidle');
    
    // Should show 404 or redirect to home
    const has404 = await page.locator('text=/404|not found|page.+exist/i').isVisible().catch(() => false);
    
    if (has404) {
      await expect(page).toHaveScreenshot('404-page.png', {
        maxDiffPixelRatio: VISUAL_CONFIG.threshold,
        animations: 'disabled',
      });
    }
  });
});
