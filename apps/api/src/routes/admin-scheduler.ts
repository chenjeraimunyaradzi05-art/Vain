/**
 * Admin Scheduler Routes
 * 
 * Protected endpoints for triggering scheduled tasks
 */

import express from 'express';
import auth from '../middleware/auth';
import { prisma } from '../db';
import { JobAlertScheduler } from '../services/jobAlertScheduler';

const router = express.Router();

/**
 * POST /admin/scheduler/job-alerts
 * Trigger job alerts processing manually
 * 
 * Body:
 *  - frequency: 'instant' | 'daily' | 'weekly' (optional, defaults to 'daily')
 */
router.post(
  '/job-alerts',
  auth.authenticate,
  async (req: any, res: any) => {
    try {
      // Check admin permission
      if (req.user.role !== 'ADMIN') {
        return void res.status(403).json({ error: 'Admin access required' });
      }

      const frequency = req.body.frequency || 'daily';
      
      if (!['instant', 'daily', 'weekly'].includes(frequency)) {
        return void res.status(400).json({ error: 'Invalid frequency. Must be instant, daily, or weekly' });
      }

      console.log(`[Admin] Job alerts triggered for ${frequency} by user ${req.user.id}`);

      const result = await JobAlertScheduler.processAlerts(frequency);

      res.json({
        success: true,
        frequency,
        ...result,
      });
    } catch (error) {
      console.error('Job alerts trigger error:', error);
      res.status(500).json({ error: 'Failed to process job alerts' });
    }
  }
);

/**
 * POST /admin/scheduler/pre-apply
 * Trigger pre-apply processing for recent jobs
 */
router.post(
  '/pre-apply',
  auth.authenticate,
  async (req: any, res: any) => {
    try {
      // Check admin permission
      if (req.user.role !== 'ADMIN') {
        return void res.status(403).json({ error: 'Admin access required' });
      }

      console.log(`[Admin] Pre-apply processing triggered by user ${req.user.id}`);

      const result = await JobAlertScheduler.processPreApplyAlerts();

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Pre-apply trigger error:', error);
      res.status(500).json({ error: 'Failed to process pre-apply alerts' });
    }
  }
);

/**
 * GET /admin/scheduler/status
 * Get status of scheduled tasks
 */
router.get(
  '/status',
  auth.authenticate,
  async (req: any, res: any) => {
    try {
      // Check admin permission
      if (req.user.role !== 'ADMIN') {
        return void res.status(403).json({ error: 'Admin access required' });
      }

      // Get counts of alerts to be processed
      const [dailyCount, weeklyCount, instantCount] = await Promise.all([
        prisma.savedSearch.count({
          where: { alertEnabled: true, alertFrequency: 'daily' },
        }),
        prisma.savedSearch.count({
          where: { alertEnabled: true, alertFrequency: 'weekly' },
        }),
        prisma.savedSearch.count({
          where: { alertEnabled: true, alertFrequency: 'instant' },
        }),
      ]);

      // Get recent email stats
      const emailStats = await prisma.emailLog.groupBy({
        by: ['status'],
        _count: true,
        where: {
          createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          notificationType: 'job_alert',
        },
      });

      res.json({
        success: true,
        savedSearches: {
          daily: dailyCount,
          weekly: weeklyCount,
          instant: instantCount,
          total: dailyCount + weeklyCount + instantCount,
        },
        emailStats: emailStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count;
          return acc;
        }, {}),
      });
    } catch (error) {
      console.error('Scheduler status error:', error);
      res.status(500).json({ error: 'Failed to get scheduler status' });
    }
  }
);

export default router;


