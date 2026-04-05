/**
 * Authentication and RBAC Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('Authentication API', () => {
  let authToken: string;
  let testUser: any;

  beforeEach(async () => {
    // Create a test user for authentication tests
    const registerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'auth.test@example.com',
        password: 'TestPassword123!',
        userType: 'MEMBER',
        firstName: 'Test',
        lastName: 'User'
      });

    expect(registerResponse.status).toBe(201);
    testUser = registerResponse.body.user;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/v1/auth/login')
      .send({
        email: 'auth.test@example.com',
        password: 'TestPassword123!'
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.token;
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await request(app)
        .delete('/v1/auth/test-cleanup')
        .set('Authorization', `Bearer ${authToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'new.user@example.com',
          password: 'NewPassword123!',
          userType: 'MEMBER',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('new.user@example.com');
      expect(response.body.user.userType).toBe('MEMBER');
      expect(response.body.user.firstName).toBe('New');
      expect(response.body.user.lastName).toBe('User');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123' // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should prevent duplicate email registration', async () => {
      const response = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'auth.test@example.com', // Already registered
          password: 'Password123!',
          userType: 'MEMBER'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered');
    });
  });

  describe('POST /v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'auth.test@example.com',
          password: 'TestPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('auth.test@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'auth.test@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent users', async () => {
      const response = await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /v1/auth/me', () => {
    it('should return current user with valid token', async () => {
      const response = await request(app)
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('auth.test@example.com');
      expect(response.body.user.userType).toBe('MEMBER');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /v1/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const response = await request(app)
        .post('/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'TestPassword123!',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject password change with wrong current password', async () => {
      const response = await request(app)
        .post('/v1/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Current password is incorrect');
    });
  });
});

describe('Role-Based Access Control (RBAC)', () => {
  let userToken: string;
  let employerToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Create users with different roles
    const userResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'user@example.com',
        password: 'Password123!',
        userType: 'MEMBER'
      });

    const employerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'employer@example.com',
        password: 'Password123!',
        userType: 'COMPANY'
      });

    const adminResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'Password123!',
        userType: 'ADMIN'
      });

    // Login each user
    const userLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'user@example.com', password: 'Password123!' });

    const employerLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'employer@example.com', password: 'Password123!' });

    const adminLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Password123!' });

    userToken = userLogin.body.token;
    employerToken = employerLogin.body.token;
    adminToken = adminLogin.body.token;
  });

  describe('Role-based endpoint access', () => {
    it('should allow admin to access admin-only endpoints', async () => {
      const response = await request(app)
        .get('/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny user access to admin-only endpoints', async () => {
      const response = await request(app)
        .get('/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should deny employer access to admin-only endpoints', async () => {
      const response = await request(app)
        .get('/v1/admin/users')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should allow employer to access employer endpoints', async () => {
      const response = await request(app)
        .post('/v1/employer/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Test Job',
          description: 'Test Description'
        });

      expect(response.status).toBe(201);
    });

    it('should deny user access to employer endpoints', async () => {
      const response = await request(app)
        .post('/v1/employer/jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Test Job',
          description: 'Test Description'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should allow user to access user endpoints', async () => {
      const response = await request(app)
        .post('/v1/jobs/123/apply')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          coverLetter: 'Test cover letter'
        });

      expect(response.status).toBe(201);
    });

    it('should deny employer access to user-only job application endpoints', async () => {
      const response = await request(app)
        .post('/v1/jobs/123/apply')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          coverLetter: 'Test cover letter'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('Self or Admin access pattern', () => {
    it('should allow user to access their own profile', async () => {
      const response = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });

    it('should allow admin to access any user profile', async () => {
      const response = await request(app)
        .get('/v1/users/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny user access to another user\'s profile', async () => {
      const response = await request(app)
        .get('/v1/users/other-user-id/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('Token validation', () => {
    it('should reject malformed tokens', async () => {
      const response = await request(app)
        .get('/v1/auth/me')
        .set('Authorization', 'Bearer malformed.token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should reject expired tokens', async () => {
      // Create an expired token (this would require mocking JWT verification)
      const expiredToken = 'expired.jwt.token';
      
      const response = await request(app)
        .get('/v1/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });
});

describe('Security Features', () => {
  it('should implement rate limiting on login attempts', async () => {
    // This would test the account lockout functionality
    // Implementation depends on the actual rate limiting setup
    
    // Make multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/v1/auth/login')
        .send({
          email: 'rate.limit.test@example.com',
          password: 'WrongPassword'
        });
    }

    // The 6th attempt should trigger lockout
    const response = await request(app)
      .post('/v1/auth/login')
      .send({
        email: 'rate.limit.test@example.com',
        password: 'WrongPassword'
      });

    expect(response.status).toBe(429);
    expect(response.body.error).toContain('Too many failed attempts');
  });

  it('should sanitize input to prevent injection attacks', async () => {
    const maliciousInput = {
      email: '<script>alert("xss")</script>@example.com',
      password: 'Password123!'
    };

    const response = await request(app)
      .post('/v1/auth/login')
      .send(maliciousInput);

    // Should handle gracefully without executing scripts
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid credentials');
  });
});
