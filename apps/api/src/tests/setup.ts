/**
 * Test Setup for API Tests
 * 
 * This file sets up the test environment, database, and global test utilities.
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Test database URL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/vantage_test';

// Test database connection
let prisma: PrismaClient;

beforeAll(async () => {
  // Connect to test database
  prisma = new PrismaClient({
    datasources: {
      db: { url: DATABASE_URL }
  });

  // Run migrations
  try {
    execSync('npx prisma migrate deploy', { cwd: process.cwd() });
  } catch (error) {
    console.error('Migration error:', error);
  }

  // Start with a clean database for each test
  await prisma.$connect();
  await prisma.$executeRaw`TRUNCATE TABLE "UserPurpose" RESTART IDENTITY CASCADE;
  await prisma.$executeRaw`TRUNCATE TABLE "RadarRule" RESTART IDENTITY CASCADE;
  await prisma.$executeRaw`TRUNCATE TABLE "RadarMatch" RESTART IDENTITY CASCADE;
  await prisma.$executeRaw`TRUNCATE TABLE "RadarNotification" RESTART IDENTITY CASCADE;
  await prisma.$executeRaw`TRUNCATE TABLE "RadarDigest" RESTART IDENTITY CASCADE;
});

afterAll(async () => {
  // Clean up test data
  await prisma.$executeRaw`
    TRUNCATE TABLE "UserPurpose" RESTART IDENTITY CASCADE,
    TRUNCATE TABLE "RadarRule" RESTART IDENTITY CASCADE,
    TRUNCATE TABLE "RadarMatch" RESTART IDENTITY CASCADE,
    TRUNCATE TABLE "RadarNotification" RESTART IDENTITY CASCADE,
    TRUNCATE TABLE "RadarDigest" RESTART IDENTITY CASCADE
  `;
  
  await prisma.$disconnect();
});

// Global test utilities
export const testUtils = {
  // Create test user
  async createTestUser(userData: any) {
    return prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        userType: userData.userType || 'MEMBER',
        firstName: userData.firstName || 'Test',
        lastName: userData.lastName || 'User',
        password: userData.password || 'TestPassword123!',
        ...userData
      }
    });
  },

  // Create test job
  async createTestJob(jobData: any, userId: string) {
    return prisma.job.create({
      data: {
        userId,
        title: jobData.title || 'Test Job',
        description: jobData.description || 'A test job for testing',
        location: jobData.location || 'Test Location',
        employmentType: jobData.employmentType || 'FULL_TIME',
        status: 'ACTIVE',
        ...jobData
      }
    });
  },

  // Create test application
  async createTestApplication(applicationData: any, userId: string, jobId: string) {
    return prisma.jobApplication.create({
      data: {
        userId,
        jobId,
        status: 'SUBMITTED',
        ...applicationData
      }
    });
  },

  // Clean database
  async cleanDatabase() {
    await prisma.user.deleteMany({ where: {} });
    await prisma.job.deleteMany({ where: {} });
    await prisma.jobApplication.deleteMany({ where: {} });
  },

  // Get test user by email
  async getTestUser(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  },

  // Delete test user
  async deleteTestUser(email: string) {
    return prisma.user.delete({
      where: { email }
    });
  },

  // Generate test JWT token
  generateTestToken(userId: string): string {
    return Buffer.from(`test-token-${userId}-${Date.now()}`).toString('base64');
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
    zdiffstore: jest.fn(),
    zinter: jest.fn(),
    zaddstore: jest.fn(),
    zunionstore: jest.fn(),
    zdiffstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zinterstore: jest.fn(),
    zunionstore: jest.fn(),
    zdiffstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zinterstore: jest.fn(),
    zunionstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zinterstore: jest.fn(),
    zunionstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zinterstore: jest.fn(),
    zunionstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zinterstore: jest.fn(),
    zunionstore: jest.fn(),
    zcardstore: jest.fn(),
    zrangebylex: jest.fn(),
    zinterstore: jest.fn(),
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
  mockFileUpload: jest.fn(),
};

// Set up global mocks
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Mock Redis for tests
jest.mock('ioredis', () => testUtils.mockRedis);

// Mock email service for tests
jest.mock('@/services/emailService', () => testUtils.mockEmailService);

// Mock file upload for tests
jest.mock('@/services/fileUpload', () => testUtils.mockFileUpload);

// Export test utilities
export { prisma, testUtils };
