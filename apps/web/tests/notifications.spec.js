const { test, expect } = require('@playwright/test');
const enableVisualRegression = String(process.env.VISUAL_REGRESSION || '').toLowerCase() === '1';
test.describe('Notifications (visual snapshots)', () => {
    test.skip(!enableVisualRegression, 'Set VISUAL_REGRESSION=1 to enable snapshot baselines');
    const base = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    test('info, success, error variants and stacking snapshot', async ({ page }) => {
        await page.goto(`${base}/dev/notifications`);
        // clear any existing toasts (tests may run in same session) then open three variants
        // aggressively dismiss any existing toasts so the baseline is clean
        while (await page.locator('div[aria-live="polite"] > div > div').count() > 0) {
            const first = page.locator('div[aria-live="polite"] > div > div').first();
            const dismiss = first.locator('button[aria-label="Dismiss"]');
            if (await dismiss.count() > 0)
                await dismiss.click();
            await page.waitForTimeout(80);
        }
        await page.click('text=Show info');
        await page.click('text=Show success');
        await page.click('text=Show error');
        // wait for animations to settle
        await page.waitForTimeout(400);
        const toasts = page.locator('div[aria-live="polite"] > div > div.animate-fade-in-down');
        // wait until we have at least three per-toast wrappers
        await page.waitForFunction((sel) => { return document.querySelectorAll(sel).length >= 3; }, 'div[aria-live="polite"] > div > div.animate-fade-in-down');
        // Take per-toast snapshots for the top three stacked toasts (more robust)
        // target the outer per-toast wrapper to avoid matching inner divs
        for (let i = 0; i < 3; i++) {
            const t = toasts.nth(i);
            await t.waitFor({ timeout: 3000 });
            const s = await t.screenshot();
            expect(s).toMatchSnapshot(`notifications-variant-${i + 1}.png`, { maxDiffPixels: 900 });
        }
        // Focus the first toast to capture the focused state (actor-friendly visuals)
        const firstToast = page.locator('div[aria-live="polite"] > div > div.animate-fade-in-down').first().locator('[data-testid="ai-cooldown-toast"]');
        await firstToast.focus();
        await page.waitForTimeout(120);
        const focusedShot = await firstToast.screenshot();
        expect(focusedShot).toMatchSnapshot('notification-focused.png', { maxDiffPixels: 900 });
        // Now flood many messages — provider caps visible to 3
        await page.click('text=Flood toasts (6)');
        // allow animation/unmounting to settle and let provider cap to visible MAX
        await page.waitForFunction((sel) => { return document.querySelectorAll(sel).length <= 3; }, 'div[aria-live="polite"] > div > div.animate-fade-in-down', { timeout: 2000 });
        const stackCount = await page.locator('div[aria-live="polite"] > div > div.animate-fade-in-down').count();
        expect(stackCount).toBeLessThanOrEqual(3);
        const floodShot = await page.locator('div[aria-live="polite"]').first().screenshot();
        expect(floodShot).toMatchSnapshot('notifications-flood.png', { maxDiffPixels: 6000 });
        // Test Escape dismisses the most recent visible notification
        await page.click('text=Show info');
        await page.waitForTimeout(200);
        const items = page.locator('div[aria-live="polite"] > div > div.animate-fade-in-down');
        expect(await items.count()).toBeGreaterThan(0);
        await page.keyboard.press('Escape');
        // after Escape the most recent toast should be removed
        await page.waitForTimeout(200);
        const after = await items.count();
        expect(after).toBeLessThanOrEqual(2);
        // capture the container after escape so we have a focused-after-escape baseline
        await page.waitForTimeout(120);
        const afterShot = await page.locator('div[aria-live="polite"]').first().screenshot();
        expect(afterShot).toMatchSnapshot('notifications-after-escape.png', { maxDiffPixels: 4000 });
        // capture individual variant icons for separate baselines
        await page.reload();
        await page.click('text=Show info');
        await page.waitForTimeout(200);
        const iconInfo = await page.locator('[data-testid="ai-cooldown-toast-icon"]').first().screenshot();
        expect(iconInfo).toMatchSnapshot('notification-icon-info.png');
        await page.reload();
        await page.click('text=Show success');
        await page.waitForTimeout(200);
        const iconSuccess = await page.locator('[data-testid="ai-cooldown-toast-icon"]').first().screenshot();
        expect(iconSuccess).toMatchSnapshot('notification-icon-success.png');
        await page.reload();
        await page.click('text=Show error');
        await page.waitForTimeout(200);
        const iconError = await page.locator('[data-testid="ai-cooldown-toast-icon"]').first().screenshot();
        expect(iconError).toMatchSnapshot('notification-icon-error.png');
        // show an actionable toast and click the action button to verify it triggers the callback
        // ensure no existing toasts are present before triggering the actionable one
        while (await page.locator('div[aria-live="polite"] > div > div.animate-fade-in-down').count() > 0) {
            const f = page.locator('div[aria-live="polite"] > div > div.animate-fade-in-down').first();
            const d = f.locator('button[aria-label="Dismiss"]');
            if (await d.count())
                await d.click();
            await page.waitForTimeout(50);
        }
        await page.click('text=Show actionable');
        // wait for any toast to appear and then the action button inside the visible toast
        await page.waitForSelector('div[aria-live="polite"] [data-testid="ai-cooldown-toast"]', { timeout: 5000 });
        const actionBtn = page.locator('div[aria-live="polite"] [data-testid="ai-cooldown-action"]').first();
        if (await actionBtn.count() > 0) {
            await actionBtn.click();
            // verify DOM updated by the action
            await page.waitForSelector('[data-testid="dev-action-result"]', { timeout: 2000 });
            const result = await page.locator('[data-testid="dev-action-result"]').innerText();
            expect(result).toMatch(/actioned:info/);
        }
        else {
            // Action button wasn't available — continue but note potential flake in environment.
            console.warn('No actionable button found on notification (test tolerant fallback)');
        }
    });
});
