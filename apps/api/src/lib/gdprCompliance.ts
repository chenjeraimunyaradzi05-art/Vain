// @ts-nocheck
"use strict";
/**
 * GDPR/Privacy Compliance Tools
 * 
 * Implements data export, deletion, consent management,
 * and right-to-be-forgotten cascade deletion.
 * 
 * Step 4: GDPR/Privacy Compliance Tools
 */

const { prisma } = require('../db');
const { logger } = require('./logger');
const { logAuditEvent, AuditEvent, AuditCategory } = require('./auditLog');
const { decrypt, decryptModelData } = require('./encryption');

/**
 * Data retention periods (in days)
 */
const RETENTION_PERIODS = {
  deletedUsers: 30,           // Grace period before permanent deletion
  auditLogs: 2 * 365,         // 2 years for audit logs
  applications: 3 * 365,      // 3 years for job applications
  messages: 365,              // 1 year for messages
  sessions: 90,               // 90 days for session data
  notifications: 90,          // 90 days for notifications
  analytics: 365,             // 1 year for analytics data
  exports: 7,                 // 7 days for data export files
  emailQueue: 30              // 30 days for email queue
};

/**
 * Get all user data for GDPR export
 * @param {string} userId - User ID
 * @returns {object} Complete user data export
 */
async function exportUserData(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberProfile: true,
        companyProfile: true,
        mentorProfile: true,
        governmentProfile: true,
        institutionProfile: true,
        fifoProfile: true,
        uploadedFiles: true,
        jobs: true,
        applications: {
          include: {
            job: {
              select: {
                title: true,
                location: true
              }
            }
          }
        },
        savedJobs: true,
        messages: true,
        mentorSessions: true,
        menteeSessions: true,
        userSkills: true,
        courseEnrolments: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get additional related data
    const [
      wellnessCheckIns,
      communitySupport,
      consents,
      savedSearches,
      careerMilestones,
      careerGoals,
      forumThreads,
      forumReplies,
      notifications
    ] = await Promise.all([
      prisma.wellnessCheckIn?.findMany({ where: { userId } }) || [],
      prisma.communitySupport?.findFirst({ where: { userId } }),
      prisma.userConsent?.findMany({ where: { userId } }) || [],
      prisma.savedSearch?.findMany({ where: { userId } }) || [],
      prisma.careerMilestone?.findMany({ where: { userId } }) || [],
      prisma.careerGoal?.findMany({ where: { userId } }) || [],
      prisma.forumThread?.findMany({ where: { authorId: userId } }) || [],
      prisma.forumReply?.findMany({ where: { authorId: userId } }) || [],
      prisma.notification?.findMany({ where: { userId } }) || []
    ]);

    // Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      profiles: {
        member: user.memberProfile,
        company: user.companyProfile,
        mentor: user.mentorProfile,
        government: user.governmentProfile,
        institution: user.institutionProfile,
        fifo: user.fifoProfile
      },
      employment: {
        jobs: user.jobs,
        applications: user.applications.map(app => ({
          ...app,
          job: app.job
        })),
        savedJobs: user.savedJobs,
        savedSearches
      },
      education: {
        courseEnrolments: user.courseEnrolments,
        skills: user.userSkills
      },
      career: {
        milestones: careerMilestones,
        goals: careerGoals
      },
      mentorship: {
        asMentor: user.mentorSessions,
        asMentee: user.menteeSessions
      },
      community: {
        forumThreads,
        forumReplies,
        messages: user.messages
      },
      wellness: {
        checkIns: wellnessCheckIns,
        communitySupport: communitySupport ? decryptModelData('CommunitySupport', communitySupport) : null
      },
      files: user.uploadedFiles,
      consents,
      notifications
    };

    // Log the export
    await logAuditEvent({
      category: AuditCategory.DATA,
      event: AuditEvent.DATA_EXPORT_COMPLETED,
      userId,
      metadata: {
        exportSize: JSON.stringify(exportData).length,
        sections: Object.keys(exportData).length
      }
    });

    return exportData;
  } catch (error) {
    logger.error('Error exporting user data:', error);
    throw error;
  }
}

/**
 * Cascade delete all user data (Right to be Forgotten)
 * @param {string} userId - User ID
 * @param {boolean} immediate - Skip grace period
 * @returns {object} Deletion summary
 */
async function deleteUserData(userId, immediate = false) {
  const deletionSummary = {
    userId,
    requestedAt: new Date().toISOString(),
    immediate,
    deletedRecords: {}
  };

  try {
    // If not immediate, schedule for later
    if (!immediate) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          deletionScheduledAt: new Date(Date.now() + RETENTION_PERIODS.deletedUsers * 24 * 60 * 60 * 1000)
        }
      });

      deletionSummary.status = 'scheduled';
      deletionSummary.scheduledFor = new Date(Date.now() + RETENTION_PERIODS.deletedUsers * 24 * 60 * 60 * 1000);
      
      await logAuditEvent({
        category: AuditCategory.DATA,
        event: AuditEvent.DATA_DELETION_REQUESTED,
        userId,
        metadata: { scheduledFor: deletionSummary.scheduledFor }
      });

      return deletionSummary;
    }

    // Immediate deletion - cascade through all related tables
    await prisma.$transaction(async (tx) => {
      // Delete in order of dependencies (children first)
      
      // Notifications
      const notifications = await tx.notification.deleteMany({ where: { userId } });
      deletionSummary.deletedRecords.notifications = notifications.count;

      // Saved searches and alerts
      const savedSearches = await tx.savedSearch?.deleteMany({ where: { userId } }) || { count: 0 };
      deletionSummary.deletedRecords.savedSearches = savedSearches.count;

      // Career tracking
      const milestones = await tx.careerMilestone?.deleteMany({ where: { userId } }) || { count: 0 };
      const goals = await tx.careerGoal?.deleteMany({ where: { userId } }) || { count: 0 };
      deletionSummary.deletedRecords.careerMilestones = milestones.count;
      deletionSummary.deletedRecords.careerGoals = goals.count;

      // Wellness data
      const wellness = await tx.wellnessCheckIn?.deleteMany({ where: { userId } }) || { count: 0 };
      const support = await tx.communitySupport?.deleteMany({ where: { userId } }) || { count: 0 };
      deletionSummary.deletedRecords.wellnessCheckIns = wellness.count;
      deletionSummary.deletedRecords.communitySupport = support.count;

      // Forum content (anonymize rather than delete to preserve threads)
      const threads = await tx.forumThread?.updateMany({
        where: { authorId: userId },
        data: { authorId: null, isAnonymized: true }
      }) || { count: 0 };
      const replies = await tx.forumReply?.updateMany({
        where: { authorId: userId },
        data: { authorId: null, isAnonymized: true }
      }) || { count: 0 };
      deletionSummary.deletedRecords.forumThreadsAnonymized = threads.count;
      deletionSummary.deletedRecords.forumRepliesAnonymized = replies.count;

      // Messages
      const messages = await tx.applicationMessage.deleteMany({ where: { senderId: userId } });
      deletionSummary.deletedRecords.messages = messages.count;

      // Mentorship sessions
      const mentorSessions = await tx.mentorSession.deleteMany({
        where: { OR: [{ mentorId: userId }, { menteeId: userId }] }
      });
      deletionSummary.deletedRecords.mentorSessions = mentorSessions.count;

      // Course enrolments
      const enrolments = await tx.courseEnrolment.deleteMany({ where: { userId } });
      deletionSummary.deletedRecords.courseEnrolments = enrolments.count;

      // Skills
      const skills = await tx.userSkill.deleteMany({ where: { userId } });
      deletionSummary.deletedRecords.userSkills = skills.count;

      // Saved jobs
      const savedJobs = await tx.savedJob.deleteMany({ where: { userId } });
      deletionSummary.deletedRecords.savedJobs = savedJobs.count;

      // Applications
      const applications = await tx.jobApplication.deleteMany({ where: { userId } });
      deletionSummary.deletedRecords.applications = applications.count;

      // Jobs (for employers)
      const jobs = await tx.job.deleteMany({ where: { userId } });
      deletionSummary.deletedRecords.jobs = jobs.count;

      // Files
      const files = await tx.uploadedFile.deleteMany({ where: { userId } });
      deletionSummary.deletedRecords.files = files.count;

      // Consents
      const consents = await tx.userConsent?.deleteMany({ where: { userId } }) || { count: 0 };
      deletionSummary.deletedRecords.consents = consents.count;

      // Sessions
      const sessions = await tx.userSession?.deleteMany({ where: { userId } }) || { count: 0 };
      deletionSummary.deletedRecords.sessions = sessions.count;

      // Profiles
      await tx.memberProfile?.delete({ where: { userId } }).catch(() => {});
      await tx.companyProfile?.delete({ where: { userId } }).catch(() => {});
      await tx.mentorProfile?.delete({ where: { userId } }).catch(() => {});
      await tx.governmentProfile?.delete({ where: { userId } }).catch(() => {});
      await tx.institutionProfile?.delete({ where: { userId } }).catch(() => {});
      await tx.fifoProfile?.delete({ where: { userId } }).catch(() => {});
      deletionSummary.deletedRecords.profiles = 'all';

      // Finally, delete the user
      await tx.user.delete({ where: { id: userId } });
      deletionSummary.deletedRecords.user = 1;
    });

    deletionSummary.status = 'completed';
    deletionSummary.completedAt = new Date().toISOString();

    // Log the deletion (to a separate audit system since user is gone)
    logger.info('GDPR deletion completed', deletionSummary);

    return deletionSummary;
  } catch (error) {
    logger.error('Error deleting user data:', error);
    deletionSummary.status = 'failed';
    deletionSummary.error = error.message;
    throw error;
  }
}

/**
 * Record user consent
 * @param {string} userId - User ID
 * @param {string} consentType - Type of consent
 * @param {boolean} granted - Whether consent was granted
 * @param {object} metadata - Additional consent metadata
 */
async function recordConsent(userId, consentType, granted, metadata = {}) {
  const consent = await prisma.userConsent.upsert({
    where: {
      userId_consentType: { userId, consentType }
    },
    create: {
      userId,
      consentType,
      granted,
      grantedAt: granted ? new Date() : null,
      revokedAt: granted ? null : new Date(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      consentVersion: metadata.version || '1.0',
      consentData: JSON.stringify(metadata)
    },
    update: {
      granted,
      grantedAt: granted ? new Date() : undefined,
      revokedAt: granted ? null : new Date(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      updatedAt: new Date()
    }
  });

  // Log consent change
  await logAuditEvent({
    category: AuditCategory.DATA,
    event: granted ? 'CONSENT_GRANTED' : 'CONSENT_REVOKED',
    userId,
    metadata: {
      consentType,
      consentId: consent.id
    }
  });

  return consent;
}

/**
 * Get user's consent status
 * @param {string} userId - User ID
 * @param {string} consentType - Optional specific consent type
 */
async function getConsentStatus(userId, consentType = null) {
  const where = { userId };
  if (consentType) {
    where.consentType = consentType;
  }

  const consents = await prisma.userConsent.findMany({ where });

  if (consentType) {
    return consents[0] || null;
  }

  return consents.reduce((acc, consent) => {
    acc[consent.consentType] = {
      granted: consent.granted,
      grantedAt: consent.grantedAt,
      revokedAt: consent.revokedAt,
      version: consent.consentVersion
    };
    return acc;
  }, {});
}

/**
 * Run automated data retention cleanup
 */
async function runRetentionCleanup() {
  const results = {
    startedAt: new Date().toISOString(),
    cleaned: {}
  };

  try {
    // Clean old sessions
    const sessionCutoff = new Date(Date.now() - RETENTION_PERIODS.sessions * 24 * 60 * 60 * 1000);
    const sessions = await prisma.userSession?.deleteMany({
      where: { lastActiveAt: { lt: sessionCutoff } }
    }) || { count: 0 };
    results.cleaned.sessions = sessions.count;

    // Clean old notifications
    const notifCutoff = new Date(Date.now() - RETENTION_PERIODS.notifications * 24 * 60 * 60 * 1000);
    const notifications = await prisma.notification.deleteMany({
      where: { createdAt: { lt: notifCutoff }, isRead: true }
    });
    results.cleaned.notifications = notifications.count;

    // Clean old email queue entries
    const emailCutoff = new Date(Date.now() - RETENTION_PERIODS.emailQueue * 24 * 60 * 60 * 1000);
    const emails = await prisma.emailQueue?.deleteMany({
      where: { createdAt: { lt: emailCutoff }, status: { in: ['sent', 'failed'] } }
    }) || { count: 0 };
    results.cleaned.emailQueue = emails.count;

    // Process scheduled deletions
    const pendingDeletions = await prisma.user.findMany({
      where: {
        deletionScheduledAt: { lte: new Date() }
      },
      select: { id: true }
    });

    for (const user of pendingDeletions) {
      try {
        await deleteUserData(user.id, true);
        results.cleaned.scheduledDeletions = (results.cleaned.scheduledDeletions || 0) + 1;
      } catch (error) {
        logger.error(`Failed to delete scheduled user ${user.id}:`, error);
      }
    }

    results.completedAt = new Date().toISOString();
    logger.info('Retention cleanup completed', results);

    return results;
  } catch (error) {
    logger.error('Retention cleanup failed:', error);
    results.error = error.message;
    throw error;
  }
}

/**
 * Get data processing registry (Article 30 GDPR)
 */
function getDataProcessingRegistry() {
  return {
    controller: {
      name: 'Ngurra Pathways',
      contact: 'privacy@ngurrapathways.com.au',
      dpo: 'dpo@ngurrapathways.com.au'
    },
    processingActivities: [
      {
        purpose: 'Employment Services',
        dataCategories: ['Identity', 'Contact', 'Professional', 'Education'],
        legalBasis: 'Contract performance',
        retention: '3 years after account closure',
        recipients: ['Employers (with consent)', 'Training providers']
      },
      {
        purpose: 'Mentorship Matching',
        dataCategories: ['Identity', 'Professional', 'Cultural background'],
        legalBasis: 'Consent',
        retention: 'Until consent withdrawn',
        recipients: ['Matched mentors/mentees']
      },
      {
        purpose: 'Wellness Support',
        dataCategories: ['Health', 'Wellbeing assessments'],
        legalBasis: 'Explicit consent',
        retention: '1 year or until withdrawal',
        recipients: ['Support services (with consent)']
      },
      {
        purpose: 'Platform Analytics',
        dataCategories: ['Usage data', 'Device information'],
        legalBasis: 'Legitimate interest',
        retention: '1 year',
        recipients: ['Analytics processors']
      },
      {
        purpose: 'Community Safety',
        dataCategories: ['Community support needs', 'Safety information'],
        legalBasis: 'Vital interests / Explicit consent',
        retention: 'As required for support',
        recipients: ['Authorized support workers']
      }
    ],
    securityMeasures: [
      'AES-256-GCM encryption for sensitive fields',
      'TLS 1.3 for data in transit',
      'Role-based access control',
      'Audit logging',
      'Regular security assessments'
    ],
    internationalTransfers: 'Data stored in Australia. No routine international transfers.',
    updatedAt: new Date().toISOString()
  };
}
