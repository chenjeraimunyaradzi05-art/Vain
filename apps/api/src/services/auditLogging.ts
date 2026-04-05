/**
 * Audit Logging Service
 * 
 * Provides comprehensive audit trail for:
 * - Security compliance (SOC 2, GDPR)
 * - User activity tracking
 * - Data access logging
 * - Administrative actions
 * - Authentication events
 * - Sensitive data changes
 */

import { prisma } from '../lib/database';
import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

// Types
export interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  category: AuditCategory;
  action: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  description: string;
  metadata?: Record<string, unknown>;
  changes?: ChangeRecord[];
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  success: boolean;
  errorMessage?: string;
  severity: AuditSeverity;
  environment: string;
}

export interface ChangeRecord {
  field: string;
  oldValue?: unknown;
  newValue?: unknown;
  sensitive?: boolean;
}

export type AuditEventType =
  // Authentication
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED_LOGIN'
  | 'AUTH_PASSWORD_RESET'
  | 'AUTH_PASSWORD_CHANGE'
  | 'AUTH_MFA_ENABLED'
  | 'AUTH_MFA_DISABLED'
  | 'AUTH_SESSION_REVOKED'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_ACCOUNT_LOCKED'
  // User Management
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'USER_VERIFICATION'
  | 'USER_PROFILE_UPDATE'
  // Data Access
  | 'DATA_READ'
  | 'DATA_EXPORT'
  | 'DATA_BULK_READ'
  // Content
  | 'CONTENT_CREATED'
  | 'CONTENT_UPDATED'
  | 'CONTENT_DELETED'
  | 'CONTENT_MODERATED'
  | 'CONTENT_REPORTED'
  // Jobs & Applications
  | 'JOB_CREATED'
  | 'JOB_UPDATED'
  | 'JOB_DELETED'
  | 'JOB_APPLICATION_CREATED'
  | 'JOB_APPLICATION_STATUS_CHANGE'
  // Messaging
  | 'MESSAGE_SENT'
  | 'MESSAGE_DELETED'
  | 'CONVERSATION_CREATED'
  // Connections
  | 'CONNECTION_REQUEST_SENT'
  | 'CONNECTION_ACCEPTED'
  | 'CONNECTION_BLOCKED'
  // Mentorship
  | 'MENTORSHIP_CREATED'
  | 'MENTORSHIP_STATUS_CHANGE'
  | 'SESSION_SCHEDULED'
  | 'SESSION_COMPLETED'
  // Admin Actions
  | 'ADMIN_USER_IMPERSONATION'
  | 'ADMIN_CONFIG_CHANGE'
  | 'ADMIN_PERMISSION_GRANT'
  | 'ADMIN_PERMISSION_REVOKE'
  | 'ADMIN_DATA_DELETION'
  | 'ADMIN_BULK_ACTION'
  // Security
  | 'SECURITY_SUSPICIOUS_ACTIVITY'
  | 'SECURITY_RATE_LIMIT_EXCEEDED'
  | 'SECURITY_PERMISSION_DENIED'
  | 'SECURITY_INVALID_TOKEN'
  | 'SECURITY_IP_BLOCKED'
  // System
  | 'SYSTEM_ERROR'
  | 'SYSTEM_MAINTENANCE'
  | 'SYSTEM_BACKUP'
  | 'SYSTEM_RESTORE';

export type AuditCategory =
  | 'authentication'
  | 'user_management'
  | 'data_access'
  | 'content'
  | 'jobs'
  | 'messaging'
  | 'connections'
  | 'mentorship'
  | 'admin'
  | 'security'
  | 'system';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface AuditQuery {
  userId?: string;
  eventTypes?: AuditEventType[];
  category?: AuditCategory;
  targetType?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: AuditSeverity;
  success?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// Event severity mapping
const EVENT_SEVERITY: Record<AuditEventType, AuditSeverity> = {
  // Authentication - mostly high
  AUTH_LOGIN: 'low',
  AUTH_LOGOUT: 'low',
  AUTH_FAILED_LOGIN: 'medium',
  AUTH_PASSWORD_RESET: 'high',
  AUTH_PASSWORD_CHANGE: 'high',
  AUTH_MFA_ENABLED: 'medium',
  AUTH_MFA_DISABLED: 'high',
  AUTH_SESSION_REVOKED: 'medium',
  AUTH_TOKEN_REFRESH: 'low',
  AUTH_ACCOUNT_LOCKED: 'high',
  // User management
  USER_CREATED: 'medium',
  USER_UPDATED: 'low',
  USER_DELETED: 'high',
  USER_ROLE_CHANGED: 'high',
  USER_STATUS_CHANGED: 'medium',
  USER_VERIFICATION: 'medium',
  USER_PROFILE_UPDATE: 'low',
  // Data access
  DATA_READ: 'low',
  DATA_EXPORT: 'high',
  DATA_BULK_READ: 'medium',
  // Content
  CONTENT_CREATED: 'low',
  CONTENT_UPDATED: 'low',
  CONTENT_DELETED: 'medium',
  CONTENT_MODERATED: 'medium',
  CONTENT_REPORTED: 'medium',
  // Jobs
  JOB_CREATED: 'low',
  JOB_UPDATED: 'low',
  JOB_DELETED: 'medium',
  JOB_APPLICATION_CREATED: 'low',
  JOB_APPLICATION_STATUS_CHANGE: 'medium',
  // Messaging
  MESSAGE_SENT: 'low',
  MESSAGE_DELETED: 'low',
  CONVERSATION_CREATED: 'low',
  // Connections
  CONNECTION_REQUEST_SENT: 'low',
  CONNECTION_ACCEPTED: 'low',
  CONNECTION_BLOCKED: 'medium',
  // Mentorship
  MENTORSHIP_CREATED: 'low',
  MENTORSHIP_STATUS_CHANGE: 'medium',
  SESSION_SCHEDULED: 'low',
  SESSION_COMPLETED: 'low',
  // Admin
  ADMIN_USER_IMPERSONATION: 'critical',
  ADMIN_CONFIG_CHANGE: 'high',
  ADMIN_PERMISSION_GRANT: 'high',
  ADMIN_PERMISSION_REVOKE: 'high',
  ADMIN_DATA_DELETION: 'critical',
  ADMIN_BULK_ACTION: 'high',
  // Security
  SECURITY_SUSPICIOUS_ACTIVITY: 'critical',
  SECURITY_RATE_LIMIT_EXCEEDED: 'medium',
  SECURITY_PERMISSION_DENIED: 'medium',
  SECURITY_INVALID_TOKEN: 'medium',
  SECURITY_IP_BLOCKED: 'high',
  // System
  SYSTEM_ERROR: 'high',
  SYSTEM_MAINTENANCE: 'medium',
  SYSTEM_BACKUP: 'medium',
  SYSTEM_RESTORE: 'high',
};

// Event category mapping
const EVENT_CATEGORY: Record<AuditEventType, AuditCategory> = {
  AUTH_LOGIN: 'authentication',
  AUTH_LOGOUT: 'authentication',
  AUTH_FAILED_LOGIN: 'authentication',
  AUTH_PASSWORD_RESET: 'authentication',
  AUTH_PASSWORD_CHANGE: 'authentication',
  AUTH_MFA_ENABLED: 'authentication',
  AUTH_MFA_DISABLED: 'authentication',
  AUTH_SESSION_REVOKED: 'authentication',
  AUTH_TOKEN_REFRESH: 'authentication',
  AUTH_ACCOUNT_LOCKED: 'authentication',
  USER_CREATED: 'user_management',
  USER_UPDATED: 'user_management',
  USER_DELETED: 'user_management',
  USER_ROLE_CHANGED: 'user_management',
  USER_STATUS_CHANGED: 'user_management',
  USER_VERIFICATION: 'user_management',
  USER_PROFILE_UPDATE: 'user_management',
  DATA_READ: 'data_access',
  DATA_EXPORT: 'data_access',
  DATA_BULK_READ: 'data_access',
  CONTENT_CREATED: 'content',
  CONTENT_UPDATED: 'content',
  CONTENT_DELETED: 'content',
  CONTENT_MODERATED: 'content',
  CONTENT_REPORTED: 'content',
  JOB_CREATED: 'jobs',
  JOB_UPDATED: 'jobs',
  JOB_DELETED: 'jobs',
  JOB_APPLICATION_CREATED: 'jobs',
  JOB_APPLICATION_STATUS_CHANGE: 'jobs',
  MESSAGE_SENT: 'messaging',
  MESSAGE_DELETED: 'messaging',
  CONVERSATION_CREATED: 'messaging',
  CONNECTION_REQUEST_SENT: 'connections',
  CONNECTION_ACCEPTED: 'connections',
  CONNECTION_BLOCKED: 'connections',
  MENTORSHIP_CREATED: 'mentorship',
  MENTORSHIP_STATUS_CHANGE: 'mentorship',
  SESSION_SCHEDULED: 'mentorship',
  SESSION_COMPLETED: 'mentorship',
  ADMIN_USER_IMPERSONATION: 'admin',
  ADMIN_CONFIG_CHANGE: 'admin',
  ADMIN_PERMISSION_GRANT: 'admin',
  ADMIN_PERMISSION_REVOKE: 'admin',
  ADMIN_DATA_DELETION: 'admin',
  ADMIN_BULK_ACTION: 'admin',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security',
  SECURITY_RATE_LIMIT_EXCEEDED: 'security',
  SECURITY_PERMISSION_DENIED: 'security',
  SECURITY_INVALID_TOKEN: 'security',
  SECURITY_IP_BLOCKED: 'security',
  SYSTEM_ERROR: 'system',
  SYSTEM_MAINTENANCE: 'system',
  SYSTEM_BACKUP: 'system',
  SYSTEM_RESTORE: 'system',
};

class AuditLoggingService {
  private static instance: AuditLoggingService;
  private readonly LOG_BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 5000;
  private buffer: AuditLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private environment: string;

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.startAutoFlush();
  }

  static getInstance(): AuditLoggingService {
    if (!AuditLoggingService.instance) {
      AuditLoggingService.instance = new AuditLoggingService();
    }
    return AuditLoggingService.instance;
  }

  // ==================== Core Logging ====================

  /**
   * Log an audit event
   */
  async log(
    eventType: AuditEventType,
    description: string,
    context: AuditContext = {},
    options: {
      action?: string;
      targetType?: string;
      targetId?: string;
      targetName?: string;
      metadata?: Record<string, unknown>;
      changes?: ChangeRecord[];
      success?: boolean;
      errorMessage?: string;
      immediate?: boolean;
    } = {}
  ): Promise<string> {
    const auditLog: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      eventType,
      category: EVENT_CATEGORY[eventType],
      action: options.action || eventType.toLowerCase().replace(/_/g, ' '),
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole,
      targetType: options.targetType,
      targetId: options.targetId,
      targetName: options.targetName,
      description,
      metadata: options.metadata,
      changes: options.changes ? this.sanitizeChanges(options.changes) : undefined,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      sessionId: context.sessionId,
      requestId: context.requestId,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      severity: EVENT_SEVERITY[eventType],
      environment: this.environment,
    };

    // Log to logger for immediate visibility
    this.logToLogger(auditLog);

    // For critical/high severity, store immediately
    if (options.immediate || auditLog.severity === 'critical' || auditLog.severity === 'high') {
      await this.persistLog(auditLog);
    } else {
      this.buffer.push(auditLog);
      if (this.buffer.length >= this.LOG_BUFFER_SIZE) {
        await this.flush();
      }
    }

    // Trigger alerts for critical events
    if (auditLog.severity === 'critical') {
      await this.triggerAlert(auditLog);
    }

    return auditLog.id;
  }

  /**
   * Log authentication events
   */
  async logAuth(
    eventType: Extract<AuditEventType, `AUTH_${string}`>,
    context: AuditContext,
    success: boolean = true,
    errorMessage?: string
  ): Promise<string> {
    const descriptions: Record<string, string> = {
      AUTH_LOGIN: success ? 'User logged in successfully' : 'Login attempt failed',
      AUTH_LOGOUT: 'User logged out',
      AUTH_FAILED_LOGIN: 'Failed login attempt',
      AUTH_PASSWORD_RESET: 'Password reset requested',
      AUTH_PASSWORD_CHANGE: 'Password changed',
      AUTH_MFA_ENABLED: 'Multi-factor authentication enabled',
      AUTH_MFA_DISABLED: 'Multi-factor authentication disabled',
      AUTH_SESSION_REVOKED: 'Session revoked',
      AUTH_TOKEN_REFRESH: 'Token refreshed',
      AUTH_ACCOUNT_LOCKED: 'Account locked due to multiple failed attempts',
    };

    return this.log(eventType, descriptions[eventType] || eventType, context, {
      success,
      errorMessage,
    });
  }

  /**
   * Log user management events
   */
  async logUserManagement(
    eventType: Extract<AuditEventType, `USER_${string}`>,
    context: AuditContext,
    targetUserId: string,
    changes?: ChangeRecord[],
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const descriptions: Record<string, string> = {
      USER_CREATED: 'New user account created',
      USER_UPDATED: 'User account updated',
      USER_DELETED: 'User account deleted',
      USER_ROLE_CHANGED: 'User role changed',
      USER_STATUS_CHANGED: 'User status changed',
      USER_VERIFICATION: 'User verified their account',
      USER_PROFILE_UPDATE: 'User profile updated',
    };

    return this.log(eventType, descriptions[eventType] || eventType, context, {
      targetType: 'user',
      targetId: targetUserId,
      changes,
      metadata,
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    eventType: Extract<AuditEventType, `DATA_${string}`>,
    context: AuditContext,
    options: {
      targetType: string;
      targetId?: string;
      recordCount?: number;
      fields?: string[];
      exportFormat?: string;
    }
  ): Promise<string> {
    let description = '';
    switch (eventType) {
      case 'DATA_READ':
        description = `Accessed ${options.targetType} data`;
        break;
      case 'DATA_EXPORT':
        description = `Exported ${options.recordCount || 'unknown'} ${options.targetType} records to ${options.exportFormat || 'file'}`;
        break;
      case 'DATA_BULK_READ':
        description = `Bulk read ${options.recordCount || 'unknown'} ${options.targetType} records`;
        break;
    }

    return this.log(eventType, description, context, {
      targetType: options.targetType,
      targetId: options.targetId,
      metadata: {
        recordCount: options.recordCount,
        fields: options.fields,
        exportFormat: options.exportFormat,
      },
    });
  }

  /**
   * Log admin actions
   */
  async logAdminAction(
    eventType: Extract<AuditEventType, `ADMIN_${string}`>,
    context: AuditContext,
    description: string,
    options: {
      targetType?: string;
      targetId?: string;
      targetName?: string;
      changes?: ChangeRecord[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    return this.log(eventType, description, context, {
      ...options,
      immediate: true, // Admin actions should be persisted immediately
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    eventType: Extract<AuditEventType, `SECURITY_${string}`>,
    context: AuditContext,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    return this.log(eventType, description, context, {
      metadata,
      success: false,
      immediate: true,
    });
  }

  // ==================== Querying ====================

  /**
   * Query audit logs
   */
  async query(query: AuditQuery): Promise<{
    logs: AuditLog[];
    total: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0 } = query;

    // Build query key for caching
    const cacheKey = `audit:query:${JSON.stringify(query)}`;
    const cached = await redisCache.get<{ logs: AuditLog[]; total: number }>(cacheKey);
    if (cached) {
      return { ...cached, hasMore: offset + limit < cached.total };
    }

    // In production, query database
    // For now, return from in-memory buffer
    let logs = [...this.buffer];

    // Apply filters
    if (query.userId) {
      logs = logs.filter(l => l.userId === query.userId);
    }
    if (query.eventTypes?.length) {
      logs = logs.filter(l => query.eventTypes!.includes(l.eventType));
    }
    if (query.category) {
      logs = logs.filter(l => l.category === query.category);
    }
    if (query.targetType) {
      logs = logs.filter(l => l.targetType === query.targetType);
    }
    if (query.targetId) {
      logs = logs.filter(l => l.targetId === query.targetId);
    }
    if (query.severity) {
      logs = logs.filter(l => l.severity === query.severity);
    }
    if (query.success !== undefined) {
      logs = logs.filter(l => l.success === query.success);
    }
    if (query.startDate) {
      logs = logs.filter(l => l.timestamp >= query.startDate!);
    }
    if (query.endDate) {
      logs = logs.filter(l => l.timestamp <= query.endDate!);
    }
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      logs = logs.filter(l =>
        l.description.toLowerCase().includes(searchLower) ||
        l.action.toLowerCase().includes(searchLower) ||
        l.userEmail?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = logs.length;
    const paginatedLogs = logs.slice(offset, offset + limit);

    const result = { logs: paginatedLogs, total };
    await redisCache.set(cacheKey, result, 60); // Cache for 1 minute

    return { logs: paginatedLogs, total, hasMore: offset + limit < total };
  }

  /**
   * Get audit log by ID
   */
  async getById(id: string): Promise<AuditLog | null> {
    const log = this.buffer.find(l => l.id === id);
    if (log) return log;

    // In production, query database
    return null;
  }

  /**
   * Get user activity timeline
   */
  async getUserActivityTimeline(
    userId: string,
    options: { limit?: number; startDate?: Date; endDate?: Date } = {}
  ): Promise<AuditLog[]> {
    const result = await this.query({
      userId,
      limit: options.limit || 100,
      startDate: options.startDate,
      endDate: options.endDate,
    });

    return result.logs;
  }

  /**
   * Get object audit history
   */
  async getObjectHistory(
    targetType: string,
    targetId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    const result = await this.query({
      targetType,
      targetId,
      limit,
    });

    return result.logs;
  }

  // ==================== Reporting ====================

  /**
   * Get audit summary for time period
   */
  async getSummary(
    startDate: Date,
    endDate: Date,
    groupBy: 'eventType' | 'category' | 'severity' | 'hour' | 'day' = 'category'
  ): Promise<Record<string, number>> {
    const result = await this.query({ startDate, endDate, limit: 10000 });
    const summary: Record<string, number> = {};

    for (const log of result.logs) {
      let key: string;
      switch (groupBy) {
        case 'eventType':
          key = log.eventType;
          break;
        case 'category':
          key = log.category;
          break;
        case 'severity':
          key = log.severity;
          break;
        case 'hour':
          key = log.timestamp.toISOString().slice(0, 13);
          break;
        case 'day':
          key = log.timestamp.toISOString().slice(0, 10);
          break;
      }
      summary[key] = (summary[key] || 0) + 1;
    }

    return summary;
  }

  /**
   * Get security report
   */
  async getSecurityReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    failedLogins: number;
    suspiciousActivity: number;
    blockedIPs: number;
    permissionDenied: number;
    criticalEvents: AuditLog[];
  }> {
    const result = await this.query({
      category: 'security',
      startDate,
      endDate,
      limit: 10000,
    });

    const report = {
      failedLogins: 0,
      suspiciousActivity: 0,
      blockedIPs: 0,
      permissionDenied: 0,
      criticalEvents: [] as AuditLog[],
    };

    for (const log of result.logs) {
      if (log.eventType === 'AUTH_FAILED_LOGIN') report.failedLogins++;
      if (log.eventType === 'SECURITY_SUSPICIOUS_ACTIVITY') report.suspiciousActivity++;
      if (log.eventType === 'SECURITY_IP_BLOCKED') report.blockedIPs++;
      if (log.eventType === 'SECURITY_PERMISSION_DENIED') report.permissionDenied++;
      if (log.severity === 'critical') report.criticalEvents.push(log);
    }

    return report;
  }

  // ==================== Internal Methods ====================

  /**
   * Sanitize changes to hide sensitive values
   */
  private sanitizeChanges(changes: ChangeRecord[]): ChangeRecord[] {
    const sensitiveFields = ['password', 'secret', 'token', 'apiKey', 'ssn', 'creditCard'];

    return changes.map(change => {
      if (change.sensitive || sensitiveFields.some(f => 
        change.field.toLowerCase().includes(f)
      )) {
        return {
          ...change,
          oldValue: change.oldValue ? '[REDACTED]' : undefined,
          newValue: change.newValue ? '[REDACTED]' : undefined,
          sensitive: true,
        };
      }
      return change;
    });
  }

  /**
   * Log to application logger
   */
  private logToLogger(auditLog: AuditLog): void {
    const logData = {
      auditId: auditLog.id,
      event: auditLog.eventType,
      user: auditLog.userId,
      target: auditLog.targetType && auditLog.targetId
        ? `${auditLog.targetType}:${auditLog.targetId}`
        : undefined,
      success: auditLog.success,
      ip: auditLog.ipAddress,
    };

    switch (auditLog.severity) {
      case 'critical':
        logger.error(auditLog.description, logData);
        break;
      case 'high':
        logger.warn(auditLog.description, logData);
        break;
      default:
        logger.info(auditLog.description, logData);
    }
  }

  /**
   * Persist log to storage
   */
  private async persistLog(log: AuditLog): Promise<void> {
    try {
      // Store in database (when available)
      // await prisma.auditLog?.create({ data: log });

      // Store recent logs in Redis for quick access
      await redisCache.listPush('audit:recent', log, 1000);
      await redisCache.set(`audit:log:${log.id}`, log, 86400 * 90); // 90 days

      // Store by user for timeline
      if (log.userId) {
        await redisCache.listPush(`audit:user:${log.userId}`, log.id, 1000);
      }

      // Store by target for object history
      if (log.targetType && log.targetId) {
        await redisCache.listPush(
          `audit:object:${log.targetType}:${log.targetId}`,
          log.id,
          500
        );
      }
    } catch (error) {
      logger.error('Failed to persist audit log', { error, logId: log.id });
    }
  }

  /**
   * Trigger alert for critical events
   */
  private async triggerAlert(log: AuditLog): Promise<void> {
    // In production, send to alerting system (PagerDuty, Slack, etc.)
    logger.warn('CRITICAL AUDIT EVENT', {
      eventType: log.eventType,
      description: log.description,
      userId: log.userId,
      ip: log.ipAddress,
    });
  }

  /**
   * Flush buffer to storage
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const logsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      for (const log of logsToFlush) {
        await this.persistLog(log);
      }
      logger.debug('Flushed audit logs', { count: logsToFlush.length });
    } catch (error) {
      logger.error('Failed to flush audit logs', { error });
      // Re-add to buffer
      this.buffer = [...logsToFlush, ...this.buffer];
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        logger.error('Auto-flush failed', { error: err });
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Stop auto-flush timer
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush().catch(() => {});
  }
}

// Export singleton
export const auditLogger = AuditLoggingService.getInstance();

