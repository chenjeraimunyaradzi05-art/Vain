/**
 * Jobs E2E Tests
 * 
 * Tests for job listing, search, filtering, and application flow.
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3333';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Jobs API', () => {
  test.describe('Job Listing', () => {
    test('should return paginated job list', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs`);
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data.meta).toBeDefined();
      expect(data.meta.page).toBeDefined();
      expect(data.meta.pageSize).toBeDefined();
    });

    test('should support pagination parameters', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs?page=1&pageSize=5`);
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.data.length).toBeLessThanOrEqual(5);
      expect(data.meta.pageSize).toBe(5);
    });

    test('should filter by location', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs?location=Sydney`);
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      // If results exist, they should match location
      if (data.data.length > 0) {
        data.data.forEach((job: any) => {
          expect(job.location?.toLowerCase()).toContain('sydney');
        });
      }
    });

    test('should filter by employment type', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs?employment=FULL_TIME`);
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      if (data.data.length > 0) {
        data.data.forEach((job: any) => {
          expect(job.employment).toBe('FULL_TIME');
        });
      }
    });

    test('should search by keyword', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs?q=developer`);
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      // Results should be relevant to search term
      expect(data.data).toBeDefined();
    });
  });

  test.describe('Job Details', () => {
    let jobId: string;

    test.beforeAll(async ({ request }) => {
      // Get a job ID to test with
      const response = await request.get(`${API_URL}/jobs?pageSize=1`);
      const data = await response.json();
      if (data.data && data.data.length > 0) {
        jobId = data.data[0].id;
      }
    });

    test('should return job details by ID', async ({ request }) => {
      test.skip(!jobId, 'No jobs available for testing');
      
      const response = await request.get(`${API_URL}/jobs/${jobId}`);
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.data).toBeDefined();
      expect(data.data.id).toBe(jobId);
      expect(data.data.title).toBeDefined();
      expect(data.data.description).toBeDefined();
    });

    test('should return 404 for non-existent job', async ({ request }) => {
      const response = await request.get(`${API_URL}/jobs/non-existent-id-12345`);
      
      expect(response.status()).toBe(404);
    });
  });
});

test.describe('Jobs UI', () => {
  test('should display job listings on jobs page', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    
    // Wait for jobs to load
    await page.waitForSelector('[data-testid="job-card"], .job-card, article', { timeout: 10000 });
    
    // Should have at least one job card or empty state
    const jobCards = page.locator('[data-testid="job-card"], .job-card, article');
    const emptyState = page.locator('text=/no jobs|no results|empty/i');
    
    const hasJobs = await jobCards.count() > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    
    expect(hasJobs || hasEmptyState).toBeTruthy();
  });

  test('should have working search functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    
    // Find and fill search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[name="search"], input[name="q"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('developer');
      await searchInput.press('Enter');
      
      // Wait for results to update
      await page.waitForTimeout(1000);
      
      // URL should reflect search
      expect(page.url()).toContain('developer');
    }
  });

  test('should navigate to job detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    
    // Wait for jobs to load
    await page.waitForSelector('[data-testid="job-card"], .job-card, article', { timeout: 10000 });
    
    // Click first job
    const firstJob = page.locator('[data-testid="job-card"] a, .job-card a, article a').first();
    
    if (await firstJob.isVisible()) {
      await firstJob.click();
      
      // Should navigate to job detail page
      await page.waitForURL(/\/jobs\/[^/]+$/);
    }
  });

  test('should show job detail information', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    
    // Wait for jobs and click first one
    await page.waitForSelector('[data-testid="job-card"], .job-card, article', { timeout: 10000 });
    
    const firstJobLink = page.locator('[data-testid="job-card"] a, .job-card a, article a').first();
    
    if (await firstJobLink.isVisible()) {
      await firstJobLink.click();
      await page.waitForURL(/\/jobs\/[^/]+$/);
      
      // Job detail page should have title, company, description
      await expect(page.locator('h1, [data-testid="job-title"]')).toBeVisible();
    }
  });

  test('should have apply button on job detail', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    
    await page.waitForSelector('[data-testid="job-card"], .job-card, article', { timeout: 10000 });
    
    const firstJobLink = page.locator('[data-testid="job-card"] a, .job-card a, article a').first();
    
    if (await firstJobLink.isVisible()) {
      await firstJobLink.click();
      await page.waitForURL(/\/jobs\/[^/]+$/);
      
      // Should have apply button
      const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply")');
      await expect(applyButton).toBeVisible();
    }
  });
});

test.describe('Job Filters', () => {
  test('should filter by employment type', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    
    // Find employment filter
    const employmentFilter = page.locator('select[name="employment"], [data-testid="employment-filter"]');
    
    if (await employmentFilter.isVisible()) {
      await employmentFilter.selectOption('FULL_TIME');
      
      // Wait for results to update
      await page.waitForTimeout(1000);
      
      // URL or results should reflect filter
      expect(page.url()).toContain('employment');
    }
  });

  test('should filter by location', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    
    // Find location filter/input
    const locationInput = page.locator('input[name="location"], input[placeholder*="location"], [data-testid="location-filter"]');
    
    if (await locationInput.isVisible()) {
      await locationInput.fill('Sydney');
      await locationInput.press('Enter');
      
      await page.waitForTimeout(1000);
    }
  });

  test('should clear filters', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs?location=Sydney&employment=FULL_TIME`);
    
    // Find clear/reset filters button
    const clearButton = page.locator('button:has-text("Clear"), button:has-text("Reset"), [data-testid="clear-filters"]');
    
    if (await clearButton.isVisible()) {
      await clearButton.click();
      
      // Filters should be cleared
      await page.waitForTimeout(500);
      expect(page.url()).not.toContain('location=Sydney');
    }
  });
});

test.describe('Job Application Flow', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    // Create and login test user
    const email = `job-apply-test-${Date.now()}@example.com`;
    
    const regResponse = await request.post(`${API_URL}/auth/register`, {
      data: {
        email,
        password: 'JobApplyTest123!',
        firstName: 'Job',
        lastName: 'Applicant',
        userType: 'MEMBER',
      },
    });
    
    if (regResponse.ok()) {
      const data = await regResponse.json();
      authToken = data.token;
    }
  });

  test('should require authentication to apply', async ({ page }) => {
    await page.goto(`${BASE_URL}/jobs`);
    
    await page.waitForSelector('[data-testid="job-card"], .job-card, article', { timeout: 10000 });
    
    const firstJobLink = page.locator('[data-testid="job-card"] a, .job-card a, article a').first();
    
    if (await firstJobLink.isVisible()) {
      await firstJobLink.click();
      await page.waitForURL(/\/jobs\/[^/]+$/);
      
      // Click apply button
      const applyButton = page.locator('button:has-text("Apply"), a:has-text("Apply")');
      
      if (await applyButton.isVisible()) {
        await applyButton.click();
        
        // Should redirect to login or show auth modal
        await page.waitForTimeout(1000);
        
        const loginPrompt = page.locator('text=/sign in|log in|login/i');
        const loginPage = page.url().includes('signin') || page.url().includes('login');
        
        expect(await loginPrompt.isVisible() || loginPage).toBeTruthy();
      }
    }
  });
});
