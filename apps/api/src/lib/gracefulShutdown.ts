/**
 * Graceful Shutdown Handler (Step 59)
 * 
 * Ensures clean shutdown of the application:
 * - Stops accepting new connections
 * - Waits for in-flight requests to complete
 * - Closes database connections
 * - Closes Redis connections
 * - Flushes logs/metrics
 */

import { Server } from 'http';
import { logger } from './logger';

interface ShutdownHandler {
  name: string;
  handler: () => Promise<void>;
  priority: number; // Lower number = higher priority (runs first)
}

const shutdownHandlers: ShutdownHandler[] = [];
let isShuttingDown = false;
let shutdownTimeout = 30000; // 30 seconds default

/**
 * Register a shutdown handler
 */
export function registerShutdownHandler(
  name: string,
  handler: () => Promise<void>,
  priority: number = 100
): void {
  shutdownHandlers.push({ name, handler, priority });
  // Sort by priority
  shutdownHandlers.sort((a, b) => a.priority - b.priority);
}

/**
 * Set the shutdown timeout
 */
export function setShutdownTimeout(timeout: number): void {
  shutdownTimeout = timeout;
}

/**
 * Check if shutdown is in progress
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

/**
 * Execute all shutdown handlers
 */
async function executeShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal', { signal });
    return;
  }
  
  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Set a hard timeout for shutdown
  const timeoutId = setTimeout(() => {
    logger.error('Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, shutdownTimeout);
  
  try {
    // Execute handlers in priority order
    for (const { name, handler } of shutdownHandlers) {
      logger.info(`Executing shutdown handler: ${name}`);
      try {
        await handler();
        logger.info(`Shutdown handler completed: ${name}`);
      } catch (error) {
        logger.error(`Shutdown handler failed: ${name}`, { error });
        // Continue with other handlers
      }
    }
    
    clearTimeout(timeoutId);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    clearTimeout(timeoutId);
    logger.error('Graceful shutdown failed', { error });
    process.exit(1);
  }
}

/**
 * Initialize graceful shutdown for a server
 */
export function initializeGracefulShutdown(server: Server): void {
  // Track active connections
  const connections = new Map<any, boolean>();
  
  server.on('connection', (conn) => {
    connections.set(conn, true);
    conn.on('close', () => connections.delete(conn));
  });
  
  // Register server shutdown handler (high priority)
  registerShutdownHandler('http-server', async () => {
    return new Promise<void>((resolve, reject) => {
      logger.info('Stopping HTTP server...');
      
      // Stop accepting new connections
      server.close((err) => {
        if (err) {
          logger.error('Error closing server', { error: err });
          reject(err);
        } else {
          logger.info('HTTP server stopped');
          resolve();
        }
      });
      
      // Close existing connections after a grace period
      setTimeout(() => {
        for (const conn of connections.keys()) {
          conn.destroy();
        }
      }, 10000); // 10 second grace period
    });
  }, 10);
  
  // Listen for termination signals
  process.on('SIGTERM', () => executeShutdown('SIGTERM'));
  process.on('SIGINT', () => executeShutdown('SIGINT'));
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    executeShutdown('uncaughtException');
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise: promise.toString() });
    // Don't exit on unhandled rejection, just log it
  });
}

/**
 * Create a Prisma shutdown handler
 */
export function createPrismaShutdownHandler(prisma: any): void {
  registerShutdownHandler('prisma', async () => {
    logger.info('Disconnecting from database...');
    await prisma.$disconnect();
    logger.info('Database disconnected');
  }, 50);
}

/**
 * Create a Redis shutdown handler
 */
export function createRedisShutdownHandler(redis: any): void {
  registerShutdownHandler('redis', async () => {
    logger.info('Disconnecting from Redis...');
    await redis.quit();
    logger.info('Redis disconnected');
  }, 60);
}

/**
 * Middleware to reject requests during shutdown
 */
export function shutdownMiddleware(req: any, res: any, next: any): void {
  if (isShuttingDown) {
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Server is shutting down',
      retryAfter: 30,
    });
    return;
  }
  next();
}

/**
 * Health check considering shutdown state
 */
export function isHealthy(): boolean {
  return !isShuttingDown;
}

export default {
  registerShutdownHandler,
  setShutdownTimeout,
  isShutdownInProgress,
  initializeGracefulShutdown,
  createPrismaShutdownHandler,
  createRedisShutdownHandler,
  shutdownMiddleware,
  isHealthy,
};

export {};
