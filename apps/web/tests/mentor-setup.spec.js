const { test, expect } = require('@playwright/test');
test('Mentor setup save shows success notification', async ({ page, request }) => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    // Login as mentor user
    const login = await request.post(`${apiBase}/auth/login`, { data: { email: 'mentor@example.com', password: 'password123' } });
    expect(login.ok()).toBeTruthy();
    const lj = await login.json();
    const token = lj.token;
    expect(token).toBeTruthy();
    await page.goto(webBase);
    await page.evaluate(([t]) => { localStorage.setItem('ngurra_token', t); document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; }, [token]);
    await page.goto(`${webBase}/mentor/setup`);
    await page.waitForSelector('text=Mentor profile setup');
    await page.fill('label:has-text("Expertise") input', 'Testing X');
    await page.fill('label:has-text("Short bio") textarea', 'Playwright mentor save test');
    // Save profile and assert saved message
    // Prepare suggestions route to fail the first time then succeed on retry
    let callCount = 0;
    await page.route(`${apiBase}/ai/concierge`, async (route) => {
        if (route.request().method() !== 'POST')
            return route.continue();
        callCount++;
        if (callCount === 1) {
            await route.abort();
        }
        else {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ source: 'ai', suggestions: ['Mentor retry suggestion'] }) });
        }
    });
    await page.click('text=Save profile');
    // success toast should appear (the inline msg may be cleared immediately by the follow-up suggestions fetch)
    const toast = page.locator('[data-testid="ai-cooldown-toast"]').filter({ hasText: 'Mentor profile saved' }).first();
    await toast.waitFor({ timeout: 5000 });
    const toastText = await toast.innerText();
    expect(toastText).toMatch(/Mentor profile saved/i);
    const toastCls = await toast.getAttribute('class');
    expect(String(toastCls || '')).toContain('bg-green-500/15');
    const icon = toast.locator('[data-testid="ai-cooldown-toast-icon"]');
    await expect(icon).toHaveCount(1);
    const dismiss = toast.locator('button[aria-label="Dismiss"]');
    await expect(dismiss).toHaveCount(1);
    await dismiss.click();
    await page.waitForTimeout(200);
    expect(await toast.count()).toBe(0);
    // After save the component triggers getSuggestions which will first abort -> show actionable error toast
    await page.waitForSelector('text=Failed to fetch suggestions', { timeout: 5000 });
    const errToast = page.locator('[data-testid="ai-cooldown-toast"]').filter({ hasText: 'Failed to fetch AI suggestions' }).first();
    await errToast.waitFor({ timeout: 5000 });
    const errText = await errToast.innerText();
    expect(errText).toMatch(/Failed to fetch AI suggestions/);
    const actionBtn = errToast.locator('[data-testid="ai-cooldown-action"]');
    await expect(actionBtn).toHaveCount(1);
    await actionBtn.click();
    // On retry the suggestions list should render
    await page.waitForSelector('text=Suggestions from AiConcierge', { timeout: 5000 });
});
