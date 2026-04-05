/**
 * Email Template Management System
 *
 * CMS-editable email templates with variable substitution,
 * preview, and versioning.
 */

import express, { Router, Request, Response } from 'express';
import { prisma as prismaClient } from '../lib/database';
const prisma = prismaClient as any;
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Default email templates
const DEFAULT_TEMPLATES = {
  welcome: {
    name: 'Welcome Email',
    subject: 'Welcome to Ngurra Pathways, {{firstName}}!',
    category: 'onboarding',
    variables: ['firstName', 'email', 'userType', 'loginUrl'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0f2e,#2d1b69);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffd700;font-size:28px;">Ngurra Pathways</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;color:#f8fafc;font-size:24px;">Welcome, {{firstName}}!</h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:16px;line-height:1.6;">
                Thank you for joining Ngurra Pathways. We're excited to have you on board.
              </p>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:16px;line-height:1.6;">
                Your journey to meaningful employment starts here. Explore job opportunities, connect with mentors, and access training resources tailored for you.
              </p>
              <a href="{{loginUrl}}" style="display:inline-block;padding:14px 32px;background:#9333ea;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                Get Started
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #334155;text-align:center;">
              <p style="margin:0;color:#64748b;font-size:12px;">
                © 2026 Ngurra Pathways. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textTemplate: `Welcome to Ngurra Pathways, {{firstName}}!

Thank you for joining us. Your journey to meaningful employment starts here.

Get started: {{loginUrl}}

© 2026 Ngurra Pathways`,
  },

  passwordReset: {
    name: 'Password Reset',
    subject: 'Reset your Ngurra Pathways password',
    category: 'security',
    variables: ['firstName', 'resetUrl', 'expiresIn'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;">
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;color:#f8fafc;">Reset Your Password</h2>
              <p style="color:#94a3b8;margin:0 0 24px;">
                Hi {{firstName}}, we received a request to reset your password.
              </p>
              <a href="{{resetUrl}}" style="display:inline-block;padding:14px 32px;background:#9333ea;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                Reset Password
              </a>
              <p style="color:#64748b;margin:24px 0 0;font-size:14px;">
                This link expires in {{expiresIn}}. If you didn't request this, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textTemplate: `Reset Your Password

Hi {{firstName}}, we received a request to reset your password.

Click here to reset: {{resetUrl}}

This link expires in {{expiresIn}}. If you didn't request this, ignore this email.`,
  },

  paymentFailed: {
    name: 'Payment Failed',
    subject: 'Action Required: Payment failed for your subscription',
    category: 'billing',
    variables: [
      'firstName',
      'amount',
      'currency',
      'lastFour',
      'retryDate',
      'updatePaymentUrl',
      'billingUrl',
    ],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;">
          <tr>
            <td style="padding:32px;background:#7f1d1d;border-radius:16px 16px 0 0;">
              <h2 style="margin:0;color:#fecaca;">⚠️ Payment Failed</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="color:#f8fafc;margin:0 0 16px;">Hi {{firstName}},</p>
              <p style="color:#94a3b8;margin:0 0 24px;">
                We were unable to process your payment of {{currency}}{{amount}} using the card ending in {{lastFour}}.
              </p>
              <a href="{{updatePaymentUrl}}" style="display:inline-block;padding:14px 32px;background:#9333ea;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                Update Payment Method
              </a>
              <p style="color:#64748b;margin:24px 0 0;font-size:14px;">
                We'll automatically retry on {{retryDate}}. Your subscription remains active during this time.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textTemplate: `Payment Failed

Hi {{firstName}},

We were unable to process your payment of {{currency}}{{amount}}.

Please update your payment method: {{updatePaymentUrl}}

We'll retry on {{retryDate}}.`,
  },

  applicationReceived: {
    name: 'Application Received',
    subject: 'Application received for {{jobTitle}}',
    category: 'jobs',
    variables: ['firstName', 'jobTitle', 'companyName', 'applicationId', 'dashboardUrl'],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;">
          <tr>
            <td style="padding:32px;background:#14532d;border-radius:16px 16px 0 0;">
              <h2 style="margin:0;color:#bbf7d0;">✓ Application Submitted</h2>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="color:#f8fafc;margin:0 0 16px;">Hi {{firstName}},</p>
              <p style="color:#94a3b8;margin:0 0 16px;">
                Your application for <strong style="color:#f8fafc;">{{jobTitle}}</strong> at <strong style="color:#f8fafc;">{{companyName}}</strong> has been received.
              </p>
              <p style="color:#94a3b8;margin:0 0 24px;">
                The employer will review your application and get back to you if you're shortlisted.
              </p>
              <a href="{{dashboardUrl}}" style="display:inline-block;padding:14px 32px;background:#9333ea;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                Track Application
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textTemplate: `Application Submitted

Hi {{firstName}},

Your application for {{jobTitle}} at {{companyName}} has been received.

Track your application: {{dashboardUrl}}`,
  },

  mentorSessionReminder: {
    name: 'Mentor Session Reminder',
    subject: 'Reminder: Mentoring session in {{timeUntil}}',
    category: 'mentorship',
    variables: [
      'firstName',
      'mentorName',
      'sessionTime',
      'sessionDate',
      'timeUntil',
      'meetingLink',
      'rescheduleUrl',
    ],
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;">
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;color:#f8fafc;">🗓️ Session Reminder</h2>
              <p style="color:#94a3b8;margin:0 0 16px;">
                Hi {{firstName}}, your mentoring session with <strong style="color:#f8fafc;">{{mentorName}}</strong> starts in {{timeUntil}}.
              </p>
              <div style="background:#0f172a;padding:20px;border-radius:8px;margin:0 0 24px;">
                <p style="color:#94a3b8;margin:0;font-size:14px;">📅 {{sessionDate}}</p>
                <p style="color:#f8fafc;margin:8px 0 0;font-size:18px;">{{sessionTime}}</p>
              </div>
              <a href="{{meetingLink}}" style="display:inline-block;padding:14px 32px;background:#9333ea;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
                Join Session
              </a>
              <p style="margin:16px 0 0;">
                <a href="{{rescheduleUrl}}" style="color:#9333ea;font-size:14px;">Need to reschedule?</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    textTemplate: `Session Reminder

Hi {{firstName}}, your mentoring session with {{mentorName}} starts in {{timeUntil}}.

Date: {{sessionDate}}
Time: {{sessionTime}}

Join session: {{meetingLink}}

Need to reschedule? {{rescheduleUrl}}`,
  },
};

type TemplateView = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  category: string;
  htmlTemplate: string;
  textTemplate: string;
  variables: string[];
  isActive: boolean;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
};

function humanizeTemplateKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

function extractVariables(...sources: Array<string | undefined>): string[] {
  const variables = new Set<string>();

  for (const source of sources) {
    if (!source) continue;

    for (const match of source.matchAll(/{{\s*([\w.]+)\s*}}/g)) {
      if (match[1]) variables.add(match[1]);
    }
  }

  return Array.from(variables).sort();
}

function buildDefaultTemplate(slug: string): TemplateView | null {
  const template = DEFAULT_TEMPLATES[slug];
  if (!template) return null;

  return {
    id: slug,
    slug,
    name: template.name,
    subject: template.subject,
    category: template.category,
    htmlTemplate: template.htmlTemplate,
    textTemplate: template.textTemplate,
    variables: template.variables,
    isActive: true,
    version: 1,
  };
}

function mapStoredTemplate(template: any): TemplateView {
  const fallback = buildDefaultTemplate(template.key);

  return {
    id: String(template.id || template.key),
    slug: String(template.key),
    name: fallback?.name || humanizeTemplateKey(String(template.key)),
    subject: String(template.subject || fallback?.subject || ''),
    category: fallback?.category || 'custom',
    htmlTemplate: String(template.html || fallback?.htmlTemplate || ''),
    textTemplate: String(template.text || fallback?.textTemplate || ''),
    variables:
      fallback?.variables || extractVariables(template.subject, template.html, template.text),
    isActive: true,
    version: 1,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

async function loadStoredTemplates(): Promise<any[]> {
  return prisma.emailTemplate
    .findMany({
      orderBy: { key: 'asc' },
    })
    .catch(() => []);
}

async function loadTemplate(slug: string): Promise<TemplateView | null> {
  const stored = await prisma.emailTemplate
    .findUnique({
      where: { key: slug },
    })
    .catch(() => null);

  return stored ? mapStoredTemplate(stored) : buildDefaultTemplate(slug);
}

/**
 * GET /admin/email-templates
 * List all email templates
 */
router.get('/', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const storedTemplates = await loadStoredTemplates();
    const storedByKey = new Map(storedTemplates.map((template: any) => [template.key, template]));
    const keys = Array.from(
      new Set([
        ...Object.keys(DEFAULT_TEMPLATES),
        ...storedTemplates.map((template: any) => String(template.key)),
      ])
    ).sort();

    const templates = keys
      .map((key) => {
        const stored = storedByKey.get(key);
        return stored ? mapStoredTemplate(stored) : buildDefaultTemplate(key);
      })
      .filter(Boolean);

    res.json({ templates });
  } catch (err) {
    console.error('Failed to fetch templates:', err);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * GET /admin/email-templates/:slug
 * Get a specific template
 */
router.get('/:slug', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { slug } = req.params;

    const template = await loadTemplate(slug);

    if (!template) {
      return void res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (err) {
    console.error('Failed to fetch template:', err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

/**
 * PUT /admin/email-templates/:slug
 * Update a template
 */
router.put('/:slug', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, subject, htmlTemplate, textTemplate, variables, isActive } = req.body;
    const fallback = buildDefaultTemplate(slug);

    const template = await prisma.emailTemplate.upsert({
      where: { key: slug },
      update: {
        subject: subject || fallback?.subject || '',
        html: htmlTemplate || fallback?.htmlTemplate || '',
        text: textTemplate || fallback?.textTemplate || '',
      },
      create: {
        key: slug,
        subject: subject || fallback?.subject || '',
        html: htmlTemplate || fallback?.htmlTemplate || '',
        text: textTemplate || fallback?.textTemplate || '',
      },
    });

    res.json({
      template: {
        ...mapStoredTemplate(template),
        name: name || fallback?.name || humanizeTemplateKey(slug),
        variables:
          Array.isArray(variables) && variables.length > 0
            ? variables.map(String)
            : mapStoredTemplate(template).variables,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
      message: 'Template updated successfully',
    });
  } catch (err) {
    console.error('Failed to update template:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * POST /admin/email-templates/:slug/preview
 * Preview a template with sample data
 */
router.post('/:slug/preview', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { slug } = req.params;
    const { sampleData } = req.body;

    const template = await loadTemplate(slug);

    if (!template) {
      return void res.status(404).json({ error: 'Template not found' });
    }

    // Replace variables with sample data
    let html = template.htmlTemplate || '';
    let text = template.textTemplate || '';
    let subject = template.subject || '';

    const data = sampleData || {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john@example.com',
      jobTitle: 'Software Developer',
      companyName: 'Tech Company',
      loginUrl: 'https://ngurra.example/login',
      resetUrl: 'https://ngurra.example/reset?token=xxx',
      updatePaymentUrl: 'https://ngurra.example/billing',
      dashboardUrl: 'https://ngurra.example/dashboard',
      meetingLink: 'https://meet.jit.si/example',
      amount: '49.00',
      currency: '$',
      lastFour: '4242',
      retryDate: 'January 10, 2026',
      mentorName: 'Sarah Johnson',
      sessionTime: '2:00 PM',
      sessionDate: 'Tuesday, January 7',
      timeUntil: '1 hour',
      expiresIn: '1 hour',
    };

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value));
      text = text.replace(regex, String(value));
      subject = subject.replace(regex, String(value));
    });

    res.json({
      html,
      text,
      subject,
      originalVariables: template.variables,
    });
  } catch (err) {
    console.error('Failed to preview template:', err);
    res.status(500).json({ error: 'Failed to preview template' });
  }
});

/**
 * POST /admin/email-templates/:slug/send-test
 * Send a test email
 */
router.post('/:slug/send-test', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const { slug } = req.params;
    const { toEmail, sampleData } = req.body;

    if (!toEmail) {
      return void res.status(400).json({ error: 'Recipient email required' });
    }

    // Get preview content
    const previewRes = await fetch(
      `${req.protocol}://${req.get('host')}/admin/email-templates/${slug}/preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: req.headers.authorization || '',
        },
        body: JSON.stringify({ sampleData }),
      }
    );

    const preview = (await previewRes.json()) as { subject: string; html: string; text: string };

    // Queue email
    const { queueEmail } = require('../services/queue');
    await queueEmail({
      to: toEmail,
      subject: `[TEST] ${preview.subject}`,
      html: preview.html,
      text: preview.text,
    });

    res.json({ message: 'Test email sent successfully' });
  } catch (err) {
    console.error('Failed to send test email:', err);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

/**
 * Render template with data
 * Used by other services to send emails
 */
async function renderTemplate(slug, data) {
  const template = await loadTemplate(slug);

  if (!template) {
    throw new Error(`Template not found: ${slug}`);
  }

  let html = template.htmlTemplate || '';
  let text = template.textTemplate || '';
  let subject = template.subject || '';

  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    html = html.replace(regex, String(value));
    text = text.replace(regex, String(value));
    subject = subject.replace(regex, String(value));
  });

  return { html, text, subject };
}

export default router;
export { renderTemplate, DEFAULT_TEMPLATES };
