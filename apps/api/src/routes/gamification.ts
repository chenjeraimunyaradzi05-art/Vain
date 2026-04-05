/**
 * Gamification API Routes
 * 
 * Endpoints for achievements, points, levels, and leaderboards.
 */

import { Router, Request, Response } from 'express';
import { gamificationService, PointsAction } from '../services/gamificationService';
import { authenticate, optionalAuth } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

/**
 * GET /gamification/profile
 * Get current user's gamification profile
 */
router.get('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const profile = await gamificationService.getUserGamificationProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    logger.error('Failed to get gamification profile', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

/**
 * GET /gamification/achievements
 * Get all available achievements
 */
router.get('/achievements', optionalAuth, async (req: Request, res: Response) => {
  try {
    const achievements = gamificationService.getAllAchievements();
    
    // If authenticated, include user's progress
    if (req.user) {
      const userAchievements = await gamificationService.getUserAchievements(req.user.id);
      const earnedCodes = userAchievements.filter(a => a.isComplete).map(a => a.achievement.code);

      const achievementsWithProgress = achievements.map(achievement => ({
        ...achievement,
        earned: earnedCodes.includes(achievement.code),
      }));

      return void res.json({
        success: true,
        data: {
          achievements: achievementsWithProgress,
          earnedCount: earnedCodes.length,
          totalCount: achievements.length,
        },
      });
    }

    res.json({
      success: true,
      data: {
        achievements,
        totalCount: achievements.length,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get achievements', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get achievements' });
  }
});

/**
 * GET /gamification/achievements/user
 * Get current user's earned achievements
 */
router.get('/achievements/user', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const achievements = await gamificationService.getUserAchievements(userId);

    // Group by category
    const byCategory: Record<string, typeof achievements> = {};
    for (const achievement of achievements) {
      const category = achievement.achievement.category;
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(achievement);
    }

    res.json({
      success: true,
      data: {
        achievements,
        byCategory,
        totalEarned: achievements.filter(a => a.isComplete).length,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get user achievements', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get achievements' });
  }
});

/**
 * GET /gamification/levels
 * Get all available levels
 */
router.get('/levels', async (req: Request, res: Response) => {
  try {
    const levels = gamificationService.getAllLevels();

    res.json({
      success: true,
      data: levels,
    });
  } catch (error: any) {
    logger.error('Failed to get levels', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get levels' });
  }
});

/**
 * GET /gamification/leaderboard
 * Get the points leaderboard
 */
router.get('/leaderboard', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { limit = '20', offset = '0', timeframe = 'all' } = req.query;

    const leaderboard = await gamificationService.getLeaderboard({
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      timeframe: timeframe as 'all' | 'month' | 'week',
    });

    // Include current user's rank if authenticated
    let userRank: number | null = null;
    if (req.user) {
      userRank = await gamificationService.getUserRank(req.user.id);
    }

    res.json({
      success: true,
      data: {
        leaderboard,
        userRank,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get leaderboard', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

/**
 * GET /gamification/streak
 * Get current user's login streak
 */
router.get('/streak', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const streak = await gamificationService.getUserStreak(userId);

    res.json({
      success: true,
      data: streak,
    });
  } catch (error: any) {
    logger.error('Failed to get streak', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get streak' });
  }
});

/**
 * POST /gamification/streak/update
 * Update login streak (called on daily login)
 */
router.post('/streak/update', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await gamificationService.updateLoginStreak(userId);

    // Award daily login points
    if (result.streakIncreased) {
      await gamificationService.awardPoints(userId, 'DAILY_LOGIN');
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to update streak', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to update streak' });
  }
});

/**
 * POST /gamification/points/award
 * Award points for an action (internal use / admin)
 */
router.post('/points/award', authenticate, async (req: Request, res: Response) => {
  try {
    const { action, metadata } = req.body;

    if (!action) {
      return void res.status(400).json({ success: false, error: 'Action is required' });
    }

    const userId = req.user!.id;
    const result = await gamificationService.awardPoints(userId, action as PointsAction, metadata);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Failed to award points', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to award points' });
  }
});

/**
 * GET /gamification/points
 * Get current user's points
 */
router.get('/points', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const points = await gamificationService.getUserPoints(userId);
    const level = gamificationService.getLevelForPoints(points);

    res.json({
      success: true,
      data: {
        points,
        level: level.level,
        levelName: level.name,
        levelIcon: level.icon,
      },
    });
  } catch (error: any) {
    logger.error('Failed to get points', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get points' });
  }
});

/**
 * POST /gamification/check-achievements
 * Manually trigger achievement check
 */
router.post('/check-achievements', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const newAchievements = await gamificationService.checkAndAwardAchievements(userId);

    res.json({
      success: true,
      data: {
        newAchievements,
        count: newAchievements.length,
      },
    });
  } catch (error: any) {
    logger.error('Failed to check achievements', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to check achievements' });
  }
});

export default router;

