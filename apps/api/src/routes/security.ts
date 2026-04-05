// @ts-nocheck
"use strict";
/**
 * Security Routes
 * 
 * API endpoints for security features:
 * - Session management (view, terminate sessions)
 * - Two-factor authentication (enable, verify, disable)
 * - Security dashboard (admin)
 * - Security alerts (admin)
 * - Maintenance mode control (admin)
 * - GDPR data export/deletion
 */

import express from 'express';
// @ts-ignore
import { authenticate, authorize } from '../middleware/auth';
import { prisma as prismaClient } from '../db';
import logger from '../lib/logger';
// @ts-ignore
import { audit } from '../lib/auditLog';
import * as sessionManager from '../lib/sessionManager';

const prisma = prismaClient as any;
import * as twoFactorAuth from '../lib/twoFactorAuth';
import securityAlerts from '../lib/securityAlerts';
import maintenanceMode from '../lib/maintenanceMode';
import gdprService from '../services/gdprService';

const router = express.Router();

// ==========================================
// Session Management Routes
// ==========================================

/**
 * GET /security/sessions
 * Get all active sessions for the current user
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await sessionManager.getUserSessions(req.user.id);
    
    // Mark current session
    const currentSessionId = req.headers['x-session-id'];
    const sessionsWithCurrent = sessions.map(s => ({
      ...s,
      isCurrent: s.id === currentSessionId
    }));
    
    res.json({
      sessions: sessionsWithCurrent,
      maxSessions: sessionManager.SESSION_CONFIG.maxConcurrentSessions
    });
  } catch (error) {
    logger.error('Get sessions error', { error: error.message });
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

/**
 * DELETE /security/sessions/:id
 * Terminate a specific session
 */
router.delete('/sessions/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sessionManager.invalidateSession(id, req.user.id, req);
    
    if (!result.success) {
      return void res.status(404).json({ error: result.message });
    }
    
    res.json({ message: 'Session terminated' });
  } catch (error) {
    logger.error('Terminate session error', { error: error.message });
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

/**
 * POST /security/sessions/terminate-all
 * Terminate all sessions except current
 */
router.post('/sessions/terminate-all', authenticate, async (req, res) => {
  try {
    const currentSessionId = req.headers['x-session-id'];
    const result = await sessionManager.invalidateAllSessions(
      req.user.id, 
      req, 
      currentSessionId
    );
    
    res.json({
      message: result.message,
      terminatedCount: result.count
    });
  } catch (error) {
    logger.error('Terminate all sessions error', { error: error.message });
    res.status(500).json({ error: 'Failed to terminate sessions' });
  }
});

// ==========================================
// Two-Factor Authentication Routes
// ==========================================

/**
 * GET /security/2fa/status
 * Check 2FA status for current user
 */
router.get('/2fa/status', authenticate, async (req, res) => {
  try {
    const status = await twoFactorAuth.check2FAStatus(req.user.id);
    res.json(status);
  } catch (error) {
    logger.error('2FA status error', { error: error.message });
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

/**
 * POST /security/2fa/enable
 * Start 2FA setup - returns secret and QR code URL
 */
router.post('/2fa/enable', authenticate, async (req, res) => {
  try {
    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, twoFactorEnabled: true }
    });
    
    if (user.twoFactorEnabled) {
      return void res.status(400).json({ error: '2FA is already enabled' });
    }
    
    const result = await twoFactorAuth.enable2FA(req.user.id, user.email);
    
    res.json({
      message: 'Scan the QR code with your authenticator app',
      secret: result.secret,
      otpauthUrl: result.otpauthUrl,
      backupCodes: result.backupCodes // Store these safely!
    });
  } catch (error) {
    logger.error('2FA enable error', { error: error.message });
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

/**
 * POST /security/2fa/verify
 * Verify 2FA token to complete setup
 */
router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return void res.status(400).json({ error: 'Verification code required' });
    }
    
    const result = await twoFactorAuth.verify2FA(req.user.id, token, req);
    
    if (!result.success) {
      return void res.status(400).json({ error: result.message });
    }
    
    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    logger.error('2FA verify error', { error: error.message });
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /security/2fa/disable
 * Disable 2FA (requires current token)
 */
router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return void res.status(400).json({ error: 'Verification code required' });
    }
    
    const result = await twoFactorAuth.disable2FA(req.user.id, token, req);
    
    if (!result.success) {
      return void res.status(400).json({ error: result.message });
    }
    
    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    logger.error('2FA disable error', { error: error.message });
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * POST /security/2fa/backup-codes
 * Regenerate backup codes (requires current token)
 */
router.post('/2fa/backup-codes', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return void res.status(400).json({ error: 'Verification code required' });
    }
    
    const result = await twoFactorAuth.regenerateBackupCodes(req.user.id, token, req);
    
    if (!result.success) {
      return void res.status(400).json({ error: result.message });
    }
    
    res.json({
      message: 'New backup codes generated',
      backupCodes: result.backupCodes
    });
  } catch (error) {
    logger.error('Backup codes error', { error: error.message });
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
});

// ==========================================
// Admin Security Dashboard Routes
// ==========================================

/**
 * GET /security/admin/overview
 * Get security overview for admin dashboard
 */
router.get('/admin/overview', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Session statistics
    const sessionStats = await sessionManager.getSessionStats();
    
    // Failed login attempts (last 24h)
    const failedLogins = await prisma.auditLog?.count({
      where: {
        event: 'LOGIN_FAILED',
        timestamp: { gte: last24h }
      }
    }) || 0;
    
    // Suspicious activity (last 7d)
    const suspiciousActivity = await prisma.auditLog?.count({
      where: {
        event: 'SUSPICIOUS_ACTIVITY',
        timestamp: { gte: last7d }
      }
    }) || 0;
    
    // 2FA adoption
    const [total2FA, enabled2FA] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { twoFactorEnabled: true } })
    ]);
    
    // Rate limit triggers (last 24h)
    const rateLimitHits = await prisma.auditLog?.count({
      where: {
        event: 'RATE_LIMIT_EXCEEDED',
        timestamp: { gte: last24h }
      }
    }) || 0;
    
    res.json({
      sessions: sessionStats,
      security: {
        failedLogins24h: failedLogins,
        suspiciousActivity7d: suspiciousActivity,
        rateLimitHits24h: rateLimitHits
      },
      twoFactor: {
        totalUsers: total2FA,
        enabledCount: enabled2FA,
        adoptionRate: total2FA > 0 ? Math.round((enabled2FA / total2FA) * 100) : 0
      }
    });
  } catch (error) {
    logger.error('Security overview error', { error: error.message });
    res.status(500).json({ error: 'Failed to get security overview' });
  }
});

/**
 * GET /security/admin/audit-logs
 * Get recent audit logs
 */
router.get('/admin/audit-logs', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      category, 
      event, 
      severity,
      userId,
      startDate,
      endDate 
    } = req.query;
    
    const where: any = {};
    
    if (category) where.category = category;
    if (event) where.event = event;
    if (severity) where.severity = severity;
    if (userId) where.userId = userId;
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [logs, total] = await Promise.all([
      prisma.auditLog?.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit),
        skip
      }) || [],
      prisma.auditLog?.count({ where }) || 0
    ]);
    
    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Audit logs error', { error: error.message });
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

/**
 * GET /security/admin/suspicious-activity
 * Get suspicious activity reports
 */
router.get('/admin/suspicious-activity', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const activity = await prisma.auditLog?.findMany({
      where: {
        event: 'SUSPICIOUS_ACTIVITY',
        timestamp: { gte: last7d }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    }) || [];
    
    // Group by user/IP
    const grouped = {};
    for (const log of activity) {
      const key = log.userId || log.ipAddress || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          userId: log.userId,
          ipAddress: log.ipAddress,
          incidents: [],
          count: 0
        };
      }
      grouped[key].incidents.push({
        timestamp: log.timestamp,
        metadata: JSON.parse(log.metadata || '{}')
      });
      grouped[key].count++;
    }
    
    const reports = Object.values(grouped)
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 20);
    
    res.json({ reports, totalIncidents: activity.length });
  } catch (error) {
    logger.error('Suspicious activity error', { error: error.message });
    res.status(500).json({ error: 'Failed to get suspicious activity' });
  }
});

/**
 * POST /security/admin/cleanup-sessions
 * Clean up expired sessions (admin action)
 */
router.post('/admin/cleanup-sessions', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const cleaned = await sessionManager.cleanupExpiredSessions();
    
    await audit.adminConfigChanged(req.user.id, req, {
      action: 'session_cleanup',
      cleanedCount: cleaned
    });
    
    res.json({ message: `Cleaned up ${cleaned} expired sessions` });
  } catch (error) {
    logger.error('Session cleanup error', { error: error.message });
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/**
 * GET /security/admin/users-without-2fa
 * List users without 2FA enabled (for security reporting)
 */
router.get('/admin/users-without-2fa', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { role, limit = 50 } = req.query;
    
    const where: any = { twoFactorEnabled: false };
    if (role) where.role = role;
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        lastLoginAt: true
      },
      orderBy: { lastLoginAt: 'desc' },
      take: parseInt(limit)
    });
    
    res.json({ users, total: users.length });
  } catch (error) {
    logger.error('Users without 2FA error', { error: error.message });
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// ==========================================
// Security Alerts Routes (Phase 6)
// ==========================================

/**
 * GET /security/admin/alerts
 * Get security alerts with optional filtering
 */
router.get('/admin/alerts', authenticate, authorize(['admin']), async (req, res) => {
  try {
    if (!securityAlerts) {
      return void res.status(501).json({ error: 'Security alerts not available' });
    }
    
    const { type, severity, acknowledged } = req.query;
    const filter: any = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';
    
    const alerts = securityAlerts.getAlerts(filter);
    const stats = securityAlerts.getAlertStats();
    
    res.json({ alerts, stats });
  } catch (error) {
    logger.error('Get alerts error', { error: error.message });
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

/**
 * POST /security/admin/alerts/:id/acknowledge
 * Acknowledge a security alert
 */
router.post('/admin/alerts/:id/acknowledge', authenticate, authorize(['admin']), async (req, res) => {
  try {
    if (!securityAlerts) {
      return void res.status(501).json({ error: 'Security alerts not available' });
    }
    
    const { id } = req.params;
    const success = securityAlerts.acknowledgeAlert(id);
    
    if (success) {
      await audit.adminConfigChanged(req.user.id, req, {
        action: 'alert_acknowledged',
        alertId: id
      });
      res.json({ success: true, message: 'Alert acknowledged' });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  } catch (error) {
    logger.error('Acknowledge alert error', { error: error.message });
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// ==========================================
// Maintenance Mode Routes (Phase 6)
// ==========================================

/**
 * GET /security/admin/maintenance
 * Get current maintenance mode status
 */
router.get('/admin/maintenance', authenticate, authorize(['admin']), async (req, res) => {
  try {
    if (!maintenanceMode) {
      return void res.json({ active: false, config: { enabled: false } });
    }
    
    const status = await maintenanceMode.getMaintenanceStatus();
    res.json(status);
  } catch (error) {
    logger.error('Get maintenance status error', { error: error.message });
    res.status(500).json({ error: 'Failed to get maintenance status' });
  }
});

/**
 * POST /security/admin/maintenance/enable
 * Enable maintenance mode
 */
router.post('/admin/maintenance/enable', authenticate, authorize(['admin']), async (req, res) => {
  try {
    if (!maintenanceMode) {
      return void res.status(501).json({ error: 'Maintenance mode not available' });
    }
    
    const { message, endTime, bypassToken } = req.body;
    
    await maintenanceMode.enableMaintenance({
      message,
      endTime: endTime ? new Date(endTime) : undefined,
      bypassToken
    });
    
    await audit.adminConfigChanged(req.user.id, req, {
      action: 'maintenance_enabled',
      message,
      endTime
    });
    
    logger.info('Maintenance mode enabled', { userId: req.user.id });
    res.json({ success: true, message: 'Maintenance mode enabled' });
  } catch (error) {
    logger.error('Enable maintenance error', { error: error.message });
    res.status(500).json({ error: 'Failed to enable maintenance mode' });
  }
});

/**
 * POST /security/admin/maintenance/disable
 * Disable maintenance mode
 */
router.post('/admin/maintenance/disable', authenticate, authorize(['admin']), async (req, res) => {
  try {
    if (!maintenanceMode) {
      return void res.status(501).json({ error: 'Maintenance mode not available' });
    }
    
    await maintenanceMode.disableMaintenance();
    
    await audit.adminConfigChanged(req.user.id, req, {
      action: 'maintenance_disabled'
    });
    
    logger.info('Maintenance mode disabled', { userId: req.user.id });
    res.json({ success: true, message: 'Maintenance mode disabled' });
  } catch (error) {
    logger.error('Disable maintenance error', { error: error.message });
    res.status(500).json({ error: 'Failed to disable maintenance mode' });
  }
});

/**
 * POST /security/admin/maintenance/schedule
 * Schedule a maintenance window
 */
router.post('/admin/maintenance/schedule', authenticate, authorize(['admin']), async (req, res) => {
  try {
    if (!maintenanceMode) {
      return void res.status(501).json({ error: 'Maintenance mode not available' });
    }
    
    const { startTime, endTime, message } = req.body;
    
    if (!startTime || !endTime) {
      return void res.status(400).json({ error: 'startTime and endTime are required' });
    }
    
    await maintenanceMode.scheduleMaintenanceWindow(
      new Date(startTime),
      new Date(endTime),
      message
    );
    
    await audit.adminConfigChanged(req.user.id, req, {
      action: 'maintenance_scheduled',
      startTime,
      endTime
    });
    
    res.json({ success: true, message: 'Maintenance window scheduled', startTime, endTime });
  } catch (error) {
    logger.error('Schedule maintenance error', { error: error.message });
    res.status(500).json({ error: 'Failed to schedule maintenance' });
  }
});

// ==========================================
// GDPR / Data Export Routes (Phase 4)
// ==========================================

/**
 * POST /security/data-export
 * Request a data export (GDPR right to data portability)
 */
router.post('/data-export', authenticate, async (req, res) => {
  try {
    if (!gdprService) {
      return void res.status(501).json({ error: 'Data export not available' });
    }
    
    const exportData = await gdprService.exportUserData(req.user.id);
    
    // @ts-ignore
    await audit.log(req.user.id, 'DATA_EXPORT_REQUESTED', req);
    
    res.json({
      message: 'Data export ready',
      data: exportData,
      exportedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Data export error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * POST /security/delete-account
 * Request account deletion (GDPR right to erasure)
 */
router.post('/delete-account', authenticate, async (req, res) => {
  try {
    if (!gdprService) {
      return void res.status(501).json({ error: 'Account deletion not available' });
    }
    
    const { password, confirmPassword, reason } = req.body;
    const pwd = password || confirmPassword;
    
    if (!pwd) {
      return void res.status(400).json({ error: 'Password confirmation required' });
    }
    
    // Verify password first
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true }
    });
    
    const bcrypt = require('bcryptjs');
    const validPassword = await bcrypt.compare(pwd, user.password);
    
    if (!validPassword) {
      return void res.status(401).json({ error: 'Invalid password' });
    }
    
    // Soft delete (30 day recovery period)
    await gdprService.softDeleteUser(req.user.id, reason);
    
    // @ts-ignore
    await audit.log(req.user.id, 'ACCOUNT_DELETION_REQUESTED', req, {
      reason,
      scheduledDeletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    
    res.json({
      message: 'Account scheduled for deletion',
      deletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      recoveryPeriod: '30 days'
    });
  } catch (error) {
    logger.error('Delete account error', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to schedule account deletion' });
  }
});

/**
 * POST /security/cancel-deletion
 * Cancel pending account deletion
 */
router.post('/cancel-deletion', authenticate, async (req, res) => {
  try {
    // Reactivate account
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        deletedAt: null,
        deletionReason: null
      }
    });
    
    // @ts-ignore
    await audit.log(req.user.id, 'ACCOUNT_DELETION_CANCELLED', req);
    
    res.json({ message: 'Account deletion cancelled' });
  } catch (error) {
    logger.error('Cancel deletion error', { error: error.message });
    res.status(500).json({ error: 'Failed to cancel deletion' });
  }
});

export default router;


