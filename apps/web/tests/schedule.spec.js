"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('company schedule flow and resume preview', async ({ page, request }) => {
    // Login via API to get token for company
    const apiBase = process.env.API_URL || 'http://127.0.0.1:3001';
    const webBase = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
    const login = await request.post(`${apiBase}/auth/login`, { data: { email: 'company@example.com', password: 'password123' } });
    (0, test_1.expect)(login.ok()).toBeTruthy();
    const loginJson = await login.json();
    const token = loginJson.token;
    (0, test_1.expect)(token).toBeTruthy();
    // set token in localStorage and cookie then navigate
    await page.goto(webBase);
    await page.evaluate(([t]) => { localStorage.setItem('ngurra_token', t); document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; }, [token]);
    await page.goto(`${webBase}/company/jobs`);
    // fetch job details so we can assert headers in the captured email
    const jobsResp = await request.get(`${apiBase}/company/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const jobsJson = await jobsResp.json();
    const jobTitle = (jobsJson?.jobs && jobsJson.jobs[0] && jobsJson.jobs[0].title) ? jobsJson.jobs[0].title : 'Interview';
    // Click first Applicants link
    await page.waitForSelector('text=Applicants');
    await page.click('text=Applicants');
    // On applicants page, wait for preview and schedule buttons
    await page.waitForSelector('text=Preview resume');
    // Click Preview on first applicant
    const previewButtons = await page.$$('text=Preview resume');
    await previewButtons[0].click();
    // modal with iframe open
    await page.waitForSelector('iframe');
    // close preview
    await page.click('text=Close');
    // schedule interview: open modal
    // clear any captured SES messages before scheduling
    await request.post(`${apiBase}/__test/ses-clear`);
    const scheduleButtons = await page.$$('text=Schedule interview');
    await scheduleButtons[0].click();
    // Ensure the schedule modal is open before interacting with its fields/buttons
    const scheduleModal = page.locator('div.fixed.inset-0').filter({ hasText: 'Schedule interview' }).first();
    await scheduleModal.waitFor({ timeout: 5000 });
    // fill date/time and location
    const dt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const isoLocal = dt.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', isoLocal);
    await page.fill('input[placeholder="Location (or video link)"]', 'Zoom https://zoom.us/demo');
    await scheduleModal.getByRole('button', { name: 'Schedule' }).click();
    // after scheduling, the scheduled time should appear on the applicant card
    const interviewLabel = page.locator('text=/Interview:/').first();
    await (0, test_1.expect)(interviewLabel).toBeVisible({ timeout: 15000 });
    const interviewText = await interviewLabel.innerText();
    (0, test_1.expect)(interviewText).toContain('Interview:');
    // Open messages modal and post a message
    await page.click('text=Messages');
    await page.waitForSelector('textarea');
    await page.fill('textarea', 'Hello candidate — please confirm availability');
    // Dismiss any cookie banners that might intercept clicks
    const cookieBanner = page.locator('.fixed.bottom-0');
    if (await cookieBanner.count() > 0) {
        const acceptBtn = cookieBanner.locator('button', { hasText: /accept|got it|ok/i });
        if (await acceptBtn.count() > 0) {
            await acceptBtn.first().click({ timeout: 2000 }).catch(() => {});
        }
    }
    await page.click('text=Send', { force: true });
    await page.waitForSelector('text=Hello candidate — please confirm availability');
    const msg = await page.locator('text=Hello candidate — please confirm availability').first().innerText();
    (0, test_1.expect)(msg).toContain('Hello candidate');
    // Now verify member can see the scheduled interview and message
    const memberLogin = await request.post(`${apiBase}/auth/login`, { data: { email: 'member@example.com', password: 'password123' } });
    (0, test_1.expect)(memberLogin.ok()).toBeTruthy();
    const mJson = await memberLogin.json();
    const mToken = mJson.token;
    (0, test_1.expect)(mToken).toBeTruthy();
    // new page context to simulate member
    await page.goto(webBase);
    await page.evaluate(([t]) => { localStorage.setItem('ngurra_token', t); document.cookie = `ngurra_token=${t}; path=/; max-age=${7 * 24 * 60 * 60}`; }, [mToken]);
    await page.goto(`${webBase}/member/applications`);
    await page.waitForSelector('text=Your Applications');
    // open first application messages modal (button text is "Messages")
    await page.click('button:has-text("Messages")');
    await page.waitForSelector('text=Hello candidate — please confirm availability');
    await (0, test_1.expect)(page.locator('text=/Interview:/').first()).toBeVisible({ timeout: 15000 });
    const memberMsg = await page.locator('text=Hello candidate — please confirm availability').first().innerText();
    (0, test_1.expect)(memberMsg).toContain('Hello candidate');
    // verify server captured a Raw SES message containing the ICS
    const cap = await request.get(`${apiBase}/__test/ses-captured`);
    (0, test_1.expect)(cap.ok()).toBeTruthy();
    const capJson = await cap.json();
    (0, test_1.expect)(capJson.messages && capJson.messages.length > 0).toBeTruthy();
    const rawB64 = capJson.messages[0].RawMessage.Data;
    const rawStr = Buffer.from(rawB64, 'base64').toString('utf8');
    // Strict checks for MailComposer-generated MIME and ICS content
    (0, test_1.expect)(rawStr).toContain('BEGIN:VCALENDAR');
    (0, test_1.expect)(rawStr).toContain('DTSTART:');
    (0, test_1.expect)(rawStr).toContain('DTSTAMP:');
    // Ensure the ICS SUMMARY matches the server-created summary: "Interview: <jobTitle>"
    (0, test_1.expect)(rawStr).toContain(`SUMMARY:Interview: ${jobTitle}`);
    // Subject header should be present (server currently uses a generic subject)
    (0, test_1.expect)(rawStr).toMatch(/Subject:\s*Interview scheduled/i);
    (0, test_1.expect)(rawStr.toLowerCase()).toContain('content-disposition: attachment');
    (0, test_1.expect)(rawStr.toLowerCase()).toContain('interview.ics');
});
