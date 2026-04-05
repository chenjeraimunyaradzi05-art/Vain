#!/usr/bin/env node
/**
 * BullMQ Worker Process
 * 
 * Standalone worker for processing background jobs.
 * Run with: node src/worker.js
 * 
 * In production, PM2 manages multiple worker instances:
 * pm2 start ecosystem.config.cjs --only ngurra-worker
 */

require('dotenv').config();

const { logger } = require('./lib/logger');
const { prisma } = require('./db');
const mailer = require('./lib/mailer');
const pushNotifications = require('./lib/pushNotifications');

// Graceful shutdown
let isShuttingDown = false;

/**
 * Email job processor
 */
async function processEmailJob(job) {
  const { type, to, subject, template, data } = job.data;
  
  logger.info('[Worker] Processing email job', { 
    jobId: job.id, 
    type, 
    to,
  });

  try {
    switch (type) {
      case 'welcome':
        await mailer.sendWelcomeEmail(to, data);
        break;
      case 'password-reset':
        await mailer.sendPasswordResetEmail(to, data.resetToken);
        break;
      case 'application-received':
        await mailer.sendApplicationReceivedEmail(to, data);
        break;
      case 'session-reminder':
        await mailer.sendSessionReminderEmail(to, data);
        break;
      case 'generic':
        await mailer.sendTemplateEmail(to, template, data);
        break;
      default:
        logger.warn('[Worker] Unknown email type', { type });
    }
    
    return { success: true, sentAt: new Date().toISOString() };
  } catch (error) {
    logger.error('[Worker] Email job failed', { 
      jobId: job.id, 
      error: error.message,
    });
    throw error;
  }
}

/**
 * Notification job processor
 */
async function processNotificationJob(job) {
  const { userId, type, title, body, data } = job.data;
  
  logger.info('[Worker] Processing notification job', { 
    jobId: job.id, 
    userId, 
    type,
  });

  try {
    // Get user's notification preferences and tokens
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        notificationPreferences: true,
      },
    });

    if (!user) {
      logger.warn('[Worker] User not found for notification', { userId });
      return { success: false, reason: 'user_not_found' };
    }

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ? JSON.stringify(data) : null,
      },
    });

    // Send push notification if enabled
    if (user.pushToken && user.notificationPreferences?.pushEnabled !== false) {
      await pushNotifications.sendPush(user.pushToken, {
        title,
        body,
        data,
      });
    }

    return { success: true, notifiedAt: new Date().toISOString() };
  } catch (error) {
    logger.error('[Worker] Notification job failed', { 
      jobId: job.id, 
      error: error.message,
    });
    throw error;
  }
}

/**
 * Report generation job processor
 */
async function processReportJob(job) {
  const { type, params, requestedBy } = job.data;
  
  logger.info('[Worker] Processing report job', { 
    jobId: job.id, 
    type,
    requestedBy,
  });

  try {
    let reportData;
    
    switch (type) {
      case 'analytics':
        reportData = await generateAnalyticsReport(params);
        break;
      case 'rap':
        reportData = await generateRAPReport(params);
        break;
      case 'government':
        reportData = await generateGovernmentReport(params);
        break;
      case 'employer':
        reportData = await generateEmployerReport(params);
        break;
      default:
        throw new Error(`Unknown report type: ${type}`);
    }

    // Store report
    const report = await prisma.report.create({
      data: {
        type,
        generatedBy: requestedBy,
        data: JSON.stringify(reportData),
        generatedAt: new Date(),
      },
    });

    // Notify user that report is ready
    if (requestedBy) {
      await prisma.notification.create({
        data: {
          userId: requestedBy,
          type: 'report_ready',
          title: 'Report Ready',
          body: `Your ${type} report has been generated`,
          data: JSON.stringify({ reportId: report.id }),
        },
      });
    }

    return { success: true, reportId: report.id };
  } catch (error) {
    logger.error('[Worker] Report job failed', { 
      jobId: job.id, 
      error: error.message,
    });
    throw error;
  }
}

/**
 * Cleanup job processor
 */
async function processCleanupJob(job) {
  const { task } = job.data;
  
  logger.info('[Worker] Processing cleanup job', { 
    jobId: job.id, 
    task,
  });

  try {
    let result;
    
    switch (task) {
      case 'expired-sessions':
        result = await cleanupExpiredSessions();
        break;
      case 'old-notifications':
        result = await cleanupOldNotifications();
        break;
      case 'orphan-files':
        result = await cleanupOrphanFiles();
        break;
      case 'expired-tokens':
        result = await cleanupExpiredTokens();
        break;
      case 'audit-logs':
        result = await archiveOldAuditLogs();
        break;
      case 'old-ai-conversations':
        result = await cleanupOldAiConversations();
        break;
      default:
        throw new Error(`Unknown cleanup task: ${task}`);
    }

    return { success: true, ...result };
  } catch (error) {
    logger.error('[Worker] Cleanup job failed', { 
      jobId: job.id, 
      error: error.message,
    });
    throw error;
  }
}

// ========================================
// Cleanup Task Implementations
// ========================================

async function cleanupExpiredSessions() {
  const expiredDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const result = await prisma.userSession.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { lastActiveAt: { lt: expiredDate } },
      ],
    },
  });

  logger.info('[Cleanup] Expired sessions removed', { count: result.count });
  return { deletedSessions: result.count };
}

async function cleanupOldNotifications() {
  const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
  
  const result = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: oldDate },
      read: true,
    },
  });

  logger.info('[Cleanup] Old notifications removed', { count: result.count });
  return { deletedNotifications: result.count };
}

async function cleanupOrphanFiles() {
  // Cleanup orphan files from uploads that were never attached to records
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const orphanAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffDate = new Date(Date.now() - orphanAge);
    
    let deletedCount = 0;
    let totalSize = 0;
    
    // Get all temp files older than 24 hours
    const tempDir = path.join(uploadDir, 'temp');
    
    try {
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            totalSize += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (fileErr) {
          // Skip files that can't be accessed
          logger.debug('[Cleanup] Skipping file', { file, error: fileErr.message });
        }
      }
    } catch (dirErr) {
      // Temp directory doesn't exist yet
      logger.debug('[Cleanup] Temp directory not found', { dir: tempDir });
    }
    
    // Clean up video processing temp files
    const videoTempDir = path.join(uploadDir, 'video-processing');
    try {
      const videoFiles = await fs.readdir(videoTempDir);
      
      for (const file of videoFiles) {
        const filePath = path.join(videoTempDir, file);
        try {
          const stats = await fs.stat(filePath);
          
          // Delete video temp files older than 6 hours
          if (stats.mtime < new Date(Date.now() - 6 * 60 * 60 * 1000)) {
            totalSize += stats.size;
            await fs.unlink(filePath);
            deletedCount++;
          }
        } catch (fileErr) {
          logger.debug('[Cleanup] Skipping video temp file', { file, error: fileErr.message });
        }
      }
    } catch (dirErr) {
      // Video processing directory doesn't exist
      logger.debug('[Cleanup] Video processing directory not found', { dir: videoTempDir });
    }
    
    // Clean up orphaned file records in database (files that were uploaded but never used)
    const orphanedRecords = await prisma.file.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        attachedToId: null,
        attachedToType: null,
      },
    });
    
    logger.info('[Cleanup] Orphan files cleanup completed', { 
      deletedFiles: deletedCount,
      totalSizeBytes: totalSize,
      deletedRecords: orphanedRecords.count
    });
    
    return { 
      deletedFiles: deletedCount, 
      totalSizeBytes: totalSize,
      deletedRecords: orphanedRecords.count,
      status: 'completed' 
    };
  } catch (err) {
    logger.error('[Cleanup] Orphan files cleanup failed', { error: err.message });
    return { status: 'failed', error: err.message };
  }
}

async function cleanupExpiredTokens() {
  // Clean up expired password reset tokens
  const passwordResetResult = await prisma.user.updateMany({
    where: {
      passwordResetExpiry: { lt: new Date() },
      passwordResetToken: { not: null },
    },
    data: {
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  // Clean up expired OAuth tokens
  const oauthTokenResult = await prisma.oAuthToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });

  logger.info('[Cleanup] Expired tokens cleared', { 
    passwordResetTokens: passwordResetResult.count,
    oauthTokens: oauthTokenResult.count 
  });
  return { 
    clearedPasswordResetTokens: passwordResetResult.count,
    clearedOAuthTokens: oauthTokenResult.count 
  };
}

async function archiveOldAuditLogs() {
  const archiveDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
  
  // In production, you'd move these to cold storage
  const count = await prisma.auditLog.count({
    where: { createdAt: { lt: archiveDate } },
  });

  logger.info('[Cleanup] Audit logs to archive', { count });
  return { logsToArchive: count, status: 'pending' };
}

async function cleanupOldAiConversations() {
  const retentionDays = parseInt(process.env.AI_CONVERSATION_RETENTION_DAYS || '90', 10);
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.aiConversation.deleteMany({
      where: { updatedAt: { lt: cutoff } },
    });

    logger.info('[Cleanup] Old AI conversations removed', { deletedConversations: result.count, retentionDays });
    return { deletedConversations: result.count };
  } catch (err) {
    logger.error('[Cleanup] Failed to remove old AI conversations', { error: err.message });
    return { status: 'failed', error: err.message };
  }
}

// ========================================
// Report Generation Implementations
// ========================================

async function generateAnalyticsReport(params) {
  const { startDate, endDate } = params;
  
  const [users, jobs, applications] = await Promise.all([
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    }),
    prisma.job.count({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    }),
    prisma.application.count({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    }),
  ]);

  return {
    period: { startDate, endDate },
    newUsers: users,
    newJobs: jobs,
    applications,
    generatedAt: new Date().toISOString(),
  };
}

async function generateRAPReport(params) {
  // RAP (Reconciliation Action Plan) report generation
  const { companyId, startDate, endDate } = params;
  
  try {
    // Get Indigenous employment statistics
    const indigenousEmployees = await prisma.user.count({
      where: {
        employerId: companyId,
        indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    
    // Get applications from Indigenous candidates
    const indigenousApplications = await prisma.application.count({
      where: {
        job: { companyId },
        user: { indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] } },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    
    // Get successful hires
    const indigenousHires = await prisma.application.count({
      where: {
        job: { companyId },
        user: { indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] } },
        status: 'hired',
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    
    // Get mentorship engagement
    const mentoringSessions = await prisma.mentorshipSession.count({
      where: {
        mentorship: {
          mentor: { indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] } },
        },
        scheduledAt: { gte: new Date(startDate), lte: new Date(endDate) },
        status: 'completed',
      },
    });
    
    // Get cultural events participation
    const culturalEvents = await prisma.eventAttendee.count({
      where: {
        event: { type: 'CULTURAL' },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    
    return {
      type: 'RAP',
      period: { startDate, endDate },
      companyId,
      metrics: {
        indigenousEmployees,
        indigenousApplications,
        indigenousHires,
        conversionRate: indigenousApplications > 0 
          ? ((indigenousHires / indigenousApplications) * 100).toFixed(1) + '%' 
          : '0%',
        mentoringSessions,
        culturalEventsParticipation: culturalEvents,
      },
      status: 'generated',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[Report] RAP report generation failed', { error: err.message, companyId });
    return { type: 'RAP', status: 'failed', error: err.message };
  }
}

async function generateGovernmentReport(params) {
  // Government Closing the Gap report generation
  const { startDate, endDate, reportType = 'employment' } = params;
  
  try {
    // Platform-wide Indigenous employment metrics
    const totalIndigenousUsers = await prisma.user.count({
      where: {
        indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] },
      },
    });
    
    const newIndigenousRegistrations = await prisma.user.count({
      where: {
        indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    
    // Employment outcomes
    const successfulPlacements = await prisma.application.count({
      where: {
        user: { indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] } },
        status: 'hired',
        updatedAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    
    // Regional distribution
    const regionalBreakdown = await prisma.user.groupBy({
      by: ['state'],
      where: {
        indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      _count: true,
    });
    
    // RAP-certified employers
    const rapCertifiedEmployers = await prisma.company.count({
      where: {
        rapStatus: { notIn: [null, 'NONE'] },
      },
    });

    // Training & mentorship
    const completedMentorships = await prisma.mentorship.count({
      where: {
        mentee: { indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] } },
        status: 'completed',
        updatedAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    
    return {
      type: 'Government',
      reportType,
      period: { startDate, endDate },
      metrics: {
        totalIndigenousUsers,
        newRegistrations: newIndigenousRegistrations,
        successfulPlacements,
        rapCertifiedEmployers,
        completedMentorships,
        regionalBreakdown: regionalBreakdown.map(r => ({ state: r.state, count: r._count })),
      },
      status: 'generated',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[Report] Government report generation failed', { error: err.message });
    return { type: 'Government', status: 'failed', error: err.message };
  }
}

async function generateEmployerReport(params) {
  // Employer analytics report
  const { companyId, startDate, endDate } = params;
  
  try {
    // Job posting metrics
    const jobMetrics = await prisma.job.aggregate({
      where: {
        companyId,
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      _count: true,
    });
    
    const activeJobs = await prisma.job.count({
      where: {
        companyId,
        status: 'active',
      },
    });
    
    // Application metrics
    const applications = await prisma.application.findMany({
      where: {
        job: { companyId },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: { status: true },
    });
    
    const applicationsByStatus = applications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
    
    // Time to hire
    const hiredApplications = await prisma.application.findMany({
      where: {
        job: { companyId },
        status: 'hired',
        updatedAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      select: { createdAt: true, updatedAt: true },
    });
    
    const avgTimeToHire = hiredApplications.length > 0
      ? hiredApplications.reduce((sum, app) => {
          return sum + (app.updatedAt.getTime() - app.createdAt.getTime());
        }, 0) / hiredApplications.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;
    
    // Indigenous candidate engagement
    const indigenousCandidates = await prisma.application.count({
      where: {
        job: { companyId },
        user: { indigenousStatus: { in: ['ABORIGINAL', 'TORRES_STRAIT_ISLANDER', 'BOTH'] } },
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
    });
    
    return {
      type: 'Employer',
      companyId,
      period: { startDate, endDate },
      metrics: {
        jobsPosted: jobMetrics._count,
        activeJobs,
        totalApplications: applications.length,
        applicationsByStatus,
        averageTimeToHireDays: Math.round(avgTimeToHire),
        indigenousCandidateApplications: indigenousCandidates,
        indigenousCandidatePercentage: applications.length > 0 
          ? ((indigenousCandidates / applications.length) * 100).toFixed(1) + '%'
          : '0%',
      },
      status: 'generated',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.error('[Report] Employer report generation failed', { error: err.message, companyId });
    return { type: 'Employer', status: 'failed', error: err.message };
  }
}

// ========================================
// Worker Initialization
// ========================================

async function startWorkers() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    logger.error('[Worker] Redis URL not configured. Workers require Redis.');
    process.exit(1);
  }

  try {
    const { Worker } = await import('bullmq');
    const IORedis = (await import('ioredis')).default;
    
    const connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Email worker
    const emailWorker = new Worker('email', processEmailJob, {
      connection,
      concurrency: 5,
    });
    
    emailWorker.on('completed', (job) => {
      logger.info('[Worker] Email job completed', { jobId: job.id });
    });
    
    emailWorker.on('failed', (job, err) => {
      logger.error('[Worker] Email job failed', { jobId: job?.id, error: err.message });
    });

    // Notification worker
    const notificationWorker = new Worker('notification', processNotificationJob, {
      connection,
      concurrency: 10,
    });
    
    notificationWorker.on('completed', (job) => {
      logger.info('[Worker] Notification job completed', { jobId: job.id });
    });
    
    notificationWorker.on('failed', (job, err) => {
      logger.error('[Worker] Notification job failed', { jobId: job?.id, error: err.message });
    });

    // Report worker (lower concurrency for heavy jobs)
    const reportWorker = new Worker('report', processReportJob, {
      connection,
      concurrency: 2,
    });
    
    reportWorker.on('completed', (job) => {
      logger.info('[Worker] Report job completed', { jobId: job.id });
    });
    
    reportWorker.on('failed', (job, err) => {
      logger.error('[Worker] Report job failed', { jobId: job?.id, error: err.message });
    });

    // Cleanup worker
    const cleanupWorker = new Worker('cleanup', processCleanupJob, {
      connection,
      concurrency: 1,
    });
    
    cleanupWorker.on('completed', (job) => {
      logger.info('[Worker] Cleanup job completed', { jobId: job.id });
    });
    
    cleanupWorker.on('failed', (job, err) => {
      logger.error('[Worker] Cleanup job failed', { jobId: job?.id, error: err.message });
    });

    logger.info('[Worker] All workers started successfully');

    // Graceful shutdown
    const shutdown = async (signal) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      logger.info(`[Worker] ${signal} received, shutting down gracefully...`);
      
      await Promise.all([
        emailWorker.close(),
        notificationWorker.close(),
        reportWorker.close(),
        cleanupWorker.close(),
      ]);
      
      await connection.quit();
      await prisma.$disconnect();
      
      logger.info('[Worker] Shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Keep process alive
    process.stdin.resume();

  } catch (error) {
    logger.error('[Worker] Failed to start workers', { error: error.message });
    process.exit(1);
  }
}

// Start workers
startWorkers();

export {};
