/**
 * Mentorship E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Mentorship Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to mentorship section
    await page.goto('/mentorship');
  });

  test.describe('Browse Mentors', () => {
    test('should display list of available mentors', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Mentorship');
      await expect(page.locator('[data-testid="mentor-card"]')).toHaveCount.greaterThan(0);
    });

    test('should show mentor details', async ({ page }) => {
      const mentorCard = page.locator('[data-testid="mentor-card"]').first();
      await expect(mentorCard.locator('[data-testid="mentor-name"]')).toBeVisible();
      await expect(mentorCard.locator('[data-testid="mentor-title"]')).toBeVisible();
      await expect(mentorCard.locator('[data-testid="mentor-rating"]')).toBeVisible();
    });

    test('should filter mentors by skill', async ({ page }) => {
      // Open filter
      await page.click('[data-testid="filter-button"]');
      
      // Select a skill
      await page.click('[data-testid="skill-filter-javascript"]');
      
      // Apply filter
      await page.click('[data-testid="apply-filters"]');
      
      // Verify results
      await page.waitForLoadState('networkidle');
      const mentorCards = page.locator('[data-testid="mentor-card"]');
      const count = await mentorCards.count();
      
      // Each mentor should have the selected skill
      for (let i = 0; i < count; i++) {
        const skills = mentorCards.nth(i).locator('[data-testid="mentor-skills"]');
        await expect(skills).toContainText(/javascript/i);
      }
    });

    test('should filter mentors by industry', async ({ page }) => {
      await page.selectOption('[data-testid="industry-filter"]', 'technology');
      await page.waitForLoadState('networkidle');
      
      await expect(page.locator('[data-testid="mentor-card"]')).toHaveCount.greaterThan(0);
    });

    test('should search mentors by name', async ({ page }) => {
      await page.fill('[data-testid="mentor-search"]', 'John');
      await page.keyboard.press('Enter');
      
      await page.waitForLoadState('networkidle');
      
      const mentorCards = page.locator('[data-testid="mentor-card"]');
      if (await mentorCards.count() > 0) {
        await expect(mentorCards.first().locator('[data-testid="mentor-name"]')).toContainText(/john/i);
      }
    });
  });

  test.describe('Mentor Profile', () => {
    test('should display detailed mentor profile', async ({ page }) => {
      // Click on first mentor
      await page.click('[data-testid="mentor-card"]:first-child');
      
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="mentor-bio"]')).toBeVisible();
      await expect(page.locator('[data-testid="mentor-experience"]')).toBeVisible();
      await expect(page.locator('[data-testid="mentor-availability"]')).toBeVisible();
    });

    test('should show mentor reviews', async ({ page }) => {
      await page.click('[data-testid="mentor-card"]:first-child');
      
      const reviewsSection = page.locator('[data-testid="mentor-reviews"]');
      await expect(reviewsSection).toBeVisible();
      
      // Check for review elements
      await expect(page.locator('[data-testid="review-item"]')).toHaveCount.greaterThanOrEqual(0);
    });

  });

});

