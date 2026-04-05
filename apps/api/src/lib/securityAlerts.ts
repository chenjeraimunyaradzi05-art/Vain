/**
 * Security Alerts (Step 54)
 * 
 * Alert system for security events:
 * - Failed authentication attempts
 * - Rate limiting triggers
 * - Suspicious activity detection
 * - System health warnings
 */

import { logger } from './logger';

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  acknowledged: boolean;
}

type AlertType = 
  | 'auth_failure'
  | 'rate_limit'
  | 'suspicious_activity'
  | 'system_health'
  | 'security_scan'
  | 'data_breach'
  | 'permission_violation';

type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

// In-memory alert storage (use Redis in production)
const alerts: Alert[] = [];
const MAX_ALERTS = 1000;

// Alert thresholds
const THRESHOLDS = {
  failedLoginAttempts: 5, // per user per 15 minutes
  rateLimitHits: 100, // per IP per minute
  suspiciousPatterns: 10, // per IP per hour
};

// Track metrics for threshold detection
const metrics = {
  failedLogins: new Map<string, number>(),
  rateLimitHits: new Map<string, number>(),
  suspiciousActivity: new Map<string, number>(),
};

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create and store an alert
 */
function createAlert(
  type: AlertType,
  severity: AlertSeverity,
  message: string,
  details?: Record<string, any>
): Alert {
  const alert: Alert = {
    id: generateAlertId(),
    type,
    severity,
    message,
    details,
    timestamp: new Date(),
    acknowledged: false,
  };
  
  // Add to storage
  alerts.unshift(alert);
  
  // Trim if over limit
  if (alerts.length > MAX_ALERTS) {
    alerts.length = MAX_ALERTS;
  }
  
  // Log the alert
  const logMethod = severity === 'critical' || severity === 'error' ? 'error' : 
                    severity === 'warning' ? 'warn' : 'info';
  logger[logMethod](`[ALERT] ${type}: ${message}`, details);
  
  // Send notifications for critical alerts
  if (severity === 'critical' || severity === 'error') {
    sendAlertNotification(alert);
  }
  
  return alert;
}

/**
 * Send alert notification (Slack, PagerDuty, etc.)
 */
async function sendAlertNotification(alert: Alert): Promise<void> {
  const slackWebhook = process.env.SLACK_SECURITY_WEBHOOK;
  const pagerdutyKey = process.env.PAGERDUTY_ROUTING_KEY;
  
  // Slack notification
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Security Alert [${alert.severity.toUpperCase()}]`,
          attachments: [{
            color: alert.severity === 'critical' ? '#FF0000' : 
                   alert.severity === 'error' ? '#FF6600' : '#FFCC00',
            fields: [
              { title: 'Type', value: alert.type, short: true },
              { title: 'Severity', value: alert.severity, short: true },
              { title: 'Message', value: alert.message },
              { title: 'Time', value: alert.timestamp.toISOString(), short: true },
            ],
          }],
        }),
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', { error });
    }
  }
  
  // PagerDuty for critical alerts
  if (pagerdutyKey && alert.severity === 'critical') {
    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: pagerdutyKey,
          event_action: 'trigger',
          payload: {
            summary: `[${alert.type}] ${alert.message}`,
            severity: 'critical',
            source: 'gimbi-api',
            timestamp: alert.timestamp.toISOString(),
            custom_details: alert.details,
          },
        }),
      });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', { error });
    }
  }
}

// ============================================
// Alert Triggers
// ============================================

/**
 * Track failed login attempt
 */
export function trackFailedLogin(userId: string, ip: string): void {
  const key = `${userId}:${ip}`;
  const count = (metrics.failedLogins.get(key) || 0) + 1;
  metrics.failedLogins.set(key, count);
  
  if (count >= THRESHOLDS.failedLoginAttempts) {
    createAlert(
      'auth_failure',
      count >= THRESHOLDS.failedLoginAttempts * 2 ? 'error' : 'warning',
      `Multiple failed login attempts detected`,
      { userId, ip, attempts: count }
    );
  }
  
  // Reset after 15 minutes
  setTimeout(() => {
    metrics.failedLogins.delete(key);
  }, 15 * 60 * 1000);
}

/**
 * Track rate limit hit
 */
export function trackRateLimitHit(ip: string, endpoint: string): void {
  const key = `${ip}:${endpoint}`;
  const count = (metrics.rateLimitHits.get(key) || 0) + 1;
  metrics.rateLimitHits.set(key, count);
  
  if (count >= THRESHOLDS.rateLimitHits) {
    createAlert(
      'rate_limit',
      'warning',
      `Rate limit threshold exceeded`,
      { ip, endpoint, hits: count }
    );
  }
  
  // Reset after 1 minute
  setTimeout(() => {
    metrics.rateLimitHits.delete(key);
  }, 60 * 1000);
}

/**
 * Track suspicious activity
 */
export function trackSuspiciousActivity(
  ip: string,
  activity: string,
  details?: Record<string, any>
): void {
  const count = (metrics.suspiciousActivity.get(ip) || 0) + 1;
  metrics.suspiciousActivity.set(ip, count);
  
  if (count >= THRESHOLDS.suspiciousPatterns) {
    createAlert(
      'suspicious_activity',
      'error',
      `Suspicious activity pattern detected`,
      { ip, activity, count, ...details }
    );
  }
  
  // Reset after 1 hour
  setTimeout(() => {
    metrics.suspiciousActivity.delete(ip);
  }, 60 * 60 * 1000);
}

/**
 * Alert for permission violation
 */
export function alertPermissionViolation(
  userId: string,
  action: string,
  resource: string
): void {
  createAlert(
    'permission_violation',
    'warning',
    `Permission violation attempt`,
    { userId, action, resource }
  );
}

/**
 * Alert for system health issue
 */
export function alertSystemHealth(
  component: string,
  issue: string,
  severity: AlertSeverity = 'warning'
): void {
  createAlert(
    'system_health',
    severity,
    `System health issue: ${component}`,
    { component, issue }
  );
}

/**
 * Alert for potential data breach
 */
export function alertDataBreach(
  description: string,
  details: Record<string, any>
): void {
  createAlert(
    'data_breach',
    'critical',
    description,
    details
  );
}

// ============================================
// Alert Management
// ============================================

/**
 * Get all alerts
 */
export function getAlerts(
  filter?: { type?: AlertType; severity?: AlertSeverity; acknowledged?: boolean }
): Alert[] {
  let result = [...alerts];
  
  if (filter?.type) {
    result = result.filter(a => a.type === filter.type);
  }
  
  if (filter?.severity) {
    result = result.filter(a => a.severity === filter.severity);
  }
  
  if (filter?.acknowledged !== undefined) {
    result = result.filter(a => a.acknowledged === filter.acknowledged);
  }
  
  return result;
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: string): boolean {
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    return true;
  }
  return false;
}

/**
 * Get alert statistics
 */
export function getAlertStats(): {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byType: Record<string, number>;
  unacknowledged: number;
} {
  const bySeverity: Record<AlertSeverity, number> = {
    info: 0,
    warning: 0,
    error: 0,
    critical: 0,
  };
  
  const byType: Record<string, number> = {};
  let unacknowledged = 0;
  
  for (const alert of alerts) {
    bySeverity[alert.severity]++;
    byType[alert.type] = (byType[alert.type] || 0) + 1;
    if (!alert.acknowledged) unacknowledged++;
  }
  
  return {
    total: alerts.length,
    bySeverity,
    byType,
    unacknowledged,
  };
}

export default {
  createAlert,
  trackFailedLogin,
  trackRateLimitHit,
  trackSuspiciousActivity,
  alertPermissionViolation,
  alertSystemHealth,
  alertDataBreach,
  getAlerts,
  acknowledgeAlert,
  getAlertStats,
};

export {};
