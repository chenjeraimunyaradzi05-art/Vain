// @ts-nocheck
/**
 * Data Sovereignty Framework Routes
 * Implements Indigenous Data Sovereignty principles including:
 * - Full data export (GDPR-style portability)
 * - Consent management
 * - Community Data Benefit Agreements (CDBA)
 * - Account deletion
 */

import express from 'express';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import authenticateJWT from '../middleware/auth';
import crypto from 'crypto';
import sovereigntyStore from '../lib/sovereignty-store';

const router = express.Router();

/**
 * GET /data-sovereignty/consent
 * Get current consent preferences for the authenticated user
 */
router.get('/consent', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    let consent = null;
    if (prisma.userConsent) {
      consent = await prisma.userConsent.findUnique({
        where: { userId }
      });
    } else {
      consent = sovereigntyStore.getConsent(userId);
    }

    // Return defaults if no consent record exists
    if (!consent) {
      consent = {
        userId,
        analyticsSharing: false,
        researchParticipation: false,
        communityDataBenefit: false,
        marketingCommunications: false,
        thirdPartySharing: false,
        updatedAt: null
      };
    }

    res.json({
      consent: {
        analyticsSharing: consent.analyticsSharing,
        researchParticipation: consent.researchParticipation,
        communityDataBenefit: consent.communityDataBenefit,
        marketingCommunications: consent.marketingCommunications,
        thirdPartySharing: consent.thirdPartySharing,
        updatedAt: consent.updatedAt
      }
    });
  } catch (error) {
    console.error('Get consent error:', error);
    res.status(500).json({ error: 'Failed to retrieve consent preferences' });
  }
});

/**
 * PUT /data-sovereignty/consent
 * Update consent preferences
 */
router.put('/consent', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      analyticsSharing,
      researchParticipation,
      communityDataBenefit,
      marketingCommunications,
      thirdPartySharing
    } = req.body;

    let consent;
    if (prisma.userConsent) {
      consent = await prisma.userConsent.upsert({
        where: { userId },
        update: {
          analyticsSharing: analyticsSharing ?? false,
          researchParticipation: researchParticipation ?? false,
          communityDataBenefit: communityDataBenefit ?? false,
          marketingCommunications: marketingCommunications ?? false,
          thirdPartySharing: thirdPartySharing ?? false,
          updatedAt: new Date()
        },
        create: {
          userId,
          analyticsSharing: analyticsSharing ?? false,
          researchParticipation: researchParticipation ?? false,
          communityDataBenefit: communityDataBenefit ?? false,
          marketingCommunications: marketingCommunications ?? false,
          thirdPartySharing: thirdPartySharing ?? false
        }
      });

      if (prisma.auditLog) {
        await prisma.auditLog.create({
          data: {
            action: 'CONSENT_UPDATED',
            userId,
            metadata: JSON.stringify({
              analyticsSharing,
              researchParticipation,
              communityDataBenefit,
              marketingCommunications,
              thirdPartySharing
            })
          }
        });
      }
    } else {
      consent = sovereigntyStore.upsertConsent(userId, {
        analyticsSharing: analyticsSharing ?? false,
        researchParticipation: researchParticipation ?? false,
        communityDataBenefit: communityDataBenefit ?? false,
        marketingCommunications: marketingCommunications ?? false,
        thirdPartySharing: thirdPartySharing ?? false,
      });
      sovereigntyStore.pushAudit({ action: 'CONSENT_UPDATED', userId, metadata: { analyticsSharing, researchParticipation, communityDataBenefit, marketingCommunications, thirdPartySharing } });
    }

    res.json({
      message: 'Consent preferences updated',
      consent: {
        analyticsSharing: consent.analyticsSharing,
        researchParticipation: consent.researchParticipation,
        communityDataBenefit: consent.communityDataBenefit,
        marketingCommunications: consent.marketingCommunications,
        thirdPartySharing: consent.thirdPartySharing,
        updatedAt: consent.updatedAt
      }
    });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({ error: 'Failed to update consent preferences' });
  }
});

/**
 * POST /data-sovereignty/export
 * Request a full data export
 */
router.post('/export', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json', includeFiles = true } = req.body;

    let existingExport = null;
    if (prisma.dataExportRequest) {
      existingExport = await prisma.dataExportRequest.findFirst({
        where: {
          userId,
          status: { in: ['pending', 'processing'] }
        }
      });
    } else {
      existingExport = sovereigntyStore.findInProgressExport(userId);
    }

    if (existingExport) {
      return void res.status(409).json({
        error: 'Export already in progress',
        exportId: existingExport.id,
        status: existingExport.status
      });
    }

    // Create export request
    const exportId = crypto.randomUUID();
    if (prisma.dataExportRequest) {
      await prisma.dataExportRequest.create({
        data: {
          id: exportId,
          userId,
          format,
          includeFiles,
          status: 'pending'
        }
      });
      if (prisma.auditLog) {
        await prisma.auditLog.create({
          data: {
            action: 'DATA_EXPORT_REQUESTED',
            userId,
            metadata: JSON.stringify({ exportId, format, includeFiles })
          }
        });
      }
    } else {
      sovereigntyStore.createExportRequest({ exportId, userId, format, includeFiles });
      sovereigntyStore.pushAudit({ action: 'DATA_EXPORT_REQUESTED', userId, metadata: { exportId, format, includeFiles } });
    }

    // In production, this would be handled by a background job
    // For now, we'll process it synchronously for smaller exports
    processDataExport(exportId).catch(err => {
      console.error('Export processing error:', err);
    });

    res.status(202).json({
      exportId,
      status: 'pending',
      message: 'Export request received. You will be notified when ready.',
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 mins
    });
  } catch (error) {
    console.error('Export request error:', error);
    res.status(500).json({ error: 'Failed to create export request' });
  }
});

/**
 * GET /data-sovereignty/export/:exportId
 * Check status of an export request
 */
router.get('/export/:exportId', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { exportId } = req.params;

    const exportRequest = prisma.dataExportRequest
      ? await prisma.dataExportRequest.findUnique({ where: { id: exportId } })
      : sovereigntyStore.getExport(exportId);

    if (!exportRequest) {
      return void res.status(404).json({ error: 'Export request not found' });
    }

    if (exportRequest.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized to access this export' });
    }

    res.json({
      exportId: exportRequest.id,
      status: exportRequest.status,
      format: exportRequest.format,
      downloadUrl: exportRequest.downloadUrl,
      expiresAt: exportRequest.expiresAt,
      createdAt: exportRequest.createdAt,
      completedAt: exportRequest.completedAt
    });
  } catch (error) {
    console.error('Get export status error:', error);
    res.status(500).json({ error: 'Failed to get export status' });
  }
});

/**
 * POST /data-sovereignty/delete
 * Request account deletion (right to be forgotten)
 */
router.post('/delete', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmEmail, reason } = req.body;

    // Verify email matches
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || user.email !== confirmEmail) {
      return void res.status(400).json({
        error: 'Email confirmation does not match your account email'
      });
    }

    let existingRequest = null;
    if (prisma.accountDeletionRequest) {
      existingRequest = await prisma.accountDeletionRequest.findFirst({
        where: {
          userId,
          status: { in: ['pending', 'processing'] }
        }
      });
    } else {
      const stored = sovereigntyStore.getDeletionRequest(userId);
      if (stored && ['pending', 'processing'].includes(stored.status)) existingRequest = stored;
    }

    if (existingRequest) {
      return void res.status(409).json({
        error: 'Deletion request already exists',
        deletionDate: existingRequest.scheduledDeletionAt
      });
    }

    // Schedule deletion for 30 days (grace period for recovery)
    const scheduledDeletionAt = new Date();
    scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

    if (prisma.accountDeletionRequest) {
      await prisma.accountDeletionRequest.create({
        data: {
          userId,
          reason,
          status: 'pending',
          scheduledDeletionAt
        }
      });
      if (prisma.auditLog) {
        await prisma.auditLog.create({
          data: {
            action: 'ACCOUNT_DELETION_REQUESTED',
            userId,
            metadata: JSON.stringify({
              reason,
              scheduledDeletionAt: scheduledDeletionAt.toISOString()
            })
          }
        });
      }
    } else {
      sovereigntyStore.upsertDeletionRequest(userId, {
        userId,
        reason,
        status: 'pending',
        scheduledDeletionAt: scheduledDeletionAt.toISOString(),
        createdAt: new Date().toISOString(),
      });
      sovereigntyStore.pushAudit({ action: 'ACCOUNT_DELETION_REQUESTED', userId, metadata: { reason, scheduledDeletionAt: scheduledDeletionAt.toISOString() } });
    }

    res.status(202).json({
      message: 'Account deletion scheduled',
      deletionDate: scheduledDeletionAt.toISOString(),
      gracePeriodDays: 30,
      note: 'You can cancel this request by logging in within the grace period.'
    });
  } catch (error) {
    console.error('Account deletion request error:', error);
    res.status(500).json({ error: 'Failed to process deletion request' });
  }
});

/**
 * POST /data-sovereignty/delete/cancel
 * Cancel a pending deletion request
 */
router.post('/delete/cancel', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    const deletionRequest = prisma.accountDeletionRequest
      ? await prisma.accountDeletionRequest.findFirst({ where: { userId, status: 'pending' } })
      : sovereigntyStore.getDeletionRequest(userId);

    if (!deletionRequest) {
      return void res.status(404).json({ error: 'No pending deletion request found' });
    }

    if (prisma.accountDeletionRequest) {
      await prisma.accountDeletionRequest.update({
        where: { id: deletionRequest.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date()
        }
      });
      if (prisma.auditLog) {
        await prisma.auditLog.create({
          data: {
            action: 'ACCOUNT_DELETION_CANCELLED',
            userId,
            metadata: { requestId: deletionRequest.id }
          }
        });
      }
    } else {
      sovereigntyStore.upsertDeletionRequest(userId, {
        ...deletionRequest,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });
      sovereigntyStore.pushAudit({ action: 'ACCOUNT_DELETION_CANCELLED', userId, metadata: { requestId: deletionRequest.id || null } });
    }

    res.json({ message: 'Deletion request cancelled successfully' });
  } catch (error) {
    console.error('Cancel deletion error:', error);
    res.status(500).json({ error: 'Failed to cancel deletion request' });
  }
});

/**
 * GET /data-sovereignty/cdba
 * Get Community Data Benefit Agreement information
 */
router.get('/cdba', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's consent status
    let consent = null;
    if (prisma.userConsent) {
      try {
        consent = await prisma.userConsent.findUnique({ where: { userId } });
      } catch (e) {
        console.warn('CDBA: consent lookup failed, falling back to store:', e?.message || e);
        consent = null;
      }
    }

    if (!consent) {
      consent = sovereigntyStore.getConsent(userId);
    }

    res.json({
      cdbaEnrolled: consent?.communityDataBenefit ?? false,
      description: 'The Community Data Benefit Agreement (CDBA) ensures that ' +
        'anonymized, aggregated data from the platform benefits First Nations communities. ' +
        'This includes contributing to research, policy advocacy, and community programs.',
      benefits: [
        'Your data helps inform Closing the Gap targets',
        'Anonymized insights support community employment programs',
        'Platform revenue from analytics funds free community features',
        'You can opt-out at any time without affecting your account'
      ],
      dataUsage: {
        included: [
          'Anonymized employment outcomes',
          'Aggregate skills and training patterns',
          'Regional employment trends (no individual identification)'
        ],
        excluded: [
          'Personal identifying information',
          'Individual application details',
          'Private messages or notes'
        ]
      }
    });
  } catch (error) {
    console.error('CDBA info error:', error);
    res.status(500).json({ error: 'Failed to retrieve CDBA information' });
  }
});

/**
 * Background job: Process data export
 * In production, this would be a separate worker process
 */
async function processDataExport(exportId) {
  try {
    const exportRequest = prisma.dataExportRequest
      ? await prisma.dataExportRequest.findUnique({ where: { id: exportId } })
      : sovereigntyStore.getExport(exportId);

    if (!exportRequest || exportRequest.status !== 'pending') {
      return;
    }

    if (prisma.dataExportRequest) {
      await prisma.dataExportRequest.update({ where: { id: exportId }, data: { status: 'processing' } });
    } else {
      sovereigntyStore.updateExport(exportId, { status: 'processing' });
    }

    const userId = exportRequest.userId;

    // Gather all user data
    const userData = await gatherUserData(userId, exportRequest.includeFiles);

    // In production: upload to S3 and generate signed URL
    // For now: store as JSON in the database
    const exportData = exportRequest.format === 'json' 
      ? JSON.stringify(userData, null, 2)
      : convertToCsv(userData);

    // Generate a mock download URL (in production, this would be S3)
    const downloadUrl = `/data-sovereignty/export/${exportId}/download`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

    if (prisma.dataExportRequest) {
      await prisma.dataExportRequest.update({
        where: { id: exportId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          downloadUrl,
          expiresAt,
          exportData
        }
      });
      if (prisma.auditLog) {
        await prisma.auditLog.create({
          data: {
            action: 'DATA_EXPORT_COMPLETED',
            userId,
            metadata: JSON.stringify({ exportId })
          }
        });
      }
    } else {
      sovereigntyStore.updateExport(exportId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        downloadUrl,
        expiresAt: expiresAt.toISOString(),
        exportData,
      });
      sovereigntyStore.pushAudit({ action: 'DATA_EXPORT_COMPLETED', userId, metadata: { exportId } });
    }

  } catch (error) {
    console.error('Process export error:', error);
    if (prisma.dataExportRequest) {
      await prisma.dataExportRequest.update({
        where: { id: exportId },
        data: {
          status: 'failed',
          errorMessage: error.message
        }
      });
    } else {
      sovereigntyStore.updateExport(exportId, { status: 'failed', errorMessage: error.message });
    }
  }
}

/**
 * Gather all user data for export
 */
async function gatherUserData(userId, includeFiles) {
  async function safe(label, fn, fallback) {
    try {
      return await fn();
    } catch (e) {
      console.warn(`Data export: skipping ${label}:`, e?.message || e);
      return fallback;
    }
  }

  const user = await safe('user', () => prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, userType: true, createdAt: true, updatedAt: true }
  }), null);

  const memberProfile = await safe('memberProfile', () => prisma.memberProfile.findUnique({ where: { userId } }), null);
  const mentorProfile = await safe('mentorProfile', () => prisma.mentorProfile.findUnique({ where: { userId } }), null);
  const companyProfile = await safe('companyProfile', () => prisma.companyProfile.findUnique({ where: { userId } }), null);

  const applications = await safe('applications', () => prisma.jobApplication.findMany({
    where: { userId },
    include: { job: { select: { title: true } } }
  }), []);

  const sessions = await safe('mentorSessions', () => prisma.mentorSession.findMany({
    where: { OR: [{ mentorId: userId }, { menteeId: userId }] }
  }), []);

  const badges = await safe('badges', () => prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true }
  }), []);

  const forumPosts = await safe('forumPosts', () => prisma.forumReply.findMany({ where: { authorId: userId } }), []);

  const consent = prisma.userConsent
    ? await safe('consent', () => prisma.userConsent.findUnique({ where: { userId } }), null)
    : sovereigntyStore.getConsent(userId);

  let enrolments = [];
  if (prisma.courseEnrolment) {
    enrolments = await safe('enrolments', async () => {
      // Different schemas use memberId vs userId
      if (memberProfile?.id) {
        return prisma.courseEnrolment.findMany({ where: { memberId: memberProfile.id }, include: { course: true } });
      }
      return prisma.courseEnrolment.findMany({ where: { userId }, include: { course: true } });
    }, []);
  }

  const skills = prisma.userSkill
    ? await safe('skills', () => prisma.userSkill.findMany({ where: { userId }, include: { skill: true } }), [])
    : [];

  const exportData: any = {
    exportedAt: new Date().toISOString(),
    user,
    profiles: {
      member: memberProfile,
      mentor: mentorProfile,
      company: companyProfile
    },
    applications,
    mentorship: {
      sessions
    },
    skills,
    badges,
    training: enrolments,
    community: {
      forumPosts
    },
    consent
  };

  // Optionally include file references
  if (includeFiles) {
    const files = prisma.uploadedFile
      ? await safe('files', () => prisma.uploadedFile.findMany({
        where: { userId },
        select: {
          id: true,
          filename: true,
          category: true,
          mimeType: true,
          size: true,
          createdAt: true
        }
      }), [])
      : [];

    exportData.files = files;
  }

  return exportData;
}

/**
 * Convert data to CSV format (simplified)
 */
function convertToCsv(userData) {
  // Simplified CSV conversion - in production use a proper CSV library
  const lines = ['Section,Key,Value'];
  
  function flatten(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj || {})) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value, fullKey);
      } else {
        lines.push(`"${prefix}","${key}","${JSON.stringify(value)}"`);
      }
    }
  }
  
  flatten(userData);
  return lines.join('\n');
}

/**
 * GET /data-sovereignty/export/:exportId/download
 * Download the export file
 */
router.get('/export/:exportId/download', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { exportId } = req.params;

    const exportRequest = prisma.dataExportRequest
      ? await prisma.dataExportRequest.findUnique({ where: { id: exportId } })
      : sovereigntyStore.getExport(exportId);

    if (!exportRequest) {
      return void res.status(404).json({ error: 'Export not found' });
    }

    if (exportRequest.userId !== userId) {
      return void res.status(403).json({ error: 'Not authorized' });
    }

    if (exportRequest.status !== 'completed') {
      return void res.status(400).json({ error: 'Export not ready', status: exportRequest.status });
    }

    const expiresAt = exportRequest.expiresAt ? new Date(exportRequest.expiresAt) : null;
    if (expiresAt && new Date() > expiresAt) {
      return void res.status(410).json({ error: 'Export has expired' });
    }

    const contentType = exportRequest.format === 'json' 
      ? 'application/json' 
      : 'text/csv';
    const extension = exportRequest.format === 'json' ? 'json' : 'csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="ngurra-data-export-${exportId}.${extension}"`);
    res.send(exportRequest.exportData);

  } catch (error) {
    console.error('Download export error:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

export default router;


