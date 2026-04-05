/**
 * Prisma Mock for Unit Testing
 * 
 * Provides a mocked Prisma client for service tests.
 */

import { PrismaClient } from '@prisma/client';
import { beforeEach, vi } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';

// Re-export the mock
export const prismaMock = mockDeep<PrismaClient>();

// Reset mocks before each test
beforeEach(() => {
  mockReset(prismaMock);
});

// Mock the prisma module
vi.mock('../db', () => ({
  prisma: prismaMock,
}));

export type MockPrismaClient = DeepMockProxy<PrismaClient>;
