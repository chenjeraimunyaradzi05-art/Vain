import express from 'express';
import { prisma } from '../db';
import auth from '../middleware/auth';
import { issueBadge, issueCourseCompletionBadge } from '../lib/badges';

const router = express.Router();
const authenticate = auth.authenticate;

// =============================================================================
// BADGE DEFINITIONS
// =============================================================================

/**
 * GET /badges - List all available badges
 */
router.get('/', async (req, res) => {
  try {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    res.json({ badges });
  } catch (err) {
    console.error('List badges error:', err);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// =============================================================================
// USER BADGES (placed before /:id to avoid route capture)
// =============================================================================

/**
 * GET /badges/user/me - Get current user's earned badges
 */
router.get('/user/me', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });

    res.json({ badges: userBadges });
  } catch (err) {
    console.error('Get user badges error:', err);
    res.status(500).json({ error: 'Failed to fetch user badges' });
  }
});

/**
 * GET /badges/user/:userId - Get a user's public badges
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
    });

    res.json({ badges: userBadges });
  } catch (err) {
    console.error('Get user public badges error:', err);
    res.status(500).json({ error: 'Failed to fetch user badges' });
  }
});

// =============================================================================
// SHAREABLE BADGE VERIFICATION (defined before /:id)
// =============================================================================

/**
 * GET /badges/verify/:token - Verify a shared badge
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const userBadge = await prisma.userBadge.findFirst({
      where: {
        badgeJson: {
          contains: token,
        },
      },
    });

    if (!userBadge) {
      return void res.status(404).json({ error: 'Badge not found or invalid token' });
    }

    if (userBadge.expiresAt && userBadge.expiresAt < new Date()) {
      return void res.status(410).json({ error: 'Badge has expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userBadge.userId },
      select: { id: true, email: true },
    });

    let metadata: any = null;
    try {
      metadata = userBadge.badgeJson ? JSON.parse(userBadge.badgeJson) : null;
    } catch (e) {
      metadata = null;
    }

    res.json({
      verified: true,
      badge: {
        name: userBadge.name,
        description: userBadge.description,
        imageUrl: userBadge.imageUrl,
        issuerName: userBadge.issuerName,
        badgeType: userBadge.badgeType,
        expiresAt: userBadge.expiresAt,
        issuedAt: userBadge.issuedAt,
        verificationUrl: userBadge.verificationUrl,
        metadata,
      },
      user: user ? { id: user.id, email: user.email } : null,
    });
  } catch (err) {
    console.error('Verify badge error:', err);
    res.status(500).json({ error: 'Failed to verify badge' });
  }
});

/**
 * GET /badges/:id - Get badge details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const badge = await prisma.badge.findUnique({
      where: { id },
    });

    if (!badge) {
      return void res.status(404).json({ error: 'Badge not found' });
    }

    res.json({ badge });
  } catch (err) {
    console.error('Get badge error:', err);
    res.status(500).json({ error: 'Failed to fetch badge' });
  }
});

// =============================================================================
// SHAREABLE BADGE VERIFICATION
// =============================================================================

// =============================================================================
// BADGE ISSUANCE (Internal/Admin)
// =============================================================================

/**
 * POST /badges/issue - Issue a badge to a user (admin/system use)
 */
router.post('/issue', authenticate, async (req, res) => {
  try {
    const { userId, badgeId, evidenceUrl, expiresAt, metadata } = req.body;

    const userBadge = await issueBadge({
      prisma,
      userId,
      badgeId,
      evidenceUrl,
      expiresAt,
      metadata,
    });

    res.status(201).json({ userBadge });
  } catch (err) {
    if (err.statusCode) {
      return void res.status(err.statusCode).json({ error: err.message });
    }
    if (err.code === 'P2002') {
      return void res.status(409).json({ error: 'User already has this badge' });
    }
    console.error('Issue badge error:', err);
    res.status(500).json({ error: 'Failed to issue badge' });
  }
});

/**
 * POST /badges/issue-for-course - Issue badge for course completion
 */
router.post('/issue-for-course', async (req, res) => {
  try {
    const { userId, courseId, enrolmentId } = req.body;

    const userBadge = await issueCourseCompletionBadge({
      prisma,
      userId,
      courseId,
      enrolmentId,
    });

    res.status(201).json({ userBadge });
  } catch (err) {
    if (err.statusCode) {
      return void res.status(err.statusCode).json({ error: err.message });
    }
    if (err.code === 'P2002') {
      return void res.status(409).json({ error: 'Badge already issued' });
    }
    console.error('Issue course badge error:', err);
    res.status(500).json({ error: 'Failed to issue course badge' });
  }
});

export default router;


