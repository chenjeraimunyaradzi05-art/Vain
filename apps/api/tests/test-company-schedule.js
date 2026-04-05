/**
 * Smoke test for scheduling interviews from company side
 */
async function run() {
    const base = process.env.API_URL || 'http://localhost:3001';
    console.log('Logging in as company@example.com');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
    const loginJson = await login.json();
    if (!login.ok)
        throw new Error(`login failed: ${JSON.stringify(loginJson)}`);
    const token = loginJson.token;
    const list = await fetch(`${base}/company/jobs`, { headers: { Authorization: `Bearer ${token}` } });
    const lj = await list.json();
    if (!list.ok || !lj.jobs || lj.jobs.length === 0)
        throw new Error('no jobs found');
    const jobId = lj.jobs[0].id;
    // list applicants
    const apps = await fetch(`${base}/company/jobs/${jobId}/applicants`, { headers: { Authorization: `Bearer ${token}` } });
    const appsJ = await apps.json();
    if (!apps.ok || !appsJ.applications || appsJ.applications.length === 0)
        throw new Error('no applicants');
    const appId = appsJ.applications[0].id;
    const when = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const sched = await fetch(`${base}/company/jobs/${jobId}/applicants/${appId}/schedule`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: when }) });
    console.log('schedule', sched.status, await sched.json());
}
run().catch(err => { console.error('test failed', err); process.exit(1); });
