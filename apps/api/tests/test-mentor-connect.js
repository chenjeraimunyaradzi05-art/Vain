/**
 * Test mentor Stripe connect endpoints.
 * Run while API is running locally (npm run dev) and migrations + seed applied.
 */

async function run() {
  const base = process.env.API_URL || 'http://localhost:3001';
  console.log('Logging in as mentor@example.com');
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mentor@example.com', password: 'password123' }),
  });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${JSON.stringify(lj)}`);
  const token = lj.token;
  console.log('Got token:', !!token);

  // Try to create connected account
  const create = await fetch(`${base}/mentor/connect`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  const cj = await create.json();
  console.log('POST /mentor/connect status', create.status, 'body', cj);

  // If Stripe not configured, should return 400 error
  if (create.status === 400) {
    console.log('Stripe not configured locally - expected for local dev.');
    return;
  }

  if (!create.ok) throw new Error(`create connect failed: ${JSON.stringify(cj)}`);

  const link = await fetch(`${base}/mentor/connect/link`, { headers: { Authorization: `Bearer ${token}` } });
  const ljk = await link.json();
  console.log('GET /mentor/connect/link status', link.status, 'body', ljk);

  if (!link.ok) throw new Error('Failed to get onboarding link');

  console.log('Mentor connect test completed. Onboarding URL:', ljk.url);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('test failed', err);
  process.exit(1);
});