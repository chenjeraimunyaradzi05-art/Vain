/**
 * Test admin CTA summary endpoint.
 * Requires ADMIN_API_KEY env var for full verification, otherwise this test will log a message and exit.
 */

async function run() {
  const base = process.env.API_URL || 'http://localhost:3001';
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    console.log('ADMIN_API_KEY not set - skipping admin summary live test. Set ADMIN_API_KEY to run this test.');
    return;
  }

  // Login as a company to create some tracked events
  console.log('Logging in as company@example.com');
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${JSON.stringify(lj)}`);
  const token = lj.token;

  // Create a few CTA events
  const events = [
    { eventType: 'cta_click', metadata: { location: 'dashboard.upgrade_button', cta: 'upgrade' } },
    { eventType: 'cta_click', metadata: { location: 'subscription.pricing_card', tier: 'STARTER' } },
    { eventType: 'cta_click', metadata: { location: 'billing.manage_portal' } },
  ];

  for (const e of events) {
    const res = await fetch(`${base}/analytics/track`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(e) });
    if (!res.ok) {
      const b = await res.text();
      throw new Error(`Failed to post event: ${res.status} ${b}`);
    }
  }

  // Now fetch the admin summary
  const res2 = await fetch(`${base}/analytics/admin/cta-summary?days=7`, { headers: { 'x-admin-key': adminKey } });
  if (!res2.ok) {
    const b = await res2.text();
    throw new Error(`Admin summary failed: ${res2.status} ${b}`);
  }

  const json = await res2.json();
  console.log('Admin CTA summary:', JSON.stringify(json, null, 2));

  if (!json.total || json.total < events.length) {
    throw new Error('Unexpected CTA totals returned');
  }

  console.log('Admin CTA summary test passed');
}

run().catch((err) => {
  console.error('test failed', err);
  process.exit(1);
});