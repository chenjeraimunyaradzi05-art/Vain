// @ts-nocheck
/**
 * Wellness & Burnout Detection API Routes
 * 
 * Endpoints for user wellness monitoring:
 * - GET /wellness/status - Get current wellness alerts
 * - POST /wellness/check-in - Submit a wellness check-in
 * - GET /wellness/history - Get wellness check-in history
 * - POST /wellness/dismiss/:alertId - Dismiss an alert
 * - GET /wellness/resources - Get wellness resources
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import {
  logActivity,
  analyzeUserActivity,
  createAlerts,
  getActiveAlerts,
  dismissAlert,
  recordWellnessCheckIn,
  getWellnessHistory,
  getWellnessResources
} from '../lib/burnoutDetection';

const router = express.Router();

/**
 * GET /wellness/status
 * Get current wellness status and any active alerts
 */
router.get('/status', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Run analysis
    const analysis = await analyzeUserActivity(userId);
    
    // Create any new alerts
    if (analysis.alerts.length > 0) {
      await createAlerts(userId, analysis.alerts);
    }

    // Get all active alerts
    const activeAlerts = await getActiveAlerts(userId);

    res.json({
      status: activeAlerts.length === 0 ? 'healthy' : 
              activeAlerts.some(a => a.severity === 'HIGH') ? 'attention_needed' : 'check_in',
      alerts: activeAlerts,
      metrics: analysis.metrics,
      lastAnalyzed: analysis.analyzedAt
    });
  } catch (error) {
    console.error('[Wellness] Status error:', error);
    res.status(500).json({ error: 'Failed to get wellness status' });
  }
});

/**
 * GET /wellness/alerts
 * Get active wellness alerts
 */
router.get('/alerts', authenticateJWT, async (req, res) => {
  try {
    const alerts = await getActiveAlerts(req.user.id);
    res.json({ alerts });
  } catch (error) {
    console.error('[Wellness] Get alerts error:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * POST /wellness/dismiss/:alertId
 * Dismiss an alert
 */
router.post('/dismiss/:alertId', authenticateJWT, async (req, res) => {
  try {
    const { alertId } = req.params;
    await dismissAlert(alertId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[Wellness] Dismiss error:', error);
    res.status(500).json({ error: 'Failed to dismiss alert' });
  }
});

/**
 * POST /wellness/check-in
 * Submit a wellness check-in
 */
router.post('/check-in', authenticateJWT, async (req, res) => {
  try {
    const { mood, stressLevel, hopefulness, notes } = req.body;

    // Validate input
    if (!mood || !stressLevel || !hopefulness) {
      return void res.status(400).json({ 
        error: 'mood, stressLevel, and hopefulness are required (1-5 scale)' 
      });
    }

    const validate = (val) => {
      const num = parseInt(val);
      return num >= 1 && num <= 5;
    };

    if (!validate(mood) || !validate(stressLevel) || !validate(hopefulness)) {
      return void res.status(400).json({ error: 'Values must be between 1 and 5' });
    }

    const result = await recordWellnessCheckIn(req.user.id, {
      mood: parseInt(mood),
      stressLevel: parseInt(stressLevel),
      hopefulness: parseInt(hopefulness),
      notes
    });

    // Log the check-in activity
    await logActivity(req.user.id, 'WELLNESS_CHECKIN', {
      mood, stressLevel, hopefulness
    });

    res.json({
      success: true,
      checkIn: result.checkIn,
      recommendation: result.recommendation,
      message: "Thank you for checking in. Taking care of yourself is important."
    });
  } catch (error) {
    console.error('[Wellness] Check-in error:', error);
    res.status(500).json({ error: 'Failed to record check-in' });
  }
});

/**
 * GET /wellness/history
 * Get wellness check-in history
 */
router.get('/history', authenticateJWT, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const history = await getWellnessHistory(req.user.id, parseInt(limit));

    // Calculate trends
    const moodScore = (mood) => {
      switch (mood) {
        case 'GREAT':
          return 5;
        case 'GOOD':
          return 4;
        case 'OKAY':
          return 3;
        case 'LOW':
          return 2;
        case 'STRUGGLING':
          return 1;
        default:
          return 0;
      }
    };

    let trend = null;
    if (history.length >= 3) {
      const recent = history.slice(0, 3);
      const older = history.slice(3, 6);
      
      if (older.length >= 3) {
        const recentAvg = recent.reduce((s, h) => s + moodScore(h.mood), 0) / recent.length;
        const olderAvg = older.reduce((s, h) => s + moodScore(h.mood), 0) / older.length;
        
        if (recentAvg > olderAvg + 0.5) trend = 'improving';
        else if (recentAvg < olderAvg - 0.5) trend = 'declining';
        else trend = 'stable';
      }
    }

    res.json({ history, trend });
  } catch (error) {
    console.error('[Wellness] History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

/**
 * GET /wellness/resources
 * Get wellness resources
 */
router.get('/resources', async (req, res) => {
  try {
    const resources = getWellnessResources();
    res.json({ resources });
  } catch (error) {
    console.error('[Wellness] Resources error:', error);
    res.status(500).json({ error: 'Failed to get resources' });
  }
});

/**
 * POST /wellness/activity
 * Log user activity (called from frontend)
 */
router.post('/activity', authenticateJWT, async (req, res) => {
  try {
    const { activityType, metadata, duration } = req.body;

    if (!activityType) {
      return void res.status(400).json({ error: 'activityType is required' });
    }

    // Allowed activity types
    const allowedTypes = [
      'LOGIN', 'LOGOUT', 'JOB_VIEW', 'APPLICATION', 'APPLICATION_SUBMITTED',
      'SESSION_START', 'SESSION_END', 'REJECTION_RECEIVED', 'INTERVIEW_SCHEDULED',
      'MENTOR_SESSION', 'COURSE_COMPLETED', 'RESUME_UPDATE'
    ];

    if (!allowedTypes.includes(activityType)) {
      return void res.status(400).json({ error: 'Invalid activity type' });
    }

    await logActivity(req.user.id, activityType, metadata || {}, duration);

    res.json({ success: true });
  } catch (error) {
    console.error('[Wellness] Activity log error:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

export default router;



