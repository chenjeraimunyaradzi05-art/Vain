const { test, expect } = require("@playwright/test");

/**
 * Phase 8B (Training Pathways) - E2E smoke coverage
 * Covers: course catalog -> course detail -> enroll; member skills; member badges.
 */

test.describe('Phase 8B - Training Pathways', () => {
  const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
  const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

  let memberToken = null;

  test.beforeEach(async ({ request, page }) => {
    const login = await request.post(`${apiBase}/auth/login`, {
      data: { email: 'member@example.com', password: 'password123' },
    });
    expect(login.ok()).toBeTruthy();
    const loginJson = await login.json();
    memberToken = loginJson.token;
    expect(memberToken).toBeTruthy();

    await page.goto(webBase);
    await page.evaluate(
      ([t]) => {
        localStorage.setItem('ngurra_token', t);
        document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`;
      },
      [memberToken]
    );
  });

  test('member can browse courses and open course detail', async ({ page }) => {
    // Deterministic catalog
    await page.route(`${apiBase}/courses/external/search**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          courses: [
            {
              id: '3',
              title: 'White Card Training',
              provider: 'SafeWork Australia',
              providerType: 'rto',
              category: 'health',
              duration: '1 day',
              format: 'In-person',
              price: 9900,
              isFree: false,
              description: 'General construction induction for working safely on construction sites.',
              rating: 4.8,
              enrollments: 15000,
              culturallyRelevant: false,
            },
          ],
        }),
      });
    });

    // Deterministic detail
    await page.route(`${apiBase}/courses/3`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          course: {
            id: '3',
            title: 'White Card Training',
            provider: 'SafeWork Australia',
            category: 'health',
            duration: '1 day',
            format: 'In-person',
            price: 9900,
            isFree: false,
            description: 'General construction induction for working safely on construction sites.',
          },
        }),
      });
    });

    await page.goto(`${webBase}/courses`);
    await page.waitForSelector('text=Training Courses', { timeout: 15000 });
    await page.waitForSelector('text=White Card Training', { timeout: 10000 });

    await page.click('text=White Card Training');
    await page.waitForURL('**/courses/3', { timeout: 15000 });
    await page.waitForSelector('text=About this course', { timeout: 15000 });
    await page.waitForSelector('text=Enrol now', { timeout: 15000 });
  });

  test('member can enroll in a course (internal enrol endpoint)', async ({ page }) => {
    await page.route(`${apiBase}/courses/3`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          course: {
            id: '3',
            title: 'White Card Training',
            provider: 'SafeWork Australia',
            category: 'health',
            duration: '1 day',
            format: 'In-person',
            price: 9900,
            isFree: false,
            description: 'General construction induction for working safely on construction sites.',
          },
        }),
      });
    });

    await page.route(`${apiBase}/courses/3/enrol`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(`${webBase}/courses/3/enroll`);
    await page.waitForSelector('text=Enroll in course', { timeout: 15000 });

    await page.click('text=Confirm enrollment');
    await page.waitForSelector('text=Successfully enrolled in course.', { timeout: 10000 });
    await page.waitForSelector('text=view your training', { timeout: 5000 });
  });

  test('member can view Skills and Badges pages', async ({ page }) => {
    await page.route(`${apiBase}/skills/user/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ skills: [] }),
      });
    });

    await page.route(`${apiBase}/skills/recommendations`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ trending: [], upgradable: [] }),
      });
    });

    await page.route(`${apiBase}/courses/recommendations?limit=5`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ courses: [] }),
      });
    });

    await page.goto(`${webBase}/member/skills`);
    await page.waitForSelector('text=Skills', { timeout: 15000 });
    await page.waitForSelector('text=Add a skill', { timeout: 5000 });

    await page.route(`${apiBase}/badges/user/me`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          badges: [
            {
              id: 'ub1',
              createdAt: '2025-01-01T00:00:00.000Z',
              shareUrl: 'https://example.com/verify/ub1',
              badge: {
                name: 'Course Completion',
                description: 'Completed a training course',
                issuerName: 'Ngurra Pathways',
              },
            },
          ],
        }),
      });
    });

    await page.goto(`${webBase}/member/badges`);
    await page.waitForSelector('text=Your Badges', { timeout: 15000 });
    await page.waitForSelector('text=Course Completion', { timeout: 5000 });
  });

  test('member can open job skills gap analysis', async ({ page }) => {
    await page.route(`${apiBase}/jobs/123`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job: {
            id: '123',
            title: 'Construction Laborer',
            description: '<p>Work on site.</p>',
          },
        }),
      });
    });

    await page.route(`${apiBase}/skills/gap-analysis/123`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          jobId: '123',
          matchScore: 60,
          matchedSkills: [
            { skill: { id: 's1', name: 'Teamwork' }, userLevel: 'intermediate', required: true },
          ],
          missingSkills: [
            { skill: { id: 's2', name: 'White Card' }, required: true, minLevel: 'beginner' },
          ],
          underqualifiedSkills: [],
          recommendedCourses: [
            { id: '3', title: 'White Card Training', duration: '1 day', qualification: 'Short Course', skillsCovered: ['White Card'] },
          ],
        }),
      });
    });

    await page.goto(`${webBase}/jobs/123/skills-gap`);
    await page.waitForSelector('text=Skills Gap Analysis', { timeout: 15000 });
    await page.waitForSelector('text=60%', { timeout: 5000 });
    await page.waitForSelector('text=White Card', { timeout: 5000 });
    await page.waitForSelector('text=White Card Training', { timeout: 5000 });
  });
});
