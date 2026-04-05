/**
 * Opportunity Radar Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('Opportunity Radar API', () => {
  let userToken: string;
  let testUser: any;
  let testJob: any;

  beforeEach(async () => {
    // Create a test user
    const userResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'radar.test@example.com',
        password: 'TestPassword123!',
        userType: 'MEMBER',
        firstName: 'Radar',
        lastName: 'User'
      });

    testUser = userResponse.body.user;

    // Login user
    const userLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'radar.test@example.com', password: 'TestPassword123!' });

    userToken = userLogin.body.token;

    // Create a test job for matching
    const employerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'radar.employer@example.com',
        password: 'TestPassword123!',
        userType: 'COMPANY',
        firstName: 'Test',
        lastName: 'Employer'
      });

    const employerLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'radar.employer@example.com', password: 'TestPassword123!' });

    const jobResponse = await request(app)
      .post('/v1/jobs')
      .set('Authorization', `Bearer ${employerLogin.body.token}`)
      .send({
        title: 'Software Developer - Sydney',
        description: 'A great opportunity for a software developer in Sydney with React and Node.js experience',
        location: 'Sydney, NSW',
        employmentType: 'FULL_TIME',
        salaryMin: 80000,
        salaryMax: 120000
      });

    testJob = jobResponse.body.data;
  });

  afterEach(async () => {
    // Clean up test data
    try {
      // Delete radar rules
      await request(app)
        .delete('/v1/radar/rules/test-cleanup')
        .set('Authorization', `Bearer ${userToken}`);

      // Delete test job
      if (testJob?.id) {
        await request(app)
          .delete(`/v1/jobs/${testJob.id}`)
          .set('Authorization', `Bearer test-token`);
      }

      // Clean up users
      await request(app)
        .delete('/v1/auth/test-cleanup')
        .set('Authorization', `Bearer ${userToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /v1/radar/rules', () => {
    it('should create a new radar rule successfully', async () => {
      const response = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Software Developer Jobs',
          location: 'Sydney',
          employmentType: 'FULL_TIME',
          salaryMin: 70000,
          salaryMax: 130000,
          skills: ['JavaScript', 'React', 'Node.js'],
          keywords: 'software developer',
          matchScore: 0.8,
          isActive: true
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Software Developer Jobs');
      expect(response.body.data.location).toBe('Sydney');
      expect(response.body.data.employmentType).toBe('FULL_TIME');
      expect(response.body.data.salaryMin).toBe(70000);
      expect(response.body.data.salaryMax).toBe(130000);
      expect(response.body.data.skills).toEqual(['JavaScript', 'React', 'Node.js']);
      expect(response.body.data.keywords).toBe('software developer');
      expect(response.body.data.matchScore).toBe(0.8);
      expect(response.body.data.isActive).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/v1/radar/rules')
        .send({
          name: 'Test Rule',
          location: 'Sydney'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          // Missing name
          location: 'Sydney'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should prevent duplicate rule names', async () => {
      // Create first rule
      await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Duplicate Test Rule',
          location: 'Sydney'
        });

      // Try to create second rule with same name
      const response = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Duplicate Test Rule',
          location: 'Melbourne'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Rule name already exists');
    });
  });

  describe('GET /v1/radar/rules', () => {
    beforeEach(async () => {
      // Create test radar rules
      await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Active Rule',
          location: 'Sydney',
          isActive: true
        });

      await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Inactive Rule',
          location: 'Melbourne',
          isActive: false
        });
    });

    it('should get user\'s radar rules', async () => {
      const response = await request(app)
        .get('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rules).toHaveLength(2);
      expect(response.body.data.rules.some(rule => rule.name === 'Active Rule')).toBe(true);
      expect(response.body.data.rules.some(rule => rule.name === 'Inactive Rule')).toBe(true);
    });

    it('should filter by active status', async () => {
      const response = await request(app)
        .get('/v1/radar/rules?isActive=true')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.rules).toHaveLength(1);
      expect(response.body.data.rules[0].name).toBe('Active Rule');
      expect(response.body.data.rules[0].isActive).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/v1/radar/rules?page=1&pageSize=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(10);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/radar/rules');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('PATCH /v1/radar/rules/:id', () => {
    let ruleId: string;

    beforeEach(async () => {
      // Create a test rule
      const ruleResponse = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Update Test Rule',
          location: 'Sydney',
          matchScore: 0.8
        });
      ruleId = ruleResponse.body.data.id;
    });

    it('should update a radar rule successfully', async () => {
      const response = await request(app)
        .patch(`/v1/radar/rules/${ruleId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Rule Name',
          location: 'Melbourne',
          matchScore: 0.9,
          isActive: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Rule Name');
      expect(response.body.data.location).toBe('Melbourne');
      expect(response.body.data.matchScore).toBe(0.9);
      expect(response.body.data.isActive).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/v1/radar/rules/${ruleId}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent rule', async () => {
      const response = await request(app)
        .patch('/v1/radar/rules/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Radar rule not found');
    });
  });

  describe('DELETE /v1/radar/rules/:id', () => {
    let ruleId: string;

    beforeEach(async () => {
      // Create a test rule
      const ruleResponse = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Delete Test Rule',
          location: 'Sydney'
        });
      ruleId = ruleResponse.body.data.id;
    });

    it('should delete a radar rule successfully', async () => {
      const response = await request(app)
        .delete(`/v1/radar/rules/${ruleId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Radar rule deleted successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/v1/radar/rules/${ruleId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent rule', async () => {
      const response = await request(app)
        .delete('/v1/radar/rules/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Radar rule not found');
    });
  });

  describe('GET /v1/radar/matches', () => {
    beforeEach(async () => {
      // Create a radar rule that should match the test job
      await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Software Jobs in Sydney',
          location: 'Sydney',
          employmentType: 'FULL_TIME',
          salaryMin: 75000,
          salaryMax: 125000,
          keywords: 'software',
          matchScore: 0.5
        });
    });

    it('should get radar matches for user', async () => {
      const response = await request(app)
        .get('/v1/radar/matches')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.matches).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by minimum score', async () => {
      const response = await request(app)
        .get('/v1/radar/matches?minScore=0.8')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should only return matches with score >= 0.8
      response.body.data.matches.forEach((match: any) => {
        expect(match.matchScore).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/radar/matches');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /v1/radar/notifications', () => {
    beforeEach(async () => {
      // Create a radar rule
      const ruleResponse = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Notification Test Rule',
          location: 'Sydney'
        });

      // Create a notification (this would typically be created by the matching system)
      await request(app)
        .post('/v1/radar/rules/test-notification')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          radarRuleId: ruleResponse.body.data.id,
          jobId: testJob.id,
          type: 'NEW_MATCH',
          title: 'New Job Match',
          message: 'A new job matches your radar criteria'
        });
    });

    it('should get radar notifications for user', async () => {
      const response = await request(app)
        .get('/v1/radar/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/radar/notifications');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /v1/radar/rules/:id/test', () => {
    let ruleId: string;

    beforeEach(async () => {
      // Create a test rule
      const ruleResponse = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Rule',
          location: 'Sydney',
          employmentType: 'FULL_TIME',
          salaryMin: 70000,
          salaryMax: 130000,
          skills: ['JavaScript'],
          keywords: 'software',
          matchScore: 0.5
        });
      ruleId = ruleResponse.body.data.id;
    });

    it('should test a radar rule against current jobs', async () => {
      const response = await request(app)
        .post(`/v1/radar/rules/${ruleId}/test`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ruleId).toBe(ruleId);
      expect(response.body.data.testResults).toBeDefined();
      expect(response.body.data.totalJobs).toBeDefined();
      expect(response.body.data.matchingJobs).toBeDefined();
      expect(response.body.data.averageScore).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/v1/radar/rules/${ruleId}/test`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent rule', async () => {
      const response = await request(app)
        .post('/v1/radar/rules/non-existent-id/test')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Radar rule not found');
    });
  });

  describe('GET /v1/radar/digest', () => {
    beforeEach(async () => {
      // Create a radar rule
      await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Digest Test Rule',
          location: 'Sydney'
        });
    });

    it('should get radar digest for user', async () => {
      const response = await request(app)
        .get('/v1/radar/digest')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.date).toBeDefined();
      expect(response.body.data.totalMatches).toBeDefined();
      expect(response.body.data.newMatches).toBeDefined();
      expect(response.body.data.updatedMatches).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/radar/digest');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('PATCH /v1/radar/digest/:id/read', () => {
    let digestId: string;

    beforeEach(async () => {
      // Create a radar rule and digest
      await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Read Test Rule',
          location: 'Sydney'
        });

      const digestResponse = await request(app)
        .get('/v1/radar/digest')
        .set('Authorization', `Bearer ${userToken}`);
      digestId = digestResponse.body.data.id;
    });

    it('should mark digest as read', async () => {
      const response = await request(app)
        .patch(`/v1/radar/digest/${digestId}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isRead).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .patch(`/v1/radar/digest/${digestId}/read`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent digest', async () => {
      const response = await request(app)
        .patch('/v1/radar/digest/non-existent-id/read')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Digest not found');
    });
  });

  describe('Telemetry Events', () => {
    it('should log radar rule creation event', async () => {
      const response = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Telemetry Test Rule',
          location: 'Sydney'
        });

      expect(response.status).toBe(201);
      // Telemetry event should be logged to console in test environment
    });

    it('should log radar rule update event', async () => {
      // First create a rule
      const ruleResponse = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Update Telemetry Rule',
          location: 'Sydney'
        });

      // Then update it
      const response = await request(app)
        .patch(`/v1/radar/rules/${ruleResponse.body.data.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(200);
      // Telemetry event should be logged to console in test environment
    });

    it('should log radar rule deletion event', async () => {
      // First create a rule
      const ruleResponse = await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Delete Telemetry Rule',
          location: 'Sydney'
        });

      // Then delete it
      const response = await request(app)
        .delete(`/v1/radar/rules/${ruleResponse.body.data.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Telemetry event should be logged to console in test environment
    });

    it('should log radar digest generation event', async () => {
      // Create a radar rule first
      await request(app)
        .post('/v1/radar/rules')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Digest Telemetry Rule',
          location: 'Sydney'
        });

      // Generate digest
      const response = await request(app)
        .get('/v1/radar/digest')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Telemetry event should be logged to console in test environment
    });
  });
});
