// @ts-nocheck
/**
 * BullMQ Production Job Queue
 * 
 * Redis-backed job queue for production deployments.
 * Falls back to in-memory queue in development.
 */

import logger from './logger';

// Queue configuration
const QUEUE_CONFIG = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 60 * 60, // 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 60 * 60, // 7 days
    },
  },
  limiter: {
    max: 100,
    duration: 1000,
  },
};

// Queue instances
let emailQueue: any = null;
let notificationQueue: any = null;
let reportQueue: any = null;
let cleanupQueue: any = null;

// Worker instances
const workers: any[] = [];

// Connection
let connection: any = null;

/**
 * Initialize BullMQ with Redis connection
 */
export async function initBullMQ() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    logger.warn('[BullMQ] Redis URL not configured, using in-memory fallback');
    return false;
  }

  try {
    const { Queue, Worker } = await import('bullmq');
    const { default: IORedis } = await import('ioredis');
    
    // Parse Redis URL
    connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Create queues
    emailQueue = new Queue('email', { connection, ...QUEUE_CONFIG });
    notificationQueue = new Queue('notification', { connection, ...QUEUE_CONFIG });
    reportQueue = new Queue('report', { connection, ...QUEUE_CONFIG });
    cleanupQueue = new Queue('cleanup', { connection, ...QUEUE_CONFIG });

    logger.info('[BullMQ] Queues initialized');
    return true;
  } catch (error) {
    logger.error('[BullMQ] Failed to initialize:', error.message);
    return false;
  }
}

/**
 * Start queue workers
 */
export async function startWorkers(handlers: any = {}) {
  if (!connection) {
    logger.warn('[BullMQ] Cannot start workers without Redis connection');
    return false;
  }

  try {
    const { Worker } = await import('bullmq');

    // Email worker
    if (handlers.email) {
      const emailWorker = new Worker('email', handlers.email, {
        connection,
        concurrency: 5,
      });
      emailWorker.on('completed', (job) => {
        logger.info(`[Email] Job ${job.id} completed`);
      });
      emailWorker.on('failed', (job, err) => {
        logger.error(`[Email] Job ${job?.id} failed:`, err.message);
      });
      workers.push(emailWorker);
    }

    // Notification worker
    if (handlers.notification) {
      const notificationWorker = new Worker('notification', handlers.notification, {
        connection,
        concurrency: 10,
      });
      notificationWorker.on('completed', (job) => {
        logger.info(`[Notification] Job ${job.id} completed`);
      });
      notificationWorker.on('failed', (job, err) => {
        logger.error(`[Notification] Job ${job?.id} failed:`, err.message);
      });
      workers.push(notificationWorker);
    }

    // Report worker (lower concurrency for heavy jobs)
    if (handlers.report) {
      const reportWorker = new Worker('report', handlers.report, {
        connection,
        concurrency: 2,
      });
      reportWorker.on('completed', (job) => {
        logger.info(`[Report] Job ${job.id} completed`);
      });
      reportWorker.on('failed', (job, err) => {
        logger.error(`[Report] Job ${job?.id} failed:`, err.message);
      });
      workers.push(reportWorker);
    }

    // Cleanup worker
    if (handlers.cleanup) {
      const cleanupWorker = new Worker('cleanup', handlers.cleanup, {
        connection,
        concurrency: 1,
      });
      cleanupWorker.on('completed', (job) => {
        logger.info(`[Cleanup] Job ${job.id} completed`);
      });
      cleanupWorker.on('failed', (job, err) => {
        logger.error(`[Cleanup] Job ${job?.id} failed:`, err.message);
      });
      workers.push(cleanupWorker);
    }

    logger.info(`[BullMQ] Started ${workers.length} workers`);
    return true;
  } catch (error) {
    logger.error('[BullMQ] Failed to start workers:', error.message);
    return false;
  }
}

/**
 * Stop all workers gracefully
 */
export async function stopWorkers() {
  for (const worker of workers) {
    await worker.close();
  }
  workers.length = 0;
  logger.info('[BullMQ] Workers stopped');
}

/**
 * Add email job
 */
export async function addEmailJob(data, options = {}) {
  if (!emailQueue) {
    logger.warn('[BullMQ] Email queue not initialized');
    return null;
  }
  return emailQueue.add('send', data, {
    ...QUEUE_CONFIG.defaultJobOptions,
    ...options,
  });
}

/**
 * Add notification job
 */
export async function addNotificationJob(data, options = {}) {
  if (!notificationQueue) {
    logger.warn('[BullMQ] Notification queue not initialized');
    return null;
  }
  return notificationQueue.add('send', data, {
    ...QUEUE_CONFIG.defaultJobOptions,
    ...options,
  });
}

/**
 * Add report generation job
 */
export async function addReportJob(data, options = {}) {
  if (!reportQueue) {
    logger.warn('[BullMQ] Report queue not initialized');
    return null;
  }
  return reportQueue.add('generate', data, {
    ...QUEUE_CONFIG.defaultJobOptions,
    ...options,
    attempts: 1, // Reports shouldn't retry automatically
  });
}

/**
 * Add cleanup job
 */
export async function addCleanupJob(data, options = {}) {
  if (!cleanupQueue) {
    logger.warn('[BullMQ] Cleanup queue not initialized');
    return null;
  }
  return cleanupQueue.add('run', data, {
    ...QUEUE_CONFIG.defaultJobOptions,
    ...options,
  });
}

/**
 * Schedule recurring jobs
 */
export async function scheduleRecurringJobs() {
  if (!cleanupQueue) {
    logger.warn('[BullMQ] Cannot schedule recurring jobs without queues');
    return;
  }

  try {
    // Cleanup expired sessions every hour
    await cleanupQueue.add('expired-sessions', {}, {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    });

    // Cleanup old audit logs weekly
    await cleanupQueue.add('old-audit-logs', {}, {
      repeat: {
        pattern: '0 0 * * 0', // Every Sunday at midnight
      },
    });

    // Generate daily analytics
    await reportQueue?.add('daily-analytics', {}, {
      repeat: {
        pattern: '0 1 * * *', // Every day at 1 AM
      },
    });

    logger.info('[BullMQ] Recurring jobs scheduled');
  } catch (error) {
    logger.error('[BullMQ] Failed to schedule recurring jobs:', error.message);
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const stats = {
    email: null,
    notification: null,
    report: null,
    cleanup: null,
  };

  if (emailQueue) {
    stats.email = await emailQueue.getJobCounts();
  }
  if (notificationQueue) {
    stats.notification = await notificationQueue.getJobCounts();
  }
  if (reportQueue) {
    stats.report = await reportQueue.getJobCounts();
  }
  if (cleanupQueue) {
    stats.cleanup = await cleanupQueue.getJobCounts();
  }

  return stats;
}

/**
 * Health check
 */
export async function healthCheck() {
  if (!connection) {
    return { healthy: false, error: 'No Redis connection' };
  }

  try {
    await connection.ping();
    return { healthy: true };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

export function getEmailQueue() { return emailQueue; }
export function getNotificationQueue() { return notificationQueue; }
export function getReportQueue() { return reportQueue; }
export function getCleanupQueue() { return cleanupQueue; }

export {};

