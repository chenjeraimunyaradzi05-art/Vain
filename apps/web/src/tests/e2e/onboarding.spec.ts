import { test, expect } from '@playwright/test';

test.describe('Onboarding Purpose Wizard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/onboarding/purpose');
    
    // Set a mock token in localStorage
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-auth-token');
    });
  });

  test('should display welcome screen', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome to Vantage');
    await expect(page.locator('text=Step 1 of 4')).toBeVisible();
    await expect(page.locator('text=Why are you here today?')).toBeVisible();
    
    // Should show 4 purpose options
    await expect(page.locator('text=Find Work')).toBeVisible();
    await expect(page.locator('text=Learn Skills')).toBeVisible();
    await expect(page.locator('text=Get Guidance')).toBeVisible();
    await expect(page.locator('text=Connect & Support')).toBeVisible();
  });

  test('should navigate through wizard steps', async ({ page }) => {
    // Step 1: Welcome
    await expect(page.locator('h1')).toContainText('Welcome to Vantage');
    
    // Click "Get Started" or select a purpose
    await page.click('text=Find Work');
    
    // Step 2: Primary selection
    await expect(page.locator('h1')).toContainText("What's your main goal?");
    await expect(page.locator('text=Step 2 of 4')).toBeVisible();
    
    // Select primary purpose (already selected)
    await page.click('text=Next');
    
    // Step 3: Secondary selection
    await expect(page.locator('h1')).toContainText('Any other interests?');
    await expect(page.locator('text=Step 3 of 4')).toBeVisible();
    
    // Skip secondary selection
    await page.click('text=Skip secondary selection');
    await page.click('text=Next');
    
    // Step 4: Confirm
    await expect(page.locator('h1')).toContainText('Confirm your choices');
    await expect(page.locator('text=Step 4 of 4')).toBeVisible();
    await expect(page.locator('text=Primary Focus')).toBeVisible();
    await expect(page.locator('text=Find Work')).toBeVisible();
  });

  test('should allow secondary purpose selection', async ({ page }) => {
    // Navigate to secondary step
    await page.click('text=Find Work');
    await page.click('text=Next');
    
    // Select secondary purpose
    await page.click('text=Learn Skills');
    await expect(page.locator('text=Learn Skills')).toHaveClass(/border-blue-500/);
    
    // Should show in confirmation
    await page.click('text=Next');
    await expect(page.locator('text=Secondary Interest')).toBeVisible();
    await expect(page.locator('text=Learn Skills')).toBeVisible();
  });

  test('should complete onboarding successfully', async ({ page }) => {
    // Mock successful API response
    await page.route('/api/v1/onboarding/purpose', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'purpose-123',
            primary: 'work',
            secondary: 'learning',
            completedAt: new Date().toISOString()
          }
        })
      });
    });

    // Complete wizard
    await page.click('text=Find Work');
    await page.click('text=Next');
    await page.click('text=Learn Skills');
    await page.click('text=Next');
    await page.click('text=Complete Setup');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/v1/onboarding/purpose', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Failed to save your purpose'
        })
      });
    });

    // Complete wizard and submit
    await page.click('text=Find Work');
    await page.click('text=Next');
    await page.click('text=Next');
    await page.click('text=Complete Setup');
    
    // Should show error message
    await expect(page.locator('text=Failed to save your purpose')).toBeVisible();
  });

  test('should validate primary purpose selection', async ({ page }) => {
    // Navigate to confirm step without selecting primary
    await page.click('text=Get Started');
    
    // Try to proceed without selection
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeDisabled();
  });

  test('should redirect to signup if not authenticated', async ({ page }) => {
    // Clear token to simulate unauthenticated state
    await page.evaluate(() => {
      localStorage.removeItem('token');
    });
    
    // Reload page
    await page.reload();
    
    // Should redirect to signup
    await expect(page).toHaveURL('/signup');
  });
});

test.describe('Dashboard Guard', () => {
  test('should redirect to onboarding if no purpose exists', async ({ page }) => {
    // Mock authentication without purpose
    await page.goto('/member/dashboard');
    
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-auth-token');
    });
    
    // Mock API response indicating no purpose
    await page.route('/api/v1/me/purpose', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasPurpose: false,
          data: null
        })
      });
    });
    
    // Should show complete setup message
    await expect(page.locator('text=Complete Your Setup')).toBeVisible();
    await expect(page.locator('text=Please complete the quick onboarding wizard')).toBeVisible();
    
    // Click complete setup button
    await page.click('text=Complete Setup');
    
    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding/purpose');
  });

  test('should allow access if purpose exists', async ({ page }) => {
    // Mock authentication with purpose
    await page.goto('/member/dashboard');
    
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-auth-token');
    });
    
    // Mock API response indicating purpose exists
    await page.route('/api/v1/me/purpose', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasPurpose: true,
          data: {
            primary: 'work',
            secondary: 'learning'
          }
        })
      });
    });
    
    // Should load dashboard content (not redirected)
    await expect(page.locator('text=Complete Your Setup')).not.toBeVisible();
    await expect(page.locator('h1')).toContainText('Dashboard'); // Assuming dashboard has h1
  });
});
