/**
 * Test /analytics/track endpoint
 */

async function run() {
  const base = process.env.API_URL || 'http://localhost:3001';

  console.log('Logging in as company@example.com');
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${JSON.stringify(lj)}`);
  const token = lj.token;

  const res = await fetch(`${base}/analytics/track`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ eventType: 'cta_click', metadata: { location: 'test.unit', cta: 'test_click' } }) });
  const j = await res.json();
  console.log('track response', res.status, j);
  if (!res.ok) throw new Error('track failed');

  console.log('Test passed');
}

run().catch((err) => {
  console.error('test failed', err);
  process.exit(1);
});