const { test, expect } = require('@playwright/test');
test('TAFE dashboard fetches AiConcierge suggestions on load', async ({ page, request }) => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    // Login as tafe user
    const login = await request.post(`${apiBase}/auth/login`, { data: { email: 'tafe@example.com', password: 'password123' } });
    expect(login.ok()).toBeTruthy();
    const loginJson = await login.json();
    const token = loginJson.token;
    expect(token).toBeTruthy();

    // Make the dashboard deterministic: fulfill the concierge call with known suggestions.
    await page.route(`${apiBase}/ai/concierge`, async (route) => {
        if (route.request().method() !== 'POST')
            return route.continue();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ source: 'prototype', suggestions: ['Deterministic TAFE suggestion'] }),
        });
    });

    await page.goto(webBase);
    await page.evaluate(([t]) => { localStorage.setItem('ngurra_token', t); document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; }, [token]);
    await page.goto(`${webBase}/tafe/dashboard`);

    // Expect AI suggestions to show up
    await page.waitForSelector('text=AI concierge suggestions', { timeout: 15000 });
    await page.waitForSelector('text=AI-powered', { timeout: 5000 });
    const suggestions = await page.locator('text=AI concierge suggestions').first().innerText();
    expect(suggestions).toContain('AI concierge suggestions');
});
