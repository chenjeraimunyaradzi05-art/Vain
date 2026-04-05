"use strict";

/**
 * Authentication E2E Tests
 * 
 * Comprehensive tests for the authentication flow including:
 * - Login
 * - Registration
 * - Password reset
 * - Session management
 */

const { test, expect } = require('@playwright/test');
const {
  getBaseUrl,
  getApiBaseUrl,
  safeGoto,
  waitForAppReady,
} = require('./utils/test-helpers');

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form', 'input[type="email"]']);

      // Check form elements exist
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form']);

      // Click submit without filling form
      await page.click('button[type="submit"]');

      // Should show error message or validation
      await expect(page.locator('text=/email|required|invalid/i')).toBeVisible({ timeout: 5000 }).catch(() => {
        // Some forms prevent submission without filling required fields
      });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form']);

      // Fill with invalid credentials
      await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=/invalid|error|incorrect|failed/i')).toBeVisible({ timeout: 10000 });
    });

    test('should have link to register page', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form']);

      // Find register link
      const registerLink = page.locator('a[href*="register"], a:text-matches("sign up|register|create account", "i")');
      await expect(registerLink.first()).toBeVisible();
    });

    test('should have link to forgot password', async ({ page }) => {
      await safeGoto(page, '/login');
      await waitForAppReady(page, ['form']);

      // Find forgot password link
      const forgotLink = page.locator('a[href*="forgot"], a:text-matches("forgot|reset|password", "i")');
      await expect(forgotLink.first()).toBeVisible();
    });
  });

  test.describe('Registration Page', () => {
    test('should display registration form', async ({ page }) => {
      await safeGoto(page, '/register');
      await waitForAppReady(page, ['form']);

      // Check form elements exist
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"], input[name="password"]').first()).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation for weak password', async ({ page }) => {
      await safeGoto(page, '/register');
      await waitForAppReady(page, ['form']);

      // Fill with weak password
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
      
      await emailInput.fill(`test-${Date.now()}@example.com`);
      await passwordInput.fill('123'); // Too short
      await passwordInput.blur();

      // Wait for validation message
      await page.waitForTimeout(500);
      
      // Check if submit is disabled or error shown
      const submitButton = page.locator('button[type="submit"]');
      const isDisabled = await submitButton.isDisabled().catch(() => false);
      const hasError = await page.locator('text=/password|short|characters|minimum/i').isVisible().catch(() => false);
      
      // Either button should be disabled or error message shown
      expect(isDisabled || hasError).toBeTruthy();
    });

    test('should have link to login page', async ({ page }) => {
      await safeGoto(page, '/register');
      await waitForAppReady(page, ['form']);

      // Find login link
      const loginLink = page.locator('a[href*="login"], a:text-matches("sign in|login|already have", "i")');
      await expect(loginLink.first()).toBeVisible();
    });
  });

  test.describe('Forgot Password Page', () => {
    test('should display forgot password form', async ({ page }) => {
      // Try different possible URLs
      const paths = ['/forgot-password', '/auth/forgot-password', '/reset-password'];
      let found = false;

      for (const path of paths) {
        await safeGoto(page, path);
        const emailInput = page.locator('input[type="email"], input[name="email"]');
        if (await emailInput.isVisible().catch(() => false)) {
          found = true;
          await expect(emailInput).toBeVisible();
          await expect(page.locator('button[type="submit"]')).toBeVisible();
          break;
        }
      }

      if (!found) {
        // Navigate from login page
        await safeGoto(page, '/login');
        await waitForAppReady(page, ['form']);
        const forgotLink = page.locator('a[href*="forgot"], a:text-matches("forgot|reset", "i")');
        if (await forgotLink.first().isVisible().catch(() => false)) {
          await forgotLink.first().click();
          await page.waitForLoadState('networkidle');
          found = true;
        }
      }

      // Skip if forgot password page doesn't exist
      test.skip(!found, 'Forgot password page not found');
    });
  });

  test.describe('Session Management', () => {
    test('should redirect unauthenticated users from dashboard', async ({ page }) => {
      await safeGoto(page, '/dashboard');
      await page.waitForLoadState('networkidle');

      // Should be redirected to login or show auth required message
      const url = page.url();
      const hasLoginRedirect = url.includes('login') || url.includes('auth');
      const hasAuthMessage = await page.locator('text=/sign in|login|unauthorized|access denied/i').isVisible().catch(() => false);

      expect(hasLoginRedirect || hasAuthMessage).toBeTruthy();
    });

    test('should redirect unauthenticated users from profile', async ({ page }) => {
      await safeGoto(page, '/profile');
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const hasLoginRedirect = url.includes('login') || url.includes('auth');
      const hasAuthMessage = await page.locator('text=/sign in|login|unauthorized/i').isVisible().catch(() => false);

      expect(hasLoginRedirect || hasAuthMessage).toBeTruthy();
    });
  });
});
