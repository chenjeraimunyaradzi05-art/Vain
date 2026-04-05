import { PrismaClient } from '@prisma/client';

/**
 * Shared Prisma client instance for the API.
 * Lazy initialization to allow proper environment loading.
 */

let _prisma: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL environment variable is not set!');
    console.error('   Please set DATABASE_URL in Railway environment variables.');
    console.error('   Example: postgresql://user:password@host:5432/database');
    // In production, throw to fail fast. In dev, we might still create a client.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_URL is required in production');
    }
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
}

// Lazy getter for prisma - only initializes when first accessed
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) {
      console.log('🔌 Initializing Prisma client...');
      _prisma = createPrismaClient();
    }
    return (_prisma as any)[prop];
  }
});
