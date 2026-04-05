/**
 * Database Connection Pool Configuration
 * 
 * Optimized Prisma client configuration for production workloads.
 * Includes connection pooling, query logging, and error handling.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logger';

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Connection pool settings
const POOL_CONFIG = {
  // Maximum number of connections in the pool
  connectionLimit: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
  
  // Connection timeout in milliseconds
  connectTimeout: parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '10000', 10),
  
  // Statement timeout for queries
  statementTimeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000', 10),
  
  // Idle timeout before connection is released
  idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '60000', 10),
};

// Query logging configuration
const LOG_CONFIG: Prisma.LogLevel[] = isDevelopment 
  ? ['query', 'info', 'warn', 'error']
  : ['warn', 'error'];

// Slow query threshold (ms)
const SLOW_QUERY_THRESHOLD = parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10);

/**
 * Extended Prisma Client with middleware and logging
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: LOG_CONFIG.map(level => ({
      emit: 'event' as const,
      level,
    })),
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Query logging
  if (isDevelopment) {
    (client as any).$on('query', (e: any) => {
      const duration = e.duration;
      if (duration > SLOW_QUERY_THRESHOLD) {
        logger.warn('Slow query detected', {
          query: e.query.substring(0, 200),
          params: e.params?.substring(0, 100),
          duration: duration,
        });
      }
    });
  }

  // Error logging
  (client as any).$on('error', (e: any) => {
    logger.error('Prisma error', {
      message: e.message,
      target: e.target,
    });
  });

  // Warning logging
  (client as any).$on('warn', (e: any) => {
    logger.warn('Prisma warning', {
      message: e.message,
    });
  });

  return client;
}

// Singleton pattern for Prisma client
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

// Use global variable in development to prevent hot reload issues
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (isDevelopment) {
  globalThis.__prisma = prisma;
}

/**
 * Execute a database operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    retryableErrors?: string[];
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryableErrors = [
      'P1001', // Connection error
      'P1002', // Server timed out
      'P2024', // Timed out fetching connection
    ],
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const errorCode = error.code || '';
      const isRetryable = retryableErrors.some(code => errorCode.includes(code));

      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      logger.warn('Database operation failed, retrying', {
        attempt,
        maxRetries,
        errorCode,
        message: error.message,
      });

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  throw lastError;
}

/**
 * Execute a transaction with timeout
 */
export async function withTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  options: {
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
  } = {}
): Promise<T> {
  const {
    timeout = 10000,
    isolationLevel = 'ReadCommitted',
  } = options;

  return prisma.$transaction(operation, {
    maxWait: timeout,
    timeout: timeout,
    isolationLevel,
  });
}

/**
 * Graceful shutdown handler
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database', { error });
    throw error;
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Get connection pool statistics (requires pg-pool or similar)
 */
export function getPoolStats(): {
  configured: typeof POOL_CONFIG;
  environment: string;
} {
  return {
    configured: POOL_CONFIG,
    environment: process.env.NODE_ENV || 'development',
  };
}

// Export types
export type { PrismaClient, Prisma };

export {};
