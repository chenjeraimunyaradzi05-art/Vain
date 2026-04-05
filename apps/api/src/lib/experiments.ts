/**
 * A/B Testing (Experiments) Framework
 * 
 * Simple feature flag and experiment system for:
 * - Feature flags (on/off)
 * - A/B tests (variant assignment)
 * - Multivariate tests (multiple variants)
 * 
 * Experiments are stored in database and can be managed via admin UI.
 */

import { prisma } from '../db';
import crypto from 'crypto';

// In-memory cache for experiments (refresh every 5 minutes)
let experimentCache = new Map();
let cacheLastUpdated = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Hash function for consistent variant assignment
 * Uses user ID + experiment ID to ensure same user always gets same variant
 * Uses SHA256 for security (MD5 is cryptographically weak)
 */
function hashAssignment(userId, experimentId, variants) {
  const hash = crypto
    .createHash('sha256')
    .update(`${userId}:${experimentId}`)
    .digest('hex');
  
  // Convert first 8 chars of hash to number (0-1 range)
  const hashNum = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  
  // Distribute across variants based on traffic allocation
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.allocation;
    if (hashNum <= cumulative) {
      return variant.name;
    }
  }
  
  // Fallback to control
  return 'control';
}

/**
 * Refresh experiment cache from database
 */
async function refreshCache() {
  try {
    const experiments = await prisma.experiment.findMany({
      where: { 
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      include: {
        variants: true
      }
    });
    
    experimentCache = new Map(
      experiments.map(exp => [exp.name, exp])
    );
    cacheLastUpdated = Date.now();
    
    console.log(`[Experiments] Cache refreshed with ${experiments.length} active experiments`);
  } catch (error) {
    console.error('[Experiments] Cache refresh error:', error);
  }
}

/**
 * Get experiment by name
 */
async function getExperiment(name) {
  // Check if cache needs refresh
  if (Date.now() - cacheLastUpdated > CACHE_TTL) {
    await refreshCache();
  }
  
  return experimentCache.get(name);
}

/**
 * Get variant for a user in an experiment
 * 
 * @param {string} experimentName - Name of the experiment
 * @param {string} userId - User ID (or anonymous ID)
 * @param {object} options - Optional targeting criteria
 * @returns {string|null} Variant name or null if not in experiment
 */
async function getVariant(experimentName, userId, options: any = {}) {
  try {
    const experiment = await getExperiment(experimentName);
    
    if (!experiment) {
      return null;
    }
    
    // Check targeting rules
    if (experiment.targetingRules) {
      const rules: any = JSON.parse(experiment.targetingRules);
      
      // User type targeting
      if (rules.userTypes && !rules.userTypes.includes(options.userType)) {
        return null;
      }
      
      // Location targeting
      if (rules.locations && !rules.locations.includes(options.location)) {
        return null;
      }
      
      // Percentage rollout
      if (rules.rolloutPercent && rules.rolloutPercent < 100) {
        const rolloutHash = crypto
          .createHash('sha256')
          .update(`rollout:${userId}:${experimentName}`)
          .digest('hex');
        const rolloutNum = parseInt(rolloutHash.substring(0, 8), 16) / 0xffffffff * 100;
        if (rolloutNum > rules.rolloutPercent) {
          return null;
        }
      }
    }
    
    // Get variants with allocations
    const variants = experiment.variants.map(v => ({
      name: v.name,
      allocation: v.allocation / 100 // Convert percentage to decimal
    }));
    
    // Assign variant
    const assignedVariant = hashAssignment(userId, experiment.id, variants);
    
    // Log assignment (for analytics)
    await logAssignment(experiment.id, userId, assignedVariant);
    
    return assignedVariant;
  } catch (error) {
    console.error('[Experiments] getVariant error:', error);
    return null;
  }
}

/**
 * Check if a feature flag is enabled
 * 
 * @param {string} flagName - Name of the feature flag
 * @param {string} userId - User ID
 * @returns {boolean} Whether the feature is enabled
 */
async function isFeatureEnabled(flagName, userId = null) {
  const variant = await getVariant(flagName, userId || 'anonymous');
  return variant === 'enabled' || variant === 'treatment';
}

/**
 * Log experiment assignment for analytics
 */
async function logAssignment(experimentId, userId, variant) {
  try {
    // Upsert to avoid duplicate entries
    await prisma.experimentAssignment.upsert({
      where: {
        experimentId_userId: { experimentId, userId }
      },
      update: {
        variant,
        lastSeen: new Date()
      },
      create: {
        experimentId,
        userId,
        variant
      }
    });
  } catch (error) {
    // Non-critical, just log
    console.error('[Experiments] Log assignment error:', error.message);
  }
}

/**
 * Track a conversion event for an experiment
 * 
 * @param {string} experimentName - Name of the experiment
 * @param {string} userId - User ID
 * @param {string} eventName - Name of the conversion event
 * @param {object} metadata - Optional metadata
 */
async function trackConversion(experimentName, userId, eventName, metadata = {}) {
  try {
    const experiment = await getExperiment(experimentName);
    if (!experiment) return;
    
    // Get user's assignment
    const assignment = await prisma.experimentAssignment.findUnique({
      where: {
        experimentId_userId: { experimentId: experiment.id, userId }
      }
    });
    
    if (!assignment) return;
    
    // Log conversion
    await prisma.experimentConversion.create({
      data: {
        experimentId: experiment.id,
        assignmentId: assignment.id,
        userId,
        variant: assignment.variant,
        eventName,
        metadata: JSON.stringify(metadata)
      }
    });
    
    console.log(`[Experiments] Conversion tracked: ${experimentName}/${eventName} for ${userId}`);
  } catch (error) {
    console.error('[Experiments] Track conversion error:', error);
  }
}

/**
 * Get experiment results/statistics
 */
async function getExperimentResults(experimentId) {
  try {
    const experiment = await prisma.experiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: true,
        assignments: true,
        conversions: true
      }
    });
    
    if (!experiment) return null;
    
    // Calculate stats per variant
    const results = {};
    
    for (const variant of experiment.variants) {
      const variantAssignments = experiment.assignments.filter(
        a => a.variant === variant.name
      );
      const variantConversions = experiment.conversions.filter(
        c => c.variant === variant.name
      );
      
      const conversionsByEvent = {};
      variantConversions.forEach(c => {
        conversionsByEvent[c.eventName] = (conversionsByEvent[c.eventName] || 0) + 1;
      });
      
      results[variant.name] = {
        participants: variantAssignments.length,
        conversions: variantConversions.length,
        conversionRate: variantAssignments.length > 0
          ? (variantConversions.length / variantAssignments.length * 100).toFixed(2)
          : 0,
        conversionsByEvent
      };
    }
    
    return {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        description: experiment.description,
        startDate: experiment.startDate,
        endDate: experiment.endDate,
        isActive: experiment.isActive
      },
      variants: experiment.variants,
      results,
      totalParticipants: experiment.assignments.length,
      totalConversions: experiment.conversions.length
    };
  } catch (error) {
    console.error('[Experiments] Get results error:', error);
    return null;
  }
}

/**
 * Create a new experiment
 */
async function createExperiment(data) {
  const { name, description, variants, targetingRules, startDate, endDate } = data;
  
  // Validate variants add up to 100%
  const totalAllocation = variants.reduce((sum, v) => sum + v.allocation, 0);
  if (Math.abs(totalAllocation - 100) > 0.01) {
    throw new Error('Variant allocations must sum to 100%');
  }
  
  const experiment = await prisma.experiment.create({
    data: {
      name,
      description,
      targetingRules: targetingRules ? JSON.stringify(targetingRules) : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      isActive: true,
      variants: {
        create: variants.map(v => ({
          name: v.name,
          description: v.description || '',
          allocation: v.allocation
        }))
      }
    },
    include: { variants: true }
  });
  
  // Refresh cache
  await refreshCache();
  
  return experiment;
}

/**
 * Update experiment status
 */
async function updateExperimentStatus(experimentId, isActive) {
  const experiment = await prisma.experiment.update({
    where: { id: experimentId },
    data: { isActive }
  });
  
  await refreshCache();
  return experiment;
}

export {
  getVariant,
  isFeatureEnabled,
  trackConversion,
  getExperimentResults,
  createExperiment,
  updateExperimentStatus,
  refreshCache
};
