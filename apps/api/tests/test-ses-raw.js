/**
 * Test SES SendRawEmail using a mock client
 */
(async function run() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mailer = require('../src/lib/mailer');
    let captured = null;
    // Provide a fake SES client factory that records the command
    mailer.setSesClientFactory(() => ({
        send: async (cmd) => {
            captured = cmd.input || cmd;
            return { MessageId: 'mock-id' };
        }
    }));
    // Ensure we have a region so function attempts SES raw
    process.env.AWS_REGION = 'ap-southeast-2';
    const ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
    const ok = await mailer.sendMail({ to: 'test@example.com', subject: 'SES Raw Test', text: 'This is a test', attachments: [{ filename: 'invite.ics', content: Buffer.from(ics), contentType: 'text/calendar' }] });
    if (!ok) {
        console.error('sendMail returned falsy');
        process.exit(1);
    }
    if (!captured || !captured.RawMessage || !captured.RawMessage.Data) {
        console.error('No RawMessage captured from SES fake client', captured);
        process.exit(2);
    }
    const raw = Buffer.isBuffer(captured.RawMessage.Data) ? captured.RawMessage.Data : Buffer.from(captured.RawMessage.Data);
    const rawStr = raw.toString('utf8');
    // rawStr contains the full MIME payload — tests below will assert presence of expected content
    if (!rawStr.includes('BEGIN:VCALENDAR')) {
        console.error('Raw MIME does not contain ICS content', rawStr.slice(0, 200));
        process.exit(3);
    }
    console.log('SES raw test passed — MIME contains ICS; length:', raw.length);
    process.exit(0);
})().catch((err) => { console.error('test failed', err); process.exit(1); });
