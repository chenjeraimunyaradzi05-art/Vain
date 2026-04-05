/**
 * End-to-end style test: start the API (in-process), inject a fake SES client,
 * trigger the company scheduling endpoint and assert that a SendRawEmail
 * RawMessage was built and contains the ICS invite.
 *
 * NOTE: this is an E2E-style test and requires the API to be able to connect
 * to the configured database with seeded data (company@example.com / password123)
 */
// set a region so nonce code uses SES raw path
process.env.AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mailer = require('../src/lib/mailer');
let captured = null;
mailer.setSesClientFactory(() => ({
    send: async (input) => {
        // record the 'input' (if using plain object) or input.input for SDK command
        captured = input.input || input;
        return { MessageId: 'e2e-mock' };
    }
}));
(async function run() {
    // require the server after hooking the mailer so routes will use our mock
    console.log('Starting API in-process');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../src/index');
    const base = process.env.API_URL || 'http://localhost:3001';
    // login as company (seeded user expected)
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'company@example.com', password: 'password123' }) });
    const j = await login.json();
    if (!login.ok)
        throw new Error('login failed: ' + JSON.stringify(j));
    const token = j.token;
    // pick a job
    const list = await fetch(`${base}/company/jobs`, { headers: { Authorization: `Bearer ${token}` } });
    const lj = await list.json();
    if (!list.ok || !lj.jobs || lj.jobs.length === 0)
        throw new Error('no jobs found in e2e');
    const jobId = lj.jobs[0].id;
    // applicants
    const apps = await fetch(`${base}/company/jobs/${jobId}/applicants`, { headers: { Authorization: `Bearer ${token}` } });
    const appsJ = await apps.json();
    if (!apps.ok || !appsJ.applications || appsJ.applications.length === 0)
        throw new Error('no applicants for job in e2e');
    const appId = appsJ.applications[0].id;
    // schedule an interview which triggers sendMail with an ICS attachment
    const when = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const sched = await fetch(`${base}/company/jobs/${jobId}/applicants/${appId}/schedule`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ scheduledAt: when }) });
    const schedJ = await sched.json();
    if (!sched.ok)
        throw new Error('schedule request failed: ' + JSON.stringify(schedJ));
    // now inspect captured send
    if (!captured || !captured.RawMessage || !captured.RawMessage.Data) {
        console.error('No RawMessage captured from SES fake client', captured);
        process.exit(2);
    }
    const raw = Buffer.isBuffer(captured.RawMessage.Data) ? captured.RawMessage.Data : Buffer.from(captured.RawMessage.Data);
    const rawStr = raw.toString('utf8');
    // Basic ICS presence
    if (!rawStr.includes('BEGIN:VCALENDAR')) {
        console.error('Raw message did not contain ICS (length', raw.length, ')');
        console.error(rawStr.slice(0, 400));
        process.exit(3);
    }
    // Check for expected top-level headers and structure that MailComposer emits
    const lower = rawStr.toLowerCase();
    if (!lower.includes('mime-version: 1.0')) {
        console.error('Raw MIME missing MIME-Version header');
        process.exit(4);
    }
    if (!lower.includes('subject:')) {
        console.error('Raw MIME missing Subject header');
        console.error(rawStr.split('\r\n').slice(0, 20).join('\n'));
        process.exit(5);
    }
    // Ensure attachment header for ICS present (filename may be interview.ics as produced by sender)
    if (!lower.includes('content-disposition: attachment') || !lower.includes('interview.ics')) {
        console.error('Raw MIME missing calendar attachment headers (interview.ics)');
        process.exit(6);
    }
    // Ensure content-type header for calendar exists
    if (!lower.includes('content-type: text/calendar') && !lower.includes('content-type: multipart/mixed')) {
        console.error('Raw MIME missing calendar content-type');
        process.exit(7);
    }
    console.log('E2E SES raw test passed — MailComposer-like MIME contains expected ICS and headers; length:', raw.length);
    process.exit(0);
})().catch((err) => { console.error('e2e test failed', err); process.exit(1); });
