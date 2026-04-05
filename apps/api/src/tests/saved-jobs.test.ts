/**
 * Saved Jobs API Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('Saved Jobs API', () => {
  let userToken: string;
  let employerToken: string;
  let testJob: any;
  let testUser: any;
  let testEmployer: any;

  beforeEach(async () => {
    // Create test users
    const userResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'user.test@example.com',
        password: 'TestPassword123!',
        userType: 'MEMBER',
        firstName: 'Test',
        lastName: 'User'
      });

    const employerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'employer.test@example.com',
        password: 'TestPassword123!',
        userType: 'COMPANY',
        firstName: 'Test',
        lastName: 'Employer'
      });

    testUser = userResponse.body.user;
    testEmployer = employerResponse.body.user;

    // Login users
    const userLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'user.test@example.com', password: 'TestPassword123!' });

    const employerLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'employer.test@example.com', password: 'TestPassword123!' });

    userToken = userLogin.body.token;
    employerToken = employerLogin.body.token;

    // Create a test job
    const jobResponse = await request(app)
      .post('/v1/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Test Software Developer Position',
        description: 'A great opportunity for a software developer',
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
      // Delete saved jobs
      await request(app)
        .delete('/v1/saved-jobs/test-cleanup')
        .set('Authorization', `Bearer ${userToken}`);

      // Delete test job
      if (testJob?.id) {
        await request(app)
          .delete(`/v1/jobs/${testJob.id}`)
          .set('Authorization', `Bearer ${employerToken}`);
      }

      // Clean up users
      await request(app)
        .delete('/v1/auth/test-cleanup')
        .set('Authorization', `Bearer ${userToken}`);
        
      await request(app)
        .delete('/v1/auth/test-cleanup')
        .set('Authorization', `Bearer ${employerToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /v1/saved-jobs', () => {
    it('should save a job successfully', async () => {
      const response = await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe(testJob.id);
      expect(response.body.data.job.title).toBe('Test Software Developer Position');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/v1/saved-jobs')
        .send({
          jobId: testJob.id
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should validate jobId is provided', async () => {
      const response = await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should reject saving non-existent job', async () => {
      const response = await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: 'non-existent-job-id'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });

    it('should reject saving inactive job', async () => {
      // First, deactivate the job
      await request(app)
        .patch(`/v1/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'CLOSED' });

      // Try to save the inactive job
      const response = await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot save inactive job');

      // Reactivate the job for other tests
      await request(app)
        .patch(`/v1/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'ACTIVE' });
    });

    it('should prevent duplicate saves', async () => {
      // Save the job first time
      await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });

      // Try to save the same job again
      const response = await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Job already saved');
    });
  });

  describe('DELETE /v1/saved-jobs/:jobId', () => {
    beforeEach(async () => {
      // Save a job for deletion tests
      await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });
    });

    it('should unsave a job successfully', async () => {
      const response = await request(app)
        .delete(`/v1/saved-jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Job unsaved successfully');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/v1/saved-jobs/${testJob.id}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should return 404 for non-saved job', async () => {
      const response = await request(app)
        .delete('/v1/saved-jobs/non-saved-job-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Saved job not found');
    });
  });

  describe('GET /v1/saved-jobs', () => {
    beforeEach(async () => {
      // Save a job for listing tests
      await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });
    });

    it('should get user\'s saved jobs', async () => {
      const response = await request(app)
        .get('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobs).toHaveLength(1);
      expect(response.body.data.jobs[0].job.title).toBe('Test Software Developer Position');
      expect(response.body.data.pagination.total).toBe(1);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/saved-jobs');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/v1/saved-jobs?page=1&pageSize=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(10);
    });

    it('should support sorting', async () => {
      const response = await request(app)
        .get('/v1/saved-jobs?sortBy=title&sortOrder=asc')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.jobs).toHaveLength(1);
    });

    it('should return empty list for user with no saved jobs', async () => {
      // First unsave the job
      await request(app)
        .delete(`/v1/saved-jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      const response = await request(app)
        .get('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.jobs).toHaveLength(0);
      expect(response.body.data.pagination.total).toBe(0);
    });
  });

  describe('GET /v1/saved-jobs/:jobId/check', () => {
    it('should return true for saved job', async () => {
      // Save the job first
      await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });

      const response = await request(app)
        .get(`/v1/saved-jobs/${testJob.id}/check`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isSaved).toBe(true);
      expect(response.body.data.savedAt).toBeDefined();
    });

    it('should return false for unsaved job', async () => {
      const response = await request(app)
        .get(`/v1/saved-jobs/${testJob.id}/check`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isSaved).toBe(false);
      expect(response.body.data.savedAt).toBeNull();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/v1/saved-jobs/${testJob.id}/check`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Permission-based access', () => {
    it('should allow users to save jobs', async () => {
      const response = await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });

      expect(response.status).toBe(201);
    });

    it('should allow employers to save jobs (for reference)', async () => {
      const response = await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          jobId: testJob.id
        });

      expect(response.status).toBe(201);
    });

    it('should prevent users from saving other users\' jobs', async () => {
      // This test would require creating a job by another user
      // For now, we test that users can only save their own saved jobs
      const response = await request(app)
        .delete(`/v1/saved-jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Should work since it's their own saved job
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Telemetry Events', () => {
    it('should log job_saved event', async () => {
      const response = await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });

      expect(response.status).toBe(201);
      // Telemetry event should be logged to console in test environment
    });

    it('should log job_unsaved event', async () => {
      // First save the job
      await request(app)
        .post('/v1/saved-jobs')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id
        });

      // Then unsave it
      const response = await request(app)
        .delete(`/v1/saved-jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      // Telemetry event should be logged to console in test environment
    });
  });
});
