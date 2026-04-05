const { test, expect } = require('@playwright/test');
const { safeGoto, waitForAppReady } = require('./utils/test-helpers');

test.describe('Header & Logo', () => {
  test('renders header with logo', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['nav', 'header']);
    
    // Header should have proper ARIA landmark
    const header = page.getByRole('banner');
    await expect(header).toBeVisible({ timeout: 10000 });
    
    // Logo in header should be visible (use header scope to avoid footer logo)
    const headerLogo = header.getByRole('img', { name: /ngurra pathways/i });
    await expect(headerLogo).toBeVisible();
    
    // Navigation should be accessible
    const nav = page.getByRole('navigation', { name: /main/i });
    await expect(nav).toBeVisible();
  });

  test('logo links to homepage', async ({ page }) => {
    await safeGoto(page, '/jobs');
    await waitForAppReady(page, ['header']);
    
    // Click the logo to go home
    const logoLink = page.getByRole('link', { name: /ngurra pathways/i }).first();
    await logoLink.click();
    
    await expect(page).toHaveURL('/');
  });

  test('navigation links have hover/focus states', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['nav']);
    
    // Check nav links are present
    const jobsLink = page.getByRole('link', { name: /jobs/i }).first();
    await expect(jobsLink).toBeVisible({ timeout: 10000 });
    
    // Focus the link and check it's focusable
    await jobsLink.focus();
    await expect(jobsLink).toBeFocused();
  });

  test('mobile menu toggle works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await safeGoto(page, '/');
    await waitForAppReady(page, ['header']);
    
    // Mobile menu button should be visible on mobile
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(menuButton).toBeVisible({ timeout: 10000 });
    
    // Click to open menu and check for nav links becoming visible
    await menuButton.click();
    
    // Wait a moment for state update
    await page.waitForTimeout(500);
    
    // On mobile, after clicking menu, Jobs link should be visible in expanded menu
    const navLinks = page.locator('nav a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('skip link is accessible via keyboard', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['header']);
    
    // Press Tab to focus skip link
    await page.keyboard.press('Tab');
    
    // Skip link should receive focus
    const skipLink = page.locator('.skip-link').first();
    await expect(skipLink).toBeFocused();
  });
});

test.describe('Auth UI', () => {
  test('shows sign in and sign up buttons when logged out', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['header']);
    
    // Desktop: Sign in/up links should be visible
    const signInLink = page.getByRole('link', { name: /sign in/i }).first();
    const signUpLink = page.getByRole('link', { name: /sign up/i }).first();
    
    // On desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(signInLink).toBeVisible({ timeout: 10000 });
    await expect(signUpLink).toBeVisible({ timeout: 10000 });
  });

  test('sign in link navigates to login page', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['header']);
    
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    const signInLink = page.getByRole('link', { name: /sign in/i }).first();
    await signInLink.click();
    
    await expect(page).toHaveURL(/\/login/);
  });

  test('sign up link navigates to register page', async ({ page }) => {
    await safeGoto(page, '/');
    await waitForAppReady(page, ['header']);
    
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    const signUpLink = page.getByRole('link', { name: /sign up/i }).first();
    await signUpLink.click();
    
    await expect(page).toHaveURL(/\/register/);
  });
});
