/**
 * Analytics Service
 * 
 * Comprehensive analytics and metrics tracking for:
 * - User engagement and behavior
 * - Platform performance
 * - Content performance
 * - Job market insights
 * - Mentorship outcomes
 * - Indigenous community impact
 */

import { prisma as prismaClient } from '../db';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

const prisma = prismaClient as any;

// Types
export interface AnalyticsEvent {
  id?: string;
  userId?: string;
  sessionId: string;
  eventType: EventType;
  eventName: string;
  properties: Record<string, unknown>;
  timestamp: Date;
  deviceInfo?: DeviceInfo;
  location?: LocationInfo;
}

export interface DeviceInfo {
  platform: 'web' | 'ios' | 'android';
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  screenWidth?: number;
  screenHeight?: number;
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export type EventType = 
  | 'page_view'
  | 'screen_view'
  | 'user_action'
  | 'engagement'
  | 'conversion'
  | 'error'
  | 'performance';

export interface UserMetrics {
  userId: string;
  totalSessions: number;
  totalTimeSpent: number;
  averageSessionDuration: number;
  lastActiveAt: Date;
  engagementScore: number;
  profileCompleteness: number;
  connectionCount: number;
  postCount: number;
  messagesSent: number;
  jobApplications: number;
  mentorshipHours: number;
}

export interface ContentMetrics {
  contentId: string;
  contentType: 'post' | 'job' | 'story' | 'course';
  views: number;
  uniqueViews: number;
  engagements: number;
  shares: number;
  averageTimeSpent: number;
  completionRate?: number;
  conversionRate?: number;
}

export interface PlatformMetrics {
  date: Date;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  newRegistrations: number;
  sessionsCount: number;
  averageSessionDuration: number;
  pageViews: number;
  bounceRate: number;
  retentionRate7Day: number;
  retentionRate30Day: number;
}

export interface JobMarketInsights {
  period: string;
  totalJobsPosted: number;
  totalApplications: number;
  averageApplicationsPerJob: number;
  topIndustries: Array<{ industry: string; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
  averageTimeToHire: number;
  successfulPlacements: number;
  indigenousEmployerJobsPercentage: number;
}

export interface MentorshipMetrics {
  period: string;
  totalMentorships: number;
  activeMentorships: number;
  completedMentorships: number;
  averageDurationWeeks: number;
  averageHoursPerMentorship: number;
  menteeSuccessRate: number;
  mentorSatisfactionScore: number;
  menteeSatisfactionScore: number;
}

export interface IndigenousCommunityImpact {
  period: string;
  indigenousUsersRegistered: number;
  indigenousUsersActive: number;
  indigenousEmployersOnboarded: number;
  jobPlacementsWithIndigenousEmployers: number;
  culturalContentCreated: number;
  communityEventsHosted: number;
  mentorshipsByElders: number;
  culturalLearningParticipants: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private eventBuffer: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  private constructor() {
    this.startFlushInterval();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Start periodic buffer flush
   */
  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Stop flush interval
   */
  stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  // ==================== Event Tracking ====================

  /**
   * Track an analytics event
   */
  async track(event: AnalyticsEvent): Promise<void> {
    event.timestamp = event.timestamp || new Date();
    event.id = this.generateEventId();

    this.eventBuffer.push(event);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.BUFFER_SIZE) {
      await this.flushEvents();
    }

    // Update real-time counters
    await this.updateRealTimeCounters(event);
  }

  /**
   * Track page/screen view
   */
  async trackView(
    sessionId: string,
    viewName: string,
    properties: Record<string, unknown> = {},
    userId?: string,
    deviceInfo?: DeviceInfo
  ): Promise<void> {
    await this.track({
      userId,
      sessionId,
      eventType: deviceInfo?.platform === 'web' ? 'page_view' : 'screen_view',
      eventName: viewName,
      properties,
      timestamp: new Date(),
      deviceInfo
    });
  }

  /**
   * Track user action
   */
  async trackAction(
    sessionId: string,
    actionName: string,
    properties: Record<string, unknown> = {},
    userId?: string
  ): Promise<void> {
    await this.track({
      userId,
      sessionId,
      eventType: 'user_action',
      eventName: actionName,
      properties,
      timestamp: new Date()
    });
  }

  /**
   * Track engagement event
   */
  async trackEngagement(
    sessionId: string,
    engagementType: string,
    contentId: string,
    contentType: string,
    userId?: string,
    duration?: number
  ): Promise<void> {
    await this.track({
      userId,
      sessionId,
      eventType: 'engagement',
      eventName: engagementType,
      properties: {
        contentId,
        contentType,
        duration
      },
      timestamp: new Date()
    });
  }

  /**
   * Track conversion event
   */
  async trackConversion(
    sessionId: string,
    conversionType: string,
    properties: Record<string, unknown>,
    userId?: string
  ): Promise<void> {
    await this.track({
      userId,
      sessionId,
      eventType: 'conversion',
      eventName: conversionType,
      properties,
      timestamp: new Date()
    });
  }

  /**
   * Track error event
   */
  async trackError(
    sessionId: string,
    errorName: string,
    errorMessage: string,
    stack?: string,
    userId?: string
  ): Promise<void> {
    await this.track({
      userId,
      sessionId,
      eventType: 'error',
      eventName: errorName,
      properties: {
        message: errorMessage,
        stack
      },
      timestamp: new Date()
    });
  }

  /**
   * Track performance event
   */
  async trackPerformance(
    sessionId: string,
    metricName: string,
    value: number,
    unit: string,
    properties: Record<string, unknown> = {}
  ): Promise<void> {
    await this.track({
      sessionId,
      eventType: 'performance',
      eventName: metricName,
      properties: {
        value,
        unit,
        ...properties
      },
      timestamp: new Date()
    });
  }

  /**
   * Flush events to storage
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // In production, batch insert to analytics database
      // For now, log and store in cache for aggregation
      for (const event of eventsToFlush) {
        const key = `analytics:event:${event.id}`;
        await redisCache.set(key, event, 86400); // 24 hours

        // Add to daily aggregation list
        const date = event.timestamp.toISOString().split('T')[0];
        await redisCache.setAdd(`analytics:daily:${date}`, event.id!);
      }

      logger.info('Analytics events flushed', { count: eventsToFlush.length });
    } catch (error) {
      // Re-add events to buffer on failure
      this.eventBuffer = [...eventsToFlush, ...this.eventBuffer];
      logger.error('Failed to flush analytics events', { error });
    }
  }

  /**
   * Update real-time counters
   */
  private async updateRealTimeCounters(event: AnalyticsEvent): Promise<void> {
    const hourKey = this.getHourKey();
    
    // Increment event type counter
    await redisCache.increment(`analytics:realtime:${hourKey}:${event.eventType}`, 1);

    // Track unique users
    if (event.userId) {
      await redisCache.setAdd(`analytics:realtime:${hourKey}:users`, event.userId);
    }

    // Track unique sessions
    await redisCache.setAdd(`analytics:realtime:${hourKey}:sessions`, event.sessionId);
  }

  // ==================== User Analytics ====================

  /**
   * Get user metrics
   */
  async getUserMetrics(userId: string): Promise<UserMetrics | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          _count: {
            select: {
              posts: true,
              messages: true,
              applications: true,
              mentorships: true,
              connections: true
            }
          }
        }
      });

      if (!user) return null;

      // Get session data from analytics
      const sessionsKey = `analytics:user:${userId}:sessions`;
      const sessions = await redisCache.get<Array<{ duration: number; timestamp: Date }>>(sessionsKey) || [];

      const totalSessions = sessions.length;
      const totalTimeSpent = sessions.reduce((sum, s) => sum + s.duration, 0);
      const averageSessionDuration = totalSessions > 0 ? totalTimeSpent / totalSessions : 0;

      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore({
        sessions: totalSessions,
        posts: user._count.posts,
        messages: user._count.messages,
        connections: user._count.connections,
        applications: user._count.applications
      });

      return {
        userId,
        totalSessions,
        totalTimeSpent,
        averageSessionDuration,
        lastActiveAt: user.lastLoginAt || user.createdAt,
        engagementScore,
        profileCompleteness: this.calculateProfileCompleteness(user),
        connectionCount: user._count.connections,
        postCount: user._count.posts,
        messagesSent: user._count.messages,
        jobApplications: user._count.applications,
        mentorshipHours: 0 // Calculate from mentorship sessions
      };
    } catch (error) {
      logger.error('Failed to get user metrics', { userId, error });
      return null;
    }
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(metrics: {
    sessions: number;
    posts: number;
    messages: number;
    connections: number;
    applications: number;
  }): number {
    const weights = {
      sessions: 0.2,
      posts: 0.25,
      messages: 0.2,
      connections: 0.2,
      applications: 0.15
    };

    const maxValues = {
      sessions: 100,
      posts: 50,
      messages: 200,
      connections: 100,
      applications: 20
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      const value = metrics[key as keyof typeof metrics];
      const max = maxValues[key as keyof typeof maxValues];
      const normalizedValue = Math.min(value / max, 1);
      score += normalizedValue * weight * 100;
    }

    return Math.round(score);
  }

  /**
   * Calculate profile completeness
   */
  private calculateProfileCompleteness(user: any): number {
    const fields = [
      'firstName',
      'lastName',
      'email',
      'bio',
      'location',
      'avatarUrl',
      'industry',
      'experience',
      'skills',
      'education'
    ];

    let completed = 0;
    for (const field of fields) {
      if (user[field]) completed++;
    }

    return Math.round((completed / fields.length) * 100);
  }

  // ==================== Content Analytics ====================

  /**
   * Get content metrics
   */
  async getContentMetrics(
    contentId: string,
    contentType: 'post' | 'job' | 'story' | 'course'
  ): Promise<ContentMetrics> {
    const metricsKey = `analytics:content:${contentType}:${contentId}`;
    const cached = await redisCache.get<ContentMetrics>(metricsKey);

    if (cached) return cached;

    // Calculate from events (in production, use aggregated data)
    const metrics: ContentMetrics = {
      contentId,
      contentType,
      views: 0,
      uniqueViews: 0,
      engagements: 0,
      shares: 0,
      averageTimeSpent: 0,
      completionRate: 0,
      conversionRate: 0
    };

    await redisCache.set(metricsKey, metrics, 3600); // 1 hour cache

    return metrics;
  }

  /**
   * Increment content view
   */
  async incrementContentView(
    contentId: string,
    contentType: string,
    userId?: string
  ): Promise<void> {
    const viewsKey = `analytics:content:${contentType}:${contentId}:views`;
    await redisCache.increment(viewsKey, 1);

    if (userId) {
      const uniqueKey = `analytics:content:${contentType}:${contentId}:unique`;
      await redisCache.setAdd(uniqueKey, userId);
    }
  }

  // ==================== Platform Analytics ====================

  /**
   * Get platform metrics for a date
   */
  async getPlatformMetrics(date: Date): Promise<PlatformMetrics> {
    const dateStr = date.toISOString().split('T')[0];
    const metricsKey = `analytics:platform:${dateStr}`;
    
    const cached = await redisCache.get<PlatformMetrics>(metricsKey);
    if (cached) return cached;

    // Calculate metrics (in production, use aggregated data)
    const metrics: PlatformMetrics = {
      date,
      dailyActiveUsers: 0,
      monthlyActiveUsers: 0,
      newRegistrations: 0,
      sessionsCount: 0,
      averageSessionDuration: 0,
      pageViews: 0,
      bounceRate: 0,
      retentionRate7Day: 0,
      retentionRate30Day: 0
    };

    // Try to get from database
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const [dau, newUsers] = await Promise.all([
        prisma.user.count({
          where: {
            lastLoginAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        })
      ]);

      metrics.dailyActiveUsers = dau;
      metrics.newRegistrations = newUsers;
    } catch (error) {
      logger.error('Failed to calculate platform metrics', { date: dateStr, error });
    }

    await redisCache.set(metricsKey, metrics, 3600);

    return metrics;
  }

  /**
   * Get real-time platform stats
   */
  async getRealTimeStats(): Promise<{
    activeUsers: number;
    activeSessions: number;
    pageViewsLastHour: number;
    eventsLastHour: number;
  }> {
    const hourKey = this.getHourKey();

    const [users, sessions, pageViews] = await Promise.all([
      redisCache.setMembers(`analytics:realtime:${hourKey}:users`),
      redisCache.setMembers(`analytics:realtime:${hourKey}:sessions`),
      redisCache.get<number>(`analytics:realtime:${hourKey}:page_view`) || 0
    ]);

    return {
      activeUsers: users?.length || 0,
      activeSessions: sessions?.length || 0,
      pageViewsLastHour: typeof pageViews === 'number' ? pageViews : 0,
      eventsLastHour: 0 // Sum of all event types
    };
  }

  // ==================== Business Insights ====================

  /**
   * Get job market insights
   */
  async getJobMarketInsights(period: string = 'month'): Promise<JobMarketInsights> {
    const cacheKey = `analytics:insights:jobs:${period}`;
    const cached = await redisCache.get<JobMarketInsights>(cacheKey);
    if (cached) return cached;

    const startDate = this.getStartDateForPeriod(period);

    // In production, aggregate from database
    const insights: JobMarketInsights = {
      period,
      totalJobsPosted: 0,
      totalApplications: 0,
      averageApplicationsPerJob: 0,
      topIndustries: [],
      topLocations: [],
      averageTimeToHire: 0,
      successfulPlacements: 0,
      indigenousEmployerJobsPercentage: 0
    };

    try {
      const [jobCount, applicationCount] = await Promise.all([
        prisma.job.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.application.count({
          where: { createdAt: { gte: startDate } }
        })
      ]);

      insights.totalJobsPosted = jobCount;
      insights.totalApplications = applicationCount;
      insights.averageApplicationsPerJob = jobCount > 0 
        ? Math.round(applicationCount / jobCount * 10) / 10 
        : 0;
    } catch (error) {
      logger.error('Failed to get job market insights', { period, error });
    }

    await redisCache.set(cacheKey, insights, 3600);

    return insights;
  }

  /**
   * Get mentorship metrics
   */
  async getMentorshipMetrics(period: string = 'month'): Promise<MentorshipMetrics> {
    const cacheKey = `analytics:insights:mentorship:${period}`;
    const cached = await redisCache.get<MentorshipMetrics>(cacheKey);
    if (cached) return cached;

    const metrics: MentorshipMetrics = {
      period,
      totalMentorships: 0,
      activeMentorships: 0,
      completedMentorships: 0,
      averageDurationWeeks: 0,
      averageHoursPerMentorship: 0,
      menteeSuccessRate: 0,
      mentorSatisfactionScore: 0,
      menteeSatisfactionScore: 0
    };

    try {
      const [total, active] = await Promise.all([
        prisma.mentorship.count(),
        prisma.mentorship.count({ where: { status: 'ACTIVE' } })
      ]);

      metrics.totalMentorships = total;
      metrics.activeMentorships = active;
    } catch (error) {
      logger.error('Failed to get mentorship metrics', { period, error });
    }

    await redisCache.set(cacheKey, metrics, 3600);

    return metrics;
  }

  /**
   * Get Indigenous community impact metrics
   */
  async getIndigenousCommunityImpact(period: string = 'month'): Promise<IndigenousCommunityImpact> {
    const cacheKey = `analytics:insights:indigenous:${period}`;
    const cached = await redisCache.get<IndigenousCommunityImpact>(cacheKey);
    if (cached) return cached;

    const startDate = this.getStartDateForPeriod(period);

    const impact: IndigenousCommunityImpact = {
      period,
      indigenousUsersRegistered: 0,
      indigenousUsersActive: 0,
      indigenousEmployersOnboarded: 0,
      jobPlacementsWithIndigenousEmployers: 0,
      culturalContentCreated: 0,
      communityEventsHosted: 0,
      mentorshipsByElders: 0,
      culturalLearningParticipants: 0
    };

    try {
      // Count users who identify as Indigenous
      const indigenousUsers = await prisma.user.count({
        where: {
          isIndigenous: true,
          createdAt: { gte: startDate }
        }
      });

      impact.indigenousUsersRegistered = indigenousUsers;

      // Count Indigenous employers
      const indigenousEmployers = await prisma.company.count({
        where: {
          isIndigenousOwned: true,
          createdAt: { gte: startDate }
        }
      });

      impact.indigenousEmployersOnboarded = indigenousEmployers;
    } catch (error) {
      logger.error('Failed to get Indigenous community impact', { period, error });
    }

    await redisCache.set(cacheKey, impact, 3600);

    return impact;
  }

  // ==================== Utilities ====================

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `evt_${timestamp}_${random}`;
  }

  /**
   * Get hour key for real-time tracking
   */
  private getHourKey(): string {
    const now = new Date();
    return `${now.toISOString().split('T')[0]}_${now.getHours()}`;
  }

  /**
   * Get start date for period
   */
  private getStartDateForPeriod(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day':
        now.setDate(now.getDate() - 1);
        break;
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        now.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        break;
    }
    return now;
  }
}

// Export singleton
export const analyticsService = AnalyticsService.getInstance();
