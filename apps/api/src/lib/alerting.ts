// @ts-nocheck
/**
 * Alert Management Utilities
 * 
 * Provides functions for managing alerts and notifications
 * for system monitoring and incident response.
 */

import { getMetrics, getHealthStatus } from './metrics';

// Alert severity levels
export type AlertSeverity = 'critical' | 'warning' | 'info';

// Alert status
export type AlertStatus = 'firing' | 'resolved' | 'acknowledged';

// Alert interface
export interface Alert {
  id: string;
  name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  source: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: Date;
  endsAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  fingerprint: string;
}

// Alert rule interface
export interface AlertRule {
  name: string;
  expression: () => boolean | Promise<boolean>;
  severity: AlertSeverity;
  message: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  forDuration?: number; // How long condition must be true before firing
  repeatInterval?: number; // How often to re-alert if still firing
}

// Alert state storage
const activeAlerts: Map<string, Alert> = new Map();
const alertHistory: Alert[] = [];
const alertRules: Map<string, AlertRule> = new Map();
const pendingAlerts: Map<string, { since: Date; rule: AlertRule }> = new Map();

// Notification channels
type NotificationChannel = (alert: Alert) => Promise<void>;
const notificationChannels: NotificationChannel[] = [];

/**
 * Generate a fingerprint for an alert to identify unique alerts
 */
function generateFingerprint(rule: AlertRule): string {
  const parts = [rule.name, rule.severity, JSON.stringify(rule.labels || {})];
  return Buffer.from(parts.join('|')).toString('base64').slice(0, 32);
}

/**
 * Generate unique alert ID
 */
function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Register an alert rule
 */
export function registerAlertRule(rule: AlertRule): void {
  alertRules.set(rule.name, rule);
}

/**
 * Unregister an alert rule
 */
export function unregisterAlertRule(name: string): void {
  alertRules.delete(name);
  pendingAlerts.delete(name);
}

/**
 * Register a notification channel
 */
export function registerNotificationChannel(channel: NotificationChannel): void {
  notificationChannels.push(channel);
}

/**
 * Fire an alert
 */
async function fireAlert(rule: AlertRule): Promise<void> {
  const fingerprint = generateFingerprint(rule);
  
  // Check if alert already exists
  const existingAlert = Array.from(activeAlerts.values()).find(
    a => a.fingerprint === fingerprint && a.status === 'firing'
  );
  
  if (existingAlert) {
    return; // Alert already firing
  }
  
  const alert: Alert = {
    id: generateAlertId(),
    name: rule.name,
    severity: rule.severity,
    status: 'firing',
    message: rule.message,
    source: 'ngurra-api',
    labels: rule.labels || {},
    annotations: rule.annotations || {},
    startsAt: new Date(),
    fingerprint,
  };
  
  activeAlerts.set(alert.id, alert);
  alertHistory.push(alert);
  
  // Send notifications
  await sendNotifications(alert);
}

/**
 * Resolve an alert
 */
export async function resolveAlert(alertId: string): Promise<void> {
  const alert = activeAlerts.get(alertId);
  if (!alert) return;
  
  alert.status = 'resolved';
  alert.endsAt = new Date();
  
  // Send resolution notification
  await sendNotifications(alert);
}

/**
 * Resolve alerts by fingerprint
 */
async function resolveAlertsByFingerprint(fingerprint: string): Promise<void> {
  for (const [id, alert] of activeAlerts.entries()) {
    if (alert.fingerprint === fingerprint && alert.status === 'firing') {
      await resolveAlert(id);
    }
  }
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(alertId: string, userId: string): void {
  const alert = activeAlerts.get(alertId);
  if (!alert) return;
  
  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = userId;
}

/**
 * Send notifications for an alert
 */
async function sendNotifications(alert: Alert): Promise<void> {
  await Promise.allSettled(
    notificationChannels.map(channel => channel(alert))
  );
}

/**
 * Evaluate all alert rules
 */
export async function evaluateAlertRules(): Promise<void> {
  for (const [name, rule] of alertRules.entries()) {
    try {
      const isTriggered = await rule.expression();
      const fingerprint = generateFingerprint(rule);
      const pending = pendingAlerts.get(name);
      
      if (isTriggered) {
        if (rule.forDuration && rule.forDuration > 0) {
          // Check if condition has been true long enough
          if (!pending) {
            pendingAlerts.set(name, { since: new Date(), rule });
          } else {
            const elapsed = Date.now() - pending.since.getTime();
            if (elapsed >= rule.forDuration) {
              await fireAlert(rule);
            }
          }
        } else {
          await fireAlert(rule);
        }
      } else {
        // Condition no longer true
        pendingAlerts.delete(name);
        await resolveAlertsByFingerprint(fingerprint);
      }
    } catch (error) {
      console.error(`Error evaluating alert rule ${name}:`, error);
    }
  }
}

/**
 * Get active alerts
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(activeAlerts.values()).filter(a => a.status === 'firing');
}

/**
 * Get all alerts (including acknowledged)
 */
export function getAllAlerts(): Alert[] {
  return Array.from(activeAlerts.values());
}

/**
 * Get alert history
 */
export function getAlertHistory(limit: number = 100): Alert[] {
  return alertHistory.slice(-limit);
}

/**
 * Get alerts by severity
 */
export function getAlertsBySeverity(severity: AlertSeverity): Alert[] {
  return getActiveAlerts().filter(a => a.severity === severity);
}

/**
 * Clear resolved alerts older than specified duration
 */
export function cleanupResolvedAlerts(maxAge: number = 86400000): void {
  const cutoff = Date.now() - maxAge;
  
  for (const [id, alert] of activeAlerts.entries()) {
    if (alert.status === 'resolved' && alert.endsAt && alert.endsAt.getTime() < cutoff) {
      activeAlerts.delete(id);
    }
  }
}

/**
 * Create standard alert rules for common scenarios
 */
export function registerDefaultAlertRules(): void {
  // High error rate alert
  registerAlertRule({
    name: 'HighErrorRate',
    expression: () => {
      const metrics = getMetrics();
      const errorRate = metrics.totalErrors / (metrics.totalRequests || 1);
      return errorRate > 0.05; // > 5% error rate
    },
    severity: 'critical',
    message: 'Error rate exceeds 5% threshold',
    forDuration: 60000, // Must be true for 1 minute
    labels: { component: 'api' },
    annotations: { runbook: 'https://docs.ngurra-pathways.com/runbooks/high-error-rate' },
  });
  
  // Slow response time alert
  registerAlertRule({
    name: 'SlowResponses',
    expression: () => {
      const metrics = getMetrics();
      return metrics.avgLatency > 1000; // > 1 second average
    },
    severity: 'warning',
    message: 'Average response time exceeds 1 second',
    forDuration: 120000, // Must be true for 2 minutes
    labels: { component: 'api' },
  });
  
  // Service degraded alert
  registerAlertRule({
    name: 'ServiceDegraded',
    expression: async () => {
      const health = await getHealthStatus();
      return health.status === 'degraded';
    },
    severity: 'warning',
    message: 'Service health is degraded',
    labels: { component: 'health' },
  });
  
  // Service unhealthy alert
  registerAlertRule({
    name: 'ServiceUnhealthy',
    expression: async () => {
      const health = await getHealthStatus();
      return health.status === 'unhealthy';
    },
    severity: 'critical',
    message: 'Service is unhealthy',
    labels: { component: 'health' },
  });
  
  // High memory usage alert
  registerAlertRule({
    name: 'HighMemoryUsage',
    expression: () => {
      const usage = process.memoryUsage();
      const heapUsedPercent = usage.heapUsed / usage.heapTotal;
      return heapUsedPercent > 0.9; // > 90% heap usage
    },
    severity: 'warning',
    message: 'Memory usage exceeds 90%',
    forDuration: 300000, // Must be true for 5 minutes
    labels: { component: 'system' },
  });
}

/**
 * Create Slack notification channel
 */
export function createSlackChannel(webhookUrl: string): NotificationChannel {
  return async (alert: Alert) => {
    const color = alert.severity === 'critical' ? 'danger' : 
                  alert.severity === 'warning' ? 'warning' : 'good';
    
    const payload = {
      attachments: [{
        color,
        title: `${alert.status === 'resolved' ? '✅ Resolved: ' : '🚨 '} ${alert.name}`,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Status', value: alert.status, short: true },
          { title: 'Source', value: alert.source, short: true },
          { title: 'Started', value: alert.startsAt.toISOString(), short: true },
        ],
        footer: 'Ngurra Pathways Alerting',
        ts: Math.floor(Date.now() / 1000),
      }],
    };
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };
}

/**
 * Create email notification channel
 */
export function createEmailChannel(
  sendEmail: (to: string, subject: string, body: string) => Promise<void>,
  recipients: string[]
): NotificationChannel {
  return async (alert: Alert) => {
    const subject = `[${alert.severity.toUpperCase()}] ${alert.name} - ${alert.status}`;
    const body = `
Alert: ${alert.name}
Status: ${alert.status}
Severity: ${alert.severity}
Message: ${alert.message}
Source: ${alert.source}
Started: ${alert.startsAt.toISOString()}
${alert.endsAt ? `Ended: ${alert.endsAt.toISOString()}` : ''}

Labels:
${Object.entries(alert.labels).map(([k, v]) => `  ${k}: ${v}`).join('\n')}

Annotations:
${Object.entries(alert.annotations).map(([k, v]) => `  ${k}: ${v}`).join('\n')}
    `.trim();
    
    await Promise.allSettled(
      recipients.map(to => sendEmail(to, subject, body))
    );
  };
}

/**
 * Create PagerDuty notification channel
 */
export function createPagerDutyChannel(routingKey: string): NotificationChannel {
  return async (alert: Alert) => {
    const eventAction = alert.status === 'resolved' ? 'resolve' : 'trigger';
    
    const payload = {
      routing_key: routingKey,
      event_action: eventAction,
      dedup_key: alert.fingerprint,
      payload: {
        summary: `${alert.name}: ${alert.message}`,
        severity: alert.severity === 'critical' ? 'critical' : 
                  alert.severity === 'warning' ? 'warning' : 'info',
        source: alert.source,
        timestamp: alert.startsAt.toISOString(),
        custom_details: {
          ...alert.labels,
          ...alert.annotations,
        },
      },
    };
    
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };
}

/**
 * Start the alerting loop
 */
export function startAlertingLoop(intervalMs: number = 30000): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      await evaluateAlertRules();
      cleanupResolvedAlerts();
    } catch (error) {
      console.error('Error in alerting loop:', error);
    }
  }, intervalMs);
}

/**
 * Export alert summary for Prometheus
 */
export function getAlertingMetrics(): string {
  const lines: string[] = [
    '# HELP alerts_active Number of active alerts by severity',
    '# TYPE alerts_active gauge',
  ];
  
  const activeByLevel = {
    critical: 0,
    warning: 0,
    info: 0,
  };
  
  for (const alert of getActiveAlerts()) {
    activeByLevel[alert.severity]++;
  }
  
  for (const [severity, count] of Object.entries(activeByLevel)) {
    lines.push(`alerts_active{severity="${severity}"} ${count}`);
  }
  
  lines.push('# HELP alerts_total Total number of alerts fired');
  lines.push('# TYPE alerts_total counter');
  lines.push(`alerts_total ${alertHistory.length}`);
  
  return lines.join('\n');
}

export {};
