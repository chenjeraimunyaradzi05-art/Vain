const { test, expect } = require('@playwright/test');

/**
 * E2E Tests for Stripe Subscription Flow
 * 
 * Tests the subscription upgrade flow, tier display, and webhook handling.
 * Uses mock mode when Stripe is not configured.
 */
test.describe('Stripe Subscription Flow', () => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    let token = null;
    let userId = null;
    
    test.beforeEach(async ({ request }) => {
        // Login as company user
        const login = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'company@example.com', password: 'password123' } 
        });
        expect(login.ok()).toBeTruthy();
        const loginJson = await login.json();
        token = loginJson.token;
        userId = loginJson.userId;
        expect(token).toBeTruthy();
    });
    
    test('fetches current subscription via API', async ({ request }) => {
        const res = await request.get(`${apiBase}/subscriptions/v2/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        expect(json.subscription).toBeDefined();
        expect(json.subscription.tier).toBeDefined();
        expect(json.subscription.limits).toBeDefined();
    });
    
    test('fetches available subscription tiers', async ({ request }) => {
        const res = await request.get(`${apiBase}/subscriptions/v2/tiers`);
        
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        expect(json.tiers).toBeDefined();
        expect(Array.isArray(json.tiers)).toBeTruthy();
        
        // Should have at least FREE, STARTER, PROFESSIONAL, ENTERPRISE, RAP
        const tierNames = json.tiers.map(t => t.tier);
        expect(tierNames).toContain('FREE');
        expect(tierNames).toContain('STARTER');
        expect(tierNames).toContain('PROFESSIONAL');
        expect(tierNames).toContain('ENTERPRISE');
        expect(tierNames).toContain('RAP');
    });
    
    test('RAP tier has correct features and pricing', async ({ request }) => {
        const res = await request.get(`${apiBase}/subscriptions/v2/tiers`);
        const json = await res.json();
        
        const rapTier = json.tiers.find(t => t.tier === 'RAP');
        expect(rapTier).toBeDefined();
        expect(rapTier.name).toBe('RAP Compliance');
        expect(rapTier.price).toBeGreaterThanOrEqual(500000); // $5,000+
        expect(rapTier.limits.rapReporting).toBeTruthy();
        expect(rapTier.limits.apiAccess).toBeTruthy();
        expect(rapTier.isEnterprise).toBeTruthy();
    });
    
    test('subscription checkout returns redirect URL or mock response', async ({ request }) => {
        const res = await request.post(`${apiBase}/subscriptions/v2/checkout`, {
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: { tier: 'STARTER' },
        });
        
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        
        // Either we get a Stripe checkout URL or a mock mode message
        const hasCheckoutUrl = !!json.checkoutUrl;
        const hasMockMessage = json.message && json.message.includes('not configured');
        
        expect(hasCheckoutUrl || hasMockMessage).toBeTruthy();
    });
    
    test('billing page displays current plan and tiers', async ({ page }) => {
        // Set auth token
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/company/billing`);
        
        // Wait for page to load
        await page.waitForSelector('text=Billing', { timeout: 10000 });
        
        // Should show current plan section
        await expect(page.getByRole('heading', { name: 'Current Plan' })).toBeVisible();

        // Should show available plans
        await expect(page.getByRole('heading', { name: 'Available Plans' })).toBeVisible();
        // Should show tier cards (use heading role with exact: true to avoid matching other headings)
        await expect(page.getByRole('heading', { name: 'Starter' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Professional' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Enterprise', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'RAP Compliance', exact: true })).toBeVisible();
    });
    
    test('billing page shows success message after Stripe redirect', async ({ page }) => {
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        // Simulate return from Stripe with success
        await page.goto(`${webBase}/company/billing?success=true&tier=PROFESSIONAL`);
        
        // Should show success message
        await expect(page.locator('text=Successfully upgraded')).toBeVisible();
    });
    
    test('billing page shows canceled message after Stripe redirect', async ({ page }) => {
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        // Simulate return from Stripe with cancellation
        await page.goto(`${webBase}/company/billing?canceled=true`);
        
        // Should show canceled message
        await expect(page.locator('text=cancelled')).toBeVisible();
    });

    test('subscription page displays plans and tiers', async ({ page }) => {
        // Mock v2 endpoints BEFORE any navigation to ensure they're ready
        await page.route('**/subscriptions/v2/tiers', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tiers: [] }) });
        });
        await page.route('**/subscriptions/v2/me', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ subscription: { tier: 'FREE' } }) });
        });
        // Mock checkout endpoint
        await page.route('**/subscriptions/v2/checkout', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Stripe not configured - subscription updated directly' }) });
        });
        // Mock analytics
        await page.route('**/analytics/track', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tracked: true }) });
        });

        // Set auth token
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);

        await page.goto(`${webBase}/company/subscription`);

        // Wait for page to load
        await page.waitForSelector('text=Subscription Plans', { timeout: 10000 });

        // Should show plan heading and tier cards
        await expect(page.locator('text=Subscription Plans')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Starter' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Professional' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Enterprise', exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'RAP Partnership' })).toBeVisible();

        // Verify Upgrade buttons exist and are clickable
        await expect(page.getByRole('button', { name: 'Upgrade' }).first()).toBeVisible();
    });

    test('subscription page shows success message after Stripe redirect', async ({ page }) => {
        // This test verifies the same page flow as 'billing page shows success message'
        // but for the /company/subscription route instead of /company/billing
        
        // Set auth token first
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        // Mock v2 endpoints AFTER initial page load but BEFORE subscription navigation
        await page.route('**/subscriptions/v2/tiers', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tiers: [] }) });
        });
        await page.route('**/subscriptions/v2/me', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ subscription: { tier: 'PROFESSIONAL' } }) });
        });
        
        // Navigate directly to subscription page with success params
        await page.goto(`${webBase}/company/subscription?success=true&tier=PROFESSIONAL`);
        
        // Wait for page to load and process query params
        await page.waitForSelector('text=Subscription Plans', { timeout: 10000 });
        
        // Should show success message
        await expect(page.locator('text=Successfully upgraded')).toBeVisible({ timeout: 5000 });
    });
    
    test('webhook test endpoint simulates checkout completed', async ({ request }) => {
        // Use the test webhook endpoint (only available in non-production)
        const res = await request.post(`${apiBase}/webhooks/stripe/test`, {
            headers: { 'Content-Type': 'application/json' },
            data: {
                eventType: 'checkout.session.completed',
                data: {
                    customer: 'cus_test123',
                    subscription: 'sub_test123',
                    metadata: {
                        userId: userId,
                        tier: 'PROFESSIONAL',
                    },
                },
            },
        });
        
        // Should succeed (or 404 if in production mode)
        const status = res.status();
        expect(status === 200 || status === 404).toBeTruthy();
        
        if (status === 200) {
            const json = await res.json();
            expect(json.received).toBeTruthy();
        }
    });
    
    test('fetches invoices list', async ({ request }) => {
        const res = await request.get(`${apiBase}/subscriptions/v2/invoices`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        
        expect(res.ok()).toBeTruthy();
        const json = await res.json();
        expect(json.invoices).toBeDefined();
        expect(Array.isArray(json.invoices)).toBeTruthy();
    });
    
    test('tier limits are enforced correctly', async ({ request }) => {
        // Get current subscription
        const subRes = await request.get(`${apiBase}/subscriptions/v2/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        
        const subJson = await subRes.json();
        const { tier, limits, activeJobs, canPostMore } = subJson.subscription;
        
        // Verify limits structure
        expect(limits).toHaveProperty('maxJobs');
        expect(limits).toHaveProperty('analytics');
        expect(limits).toHaveProperty('apiAccess');
        
        // Verify canPostMore logic
        if (limits.maxJobs === -1) {
            // Unlimited
            expect(canPostMore).toBeTruthy();
        } else {
            expect(canPostMore).toBe(activeJobs < limits.maxJobs);
        }
    });
});
