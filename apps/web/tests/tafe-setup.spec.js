const { test, expect } = require('@playwright/test');
test('TAFE setup form and AiConcierge integration', async ({ page, request }) => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    // Login as tafe user to obtain token
    const login = await request.post(`${apiBase}/auth/login`, { data: { email: 'tafe@example.com', password: 'password123' } });
    expect(login.ok()).toBeTruthy();
    const lj = await login.json();
    const token = lj.token;
    expect(token).toBeTruthy();
    // Set token in localStorage/cookies and open setup page
    await page.goto(webBase);
    await page.evaluate(([t]) => { localStorage.setItem('ngurra_token', t); document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; }, [token]);
    await page.goto(`${webBase}/tafe/setup`);
    await page.waitForSelector('text=TAFE / Institution Profile Setup', { timeout: 15000 });
    // Fill form fields
    await page.fill('label:has-text("Institution name") input', 'Playwright TAFE Test');
    await page.fill('label:has-text("Courses") input', 'Cert II Test; Cert III Test');
    // Click AiConcierge tips and assert suggestions appear
    // Simulate network failure for the first suggestions call then succeed on retry
    let callCount = 0;
    await page.route(`${apiBase}/ai/concierge`, async (route) => {
        if (route.request().method() !== 'POST')
            return route.continue();
        callCount++;
        if (callCount === 1) {
            await route.abort();
        }
        else {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ source: 'ai', suggestions: ['Retry success suggestion'] }) });
        }
    });
    // Trigger suggestions — client will first fail (and show actionable toast), then retry via the notification action
    await page.click('text=Get AiConcierge tips');
    await page.waitForSelector('text=Failed to fetch suggestions', { timeout: 5000 });
    // Now find the error toast that contains a Retry action
    const errToast = page.locator('[data-testid="ai-cooldown-toast"]').first();
    await errToast.waitFor({ timeout: 5000 });
    const errText = await errToast.innerText();
    expect(errText).toMatch(/Failed to fetch AI suggestions/);
    const actionBtn = errToast.locator('[data-testid="ai-cooldown-action"]');
    await expect(actionBtn).toHaveCount(1);
    // Click the Retry action which should cause the handler to re-run getSuggestions (our route will fulfill now)
    await actionBtn.click();
    // the suggestions list should appear after successful retry
    await page.waitForSelector('text=Suggestions from AiConcierge', { timeout: 5000 });
    await page.waitForSelector('text=AI-powered', { timeout: 5000 });
    // Save profile and assert saved message
    await page.click('text=Save profile');
    // visible success toast should appear and have success styling
    const toast = page.locator('[data-testid="ai-cooldown-toast"]').first();
    await toast.waitFor({ timeout: 5000 });
    const toastText = await toast.innerText();
    expect(toastText).toMatch(/TAFE profile saved|Saved/);
    const toastCls = await toast.getAttribute('class');
    expect(String(toastCls || '')).toContain('bg-green-500/15');
    const icon = toast.locator('[data-testid="ai-cooldown-toast-icon"]');
    await expect(icon).toHaveCount(1);
    const dismiss = toast.locator('button[aria-label="Dismiss"]');
    await expect(dismiss).toHaveCount(1);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    expect(await toast.count()).toBe(0);
});
