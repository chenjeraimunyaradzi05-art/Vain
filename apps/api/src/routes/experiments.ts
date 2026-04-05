/**
 * Experiments API Routes
 * 
 * Public and admin endpoints for A/B testing:
 * - POST /experiments/variant - Get variant assignment
 * - POST /experiments/convert - Track conversion
 * - GET /admin/experiments - List all experiments (admin)
 * - POST /admin/experiments - Create experiment (admin)
 * - PATCH /admin/experiments/:id - Update experiment (admin)
 */

import express from 'express';
import authenticateJWT from '../middleware/auth';
import {
  getVariant,
  trackConversion,
  getExperimentResults,
  createExperiment,
  updateExperimentStatus
} from '../lib/experiments';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * POST /experiments/variant
 * Get the variant assignment for a user in an experiment
 */
router.post('/variant', async (req, res) => {
  try {
    const { experimentName, anonymousId, userType, location } = req.body;

    if (!experimentName) {
      return void res.status(400).json({ error: 'experimentName is required' });
    }

    // Get user ID from token if available, otherwise use anonymous ID
    let userId = anonymousId || 'anonymous';
    
    // Try to extract user from token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ngurra-secret') as any;
        userId = decoded.id || decoded.userId || userId;
      } catch {
        // Token invalid, use anonymous ID
      }
    }

    const variant = await getVariant(experimentName, userId, { userType, location });

    res.json({ 
      experiment: experimentName,
      variant: variant || 'control',
      userId: userId.startsWith('anon_') ? undefined : userId
    });
  } catch (error) {
    console.error('[Experiments] Get variant error:', error);
    res.status(500).json({ error: 'Failed to get variant' });
  }
});

/**
 * POST /experiments/convert
 * Track a conversion event for an experiment
 */
router.post('/convert', async (req, res) => {
  try {
    const { experimentName, eventName, anonymousId, metadata } = req.body;

    if (!experimentName || !eventName) {
      return void res.status(400).json({ error: 'experimentName and eventName are required' });
    }

    // Get user ID
    let userId = anonymousId || 'anonymous';
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ngurra-secret') as any;
        userId = decoded.id || decoded.userId || userId;
      } catch {
        // Use anonymous
      }
    }

    await trackConversion(experimentName, userId, eventName, metadata);

    res.json({ success: true });
  } catch (error) {
    console.error('[Experiments] Track conversion error:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// Admin routes require authentication
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return void res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * GET /admin/experiments
 * List all experiments (admin only)
 */
router.get('/admin', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const experiments = await prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
        _count: {
          select: {
            assignments: true,
            conversions: true
          }
        }
      }
    });

    // Add results summary
    const experimentsWithResults = await Promise.all(
      experiments.map(async (exp) => {
        const results = await getExperimentResults(exp.id);
        return {
          ...exp,
          results: results?.results || {}
        };
      })
    );

    res.json({ experiments: experimentsWithResults });
  } catch (error) {
    console.error('[Experiments] List error:', error);
    res.status(500).json({ error: 'Failed to list experiments' });
  }
});

/**
 * POST /admin/experiments
 * Create a new experiment (admin only)
 */
router.post('/admin', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { name, description, variants, targetingRules, endDate } = req.body;

    if (!name || !variants || variants.length < 2) {
      return void res.status(400).json({ 
        error: 'name and at least 2 variants are required' 
      });
    }

    const experiment = await createExperiment({
      name,
      description,
      variants,
      targetingRules,
      endDate
    });

    res.status(201).json({ experiment });
  } catch (error) {
    console.error('[Experiments] Create error:', error);
    res.status(500).json({ error: error.message || 'Failed to create experiment' });
  }
});

/**
 * PATCH /admin/experiments/:id
 * Update experiment status (admin only)
 */
router.patch('/admin/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return void res.status(400).json({ error: 'isActive boolean is required' });
    }

    const experiment = await updateExperimentStatus(id, isActive);

    res.json({ experiment });
  } catch (error) {
    console.error('[Experiments] Update error:', error);
    res.status(500).json({ error: 'Failed to update experiment' });
  }
});

/**
 * GET /admin/experiments/:id/results
 * Get detailed results for an experiment (admin only)
 */
router.get('/admin/:id/results', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const results = await getExperimentResults(id);

    if (!results) {
      return void res.status(404).json({ error: 'Experiment not found' });
    }

    res.json(results);
  } catch (error) {
    console.error('[Experiments] Results error:', error);
    res.status(500).json({ error: 'Failed to get results' });
  }
});

export default router;



