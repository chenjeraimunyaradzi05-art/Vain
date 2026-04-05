/**
 * Verify upload download access control
 */
async function run() {
    const base = process.env.API_URL || 'http://localhost:3001';
    // login as member and fetch files
    console.log('Logging in as member@example.com');
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'member@example.com', password: 'password123' }) });
    const lj = await login.json();
    if (!lj.token)
        throw new Error('member login failed');
    const memberToken = lj.token;
    const files = await fetch(`${base}/uploads/me`, { headers: { Authorization: `Bearer ${memberToken}` } });
    const fj = await files.json();
    if (!files.ok || !fj.files || fj.files.length === 0)
        throw new Error('no files for member');
    const fileId = fj.files[0].id;
    console.log('member file', fileId);
    // member should be able to download their own file
    const d1 = await fetch(`${base}/uploads/${fileId}/download`, { headers: { Authorization: `Bearer ${memberToken}` } });
    console.log('member own download status', d1.status, await d1.json());
    // login as company and attempt to download the same file
    console.log('Logging in as company@example.com');
    const clog = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
    const cj = await clog.json();
    if (!cj.token)
        throw new Error('company login failed');
    const ctoken = cj.token;
    // company should be able to download the file if it is attached to a job application for a job they own
    const d2 = await fetch(`${base}/uploads/${fileId}/download`, { headers: { Authorization: `Bearer ${ctoken}` } });
    console.log('company download status', d2.status, await d2.json());
}
run().catch(err => { console.error('test failed', err); process.exit(1); });
