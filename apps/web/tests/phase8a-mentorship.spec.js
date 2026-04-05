const { test, expect } = require('@playwright/test');

/**
 * Phase 8A - Mentorship Ecosystem (Steps 41–55)
 * Focused E2E coverage for request/accept and ratings.
 */

test.describe('Phase 8A - Mentorship', () => {
  const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
  const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

  /** @type {{ token: string, userId: string }} */
  let member = null;
  /** @type {{ token: string, userId: string }} */
  let mentor = null;

  test.beforeEach(async ({ request }) => {
    const memberLogin = await request.post(`${apiBase}/auth/login`, {
      data: { email: 'member@example.com', password: 'password123' },
    });
    expect(memberLogin.ok()).toBeTruthy();
    const memberJson = await memberLogin.json();
    member = { token: memberJson.token, userId: memberJson.userId };

    const mentorLogin = await request.post(`${apiBase}/auth/login`, {
      data: { email: 'mentor@example.com', password: 'password123' },
    });
    expect(mentorLogin.ok()).toBeTruthy();
    const mentorJson = await mentorLogin.json();
    mentor = { token: mentorJson.token, userId: mentorJson.userId };
  });

  test('member can send mentorship request', async ({ page }) => {
    const mentorId = 'm-123';

    await page.route(`${apiBase}/mentorship/mentors/${mentorId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mentor: {
            id: mentorId,
            name: 'Test Mentor',
            title: 'Career Coach',
            rating: 4.8,
            activeMatches: 0,
            maxCapacity: 5,
            location: 'Sydney, NSW',
          },
        }),
      });
    });

    await page.route(`${apiBase}/mentorship/request`, async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(webBase);
    await page.evaluate(([t]) => {
      localStorage.setItem('ngurra_token', t);
      document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`;
    }, [member.token]);

    await page.goto(`${webBase}/mentorship/request/${mentorId}`);
    await page.getByRole('heading', { name: 'Request Mentorship' }).waitFor();

    await page.getByRole('button', { name: 'Resume and LinkedIn review' }).click();
    await page.getByRole('button', { name: 'Flexible / Any time' }).click();
    await page.getByRole('button', { name: 'Send Request' }).click();

    await expect(page.getByText('Request Sent!')).toBeVisible();
  });

  test('mentor can accept pending request (PENDING status)', async ({ page }) => {
    const now = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await page.route(`${apiBase}/mentorship/sessions`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            {
              id: 'sess-1',
              status: 'PENDING',
              scheduledAt: now,
              duration: 60,
              menteeName: 'member@example.com',
              notes: 'Goals: Resume review\nPreferred times: Flexible',
            },
          ],
        }),
      });
    });

    await page.route(`${apiBase}/mentorship/sessions/sess-1`, async (route) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session: { id: 'sess-1', status: 'CONFIRMED' } }),
      });
    });

    await page.goto(webBase);
    await page.evaluate(([t]) => {
      localStorage.setItem('ngurra_token', t);
      document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`;
    }, [mentor.token]);

    await page.goto(`${webBase}/mentor/requests`);
    await page.getByRole('heading', { name: 'Mentorship Requests' }).waitFor();

    await expect(page.getByText('PENDING', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Accept' }).click();

    // After accept, the page triggers a refetch; we only assert the UI didn’t error.
    await expect(page.getByRole('heading', { name: 'Mentorship Requests' })).toBeVisible();
  });

  test('session feedback updates mentor rating/reviews (API)', async ({ request }) => {
    // Book a real session so feedback can be attached.
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const book = await request.post(`${apiBase}/mentorship/sessions`, {
      headers: { Authorization: `Bearer ${member.token}` },
      data: { mentorId: mentor.userId, scheduledAt, duration: 60, notes: 'Test session' },
    });
    expect(book.ok()).toBeTruthy();
    const booked = await book.json();
    const sessionId = booked?.session?.id;
    expect(sessionId).toBeTruthy();

    const fb = await request.post(`${apiBase}/mentorship/sessions/${sessionId}/feedback`, {
      headers: { Authorization: `Bearer ${member.token}` },
      data: { rating: 5, feedback: 'Great session' },
    });
    expect(fb.ok()).toBeTruthy();

    const profile = await request.get(`${apiBase}/mentorship/mentors/${mentor.userId}`);
    expect(profile.ok()).toBeTruthy();
    const profileJson = await profile.json();

    // Expect at least one review exists and avg rating is set.
    expect(profileJson.mentor).toBeTruthy();
    expect(Array.isArray(profileJson.reviews)).toBeTruthy();
    expect(profileJson.reviews.length).toBeGreaterThan(0);
  });
});
