/**
 * Rapid-fire test to assert rate limiting applies for AI endpoints.
 * Start API server before running this (npm run dev).
 */
async function run() {
    const base = process.env.API_URL || 'http://localhost:3001';
    // login as member (works for any user)
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'member@example.com', password: 'password123' }) });
    if (!login.ok)
        throw new Error('login failed');
    const lj = await login.json();
    const token = lj.token;
    const N = 15; // attempt 15 requests to exceed default capacity 10
    let limited = 0;
    for (let i = 0; i < N; i++) {
        const r = await fetch(`${base}/ai/concierge`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ userId: lj.user?.id, context: 'rate-limit test' }) });
        if (r.status === 429)
            limited += 1;
        const txt = await r.text();
        console.log(i + 1, r.status, txt.slice(0, 100));
    }
    if (limited === 0)
        throw new Error('Expected some requests to be rate limited but none were');
    console.log('Rate-limit observed on', limited, 'requests');
}
run().catch((err) => { console.error('test failed', err); process.exit(1); });
