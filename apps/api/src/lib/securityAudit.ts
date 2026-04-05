/**
 * Security Audit Logger
 * 
 * Logs security-relevant events for compliance and monitoring.
 */

import { logger } from './logger';
import { prisma } from '../db';

// Security event types
export const SecurityEventType = {
  // Authentication events
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILURE: 'auth.login.failure',
  LOGIN_BLOCKED: 'auth.login.blocked',
  LOGOUT: 'auth.logout',
  TOKEN_REFRESH: 'auth.token.refresh',
  TOKEN_REVOKED: 'auth.token.revoked',
  
  // Password events
  PASSWORD_CHANGE: 'auth.password.change',
  PASSWORD_RESET_REQUEST: 'auth.password.reset.request',
  PASSWORD_RESET_COMPLETE: 'auth.password.reset.complete',
  PASSWORD_RESET_FAILURE: 'auth.password.reset.failure',
  
  // 2FA events
  MFA_ENABLED: 'auth.mfa.enabled',
  MFA_DISABLED: 'auth.mfa.disabled',
  MFA_SUCCESS: 'auth.mfa.success',
  MFA_FAILURE: 'auth.mfa.failure',
  MFA_BACKUP_USED: 'auth.mfa.backup.used',
  
  // Session events
  SESSION_CREATED: 'session.created',
  SESSION_TERMINATED: 'session.terminated',
  SESSION_EXPIRED: 'session.expired',
  SESSION_SUSPICIOUS: 'session.suspicious',
  
  // Account events
  ACCOUNT_CREATED: 'account.created',
  ACCOUNT_LOCKED: 'account.locked',
  ACCOUNT_UNLOCKED: 'account.unlocked',
  ACCOUNT_LOCKOUT: 'account.lockout',
  ACCOUNT_DELETED: 'account.deleted',
  EMAIL_CHANGED: 'account.email.changed',
  ROLE_CHANGED: 'account.role.changed',
  
  // Access events
  PERMISSION_GRANTED: 'access.permission.granted',
  PERMISSION_DENIED: 'access.permission.denied',
  API_KEY_CREATED: 'access.apikey.created',
  API_KEY_GENERATED: 'access.apikey.generated',
  API_KEY_REVOKED: 'access.apikey.revoked',
  
  // Security events (Phase 1 additions)
  SUSPICIOUS_ACTIVITY: 'security.suspicious',
  DEVICE_TRUSTED: 'security.device.trusted',
  DEVICE_REVOKED: 'security.device.revoked',
  WOMEN_SPACE_ACCESS: 'access.women.space',
  
  // Data events
  DATA_EXPORT: 'data.export',
  DATA_ACCESS: 'data.access',
  SENSITIVE_VIEW: 'data.sensitive.view',
  
  // Content moderation events
  CONTENT_FLAGGED: 'content.flagged',
  CONTENT_MODERATED: 'content.moderated',
};

// Severity levels
export const Severity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

/**
 * Log a security event
 */
export async function logSecurityEvent(event: any) {
  const {
    type,
    userId = null,
    targetUserId = null,
    description,
    metadata = {},
    severity = Severity.INFO,
    ipAddress = null,
    userAgent = null,
    requestId = null,
  } = event;

  // Create log entry object
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    userId,
    targetUserId,
    description,
    metadata,
    severity,
    ipAddress,
    userAgent,
    requestId,
  };

  // Log to structured logger
  const logFn = severity === 'critical' ? logger.error :
                severity === 'error' ? logger.error :
                severity === 'warning' ? logger.warn :
                logger.info;

  logFn(`[SECURITY] ${type}: ${description}`, { 
    security: true,
    ...logEntry 
  });

  // Persist to database for audit trail
  try {
    await prisma.auditLog.create({
      data: {
        category: 'SECURITY',
        event: type,
        action: type,
        severity: severity.toUpperCase(),
        userId,
        targetUserId,
        metadata: JSON.stringify({ description, ...metadata }),
        ipAddress,
        userAgent,
      },
    });
  } catch (error: any) {
    // Don't fail the request if logging fails, but log the error
    logger.error('Failed to persist security audit log', { error: error.message });
  }

  return logEntry;
}

/**
 * Extract request metadata for logging
 */
export function getRequestMetadata(req: any) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress,
    userAgent: req.headers['user-agent'],
    requestId: req.requestId || req.headers['x-request-id'],
    origin: req.headers.origin,
    referer: req.headers.referer,
  };
}

/**
 * Log authentication success
 */
export async function logAuthSuccess(userId: string, req: any, metadata: any = {}) {
  const reqMeta = getRequestMetadata(req);
  return logSecurityEvent({
    type: SecurityEventType.LOGIN_SUCCESS,
    userId,
    description: 'User logged in successfully',
    metadata: { ...metadata, method: req.body?.method || 'password' },
    severity: Severity.INFO,
    ...reqMeta,
  });
}

/**
 * Log authentication failure
 */
export async function logAuthFailure(email: string, req: any, reason: string = 'Invalid credentials') {
  const reqMeta = getRequestMetadata(req);
  return logSecurityEvent({
    type: SecurityEventType.LOGIN_FAILURE,
    userId: null,
    description: `Login failed for ${email}: ${reason}`,
    metadata: { email, reason },
    severity: Severity.WARNING,
    ...reqMeta,
  });
}

/**
 * Log blocked login attempt (rate limited or locked)
 */
export async function logLoginBlocked(email: string, req: any, reason: string) {
  const reqMeta = getRequestMetadata(req);
  return logSecurityEvent({
    type: SecurityEventType.LOGIN_BLOCKED,
    userId: null,
    description: `Login blocked for ${email}: ${reason}`,
    metadata: { email, reason },
    severity: Severity.WARNING,
    ...reqMeta,
  });
}

/**
 * Log password change
 */
export async function logPasswordChange(userId: string, req: any, isReset: boolean = false) {
  const reqMeta = getRequestMetadata(req);
  return logSecurityEvent({
    type: isReset ? SecurityEventType.PASSWORD_RESET_COMPLETE : SecurityEventType.PASSWORD_CHANGE,
    userId,
    description: isReset ? 'Password reset completed' : 'Password changed',
    severity: Severity.INFO,
    ...reqMeta,
  });
}

/**
 * Log 2FA event
 */
export async function logMfaEvent(type: string, userId: string, req: any, success: boolean = true) {
  const reqMeta = getRequestMetadata(req);
  return logSecurityEvent({
    type,
    userId,
    description: `MFA event: ${type}`,
    metadata: { success },
    severity: success ? Severity.INFO : Severity.WARNING,
    ...reqMeta,
  });
}

/**
 * Log session event
 */
export async function logSessionEvent(type: string, userId: string, sessionId: string, req: any, metadata: any = {}) {
  const reqMeta = getRequestMetadata(req);
  return logSecurityEvent({
    type,
    userId,
    description: `Session event: ${type}`,
    metadata: { sessionId, ...metadata },
    severity: Severity.INFO,
    ...reqMeta,
  });
}

/**
 * Log account event
 */
export async function logAccountEvent(type: string, userId: string, req: any, targetUserId: string | null = null, metadata: any = {}) {
  const reqMeta = getRequestMetadata(req);
  return logSecurityEvent({
    type,
    userId,
    targetUserId,
    description: `Account event: ${type}`,
    metadata,
    severity: type === SecurityEventType.ACCOUNT_LOCKED ? Severity.WARNING : Severity.INFO,
    ...reqMeta,
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(userId: string, req: any, description: string, metadata: any = {}) {
  const reqMeta = getRequestMetadata(req);
  return logSecurityEvent({
    type: SecurityEventType.SESSION_SUSPICIOUS,
    userId,
    description: `Suspicious activity: ${description}`,
    metadata,
    severity: Severity.WARNING,
    ...reqMeta,
  });
}

/**
 * Query security logs
 */
export async function querySecurityLogs(filters: any = {}) {
  const {
    userId,
    eventType,
    severity,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = filters;

  const where: any = { category: 'SECURITY' };
  if (userId) where.userId = userId;
  if (eventType) where.event = eventType;
  if (severity) where.severity = severity.toUpperCase();
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.auditLog.count({ where });

  return { logs, total, limit, offset };
}
