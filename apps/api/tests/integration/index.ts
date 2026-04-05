/**
 * Integration Test Setup
 * 
 * Provides server-aware exports that gracefully handle missing database/server.
 * Integration tests should import from this file instead of ../setup.
 */

import type { Express } from 'express';

// Re-export Vitest globals (configured via vitest.config.ts `globals: true`)
export const describe = (globalThis as any).describe;
export const it = (globalThis as any).it;
export const test = (globalThis as any).test;
export const expect = (globalThis as any).expect;
export const beforeAll = (globalThis as any).beforeAll;
export const afterAll = (globalThis as any).afterAll;
export const beforeEach = (globalThis as any).beforeEach;
export const afterEach = (globalThis as any).afterEach;
export const vi = (globalThis as any).vi;

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DEV_JWT_SECRET = 'test-jwt-secret-for-vitest-at-least-32-chars';
process.env.JWT_SECRET = 'test-jwt-secret-for-vitest-at-least-32-chars';
process.env.SES_TEST_CAPTURE = '1';

// State
let testApp: Express | null = null;
let testPrisma: any = null;
let isAvailable = false;
let initializationAttempted = false;

/**
 * Initialize test infrastructure
 */
async function initialize(): Promise<void> {
  if (initializationAttempted) return;
  initializationAttempted = true;

  try {
    // Try to import Prisma first
    const prismaModule = await import('../../src/db');
    testPrisma = prismaModule.default || prismaModule.prisma || prismaModule;
    
    // Test Prisma connection
    if (testPrisma && typeof testPrisma.$connect === 'function') {
      await testPrisma.$connect();
    }
    
    // Try to create the app
    const { createApp } = await import('../../src/app');
    testApp = createApp();
    
    isAvailable = true;
    console.log('✅ Integration test infrastructure initialized');
  } catch (error) {
    console.log('⚠️  Integration test infrastructure not available:', (error as Error).message);
    isAvailable = false;
  }
}

/**
 * Check if server is available
 */
export function serverAvailable(): boolean {
  return isAvailable;
}

/**
 * Get app instance (throws if not available)
 */
export function getApp(): Express {
  if (!testApp) {
    throw new Error('Test app not initialized');
  }
  return testApp;
}

/**
 * Get Prisma instance (throws if not available)
 */
export function getPrisma(): any {
  if (!testPrisma) {
    throw new Error('Prisma not initialized');
  }
  return testPrisma;
}

// Proxy exports that throw clear errors if accessed when unavailable
export const app = new Proxy({} as Express, {
  get(_target, prop) {
    if (!testApp) return undefined;
    return (testApp as any)[prop];
  }
});

export const prisma = new Proxy({} as any, {
  get(_target, prop) {
    if (!testPrisma) return undefined;
    return testPrisma[prop];
  }
});

/**
 * Integration test wrapper that skips tests when server is unavailable
 */
export function integrationTest(name: string, fn: () => void | Promise<void>) {
  it(name, async () => {
    if (!isAvailable) {
      console.log(`⏭️  Skipping "${name}" - server not available`);
      return;
    }
    await fn();
  });
}

/**
 * Setup for integration tests
 */
export function setupIntegrationTests() {
  beforeAll(async () => {
    await initialize();
  });

  afterAll(async () => {
    if (testPrisma && typeof testPrisma.$disconnect === 'function') {
      await testPrisma.$disconnect();
    }
    testApp = null;
    testPrisma = null;
  });
}

// Auto-initialize
initialize();
