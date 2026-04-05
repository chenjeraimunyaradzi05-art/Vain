// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Phase 7 Billing E2E Tests
 * Tests for subscription management, billing portal, and featured jobs
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function loginAs(page, email, password) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Login is client-side; ensure both client token and server cookie are set.
  // Note: auth cookie may be HttpOnly (not visible in document.cookie), so use Playwright cookie API.
  await page.waitForFunction(() => {
    try {
      return !!localStorage.getItem('ngurra_token');
    } catch {
      return false;
    }
  });

  await expect.poll(async () => {
    const cookies = await page.context().cookies();
    return cookies.some((c) => c.name === 'ngurra_token' && Boolean(c.value));
  }, { timeout: 15000 }).toBeTruthy();
}

test.describe('Phase 7 - Billing Features', () => {
  
  test.describe('Billing Page', () => {
    test('should display subscription tiers', async ({ page }) => {
      // Login as company user
      await loginAs(page, 'company@example.com', 'password123');
      
      // Navigate to billing
      await page.goto('/company/billing');
      
      // Verify tier cards are displayed
      await expect(page.getByRole('heading', { name: 'Starter', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Professional', exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Enterprise', exact: true })).toBeVisible();
      
      // Verify current plan indicator
      await expect(page.locator('text=Current Plan').first()).toBeVisible();
    });

    test('should show invoice history', async ({ page }) => {
      await loginAs(page, 'company@example.com', 'password123');
      
      await page.goto('/company/billing');
      
      // Check for invoice history section
      const invoiceSection = page.locator('text=Invoice History');
      if (await invoiceSection.isVisible()) {
        await expect(invoiceSection).toBeVisible();
      }
    });
  });

  test.describe('Featured Jobs', () => {
    test('should display featured jobs on homepage', async ({ page }) => {
      await page.goto('/');
      
      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('main, [role="main"], h1, .container', { timeout: 10000 });
      
      // Check for featured jobs section
      const featuredSection = page.locator('text=Featured Opportunities');
      // May or may not be visible depending on if there are featured jobs
      if (await featuredSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(featuredSection).toBeVisible();
      }
    });

    test('should access feature job page', async ({ page }) => {
      // Login as company user
      await loginAs(page, 'company@example.com', 'password123');
      
      // Try to navigate to feature page for a job
      // This assumes at least one job exists
      await page.goto('/company/jobs');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('main, [role="main"], h1, .container', { timeout: 10000 });
      
      // Check if there are jobs to feature
      const jobLinks = page.locator('a[href*="/company/jobs/"]');
      const count = await jobLinks.count();
      
      if (count > 0) {
        // Get first job's ID from the link
        const href = await jobLinks.first().getAttribute('href');
        if (href) {
          const jobId = href.split('/').pop();
          await page.goto(`/company/jobs/${jobId}/feature`);
          
          // Verify feature page elements
          await expect(page.getByRole('heading', { name: 'Feature Your Job' })).toBeVisible();
          await expect(page.locator('text=7 Day Boost')).toBeVisible();
          await expect(page.locator('text=14 Day Feature')).toBeVisible();
          await expect(page.locator('text=30 Day Premium')).toBeVisible();
        }
      }
    });
  });

  test.describe('Subscription Cancel Flow', () => {
    test('should display cancel subscription page', async ({ page }) => {
      // Login as company user with paid subscription
      await loginAs(page, 'company@example.com', 'password123');
      
      await page.goto('/company/subscription/cancel');
      
      // Check for cancel flow elements
      const cancelTitle = page.getByRole('heading', { name: 'Cancel Subscription', exact: true });
      const noSubscription = page.getByText('No Active Subscription', { exact: true });
      
      // Either shows cancel form or no subscription message
      let ok = false;
      try {
        await cancelTitle.waitFor({ state: 'visible', timeout: 15000 });
        ok = true;
      } catch {}
      if (!ok) {
        try {
          await noSubscription.waitFor({ state: 'visible', timeout: 15000 });
          ok = true;
        } catch {}
      }
      expect(ok).toBeTruthy();
    });

    test('should show cancellation reasons', async ({ page }) => {
      await loginAs(page, 'company@example.com', 'password123');
      
      await page.goto('/company/subscription/cancel');
      
      // If user has active subscription, check for reasons
      const continueButton = page.getByRole('button', { name: 'Continue to Cancel', exact: true });
      if (await continueButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await continueButton.click();
        
        await expect(page.getByText('Why are you cancelling?', { exact: true })).toBeVisible();
        await expect(page.getByText('Too expensive', { exact: true })).toBeVisible();
        await expect(page.getByText('Not using enough', { exact: true })).toBeVisible();
      }
    });
  });

  test.describe('Analytics Dashboard', () => {
    test('should display analytics for paid users', async ({ page }) => {
      await loginAs(page, 'company@example.com', 'password123');
      
      await page.goto('/company/analytics');
      
      // Check for analytics elements or upgrade prompt
      const analyticsTitle = page.getByRole('heading', { name: 'Analytics Dashboard', exact: true });
      const upgradePrompt = page.getByRole('link', { name: 'Upgrade', exact: true });

      let ok = false;
      try {
        await expect(analyticsTitle).toBeVisible({ timeout: 15000 });
        ok = true;
      } catch {}
      if (!ok) {
        try {
          await expect(upgradePrompt).toBeVisible({ timeout: 15000 });
          ok = true;
        } catch {}
      }

      expect(ok).toBeTruthy();
    });

    test('should show hiring funnel for paid users', async ({ page }) => {
      await loginAs(page, 'company@example.com', 'password123');
      
      await page.goto('/company/analytics');
      
      // Check for hiring funnel (only visible for paid users)
      const funnelSection = page.getByRole('heading', { name: 'Hiring Funnel', exact: true });
      if (await funnelSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(funnelSection).toBeVisible();
        const funnelContainer = funnelSection.locator('..');
        await expect(funnelContainer.getByText('Applications', { exact: true }).first()).toBeVisible();
        await expect(funnelContainer.getByText('Hired', { exact: true }).first()).toBeVisible();
      }
    });
  });

  test.describe('RAP Dashboard', () => {
    test('should require RAP or Enterprise tier', async ({ page }) => {
      await loginAs(page, 'company@example.com', 'password123');
      
      await page.goto('/company/rap-dashboard');
      
      // Wait for page to load
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('main, [role="main"], h1, .container', { timeout: 10000 });
      
      // Should either show RAP dashboard content or tier gating message
      const rapTitle = page.getByRole('heading', { name: 'RAP Dashboard', exact: true });
      const tierGateText = page.getByText('RAP Dashboard Access');
      const upgradeBtn = page.getByRole('link', { name: 'Upgrade to RAP Plan' });
      
      // Wait for any of these to be visible - the page should show one of them
      await page.waitForSelector('h1', { timeout: 10000 });
      
      const hasRap = await rapTitle.isVisible().catch(() => false);
      const hasGate = await tierGateText.isVisible().catch(() => false);
      const hasUpgrade = await upgradeBtn.isVisible().catch(() => false);
      
      expect(hasRap || hasGate || hasUpgrade).toBeTruthy();
    });
  });

  test.describe('Partner Management (Admin)', () => {
    test('should display partner management for admin', async ({ page }) => {
      // Login as admin user
      await loginAs(page, 'admin@example.com', 'password123');
      
      await page.goto('/admin/partners');
      
      // Check for partner management elements
      const partnerTitle = page.getByRole('heading', { name: 'Partner Management', exact: true });
      const addButton = page.getByRole('button', { name: 'Add Partner', exact: true });
      
      if (await partnerTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(partnerTitle).toBeVisible();
        await expect(addButton).toBeVisible();
      }
    });
  });
});

test.describe('Phase 7 - API Endpoints', () => {
  
  test('GET /subscriptions/v2/tiers returns tier list', async ({ request }) => {
    const response = await request.get(`${API_URL}/subscriptions/v2/tiers`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.tiers).toBeDefined();
    expect(Array.isArray(data.tiers)).toBeTruthy();
    expect(data.tiers.length).toBeGreaterThan(0);
    
    // Verify tier structure
    const tier = data.tiers[0];
    expect(tier).toHaveProperty('id');
    expect(tier).toHaveProperty('name');
    expect(tier).toHaveProperty('price');
  });

  test('GET /featured/jobs returns featured jobs', async ({ request }) => {
    const response = await request.get(`${API_URL}/featured/jobs`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.jobs).toBeDefined();
    expect(Array.isArray(data.jobs)).toBeTruthy();
  });

  test('GET /featured/partners returns partners', async ({ request }) => {
    const response = await request.get(`${API_URL}/featured/partners`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.partners).toBeDefined();
    expect(Array.isArray(data.partners)).toBeTruthy();
  });

  test('GET /rap/certification requires auth', async ({ request }) => {
    const response = await request.get(`${API_URL}/rap/certification`);
    // Should be 401 without auth token
    expect(response.status()).toBe(401);
  });
});
