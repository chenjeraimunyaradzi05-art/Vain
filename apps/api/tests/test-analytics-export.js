/**
 * Test admin CTA export endpoint.
 * Requires ADMIN_API_KEY env var for full verification, otherwise skipped.
 */

async function run() {
  const base = process.env.API_URL || 'http://localhost:3001';
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    console.log('ADMIN_API_KEY not set - skipping admin export test. Set ADMIN_API_KEY to run this test.');
    return;
  }

  // Call export
  const res = await fetch(`${base}/analytics/admin/cta-export?days=7`, { headers: { 'x-admin-key': adminKey } });
  if (!res.ok) {
    const b = await res.text();
    throw new Error(`Export failed: ${res.status} ${b}`);
  }

  const text = await res.text();
  console.log('CSV length:', text.length);
  if (!text.includes('createdAt,eventType')) throw new Error('Unexpected CSV contents');

  console.log('Export test passed');
}

run().catch((err) => {
  console.error('test failed', err);
  process.exit(1);
});