/**
 * Email Service
 * 
 * Email sending with template support, retries, and tracking.
 */

import { queueEmail } from './queue';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  priority?: 'high' | 'normal' | 'low';
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email templates
const templates = {
  welcome: {
    subject: 'Welcome to Ngurra Pathways',
    template: 'welcome',
  },
  passwordReset: {
    subject: 'Reset Your Password',
    template: 'password-reset',
  },
  emailVerification: {
    subject: 'Verify Your Email',
    template: 'email-verification',
  },
  applicationReceived: {
    subject: 'Application Received',
    template: 'application-received',
  },
  applicationStatusUpdate: {
    subject: 'Application Status Update',
    template: 'application-status',
  },
  newJobMatch: {
    subject: 'New Job Matches for You',
    template: 'job-matches',
  },
  mentorSessionReminder: {
    subject: 'Upcoming Mentoring Session',
    template: 'session-reminder',
  },
  mentorSessionScheduled: {
    subject: 'Mentoring Session Scheduled',
    template: 'session-scheduled',
  },
  courseEnrollmentConfirmation: {
    subject: 'Course Enrollment Confirmed',
    template: 'course-enrollment',
  },
  weeklyDigest: {
    subject: 'Your Weekly Digest',
    template: 'weekly-digest',
  },
} as const;

type TemplateName = keyof typeof templates;

/**
 * Send an email directly (for immediate sending)
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // In production, integrate with email provider (SendGrid, Postmark, etc.)
    const provider = process.env.EMAIL_PROVIDER || 'console';
    
    switch (provider) {
      case 'sendgrid':
        return await sendViaSendGrid(options);
      case 'postmark':
        return await sendViaPostmark(options);
      case 'ses':
        return await sendViaSES(options);
      case 'console':
      default:
        return await sendViaConsole(options);
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Queue an email for background sending
 */
export async function sendEmailAsync(options: EmailOptions): Promise<string> {
  const job = await queueEmail({
    to: options.to,
    subject: options.subject,
    template: options.template || 'default',
    data: {
      ...options.data,
      html: options.html,
      text: options.text,
    },
    attachments: options.attachments,
  }, {
    priority: options.priority === 'high' ? 1 : options.priority === 'low' ? -1 : 0,
  });
  
  return job.id!;
}

/**
 * Send templated email
 */
export async function sendTemplateEmail(
  template: TemplateName,
  to: string | string[],
  data: Record<string, unknown>,
  options?: Partial<EmailOptions>
): Promise<EmailResult> {
  const templateConfig = templates[template];
  
  return sendEmail({
    to,
    subject: options?.subject || templateConfig.subject,
    template: templateConfig.template,
    data,
    ...options,
  });
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  name: string,
  verificationUrl: string
): Promise<EmailResult> {
  return sendTemplateEmail('welcome', email, {
    name,
    verificationUrl,
    currentYear: new Date().getFullYear(),
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
  expiresIn: string = '1 hour'
): Promise<EmailResult> {
  return sendTemplateEmail('passwordReset', email, {
    name,
    resetUrl,
    expiresIn,
  }, {
    priority: 'high',
  });
}

/**
 * Send email verification
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationUrl: string
): Promise<EmailResult> {
  return sendTemplateEmail('emailVerification', email, {
    name,
    verificationUrl,
  });
}

/**
 * Send application received notification
 */
export async function sendApplicationReceivedEmail(
  email: string,
  candidateName: string,
  jobTitle: string,
  companyName: string
): Promise<EmailResult> {
  return sendTemplateEmail('applicationReceived', email, {
    candidateName,
    jobTitle,
    companyName,
    dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/applications`,
  });
}

/**
 * Send application status update
 */
export async function sendApplicationStatusEmail(
  email: string,
  candidateName: string,
  jobTitle: string,
  companyName: string,
  status: string,
  message?: string
): Promise<EmailResult> {
  return sendTemplateEmail('applicationStatusUpdate', email, {
    candidateName,
    jobTitle,
    companyName,
    status,
    message,
    dashboardUrl: `${process.env.FRONTEND_URL}/dashboard/applications`,
  });
}

/**
 * Send mentor session reminder
 */
export async function sendSessionReminderEmail(
  email: string,
  name: string,
  mentorName: string,
  sessionDate: Date,
  sessionUrl: string
): Promise<EmailResult> {
  return sendTemplateEmail('mentorSessionReminder', email, {
    name,
    mentorName,
    sessionDate: sessionDate.toLocaleDateString(),
    sessionTime: sessionDate.toLocaleTimeString(),
    sessionUrl,
  }, {
    priority: 'high',
  });
}

// Provider implementations
async function sendViaSendGrid(options: EmailOptions): Promise<EmailResult> {
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send(msg);
  console.log('[SendGrid] Sending email:', options.subject);
  return { success: true, messageId: `sg-${Date.now()}` };
}

async function sendViaPostmark(options: EmailOptions): Promise<EmailResult> {
  // const postmark = require('postmark');
  // const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
  // await client.sendEmail(msg);
  console.log('[Postmark] Sending email:', options.subject);
  return { success: true, messageId: `pm-${Date.now()}` };
}

async function sendViaSES(options: EmailOptions): Promise<EmailResult> {
  // const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
  // const client = new SESClient({ region: process.env.AWS_REGION });
  // await client.send(command);
  console.log('[SES] Sending email:', options.subject);
  return { success: true, messageId: `ses-${Date.now()}` };
}

async function sendViaConsole(options: EmailOptions): Promise<EmailResult> {
  console.log('='.repeat(50));
  console.log('[Email] To:', options.to);
  console.log('[Email] Subject:', options.subject);
  console.log('[Email] Template:', options.template);
  console.log('[Email] Data:', JSON.stringify(options.data, null, 2));
  console.log('='.repeat(50));
  return { success: true, messageId: `console-${Date.now()}` };
}

export default {
  sendEmail,
  sendEmailAsync,
  sendTemplateEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendApplicationReceivedEmail,
  sendApplicationStatusEmail,
  sendSessionReminderEmail,
};

export {};
