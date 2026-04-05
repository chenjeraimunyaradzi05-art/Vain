const { test, expect } = require('@playwright/test');

async function safeGoto(page, urlOrPath) {
    const attempts = 2;
    let lastErr;

    for (let i = 0; i < attempts; i++) {
        try {
            await page.goto(urlOrPath, { waitUntil: 'commit', timeout: 60000 });
            return;
        } catch (err) {
            lastErr = err;
            await page.waitForTimeout(1000);
        }
    }

    throw lastErr;
}

async function setAuthToken(page, token) {
    await page.evaluate(
        ([t]) => {
            try {
                localStorage.setItem('ngurra_token', t);
            } catch {
                // ignore
            }

            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`;
        },
        [token]
    );
}

async function loginViaApi(request, apiBase, email, password) {
    const login = await request.post(`${apiBase}/auth/login`, {
        data: { email, password },
    });
    expect(login.ok()).toBeTruthy();

    const loginJson = await login.json();
    const token = loginJson.token;
    const userId = loginJson.userId || loginJson.user?.id;

    expect(token).toBeTruthy();
    expect(userId).toBeTruthy();

    return { token, userId };
}

async function primeRateLimit(request, apiBase, token, userId) {
    let got429 = false;

    for (let i = 0; i < 8; i++) {
        const r = await request.post(`${apiBase}/ai/concierge`, {
            data: { userId, context: 'e2e rate limit prime' },
            headers: { Authorization: `Bearer ${token}` },
        });

        if (r.status() === 429) got429 = true;
        await new Promise((res) => setTimeout(res, 20));
    }

    expect(got429).toBeTruthy();
}

test.describe('AI throttle cooldown UI', () => {
    test.setTimeout(180000);

    test('Mentor dashboard shows cooldown after rate-limit', async ({ page, request }) => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';

    const { token, userId } = await loginViaApi(request, apiBase, 'mentor@example.com', 'password123');
    await primeRateLimit(request, apiBase, token, userId);

    await safeGoto(page, '/');
    await setAuthToken(page, token);

    await safeGoto(page, '/mentor/dashboard');

    await expect(page.getByText(/you are making requests too quickly/i)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/cooling down/i).first()).toBeVisible({ timeout: 60000 });

    const pb = page.getByRole('progressbar', { name: /ai cooldown progress/i }).first();
    if ((await pb.count()) > 0) {
        await expect(pb).toHaveAttribute('aria-valuemin', '0');
        await expect(pb).toHaveAttribute('aria-valuemax', '100');
    }

    const indicator = page.locator('[data-testid="ai-cooldown-indicator"]').first();
    if ((await indicator.count()) > 0) {
        const cls = await indicator.getAttribute('class');
        expect(String(cls || '')).toContain('animate-pulse');
    }
    });

    test('TAFE setup shows cooldown after rate-limit', async ({ page, request }) => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';

    const { token, userId } = await loginViaApi(request, apiBase, 'tafe@example.com', 'password123');
    await primeRateLimit(request, apiBase, token, userId);

    await safeGoto(page, '/');
    await setAuthToken(page, token);

    await safeGoto(page, '/tafe/setup');

    await page.getByText(/get aiconcierge tips/i).click({ timeout: 15000 });

    await expect(page.getByText(/you are making requests too quickly/i)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(/cooling down/i).first()).toBeVisible({ timeout: 60000 });

    const button = page.getByRole('button', { name: /aiconcierge tips|cooldown/i }).first();
    if ((await button.count()) > 0) {
        await expect(button).toBeDisabled();
    }
    });
});
