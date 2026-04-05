/**
 * Onboarding Purpose API Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('Onboarding Purpose API', () => {
  let authToken: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user and get auth token
    // This would typically use your auth service
    const registerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'testpassword123',
        userType: 'MEMBER'
      });

    const loginResponse = await request(app)
      .post('/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword123'
      });

    authToken = loginResponse.body.token;
    testUserId = loginResponse.body.user.id;
  });

  afterEach(async () => {
    // Clean up test data
    // This would typically clean up the created user and purpose
  });

  describe('POST /v1/onboarding/purpose', () => {
    it('should save user purpose successfully', async () => {
      const response = await request(app)
        .post('/v1/onboarding/purpose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          primary: 'work',
          secondary: 'learning'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.primary).toBe('work');
      expect(response.body.data.secondary).toBe('learning');
    });

    it('should validate required primary purpose', async () => {
      const response = await request(app)
        .post('/v1/onboarding/purpose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          secondary: 'learning'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject invalid purpose values', async () => {
      const response = await request(app)
        .post('/v1/onboarding/purpose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          primary: 'invalid_purpose',
          secondary: 'learning'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should update existing purpose', async () => {
      // First create a purpose
      await request(app)
        .post('/v1/onboarding/purpose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          primary: 'work',
          secondary: 'learning'
        });

      // Then update it
      const response = await request(app)
        .post('/v1/onboarding/purpose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          primary: 'mentorship',
          secondary: 'community'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.primary).toBe('mentorship');
      expect(response.body.data.secondary).toBe('community');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/v1/onboarding/purpose')
        .send({
          primary: 'work'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /v1/me/purpose', () => {
    it('should return user purpose when it exists', async () => {
      // First create a purpose
      await request(app)
        .post('/v1/onboarding/purpose')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          primary: 'work',
          secondary: 'learning'
        });

      const response = await request(app)
        .get('/v1/me/purpose')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.hasPurpose).toBe(true);
      expect(response.body.data.primary).toBe('work');
      expect(response.body.data.secondary).toBe('learning');
    });

    it('should return hasPurpose: false when no purpose exists', async () => {
      const response = await request(app)
        .get('/v1/me/purpose')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.hasPurpose).toBe(false);
      expect(response.body.data).toBe(null);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/me/purpose');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /v1/onboarding/purpose-options', () => {
    it('should return available purpose options', async () => {
      const response = await request(app)
        .get('/v1/onboarding/purpose-options');

      expect(response.status).toBe(200);
      expect(response.body.options).toHaveLength(4);
      expect(response.body.options[0]).toHave('value');
      expect(response.body.options[0]).toHave('label');
      expect(response.body.options[0]).toHave('description');
      expect(response.body.options[0]).toHave('features');
    });

    it('should include all expected purpose types', async () => {
      const response = await request(app)
        .get('/v1/onboarding/purpose-options');

      const values = response.body.options.map((opt: any) => opt.value);
      expect(values).toContain('work');
      expect(values).toContain('learning');
      expect(values).toContain('mentorship');
      expect(values).toContain('community');
    });
  });
});
