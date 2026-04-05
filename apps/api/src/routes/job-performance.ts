/**
 * Job Performance Analytics Routes
 * 
 * Endpoints for tracking and viewing job engagement metrics.
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission, requireOwnership } from '../middleware/rbac';
import { jobPerformanceService } from '../services/jobPerformanceService';
import { z } from 'zod';

const router = Router();

const trackEventSchema = z.object({
  jobId: z.string().min(1),
  eventType: z.enum(['view', 'unique_view', 'click', 'application', 'save', 'share', 'search_impression', 'recommendation_impression']),
  sessionId: z.string().optional(),
  duration: z.number().positive().optional(),
});

/**
 * POST /job-performance/track
 * Track a job engagement event (can be called without auth for view tracking)
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const result = trackEventSchema.safeParse(req.body);
    if (!result.success) {
      return void res.status(400).json({ error: 'Invalid request', details: result.error.errors });
    }

    const { jobId, eventType, sessionId, duration } = result.data;
    // @ts-ignore - user may be undefined for unauthenticated tracking
    const userId = req.user?.id;

    await jobPerformanceService.trackEvent({
      jobId,
      eventType,
      userId,
      sessionId,
      duration,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * POST /job-performance/duration
 * Update page view duration (called when user leaves job page)
 */
router.post('/duration', async (req: Request, res: Response) => {
  try {
    const { jobId, duration } = req.body;

    if (!jobId || typeof duration !== 'number' || duration <= 0) {
      return void res.status(400).json({ error: 'Invalid jobId or duration' });
    }

    await jobPerformanceService.updatePageDuration(jobId, duration);

    res.json({ success: true });
  } catch (error) {
    console.error('Duration update error:', error);
    res.status(500).json({ error: 'Failed to update duration' });
  }
});

/**
 * GET /job-performance/:jobId
 * Get performance metrics for a specific job (requires ownership)
 */
router.get(
  '/:jobId',
  authenticate,
  requirePermission('job:read'),
  requireOwnership('job', 'jobId'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const performance = await jobPerformanceService.getJobPerformance(jobId, days);

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      console.error('Get job performance error:', error);
      res.status(500).json({ error: 'Failed to get job performance' });
    }
  }
);

/**
 * GET /job-performance/employer/dashboard
 * Get aggregated performance metrics for all jobs owned by the employer
 */
router.get('/employer/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    // @ts-ignore - user is attached by auth middleware
    const userId = req.user.id;
    const days = parseInt(req.query.days as string) || 30;

    const dashboard = await jobPerformanceService.getEmployerDashboardMetrics(userId, days);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error('Get employer dashboard error:', error);
    res.status(500).json({ error: 'Failed to get employer dashboard' });
  }
});

export default router;


