"use strict";

/**
 * Feature Flags API Routes
 * 
 * Endpoints for feature flag evaluation:
 * - GET /feature-flags - Get all evaluated flags for current user
 * - GET /feature-flags/:key - Get single flag value
 */

const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const { featureFlags } = require('../lib/featureFlags');

const router = express.Router();

/**
 * GET /feature-flags
 * Get all evaluated feature flags for the current user
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const context = {
      userId: req.user?.id,
      userType: req.user?.type,
    };

    const flags = featureFlags.getClientFlags(context);
    
    res.json(flags);
  } catch (error) {
    console.error('[Feature Flags] Get all flags error:', error);
    res.status(500).json({ error: 'Failed to get feature flags' });
  }
});

/**
 * GET /feature-flags/:key
 * Get a single feature flag value
 */
router.get('/:key', optionalAuth, async (req, res) => {
  try {
    const { key } = req.params;
    
    const context = {
      userId: req.user?.id,
      userType: req.user?.type,
    };

    const flag = featureFlags.getFlag(key);
    
    if (!flag) {
      return void res.status(404).json({ error: 'Flag not found' });
    }
    
    const value = featureFlags.evaluate(key, context);
    
    res.json({ key, value });
  } catch (error) {
    console.error('[Feature Flags] Get flag error:', error);
    res.status(500).json({ error: 'Failed to get feature flag' });
  }
});

export default router;


