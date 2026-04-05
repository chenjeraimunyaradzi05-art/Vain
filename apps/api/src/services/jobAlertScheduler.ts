/**
 * Job Alerts Scheduler Service
 * 
 * Processes job alerts on a schedule and sends email notifications.
 * Can be triggered by:
 * - Cron job (node-cron)
 * - External scheduler (AWS EventBridge, Cloud Scheduler)
 * - Manual API call
 */

import { prisma } from '../db';
import { notificationService } from './notificationService';
import { queueEmail } from '../lib/emailQueue';

interface JobAlertResult {
  processed: number;
  emailsSent: number;
  pushSent: number;
  errors: number;
}

interface JobAlertEmail {
  to: string;
  name: string;
  searchName: string;
  matchCount: number;
  jobs: {
    id: string;
    title: string;
    company: string;
    location: string;
    salary: string | null;
    employment: string;
    url: string;
  }[];
  searchUrl: string;
  unsubscribeUrl: string;
}

/**
 * Generate HTML email for job alerts
 */
function generateJobAlertEmail(data: JobAlertEmail): string {
  const jobRows = data.jobs.map(job => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <a href="${job.url}" style="color: #059669; text-decoration: none; font-weight: 600; font-size: 16px;">
          ${job.title}
        </a>
        <div style="color: #6b7280; font-size: 14px; margin-top: 4px;">
          ${job.company} • ${job.location}
          ${job.salary ? ` • ${job.salary}` : ''}
        </div>
        <div style="margin-top: 8px;">
          <span style="display: inline-block; padding: 4px 8px; background: #f3f4f6; border-radius: 4px; font-size: 12px; color: #374151;">
            ${job.employment.replace('_', ' ')}
          </span>
        </div>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Alerts - ${data.searchName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Header -->
    <tr>
      <td style="padding: 24px; background: linear-gradient(135deg, #1a0f2e 0%, #2d1b69 100%); text-align: center;">
        <img src="https://ngurrapathways.com.au/logo-light.png" alt="Ngurra Pathways" width="150" style="margin-bottom: 16px;">
        <h1 style="color: #ffd700; margin: 0; font-size: 24px;">
          🔔 ${data.matchCount} New Job${data.matchCount > 1 ? 's' : ''} Found!
        </h1>
        <p style="color: #e5e7eb; margin: 8px 0 0;">
          Matching your saved search: <strong>${data.searchName}</strong>
        </p>
      </td>
    </tr>
    
    <!-- Greeting -->
    <tr>
      <td style="padding: 24px 24px 16px;">
        <p style="color: #374151; font-size: 16px; margin: 0;">
          G'day ${data.name}! 👋
        </p>
        <p style="color: #6b7280; font-size: 14px; margin: 8px 0 0;">
          We found ${data.matchCount} new job${data.matchCount > 1 ? 's' : ''} that match your search criteria.
          Apply early to get noticed!
        </p>
      </td>
    </tr>
    
    <!-- Job Listings -->
    <tr>
      <td style="padding: 0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
          ${jobRows}
        </table>
      </td>
    </tr>
    
    <!-- CTA Button -->
    <tr>
      <td style="padding: 24px; text-align: center;">
        <a href="${data.searchUrl}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #059669, #10b981); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View All Matches
        </a>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 24px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          You're receiving this because you enabled job alerts for "${data.searchName}".
          <br>
          <a href="${data.unsubscribeUrl}" style="color: #6b7280;">Manage alert settings</a> or
          <a href="${data.unsubscribeUrl}?disable=${data.searchName}" style="color: #6b7280;">unsubscribe</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 12px 0 0;">
          © ${new Date().getFullYear()} Ngurra Pathways. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for job alerts
 */
function generateJobAlertText(data: JobAlertEmail): string {
  const jobList = data.jobs.map(job => 
    `📌 ${job.title}\n   ${job.company} • ${job.location}${job.salary ? ` • ${job.salary}` : ''}\n   Apply: ${job.url}\n`
  ).join('\n');

  return `
🔔 ${data.matchCount} New Job${data.matchCount > 1 ? 's' : ''} Matching "${data.searchName}"

G'day ${data.name}!

We found ${data.matchCount} new job${data.matchCount > 1 ? 's' : ''} that match your saved search:

${jobList}

View all matches: ${data.searchUrl}

---
Manage alerts: ${data.unsubscribeUrl}
© ${new Date().getFullYear()} Ngurra Pathways
  `.trim();
}

export class JobAlertScheduler {
  private static isSchemaNotReadyError(error: any): boolean {
    const code = error?.code;
    // Prisma known codes:
    // - P2021: table does not exist
    // - P2022: column does not exist
    if (code === 'P2021' || code === 'P2022') return true;

    const message = String(error?.message || '');
    return (
      message.includes('does not exist') ||
      message.includes('relation') && message.includes('does not exist') ||
      message.includes('column') && message.includes('does not exist')
    );
  }

  private static isNonFatalSchedulerError(error: any): boolean {
    if (this.isSchemaNotReadyError(error)) return true;

    const name = String(error?.name || '');
    if (name.startsWith('PrismaClient')) return true;

    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('database') && message.includes('not') && message.includes('found') ||
      message.includes('could not connect') ||
      message.includes('connection') && message.includes('refused') ||
      message.includes('econnrefused') ||
      message.includes('timeout')
    );
  }

  /**
   * Process job alerts for a specific frequency
   * @param frequency - 'instant', 'daily', 'weekly'
   */
  static async processAlerts(frequency: 'instant' | 'daily' | 'weekly' = 'daily'): Promise<JobAlertResult> {
    const result: JobAlertResult = {
      processed: 0,
      emailsSent: 0,
      pushSent: 0,
      errors: 0,
    };

    console.log(`[JobAlerts] Processing ${frequency} alerts...`);

    try {
      // Get all enabled saved searches for this frequency
      const searches = await prisma.savedSearch.findMany({
        where: {
          alertEnabled: true,
          alertFrequency: frequency,
          searchType: 'job',
        },
      });

      console.log(`[JobAlerts] Found ${searches.length} searches to process`);

      for (const search of searches) {
        try {
          // Fetch user separately since SavedSearch doesn't have a user relation
          const user = await prisma.user.findUnique({
            where: { id: search.userId },
            include: { memberProfile: true },
          });
          if (!user) {
            console.warn(`[JobAlerts] User not found for search ${search.id}`);
            continue;
          }
          await this.processSearchAlert({ ...search, user }, result);
          result.processed++;
        } catch (err) {
          console.error(`[JobAlerts] Error processing search ${search.id}:`, err);
          result.errors++;
        }
      }

      console.log(`[JobAlerts] Completed: ${result.processed} processed, ${result.emailsSent} emails, ${result.pushSent} push, ${result.errors} errors`);
      return result;
    } catch (error) {
      if (this.isNonFatalSchedulerError(error)) {
        console.warn(
          `[JobAlerts] Skipping ${frequency} alerts due to a non-fatal error. ` +
            `Details: ${String(error?.message || error)}`,
        );
        return result;
      }
      console.error('[JobAlerts] Processing error:', error);
      return result;
    }
  }

  /**
   * Process a single saved search alert
   */
  private static async processSearchAlert(search: any, result: JobAlertResult): Promise<void> {
    const query = JSON.parse(search.query || '{}');
    const lastAlertAt = search.lastAlertAt || new Date(0);

    // Build query for new jobs since last alert
    const where: any = {
      isActive: true,
      postedAt: { gt: lastAlertAt },
    };

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.location) {
      where.location = { contains: query.location, mode: 'insensitive' };
    }
    if (query.employment) {
      where.employment = query.employment;
    }
    if (query.salaryMin) {
      where.salaryHigh = { gte: query.salaryMin };
    }
    if (query.salaryMax) {
      where.salaryLow = { lte: query.salaryMax };
    }

    const newJobs = await prisma.job.findMany({
      where,
      take: 10,
      orderBy: { postedAt: 'desc' },
      include: {
        user: {
          include: {
            companyProfile: {
              select: { companyName: true },
            },
          },
        },
      },
    });

    if (newJobs.length === 0) {
      return; // No new jobs to alert about
    }

    const user = search.user;
    if (!user) return;

    // Check if user has job alerts enabled in notification preferences
    let notifPrefs: any = null;
    try {
      notifPrefs = await prisma.notificationPreference.findUnique({
        where: { userId: user.id },
      });
    } catch (error) {
      if (this.isSchemaNotReadyError(error)) {
        // NotificationPreference table may not exist yet in early-phase schemas.
        notifPrefs = null;
      } else {
        throw error;
      }
    }

    if (notifPrefs && !notifPrefs.jobAlerts) {
      return; // User has disabled job alerts
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://ngurrapathways.com.au';
    const userName = user.name || user.memberProfile?.phone ? 'there' : user.email.split('@')[0];

    const emailData: JobAlertEmail = {
      to: user.email,
      name: userName,
      searchName: search.name,
      matchCount: newJobs.length,
      jobs: newJobs.map(job => ({
        id: job.id,
        title: job.title,
        company: job.user?.companyProfile?.companyName || 'Company',
        location: job.location || 'Location not specified',
        employment: job.employment || 'FULL_TIME',
        salary: job.salaryLow && job.salaryHigh
          ? `$${job.salaryLow.toLocaleString()} - $${job.salaryHigh.toLocaleString()}`
          : null,
        url: `${baseUrl}/jobs/${job.id}`,
      })),
      searchUrl: `${baseUrl}/jobs?saved=${search.id}`,
      unsubscribeUrl: `${baseUrl}/settings/notifications`,
    };

    // Send email notification
    try {
      await queueEmail({
        to: emailData.to,
        subject: `🔔 ${emailData.matchCount} new job${emailData.matchCount > 1 ? 's' : ''} matching "${emailData.searchName}"`,
        html: generateJobAlertEmail(emailData),
        text: generateJobAlertText(emailData),
        userId: user.id,
        type: 'job_alert',
        priority: 2,
      });
      result.emailsSent++;
    } catch (err) {
      console.error(`[JobAlerts] Failed to send email to ${user.email}:`, err);
    }

    // Send push notification if enabled
    if (notifPrefs?.pushEnabled) {
      try {
        await notificationService.send({
          userId: user.id,
          type: 'JOB_MATCH',
          title: `${emailData.matchCount} new job${emailData.matchCount > 1 ? 's' : ''} found!`,
          body: `New jobs matching "${emailData.searchName}" are available.`,
          data: {
            searchId: search.id,
            matchCount: emailData.matchCount,
          },
          channels: ['IN_APP', 'PUSH'],
        });
        result.pushSent++;
      } catch (err) {
        console.error(`[JobAlerts] Failed to send push to ${user.id}:`, err);
      }
    }

    // Update last alert time
    await prisma.savedSearch.update({
      where: { id: search.id },
      data: {
        lastAlertAt: new Date(),
        matchCount: newJobs.length,
      },
    });
  }

  /**
   * Process pre-apply alerts for users who enabled pre-apply
   * This is called when new jobs are posted
   */
  static async processPreApplyAlerts(): Promise<JobAlertResult> {
    const result: JobAlertResult = {
      processed: 0,
      emailsSent: 0,
      pushSent: 0,
      errors: 0,
    };

    console.log('[JobAlerts] Processing pre-apply alerts for recent jobs...');

    try {
      // Get jobs posted in the last hour that haven't been processed
      const recentJobs = await prisma.job.findMany({
        where: {
          isActive: true,
          postedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        },
        orderBy: { postedAt: 'desc' },
      });

      for (const job of recentJobs) {
        try {
          // Import dynamically to avoid circular deps
          const { PreApplyService } = await import('./preApplyService');
          const preApplyResult = await PreApplyService.processNewJob(job.id);
          result.processed++;
          result.pushSent += preApplyResult.notified;
        } catch (err) {
          console.error(`[JobAlerts] Error processing pre-apply for job ${job.id}:`, err);
          result.errors++;
        }
      }

      console.log(`[JobAlerts] Pre-apply completed: ${result.processed} jobs, ${result.pushSent} notifications`);
      return result;
    } catch (error) {
      if (this.isNonFatalSchedulerError(error)) {
        console.warn('[JobAlerts] Skipping pre-apply alerts due to a non-fatal error.');
        return result;
      }
      console.error('[JobAlerts] Pre-apply processing error:', error);
      return result;
    }
  }
}

export default JobAlertScheduler;
