/**
 * JobPerformanceService
 * 
 * Tracks daily engagement metrics for job listings.
 * Aggregates views, clicks, applications, and conversion rates.
 */

import { prisma } from '../db';

interface TrackingEvent {
  jobId: string;
  eventType: 'view' | 'unique_view' | 'click' | 'application' | 'save' | 'share' | 'search_impression' | 'recommendation_impression';
  userId?: string;
  sessionId?: string;
  duration?: number; // Time spent on page in seconds
}

interface PerformanceSummary {
  jobId: string;
  totalViews: number;
  totalUniqueViews: number;
  totalClicks: number;
  totalApplications: number;
  totalSaves: number;
  totalShares: number;
  overallConversionRate: number;
  avgTimeOnPage: number | null;
  trendData: DailyTrend[];
}

interface DailyTrend {
  date: string;
  views: number;
  applications: number;
  clicks: number;
  impressions: number;
  searchImpressions: number;
  recommendationImpressions: number;
  conversionRate: number;
}

export class JobPerformanceService {
  private static instance: JobPerformanceService;

  private constructor() {}

  static getInstance(): JobPerformanceService {
    if (!JobPerformanceService.instance) {
      JobPerformanceService.instance = new JobPerformanceService();
    }
    return JobPerformanceService.instance;
  }

  /**
   * Track a job engagement event
   */
  async trackEvent(event: TrackingEvent): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Get or create today's performance record
      const existing = await prisma.jobPerformance.findUnique({
        where: {
          jobId_date: {
            jobId: event.jobId,
            date: today,
          },
        },
      });

      const incrementData: Record<string, number> = {};

      switch (event.eventType) {
        case 'view':
          incrementData.views = 1;
          break;
        case 'unique_view':
          incrementData.uniqueViews = 1;
          break;
        case 'click':
          incrementData.clicks = 1;
          break;
        case 'application':
          incrementData.applications = 1;
          break;
        case 'save':
          incrementData.saves = 1;
          break;
        case 'share':
          incrementData.shares = 1;
          break;
        case 'search_impression':
          incrementData.searchImpressions = 1;
          break;
        case 'recommendation_impression':
          incrementData.recommendationImpressions = 1;
          break;
      }

      if (existing) {
        // Update existing record
        await prisma.jobPerformance.update({
          where: { id: existing.id },
          data: {
            ...incrementData,
            // Recalculate conversion rate
            conversionRate: existing.views > 0 
              ? ((existing.applications + (incrementData.applications || 0)) / (existing.views + (incrementData.views || 0))) * 100
              : null,
          },
        });
      } else {
        // Create new record
        await prisma.jobPerformance.create({
          data: {
            jobId: event.jobId,
            date: today,
            ...Object.fromEntries(
              Object.entries(incrementData).map(([k, v]) => [k, v])
            ),
          },
        });
      }

      // Also increment the Job's viewCount for backward compatibility
      if (event.eventType === 'view') {
        await prisma.job.update({
          where: { id: event.jobId },
          data: { viewCount: { increment: 1 } },
        });
      }
    } catch (error) {
      console.error('[JobPerformance] Failed to track event:', error);
      // Don't throw - tracking should not break the user experience
    }
  }

  /**
   * Get performance summary for a job
   */
  async getJobPerformance(jobId: string, days: number = 30): Promise<PerformanceSummary> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const metrics = await prisma.jobPerformance.findMany({
      where: {
        jobId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const totals = metrics.reduce(
      (acc, m) => ({
        views: acc.views + m.views,
        uniqueViews: acc.uniqueViews + m.uniqueViews,
        clicks: acc.clicks + m.clicks,
        applications: acc.applications + m.applications,
        saves: acc.saves + m.saves,
        shares: acc.shares + m.shares,
        totalTime: acc.totalTime + (m.avgTimeOnPage || 0),
        timeCount: acc.timeCount + (m.avgTimeOnPage ? 1 : 0),
      }),
      { views: 0, uniqueViews: 0, clicks: 0, applications: 0, saves: 0, shares: 0, totalTime: 0, timeCount: 0 }
    );

    const trendData: DailyTrend[] = metrics.map((m) => ({
      date: m.date.toISOString().split('T')[0],
      views: m.views,
      applications: m.applications,
      clicks: m.clicks,
      impressions: (m.searchImpressions || 0) + (m.recommendationImpressions || 0),
      searchImpressions: m.searchImpressions || 0,
      recommendationImpressions: m.recommendationImpressions || 0,
      conversionRate: m.conversionRate || 0,
    }));

    return {
      jobId,
      totalViews: totals.views,
      totalUniqueViews: totals.uniqueViews,
      totalClicks: totals.clicks,
      totalApplications: totals.applications,
      totalSaves: totals.saves,
      totalShares: totals.shares,
      overallConversionRate: totals.views > 0 ? (totals.applications / totals.views) * 100 : 0,
      avgTimeOnPage: totals.timeCount > 0 ? totals.totalTime / totals.timeCount : null,
      trendData,
    };
  }

  /**
   * Get aggregated performance metrics for all jobs owned by a user (employer)
   */
  async getEmployerDashboardMetrics(userId: string, days: number = 30): Promise<{
    totalViews: number;
    totalApplications: number;
    avgConversionRate: number;
    topPerformingJobs: Array<{ jobId: string; title: string; views: number; applications: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all jobs by this user
    const jobs = await prisma.job.findMany({
      where: { userId },
      select: { id: true, title: true },
    });

    const jobIds = jobs.map((j) => j.id);

    if (jobIds.length === 0) {
      return {
        totalViews: 0,
        totalApplications: 0,
        avgConversionRate: 0,
        topPerformingJobs: [],
      };
    }

    // Get aggregated metrics
    const metrics = await prisma.jobPerformance.groupBy({
      by: ['jobId'],
      where: {
        jobId: { in: jobIds },
        date: { gte: startDate },
      },
      _sum: {
        views: true,
        applications: true,
      },
    });

    const jobMap = new Map(jobs.map((j) => [j.id, j.title]));

    const totals = metrics.reduce(
      (acc, m) => ({
        views: acc.views + (m._sum.views || 0),
        applications: acc.applications + (m._sum.applications || 0),
      }),
      { views: 0, applications: 0 }
    );

    const topPerforming = metrics
      .map((m) => ({
        jobId: m.jobId,
        title: jobMap.get(m.jobId) || 'Unknown',
        views: m._sum.views || 0,
        applications: m._sum.applications || 0,
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5);

    return {
      totalViews: totals.views,
      totalApplications: totals.applications,
      avgConversionRate: totals.views > 0 ? (totals.applications / totals.views) * 100 : 0,
      topPerformingJobs: topPerforming,
    };
  }

  /**
   * Update average time on page for a job
   */
  async updatePageDuration(jobId: string, durationSeconds: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const existing = await prisma.jobPerformance.findUnique({
        where: {
          jobId_date: {
            jobId,
            date: today,
          },
        },
      });

      if (existing) {
        // Calculate new average
        const currentAvg = existing.avgTimeOnPage || 0;
        const viewCount = existing.views || 1;
        const newAvg = ((currentAvg * (viewCount - 1)) + durationSeconds) / viewCount;

        await prisma.jobPerformance.update({
          where: { id: existing.id },
          data: { avgTimeOnPage: newAvg },
        });
      }
    } catch (error) {
      console.error('[JobPerformance] Failed to update duration:', error);
    }
  }
}

export const jobPerformanceService = JobPerformanceService.getInstance();
