"use strict";

const { test, expect } = require('@playwright/test');

test('Phase I: interview prep coach returns questions and optional feedback', async ({ request }) => {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

  const loginRes = await request.post(`${apiBase}/auth/login`, {
    data: { email: 'member@example.com', password: 'password123' },
  });
  expect(loginRes.ok()).toBeTruthy();
  const login = await loginRes.json();
  expect(login.token).toBeTruthy();

  const prepRes = await request.post(`${apiBase}/ai/interview-prep`, {
    headers: { Authorization: `Bearer ${login.token}` },
    data: {
      userId: login.user?.id,
      jobTitle: 'Trainee Civil Construction',
      jobDescription: 'We value safety, teamwork, reliability, and willingness to learn. Experience on tools is helpful but not required.',
      question: 'Tell us about a time you worked safely under pressure.',
      answer: 'On a community project I followed the site induction, checked hazards, and communicated with my team before starting. We finished the job safely and on time.',
    },
  });

  expect([200, 429]).toContain(prepRes.status());
  if (prepRes.status() === 429) {
    return;
  }

  const body = await prepRes.json();
  expect(body.ok).toBeTruthy();
  expect(body.result).toBeTruthy();
  expect(Array.isArray(body.result.questions)).toBeTruthy();
  expect(body.result.questions.length).toBeGreaterThan(0);
  expect(typeof body.result.disclaimer).toBe('string');

  // When an answer is provided, feedback should generally be present.
  // We keep this tolerant in case provider returns null.
  if (body.result.feedback !== null) {
    expect(typeof body.result.feedback).toBe('string');
  }
  expect(Array.isArray(body.result.suggestedImprovements)).toBeTruthy();
});
