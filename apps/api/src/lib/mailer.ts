import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import MailComposer from 'nodemailer/lib/mail-composer';

// Optional import for SendGrid
let sgMail: any;
try {
    sgMail = require('@sendgrid/mail');
} catch (e) {
    // SendGrid not installed
}

const FROM = process.env.FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL || 'no-reply@ngurra.example';

export interface Attachment {
    content: Buffer | string;
    filename: string;
    contentType: string;
}

export interface MailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    attachments?: Attachment[];
}

let sesClientFactory: ((config: any) => any) | null = null;

export function setSesClientFactory(factory: (config: any) => any) {
    sesClientFactory = factory;
}

const capturedEmails: any[] = [];

export function _testCapturePush(payload: any) {
    capturedEmails.push(payload);
}

export function _testCaptureGetAll() {
    return capturedEmails;
}

export function _testCaptureClear() {
    capturedEmails.length = 0;
}

async function trySendWithSendGrid(opts: MailOptions): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY || !sgMail) return false;
    try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        const msg: any = { to: opts.to, from: FROM, subject: opts.subject };
        if (opts.text) msg.text = opts.text;
        if (opts.html) msg.html = opts.html;
        if (opts.attachments && opts.attachments.length > 0) {
            msg.attachments = opts.attachments.map((a) => ({
                content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(String(a.content)).toString('base64'),
                filename: a.filename,
                type: a.contentType
            }));
        }
        await sgMail.send(msg);
        return true;
    } catch (e) {
        console.warn('sendgrid send failed', e);
        return false;
    }
}

async function trySendWithSES(opts: MailOptions): Promise<boolean> {
    if (!process.env.AWS_REGION) return false;
    try {
        let client;
        if (typeof sesClientFactory === 'function')
            client = sesClientFactory({ region: process.env.AWS_REGION });
        else
            client = new SESClient({ region: process.env.AWS_REGION });

        const params: any = {
            Destination: { ToAddresses: Array.isArray(opts.to) ? opts.to : [opts.to] },
            Message: { Body: {}, Subject: { Data: opts.subject } },
            Source: FROM,
        };
        if (opts.text) params.Message.Body.Text = { Data: opts.text };
        if (opts.html) params.Message.Body.Html = { Data: opts.html };

        await client.send(new SendEmailCommand(params));
        return true;
    } catch (e) {
        console.warn('SES send failed', e);
        return false;
    }
}

async function trySendWithSESRaw(opts: MailOptions): Promise<boolean> {
    const captureMode = String(process.env.SES_TEST_CAPTURE || '').toLowerCase() === '1';
    if (!process.env.AWS_REGION && !captureMode) {
        // Local capture only
    }

    try {
        let client: any;
        if (captureMode || !process.env.AWS_REGION) {
            client = {
                send: async (input: any) => {
                    const payload = input?.input || input;
                    _testCapturePush(payload);
                    return { MessageId: 'capture-local' };
                }
            };
        } else if (typeof sesClientFactory === 'function') {
            client = sesClientFactory({ region: process.env.AWS_REGION });
        } else {
            client = new SESClient({ region: process.env.AWS_REGION });
        }

        const mailOptions: any = {
            from: FROM,
            to: opts.to,
            subject: opts.subject,
        };
        if (opts.text) mailOptions.text = opts.text;
        if (opts.html) mailOptions.html = opts.html;
        if (opts.attachments) {
            mailOptions.attachments = opts.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                contentType: a.contentType
            }));
        }

        const composer = new MailComposer(mailOptions);
        const message = await composer.compile().build();

        const command = captureMode || !process.env.AWS_REGION
             ? { RawMessage: { Data: message } } // Mock command structure
             : new SendRawEmailCommand({ RawMessage: { Data: message } });

        await client.send(command);
        return true;
    } catch (e) {
        console.warn('SES raw send failed', e);
        return false;
    }
}

export async function sendMail(opts: MailOptions): Promise<boolean> {
    // Try SendGrid first if configured
    if (process.env.SENDGRID_API_KEY) {
        if (await trySendWithSendGrid(opts)) return true;
    }

    // Try SES (simple) if no attachments
    if (!opts.attachments || opts.attachments.length === 0) {
        if (await trySendWithSES(opts)) return true;
    }

    // Try SES (raw) for attachments or fallback
    return await trySendWithSESRaw(opts);
}
