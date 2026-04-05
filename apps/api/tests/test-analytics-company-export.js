/**
 * Test company CTA export endpoint.
 */

async function run() {
  const base = process.env.API_URL || 'http://localhost:3001';

  // Login as company
  console.log('Logging in as company@example.com');
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
  const lj = await login.json();
  if (!login.ok) throw new Error(`login failed: ${JSON.stringify(lj)}`);
  const token = lj.token;

  // Post a sample CTA event for this company
  const post = await fetch(`${base}/analytics/track`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ eventType: 'cta_click', metadata: { location: 'company.test', cta: 'export_test' } }) });
  if (!post.ok) {
    const b = await post.text();
    throw new Error(`Failed to post event: ${post.status} ${b}`);
  }

  // Now download the company CSV up to the limit (5/day default)
  const MAX = Number(process.env.MAX_CSV_EXPORTS_PER_DAY || 5);
  let successCount = 0;
  for (let i = 0; i < MAX + 1; i++) {
    const res = await fetch(`${base}/analytics/company/cta-export?days=7`, { headers: { Authorization: `Bearer ${token}` } });
    if (i < MAX) {
      if (!res.ok) {
        const b = await res.text();
        throw new Error(`Company export failed (iteration ${i}): ${res.status} ${b}`);
      }
      successCount++;
    } else {
      // expected to be rate limited
      if (res.status !== 429) {
        const b = await res.text();
        throw new Error(`Expected 429 on export exceeding limit but got ${res.status} - ${b}`);
      }
      const json = await res.json();
      if (!json || json.error !== 'Export limit reached for today') throw new Error('Unexpected rate limit response');
    }
  }

  if (successCount !== MAX) throw new Error('Did not get expected number of successful exports');

  // Fetch audit logs via test harness to confirm audit entries
  const logsRes = await fetch(`${base}/__test/audit-logs?companyId=${encodeURIComponent(company.id)}`);
  if (!logsRes.ok) {
    const b = await logsRes.text();
    throw new Error(`Failed to fetch audit logs: ${logsRes.status} ${b}`);
  }
  const logsJson = await logsRes.json();
  const recentExports = logsJson.logs.filter(l => l.action === 'company_export_cta_csv');
  if (recentExports.length < MAX) throw new Error('Expected audit logs for exports not found');

  console.log('Company export test passed');
}

run().catch((err) => {
  console.error('test failed', err);
  process.exit(1);
});