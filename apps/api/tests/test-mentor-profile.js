/**
 * Quick verification for Mentor profile endpoints.
 * Run while API is running locally (npm run dev) and migrations + seed applied.
 */
async function run() {
    const base = process.env.API_URL || 'http://localhost:3001';
    console.log('Logging in as mentor@example.com');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'mentor@example.com', password: 'password123' }) });
    const lj = await login.json();
    if (!login.ok)
        throw new Error(`login failed: ${JSON.stringify(lj)}`);
    const token = lj.token;
    console.log('Got token:', !!token);
    // create/update a profile
    const payload = { phone: '0400202020', expertise: 'Mentoring youth, careers', bio: 'Automated mentor profile update' };
    const res = await fetch(`${base}/mentor/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    console.log('POST /mentor/profile status', res.status);
    const j = await res.json();
    console.log('created:', j.profile?.id);
    if (!res.ok)
        throw new Error(`create failed: ${JSON.stringify(j)}`);
    // fetch profile back
    const g = await fetch(`${base}/mentor/profile`, { headers: { Authorization: `Bearer ${token}` } });
    const gj = await g.json();
    console.log('GET status', g.status, 'phone', gj.profile?.phone);
    if (!g.ok)
        throw new Error('Failed to fetch profile');
    // patch the profile
    const p = await fetch(`${base}/mentor/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ expertise: 'Updated expertise for tests' }) });
    const pj = await p.json();
    console.log('PATCH status', p.status, 'updated', pj.profile?.expertise);
    console.log('Mentor profile test completed');
}
run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('test failed', err);
    process.exit(1);
});
