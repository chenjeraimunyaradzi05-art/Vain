// @ts-nocheck
/**
 * Audit Logging
 * 
 * Comprehensive audit trail for security-sensitive operations.
 */

import type { Request } from 'express';

interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId: string | null;
  actorId: string | null;
  resourceType: string;
  resourceId: string | null;
  action: string;
  outcome: 'success' | 'failure';
  ip: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
}

type AuditEventType = 
  | 'auth.login'
  | 'auth.logout'
  | 'auth.login_failed'
  | 'auth.password_changed'
  | 'auth.mfa_enabled'
  | 'auth.mfa_disabled'
  | 'auth.token_refresh'
  | 'auth.session_revoked'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'user.role_changed'
  | 'user.email_verified'
  | 'admin.access'
  | 'admin.user_modified'
  | 'admin.settings_changed'
  | 'data.exported'
  | 'data.imported'
  | 'data.deleted'
  | 'api.key_created'
  | 'api.key_revoked'
  | 'security.rate_limited'
  | 'security.suspicious_activity'
  | 'security.blocked'
  | 'job.created'
  | 'job.updated'
  | 'job.deleted'
  | 'job.published'
  | 'application.submitted'
  | 'application.status_changed'
  | 'payment.initiated'
  | 'payment.completed'
  | 'payment.failed'
  | 'subscription.created'
  | 'subscription.cancelled';

/**
 * Create audit event
 */
export function createAuditEvent(
  eventType: AuditEventType,
  params: {
    userId?: string | null;
    actorId?: string | null;
    resourceType: string;
    resourceId?: string | null;
    action: string;
    outcome: 'success' | 'failure';
    req?: Request;
    metadata?: Record<string, unknown>;
    changes?: {
      before: Record<string, unknown>;
      after: Record<string, unknown>;
    };
  }
): AuditEvent {
  const event: AuditEvent = {
    id: generateAuditId(),
    timestamp: new Date().toISOString(),
    eventType,
    userId: params.userId ?? null,
    actorId: params.actorId ?? params.userId ?? null,
    resourceType: params.resourceType,
    resourceId: params.resourceId ?? null,
    action: params.action,
    outcome: params.outcome,
    ip: params.req ? getClientIp(params.req) : 'system',
    userAgent: params.req?.headers['user-agent'] || 'system',
    metadata: params.metadata || {},
    changes: params.changes,
  };

  return event;
}

/**
 * Generate unique audit ID
 */
function generateAuditId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `aud_${timestamp}${random}`;
}

/**
 * Get client IP
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection.remoteAddress ||
    'unknown'
  );
}

/**
 * Audit logger class
 */
class AuditLogger {
  private queue: AuditEvent[] = [];
  private readonly maxQueueSize = 100;
  private flushInterval: NodeJS.Timer | null = null;

  constructor() {
    // Auto-flush every 10 seconds
    this.flushInterval = setInterval(() => this.flush(), 10000);
  }

  /**
   * Log an audit event
   */
  async log(
    eventType: AuditEventType,
    params: Parameters<typeof createAuditEvent>[1]
  ): Promise<AuditEvent> {
    const event = createAuditEvent(eventType, params);
    
    // Immediately log critical events
    if (this.isCriticalEvent(eventType)) {
      await this.persist([event]);
    } else {
      this.queue.push(event);
      
      if (this.queue.length >= this.maxQueueSize) {
        await this.flush();
      }
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT]', JSON.stringify(event, null, 2));
    }

    return event;
  }

  /**
   * Check if event is critical
   */
  private isCriticalEvent(eventType: AuditEventType): boolean {
    const criticalEvents: AuditEventType[] = [
      'auth.login_failed',
      'security.rate_limited',
      'security.suspicious_activity',
      'security.blocked',
      'admin.access',
      'admin.user_modified',
      'user.deleted',
      'payment.failed',
    ];
    
    return criticalEvents.includes(eventType);
  }

  /**
   * Flush queued events to storage
   */
  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    await this.persist(events);
  }

  /**
   * Persist events to storage
   */
  private async persist(events: AuditEvent[]): Promise<void> {
    try {
      // In production, send to logging service
      if (process.env.AUDIT_LOG_ENDPOINT) {
        await fetch(process.env.AUDIT_LOG_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AUDIT_LOG_TOKEN}`,
          },
          body: JSON.stringify({ events }),
        });
      }

      // Also log to structured logger
      for (const event of events) {
        console.log(JSON.stringify({
          type: 'audit',
          ...event,
        }));
      }
    } catch (error) {
      console.error('Failed to persist audit events:', error);
      // Re-queue events
      this.queue.unshift(...events);
    }
  }

  /**
   * Query audit logs (for admin dashboard)
   */
  async query(filters: {
    userId?: string;
    eventType?: AuditEventType;
    startDate?: Date;
    endDate?: Date;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    // This would query the database in production
    // For now, return empty
    console.log('Audit query:', filters);
    return { events: [], total: 0 };
  }

  /**
   * Cleanup old audit logs
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    console.log(`Cleaning up audit logs older than ${cutoffDate.toISOString()}`);
    // Implement database cleanup
    return 0;
  }

  /**
   * Stop the audit logger
   */
  async stop(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

// Convenience methods
export const audit = {
  login: (req: Request, userId: string, outcome: 'success' | 'failure', metadata?: Record<string, unknown>) =>
    auditLogger.log(outcome === 'success' ? 'auth.login' : 'auth.login_failed', {
      userId,
      resourceType: 'auth',
      action: 'login',
      outcome,
      req,
      metadata,
    }),

  logout: (req: Request, userId: string) =>
    auditLogger.log('auth.logout', {
      userId,
      resourceType: 'auth',
      action: 'logout',
      outcome: 'success',
      req,
    }),

  adminAccess: (req: Request, userId: string, resource: string) =>
    auditLogger.log('admin.access', {
      userId,
      resourceType: 'admin',
      resourceId: resource,
      action: 'access',
      outcome: 'success',
      req,
    }),

  userCreated: (req: Request, actorId: string, newUserId: string) =>
    auditLogger.log('user.created', {
      userId: newUserId,
      actorId,
      resourceType: 'user',
      resourceId: newUserId,
      action: 'create',
      outcome: 'success',
      req,
    }),

  userDeleted: (req: Request, actorId: string, deletedUserId: string) =>
    auditLogger.log('user.deleted', {
      userId: deletedUserId,
      actorId,
      resourceType: 'user',
      resourceId: deletedUserId,
      action: 'delete',
      outcome: 'success',
      req,
    }),

  jobCreated: (req: Request, userId: string, jobId: string) =>
    auditLogger.log('job.created', {
      userId,
      resourceType: 'job',
      resourceId: jobId,
      action: 'create',
      outcome: 'success',
      req,
    }),

  applicationSubmitted: (req: Request, userId: string, applicationId: string, jobId: string) =>
    auditLogger.log('application.submitted', {
      userId,
      resourceType: 'application',
      resourceId: applicationId,
      action: 'submit',
      outcome: 'success',
      req,
      metadata: { jobId },
    }),

  suspiciousActivity: (req: Request, userId: string | null, reason: string) =>
    auditLogger.log('security.suspicious_activity', {
      userId,
      resourceType: 'security',
      action: 'detect',
      outcome: 'failure',
      req,
      metadata: { reason },
    }),
};

export default audit;

export {};
