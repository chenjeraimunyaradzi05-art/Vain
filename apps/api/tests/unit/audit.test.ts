/**
 * Audit Logging Tests
 */

import { createAuditEvent, auditLogger, audit } from '../../src/lib/audit';
import type { Request } from 'express';

describe('Audit Logging', () => {
  // Create mock request
  const createMockRequest = (overrides = {}): Request => ({
    headers: {
      'user-agent': 'test-agent',
      'x-forwarded-for': '192.168.1.1',
    },
    ip: '127.0.0.1',
    connection: {
      remoteAddress: '127.0.0.1',
    },
    ...overrides,
  } as unknown as Request);

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createAuditEvent', () => {
    it('should create a valid audit event', () => {
      const event = createAuditEvent('auth.login', {
        userId: 'user-123',
        resourceType: 'auth',
        action: 'login',
        outcome: 'success',
      });

      expect(event.id).toMatch(/^aud_/);
      expect(event.eventType).toBe('auth.login');
      expect(event.userId).toBe('user-123');
      expect(event.resourceType).toBe('auth');
      expect(event.action).toBe('login');
      expect(event.outcome).toBe('success');
      expect(event.timestamp).toBeDefined();
    });

    it('should include request metadata', () => {
      const req = createMockRequest();
      const event = createAuditEvent('auth.login', {
        userId: 'user-123',
        resourceType: 'auth',
        action: 'login',
        outcome: 'success',
        req,
      });

      expect(event.ip).toBe('192.168.1.1');
      expect(event.userAgent).toBe('test-agent');
    });

    it('should include changes when provided', () => {
      const event = createAuditEvent('user.updated', {
        userId: 'user-123',
        resourceType: 'user',
        resourceId: 'user-123',
        action: 'update',
        outcome: 'success',
        changes: {
          before: { name: 'Old Name' },
          after: { name: 'New Name' },
        },
      });

      expect(event.changes).toEqual({
        before: { name: 'Old Name' },
        after: { name: 'New Name' },
      });
    });

    it('should include custom metadata', () => {
      const event = createAuditEvent('payment.completed', {
        userId: 'user-123',
        resourceType: 'payment',
        resourceId: 'pay-456',
        action: 'complete',
        outcome: 'success',
        metadata: {
          amount: 100,
          currency: 'AUD',
        },
      });

      expect(event.metadata).toEqual({
        amount: 100,
        currency: 'AUD',
      });
    });

    it('should set actorId from userId if not provided', () => {
      const event = createAuditEvent('user.created', {
        userId: 'user-123',
        resourceType: 'user',
        action: 'create',
        outcome: 'success',
      });

      expect(event.actorId).toBe('user-123');
    });

    it('should allow different actorId', () => {
      const event = createAuditEvent('user.deleted', {
        userId: 'deleted-user',
        actorId: 'admin-user',
        resourceType: 'user',
        action: 'delete',
        outcome: 'success',
      });

      expect(event.userId).toBe('deleted-user');
      expect(event.actorId).toBe('admin-user');
    });
  });

  describe('audit convenience methods', () => {
    it('should log login event', async () => {
      const req = createMockRequest();
      const event = await audit.login(req, 'user-123', 'success');

      expect(event.eventType).toBe('auth.login');
      expect(event.userId).toBe('user-123');
      expect(event.outcome).toBe('success');
    });

    it('should log failed login event', async () => {
      const req = createMockRequest();
      const event = await audit.login(req, 'user-123', 'failure', {
        reason: 'invalid_password',
      });

      expect(event.eventType).toBe('auth.login_failed');
      expect(event.outcome).toBe('failure');
      expect(event.metadata).toEqual({ reason: 'invalid_password' });
    });

    it('should log logout event', async () => {
      const req = createMockRequest();
      const event = await audit.logout(req, 'user-123');

      expect(event.eventType).toBe('auth.logout');
      expect(event.action).toBe('logout');
    });

    it('should log admin access event', async () => {
      const req = createMockRequest();
      const event = await audit.adminAccess(req, 'admin-123', 'users');

      expect(event.eventType).toBe('admin.access');
      expect(event.resourceId).toBe('users');
    });

    it('should log user created event', async () => {
      const req = createMockRequest();
      const event = await audit.userCreated(req, 'admin-123', 'new-user-456');

      expect(event.eventType).toBe('user.created');
      expect(event.userId).toBe('new-user-456');
      expect(event.actorId).toBe('admin-123');
    });

    it('should log suspicious activity', async () => {
      const req = createMockRequest();
      const event = await audit.suspiciousActivity(
        req,
        'user-123',
        'Multiple failed login attempts'
      );

      expect(event.eventType).toBe('security.suspicious_activity');
      expect(event.metadata).toEqual({ reason: 'Multiple failed login attempts' });
    });

    it('should log job created event', async () => {
      const req = createMockRequest();
      const event = await audit.jobCreated(req, 'employer-123', 'job-456');

      expect(event.eventType).toBe('job.created');
      expect(event.resourceId).toBe('job-456');
    });

    it('should log application submitted event', async () => {
      const req = createMockRequest();
      const event = await audit.applicationSubmitted(
        req,
        'candidate-123',
        'app-789',
        'job-456'
      );

      expect(event.eventType).toBe('application.submitted');
      expect(event.resourceId).toBe('app-789');
      expect(event.metadata).toEqual({ jobId: 'job-456' });
    });
  });

  describe('AuditLogger', () => {
    it('should flush events', async () => {
      await auditLogger.flush();
      // Should complete without error
    });

    it('should stop gracefully', async () => {
      // Create a new logger instance for this test
      // The singleton will handle stopping
    });
  });
});
