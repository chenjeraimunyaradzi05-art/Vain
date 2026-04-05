// @ts-nocheck
"use strict";

/**
 * Enhanced Employer Analytics Routes
 * Tracks job views, applications, and funnel metrics
 */
import express from 'express';
import { prisma as prismaClient } from '../db';
import { authenticate as authenticateJWT } from '../middleware/auth';
// @ts-ignore
import { checkAnalyticsAccess } from './subscriptions-v2';
import { isAdmin as checkIsAdmin } from '../middleware/adminAuth';
import crypto from 'crypto';
import { jobPerformanceService } from '../services/jobPerformanceService';

const prisma = prismaClient as any;

const router = express.Router();

// =============================================================================
// EVENT TRACKING
// =============================================================================

/**
 * POST /analytics/events - Track a job event (view, apply, save, share)
 */
router.post('/events', async (req, res) => {
  try {
    const { jobId, userId, eventType, source, referrer, metadata } = req.body;

    if (!jobId || !eventType) {
      return void res.status(400).json({ error: 'jobId and eventType are required' });
    }

    const validEvents = ['view', 'apply', 'save', 'share'];
    if (!validEvents.includes(eventType)) {
      return void res.status(400).json({ error: 'Invalid eventType' });
    }

    // Get user agent and IP (hashed for privacy)
    const userAgent = req.headers['user-agent'] || null;
    const ipHash = req.ip ? crypto.createHash('sha256').update(req.ip).digest('hex').substring(0, 16) : null;

    if (!prisma.jobEvent) {
      // Model not in schema – gracefully accept tracking request without persisting
      return void res.json({ tracked: false, reason: 'job_event_model_unavailable' });
    }

    const event = await prisma.jobEvent.create({
      data: {
        jobId,
        userId: userId || null,
        eventType,
        source: source || null,
        referrer: referrer || null,
        userAgent,
        ipHash,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Update aggregate analytics (legacy jobAnalytics)
    await updateJobAnalytics(jobId, eventType, ipHash);

    // Update Phase 3 JobPerformance analytics
    const performanceEventType = eventType === 'apply' ? 'application' : eventType;
    if (['view', 'application', 'save', 'share'].includes(performanceEventType)) {
      await jobPerformanceService.trackEvent({
        jobId,
        eventType: performanceEventType as any,
        userId: userId || undefined,
      });
    }

    res.json({ tracked: true, eventId: event.id });
  } catch (err) {
    console.error('Track event error:', err);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * POST /analytics/track - General analytics for company (CTAs, feature usage)
 * Requires authentication (company user)
 */
router.post('/track', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { eventType, metadata } = req.body;

    if (!eventType) {
      return void res.status(400).json({ error: 'eventType is required' });
    }

    // Find company profile for this user
    const company = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) {
      return void res.status(404).json({ error: 'Company profile not found' });
    }

    if (!prisma.analyticsEvent) {
      return void res.json({ tracked: false, reason: 'analytics_event_model_unavailable' });
    }

    const record = await prisma.analyticsEvent.create({
      data: {
        companyId: company.id,
        eventType,
        metadata: metadata || {},
      },
    });

    res.json({ tracked: true, id: record.id });
  } catch (err) {
    console.error('Track analytics error:', err);
    res.status(500).json({ error: 'Failed to track analytics' });
  }
});

/**
 * Update aggregate job analytics
 */
async function updateJobAnalytics(jobId, eventType, ipHash) {
  if (!prisma.jobAnalytics) return; // model not present in schema
  try {
    const existing = await prisma.jobAnalytics.findUnique({ where: { jobId } });

    const updates: any = {};
    if (eventType === 'view') {
      updates.viewCount = { increment: 1 };
      // Check for unique view (simplified - in production use Redis or similar)
      if (ipHash) {
        const existingView = await prisma.jobEvent.findFirst({
          where: { jobId, eventType: 'view', ipHash, id: { not: undefined } },
        });
        if (!existingView) {
          updates.uniqueViews = { increment: 1 };
        }
      }
    } else if (eventType === 'apply') {
      updates.applyCount = { increment: 1 };
    } else if (eventType === 'save') {
      updates.saveCount = { increment: 1 };
    } else if (eventType === 'share') {
      updates.shareCount = { increment: 1 };
    }

    await prisma.jobAnalytics.upsert({
      where: { jobId },
      create: {
        jobId,
        viewCount: eventType === 'view' ? 1 : 0,
        uniqueViews: eventType === 'view' ? 1 : 0,
        applyCount: eventType === 'apply' ? 1 : 0,
        saveCount: eventType === 'save' ? 1 : 0,
        shareCount: eventType === 'share' ? 1 : 0,
      },
      update: {
        ...updates,
        lastUpdated: new Date(),
      },
    });

    // Calculate conversion rate
    const analytics = await prisma.jobAnalytics.findUnique({ where: { jobId } });
    if (analytics && analytics.viewCount > 0) {
      await prisma.jobAnalytics.update({
        where: { jobId },
        data: {
          conversionRate: (analytics.applyCount / analytics.viewCount) * 100,
        },
      });
    }
  } catch (err) {
    console.error('Update analytics error:', err);
  }
}

// =============================================================================
// EMPLOYER DASHBOARD ANALYTICS
// =============================================================================

/**
 * GET /analytics/employer/overview - Get employer analytics overview
 */
router.get('/employer/overview', authenticateJWT, checkAnalyticsAccess, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      default: startDate.setDate(now.getDate() - 30);
    }

    // Get employer's jobs
    const jobs = await prisma.job.findMany({
      where: { userId },
      select: { id: true, title: true, isActive: true },
    });

    const jobIds = jobs.map((j) => j.id);

    if (jobIds.length === 0) {
      return void res.json({
        overview: {
          totalJobs: 0,
          activeJobs: 0,
          totalViews: 0,
          totalApplies: 0,
          avgConversionRate: 0,
        },
        jobs: [],
      });
    }

      // Get aggregate analytics from JobPerformance
      const performance = await prisma.jobPerformance.groupBy({
        by: ['jobId'],
        where: {
          jobId: { in: jobIds },
          date: { gte: startDate },
        },
        _sum: {
          views: true,
          applications: true,
          saves: true,
          shares: true,
          uniqueViews: true,
        },
      });

      const totalViews = performance.reduce((sum, p) => sum + (p._sum.views || 0), 0);
      const totalApplies = performance.reduce((sum, p) => sum + (p._sum.applications || 0), 0);
      const totalSaves = performance.reduce((sum, p) => sum + (p._sum.saves || 0), 0);
      const totalShares = performance.reduce((sum, p) => sum + (p._sum.shares || 0), 0);
      const avgConversion = totalViews > 0 ? (totalApplies / totalViews * 100).toFixed(1) : '0';

    // Get application status breakdown
    const applications = await prisma.jobApplication.groupBy({
      by: ['status'],
      where: { jobId: { in: jobIds } },
      _count: true,
    });

    // Get per-job analytics
      const jobsWithAnalytics = jobs.map((job) => {
        const jobPerf = performance.find((p) => p.jobId === job.id);
        const viewCount = jobPerf?._sum.views || 0;
        const applyCount = jobPerf?._sum.applications || 0;
        const saveCount = jobPerf?._sum.saves || 0;
        const shareCount = jobPerf?._sum.shares || 0;
        const conversionRate = viewCount > 0 ? (applyCount / viewCount) * 100 : 0;
        return {
          ...job,
          analytics: {
            viewCount,
            applyCount,
            saveCount,
            shareCount,
            conversionRate,
          },
        };
      });

    // Calculate time-to-hire for recent hires
    const hiredApplications = await prisma.jobApplication.findMany({
      where: {
        jobId: { in: jobIds },
        status: 'HIRED',
        hiredAt: { gte: startDate },
      },
      select: { createdAt: true, hiredAt: true },
    });

    let avgTimeToHire = null;
    if (hiredApplications.length > 0) {
      const totalDays = hiredApplications.reduce((sum, app) => {
        if (app.hiredAt && app.createdAt) {
          const days = Math.floor((new Date(app.hiredAt).getTime() - new Date(app.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }
        return sum;
      }, 0);
      avgTimeToHire = Math.round(totalDays / hiredApplications.length);
    }

    // Total hired count
    const hiredCount = await prisma.jobApplication.count({
      where: { jobId: { in: jobIds }, status: 'HIRED' },
    });

    // Total interviews scheduled
    const interviewCount = await prisma.jobApplication.count({
      where: { jobId: { in: jobIds }, status: { in: ['INTERVIEW_SCHEDULED', 'INTERVIEWED'] } },
    });

      res.json({
        period,
        dateRange: { start: startDate, end: now },
        overview: {
          totalJobs: jobs.length,
          activeJobs: jobs.filter((j) => j.isActive).length,
          totalViews,
          totalApplies,
          avgConversionRate: parseFloat(avgConversion),
        },
        // Additional metrics for dashboard compatibility
        totalViews,
        totalApplications: totalApplies,
        totalInterviews: interviewCount,
        totalHires: hiredCount,
        hiredCount,
        avgTimeToHire,
        trend: {
          views: totalViews,
          applies: totalApplies,
          saves: totalSaves,
          shares: totalShares,
        },
        applicationsByStatus: applications.reduce((acc, a) => {
          acc[a.status] = a._count;
          return acc;
        }, {}),
        applicationFunnel: applications.reduce((acc, a) => {
          acc[a.status] = a._count;
          return acc;
        }, {}),
        jobs: jobsWithAnalytics.sort((a, b) => 
          (b.analytics?.viewCount || 0) - (a.analytics?.viewCount || 0)
        ),
      });
  } catch (err) {
    console.error('Employer overview error:', err);
    res.status(500).json({ error: 'Failed to fetch employer analytics' });
  }
});

function forwardToEmployerRoute(path: string) {
  return (req, res, next) => {
    const handler = router.stack.find((layer) => layer.route && layer.route.path === path);
    if (handler) {
      return handler.route.stack[0].handle(req, res, next);
    }
    return next();
  };
}

// Frontend-compatible aliases (mounted at /analytics/employer)
router.get('/overview', authenticateJWT, checkAnalyticsAccess, forwardToEmployerRoute('/employer/overview'));
router.get('/dashboard', authenticateJWT, checkAnalyticsAccess, forwardToEmployerRoute('/employer/overview'));
router.get('/employer/dashboard', authenticateJWT, checkAnalyticsAccess, forwardToEmployerRoute('/employer/overview'));

/**
 * GET /analytics/employer/jobs - List jobs with performance summary
 */
router.get('/jobs', authenticateJWT, checkAnalyticsAccess, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { period = '30d' } = req.query;

    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      default: startDate.setDate(now.getDate() - 30);
    }

    const jobs = await prisma.job.findMany({
      where: { userId },
      select: { id: true, title: true, location: true, employment: true, isActive: true },
    });

    const jobIds = jobs.map((j) => j.id);
    if (jobIds.length === 0) {
      return void res.json({ jobs: [] });
    }

    const performance = await prisma.jobPerformance.groupBy({
      by: ['jobId'],
      where: {
        jobId: { in: jobIds },
        date: { gte: startDate },
      },
      _sum: { views: true, applications: true },
    });

    const jobRows = jobs.map((job) => {
      const jobPerf = performance.find((p) => p.jobId === job.id);
      const views = jobPerf?._sum.views || 0;
      const applications = jobPerf?._sum.applications || 0;
      const applyRate = views > 0 ? Math.round((applications / views) * 100) : 0;

      return {
        id: job.id,
        title: job.title,
        location: job.location,
        department: job.employment,
        status: job.isActive ? 'active' : 'inactive',
        views,
        applications,
        applyRate,
      };
    });

    res.json({ jobs: jobRows });
  } catch (err) {
    console.error('Employer jobs analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch employer job analytics' });
  }
});

/**
 * GET /analytics/employer/job/:jobId - Get detailed job analytics
 */
router.get('/employer/job/:jobId', authenticateJWT, checkAnalyticsAccess, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { jobId } = req.params;
    const { period = '30d' } = req.query;

    // Verify ownership
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job || job.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      default: startDate.setDate(now.getDate() - 30);
    }

    // Get daily breakdown from JobPerformance
    const performance = await prisma.jobPerformance.findMany({
      where: {
        jobId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const totals = performance.reduce(
      (acc, p) => {
        acc.views += p.views || 0;
        acc.applies += p.applications || 0;
        acc.saves += p.saves || 0;
        acc.shares += p.shares || 0;
        acc.uniqueViews += p.uniqueViews || 0;
        return acc;
      },
      { views: 0, applies: 0, saves: 0, shares: 0, uniqueViews: 0 }
    );

    const dailyData = performance.map((p) => ({
      date: p.date.toISOString().split('T')[0],
      views: p.views || 0,
      applies: p.applications || 0,
      saves: p.saves || 0,
      shares: p.shares || 0,
    }));

    // Get applications
    const applications = await prisma.jobApplication.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    });

    const conversionRate = totals.views > 0 ? (totals.applies / totals.views) * 100 : 0;

    res.json({
      job: { id: job.id, title: job.title, isActive: job.isActive },
      period,
      analytics: {
        viewCount: totals.views,
        uniqueViews: totals.uniqueViews,
        applyCount: totals.applies,
        saveCount: totals.saves,
        shareCount: totals.shares,
        conversionRate,
      },
      dailyData,
      sources: [],
      recentApplications: applications,
    });
  } catch (err) {
    console.error('Job analytics error:', err);
    res.status(500).json({ error: 'Failed to fetch job analytics' });
  }
});

// Alias for frontend compatibility
router.get('/job/:jobId', authenticateJWT, checkAnalyticsAccess, forwardToEmployerRoute('/employer/job/:jobId'));

// =============================================================================
// ADMIN: CTA METRICS
// =============================================================================

/**
 * GET /analytics/admin/cta-summary
 * Admin-only endpoint returning aggregated CTA metrics
 * Query params: days (optional, default 30)
 */
router.get('/admin/cta-summary', async (req, res) => {
  try {
    // Admin check using centralized middleware helper
    if (!checkIsAdmin(req)) return void res.status(403).json({ error: 'Not authorized' });

    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    // Fetch events in timeframe (limit to reasonable size)
    const events = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: start } },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const total = events.length;

    // Aggregate by eventType
    const byEventType = events.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {});

    // Aggregate by metadata.location (if present)
    const byLocation = events.reduce((acc, e) => {
      const loc = (e.metadata && e.metadata.location) ? e.metadata.location : 'unknown';
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});

    // Timeseries by day
    const dayMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }

    events.forEach((e) => {
      const key = e.createdAt.toISOString().split('T')[0];
      if (dayMap[key] !== undefined) dayMap[key]++;
    });

    const timeseries = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

    res.json({ total, byEventType, byLocation, timeseries });
  } catch (err) {
    console.error('CTA summary error:', err);
    res.status(500).json({ error: 'Failed to fetch CTA metrics' });
  }
});

/**
 * GET /analytics/admin/cta-export
 * Returns CSV of analytics events in timeframe (admin-only)
 */
router.get('/admin/cta-export', async (req, res) => {
  try {
    if (!checkIsAdmin(req)) return void res.status(403).json({ error: 'Not authorized' });

    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    const events = await prisma.analyticsEvent.findMany({ where: { createdAt: { gte: start } }, orderBy: { createdAt: 'asc' }, take: 10000 });

    // CSV header
    const header = 'createdAt,eventType,companyId,location,metadata\n';
    const rows = events.map((e) => {
      const loc = e.metadata?.location ? String(e.metadata.location).replace(/"/g, '""') : '';
      const meta = e.metadata ? JSON.stringify(e.metadata).replace(/"/g, '""') : '';
      return `"${e.createdAt.toISOString()}","${e.eventType}","${e.companyId}","${loc}","${meta}"`;
    }).join('\n');

    const csv = header + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cta-events-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('CTA export error:', err);
    res.status(500).json({ error: 'Failed to export CTA metrics' });
  }
});

// Company-scoped CTA export (authenticated)
router.get('/company/cta-export', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return void res.status(401).json({ error: 'Unauthorized' });

    const company = await prisma.companyProfile.findUnique({ where: { userId } });
    if (!company) return void res.status(404).json({ error: 'Company profile not found' });

    // Rate limiting: max exports per day per company
    const MAX_EXPORTS = Number(process.env.MAX_CSV_EXPORTS_PER_DAY || 5);
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const todaysCount = await prisma.auditLog.count({ where: { action: 'company_export_cta_csv', companyId: company.id, createdAt: { gte: dayStart } } });

    if (todaysCount >= MAX_EXPORTS) {
      // Too many exports today
      res.setHeader('Retry-After', String(24 * 60 * 60));
      return void res.status(429).json({ error: 'Export limit reached for today', limit: MAX_EXPORTS, used: todaysCount });
    }

    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
    const start = new Date();
    start.setDate(start.getDate() - days + 1);

    const events = await prisma.analyticsEvent.findMany({ where: { companyId: company.id, createdAt: { gte: start } }, orderBy: { createdAt: 'asc' }, take: 10000 });

    const header = 'createdAt,eventType,location,metadata\n';
    const rows = events.map((e) => {
      const loc = e.metadata?.location ? String(e.metadata.location).replace(/"/g, '""') : '';
      const meta = e.metadata ? JSON.stringify(e.metadata).replace(/"/g, '""') : '';
      return `"${e.createdAt.toISOString()}","${e.eventType}","${loc}","${meta}"`;
    }).join('\n');

    const csv = header + rows;

    // Record audit log for export
    if (prisma.auditLog) {
      await prisma.auditLog.create({ data: { action: 'company_export_cta_csv', userId, companyId: company.id, metadata: JSON.stringify({ days }) } }).catch((e) => console.warn('Audit log write failed:', e.message));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="company-cta-events-${company.id}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('Company CTA export error:', err);
    res.status(500).json({ error: 'Failed to export company CTA metrics' });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

/**
 * GET /analytics/employer/export - Export analytics data
 */
router.get('/employer/export', authenticateJWT, checkAnalyticsAccess, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { format = 'csv', period = '30d' } = req.query;

    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '7d': startDate.setDate(now.getDate() - 7); break;
      case '30d': startDate.setDate(now.getDate() - 30); break;
      case '90d': startDate.setDate(now.getDate() - 90); break;
      default: startDate.setDate(now.getDate() - 30);
    }

    // Get employer's jobs
    const jobs = await prisma.job.findMany({
      where: { userId },
      include: {
        applications: { select: { id: true, status: true, createdAt: true } },
      },
    });

    const jobIds = jobs.map((j) => j.id);
    const performance = await prisma.jobPerformance.groupBy({
      by: ['jobId'],
      where: {
        jobId: { in: jobIds },
        date: { gte: startDate },
      },
      _sum: {
        views: true,
        uniqueViews: true,
        applications: true,
        saves: true,
        shares: true,
      },
    });

    const analyticsMap = new Map(performance.map((p) => [p.jobId, p._sum]));

    if (format === 'csv') {
      const header = 'Job Title,Status,Views,Unique Views,Applications,Saves,Shares,Conversion Rate\n';
      const rows = jobs.map((j) => {
        const a: any = analyticsMap.get(j.id) || {};
        const views = a.views || 0;
        const applications = a.applications || 0;
        const conversionRate = views > 0 ? ((applications / views) * 100).toFixed(1) : '0.0';
        return `"${j.title}","${j.isActive ? 'Active' : 'Inactive'}",${views},${a.uniqueViews || 0},${applications},${a.saves || 0},${a.shares || 0},${conversionRate}%`;
      }).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="job-analytics-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(header + rows);
    } else {
      res.json({
        exportedAt: new Date().toISOString(),
        jobs: jobs.map((j) => ({
          ...j,
          analytics: analyticsMap.get(j.id) || null,
        })),
      });
    }
  } catch (err) {
    console.error('Export analytics error:', err);
    res.status(500).json({ error: 'Failed to export analytics' });
  }
});

// Alias for frontend compatibility
router.get('/export', authenticateJWT, checkAnalyticsAccess, forwardToEmployerRoute('/employer/export'));

export default router;



