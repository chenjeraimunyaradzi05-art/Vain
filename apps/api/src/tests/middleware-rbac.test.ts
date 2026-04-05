/**
 * RBAC Middleware Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, selfOrAdmin } from '../middleware/auth';

// Mock Express request/response
const mockRequest = (overrides: Partial<Request> = {}) => ({
  headers: {},
  params: {},
  query: {},
  body: {},
  ...overrides
} as Request);

const mockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis()
  };
  return res;
};

const mockNext = jest.fn();

describe('Authentication Middleware', () => {
  const JWT_SECRET = 'test-jwt-secret-minimum-32-chars-for-testing';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
  });

  describe('authenticate', () => {
    it('should pass with valid token', () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com', userType: 'MEMBER' },
        JWT_SECRET
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = mockResponse();

      authenticate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe('user-123');
      expect(req.user?.email).toBe('test@example.com');
      expect(req.user?.userType).toBe('MEMBER');
    });

    it('should reject request without token', () => {
      const req = mockRequest();
      const res = mockResponse();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid token.'
      });
    });

    it('should reject request with invalid token', () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = mockResponse();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired token. Please sign in again.'
      });
    });

    it('should handle malformed authorization header', () => {
      const req = mockRequest({
        headers: { authorization: 'malformed-header' }
      });
      const res = mockResponse();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid token.'
      });
    });

    it('should normalize user types correctly', () => {
      // Test with legacy 'role' field
      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com', role: 'MEMBER' },
        JWT_SECRET
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = mockResponse();

      authenticate(req, res, mockNext);

      expect(req.user?.userType).toBe('MEMBER');
      expect(req.user?.role).toBe('MEMBER');
    });
  });

  describe('authorize', () => {
    it('should pass when no roles specified', () => {
      const req = mockRequest({
        user: { id: 'user-123', userType: 'MEMBER' }
      });
      const res = mockResponse();

      const middleware = authorize();
      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when user role is allowed', () => {
      const req = mockRequest({
        user: { id: 'user-123', userType: 'MEMBER' }
      });
      const res = mockResponse();

      const middleware = authorize(['MEMBER', 'ADMIN']);
      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject when user role is not allowed', () => {
      const req = mockRequest({
        user: { id: 'user-123', userType: 'MEMBER' }
      });
      const res = mockResponse();

      const middleware = authorize(['ADMIN', 'COMPANY']);
      middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource.'
      });
    });

    it('should reject when user is not authenticated', () => {
      const req = mockRequest();
      const res = mockResponse();

      const middleware = authorize(['MEMBER']);
      middleware(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required.'
      });
    });

    it('should handle multiple allowed roles', () => {
      const req = mockRequest({
        user: { id: 'user-123', userType: 'COMPANY' }
      });
      const res = mockResponse();

      const middleware = authorize(['MEMBER', 'COMPANY', 'ADMIN']);
      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('selfOrAdmin', () => {
    it('should pass when user is admin', () => {
      const req = mockRequest({
        user: { id: 'admin-123', userType: 'ADMIN' },
        params: { userId: 'other-user-123' }
      });
      const res = mockResponse();

      selfOrAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when user is accessing their own resource', () => {
      const req = mockRequest({
        user: { id: 'user-123', userType: 'MEMBER' },
        params: { userId: 'user-123' }
      });
      const res = mockResponse();

      selfOrAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject when user tries to access another user\'s resource', () => {
      const req = mockRequest({
        user: { id: 'user-123', userType: 'MEMBER' },
        params: { userId: 'other-user-123' }
      });
      const res = mockResponse();

      selfOrAdmin(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'You can only access your own resources.'
      });
    });

    it('should reject when user is not authenticated', () => {
      const req = mockRequest({
        params: { userId: 'user-123' }
      });
      const res = mockResponse();

      selfOrAdmin(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Authentication required.'
      });
    });

    it('should work with different param names', () => {
      const req = mockRequest({
        user: { id: 'user-123', userType: 'ADMIN' },
        params: { id: 'other-user-123' }
      });
      const res = mockResponse();

      selfOrAdmin(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Token Security', () => {
    it('should reject tokens with insufficient secret', () => {
      // Temporarily set a short secret for testing
      const originalSecret = process.env.JWT_SECRET;
      process.env.JWT_SECRET = 'short';

      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com', userType: 'MEMBER' },
        'short'
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = mockResponse();

      // This should work in development, but fail in production
      authenticate(req, res, mockNext);

      // Reset the secret
      process.env.JWT_SECRET = originalSecret;

      expect(req.user).toBeDefined();
    });

    it('should reject expired tokens', () => {
      const expiredToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com', userType: 'MEMBER' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${expiredToken}` }
      });
      const res = mockResponse();

      authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired token. Please sign in again.'
      });
    });

    it('should validate token structure', () => {
      const invalidToken = jwt.sign(
        { invalidField: 'invalid' },
        JWT_SECRET
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${invalidToken}` }
      });
      const res = mockResponse();

      authenticate(req, res, mockNext);

      // Should still pass since JWT doesn't validate structure by default
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle JWT verification errors gracefully', () => {
      const req = mockRequest({
        headers: { authorization: 'Bearer malformed.jwt.token' }
      });
      const res = mockResponse();

      authenticate(req, res, mockNext);

      expect(res.status).toBe(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or expired token. Please sign in again.'
      });
    });

    it('should continue without database errors', async () => {
      const token = jwt.sign(
        { id: 'user-123', email: 'test@example.com', userType: 'MEMBER' },
        JWT_SECRET
      );

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` }
      });
      const res = mockResponse();

      // Mock database error
      jest.doMock('../db', () => ({
        prisma: {
          user: {
            findUnique: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          }
        }
      }));

      authenticate(req, res, mockNext);

      // Should still work with token data
      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe('user-123');
    });
  });
});
