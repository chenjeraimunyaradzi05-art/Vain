const { test, expect } = require('@playwright/test');

test('admin CTA analytics page displays metrics', async ({ page, context }) => {
  const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  
  // Create a mock JWT with GOVERNMENT userType (header.payload.signature format)
  // Need exp claim for middleware validation (set to future date)
  const payload = { userId: 'admin', email: 'admin@example.com', userType: 'GOVERNMENT', exp: Math.floor(Date.now() / 1000) + 3600 };
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.mock-signature`;
  
  // Set cookie in the browser context BEFORE navigation (for Next.js middleware)
  // Must use domain instead of url when path is specified
  const url = new URL(webBase);
  await context.addCookies([{
    name: 'ngurra_token',
    value: mockJwt,
    domain: url.hostname,
    path: '/',
  }]);
  
  // Mock admin summary endpoint
  await page.route('**/analytics/admin/cta-summary**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ total: 5, byEventType: { cta_click: 5 }, byLocation: { 'dashboard.upgrade_button': 3, 'subscription.pricing_card': 2 }, timeseries: [{ date: '2025-12-20', count: 2 }, { date: '2025-12-21', count: 3 }] }) });
  });

  // Mock auth check to prevent redirect
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'admin',
        email: 'admin@example.com',
        userType: 'GOVERNMENT',
        name: 'Admin User'
      })
    });
  });

  // Also set in localStorage for client-side auth hook
  await page.goto(webBase);
  await page.evaluate((jwt) => {
    localStorage.setItem('ngurra_token', jwt);
  }, mockJwt);

  await page.goto(`${webBase}/admin/analytics/cta`);
  await page.waitForSelector('text=CTA Metrics', { timeout: 10000 });
  await expect(page.locator('text=Total CTA Events')).toBeVisible();
  // Use specific selector for the metric value to avoid matching "5" in dates/copyright
  await expect(page.locator('div.text-2xl.font-bold', { hasText: '5' })).toBeVisible();
  await expect(page.locator('text=dashboard.upgrade_button')).toBeVisible();

  // Expect a sparkline SVG to be present
  await expect(page.locator('svg[aria-label="CTA activity sparkline"]')).toBeVisible();

  // Mock the CSV export route to verify click triggers a request
  let exportCalled = false;
  await page.route('**/analytics/admin/cta-export**', async (route) => {
    exportCalled = true;
    await route.fulfill({ status: 200, contentType: 'text/csv', body: 'createdAt,eventType\n2025-12-20,cta_click' });
  });

  await page.click('text=Export CSV');
  await page.waitForTimeout(100);
  await expect(exportCalled).toBeTruthy();
});