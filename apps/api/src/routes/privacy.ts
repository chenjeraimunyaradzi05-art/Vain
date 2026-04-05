"use strict";
/**
 * GDPR Privacy Routes
 * 
 * Exposes GDPR compliance tools via REST API:
 * - Data export (portable format)
 * - Right to be forgotten (deletion request)
 * - Consent management
 * - Data processing registry
 * 
 * Step 4: GDPR/Privacy Compliance
 */

const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { 
  exportUserData, 
  deleteUserData, 
  recordConsent, 
  getConsentStatus,
  getDataProcessingRegistry,
  RETENTION_PERIODS
} = require('../lib/gdprCompliance');
const { logAuditEvent, AuditEvent, AuditCategory } = require('../lib/auditLog');
const { logger } = require('../lib/logger');

const router = express.Router();

/**
 * GET /privacy/export
 * Request full data export (GDPR Article 20)
 */
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    // Log the export request
    await logAuditEvent({
      category: AuditCategory.DATA,
      event: AuditEvent.DATA_EXPORT_REQUESTED,
      userId,
      request: req
    });

    const exportData = await exportUserData(userId);

    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="ngurra-data-export-${Date.now()}.json"`);
    
    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      format: 'JSON',
      data: exportData
    });
  } catch (error) {
    logger.error('Data export failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export data. Please try again or contact support.' 
    });
  }
});

/**
 * POST /privacy/deletion-request
 * Request account and data deletion (Right to be Forgotten)
 */
router.post('/deletion-request', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { immediate = false, reason } = req.body;

    // Log the deletion request
    await logAuditEvent({
      category: AuditCategory.DATA,
      event: AuditEvent.DATA_DELETION_REQUESTED,
      userId,
      request: req,
      metadata: { reason, immediate }
    });

    const result = await deleteUserData(userId, immediate);

    if (result.status === 'scheduled') {
      res.json({
        success: true,
        message: `Your account is scheduled for deletion on ${result.scheduledFor.toISOString().split('T')[0]}. You can cancel this by logging in before that date.`,
        scheduledFor: result.scheduledFor,
        gracePeriodDays: RETENTION_PERIODS.deletedUsers
      });
    } else {
      res.json({
        success: true,
        message: 'Your account and data have been permanently deleted.',
        deletedRecords: result.deletedRecords
      });
    }
  } catch (error) {
    logger.error('Deletion request failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process deletion request. Please contact support.' 
    });
  }
});

/**
 * POST /privacy/cancel-deletion
 * Cancel a scheduled deletion request
 */
router.post('/cancel-deletion', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { prisma } = require('../db');

    await prisma.user.update({
      where: { id: userId },
      data: { deletionScheduledAt: null }
    });

    await logAuditEvent({
      category: AuditCategory.DATA,
      event: 'DATA_DELETION_CANCELLED',
      userId,
      request: req
    });

    res.json({
      success: true,
      message: 'Your deletion request has been cancelled. Your account is now active.'
    });
  } catch (error) {
    logger.error('Cancel deletion failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel deletion request.' 
    });
  }
});

/**
 * GET /privacy/consents
 * Get user's consent status for all consent types
 */
router.get('/consents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const consents = await getConsentStatus(userId);

    res.json({
      success: true,
      consents
    });
  } catch (error) {
    logger.error('Get consents failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve consent status.' 
    });
  }
});

/**
 * POST /privacy/consents
 * Update consent for a specific type
 */
router.post('/consents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { consentType, granted } = req.body;

    if (!consentType || typeof granted !== 'boolean') {
      return void res.status(400).json({
        success: false,
        error: 'consentType and granted (boolean) are required'
      });
    }

    const validTypes = [
      'marketing_email',
      'marketing_sms',
      'analytics',
      'third_party_sharing',
      'wellness_data',
      'community_support',
      'research',
      'cultural_data'
    ];

    if (!validTypes.includes(consentType)) {
      return void res.status(400).json({
        success: false,
        error: `Invalid consent type. Valid types: ${validTypes.join(', ')}`
      });
    }

    const consent = await recordConsent(userId, consentType, granted, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      version: '1.0'
    });

    res.json({
      success: true,
      consent: {
        type: consentType,
        granted: consent.granted,
        updatedAt: consent.updatedAt
      }
    });
  } catch (error) {
    logger.error('Update consent failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update consent.' 
    });
  }
});

/**
 * GET /privacy/registry
 * Get data processing registry (Article 30)
 */
router.get('/registry', optionalAuth, async (req, res) => {
  try {
    const registry = getDataProcessingRegistry();
    res.json({
      success: true,
      registry
    });
  } catch (error) {
    logger.error('Get registry failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve data processing registry.' 
    });
  }
});

/**
 * GET /privacy/retention
 * Get data retention periods
 */
router.get('/retention', optionalAuth, async (req, res) => {
  res.json({
    success: true,
    retentionPeriods: Object.entries(RETENTION_PERIODS).map(([key, days]) => {
      const daysNum = Number(days);
      return {
        dataType: key,
        retentionDays: daysNum,
        retentionDescription: daysNum < 365 
          ? `${daysNum} days` 
          : `${Math.round(daysNum / 365)} year(s)`
        };
    })
  });
});

/**
 * GET /privacy/status
 * Get user's privacy status overview
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { prisma } = require('../db');

    const [user, consents] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          createdAt: true,
          deletionScheduledAt: true
        }
      }),
      getConsentStatus(userId)
    ]);

    res.json({
      success: true,
      status: {
        accountCreated: user?.createdAt,
        deletionScheduled: user?.deletionScheduledAt,
        consents,
        dataExportAvailable: true,
        lastExport: null // Could track this if needed
      }
    });
  } catch (error) {
    logger.error('Get privacy status failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve privacy status.' 
    });
  }
});

export default router;


export {};

