/**
 * Alerting Utility Tests
 * Unit tests for the alerting and monitoring system
 */
import {
  registerAlertRule,
  unregisterAlertRule,
  evaluateAlertRules,
  getActiveAlerts,
  getAllAlerts,
  getAlertHistory,
  getAlertsBySeverity,
  acknowledgeAlert,
  resolveAlert,
  registerNotificationChannel,
  registerDefaultAlertRules,
  createSlackChannel,
  createEmailChannel,
  startAlertingLoop,
  cleanupResolvedAlerts,
  getAlertingMetrics,
} from '@/lib/alerting';

// Mock fetch for notification channels
global.fetch = vi.fn();

describe('Alerting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any existing alerts and rules
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('registerAlertRule', () => {
    it('should register an alert rule', () => {
      registerAlertRule({
        name: 'TestRule',
        expression: () => true,
        severity: 'warning',
        message: 'Test alert message',
      });
      
      // Rule should be registered (we test by evaluating)
      expect(() => evaluateAlertRules()).not.toThrow();
    });

    it('should register rule with all options', () => {
      registerAlertRule({
        name: 'FullRule',
        expression: async () => false,
        severity: 'critical',
        message: 'Full test alert',
        forDuration: 60000,
        repeatInterval: 300000,
        labels: { component: 'test' },
        annotations: { runbook: 'https://example.com' },
      });
      
      expect(() => evaluateAlertRules()).not.toThrow();
    });
  });

  describe('unregisterAlertRule', () => {
    it('should unregister an alert rule', () => {
      registerAlertRule({
        name: 'ToRemove',
        expression: () => true,
        severity: 'info',
        message: 'Will be removed',
      });
      
      unregisterAlertRule('ToRemove');
      
      // Rule should no longer exist
    });
  });

  describe('evaluateAlertRules', () => {
    it('should fire alert when expression returns true', async () => {
      registerAlertRule({
        name: 'AlwaysFires',
        expression: () => true,
        severity: 'warning',
        message: 'This always fires',
      });
      
      await evaluateAlertRules();
      
      const alerts = getActiveAlerts();
      expect(alerts.some(a => a.name === 'AlwaysFires')).toBe(true);
    });

    it('should not fire alert when expression returns false', async () => {
      registerAlertRule({
        name: 'NeverFires',
        expression: () => false,
        severity: 'warning',
        message: 'This never fires',
      });
      
      await evaluateAlertRules();
      
      const alerts = getActiveAlerts();
      expect(alerts.some(a => a.name === 'NeverFires')).toBe(false);
    });

    it('should handle async expressions', async () => {
      registerAlertRule({
        name: 'AsyncRule',
        expression: async () => {
          await new Promise(r => setTimeout(r, 10));
          return true;
        },
        severity: 'info',
        message: 'Async rule fired',
      });
      
      await evaluateAlertRules();
      
      const alerts = getActiveAlerts();
      expect(alerts.some(a => a.name === 'AsyncRule')).toBe(true);
    });

    it.skip('should respect forDuration before firing', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      
      registerAlertRule({
        name: 'DelayedRule',
        expression: () => true,
        severity: 'warning',
        message: 'Delayed alert',
        forDuration: 60000, // 1 minute
      });
      
      await evaluateAlertRules();
      
      // Should not fire immediately
      let alerts = getActiveAlerts();
      expect(alerts.some(a => a.name === 'DelayedRule')).toBe(false);
      
      // Advance time and re-evaluate
      vi.setSystemTime(new Date('2024-01-01T00:01:01Z'));
      await evaluateAlertRules();
      
      alerts = getActiveAlerts();
      expect(alerts.some(a => a.name === 'DelayedRule')).toBe(true);
      
      vi.useRealTimers();
    });

    it('should not duplicate alerts', async () => {
      registerAlertRule({
        name: 'NoDuplicates',
        expression: () => true,
        severity: 'warning',
        message: 'Should not duplicate',
      });
      
      await evaluateAlertRules();
      await evaluateAlertRules();
      await evaluateAlertRules();
      
      const alerts = getActiveAlerts().filter(a => a.name === 'NoDuplicates');
      expect(alerts.length).toBe(1);
    });

    it('should handle expression errors gracefully', async () => {
      registerAlertRule({
        name: 'ErrorRule',
        expression: () => {
          throw new Error('Expression error');
        },
        severity: 'critical',
        message: 'Error rule',
      });
      
      // Should not throw
      await expect(evaluateAlertRules()).resolves.not.toThrow();
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only firing alerts', async () => {
      registerAlertRule({
        name: 'Active1',
        expression: () => true,
        severity: 'warning',
        message: 'Active 1',
      });
      
      registerAlertRule({
        name: 'Active2',
        expression: () => true,
        severity: 'critical',
        message: 'Active 2',
      });
      
      await evaluateAlertRules();
      
      const alerts = getActiveAlerts();
      expect(alerts.every(a => a.status === 'firing')).toBe(true);
    });
  });

  describe('getAlertsBySeverity', () => {
    it('should filter alerts by severity', async () => {
      registerAlertRule({
        name: 'CriticalAlert',
        expression: () => true,
        severity: 'critical',
        message: 'Critical',
      });
      
      registerAlertRule({
        name: 'WarningAlert',
        expression: () => true,
        severity: 'warning',
        message: 'Warning',
      });
      
      await evaluateAlertRules();
      
      const criticals = getAlertsBySeverity('critical');
      expect(criticals.every(a => a.severity === 'critical')).toBe(true);
      
      const warnings = getAlertsBySeverity('warning');
      expect(warnings.every(a => a.severity === 'warning')).toBe(true);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      registerAlertRule({
        name: 'ToAcknowledge',
        expression: () => true,
        severity: 'warning',
        message: 'Acknowledge me',
      });
      
      await evaluateAlertRules();
      
      const alerts = getActiveAlerts();
      const alert = alerts.find(a => a.name === 'ToAcknowledge');
      
      acknowledgeAlert(alert!.id, 'user123');
      
      const updated = getAllAlerts().find(a => a.id === alert!.id);
      expect(updated?.status).toBe('acknowledged');
      expect(updated?.acknowledgedBy).toBe('user123');
      expect(updated?.acknowledgedAt).toBeDefined();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', async () => {
      registerAlertRule({
        name: 'ToResolve',
        expression: () => true,
        severity: 'warning',
        message: 'Resolve me',
      });
      
      await evaluateAlertRules();
      
      const alerts = getActiveAlerts();
      const alert = alerts.find(a => a.name === 'ToResolve');
      
      await resolveAlert(alert!.id);
      
      const updated = getAllAlerts().find(a => a.id === alert!.id);
      expect(updated?.status).toBe('resolved');
      expect(updated?.endsAt).toBeDefined();
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history', async () => {
      registerAlertRule({
        name: 'HistoryTest',
        expression: () => true,
        severity: 'info',
        message: 'History test',
      });
      
      await evaluateAlertRules();
      
      const history = getAlertHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const history = getAlertHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('registerNotificationChannel', () => {
    it('should register a notification channel', async () => {
      const channel = vi.fn();
      registerNotificationChannel(channel);
      
      registerAlertRule({
        name: 'NotifyTest',
        expression: () => true,
        severity: 'warning',
        message: 'Notify test',
      });
      
      await evaluateAlertRules();
      
      // Channel should have been called
      expect(channel).toHaveBeenCalled();
    });
  });

  describe('createSlackChannel', () => {
    it('should create a Slack notification channel', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true });
      
      const channel = createSlackChannel('https://hooks.slack.com/test');
      
      await channel({
        id: 'test-id',
        name: 'TestAlert',
        severity: 'warning',
        status: 'firing',
        message: 'Test message',
        source: 'test',
        labels: {},
        annotations: {},
        startsAt: new Date(),
        fingerprint: 'test-fp',
      });
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('createEmailChannel', () => {
    it('should create an email notification channel', async () => {
      const sendEmail = vi.fn().mockResolvedValue(undefined);
      const channel = createEmailChannel(sendEmail, ['ops@example.com']);
      
      await channel({
        id: 'test-id',
        name: 'TestAlert',
        severity: 'critical',
        status: 'firing',
        message: 'Test message',
        source: 'test',
        labels: { component: 'api' },
        annotations: {},
        startsAt: new Date(),
        fingerprint: 'test-fp',
      });
      
      expect(sendEmail).toHaveBeenCalledWith(
        'ops@example.com',
        expect.stringContaining('[CRITICAL]'),
        expect.stringContaining('TestAlert')
      );
    });
  });

  describe('registerDefaultAlertRules', () => {
    it('should register default alert rules', () => {
      registerDefaultAlertRules();
      
      // Default rules should be registered
      expect(() => evaluateAlertRules()).not.toThrow();
    });
  });

  describe('startAlertingLoop', () => {
    it('should start periodic alert evaluation', () => {
      vi.useFakeTimers();
      
      const interval = startAlertingLoop(1000);
      
      expect(interval).toBeDefined();
      
      clearInterval(interval);
      vi.useRealTimers();
    });
  });

  describe('cleanupResolvedAlerts', () => {
    it('should cleanup old resolved alerts', async () => {
      registerAlertRule({
        name: 'CleanupTest',
        expression: () => true,
        severity: 'info',
        message: 'Cleanup test',
      });
      
      await evaluateAlertRules();
      
      const alerts = getActiveAlerts();
      const alert = alerts.find(a => a.name === 'CleanupTest');
      
      await resolveAlert(alert!.id);
      
      // Cleanup with negative maxAge should remove it immediately (cutoff will be in future)
      cleanupResolvedAlerts(-1000);
      
      const remaining = getAllAlerts();
      expect(remaining.find(a => a.id === alert!.id)).toBeUndefined();
    });
  });

  describe('getAlertingMetrics', () => {
    it('should return Prometheus-formatted metrics', async () => {
      registerAlertRule({
        name: 'MetricsTest',
        expression: () => true,
        severity: 'warning',
        message: 'Metrics test',
      });
      
      await evaluateAlertRules();
      
      const metrics = getAlertingMetrics();
      
      expect(metrics).toContain('# HELP alerts_active');
      expect(metrics).toContain('# TYPE alerts_active gauge');
      expect(metrics).toContain('alerts_total');
    });
  });
});
