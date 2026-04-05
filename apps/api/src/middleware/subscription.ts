/**
 * Subscription Tier Gating Middleware
 * 
 * Checks if the user's subscription tier allows access to specific features.
 * Must be used after authenticateJWT middleware.
 */
import { prisma } from '../db';

// Tier configuration
export const TIER_LIMITS = {
  FREE: { maxJobs: 1, priorityListing: false, analytics: false, apiAccess: false, rapReporting: false, featuredJobs: 0 },
  STARTER: { maxJobs: 5, priorityListing: false, analytics: true, apiAccess: false, rapReporting: false, featuredJobs: 1 },
  PROFESSIONAL: { maxJobs: 20, priorityListing: true, analytics: true, apiAccess: false, rapReporting: false, featuredJobs: 3 },
  ENTERPRISE: { maxJobs: -1, priorityListing: true, analytics: true, apiAccess: true, rapReporting: false, featuredJobs: 10 },
  RAP: { maxJobs: -1, priorityListing: true, analytics: true, apiAccess: true, rapReporting: true, featuredJobs: -1 },
};

// Tier order for comparison
export const TIER_ORDER = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'RAP'];

/**
 * Get user's subscription and limits
 */
export async function getSubscription(userId) {
  let subscription = await prisma.companySubscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    subscription = await prisma.companySubscription.create({
      data: { userId, tier: 'FREE' },
    });
  }

  return {
    ...subscription,
    limits: TIER_LIMITS[subscription.tier] || TIER_LIMITS.FREE,
  };
}

/**
 * Middleware factory: require minimum tier
 * @param {string} minTier - Minimum tier required (e.g., 'STARTER', 'PROFESSIONAL')
 */
export function requireTier(minTier) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return void res.status(401).json({ error: 'Authentication required' });
      }

      const subscription = await getSubscription(userId);
      const userTierIndex = TIER_ORDER.indexOf(subscription.tier);
      const requiredTierIndex = TIER_ORDER.indexOf(minTier);

      if (userTierIndex < requiredTierIndex) {
        return void res.status(403).json({
          error: 'Upgrade required',
          requiredTier: minTier,
          currentTier: subscription.tier,
          message: `This feature requires ${minTier} tier or higher`,
        });
      }

      // Attach subscription to request for use in route handlers
      req.subscription = subscription;
      next();
    } catch (err) {
      console.error('Subscription check error:', err);
      res.status(500).json({ error: 'Failed to verify subscription' });
    }
  };
}

/**
 * Middleware: require analytics access
 */
export function requireAnalytics(req, res, next) {
  return requireTier('STARTER')(req, res, next);
}

/**
 * Middleware: require API access
 */
export function requireApiAccess(req, res, next) {
  return requireTier('ENTERPRISE')(req, res, next);
}

/**
 * Middleware: require RAP reporting access
 */
export function requireRapAccess(req, res, next) {
  return requireTier('RAP')(req, res, next);
}

/**
 * Middleware: check job posting limits
 */
export async function checkJobLimit(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    const subscription = await getSubscription(userId);
    const limits = subscription.limits;

    // -1 means unlimited
    if (limits.maxJobs === -1) {
      req.subscription = subscription;
      return next();
    }

    const activeJobs = await prisma.job.count({
      where: { userId, isActive: true },
    });

    if (activeJobs >= limits.maxJobs) {
      return void res.status(403).json({
        error: 'Job limit reached',
        limit: limits.maxJobs,
        activeJobs,
        message: `Your ${subscription.tier} plan allows ${limits.maxJobs} active job${limits.maxJobs === 1 ? '' : 's'}. Upgrade for more.`,
      });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    console.error('Job limit check error:', err);
    res.status(500).json({ error: 'Failed to check job limit' });
  }
}

/**
 * Middleware: check featured job limits
 */
export async function checkFeaturedLimit(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return void res.status(401).json({ error: 'Authentication required' });
    }

    const subscription = await getSubscription(userId);
    const limits = subscription.limits;

    // -1 means unlimited
    if (limits.featuredJobs === -1) {
      req.subscription = subscription;
      return next();
    }

    // Count currently featured jobs
    const featuredJobs = await prisma.job.count({
      where: { userId, isFeatured: true, isActive: true },
    });

    if (featuredJobs >= limits.featuredJobs) {
      return void res.status(403).json({
        error: 'Featured job limit reached',
        limit: limits.featuredJobs,
        featured: featuredJobs,
        message: `Your ${subscription.tier} plan allows ${limits.featuredJobs} featured job${limits.featuredJobs === 1 ? '' : 's'}. Upgrade for more.`,
      });
    }

    req.subscription = subscription;
    next();
  } catch (err) {
    console.error('Featured limit check error:', err);
    res.status(500).json({ error: 'Failed to check featured limit' });
  }
}

/**
 * Attach subscription to request without blocking
 * Useful for routes that need subscription info but don't require a specific tier
 */
export async function attachSubscription(req, res, next) {
  try {
    const userId = req.user?.id;
    if (userId) {
      req.subscription = await getSubscription(userId);
    }
    next();
  } catch (err) {
    console.error('Attach subscription error:', err);
    next(); // Don't block on error
  }
}

