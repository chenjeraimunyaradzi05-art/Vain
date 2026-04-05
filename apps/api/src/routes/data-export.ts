// @ts-nocheck
/**
 * User Data Export Route
 * 
 * Provides GDPR/Privacy Act compliant data export functionality.
 * Allows users to download all their personal data.
 */

const express = require('express');
const router = express.Router();
const authenticateJWT = require('../middleware/auth');
const { createAuditLog, AuditCategory, AuditEvent } = require('../lib/auditLog');
const { notificationService } = require('../services/notificationService');
const { queueEmail } = require('../lib/emailQueue');

/**
 * POST /data-export/request
 * 
 * Request a data export. Creates an export job that runs asynchronously.
 */
router.post('/request', authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { format = 'json', includeUploads = false } = req.body;

  try {
    const { prisma } = require('../db');

    // Check for existing pending export
    const existingExport = await prisma.dataExport.findFirst({
      where: {
        userId,
        status: { in: ['pending', 'processing'] },
      },
    });

    if (existingExport) {
      return void res.status(400).json({
        error: 'Export already in progress',
        exportId: existingExport.id,
        status: existingExport.status,
        requestedAt: existingExport.createdAt,
      });
    }

    // Create new export request
    const exportRequest = await prisma.dataExport.create({
      data: {
        userId,
        format,
        includeUploads,
        status: 'pending',
      },
    });

    // Audit log
    await createAuditLog({
      userId,
      category: AuditCategory.DATA_EXPORT,
      event: AuditEvent.DATA_EXPORT_REQUESTED,
      details: {
        exportId: exportRequest.id,
        format,
        includeUploads,
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Queue the export job (would integrate with job queue like Bull)
    // For now, process immediately in background
    setImmediate(() => processDataExport(exportRequest.id));

    res.status(202).json({
      message: 'Export request received',
      exportId: exportRequest.id,
      status: 'pending',
      estimatedTime: '5-10 minutes',
    });
  } catch (error) {
    console.error('[DataExport] Request error:', error);
    res.status(500).json({ error: 'Failed to create export request' });
  }
});

/**
 * GET /data-export/status/:exportId
 * 
 * Check the status of a data export request.
 */
router.get('/status/:exportId', authenticateJWT, async (req, res) => {
  const { exportId } = req.params;
  const userId = req.user.id;

  try {
    const { prisma } = require('../db');

    const exportRequest = await prisma.dataExport.findFirst({
      where: {
        id: exportId,
        userId, // Ensure user owns this export
      },
    });

    if (!exportRequest) {
      return void res.status(404).json({ error: 'Export not found' });
    }

    res.json({
      id: exportRequest.id,
      status: exportRequest.status,
      format: exportRequest.format,
      createdAt: exportRequest.createdAt,
      completedAt: exportRequest.completedAt,
      expiresAt: exportRequest.expiresAt,
      downloadUrl: exportRequest.status === 'completed' 
        ? `/data-export/download/${exportRequest.id}` 
        : null,
    });
  } catch (error) {
    console.error('[DataExport] Status error:', error);
    res.status(500).json({ error: 'Failed to get export status' });
  }
});

/**
 * GET /data-export/download/:exportId
 * 
 * Download a completed data export.
 */
router.get('/download/:exportId', authenticateJWT, async (req, res) => {
  const { exportId } = req.params;
  const userId = req.user.id;

  try {
    const { prisma } = require('../db');

    const exportRequest = await prisma.dataExport.findFirst({
      where: {
        id: exportId,
        userId,
        status: 'completed',
      },
    });

    if (!exportRequest) {
      return void res.status(404).json({ error: 'Export not found or not ready' });
    }

    // Check expiry
    if (exportRequest.expiresAt && new Date() > exportRequest.expiresAt) {
      return void res.status(410).json({ error: 'Export has expired. Please request a new one.' });
    }

    // Audit log
    await createAuditLog({
      userId,
      category: AuditCategory.DATA_EXPORT,
      event: AuditEvent.DATA_EXPORT_DOWNLOADED,
      details: { exportId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Send the file
    const filename = `ngurra-pathways-data-export-${new Date().toISOString().split('T')[0]}.${exportRequest.format}`;
    
    res.setHeader('Content-Type', exportRequest.format === 'json' 
      ? 'application/json' 
      : 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream from storage or send data
    res.send(exportRequest.data);
  } catch (error) {
    console.error('[DataExport] Download error:', error);
    res.status(500).json({ error: 'Failed to download export' });
  }
});

/**
 * GET /data-export/history
 * 
 * Get user's export history.
 */
router.get('/history', authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const { prisma } = require('../db');

    const exports = await prisma.dataExport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        format: true,
        createdAt: true,
        completedAt: true,
        expiresAt: true,
      },
    });

    res.json({ exports });
  } catch (error) {
    console.error('[DataExport] History error:', error);
    res.status(500).json({ error: 'Failed to get export history' });
  }
});

/**
 * Process data export (background job)
 */
async function processDataExport(exportId) {
  const { prisma } = require('../db');

  try {
    // Update status to processing
    await prisma.dataExport.update({
      where: { id: exportId },
      data: { status: 'processing' },
    });

    const exportRequest = await prisma.dataExport.findUnique({
      where: { id: exportId },
    });

    if (!exportRequest) return;

    const userId = exportRequest.userId;

    // Collect all user data
    const userData = await collectUserData(userId, exportRequest.includeUploads);

    // Format the data
    let exportData;
    if (exportRequest.format === 'json') {
      exportData = JSON.stringify(userData, null, 2);
    } else {
      // For other formats, would create ZIP archive
      exportData = JSON.stringify(userData, null, 2);
    }

    // Calculate expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update export with data
    await prisma.dataExport.update({
      where: { id: exportId },
      data: {
        status: 'completed',
        data: exportData,
        completedAt: new Date(),
        expiresAt,
      },
    });

    // Send email notification to user that export is ready
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true }
      });

      if (user) {
        // Send in-app notification
        await notificationService.send({
          userId: user.id,
          type: 'SYSTEM_ANNOUNCEMENT',
          title: 'Your Data Export is Ready',
          body: 'Your personal data export is ready for download. It will expire in 7 days.',
          data: { exportId },
          actionUrl: `/settings/privacy/exports/${exportId}`,
          priority: 'MEDIUM'
        });

        // Send email notification
        if (user.email) {
          await queueEmail({
            to: user.email,
            subject: 'Your Data Export is Ready - Ngurra Pathways',
            template: 'data-export-ready',
            templateData: {
              recipientName: user.firstName || 'there',
              exportUrl: `${process.env.WEB_URL || 'https://ngurrapathways.com.au'}/settings/privacy/exports/${exportId}`,
              expiresAt: expiresAt.toLocaleDateString('en-AU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            },
            userId: user.id,
            type: 'SYSTEM_ANNOUNCEMENT'
          });
        }
      }
    } catch (notifyError) {
      console.error('[DataExport] Failed to send notification:', notifyError);
    }

    console.log(`[DataExport] Export ${exportId} completed`);
  } catch (error) {
    console.error(`[DataExport] Processing error for ${exportId}:`, error);
    
    await prisma.dataExport.update({
      where: { id: exportId },
      data: { status: 'failed' },
    });
  }
}

/**
 * Collect all user data for export
 */
async function collectUserData(userId, includeUploads = false) {
  const { prisma } = require('../db');

  // User profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      location: true,
      bio: true,
      pronouns: true,
      isAboriginalOrTorresStraitIslander: true,
      culturalIdentity: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Job applications
  const applications = await prisma.application.findMany({
    where: { userId },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          companyName: true,
        },
      },
    },
  });

  // Messages (sent)
  const sentMessages = await prisma.message.findMany({
    where: { senderId: userId },
    select: {
      id: true,
      content: true,
      createdAt: true,
      recipientId: true,
    },
  });

  // Forum posts
  const forumPosts = await prisma.forumPost.findMany({
    where: { authorId: userId },
  });

  // Mentorship sessions
  const mentorshipSessions = await prisma.mentorSession.findMany({
    where: { OR: [{ mentorId: userId }, { menteeId: userId }] },
  });

  // Course enrollments
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          provider: true,
        },
      },
    },
  });

  // Notifications
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  // Consent records
  const consentRecords = await prisma.consentRecord.findMany({
    where: { userId },
  });

  // Badges
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    include: {
      badge: true,
    },
  });

  // Uploads (if requested)
  let uploads = [];
  if (includeUploads) {
    uploads = await prisma.upload.findMany({
      where: { userId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        // Exclude actual file data from summary
      },
    });
  }

  return {
    exportDate: new Date().toISOString(),
    exportFormat: 'Ngurra Pathways Data Export v1.0',
    user,
    applications: applications.map((a) => ({
      id: a.id,
      jobId: a.job?.id,
      jobTitle: a.job?.title,
      company: a.job?.companyName,
      status: a.status,
      appliedAt: a.createdAt,
    })),
    messages: sentMessages,
    forumPosts: forumPosts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      createdAt: p.createdAt,
    })),
    mentorshipSessions: mentorshipSessions.map((s) => ({
      id: s.id,
      role: s.mentorId === userId ? 'mentor' : 'mentee',
      scheduledAt: s.scheduledAt,
      status: s.status,
    })),
    enrollments: enrollments.map((e) => ({
      courseId: e.course?.id,
      courseTitle: e.course?.title,
      provider: e.course?.provider,
      enrolledAt: e.createdAt,
      status: e.status,
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      createdAt: n.createdAt,
      read: n.read,
    })),
    consentRecords: consentRecords.map((c) => ({
      type: c.consentType,
      given: c.consented,
      timestamp: c.createdAt,
    })),
    badges: badges.map((b) => ({
      name: b.badge?.name,
      earnedAt: b.createdAt,
    })),
    uploads: uploads.map((u) => ({
      id: u.id,
      filename: u.filename,
      type: u.mimeType,
      size: u.size,
      uploadedAt: u.createdAt,
    })),
  };
}

export default router;


export {};

