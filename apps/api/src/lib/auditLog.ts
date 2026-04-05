"use strict";
/**
 * Audit Logging System
 * 
 * Comprehensive audit trail for sensitive operations.
 * Tracks user actions, security events, and compliance data.
 */

import { prisma } from '../db';
import { logger } from './logger';

/**
 * Audit event categories
 */
export const AuditCategory = {
  AUTH: 'AUTH',
  USER: 'USER',
  JOB: 'JOB',
  APPLICATION: 'APPLICATION',
  PAYMENT: 'PAYMENT',
  ADMIN: 'ADMIN',
  DATA: 'DATA',
  SECURITY: 'SECURITY',
  API: 'API',
  SYSTEM: 'SYSTEM'
};

/**
 * Audit event types
 */
export const AuditEvent = {
  // Auth events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  TOKEN_REFRESHED: 'TOKEN_REFRESHED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',
  
  // User events
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  EMAIL_CHANGED: 'EMAIL_CHANGED',
  
  // Job events
  JOB_CREATED: 'JOB_CREATED',
  JOB_UPDATED: 'JOB_UPDATED',
  JOB_DELETED: 'JOB_DELETED',
  JOB_PUBLISHED: 'JOB_PUBLISHED',
  JOB_UNPUBLISHED: 'JOB_UNPUBLISHED',
  
  // Application events
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  APPLICATION_UPDATED: 'APPLICATION_UPDATED',
  APPLICATION_WITHDRAWN: 'APPLICATION_WITHDRAWN',
  APPLICATION_STATUS_CHANGED: 'APPLICATION_STATUS_CHANGED',
  
  // Payment events
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  REFUND_ISSUED: 'REFUND_ISSUED',
  
  // Admin events
  ADMIN_USER_IMPERSONATION: 'ADMIN_USER_IMPERSONATION',
  ADMIN_DATA_EXPORT: 'ADMIN_DATA_EXPORT',
  ADMIN_CONFIG_CHANGED: 'ADMIN_CONFIG_CHANGED',
  ADMIN_BULK_ACTION: 'ADMIN_BULK_ACTION',
  
  // Data events
  DATA_EXPORT_REQUESTED: 'DATA_EXPORT_REQUESTED',
  DATA_EXPORT_COMPLETED: 'DATA_EXPORT_COMPLETED',
  DATA_DELETION_REQUESTED: 'DATA_DELETION_REQUESTED',
  DATA_DELETION_COMPLETED: 'DATA_DELETION_COMPLETED',
  
  // Security events
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  
  // System events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
};

/**
 * Severity levels
 */
export const Severity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Get severity for an event type
 */
function getSeverity(eventType) {
  const highSeverity = [
    AuditEvent.LOGIN_FAILED,
    AuditEvent.PASSWORD_RESET_REQUESTED,
    AuditEvent.PASSWORD_CHANGED,
    AuditEvent.USER_DELETED,
    AuditEvent.PAYMENT_FAILED,
    AuditEvent.ADMIN_USER_IMPERSONATION,
    AuditEvent.DATA_DELETION_REQUESTED,
    AuditEvent.SUSPICIOUS_ACTIVITY,
    AuditEvent.PERMISSION_DENIED
  ];
  
  const criticalSeverity = [
    AuditEvent.ADMIN_DATA_EXPORT,
    AuditEvent.DATA_DELETION_COMPLETED,
    AuditEvent.API_KEY_REVOKED,
    AuditEvent.SYSTEM_ERROR,
    AuditEvent.DATABASE_ERROR
  ];
  
  if (criticalSeverity.includes(eventType)) return Severity.CRITICAL;
  if (highSeverity.includes(eventType)) return Severity.HIGH;
  return Severity.LOW;
}

/**
 * Create an audit log entry
 * 
 * @param {Object} params - Audit log parameters
 * @param {string} params.category - Event category (AUTH, USER, etc.)
 * @param {string} params.event - Event type
 * @param {string} [params.userId] - User who performed the action
 * @param {string} [params.targetUserId] - User affected by the action
 * @param {string} [params.targetResourceId] - Resource affected (job ID, application ID, etc.)
 * @param {string} [params.targetResourceType] - Type of resource (Job, Application, etc.)
 * @param {Object} [params.metadata] - Additional context
 * @param {Object} [params.request] - Express request object for IP/user-agent
 */
export async function createAuditLog(args: any) {
  const {
  category,
  event,
  userId = null,
  targetUserId = null,
  targetResourceId = null,
  targetResourceType = null,
  metadata = {},
  request = null
} = args;
  try {
    const logEntry = {
      category,
      event,
      action: event,
      severity: getSeverity(event),
      userId,
      targetUserId,
      targetResourceId,
      targetResourceType,
      metadata: JSON.stringify(metadata),
      ipAddress: request?.ip || request?.connection?.remoteAddress || null,
      userAgent: request?.get?.('User-Agent') || null,
      timestamp: new Date()
    };
    
    // Log to structured logger
    logger.info('Audit event', {
      auditEvent: logEntry.event,
      category: logEntry.category,
      severity: logEntry.severity,
      userId: logEntry.userId,
      targetResourceId: logEntry.targetResourceId
    });
    
    // Store in database (if AuditLog model exists)
    try {
      if (prisma.auditLog) {
        await prisma.auditLog.create({ data: logEntry });
      }
    } catch (dbErr) {
      // Model may not exist yet - log to file only
      logger.warn('AuditLog database write failed (model may not exist)', { 
        error: dbErr.message 
      });
    }
    
    return logEntry;
  } catch (err) {
    logger.error('Failed to create audit log', { error: err.message });
    // Don't throw - audit logging should never break the main flow
    return null;
  }
}

/**
 * Convenience methods for common audit events
 */
export const audit = {
  // Auth events
  loginSuccess: (userId, req, metadata = {}) => 
    createAuditLog({ 
      category: AuditCategory.AUTH, 
      event: AuditEvent.LOGIN_SUCCESS, 
      userId, 
      request: req,
      metadata 
    }),
    
  loginFailed: (email, req, reason = 'Invalid credentials') => 
    createAuditLog({ 
      category: AuditCategory.AUTH, 
      event: AuditEvent.LOGIN_FAILED, 
      request: req,
      metadata: { email, reason } 
    }),
    
  logout: (userId, req) => 
    createAuditLog({ 
      category: AuditCategory.AUTH, 
      event: AuditEvent.LOGOUT, 
      userId, 
      request: req 
    }),
    
  passwordResetRequested: (email, req) => 
    createAuditLog({ 
      category: AuditCategory.AUTH, 
      event: AuditEvent.PASSWORD_RESET_REQUESTED, 
      request: req,
      metadata: { email } 
    }),
    
  passwordChanged: (userId, req) => 
    createAuditLog({ 
      category: AuditCategory.AUTH, 
      event: AuditEvent.PASSWORD_CHANGED, 
      userId, 
      request: req 
    }),
  
  // User events
  userCreated: (userId, createdByUserId, req, metadata = {}) => 
    createAuditLog({ 
      category: AuditCategory.USER, 
      event: AuditEvent.USER_CREATED, 
      userId: createdByUserId,
      targetUserId: userId, 
      request: req,
      metadata 
    }),
    
  userUpdated: (userId, updatedByUserId, req, changes = {}) => 
    createAuditLog({ 
      category: AuditCategory.USER, 
      event: AuditEvent.USER_UPDATED, 
      userId: updatedByUserId,
      targetUserId: userId, 
      request: req,
      metadata: { changes } 
    }),
    
  userDeleted: (userId, deletedByUserId, req) => 
    createAuditLog({ 
      category: AuditCategory.USER, 
      event: AuditEvent.USER_DELETED, 
      userId: deletedByUserId,
      targetUserId: userId, 
      request: req 
    }),
  
  // Job events
  jobCreated: (jobId, userId, req, metadata = {}) => 
    createAuditLog({ 
      category: AuditCategory.JOB, 
      event: AuditEvent.JOB_CREATED, 
      userId,
      targetResourceId: jobId,
      targetResourceType: 'Job',
      request: req,
      metadata 
    }),
    
  jobUpdated: (jobId, userId, req, changes = {}) => 
    createAuditLog({ 
      category: AuditCategory.JOB, 
      event: AuditEvent.JOB_UPDATED, 
      userId,
      targetResourceId: jobId,
      targetResourceType: 'Job',
      request: req,
      metadata: { changes } 
    }),
  
  // Application events
  applicationSubmitted: (applicationId, userId, jobId, req) => 
    createAuditLog({ 
      category: AuditCategory.APPLICATION, 
      event: AuditEvent.APPLICATION_SUBMITTED, 
      userId,
      targetResourceId: applicationId,
      targetResourceType: 'JobApplication',
      request: req,
      metadata: { jobId } 
    }),
    
  applicationStatusChanged: (applicationId, userId, oldStatus, newStatus, req) => 
    createAuditLog({ 
      category: AuditCategory.APPLICATION, 
      event: AuditEvent.APPLICATION_STATUS_CHANGED, 
      userId,
      targetResourceId: applicationId,
      targetResourceType: 'JobApplication',
      request: req,
      metadata: { oldStatus, newStatus } 
    }),
  
  // Payment events
  paymentCompleted: (paymentId, userId, amount, req) => 
    createAuditLog({ 
      category: AuditCategory.PAYMENT, 
      event: AuditEvent.PAYMENT_COMPLETED, 
      userId,
      targetResourceId: paymentId,
      targetResourceType: 'Payment',
      request: req,
      metadata: { amount } 
    }),
    
  paymentFailed: (paymentId, userId, reason, req) => 
    createAuditLog({ 
      category: AuditCategory.PAYMENT, 
      event: AuditEvent.PAYMENT_FAILED, 
      userId,
      targetResourceId: paymentId,
      targetResourceType: 'Payment',
      request: req,
      metadata: { reason } 
    }),
  
  // Admin events
  adminImpersonation: (adminId, targetUserId, req) => 
    createAuditLog({ 
      category: AuditCategory.ADMIN, 
      event: AuditEvent.ADMIN_USER_IMPERSONATION, 
      userId: adminId,
      targetUserId,
      request: req 
    }),
    
  adminDataExport: (adminId, exportType, req, metadata = {}) => 
    createAuditLog({ 
      category: AuditCategory.ADMIN, 
      event: AuditEvent.ADMIN_DATA_EXPORT, 
      userId: adminId,
      request: req,
      metadata: { exportType, ...metadata } 
    }),
  
  // Security events
  suspiciousActivity: (userId, activityType, req, metadata = {}) => 
    createAuditLog({ 
      category: AuditCategory.SECURITY, 
      event: AuditEvent.SUSPICIOUS_ACTIVITY, 
      userId,
      request: req,
      metadata: { activityType, ...metadata } 
    }),
    
  permissionDenied: (userId, resource, action, req) => 
    createAuditLog({ 
      category: AuditCategory.SECURITY, 
      event: AuditEvent.PERMISSION_DENIED, 
      userId,
      request: req,
      metadata: { resource, action } 
    }),
    
  rateLimitExceeded: (userId, endpoint, req) => 
    createAuditLog({ 
      category: AuditCategory.SECURITY, 
      event: AuditEvent.RATE_LIMIT_EXCEEDED, 
      userId,
      request: req,
      metadata: { endpoint } 
    }),
  
  // MFA events
  mfaEnabled: (userId, req) => 
    createAuditLog({ 
      category: AuditCategory.AUTH, 
      event: AuditEvent.MFA_ENABLED, 
      userId,
      request: req 
    }),
    
  mfaDisabled: (userId, req) => 
    createAuditLog({ 
      category: AuditCategory.AUTH, 
      event: AuditEvent.MFA_DISABLED, 
      userId,
      request: req 
    }),
  
  // Admin config changes
  adminConfigChanged: (userId, req, metadata = {}) => 
    createAuditLog({ 
      category: AuditCategory.ADMIN, 
      event: AuditEvent.ADMIN_CONFIG_CHANGED, 
      userId,
      request: req,
      metadata 
    }),
  
  // Generic create function for custom events
  create: (params) => createAuditLog(params),
  
  // Data sovereignty events
  dataExportRequested: (userId, req) => 
    createAuditLog({ 
      category: AuditCategory.DATA, 
      event: AuditEvent.DATA_EXPORT_REQUESTED, 
      userId,
      request: req 
    }),
    
  dataDeletionRequested: (userId, req) => 
    createAuditLog({ 
      category: AuditCategory.DATA, 
      event: AuditEvent.DATA_DELETION_REQUESTED, 
      userId,
      request: req 
    }),
  
  // System events
  systemError: (errorType, errorMessage, metadata = {}) => 
    createAuditLog({ 
      category: AuditCategory.SYSTEM, 
      event: AuditEvent.SYSTEM_ERROR, 
      metadata: { errorType, errorMessage, ...metadata } 
    })
};

/**
 * Query audit logs
 * 
 * @param {Object} filters - Query filters
 * @param {number} [page=1] - Page number
 * @param {number} [pageSize=50] - Results per page
 */
export async function queryAuditLogs(filters: any = {}, page = 1, pageSize = 50) {
  try {
    if (!prisma.auditLog) {
      return { logs: [], total: 0, page, pageSize };
    }
    
    const where: any = {};
    
    if (filters.category) where.category = filters.category;
    if (filters.event) where.event = filters.event;
    if (filters.userId) where.userId = filters.userId;
    if (filters.severity) where.severity = filters.severity;
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = new Date(filters.startDate);
      if (filters.endDate) where.timestamp.lte = new Date(filters.endDate);
    }
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.auditLog.count({ where })
    ]);
    
    return { logs, total, page, pageSize };
  } catch (err) {
    logger.error('Failed to query audit logs', { error: err.message });
    return { logs: [], total: 0, page, pageSize, error: err.message };
  }
}



export {};
