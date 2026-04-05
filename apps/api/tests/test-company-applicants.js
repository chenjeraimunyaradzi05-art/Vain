/**
 * Smoke test for company applicant management endpoints
 */
async function run() {
    const base = process.env.API_URL || 'http://localhost:3001';
    console.log('Logging in as company@example.com');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
    const loginJson = await login.json();
    if (!login.ok)
        throw new Error(`login failed: ${JSON.stringify(loginJson)}`);
    const token = loginJson.token;
    // find seeded job
    const jobs = await fetch(`${base}/company/jobs`, { headers: { Authorization: `Bearer ${token}` } });
    const jobsJ = await jobs.json();
    if (!jobs.ok || !jobsJ.jobs || jobsJ.jobs.length === 0)
        throw new Error('no jobs for company');
    const jobId = jobsJ.jobs[0].id;
    console.log('Using job', jobId);
    // list applicants
    const apps = await fetch(`${base}/company/jobs/${jobId}/applicants`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('applicants list status', apps.status);
    const appsJ = await apps.json();
    console.log('apps:', appsJ.total, (appsJ.applications || []).map((a) => ({ id: a.id, user: a.user?.email, status: a.status })));
    if (appsJ.applications && appsJ.applications.length > 0) {
        const appId = appsJ.applications[0].id;
        console.log('Updating status for', appId);
        const upd = await fetch(`${base}/company/jobs/${jobId}/applicants/${appId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ status: 'REVIEWED' }) });
        console.log('patch', upd.status, await upd.json());
        console.log('Fetching resume url');
        const res = await fetch(`${base}/company/jobs/${jobId}/applicants/${appId}/resume`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('resume', res.status, await res.json());
    }
    console.log('Applicant management smoke test completed');
}
run().catch(err => { console.error('test failed', err); process.exit(1); });
