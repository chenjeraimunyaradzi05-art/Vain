/**
 * Simplified Test Setup for API Tests
 * 
 * This file sets up basic test environment and utilities.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Mock console to avoid test pollution
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Mock console for tests
global.console = {
  log: jest.fn((...args) => {
    originalConsoleLog(...args);
  }),
  error: jest.fn((...args) => {
    originalConsoleError(...args);
  }),
  warn: jest.fn((...args) => {
    originalConsoleWarn(...args);
  }),
  info: jest.fn((...args) => {
    originalConsoleInfo(...args);
  }),
  debug: jest.fn((...args) => {
      originalConsoleDebug(...args);
    }
  });

// Global test utilities
export const testUtils = {
  // Mock user creation
  async createTestUser(userData: any) {
    return {
      id: `test-user-${Date.now()}`,
      email: userData.email || `test-${Date.now()}@example.com`,
      userType: userData.userType || 'MEMBER',
      firstName: userData.firstName || 'Test',
      lastName: userData.lastName || 'User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // Mock job creation
  async createTestJob(jobData: any, userId: string) {
    return {
      id: `test-job-${Date.now()}`,
      userId,
      title: jobData.title || 'Test Job',
      description: jobData.description || 'A test job for testing',
      location: jobData.location || 'Test Location',
      employmentType: jobData.employmentType || 'FULL_TIME',
      status: 'ACTIVE',
      salaryMin: jobData.salaryMin || 50000,
      salaryMax: jobData.salaryMax || 80000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // Mock application creation
  async createTestApplication(applicationData: any, userId: string, jobId: string) {
    return {
      id: `test-application-${Date.now()}`,
      userId,
      jobId,
      status: 'SUBMITTED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // Generate test data
  generateTestData() {
    return {
      user: testUtils.createTestUser({
        email: 'test@example.com',
        userType: 'MEMBER',
        firstName: 'Test',
        lastName: 'User'
      }),
      job: testUtils.createTestJob({
        title: 'Test Job',
        description: 'A test job for testing',
        location: 'Test Location',
        employmentType: 'FULL_TIME',
        salaryMin: 60000,
        salaryMax: 90000
      }),
      application: testUtils.createTestApplication({
        status: 'SUBMITTED'
      })
    };
  },

  // Mock JWT token generation
  generateTestToken(userId: string): string {
    return `test-token-${userId}-${Date.now()}`;
  },

  // Mock Redis client
  mockRedis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    flushall: jest.fn(),
    keys: jest.fn(),
    scan: jest.fn(),
    zadd: jest.fn(),
    zcard: jest.fn(),
    zrem: jest.fn(),
    zrange: jest.fn(),
    zrangebylex: jest.fn(),
    zunion: jest.fn(),
    zinter: jest.fn(),
    zaddstore: jest.fn(),
    zdiffstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zinterstore: jest.fn(),
    zunionstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zinterstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zunionstore: jest.fn()
  },

  // Mock email service
  mockEmailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendNotificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn()
  },

  // Mock file upload
  mockFileUpload: jest.fn()
};

// Reset console after tests
afterAll(() => {
  global.console = originalConsoleLog;
  global.console = originalConsoleError;
  global.console = originalConsoleWarn;
  global.console = originalConsoleInfo;
  global.console = originalConsoleDebug;
});

// Export test utilities
export { testUtils, mockRedis, mockEmailService, mockFileUpload };
