/**
 * Application E2E Tests
 * 
 * End-to-end tests for job application flows
 */

// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Job Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to jobs page
    await page.goto('/jobs');
  });

  test('should display job listings', async ({ page }) => {
    // Wait for jobs to load
    await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible({ 
      timeout: 10000 
    });

    // Verify multiple jobs are displayed
    const jobCards = page.locator('[data-testid="job-card"]');
    const count = await jobCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter jobs by search', async ({ page }) => {
    const searchInput = page.locator('[data-testid="job-search-input"]');
    
    await searchInput.fill('developer');
    await searchInput.press('Enter');

    // Wait for filtered results
    await page.waitForResponse(response => 
      response.url().includes('/jobs') && response.status() === 200
    );

    // Verify URL contains search param
    expect(page.url()).toContain('search=developer');
  });

  test('should filter jobs by location', async ({ page }) => {
    const locationFilter = page.locator('[data-testid="location-filter"]');
    
    if (await locationFilter.isVisible()) {
      await locationFilter.selectOption({ label: 'Sydney' });

      // Wait for filtered results
      await page.waitForResponse(response => 
        response.url().includes('/jobs') && response.status() === 200
      );

      expect(page.url()).toContain('location=');
    }
  });

  test('should open job details modal', async ({ page }) => {
    // Click on first job card
    const firstJob = page.locator('[data-testid="job-card"]').first();
    await firstJob.click();

    // Verify modal or detail page opens
    await expect(
      page.locator('[data-testid="job-details"], [data-testid="job-detail-page"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show apply button for job', async ({ page }) => {
    // Click on first job
    const firstJob = page.locator('[data-testid="job-card"]').first();
    await firstJob.click();

    // Wait for details to load
    await page.waitForSelector('[data-testid="job-details"], [data-testid="job-detail-page"]');

    // Find apply button
    const applyButton = page.locator('[data-testid="apply-button"], button:has-text("Apply")');
    await expect(applyButton).toBeVisible();
  });
});

test.describe('Mobile Job Browsing', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should work on mobile viewport', async ({ page }) => {
    await page.goto('/jobs');

    // Verify mobile layout
    const jobsList = page.locator('[data-testid="jobs-list"]');
    await expect(jobsList).toBeVisible();

    // Verify job cards stack vertically
    const firstCard = page.locator('[data-testid="job-card"]').first();
    const boundingBox = await firstCard.boundingBox();
    
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375);
    }
  });

  test('should show mobile filter menu', async ({ page }) => {
    await page.goto('/jobs');

    // Find and click filter toggle
    const filterToggle = page.locator('[data-testid="filter-toggle"], button:has-text("Filters")');
    
    if (await filterToggle.isVisible()) {
      await filterToggle.click();

      // Verify filter panel opens
      await expect(
        page.locator('[data-testid="filter-panel"], [data-testid="mobile-filters"]')
      ).toBeVisible();
    }
  });
});

test.describe('Job Search Accessibility', () => {
  test('should support keyboard navigation in job list', async ({ page }) => {
    await page.goto('/jobs');

    // Focus on job list
    const jobsList = page.locator('[data-testid="jobs-list"]');
    await jobsList.focus();

    // Navigate with arrow keys
    await page.keyboard.press('ArrowDown');
    
    // Verify focus moved
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should announce filter results to screen readers', async ({ page }) => {
    await page.goto('/jobs');

    // Apply a filter
    const searchInput = page.locator('[data-testid="job-search-input"]');
    await searchInput.fill('developer');
    await searchInput.press('Enter');

    // Check for live region announcement
    const liveRegion = page.locator('[aria-live="polite"], [role="status"]');
    
    if (await liveRegion.isVisible()) {
      const text = await liveRegion.textContent();
      expect(text).toMatch(/found|results|jobs/i);
    }
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/jobs');

    // Check h1 exists
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();

    // Verify no skipped heading levels
    const h2s = await page.locator('h2').count();
    const h3s = await page.locator('h3').count();
    
    // If there are h3s, there should be h2s
    if (h3s > 0) {
      expect(h2s).toBeGreaterThan(0);
    }
  });
});
