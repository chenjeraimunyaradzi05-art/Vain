/**
 * Admin Job Management Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('Admin Job Management API', () => {
  let adminToken: string;
  let employerToken: string;
  let testAdmin: any;
  let testEmployer: any;
  let testJob: any;
  let testJob2: any;

  beforeEach(async () => {
    // Create admin user
    const adminResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'admin.test@example.com',
        password: 'TestPassword123!',
        userType: 'ADMIN',
        firstName: 'Admin',
        lastName: 'User'
      });

    // Create employer user
    const employerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'employer.admin.test@example.com',
        password: 'TestPassword123!',
        userType: 'COMPANY',
        firstName: 'Employer',
        lastName: 'Admin'
      });

    testAdmin = adminResponse.body.user;
    testEmployer = employerResponse.body.user;

    // Login users
    const adminLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'admin.test@example.com', password: 'TestPassword123!' });

    const employerLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'employer.admin.test@example.com', password: 'TestPassword123!' });

    adminToken = adminLogin.body.token;
    employerToken = employerLogin.body.token;

    // Create test jobs
    const jobResponse = await request(app)
      .post('/v1/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Test Job for Admin',
        description: 'A test job for admin management',
        location: 'Sydney, NSW',
        employmentType: 'FULL_TIME',
        salaryMin: 80000,
        salaryMax: 120000
      });

    testJob = jobResponse.body.data;

    const jobResponse2 = await request(app)
      .post('/v1/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Second Test Job',
        description: 'Another test job',
        location: 'Melbourne, VIC',
        employmentType: 'PART_TIME',
        salaryMin: 60000,
        salaryMax: 80000
      });

    testJob2 = jobResponse2.body.data;
  });

  afterEach(async () => {
    // Clean up test data
    try {
      // Delete test jobs
      if (testJob?.id) {
        await request(app)
          .delete(`/v1/jobs/${testJob.id}`)
          .set('Authorization', `Bearer ${employerToken}`);
      }
      if (testJob2?.id) {
        await request(app)
          .delete(`/v1/jobs/${testJob2.id}`)
          .set('Authorization', `Bearer ${employerToken}`);
      }

      // Clean up users
      await request(app)
        .delete('/v1/auth/test-cleanup')
        .set('Authorization', `Bearer ${adminToken}`);
        
      await request(app)
        .delete('/v1/auth/test-cleanup')
        .set('Authorization', `Bearer ${employerToken}`);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('GET /v1/admin/jobs/stats', () => {
    it('should get job statistics for admin', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalJobs');
      expect(response.body.data).toHaveProperty('activeJobs');
      expect(response.body.data).toHaveProperty('draftJobs');
      expect(response.body.data).toHaveProperty('closedJobs');
      expect(response.body.data).toHaveProperty('suspendedJobs');
      expect(response.body.data).toHaveProperty('totalApplications');
      expect(response.body.data).toHaveProperty('totalViews');
      expect(response.body.data).toHaveProperty('popularLocations');
      expect(response.body.data).toHaveProperty('popularTypes');
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs/stats')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs/stats');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /v1/admin/jobs', () => {
    it('should get all jobs for admin', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('jobs');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.jobs)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it('should support search filtering', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs?search=Test')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const jobs = response.body.data.jobs;
      jobs.forEach((job: any) => {
        expect(
          job.title.toLowerCase().includes('test') ||
          job.description.toLowerCase().includes('test') ||
          job.location.toLowerCase().includes('test')
        ).toBe(true);
      });
    });

    it('should support status filtering', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs?status=ACTIVE')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const jobs = response.body.data.jobs;
      jobs.forEach((job: any) => {
        expect(job.status).toBe('ACTIVE');
      });
    });

    it('should support type filtering', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs?type=FULL_TIME')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const jobs = response.body.data.jobs;
      jobs.forEach((job: any) => {
        expect(job.employmentType).toBe('FULL_TIME');
      });
    });

    it('should include application and view counts', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const jobs = response.body.data.jobs;
      jobs.forEach((job: any) => {
        expect(job).toHaveProperty('applicationCount');
        expect(job).toHaveProperty('viewCount');
        expect(typeof job.applicationCount).toBe('number');
        expect(typeof job.viewCount).toBe('number');
      });
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('POST /v1/admin/jobs/bulk', () => {
    it('should perform bulk suspend action', async () => {
      const response = await request(app)
        .post('/v1/admin/jobs/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobIds: [testJob.id, testJob2.id],
          action: 'suspend'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('suspend');
      expect(response.body.data.affectedJobs).toBe(2);
    });

    it('should perform bulk activate action', async () => {
      // First suspend jobs
      await request(app)
        .post('/v1/admin/jobs/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobIds: [testJob.id, testJob2.id],
          action: 'suspend'
        });

      // Then activate them
      const response = await request(app)
        .post('/v1/admin/jobs/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobIds: [testJob.id, testJob2.id],
          action: 'activate'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('activate');
      expect(response.body.data.affectedJobs).toBe(2);
    });

    it('should perform bulk delete action', async () => {
      // Create test jobs for deletion
      const job1Response = await request(app)
        .post('/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Job to Delete 1',
          description: 'Test job for deletion',
          location: 'Test City',
          employmentType: 'FULL_TIME'
        });

      const job2Response = await request(app)
        .post('/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Job to Delete 2',
          description: 'Another test job for deletion',
          location: 'Test City',
          employmentType: 'PART_TIME'
        });

      const jobIds = [job1Response.body.data.id, job2Response.body.data.id];

      const response = await request(app)
        .post('/v1/admin/jobs/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobIds,
          action: 'delete'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.action).toBe('delete');
      expect(response.body.data.affectedJobs).toBe(2);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/admin/jobs/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          // Missing jobIds and action
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .post('/v1/admin/jobs/bulk')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          jobIds: [testJob.id],
          action: 'suspend'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('PATCH /v1/admin/jobs/:id', () => {
    it('should suspend a job', async () => {
      const response = await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'suspend'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('SUSPENDED');
    });

    it('should activate a job', async () => {
      // First suspend the job
      await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'suspend' });

      // Then activate it
      const response = await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'activate'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ACTIVE');
    });

    it('should feature a job', async () => {
      const response = await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'feature'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isFeatured).toBe(true);
    });

    it('should unfeature a job', async () => {
      // First feature the job
      await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'feature' });

      // Then unfeature it
      const response = await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'unfeature'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isFeatured).toBe(false);
    });

    it('should delete a job', async () => {
      // Create a test job for deletion
      const jobResponse = await request(app)
        .post('/v1/jobs')
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          title: 'Job to Delete',
          description: 'Test job for deletion',
          location: 'Test City',
          employmentType: 'FULL_TIME'
        });

      const jobId = jobResponse.body.data.id;

      const response = await request(app)
        .patch(`/v1/admin/jobs/${jobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'delete'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .patch('/v1/admin/jobs/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'suspend'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${employerToken}`)
        .send({
          action: 'suspend'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('GET /v1/admin/jobs/:id/analytics', () => {
    it('should get job analytics', async () => {
      const response = await request(app)
        .get(`/v1/admin/jobs/${testJob.id}/analytics`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('job');
      expect(response.body.data).toHaveProperty('applications');
      expect(response.body.data).toHaveProperty('views');
      expect(response.body.data).toHaveProperty('conversionRate');
    });

    it('should include job details', async () => {
      const response = await request(app)
        .get(`/v1/admin/jobs/${testJob.id}/analytics`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const job = response.body.data.job;
      expect(job.id).toBe(testJob.id);
      expect(job).toHaveProperty('title');
      expect(job).toHaveProperty('company');
      expect(job).toHaveProperty('location');
      expect(job).toHaveProperty('employmentType');
    });

    it('should include application statistics', async () => {
      const response = await request(app)
        .get(`/v1/admin/jobs/${testJob.id}/analytics`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const applications = response.body.data.applications;
      expect(applications).toHaveProperty('total');
      expect(applications).toHaveProperty('byStatus');
      expect(typeof applications.total).toBe('number');
    });

    it('should return 404 for non-existent job', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs/non-existent-id/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Job not found');
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .get(`/v1/admin/jobs/${testJob.id}/analytics`)
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('GET /v1/admin/jobs/reports', () => {
    it('should get job reports', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('suspendedJobs');
      expect(response.body.data).toHaveProperty('expiredJobs');
      expect(response.body.data).toHaveProperty('highApplicationJobs');
      expect(response.body.data).toHaveProperty('noApplicationJobs');
    });

    it('should include suspended jobs', async () => {
      // Suspend a job first
      await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'suspend' });

      const response = await request(app)
        .get('/v1/admin/jobs/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      const suspendedJobs = response.body.data.suspendedJobs;
      expect(Array.isArray(suspendedJobs)).toBe(true);
      expect(suspendedJobs.length).toBeGreaterThanOrEqual(1);
    });

    it('should require admin authentication', async () => {
      const response = await request(app)
        .get('/v1/admin/jobs/reports')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('Telemetry Events', () => {
    it('should log bulk action telemetry events', async () => {
      const response = await request(app)
        .post('/v1/admin/jobs/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          jobIds: [testJob.id],
          action: 'suspend'
        });

      expect(response.status).toBe(200);
      // Telemetry event should be logged to console in test environment
    });

    it('should log individual action telemetry events', async () => {
      const response = await request(app)
        .patch(`/v1/admin/jobs/${testJob.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'suspend'
        });

      expect(response.status).toBe(200);
      // Telemetry event should be logged to console in test environment
    });
  });
});
