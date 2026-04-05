// @ts-nocheck
/**
 * Safety & Trust Routes
 * Handles women safety mode, trust scoring, blocking, muting, reporting,
 * and DV-Safe features (quick exit, evidence preservation, hidden rooms)
 */
import express from 'express';
import { prisma as prismaClient } from '../db';
import authenticateJWT from '../middleware/auth';
const prisma = prismaClient as any;
import {
    createSafetyPlan,
    preserveEvidence,
    createHiddenRoom,
    verifyHiddenRoomAccess,
    handleQuickExit,
    getActivityMask,
    getDVSupportResources,
    exportEvidenceBundle,
    notifyEmergencyContacts
} from '../lib/dv-safe';

const router = express.Router();

// =============================================================================
// SAFETY SETTINGS
// =============================================================================

/**
 * GET /safety/settings - Get user's safety settings
 */
router.get('/settings', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    let settings = await prisma.userSafetySettings.findUnique({
      where: { userId }
    });

    // Create default settings if not exists (Safety ON by default)
    if (!settings) {
      settings = await prisma.userSafetySettings.create({
        data: {
          userId,
          safetyLevel: 'standard',
          dmPolicy: 'connections',
          locationVisibility: 'region',
          showInDiscovery: true,
          showInSearch: true,
          showOnlineStatus: false,
          showLastSeen: false,
          feedFilter: 'all',
          hideExplicitContent: true,
          hideUnverifiedUsers: false,
          allowConnectionRequests: true,
          allowMentions: true,
          allowTagging: true,
          hideFromNonConnections: false
        }
      });
    }

    res.json({ settings });
  } catch (err) {
    console.error('Get safety settings error:', err);
    res.status(500).json({ error: 'Failed to fetch safety settings' });
  }
});

/**
 * PUT /safety/settings - Update safety settings
 */
router.put('/settings', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Validate safety level
    if (updates.safetyLevel) {
      const validLevels = ['standard', 'enhanced', 'maximum'];
      if (!validLevels.includes(updates.safetyLevel)) {
        return void res.status(400).json({ error: 'Invalid safety level' });
      }

      // Apply preset settings based on safety level
      if (updates.safetyLevel === 'enhanced') {
        updates.dmPolicy = 'connections';
        updates.locationVisibility = 'country';
        updates.showInDiscovery = false;
        updates.feedFilter = 'following_only';
        updates.allowMentions = false;
      } else if (updates.safetyLevel === 'maximum') {
        updates.dmPolicy = 'verified_only';
        updates.locationVisibility = 'hidden';
        updates.showInDiscovery = false;
        updates.showInSearch = false;
        updates.feedFilter = 'connections_only';
        updates.allowMentions = false;
        updates.allowTagging = false;
        updates.hideFromNonConnections = true;
      }
    }

    // Validate other fields
    if (updates.dmPolicy) {
      const validPolicies = ['everyone', 'connections', 'verified_only', 'nobody'];
      if (!validPolicies.includes(updates.dmPolicy)) {
        return void res.status(400).json({ error: 'Invalid DM policy' });
      }
    }

    if (updates.locationVisibility) {
      const validVisibility = ['exact', 'region', 'country', 'hidden'];
      if (!validVisibility.includes(updates.locationVisibility)) {
        return void res.status(400).json({ error: 'Invalid location visibility' });
      }
    }

    const settings = await prisma.userSafetySettings.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...updates }
    });

    res.json({ settings });
  } catch (err) {
    console.error('Update safety settings error:', err);
    res.status(500).json({ error: 'Failed to update safety settings' });
  }
});

/**
 * POST /safety/quick-lockdown - Emergency lockdown mode
 */
router.post('/quick-lockdown', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await prisma.userSafetySettings.upsert({
      where: { userId },
      update: {
        safetyLevel: 'maximum',
        dmPolicy: 'nobody',
        locationVisibility: 'hidden',
        showInDiscovery: false,
        showInSearch: false,
        showOnlineStatus: false,
        showLastSeen: false,
        feedFilter: 'connections_only',
        allowConnectionRequests: false,
        allowMentions: false,
        allowTagging: false,
        hideFromNonConnections: true
      },
      create: {
        userId,
        safetyLevel: 'maximum',
        dmPolicy: 'nobody',
        locationVisibility: 'hidden',
        showInDiscovery: false,
        showInSearch: false,
        showOnlineStatus: false,
        showLastSeen: false,
        feedFilter: 'connections_only',
        allowConnectionRequests: false,
        allowMentions: false,
        allowTagging: false,
        hideFromNonConnections: true
      }
    });

    res.json({ 
      success: true, 
      message: 'Lockdown mode activated',
      settings 
    });
  } catch (err) {
    console.error('Quick lockdown error:', err);
    res.status(500).json({ error: 'Failed to activate lockdown' });
  }
});

// =============================================================================
// TRUST SCORE
// =============================================================================

/**
 * GET /safety/trust-score - Get user's trust score
 */
router.get('/trust-score', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    let trustScore = await prisma.userTrustScore.findUnique({
      where: { userId }
    });

    // Calculate trust score if not exists or stale
    if (!trustScore || (Date.now() - trustScore.lastCalculatedAt.getTime()) > 24 * 60 * 60 * 1000) {
      trustScore = await calculateTrustScore(userId);
    }

    res.json({ trustScore });
  } catch (err) {
    console.error('Get trust score error:', err);
    res.status(500).json({ error: 'Failed to fetch trust score' });
  }
});

/**
 * Calculate trust score for a user
 */
async function calculateTrustScore(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, email: true }
  });

  if (!user) return null;

  // Account age score (0-100)
  const accountAgeDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const accountAgeScore = Math.min(100, accountAgeDays * 2);

  // Verification score
  const verificationScore = user.email ? 50 : 0; // Basic email verification

  // Activity score - based on recent activity
  const recentPosts = await prisma.socialPost.count({
    where: { authorId: userId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
  });
  const activityScore = Math.min(100, recentPosts * 5);

  // Behavior score - based on reports
  const reportsAgainst = await prisma.contentReport.count({
    where: { targetId: userId, targetType: 'user' }
  });
  const behaviorScore = Math.max(0, 100 - reportsAgainst * 20);

  // Network score - connections
  const connections = await prisma.userConnection.count({
    where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] }
  });
  const networkScore = Math.min(100, connections * 5);

  // Engagement score
  const totalLikes = await prisma.socialReaction.count({
    where: { userId }
  });
  const engagementScore = Math.min(100, totalLikes);

  // Overall score
  const overallScore = Math.round(
    (accountAgeScore * 0.15) +
    (verificationScore * 0.20) +
    (activityScore * 0.15) +
    (behaviorScore * 0.25) +
    (networkScore * 0.15) +
    (engagementScore * 0.10)
  );

  // Determine trust level
  let trustLevel = 'new';
  if (accountAgeDays < 7) {
    trustLevel = 'new';
  } else if (accountAgeDays < 30 || overallScore < 30) {
    trustLevel = 'basic';
  } else if (overallScore < 60) {
    trustLevel = 'established';
  } else if (overallScore < 80) {
    trustLevel = 'trusted';
  } else {
    trustLevel = 'verified';
  }

  // Check for restrictions
  const activeRestriction = await prisma.userRestriction.findFirst({
    where: { userId, isActive: true }
  });
  if (activeRestriction) {
    trustLevel = 'restricted';
  }

  const trustScore = await prisma.userTrustScore.upsert({
    where: { userId },
    update: {
      trustLevel,
      accountAgeScore: Math.round(accountAgeScore),
      verificationScore,
      activityScore,
      behaviorScore,
      networkScore,
      engagementScore,
      overallScore,
      lastCalculatedAt: new Date()
    },
    create: {
      userId,
      trustLevel,
      accountAgeScore: Math.round(accountAgeScore),
      verificationScore,
      activityScore,
      behaviorScore,
      networkScore,
      engagementScore,
      overallScore
    }
  });

  return trustScore;
}

// =============================================================================
// BLOCKING
// =============================================================================

/**
 * GET /safety/blocks - Get blocked users
 */
router.get('/blocks', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const blocks = await prisma.userBlock.findMany({
      where: { blockerId: userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ blocks });
  } catch (err) {
    console.error('Get blocks error:', err);
    res.status(500).json({ error: 'Failed to fetch blocks' });
  }
});

/**
 * POST /safety/blocks - Block a user
 */
router.post('/blocks', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { blockedId, reason } = req.body;

    if (!blockedId) {
      return void res.status(400).json({ error: 'User ID to block is required' });
    }

    if (blockedId === userId) {
      return void res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if already blocked
    const existing = await prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId } }
    });

    if (existing) {
      return void res.status(400).json({ error: 'User already blocked' });
    }

    // Create block
    await prisma.userBlock.create({
      data: { blockerId: userId, blockedId, reason }
    });

    // Remove any existing connections
    await prisma.userConnection.deleteMany({
      where: {
        OR: [
          { requesterId: userId, addresseeId: blockedId },
          { requesterId: blockedId, addresseeId: userId }
        ]
      }
    });

    // Remove any follows
    await prisma.userFollow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: blockedId },
          { followerId: blockedId, followingId: userId }
        ]
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Block user error:', err);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

/**
 * DELETE /safety/blocks/:id - Unblock a user
 */
router.delete('/blocks/:blockedId', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { blockedId } = req.params;

    await prisma.userBlock.delete({
      where: { blockerId_blockedId: { blockerId: userId, blockedId } }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Unblock user error:', err);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// =============================================================================
// MUTING
// =============================================================================

/**
 * GET /safety/mutes - Get muted users
 */
router.get('/mutes', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const mutes = await prisma.userMute.findMany({
      where: { 
        muterId: userId,
        OR: [
          { isPermanent: true },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ mutes });
  } catch (err) {
    console.error('Get mutes error:', err);
    res.status(500).json({ error: 'Failed to fetch mutes' });
  }
});

/**
 * POST /safety/mutes - Mute a user
 */
router.post('/mutes', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mutedId, scope = 'all', duration } = req.body;

    if (!mutedId) {
      return void res.status(400).json({ error: 'User ID to mute is required' });
    }

    const validScopes = ['all', 'posts', 'comments', 'stories'];
    if (!validScopes.includes(scope)) {
      return void res.status(400).json({ error: 'Invalid scope' });
    }

    let expiresAt = null;
    let isPermanent = true;
    if (duration) {
      expiresAt = new Date(Date.now() + duration * 1000);
      isPermanent = false;
    }

    await prisma.userMute.upsert({
      where: { muterId_mutedId: { muterId: userId, mutedId } },
      update: { scope, isPermanent, expiresAt },
      create: { muterId: userId, mutedId, scope, isPermanent, expiresAt }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Mute user error:', err);
    res.status(500).json({ error: 'Failed to mute user' });
  }
});

/**
 * DELETE /safety/mutes/:id - Unmute a user
 */
router.delete('/mutes/:mutedId', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mutedId } = req.params;

    await prisma.userMute.delete({
      where: { muterId_mutedId: { muterId: userId, mutedId } }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Unmute user error:', err);
    res.status(500).json({ error: 'Failed to unmute user' });
  }
});

// =============================================================================
// REPORTING
// =============================================================================

/**
 * POST /safety/report - Report content or user
 */
router.post('/report', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetType, targetId, reason, description, evidence } = req.body;

    const validTypes = ['post', 'comment', 'message', 'user', 'group', 'organization', 'reel'];
    if (!validTypes.includes(targetType)) {
      return void res.status(400).json({ error: 'Invalid target type' });
    }

    const validReasons = ['harassment', 'spam', 'inappropriate', 'impersonation', 'privacy_violation', 'threats', 'other'];
    if (!validReasons.includes(reason)) {
      return void res.status(400).json({ error: 'Invalid reason' });
    }

    // Determine priority
    let priority = 'medium';
    if (reason === 'threats' || reason === 'harassment') {
      priority = 'high';
    }
    if (reason === 'spam') {
      priority = 'low';
    }

    const report = await prisma.contentReport.create({
      data: {
        reporterId: userId,
        targetType,
        targetId,
        reason,
        description,
        evidence: evidence ? JSON.stringify(evidence) : null,
        priority
      }
    });

    // Increment report count on target
    if (targetType === 'post') {
      await prisma.socialPost.update({
        where: { id: targetId },
        data: { reportCount: { increment: 1 } }
      });
    } else if (targetType === 'comment') {
      await prisma.socialComment.update({
        where: { id: targetId },
        data: { reportCount: { increment: 1 } }
      });
    }

    res.json({ 
      success: true, 
      reportId: report.id,
      message: 'Report submitted. Our team will review it shortly.' 
    });
  } catch (err) {
    console.error('Submit report error:', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

/**
 * POST /safety/incident - Report a safety incident
 */
router.post('/incident', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId, incidentType, description, evidence } = req.body;

    const validTypes = ['harassment', 'unwanted_contact', 'threatening', 'stalking', 'other'];
    if (!validTypes.includes(incidentType)) {
      return void res.status(400).json({ error: 'Invalid incident type' });
    }

    const incident = await prisma.safetyIncident.create({
      data: {
        reporterId: userId,
        targetUserId,
        incidentType,
        description,
        evidence: evidence ? JSON.stringify(evidence) : null
      }
    });

    // Update trust score for reported user
    if (targetUserId) {
      await prisma.userTrustScore.updateMany({
        where: { userId: targetUserId },
        data: { reportsAgainst: { increment: 1 } }
      });
    }

    res.json({ 
      success: true, 
      incidentId: incident.id,
      message: 'Safety incident reported. Our safety team will prioritize this.' 
    });
  } catch (err) {
    console.error('Report incident error:', err);
    res.status(500).json({ error: 'Failed to report incident' });
  }
});

// =============================================================================
// COMMUNITY SUPPORT
// =============================================================================

/**
 * GET /safety/community-support - Get community support settings
 */
router.get('/community-support', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    let support = await prisma.communitySupport.findUnique({
      where: { userId }
    });

    if (!support) {
      support = { userId, dataConsent: false };
    }

    res.json({ support });
  } catch (err) {
    console.error('Get community support error:', err);
    res.status(500).json({ error: 'Failed to fetch community support settings' });
  }
});

/**
 * PUT /safety/community-support - Update community support settings
 */
router.put('/community-support', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // This data is sensitive - require explicit consent
    if (!updates.dataConsent) {
      return void res.status(400).json({ error: 'Data consent is required to store this information' });
    }

    updates.consentedAt = new Date();

    const support = await prisma.communitySupport.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...updates }
    });

    res.json({ support });
  } catch (err) {
    console.error('Update community support error:', err);
    res.status(500).json({ error: 'Failed to update community support settings' });
  }
});

/**
 * GET /safety/accessibility - Get accessibility preferences
 */
router.get('/accessibility', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    let prefs = await prisma.accessibilityPreference.findUnique({
      where: { userId }
    });

    if (!prefs) {
      prefs = await prisma.accessibilityPreference.create({
        data: { userId }
      });
    }

    res.json({ preferences: prefs });
  } catch (err) {
    console.error('Get accessibility prefs error:', err);
    res.status(500).json({ error: 'Failed to fetch accessibility preferences' });
  }
});

/**
 * PUT /safety/accessibility - Update accessibility preferences
 */
router.put('/accessibility', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    const prefs = await prisma.accessibilityPreference.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...updates }
    });

    res.json({ preferences: prefs });
  } catch (err) {
    console.error('Update accessibility prefs error:', err);
    res.status(500).json({ error: 'Failed to update accessibility preferences' });
  }
});

// =============================================================================
// ADMIN MODERATION TRIAGE ENDPOINTS
// =============================================================================

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  const role = String(req.user?.role || req.user?.userType || '').toLowerCase();
  if (role !== 'admin' && role !== 'super_admin') {
    return void res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * GET /safety/admin/reports - List all content reports for admin triage
 * Query params:
 * - status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' (default: PENDING)
 * - priority: 'high' | 'medium' | 'low'
 * - page: number (default: 1)
 * - limit: number (default: 20)
 */
router.get('/admin/reports', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'PENDING').toUpperCase();
    const priority = req.query.priority ? String(req.query.priority).toLowerCase() : undefined;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);
    const skip = (page - 1) * limit;

    const where: any = { status };
    if (priority) {
      where.priority = priority;
    }

    const [reports, total] = await Promise.all([
      prisma.contentReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          reporter: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.contentReport.count({ where }),
    ]);

    res.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Admin list reports error:', err);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

/**
 * GET /safety/admin/reports/:id - Get a single report with full details
 */
router.get('/admin/reports/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.contentReport.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!report) {
      return void res.status(404).json({ error: 'Report not found' });
    }

    // Fetch the target content
    let targetContent = null;
    if (report.targetType === 'post') {
      targetContent = await prisma.socialPost.findUnique({
        where: { id: report.targetId },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }).catch(() => null);
    } else if (report.targetType === 'comment') {
      targetContent = await prisma.socialComment.findUnique({
        where: { id: report.targetId },
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }).catch(() => null);
    } else if (report.targetType === 'user') {
      targetContent = await prisma.user.findUnique({
        where: { id: report.targetId },
        select: { id: true, firstName: true, lastName: true, email: true },
      }).catch(() => null);
    }

    res.json({
      report,
      targetContent,
    });
  } catch (err) {
    console.error('Admin get report error:', err);
    res.status(500).json({ error: 'Failed to get report' });
  }
});

/**
 * PATCH /safety/admin/reports/:id - Update report status (assign, resolve, dismiss)
 * Body:
 * - status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'
 * - resolution?: string (notes about the resolution)
 * - action?: 'warn' | 'hide_content' | 'suspend_user' | 'ban_user' | 'none'
 */
router.patch('/admin/reports/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, action } = req.body;
    const adminId = req.user.id;

    const validStatuses = ['UNDER_REVIEW', 'RESOLVED', 'DISMISSED'];
    if (status && !validStatuses.includes(status)) {
      return void res.status(400).json({ error: 'Invalid status' });
    }

    const validActions = ['warn', 'hide_content', 'suspend_user', 'ban_user', 'none'];
    if (action && !validActions.includes(action)) {
      return void res.status(400).json({ error: 'Invalid action' });
    }

    const report = await prisma.contentReport.findUnique({ where: { id } });
    if (!report) {
      return void res.status(404).json({ error: 'Report not found' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (resolution) updateData.resolution = resolution;
    if (action) updateData.actionTaken = action;
    updateData.reviewedById = adminId;
    updateData.reviewedAt = new Date();

    const updated = await prisma.contentReport.update({
      where: { id },
      data: updateData,
    });

    // Execute the action if provided
    if (action && status === 'RESOLVED') {
      try {
        if (action === 'hide_content') {
          if (report.targetType === 'post') {
            await prisma.socialPost.update({
              where: { id: report.targetId },
              data: { isHidden: true },
            });
          } else if (report.targetType === 'comment') {
            await prisma.socialComment.update({
              where: { id: report.targetId },
              data: { isHidden: true },
            });
          }
        } else if (action === 'suspend_user' || action === 'ban_user') {
          // Get the content author
          let authorId = null;
          if (report.targetType === 'post') {
            const post = await prisma.socialPost.findUnique({ where: { id: report.targetId } });
            authorId = post?.authorId;
          } else if (report.targetType === 'comment') {
            const comment = await prisma.socialComment.findUnique({ where: { id: report.targetId } });
            authorId = comment?.authorId;
          } else if (report.targetType === 'user') {
            authorId = report.targetId;
          }

          if (authorId) {
            await prisma.user.update({
              where: { id: authorId },
              data: { 
                status: action === 'ban_user' ? 'BANNED' : 'SUSPENDED',
                suspendedAt: new Date(),
                suspendedReason: resolution || 'Violation of community guidelines',
              },
            });
          }
        }
      } catch (actionErr) {
        console.warn('Failed to execute moderation action:', actionErr);
      }
    }

    res.json({ report: updated });
  } catch (err) {
    console.error('Admin update report error:', err);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

/**
 * GET /safety/admin/incidents - List safety incidents for admin review
 */
router.get('/admin/incidents', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const status = String(req.query.status || 'PENDING').toUpperCase();
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = Math.min(parseInt(String(req.query.limit || '20'), 10), 100);
    const skip = (page - 1) * limit;

    const where: any = { status };

    const [incidents, total] = await Promise.all([
      prisma.safetyIncident.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { id: true, firstName: true, lastName: true },
          },
          targetUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.safetyIncident.count({ where }),
    ]);

    res.json({
      incidents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('Admin list incidents error:', err);
    res.status(500).json({ error: 'Failed to list incidents' });
  }
});

/**
 * PATCH /safety/admin/incidents/:id - Update incident status
 */
router.patch('/admin/incidents/:id', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution, action } = req.body;
    const adminId = req.user.id;

    const incident = await prisma.safetyIncident.findUnique({ where: { id } });
    if (!incident) {
      return void res.status(404).json({ error: 'Incident not found' });
    }

    const updated = await prisma.safetyIncident.update({
      where: { id },
      data: {
        status: status || incident.status,
        resolution,
        actionTaken: action,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    res.json({ incident: updated });
  } catch (err) {
    console.error('Admin update incident error:', err);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

/**
 * GET /safety/admin/stats - Get moderation statistics
 */
router.get('/admin/stats', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      pendingReports,
      pendingIncidents,
      resolvedLast24h,
      resolvedLast7d,
      reportsByPriority,
      reportsByReason,
    ] = await Promise.all([
      prisma.contentReport.count({ where: { status: 'PENDING' } }),
      prisma.safetyIncident.count({ where: { status: 'PENDING' } }),
      prisma.contentReport.count({
        where: { status: 'RESOLVED', reviewedAt: { gte: last24h } },
      }),
      prisma.contentReport.count({
        where: { status: 'RESOLVED', reviewedAt: { gte: last7d } },
      }),
      prisma.contentReport.groupBy({
        by: ['priority'],
        where: { status: 'PENDING' },
        _count: true,
      }),
      prisma.contentReport.groupBy({
        by: ['reason'],
        where: { status: 'PENDING' },
        _count: true,
      }),
    ]);

    res.json({
      pending: {
        reports: pendingReports,
        incidents: pendingIncidents,
      },
      resolved: {
        last24h: resolvedLast24h,
        last7d: resolvedLast7d,
      },
      breakdown: {
        byPriority: reportsByPriority.map(r => ({ priority: r.priority, count: r._count })),
        byReason: reportsByReason.map(r => ({ reason: r.reason, count: r._count })),
      },
    });
  } catch (err) {
    console.error('Admin moderation stats error:', err);
    res.status(500).json({ error: 'Failed to get moderation stats' });
  }
});

// =============================================================================
// DV-SAFE FEATURES - Domestic Violence Safety Module
// =============================================================================

/**
 * POST /safety/dv/plan - Create or update DV safety plan
 */
router.post('/dv/plan', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { emergencyContacts, safeWords, quickExitUrl, activityMaskingEnabled } = req.body;
        
        const plan = await createSafetyPlan(userId, {
            emergencyContacts,
            safeWords,
            quickExitUrl,
            activityMaskingEnabled
        });
        
        res.json({ 
            ok: true, 
            plan: {
                id: plan.id,
                quickExitEnabled: plan.quickExitEnabled,
                activityMaskingEnabled: plan.activityMaskingEnabled,
                contactCount: plan.emergencyContacts.length,
                safeWordCount: plan.safeWords.length
            }
        });
    } catch (error) {
        console.error('Error creating safety plan:', error);
        res.status(500).json({ error: 'Failed to create safety plan' });
    }
});

/**
 * POST /safety/dv/quick-exit - Trigger quick exit (clears session, redirects to safe URL)
 */
router.post('/dv/quick-exit', async (req, res) => {
    try {
        // Note: No auth required - quick exit must work even without valid session
        const { userId } = req.body;
        
        const result = await handleQuickExit(userId);
        
        res.json({
            ok: true,
            redirectUrl: result.redirectUrl,
            actionsTriggered: result.actionsTriggered
        });
    } catch (error) {
        console.error('Error during quick exit:', error);
        // Still return a safe redirect even on error
        res.json({
            ok: true,
            redirectUrl: 'https://www.google.com',
            actionsTriggered: []
        });
    }
});

/**
 * POST /safety/dv/evidence - Preserve evidence with encryption
 */
router.post('/dv/evidence', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, content, source, notes } = req.body;
        
        if (!type || !content) {
            return void res.status(400).json({ error: 'type and content are required' });
        }
        
        const validTypes = ['screenshot', 'message', 'document', 'audio', 'note'];
        if (!validTypes.includes(type)) {
            return void res.status(400).json({ error: 'Invalid evidence type' });
        }
        
        const evidence = await preserveEvidence(userId, type, content, { source, notes });
        
        res.json({
            ok: true,
            evidence: {
                id: evidence.id,
                type: evidence.type,
                hash: evidence.hash,
                createdAt: evidence.createdAt
            }
        });
    } catch (error) {
        console.error('Error preserving evidence:', error);
        res.status(500).json({ error: 'Failed to preserve evidence' });
    }
});

/**
 * POST /safety/dv/evidence/export - Export encrypted evidence bundle for legal use
 */
router.post('/dv/evidence/export', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { evidenceIds, exportPassword } = req.body;
        
        if (!evidenceIds || !exportPassword) {
            return void res.status(400).json({ error: 'evidenceIds and exportPassword are required' });
        }
        
        if (exportPassword.length < 8) {
            return void res.status(400).json({ error: 'Export password must be at least 8 characters' });
        }
        
        const bundle = await exportEvidenceBundle(userId, evidenceIds, exportPassword);
        
        res.json({
            ok: true,
            bundle: {
                bundleId: bundle.bundleId,
                integrityHash: bundle.integrityHash,
                itemCount: bundle.itemCount,
                downloadReady: true
            }
        });
    } catch (error) {
        console.error('Error exporting evidence:', error);
        res.status(500).json({ error: 'Failed to export evidence' });
    }
});

/**
 * POST /safety/dv/hidden-room - Create a hidden chat room
 */
router.post('/dv/hidden-room', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, accessCode, invitedUserIds, autoDeleteAfterHours } = req.body;
        
        if (!name || !accessCode) {
            return void res.status(400).json({ error: 'name and accessCode are required' });
        }
        
        if (accessCode.length < 6) {
            return void res.status(400).json({ error: 'Access code must be at least 6 characters' });
        }
        
        const room = await createHiddenRoom(userId, {
            name,
            accessCode,
            invitedUserIds,
            autoDeleteAfterHours
        });
        
        res.json({
            ok: true,
            room: {
                id: room.id,
                name: room.name,
                participantCount: room.participants.length,
                isEncrypted: room.isEncrypted,
                autoDeleteAfterHours: room.autoDeleteAfterHours
            }
        });
    } catch (error) {
        console.error('Error creating hidden room:', error);
        res.status(500).json({ error: 'Failed to create hidden room' });
    }
});

/**
 * POST /safety/dv/hidden-room/verify - Verify access to hidden room
 */
router.post('/dv/hidden-room/verify', async (req, res) => {
    try {
        const { accessCode, storedHashedCode } = req.body;
        
        if (!accessCode || !storedHashedCode) {
            return void res.status(400).json({ error: 'accessCode and storedHashedCode are required' });
        }
        
        const hasAccess = verifyHiddenRoomAccess(accessCode, storedHashedCode);
        
        res.json({
            ok: true,
            hasAccess
        });
    } catch (error) {
        console.error('Error verifying room access:', error);
        res.status(500).json({ error: 'Failed to verify access' });
    }
});

/**
 * GET /safety/dv/activity-mask - Get activity mask for browser (innocuous app appearance)
 */
router.get('/dv/activity-mask', (req, res) => {
    try {
        const mask = getActivityMask();
        
        res.json({
            ok: true,
            mask
        });
    } catch (error) {
        console.error('Error getting activity mask:', error);
        res.status(500).json({ error: 'Failed to get activity mask' });
    }
});

/**
 * GET /safety/dv/resources - Get DV support resources (hotlines, shelters, legal aid)
 */
router.get('/dv/resources', (req, res) => {
    try {
        const { region } = req.query;
        
        const resources = getDVSupportResources(region as string);
        
        res.json({
            ok: true,
            resources,
            disclaimer: 'If you are in immediate danger, please call 000 (Australia) or your local emergency services.'
        });
    } catch (error) {
        console.error('Error getting resources:', error);
        res.status(500).json({ error: 'Failed to get resources' });
    }
});

/**
 * POST /safety/dv/emergency-notify - Notify emergency contacts
 */
router.post('/dv/emergency-notify', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { contacts, reason } = req.body;
        
        if (!contacts || !Array.isArray(contacts)) {
            return void res.status(400).json({ error: 'contacts array is required' });
        }
        
        const validReasons = ['safe_word', 'quick_exit', 'manual'];
        const normalizedReason = validReasons.includes(reason) ? reason : 'manual';
        
        const result = await notifyEmergencyContacts(userId, contacts, normalizedReason);
        
        res.json({
            ok: true,
            result
        });
    } catch (error) {
        console.error('Error notifying contacts:', error);
        res.status(500).json({ error: 'Failed to notify contacts' });
    }
});

export default router;



