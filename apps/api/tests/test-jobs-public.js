/**
 * Basic public jobs smoke test
 */
async function run() {
    const base = process.env.API_URL || 'http://localhost:3001';
    console.log('Listing public jobs');
    const list = await fetch(`${base}/jobs`);
    const listJson = await list.json();
    console.log('jobs:', list.status, listJson.total || (listJson.jobs || []).length);
    const jobId = listJson.jobs && listJson.jobs[0] && listJson.jobs[0].id;
    if (!jobId) {
        console.warn('No jobs found to test public endpoints');
        return;
    }
    console.log('Fetching job detail for', jobId);
    const get = await fetch(`${base}/jobs/${jobId}`);
    console.log('get', get.status, await get.json());
    // try applying as seeded member
    console.log('Logging in as member@example.com');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'member@example.com', password: 'password123' }) });
    const loginJson = await login.json();
    if (!loginJson.token)
        throw new Error('member login failed');
    const token = loginJson.token;
    console.log('Applying as member to job', jobId);
    const apply = await fetch(`${base}/jobs/${jobId}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ coverLetter: 'Hi, I am interested' }) });
    console.log('apply', apply.status, await apply.json());
}
run().catch((err) => { console.error('test failed', err); process.exit(1); });
