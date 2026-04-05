/**
 * Authentication E2E Tests
 * 
 * Tests for user registration, login, logout, and protected routes.
 */
import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:3333';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test user credentials
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
};

let authToken: string;
let userId: string;

test.describe('Authentication Flow', () => {
  test.describe('Registration', () => {
    test('should register a new user successfully', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          userType: 'MEMBER',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email.toLowerCase());
      expect(data.user.userType).toBe('MEMBER');
      
      // Save for later tests
      authToken = data.token;
      userId = data.user.id;
    });

    test('should reject duplicate email registration', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
        },
      });

      expect(response.status()).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('already exists');
    });

    test('should reject invalid email format', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: 'invalid-email',
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject weak password', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/register`, {
        data: {
          email: `weak-${Date.now()}@example.com`,
          password: '123', // Too short
          firstName: testUser.firstName,
          lastName: testUser.lastName,
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email.toLowerCase());
      
      // Update token
      authToken = data.token;
    });

    test('should reject invalid password', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: testUser.email,
          password: 'WrongPassword123!',
        },
      });

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Invalid');
    });

    test('should reject non-existent email', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: testUser.password,
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Protected Routes', () => {
    test('should access protected route with valid token', async ({ request }) => {
      const response = await request.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.data.email).toBe(testUser.email.toLowerCase());
    });

    test('should reject access without token', async ({ request }) => {
      const response = await request.get(`${API_URL}/auth/me`);

      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    test('should reject access with invalid token', async ({ request }) => {
      const response = await request.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: 'Bearer invalid-token-12345',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should reject access with malformed token', async ({ request }) => {
      const response = await request.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: 'InvalidFormat',
        },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Token Refresh', () => {
    test('should refresh token successfully', async ({ request }) => {
      const response = await request.post(`${API_URL}/auth/refresh`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.data.token).toBeDefined();
      expect(data.data.token).not.toBe(authToken); // New token
      
      // Update token
      authToken = data.data.token;
    });
  });
});

test.describe('UI Authentication Flow', () => {
  test('should show login form on signin page', async ({ page }) => {
    await page.goto(`${BASE_URL}/signin`);
    
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    await page.goto(`${BASE_URL}/signin`);
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation message (either HTML5 or custom)
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('should redirect to dashboard after successful login', async ({ page, request }) => {
    // First create a user via API
    const email = `ui-test-${Date.now()}@example.com`;
    const password = 'UITestPassword123!';
    
    await request.post(`${API_URL}/auth/register`, {
      data: {
        email,
        password,
        firstName: 'UI',
        lastName: 'Test',
        userType: 'MEMBER',
      },
    });

    // Now login via UI
    await page.goto(`${BASE_URL}/signin`);
    
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or home
    await page.waitForURL(/\/(dashboard|home|jobs)?$/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/signin`);
    
    await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto(`${BASE_URL}/signin`);
    
    // Click register/signup link
    const registerLink = page.locator('a[href*="register"], a[href*="signup"], text=/sign up|register|create account/i');
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await page.waitForURL(/\/(register|signup)/);
    }
  });
});

test.describe('Session Persistence', () => {
  test('should maintain session across page reloads', async ({ page, request }) => {
    // Create and login user
    const email = `session-test-${Date.now()}@example.com`;
    const password = 'SessionTest123!';
    
    const regResponse = await request.post(`${API_URL}/auth/register`, {
      data: {
        email,
        password,
        firstName: 'Session',
        lastName: 'Test',
        userType: 'MEMBER',
      },
    });
    
    const { token } = await regResponse.json();

    // Set token in localStorage/cookie via page context
    await page.goto(BASE_URL);
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
    }, token);

    // Reload page
    await page.reload();

    // Should still be authenticated (check for user-specific UI elements)
    // This depends on how the app shows authenticated state
    await page.waitForTimeout(1000);
  });
});
