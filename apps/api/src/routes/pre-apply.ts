/**
 * Pre-Apply Routes
 * 
 * API endpoints for managing the pre-apply queue:
 * - GET /pre-apply/matches - Get user's pre-apply job matches
 * - POST /pre-apply/:jobId/dismiss - Dismiss a job match
 * - POST /pre-apply/:jobId/applied - Mark job as applied
 * - POST /pre-apply/process-job/:jobId - (Internal) Process a new job for pre-apply matching
 */

import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { PreApplyService } from '../services/preApplyService';

const router = express.Router();

/**
 * GET /pre-apply/matches
 * Get the current user's pre-apply job matches
 */
router.get('/matches', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const matches = await PreApplyService.getUserPreApplyMatches(userId, limit);

    res.json({
      matches,
      count: matches.length,
    });
  } catch (error: any) {
    console.error('[PreApply] Get matches error:', error);
    res.status(500).json({ error: 'Failed to get pre-apply matches' });
  }
});

/**
 * POST /pre-apply/:jobId/dismiss
 * Dismiss a job from the pre-apply queue
 */
router.post('/:jobId/dismiss', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    await PreApplyService.dismissMatch(userId, jobId);

    res.json({ success: true, message: 'Job match dismissed' });
  } catch (error: any) {
    console.error('[PreApply] Dismiss error:', error);
    res.status(500).json({ error: 'Failed to dismiss job match' });
  }
});

/**
 * POST /pre-apply/:jobId/applied
 * Mark that the user applied to a job from pre-apply
 */
router.post('/:jobId/applied', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { jobId } = req.params;

    await PreApplyService.markAsApplied(userId, jobId);

    res.json({ success: true, message: 'Marked as applied' });
  } catch (error: any) {
    console.error('[PreApply] Mark applied error:', error);
    res.status(500).json({ error: 'Failed to mark as applied' });
  }
});

/**
 * POST /pre-apply/process-job/:jobId
 * Internal endpoint to process a new job for pre-apply matching
 * Should be called when a new job is posted
 */
router.post('/process-job/:jobId', async (req: Request, res: Response) => {
  try {
    // Optional: Add API key or internal auth check here
    const adminKey = req.headers['x-admin-key'];
    const expectedKey = process.env.ADMIN_API_KEY;

    // Allow if admin key matches or if called internally (no auth required for internal calls)
    if (expectedKey && adminKey !== expectedKey && !req.headers['x-internal-call']) {
      return void res.status(403).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.params;
    const result = await PreApplyService.processNewJob(jobId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[PreApply] Process job error:', error);
    res.status(500).json({ error: 'Failed to process job for pre-apply' });
  }
});

export default router;


