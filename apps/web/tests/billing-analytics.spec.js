const { test, expect } = require('@playwright/test');

/**
 * E2E Tests for Billing Portal functionality
 */
test.describe('Billing Portal', () => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    let token = null;
    
    test.beforeEach(async ({ request }) => {
        // Login as company user
        const login = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'company@example.com', password: 'password123' } 
        });
        expect(login.ok()).toBeTruthy();
        const loginJson = await login.json();
        token = loginJson.token;
        expect(token).toBeTruthy();
    });
    
    test('displays current plan information', async ({ page }) => {
        // Mock subscription endpoint
        await page.route(`${apiBase}/subscriptions`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    subscription: {
                        tier: 'STARTER',
                        status: 'active',
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        usage: { jobPosts: 3, featuredJobs: 0, candidateViews: 25 },
                    },
                    invoices: [],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/company/billing`);
        
        // Check for plan display
        await page.waitForSelector('text=Current Plan', { timeout: 10000 });
        await page.waitForSelector('text=Starter', { timeout: 5000 });
    });

    test('dashboard shows upgrade CTA for analytics when not enabled', async ({ page }) => {
        // Mock subscription as FREE (no analytics)
        await page.route('**/subscriptions/v2/me', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ subscription: { tier: 'FREE', limits: { analytics: false } } }) });
        });
        // Mock subscription tiers endpoint
        await page.route('**/subscriptions/v2/tiers', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tiers: [] }) });
        });
        // Mock analytics to avoid errors
        await page.route('**/analytics/track', async (route) => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tracked: true }) });
        });

        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);

        await page.goto(`${webBase}/company/dashboard`);

        // Should show Analytics upgrade CTA
        await page.waitForSelector('text=Upgrade for analytics', { timeout: 10000 });
        
        // Verify the CTA is visible and is a link to subscription page
        const ctaLink = page.locator('a:has-text("Upgrade for analytics")');
        await expect(ctaLink).toBeVisible();
        await expect(ctaLink).toHaveAttribute('href', '/company/subscription');
    });
    
    test('shows tier comparison cards', async ({ page }) => {
        await page.route(`${apiBase}/subscriptions`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ subscription: null, invoices: [] }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/company/billing`);
        
        // Check for tier cards
        await page.waitForSelector('text=Professional', { timeout: 10000 });
        await page.waitForSelector('text=Enterprise', { timeout: 5000 });
        await page.waitForSelector('text=Most Popular', { timeout: 5000 });
    });
    
    test('displays invoice history when available', async ({ page }) => {
        // Mock all v2 endpoints that the billing page calls
        await page.route(`${apiBase}/subscriptions/v2/me`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    subscription: {
                        tier: 'PROFESSIONAL',
                        status: 'active',
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                }),
            });
        });
        
        await page.route(`${apiBase}/subscriptions/v2/tiers`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ tiers: [] }),
            });
        });
        
        await page.route(`${apiBase}/subscriptions/v2/invoices`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ invoices: [] }),
            });
        });
        
        // Provide invoices in the stripe-invoices endpoint (this is what the page prefers)
        await page.route(`${apiBase}/subscriptions/v2/stripe-invoices`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ invoices: [
                    { id: 'inv_1', paidAt: new Date().toISOString(), amount: 249, currency: 'aud', status: 'paid', hostedUrl: 'https://stripe.com/invoice/1', pdfUrl: 'https://stripe.com/invoice/1.pdf' },
                    { id: 'inv_2', paidAt: new Date(Date.now() - 30*24*60*60*1000).toISOString(), amount: 249, currency: 'aud', status: 'paid', hostedUrl: 'https://stripe.com/invoice/2', pdfUrl: 'https://stripe.com/invoice/2.pdf' },
                ] }),
            });
        });

        // Legacy endpoint fallback with invoices
        await page.route(`${apiBase}/subscriptions`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    subscription: {
                        tier: 'PROFESSIONAL',
                        status: 'active',
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    invoices: [
                        { id: 'inv_1', created: Date.now() / 1000, description: 'Professional Plan', amount_paid: 24900, status: 'paid', hosted_invoice_url: 'https://stripe.com/invoice/1' },
                        { id: 'inv_2', created: (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000, description: 'Professional Plan', amount_paid: 24900, status: 'paid', hosted_invoice_url: 'https://stripe.com/invoice/2' },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/company/billing`);
        
        // Check for invoice table
        await page.waitForSelector('text=Invoice History', { timeout: 10000 });
        await page.waitForSelector('text=$249.00', { timeout: 5000 });
    });
});

/**
 * E2E Tests for Analytics Dashboard
 */
test.describe('Analytics Dashboard', () => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    let token = null;
    
    test.beforeEach(async ({ request }) => {
        const login = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'company@example.com', password: 'password123' } 
        });
        expect(login.ok()).toBeTruthy();
        const loginJson = await login.json();
        token = loginJson.token;
    });
    
    test('displays key metrics', async ({ page }) => {
        await page.route(`${apiBase}/analytics/employer/dashboard*`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    totalViews: 1250,
                    totalApplications: 45,
                    totalInterviews: 12,
                    totalHires: 3,
                    viewsChange: 15,
                    applicationsChange: 8,
                    indigenousHires: 2,
                    indigenousHireRate: 66.7,
                    rapProgress: 45,
                }),
            });
        });

        // Mock company CTA export endpoint
        let exportCalled = false;
        await page.route(`${apiBase}/analytics/company/cta-export**`, async (route) => {
            exportCalled = true;
            await route.fulfill({ status: 200, contentType: 'text/csv', body: 'createdAt,eventType\n2025-12-20,cta_click' });
        });
        
        await page.route(`${apiBase}/analytics/employer/jobs`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ jobs: [] }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/company/analytics`);
        
        // Check for metrics
        await page.waitForSelector('text=Analytics Dashboard', { timeout: 10000 });
        await page.waitForSelector('text=1,250', { timeout: 5000 }); // Total views
        await page.waitForSelector('text=45', { timeout: 5000 }); // Applications
    });
    
    test('shows Indigenous employment impact section', async ({ page }) => {
        await page.route(`${apiBase}/analytics/employer/dashboard*`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    totalViews: 500,
                    totalApplications: 20,
                    totalInterviews: 5,
                    totalHires: 2,
                    indigenousHires: 2,
                    indigenousHireRate: 100,
                    rapProgress: 80,
                }),
            });
        });
        
        await page.route(`${apiBase}/analytics/employer/jobs`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ jobs: [] }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/company/analytics`);
        
        // Check for Indigenous impact section
        await page.waitForSelector('text=Indigenous Employment Impact', { timeout: 10000 });
        await page.waitForSelector('text=Indigenous Candidates Hired', { timeout: 5000 });
        await page.waitForSelector('text=RAP Target Progress', { timeout: 5000 });
    });
    
    test('displays job performance table', async ({ page }) => {
        await page.route(`${apiBase}/analytics/employer/dashboard*`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ totalViews: 100, totalApplications: 10 }),
            });
        });
        
        await page.route(`${apiBase}/analytics/employer/jobs`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    jobs: [
                        { id: '1', title: 'Construction Laborer', location: 'Sydney', views: 250, applications: 15, applyRate: 6, status: 'active' },
                        { id: '2', title: 'Office Administrator', location: 'Brisbane', views: 180, applications: 8, applyRate: 4.4, status: 'active' },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/company/analytics`);
        
        // Check for job table
        await page.waitForSelector('text=Job Performance', { timeout: 10000 });
        await page.waitForSelector('text=Construction Laborer', { timeout: 5000 });
        await page.waitForSelector('text=Office Administrator', { timeout: 5000 });
    });
});

/**
 * E2E Tests for Forums functionality
 */
test.describe('Community Forums', () => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    let token = null;
    
    test.beforeEach(async ({ request }) => {
        const login = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'member@example.com', password: 'password123' } 
        });
        expect(login.ok()).toBeTruthy();
        const loginJson = await login.json();
        token = loginJson.token;
    });
    
    test('displays forum categories', async ({ page }) => {
        await page.route(`${apiBase}/forums/categories`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    categories: [
                        { id: '1', name: 'General Discussion', slug: 'general', description: 'Open discussions', threadCount: 25 },
                        { id: '2', name: 'Job Seeking Tips', slug: 'job-tips', description: 'Job hunting strategies', threadCount: 18 },
                        { id: '3', name: 'Mentorship', slug: 'mentorship', description: 'Connect with mentors', threadCount: 12 },
                    ],
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/community/forums`);
        
        await page.waitForSelector('text=General Discussion', { timeout: 10000 });
        await page.waitForSelector('text=Job Seeking Tips', { timeout: 5000 });
        await page.waitForSelector('text=Mentorship', { timeout: 5000 });
    });
});

/**
 * E2E Tests for Skills Gap Analysis
 */
test.describe('Skills Gap Analysis', () => {
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    let token = null;
    
    test.beforeEach(async ({ request }) => {
        const login = await request.post(`${apiBase}/auth/login`, { 
            data: { email: 'member@example.com', password: 'password123' } 
        });
        expect(login.ok()).toBeTruthy();
        const loginJson = await login.json();
        token = loginJson.token;
    });
    
    test('shows skills gap for job', async ({ page }) => {
        await page.route(`${apiBase}/skills/gap-analysis/*`, async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    matchedSkills: [
                        { id: '1', name: 'Communication', level: 3 },
                        { id: '2', name: 'Teamwork', level: 2 },
                    ],
                    missingSkills: [
                        { id: '3', name: 'White Card', required: true },
                        { id: '4', name: 'Forklift License', required: false },
                    ],
                    matchPercentage: 60,
                }),
            });
        });
        
        await page.goto(webBase);
        await page.evaluate(([t]) => { 
            localStorage.setItem('ngurra_token', t); 
            document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; 
        }, [token]);
        
        await page.goto(`${webBase}/jobs/test-job/skills-gap`);
        
        // Check for skills gap analysis
        await page.waitForSelector('text=Communication', { timeout: 10000 });
        await page.waitForSelector('text=White Card', { timeout: 5000 });
    });
});
