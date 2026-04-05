/**
 * Tests for subscription-based feature gating
 */

async function run() {
  const base = process.env.API_URL || 'http://localhost:3001';

  // Login as company
  console.log('Logging in as company@example.com');
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${JSON.stringify(lj)}`);
  const token = lj.token;
  const userId = lj.userId;
  console.log('Got token, userId:', !!token, userId);

  // Ensure on FREE tier
  console.log('Setting subscription to FREE');
  const up = await fetch(`${base}/subscriptions/v2/upgrade`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ tier: 'FREE' }) });
  const uj = await up.json();
  if (!up.ok) throw new Error(`upgrade failed: ${JSON.stringify(uj)}`);
  console.log('Subscription set to FREE');

  // Test analytics access should be forbidden
  console.log('Fetching employer analytics (should be 403)');
  const analyticsRes = await fetch(`${base}/analytics/employer/overview`, { headers: { Authorization: `Bearer ${token}` } });
  console.log('Analytics status', analyticsRes.status);
  if (analyticsRes.status !== 403) {
    const body = await analyticsRes.text();
    throw new Error(`Expected 403 for analytics access when FREE, got ${analyticsRes.status} - ${body}`);
  }
  console.log('Analytics gating works (403)');

  // Test job posting limit (FREE allows 1 active job)
  console.log('Clearing existing jobs and creating up to limit');
  const listRes = await fetch(`${base}/company/jobs`, { headers: { Authorization: `Bearer ${token}` } });
  const listJson = await listRes.json();
  for (const j of (listJson.jobs || [])) {
    await fetch(`${base}/company/jobs/${j.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
  }

  // Create first job - should succeed
  const jobPayload = { title: 'Test Job 1', description: 'A job to test limits' };
  const create1 = await fetch(`${base}/company/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(jobPayload) });
  if (!create1.ok) {
    const b = await create1.text();
    throw new Error(`First job creation failed: ${create1.status} ${b}`);
  }
  console.log('First job created');

  // Create second job - should fail with 403
  const create2 = await fetch(`${base}/company/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: 'Test Job 2', description: 'Second job' }) });
  console.log('Second job status', create2.status);
  if (create2.status !== 403) {
    const b = await create2.text();
    throw new Error(`Expected 403 when exceeding job limit, got ${create2.status} - ${b}`);
  }
  console.log('Job limit enforced (403)');

  console.log('Test passed');
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('test failed', err);
  process.exit(1);
});