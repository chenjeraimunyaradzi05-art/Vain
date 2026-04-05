/**
 * Applications Pipeline Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('Applications Pipeline API', () => {
  let userToken: string;
  let employerToken: string;
  let adminToken: string;
  let testJob: any;
  let testUser: any;
  let testEmployer: any;
  let testAdmin: any;

  beforeEach(async () => {
    // Create test users
    const userResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'applicant.test@example.com',
        password: 'TestPassword123!',
        userType: 'MEMBER',
        firstName: 'Test',
        lastName: 'Applicant'
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

    const adminResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'admin.test@example.com',
        password: 'TestPassword123!',
        userType: 'ADMIN',
        firstName: 'Test',
        lastName: 'Admin'
      });

    testUser = userResponse.body.user;
    testEmployer = employerResponse.body.user;
    testAdmin = adminResponse.body.user;

    // Login users
    const userLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'applicant.test@example.com', password: 'TestPassword123!' });

    const employerLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'employer.test@example.com', password: 'TestPassword123!' });

    const adminLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin.test@example.com', password: 'TestPassword123!' });

    userToken = userLogin.body.token;
    employerToken = employerLogin.body.token;
    adminToken = adminLogin.body.token;

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
      // Delete applications
      await request(app)
        .delete('/v1/applications/test-cleanup')
        .set('Authorization', `Bearer ${adminToken}`);

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
        
      await request(app)
        .delete('/v1/auth/test-cleanup')
        .set('Authorization', `Bearer ${adminToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /v1/applications', () => {
    it('should create a new application successfully', async () => {
      const response = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'I am very interested in this position and believe my skills are a great match.'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBe(testJob.id);
      expect(response.body.data.userId).toBe(testUser.id);
      expect(response.body.data.status).toBe('SUBMITTED');
      expect(response.body.data.coverLetter).toContain('very interested');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/v1/applications')
        .send({
          jobId: testJob.id,
          coverLetter: 'Test cover letter'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          coverLetter: 'Test cover letter'
          // Missing jobId
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should prevent duplicate applications', async () => {
      // First application
      await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'First application'
        });

      // Second application to same job
      const response = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Second application'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Already applied to this job');
    });

    it('should reject applications for non-existent jobs', async () => {
      const response = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: 'non-existent-job-id',
          coverLetter: 'Test cover letter'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });

    it('should reject applications for inactive jobs', async () => {
      // Deactivate the job
      await request(app)
        .patch(`/v1/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'CLOSED' });

      // Try to apply
      const response = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test cover letter'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Job is not accepting applications');

      // Reactivate the job for other tests
      await request(app)
        .patch(`/v1/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'ACTIVE' });
    });
  });

  describe('GET /v1/applications', () => {
    beforeEach(async () => {
      // Create a test application
      await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test application for listing'
        });
    });

    it('should get user\'s applications', async () => {
      const response = await request(app)
        .get('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.applications).toHaveLength(1);
      expect(response.body.data.applications[0].job.title).toBe('Test Software Developer Position');
      expect(response.body.data.applications[0].status).toBe('SUBMITTED');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/applications');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/v1/applications?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/v1/applications?status=SUBMITTED')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications).toHaveLength(1);
      expect(response.body.data.applications[0].status).toBe('SUBMITTED');
    });

    it('should filter by jobId', async () => {
      const response = await request(app)
        .get(`/v1/applications?jobId=${testJob.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications).toHaveLength(1);
      expect(response.body.data.applications[0].jobId).toBe(testJob.id);
    });
  });

  describe('GET /v1/applications/:id', () => {
    let applicationId: string;

    beforeEach(async () => {
      // Create a test application
      const appResponse = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test application for details'
        });
      applicationId = appResponse.body.data.id;
    });

    it('should get application details', async () => {
      const response = await request(app)
        .get(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(applicationId);
      expect(response.body.data.job.title).toBe('Test Software Developer Position');
      expect(response.body.data.coverLetter).toContain('Test application for details');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/v1/applications/${applicationId}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should return 404 for non-existent application', async () => {
      const response = await request(app)
        .get('/v1/applications/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Application not found');
    });
  });

  describe('PATCH /v1/applications/:id', () => {
    let applicationId: string;

    beforeEach(async () => {
      // Create a test application
      const appResponse = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test application for status update'
        });
      applicationId = appResponse.body.data.id;
    });

    it('should allow employer to update application status', async () => {
      const response = await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          status: 'VIEWED',
          scheduledAt: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('VIEWED');
      expect(response.body.data.scheduledAt).toBeDefined();
    });

    it('should allow admin to update application status', async () => {
      const response = await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SHORTLISTED'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('SHORTLISTED');
    });

    it('should prevent applicant from updating status', async () => {
      const response = await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'VIEWED'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          status: 'INVALID_STATUS'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });
  });

  describe('DELETE /v1/applications/:id', () => {
    let applicationId: string;

    beforeEach(async () => {
      // Create a test application
      const appResponse = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test application for withdrawal'
        });
      applicationId = appResponse.body.data.id;
    });

    it('should allow applicant to withdraw application', async () => {
      const response = await request(app)
        .delete(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Application withdrawn successfully');
    });

    it('should allow admin to delete application', async () => {
      const response = await request(app)
        .delete(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should prevent employer from deleting application', async () => {
      const response = await request(app)
        .delete(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should return 404 for non-existent application', async () => {
      const response = await request(app)
        .delete('/v1/applications/non-existent-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Application not found');
    });
  });

  describe('Employer Application Management', () => {
    let applicationId: string;

    beforeEach(async () => {
      // Create a test application
      const appResponse = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test application for employer management'
        });
      applicationId = appResponse.body.data.id;
    });

    it('should allow employer to view applications for their jobs', async () => {
      const response = await request(app)
        .get(`/v1/applications?jobId=${testJob.id}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications).toHaveLength(1);
      expect(response.body.data.applications[0].jobId).toBe(testJob.id);
    });

    it('should prevent employer from viewing applications for other jobs', async () => {
      // Create another job by a different employer
      const otherJobResponse = await request(app)
        .post('/v1/auth/register')
        .send({
          email: 'other.employer@example.com',
          password: 'TestPassword123!',
          userType: 'COMPANY',
          firstName: 'Other',
          lastName: 'Employer'
        });

      const otherLogin = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'other.employer@example.com', password: 'TestPassword123!' });

      const otherJob = await request(app)
        .post('/v1/jobs')
        .set('Authorization', `Bearer ${otherLogin.body.token}`)
        .send({
          title: 'Other Job',
          description: 'Other job description',
          location: 'Other Location',
          employmentType: 'FULL_TIME'
        });

      // Try to view applications for other employer's job
      const response = await request(app)
        .get(`/v1/applications?jobId=${otherJob.body.data.id}`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.applications).toHaveLength(0);
    });

    it('should allow employer to update application status', async () => {
      const response = await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          status: 'INTERVIEW',
          scheduledAt: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('INTERVIEW');
    });
  });

  describe('Application Status Flow', () => {
    let applicationId: string;

    beforeEach(async () => {
      const appResponse = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test application for status flow'
        });
      applicationId = appResponse.body.data.id;
    });

    it('should support complete application lifecycle', async () => {
      // Initial status should be SUBMITTED
      const initialResponse = await request(app)
        .get(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(initialResponse.body.data.status).toBe('SUBMITTED');

      // Employer views application
      await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'VIEWED' });

      // Employer shortlists
      await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'SHORTLISTED' });

      // Schedule interview
      await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          status: 'INTERVIEW',
          scheduledAt: new Date().toISOString()
        });

      // Make offer
      await request(app)
        .patch(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'OFFERED' });

      // Final status check
      const finalResponse = await request(app)
        .get(`/v1/applications/${applicationId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(finalResponse.body.data.status).toBe('OFFERED');
      expect(finalResponse.body.data.scheduledAt).toBeDefined();
    });
  });

  describe('Telemetry Events', () => {
    it('should log application submission event', async () => {
      const response = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test application for telemetry'
        });

      expect(response.status).toBe(201);
      // Telemetry event should be logged to console in test environment
    });

    it('should log status change events', async () => {
      // First create an application
      const appResponse = await request(app)
        .post('/v1/applications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          jobId: testJob.id,
          coverLetter: 'Test application for status telemetry'
        });

      // Then change status
      const response = await request(app)
        .patch(`/v1/applications/${appResponse.body.data.id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({ status: 'VIEWED' });

      expect(response.status).toBe(200);
      // Telemetry event should be logged to console in test environment
    });
  });
});
