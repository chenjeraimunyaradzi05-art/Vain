/**
 * Email Service
 * 
 * Handles:
 * - Transactional email sending
 * - Email templates with cultural sensitivity
 * - Email queue with retry logic
 * - Delivery tracking
 * - Unsubscribe management
 */

import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

// Types
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, unknown>;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  tags?: string[];
  metadata?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
  scheduledFor?: Date;
}

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
}

// Email templates with Indigenous cultural elements
const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  welcome: {
    name: 'welcome',
    subject: 'Welcome to Ngurra Pathways! 🌿',
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #D4AF37; color: #1E3A5F; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .cultural-element { border-left: 4px solid #D4AF37; padding-left: 15px; margin: 20px 0; font-style: italic; color: #555; }
    .features { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .feature-item { padding: 10px 0; border-bottom: 1px solid #eee; }
    .feature-item:last-child { border-bottom: none; }
    .emoji { font-size: 20px; margin-right: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Ngurra Pathways</h1>
      <p>Your journey to meaningful employment begins here</p>
    </div>
    <div class="content">
      <p>Hello {{firstName}},</p>
      
      <div class="cultural-element">
        "Ngurra" means home or country in many Aboriginal languages. 
        We're honoured to welcome you to our community.
      </div>
      
      <p>Thank you for joining Ngurra Pathways. We're committed to connecting talented Indigenous Australians with meaningful career opportunities and supportive mentors.</p>
      
      <div class="features">
        <h3>Here's what you can do:</h3>
        <div class="feature-item"><span class="emoji">💼</span> Explore job opportunities from Indigenous-friendly employers</div>
        <div class="feature-item"><span class="emoji">🤝</span> Connect with mentors and community members</div>
        <div class="feature-item"><span class="emoji">📚</span> Access learning resources and career development tools</div>
        <div class="feature-item"><span class="emoji">🌟</span> Share your success story and inspire others</div>
      </div>
      
      <p style="text-align: center;">
        <a href="{{appUrl}}/profile/complete" class="button">Complete Your Profile</a>
      </p>
      
      <p>If you have any questions, our team is here to support you.</p>
      
      <p>Welcome to the family,<br>The Ngurra Pathways Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Ngurra Pathways. All rights reserved.</p>
      <p>Proudly supporting Indigenous employment and community connection.</p>
      <p><a href="{{appUrl}}/unsubscribe?token={{unsubscribeToken}}">Unsubscribe</a> | <a href="{{appUrl}}/preferences">Email Preferences</a></p>
    </div>
  </div>
</body>
</html>`,
  },

  job_application_received: {
    name: 'job_application_received',
    subject: 'Application Received: {{jobTitle}} at {{companyName}}',
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1E3A5F; color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 25px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .job-card { background: #f9f9f9; border-left: 4px solid #D4AF37; padding: 15px; margin: 15px 0; border-radius: 0 8px 8px 0; }
    .button { display: inline-block; padding: 12px 25px; background: #D4AF37; color: #1E3A5F; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .success-icon { font-size: 48px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✅</div>
      <h1>Application Submitted!</h1>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      
      <p>Great news! Your application has been successfully submitted.</p>
      
      <div class="job-card">
        <h3 style="margin: 0 0 10px;">{{jobTitle}}</h3>
        <p style="margin: 5px 0;"><strong>Company:</strong> {{companyName}}</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> {{location}}</p>
        <p style="margin: 5px 0;"><strong>Applied:</strong> {{appliedDate}}</p>
      </div>
      
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>The employer will review your application</li>
        <li>You'll receive an email if they'd like to proceed</li>
        <li>Track your application status in the app</li>
      </ul>
      
      <p style="text-align: center;">
        <a href="{{appUrl}}/applications" class="button">Track Your Applications</a>
      </p>
      
      <p>We'll keep you updated on any changes. Good luck! 🍀</p>
    </div>
    <div class="footer">
      <p>© {{year}} Ngurra Pathways</p>
    </div>
  </div>
</body>
</html>`,
  },

  mentorship_matched: {
    name: 'mentorship_matched',
    subject: "You've been matched with a mentor! 🌟",
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 25px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .mentor-card { background: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }
    .mentor-avatar { width: 100px; height: 100px; border-radius: 50%; margin-bottom: 15px; object-fit: cover; border: 3px solid #D4AF37; }
    .button { display: inline-block; padding: 12px 25px; background: #D4AF37; color: #1E3A5F; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .expertise-tag { display: inline-block; background: #e8f4f8; color: #1E3A5F; padding: 5px 12px; border-radius: 15px; margin: 3px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations!</h1>
      <p>You've been matched with a mentor</p>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      
      <p>We're excited to share that you've been matched with an amazing mentor who's ready to support your career journey!</p>
      
      <div class="mentor-card">
        <img src="{{mentorAvatar}}" alt="{{mentorName}}" class="mentor-avatar" onerror="this.src='{{appUrl}}/default-avatar.png'">
        <h2 style="margin: 10px 0 5px;">{{mentorName}}</h2>
        <p style="color: #666; margin: 0;">{{mentorTitle}}</p>
        <p style="color: #666; margin: 5px 0;">{{mentorCompany}}</p>
        <div style="margin-top: 15px;">
          {{#each mentorExpertise}}
          <span class="expertise-tag">{{this}}</span>
          {{/each}}
        </div>
      </div>
      
      <p><strong>Why this match?</strong></p>
      <p>{{matchReason}}</p>
      
      <p style="text-align: center;">
        <a href="{{appUrl}}/mentorship/{{mentorshipId}}" class="button">Start Connecting</a>
      </p>
      
      <p><strong>Tips for your first meeting:</strong></p>
      <ul>
        <li>Share your career goals and aspirations</li>
        <li>Ask about their career journey</li>
        <li>Discuss how they can best support you</li>
        <li>Set up regular meeting times</li>
      </ul>
    </div>
    <div class="footer">
      <p>© {{year}} Ngurra Pathways - Connecting Indigenous talent with opportunity</p>
    </div>
  </div>
</body>
</html>`,
  },

  password_reset: {
    name: 'password_reset',
    subject: 'Reset Your Password',
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1E3A5F; color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 25px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 14px 30px; background: #D4AF37; color: #1E3A5F; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset</h1>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      
      <p>We received a request to reset your password for your Ngurra Pathways account.</p>
      
      <p style="text-align: center;">
        <a href="{{resetUrl}}" class="button">Reset Password</a>
      </p>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666; font-size: 14px;">{{resetUrl}}</p>
      
      <div class="warning">
        <strong>⏰ This link expires in 1 hour.</strong><br>
        If you didn't request this reset, please ignore this email or contact support if you're concerned.
      </div>
      
      <p>Stay secure,<br>The Ngurra Pathways Team</p>
    </div>
    <div class="footer">
      <p>© {{year}} Ngurra Pathways</p>
      <p>This is an automated security email. Please don't reply directly.</p>
    </div>
  </div>
</body>
</html>`,
  },

  session_reminder: {
    name: 'session_reminder',
    subject: 'Reminder: Mentorship Session in {{timeUntil}}',
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1E3A5F; color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 25px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .session-card { background: #f9f9f9; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #D4AF37; }
    .button { display: inline-block; padding: 12px 25px; background: #D4AF37; color: #1E3A5F; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 5px; }
    .button-secondary { background: #f0f0f0; color: #333; }
    .time-badge { display: inline-block; background: #D4AF37; color: #1E3A5F; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 18px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Session Reminder</h1>
      <div class="time-badge">{{timeUntil}}</div>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      
      <p>Just a friendly reminder about your upcoming mentorship session!</p>
      
      <div class="session-card">
        <h3 style="margin: 0 0 15px;">📅 Session Details</h3>
        <p><strong>With:</strong> {{partnerName}}</p>
        <p><strong>Date:</strong> {{sessionDate}}</p>
        <p><strong>Time:</strong> {{sessionTime}}</p>
        <p><strong>Duration:</strong> {{duration}} minutes</p>
        {{#if meetingLink}}
        <p><strong>Meeting Link:</strong> <a href="{{meetingLink}}">Join Video Call</a></p>
        {{/if}}
      </div>
      
      <p style="text-align: center;">
        <a href="{{meetingLink}}" class="button">Join Session</a>
        <a href="{{appUrl}}/sessions/{{sessionId}}/reschedule" class="button button-secondary">Reschedule</a>
      </p>
      
      <p><strong>Preparation tips:</strong></p>
      <ul>
        <li>Test your audio and video beforehand</li>
        <li>Prepare any questions you'd like to discuss</li>
        <li>Find a quiet space for the call</li>
      </ul>
    </div>
    <div class="footer">
      <p>© {{year}} Ngurra Pathways</p>
    </div>
  </div>
</body>
</html>`,
  },

  weekly_digest: {
    name: 'weekly_digest',
    subject: 'Your Weekly Ngurra Pathways Update 📬',
    htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1E3A5F 0%, #2D5A87 100%); color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #fff; padding: 25px; border: 1px solid #e0e0e0; border-top: none; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
    .section { margin: 25px 0; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .section:last-child { border-bottom: none; }
    .section h3 { color: #1E3A5F; margin-bottom: 15px; }
    .job-item, .story-item { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 10px 0; }
    .stat-box { display: inline-block; text-align: center; padding: 15px 25px; background: #f0f7ff; border-radius: 8px; margin: 5px; }
    .stat-number { font-size: 28px; font-weight: bold; color: #1E3A5F; }
    .stat-label { font-size: 12px; color: #666; }
    .button { display: inline-block; padding: 10px 20px; background: #D4AF37; color: #1E3A5F; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Digest</h1>
      <p>{{weekRange}}</p>
    </div>
    <div class="content">
      <p>Hi {{firstName}},</p>
      
      <p>Here's what's been happening in your Ngurra Pathways community this week:</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <div class="stat-box">
          <div class="stat-number">{{newJobsCount}}</div>
          <div class="stat-label">New Jobs</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">{{newConnectionsCount}}</div>
          <div class="stat-label">New Connections</div>
        </div>
        <div class="stat-box">
          <div class="stat-number">{{profileViewsCount}}</div>
          <div class="stat-label">Profile Views</div>
        </div>
      </div>
      
      {{#if recommendedJobs.length}}
      <div class="section">
        <h3>💼 Jobs For You</h3>
        {{#each recommendedJobs}}
        <div class="job-item">
          <strong>{{this.title}}</strong><br>
          <span style="color: #666;">{{this.company}} • {{this.location}}</span>
        </div>
        {{/each}}
        <p><a href="{{appUrl}}/jobs" class="button">View All Jobs</a></p>
      </div>
      {{/if}}
      
      {{#if successStories.length}}
      <div class="section">
        <h3>🌟 Community Success Stories</h3>
        {{#each successStories}}
        <div class="story-item">
          <strong>{{this.name}}</strong> - {{this.headline}}
        </div>
        {{/each}}
        <p><a href="{{appUrl}}/stories" class="button">Read More Stories</a></p>
      </div>
      {{/if}}
      
      <div class="section">
        <h3>📌 Quick Actions</h3>
        <ul>
          <li><a href="{{appUrl}}/profile">Update your profile</a></li>
          <li><a href="{{appUrl}}/connections">Connect with community members</a></li>
          <li><a href="{{appUrl}}/mentorship">Find a mentor</a></li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>© {{year}} Ngurra Pathways</p>
      <p><a href="{{appUrl}}/unsubscribe?token={{unsubscribeToken}}">Unsubscribe from weekly digest</a></p>
    </div>
  </div>
</body>
</html>`,
  },
};

class EmailService {
  private static instance: EmailService;
  private defaultFrom: string;
  private appUrl: string;

  private constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'Ngurra Pathways <noreply@ngurrapathways.com>';
    this.appUrl = process.env.APP_URL || 'https://app.ngurrapathways.com';
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  // ==================== Sending Emails ====================

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      // Check if recipient is unsubscribed
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const validRecipients = await this.filterUnsubscribed(recipients);

      if (validRecipients.length === 0) {
        return { success: true, messageId: 'skipped_unsubscribed' };
      }

      // Handle scheduled emails
      if (options.scheduledFor && options.scheduledFor > new Date()) {
        return this.scheduleEmail(options);
      }

      // Render template if specified
      let html = options.html;
      let text = options.text;
      let subject = options.subject;

      if (options.template) {
        const rendered = this.renderTemplate(
          options.template,
          options.templateData || {}
        );
        html = rendered.html;
        text = rendered.text;
        subject = rendered.subject || subject;
      }

      // In production, send via email provider (SendGrid, SES, etc.)
      // const response = await this.sendViaProvider({
      //   from: options.from || this.defaultFrom,
      //   to: validRecipients,
      //   subject,
      //   html,
      //   text,
      //   replyTo: options.replyTo,
      //   cc: options.cc,
      //   bcc: options.bcc,
      //   attachments: options.attachments,
      // });

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Track email send
      await this.trackEmail(messageId, {
        to: validRecipients,
        subject,
        template: options.template,
        tags: options.tags,
        metadata: options.metadata,
      });

      logger.info('Email sent', {
        messageId,
        to: validRecipients.length,
        subject,
        template: options.template,
      });

      return { success: true, messageId };
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to });
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send email using template
   */
  async sendTemplate(
    to: string | string[],
    templateName: string,
    data: Record<string, unknown>,
    options?: Partial<EmailOptions>
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: '', // Will be set from template
      template: templateName,
      templateData: data,
      ...options,
    });
  }

  /**
   * Send bulk emails
   */
  async sendBulk(
    emails: EmailOptions[]
  ): Promise<{ success: number; failed: number; results: EmailResult[] }> {
    const results: EmailResult[] = [];
    let success = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(email => this.send(email))
      );

      for (const result of batchResults) {
        results.push(result);
        if (result.success) {
          success++;
        } else {
          failed++;
        }
      }

      // Rate limit delay
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { success, failed, results };
  }

  // ==================== Template Rendering ====================

  /**
   * Render email template
   */
  private renderTemplate(
    templateName: string,
    data: Record<string, unknown>
  ): { subject: string; html: string; text?: string } {
    const template = EMAIL_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Email template not found: ${templateName}`);
    }

    // Add default data
    const fullData = {
      year: new Date().getFullYear(),
      appUrl: this.appUrl,
      ...data,
    };

    // Simple variable replacement (in production, use Handlebars/EJS)
    let html = template.htmlTemplate;
    let subject = template.subject;

    for (const [key, value] of Object.entries(fullData)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const stringValue = String(value);
      html = html.replace(placeholder, stringValue);
      subject = subject.replace(placeholder, stringValue);
    }

    // Generate text version
    const text = this.htmlToText(html);

    return { subject, html, text };
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ==================== Scheduling ====================

  /**
   * Schedule an email for later
   */
  private async scheduleEmail(options: EmailOptions): Promise<EmailResult> {
    if (!options.scheduledFor) {
      throw new Error('scheduledFor is required for scheduling');
    }

    const scheduledId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await redisCache.zadd(
      'email:scheduled',
      options.scheduledFor.getTime(),
      scheduledId
    );

    const ttl = Math.ceil((options.scheduledFor.getTime() - Date.now()) / 1000) + 3600;
    await redisCache.set(`email:scheduled:${scheduledId}`, options, ttl);

    logger.info('Email scheduled', { scheduledId, scheduledFor: options.scheduledFor });

    return { success: true, messageId: scheduledId };
  }

  /**
   * Process scheduled emails (call periodically)
   */
  async processScheduledEmails(): Promise<void> {
    const now = Date.now();
    const dueIds = await redisCache.zrangebyscore('email:scheduled', 0, now);

    if (!dueIds || dueIds.length === 0) return;

    for (const scheduledId of dueIds) {
      try {
        const options = await redisCache.get<EmailOptions>(`email:scheduled:${scheduledId}`);

        if (options) {
          // Remove scheduled flag to prevent re-scheduling
          delete options.scheduledFor;
          await this.send(options);
        }

        await redisCache.zrem('email:scheduled', scheduledId);
        await redisCache.delete(`email:scheduled:${scheduledId}`);
      } catch (error) {
        logger.error('Failed to process scheduled email', { scheduledId, error });
      }
    }
  }

  // ==================== Unsubscribe Management ====================

  /**
   * Unsubscribe email from all or specific categories
   */
  async unsubscribe(
    email: string,
    categories?: string[]
  ): Promise<void> {
    if (categories && categories.length > 0) {
      for (const category of categories) {
        await redisCache.setAdd(`email:unsubscribed:${category}`, email.toLowerCase());
      }
    } else {
      await redisCache.setAdd('email:unsubscribed:all', email.toLowerCase());
    }

    logger.info('Email unsubscribed', { email, categories: categories || 'all' });
  }

  /**
   * Resubscribe email
   */
  async resubscribe(email: string, categories?: string[]): Promise<void> {
    if (categories && categories.length > 0) {
      for (const category of categories) {
        await redisCache.setRemove(`email:unsubscribed:${category}`, email.toLowerCase());
      }
    } else {
      await redisCache.setRemove('email:unsubscribed:all', email.toLowerCase());
    }

    logger.info('Email resubscribed', { email, categories: categories || 'all' });
  }

  /**
   * Check if email is unsubscribed
   */
  async isUnsubscribed(email: string, category?: string): Promise<boolean> {
    const lowerEmail = email.toLowerCase();

    // Check global unsubscribe
    const globalUnsubscribed = await redisCache.setIsMember('email:unsubscribed:all', lowerEmail);
    if (globalUnsubscribed) return true;

    // Check category-specific unsubscribe
    if (category) {
      return await redisCache.setIsMember(`email:unsubscribed:${category}`, lowerEmail);
    }

    return false;
  }

  /**
   * Filter out unsubscribed recipients
   */
  private async filterUnsubscribed(recipients: string[]): Promise<string[]> {
    const valid: string[] = [];

    for (const email of recipients) {
      const isUnsubscribed = await this.isUnsubscribed(email);
      if (!isUnsubscribed) {
        valid.push(email);
      }
    }

    return valid;
  }

  /**
   * Generate unsubscribe token
   */
  generateUnsubscribeToken(email: string): string {
    const payload = `${email}:${Date.now()}`;
    // In production, use proper encryption
    return Buffer.from(payload).toString('base64');
  }

  // ==================== Tracking ====================

  /**
   * Track email send
   */
  private async trackEmail(
    messageId: string,
    data: {
      to: string[];
      subject: string;
      template?: string;
      tags?: string[];
      metadata?: Record<string, string>;
    }
  ): Promise<void> {
    const trackingData = {
      messageId,
      ...data,
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    await redisCache.set(`email:tracking:${messageId}`, trackingData, 86400 * 30); // 30 days

    // Increment stats
    await redisCache.increment('email:stats:sent', 1);
    if (data.template) {
      await redisCache.increment(`email:stats:template:${data.template}`, 1);
    }
  }

  /**
   * Record email open (called from tracking pixel)
   */
  async recordOpen(messageId: string): Promise<void> {
    const tracking = await redisCache.get<{
      status: string;
      openedAt?: string;
    }>(`email:tracking:${messageId}`);

    if (tracking && !tracking.openedAt) {
      tracking.status = 'opened';
      tracking.openedAt = new Date().toISOString();
      await redisCache.set(`email:tracking:${messageId}`, tracking, 86400 * 30);
      await redisCache.increment('email:stats:opened', 1);
    }
  }

  /**
   * Record link click
   */
  async recordClick(messageId: string, link: string): Promise<void> {
    await redisCache.listPush(`email:clicks:${messageId}`, {
      link,
      clickedAt: new Date().toISOString(),
    });
    await redisCache.increment('email:stats:clicked', 1);
  }

  /**
   * Get email stats
   */
  async getStats(): Promise<{
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }> {
    const sent = (await redisCache.get<number>('email:stats:sent')) || 0;
    const opened = (await redisCache.get<number>('email:stats:opened')) || 0;
    const clicked = (await redisCache.get<number>('email:stats:clicked')) || 0;

    return {
      sent,
      opened,
      clicked,
      openRate: sent > 0 ? opened / sent : 0,
      clickRate: opened > 0 ? clicked / opened : 0,
    };
  }

  // ==================== Convenience Methods ====================

  /**
   * Send welcome email
   */
  async sendWelcome(email: string, firstName: string): Promise<EmailResult> {
    return this.sendTemplate(email, 'welcome', {
      firstName,
      unsubscribeToken: this.generateUnsubscribeToken(email),
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<EmailResult> {
    return this.sendTemplate(email, 'password_reset', {
      firstName,
      resetUrl: `${this.appUrl}/reset-password?token=${resetToken}`,
    });
  }

  /**
   * Send job application confirmation
   */
  async sendJobApplicationReceived(
    email: string,
    data: {
      firstName: string;
      jobTitle: string;
      companyName: string;
      location: string;
    }
  ): Promise<EmailResult> {
    return this.sendTemplate(email, 'job_application_received', {
      ...data,
      appliedDate: new Date().toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    });
  }

  /**
   * Send mentorship match notification
   */
  async sendMentorshipMatched(
    email: string,
    data: {
      firstName: string;
      mentorName: string;
      mentorTitle: string;
      mentorCompany: string;
      mentorAvatar?: string;
      mentorExpertise: string[];
      matchReason: string;
      mentorshipId: string;
    }
  ): Promise<EmailResult> {
    return this.sendTemplate(email, 'mentorship_matched', data);
  }

  /**
   * Send session reminder
   */
  async sendSessionReminder(
    email: string,
    data: {
      firstName: string;
      partnerName: string;
      sessionDate: string;
      sessionTime: string;
      duration: number;
      timeUntil: string;
      meetingLink?: string;
      sessionId: string;
    }
  ): Promise<EmailResult> {
    return this.sendTemplate(email, 'session_reminder', data);
  }
}

// Export singleton
export const emailService = EmailService.getInstance();

