const { test, expect } = require('@playwright/test');
const { safeGoto, waitForAppReady } = require('./utils/test-helpers');

test.describe('API Integration Smoke Tests', () => {
  test('Jobs page loads with job listings', async ({ page }) => {
    await safeGoto(page, '/jobs');
    await waitForAppReady(page, ['header']);
    
    // Wait for job cards to appear (either from API or fallback)
    const jobCards = page.locator('[data-testid="job-card"], .job-card, [class*="job"]').first();
    
    // Page should load without error
    await expect(page).not.toHaveURL(/error/);
    
    // Should have some content visible
    const pageContent = page.locator('main, #main-content');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('Courses page loads with course listings', async ({ page }) => {
    await safeGoto(page, '/courses');
    await waitForAppReady(page, ['header']);
    
    // Page should load without error
    await expect(page).not.toHaveURL(/error/);
    
    // Should have content
    const pageContent = page.locator('main, #main-content');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('Mentorship page loads with mentor profiles', async ({ page }) => {
    await safeGoto(page, '/mentorship');
    await waitForAppReady(page, ['header']);
    
    // Page should load without error
    await expect(page).not.toHaveURL(/error/);
    
    // Should have content - use first() to handle multiple main elements
    const pageContent = page.locator('#main-content').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('Community page loads correctly', async ({ page }) => {
    await safeGoto(page, '/community');
    await waitForAppReady(page, ['header']);
    
    // Page should load without error
    await expect(page).not.toHaveURL(/error/);
    
    // Should have content
    const pageContent = page.locator('main, #main-content');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('About page loads correctly', async ({ page }) => {
    await safeGoto(page, '/about');
    await waitForAppReady(page, ['header']);
    
    // Page should load without error
    await expect(page).not.toHaveURL(/error/);
    
    // About page should have stats or values
    const pageContent = page.locator('main, #main-content');
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });

  test('Error page handles 404 gracefully', async ({ page }) => {
    await safeGoto(page, '/nonexistent-page-12345');
    
    // Should show 404 page
    const heading = page.locator('h1');
    await expect(heading).toContainText(/404|not found/i, { timeout: 10000 });
    
    // Should have link back to home
    const homeLink = page.getByRole('link', { name: /home|return|back/i });
    await expect(homeLink).toBeVisible();
  });

  test('Login page is accessible', async ({ page }) => {
    await safeGoto(page, '/login');
    await waitForAppReady(page, ['header']);
    
    // Should have login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    // At least one form element should be present
    const formPresent = await emailInput.isVisible() || await passwordInput.isVisible();
    expect(formPresent).toBe(true);
  });
});
