const { test, expect } = require('@playwright/test');

function makeJwt(payload) {
  const base64Payload = Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${base64Payload}.mock-signature`;
}

async function setAuth(page, context, webBase, jwt) {
  const url = new URL(webBase);
  await context.addCookies([
    {
      name: 'ngurra_token',
      value: jwt,
      domain: url.hostname,
      path: '/',
    },
  ]);

  await page.goto(webBase);
  await page.evaluate((t) => {
    localStorage.setItem('ngurra_token', t);
  }, jwt);
}

test('Phase 9A: impact dashboard renders and export triggers', async ({ page, context }) => {
  const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

  const jwt = makeJwt({ userId: 'admin-1', email: 'admin@example.com', userType: 'GOVERNMENT', exp: Math.floor(Date.now() / 1000) + 3600 });
  await setAuth(page, context, webBase, jwt);

  await page.route('**/reporting/metrics?**', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        period: 'month',
        metrics: {
          members: { total: 12, label: 'Registered Members' },
          employers: { total: 3, label: 'Partner Employers' },
          jobs: { total: 5, label: 'Jobs Posted' },
          applications: { total: 20, label: 'Applications Submitted' },
          placements: { total: 2, rate: 10.0, label: 'Successful Placements' },
          retention: { total: 1, label: 'Retention Milestones' },
          training: { total: 4, label: 'Training Completions' },
          mentoring: { total: 6, label: 'Mentoring Sessions' },
        },
      }),
    });
  });

  await page.route('**/reporting/metrics/history?**', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ metrics: [{ id: 'm-1', metric: 'PLACEMENTS', value: 2, period: 'MONTHLY' }] }),
    });
  });

  await page.route('**/analytics/admin/cohorts', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        membersByMobNation: { 'Yolngu': 4, 'Noongar': 2 },
        companiesByIndustry: { Mining: 2, Hospitality: 1 },
        companiesByState: { QLD: 2, WA: 1 },
        totals: { memberProfiles: 6, companyProfiles: 3 },
      }),
    });
  });

  let exported = false;
  await page.route('**/reporting/export?**', async (route) => {
    if (!route.request().url().startsWith(apiBase)) return route.fallback();
    exported = true;
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="impact-metrics.csv"',
      },
      body: 'Metric,Period,Value,Recorded At,Metadata\nPLACEMENTS,MONTHLY,2,,\n',
    });
  });

  await page.goto(`${webBase}/admin/analytics/impact`);
  await page.waitForSelector('text=Impact Dashboard', { timeout: 10000 });

  await expect(page.getByText('Registered Members')).toBeVisible();
  // Use more specific selector to avoid matching "12 jobs" text
  await expect(page.locator('.text-2xl.font-bold', { hasText: '12' }).first()).toBeVisible();
  await expect(page.getByText('Recorded Impact Metrics')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'PLACEMENTS' })).toBeVisible();

  await page.getByRole('button', { name: 'Export CSV' }).click();
  await page.waitForTimeout(100);
  await expect(exported).toBeTruthy();
});
