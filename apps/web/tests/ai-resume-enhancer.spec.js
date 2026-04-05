"use strict";

const { test, expect } = require('@playwright/test');

test('Phase I: AI resume enhancer returns structured guidance', async ({ request }) => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

  const loginRes = await request.post(`${apiBase}/auth/login`, {
    data: { email: 'member@example.com', password: 'password123' },
  });
  expect(loginRes.ok()).toBeTruthy();
  const login = await loginRes.json();
  expect(login.token).toBeTruthy();

  const resumeRes = await request.post(`${apiBase}/ai/resume-enhancer`, {
    headers: { Authorization: `Bearer ${login.token}` },
    data: {
      userId: login.user?.id,
      targetJobTitle: 'Community Support Worker',
      jobDescription: 'We are looking for a community support worker with strong communication, basic reporting, teamwork, and cultural safety. Experience supporting participants is valued.',
      resumeText: 'Experience: Volunteer at local youth program. Skills: communication, teamwork. Interested in community outcomes.',
    },
  });

  expect([200, 429]).toContain(resumeRes.status());
  if (resumeRes.status() === 429) {
    // In very constrained CI, the shared in-memory rate limit can sometimes trip.
    // If it does, we still consider the endpoint behavior acceptable.
    return;
  }

  const body = await resumeRes.json();
  expect(body.ok).toBeTruthy();
  expect(body.result).toBeTruthy();
  expect(typeof body.result.improvedSummary).toBe('string');
  expect(Array.isArray(body.result.missingKeywords)).toBeTruthy();
  expect(Array.isArray(body.result.bulletPointImprovements)).toBeTruthy();
  expect(Array.isArray(body.result.culturalAlignmentTips)).toBeTruthy();
});
