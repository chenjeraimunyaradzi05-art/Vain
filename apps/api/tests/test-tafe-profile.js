/**
 * Quick verification for TAFE/institution profile endpoints.
 * Run while API is running locally (npm run dev) and migrations + seed applied.
 */
async function run() {
    const base = process.env.API_URL || 'http://localhost:3001';
    console.log('Logging in as tafe@example.com');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'tafe@example.com', password: 'password123' }) });
    const lj = await login.json();
    if (!login.ok)
        throw new Error(`login failed: ${JSON.stringify(lj)}`);
    const token = lj.token;
    console.log('Got token:', !!token);
    // create/update a profile
    const payload = { institutionName: 'Test TAFE Ltd', institutionType: 'RTO', courses: 'Cert II Demo; Cert III Demo', address: '1 TAFE Lane', phone: '07 7000 0000' };
    const res = await fetch(`${base}/tafe/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
    console.log('POST /tafe/profile status', res.status);
    const j = await res.json();
    console.log('created:', j.profile?.institutionName);
    if (!res.ok)
        throw new Error(`create failed: ${JSON.stringify(j)}`);
    // fetch profile back
    const g = await fetch(`${base}/tafe/profile`, { headers: { Authorization: `Bearer ${token}` } });
    const gj = await g.json();
    console.log('GET status', g.status, 'institutionName', gj.profile?.institutionName);
    if (!g.ok)
        throw new Error('Failed to fetch profile');
    console.log('TAFE profile test completed');
}
run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('test failed', err);
    process.exit(1);
});
