/**
 * User Analytics Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { app } from '../index';

describe('User Analytics API', () => {
  let userToken: string;
  let employerToken: string;
  let testUser: any;
  let testEmployer: any;

  beforeEach(async () => {
    // Create test users
    const userResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'analytics.user@example.com',
        password: 'TestPassword123!',
        userType: 'MEMBER',
        firstName: 'Analytics',
        lastName: 'User'
      });

    const employerResponse = await request(app)
      .post('/v1/auth/register')
      .send({
        email: 'analytics.employer@example.com',
        password: 'TestPassword123!',
        userType: 'COMPANY',
        firstName: 'Analytics',
        lastName: 'Employer'
      });

    testUser = userResponse.body.user;
    testEmployer = employerResponse.body.user;

    // Login users
    const userLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'analytics.user@example.com', password: 'TestPassword123!' });

    const employerLogin = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'analytics.employer@example.com', password: 'TestPassword123!' });

    userToken = userLogin.body.token;
    employerToken = employerLogin.body.token;
  });

  afterEach(async () => {
    // Clean up test data
    try {
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

  describe('GET /v1/user-analytics/overview', () => {
    it('should get user analytics overview for member', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/overview')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeframe).toBeDefined();
      expect(response.body.data.startDate).toBeDefined();
      expect(response.body.data.endDate).toBeDefined();
      expect(response.body.data.metrics).toBeDefined();
      expect(response.body.data.activityTrends).toBeDefined();
      
      // Member-specific metrics
      expect(response.body.data.metrics.totalApplications).toBeDefined();
      expect(response.body.data.metrics.savedJobs).toBeDefined();
      expect(response.body.data.metrics.profileCompletion).toBeDefined();
      expect(response.body.data.metrics.recentActivity).toBeDefined();
    });

    it('should get user analytics overview for employer', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/overview')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Employer-specific metrics
      expect(response.body.data.metrics.totalJobs).toBeDefined();
      expect(response.body.data.metrics.totalApplications).toBeDefined();
      expect(response.body.data.metrics.activeJobs).toBeDefined();
      expect(response.body.data.metrics.recentActivity).toBeDefined();
    });

    it('should support different timeframes', async () => {
      const timeframes = ['7d', '30d', '90d', '1y', 'all'];
      
      for (const timeframe of timeframes) {
        const response = await request(app)
          .get(`/v1/user-analytics/overview?timeframe=${timeframe}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.timeframe).toBe(timeframe);
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/overview');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /v1/user-analytics/activity', () => {
    beforeEach(async () => {
      // Create some test activities
      await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'LOGIN',
          metadata: { source: 'web' }
        });

      await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'JOB_VIEW',
          metadata: { jobId: 'test-job-id' }
        });
    });

    it('should get user activities', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activities).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.activities)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/activity?limit=1&offset=0')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.offset).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/activity');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('POST /v1/user-analytics/activity', () => {
    it('should log user activity successfully', async () => {
      const response = await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'LOGIN',
          metadata: { source: 'mobile', device: 'iPhone' },
          duration: 300
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.activityType).toBe('LOGIN');
      expect(response.body.data.metadata.source).toBe('mobile');
      expect(response.body.data.duration).toBe(300);
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should validate required activityType', async () => {
      const response = await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          metadata: { source: 'web' }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.message).toBe('activityType is required');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/v1/user-analytics/activity')
        .send({
          activityType: 'LOGIN'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /v1/user-analytics/progress', () => {
    it('should get user progress for member', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/progress')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.applicationsCount).toBeDefined();
      expect(response.body.data.savedJobsCount).toBeDefined();
      expect(response.body.data.interviewsCount).toBeDefined();
      expect(response.body.data.offersCount).toBeDefined();
      expect(response.body.data.milestones).toBeDefined();
      expect(response.body.data.completionRate).toBeDefined();
    });

    it('should get user progress for employer', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/progress')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.jobsCount).toBeDefined();
      expect(response.body.data.applicationsCount).toBeDefined();
      expect(response.body.data.hiredCount).toBeDefined();
      expect(response.body.data.hireRate).toBeDefined();
      expect(response.body.data.milestones).toBeDefined();
      expect(response.body.data.completionRate).toBeDefined();
    });

    it('should include milestone details', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/progress')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const milestones = response.body.data.milestones;
      
      expect(Array.isArray(milestones)).toBe(true);
      if (milestones.length > 0) {
        const milestone = milestones[0];
        expect(milestone.id).toBeDefined();
        expect(milestone.title).toBeDefined();
        expect(milestone.description).toBeDefined();
        expect(typeof milestone.completed).toBe('boolean');
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/progress');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('GET /v1/user-analytics/engagement', () => {
    beforeEach(async () => {
      // Create some test activities for engagement calculation
      await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'LOGIN',
          metadata: { source: 'web' }
        });

      await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'SESSION_DURATION',
          duration: 600 // 10 minutes
        });
    });

    it('should get user engagement metrics', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/engagement')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.timeframe).toBeDefined();
      expect(response.body.data.engagementScore).toBeDefined();
      expect(typeof response.body.data.engagementScore).toBe('number');
      expect(response.body.data.engagementScore).toBeGreaterThanOrEqual(0);
      expect(response.body.data.engagementScore).toBeLessThanOrEqual(100);
    });

    it('should include detailed engagement metrics', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/engagement')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const metrics = response.body.data.metrics;
      
      expect(metrics.totalActivities).toBeDefined();
      expect(metrics.uniqueActivityTypes).toBeDefined();
      expect(metrics.averageSessionDuration).toBeDefined();
      expect(metrics.loginCount).toBeDefined();
      expect(metrics.lastLogin).toBeDefined();
      expect(metrics.daysSinceLastLogin).toBeDefined();
    });

    it('should support different timeframes for engagement', async () => {
      const timeframes = ['7d', '30d', '90d'];
      
      for (const timeframe of timeframes) {
        const response = await request(app)
          .get(`/v1/user-analytics/engagement?timeframe=${timeframe}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data.timeframe).toBe(timeframe);
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/v1/user-analytics/engagement');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Activity Logging', () => {
    it('should log different activity types', async () => {
      const activityTypes = [
        'LOGIN',
        'JOB_VIEW',
        'APPLICATION',
        'SESSION_DURATION',
        'PROFILE_UPDATE',
        'SAVE_JOB',
        'RADAR_SEARCH'
      ];

      for (const activityType of activityTypes) {
        const response = await request(app)
          .post('/v1/user-analytics/activity')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            activityType,
            metadata: { test: true }
          });

        expect(response.status).toBe(201);
        expect(response.body.data.activityType).toBe(activityType);
      }
    });

    it('should handle optional metadata', async () => {
      const response = await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'LOGIN'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.metadata).toEqual({});
    });

    it('should handle optional duration', async () => {
      const response = await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'SESSION_DURATION',
          duration: 1200 // 20 minutes
        });

      expect(response.status).toBe(201);
      expect(response.body.data.duration).toBe(1200);
    });
  });

  describe('Progress Milestones', () => {
    it('should track member milestones correctly', async () => {
      // Create some applications to test milestones
      await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'APPLICATION',
          metadata: { jobId: 'test-job-1' }
        });

      const response = await request(app)
        .get('/v1/user-analytics/progress')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      const milestones = response.body.data.milestones;
      
      const firstApplicationMilestone = milestones.find(m => m.id === 'first_application');
      expect(firstApplicationMilestone).toBeDefined();
      expect(firstApplicationMilestone.title).toBe('First Application');
      expect(firstApplicationMilestone.completed).toBe(true);
    });

    it('should track employer milestones correctly', async () => {
      // Create a job to test employer milestones
      const employerLogin = await request(app)
        .post('/v1/auth/login')
        .send({ email: 'analytics.employer@example.com', password: 'TestPassword123!' });

      await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${employerLogin.body.token}`)
        .send({
          activityType: 'JOB_CREATED',
          metadata: { jobId: 'test-job-1' }
        });

      const response = await request(app)
        .get('/v1/user-analytics/progress')
        .set('Authorization', `Bearer ${employerToken}`);

      expect(response.status).toBe(200);
      const milestones = response.body.data.milestones;
      
      const firstJobMilestone = milestones.find(m => m.id === 'first_job');
      expect(firstJobMilestone).toBeDefined();
      expect(firstJobMilestone.title).toBe('First Job Posted');
    });
  });

  describe('Engagement Score Calculation', () => {
    it('should calculate engagement score based on activity', async () => {
      // Create multiple activities to increase engagement score
      const activities = [
        { activityType: 'LOGIN' },
        { activityType: 'JOB_VIEW', metadata: { jobId: 'job-1' } },
        { activityType: 'PROFILE_UPDATE', metadata: { field: 'bio' } },
        { activityType: 'SAVE_JOB', metadata: { jobId: 'job-2' } },
        { activityType: 'SESSION_DURATION', duration: 900 } // 15 minutes
      ];

      for (const activity of activities) {
        await request(app)
          .post('/v1/user-analytics/activity')
          .set('Authorization', `Bearer ${userToken}`)
          .send(activity);
      }

      const response = await request(app)
        .get('/v1/user-analytics/engagement')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.engagementScore).toBeGreaterThan(0);
      expect(response.body.data.metrics.totalActivities).toBeGreaterThanOrEqual(5);
      expect(response.body.data.metrics.uniqueActivityTypes).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Telemetry Events', () => {
    it('should log activity telemetry events', async () => {
      const response = await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'LOGIN',
          metadata: { source: 'web' }
        });

      expect(response.status).toBe(201);
      // Telemetry event should be logged to console in test environment
    });

    it('should include activity ID in telemetry', async () => {
      const response = await request(app)
        .post('/v1/user-analytics/activity')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          activityType: 'JOB_VIEW',
          metadata: { jobId: 'test-job' }
        });

      expect(response.status).toBe(201);
      expect(response.body.data.id).toBeDefined();
      // Telemetry event should include activity ID
    });
  });
});
