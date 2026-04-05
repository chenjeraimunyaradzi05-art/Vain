/**
 * Quick verification script for company portal endpoints.
 * Run while API is running locally (npm run dev) and docker pg is ready.
 */
async function run() {
    const base = process.env.API_URL || 'http://localhost:3001';
    console.log('Logging in as company@example.com');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
    const loginJson = await login.json();
    if (!login.ok)
        throw new Error(`login failed: ${JSON.stringify(loginJson)}`);
    const token = loginJson.token;
    console.log('Got token:', !!token);
    // get profile
    const prof = await fetch(`${base}/company/profile`, { headers: { Authorization: `Bearer ${token}` } });
    const profJson = await prof.json();
    console.log('profile:', profJson);
    // do a small patch
    const patch = await fetch(`${base}/company/profile`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ description: 'Updated from automated smoke test' }) });
    const patchJson = await patch.json();
    console.log('patched:', patchJson);
    // list files
    const files = await fetch(`${base}/uploads/me`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('files status:', files.status);
    // Create a new job
    console.log('Creating a job');
    const create = await fetch(`${base}/company/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: 'Test Role', description: 'Short test role description', location: 'Remote', employment: 'CONTRACT', salaryLow: 1000, salaryHigh: 2000 }) });
    const createJson = await create.json();
    console.log('create', create.status, createJson);
    // List jobs
    const list = await fetch(`${base}/company/jobs`, { headers: { Authorization: `Bearer ${token}` } });
    const listJson = await list.json();
    console.log('list jobs:', list.status, (listJson.jobs || []).length);
    const jobId = (listJson.jobs && listJson.jobs[0] && listJson.jobs[0].id) || null;
    if (jobId) {
        console.log('Fetching job', jobId);
        const getJob = await fetch(`${base}/company/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
        console.log('get', getJob.status, await getJob.json());
        // update
        const upd = await fetch(`${base}/company/jobs/${jobId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: 'Test Role (updated)' }) });
        console.log('patch', upd.status, await upd.json());
        // delete
        const del = await fetch(`${base}/company/jobs/${jobId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        console.log('delete', del.status, await del.json());
    }
    console.log('Company test completed');
}
run().catch((err) => {
    console.error('test failed', err);
    process.exit(1);
});
