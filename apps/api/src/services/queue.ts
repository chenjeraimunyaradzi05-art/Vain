/**
 * Queue Service
 * 
 * BullMQ job queue management for background processing.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import type { Redis } from 'ioredis';

// Connection configuration
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
};

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
  NOTIFICATIONS: 'notification-queue',
  RESUME_PARSING: 'resume-parsing-queue',
  FILE_PROCESSING: 'file-processing-queue',
  ANALYTICS: 'analytics-queue',
  WEBHOOKS: 'webhook-queue',
  SCHEDULED: 'scheduled-queue',
} as const;

type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];

// Queue instances cache
const queues = new Map<string, Queue>();

/**
 * Get or create a queue instance
 */
export function getQueue(name: QueueName): Queue {
  if (!queues.has(name)) {
    const queue = new Queue(name, { connection });
    queues.set(name, queue);
  }
  return queues.get(name)!;
}

/**
 * Email job data
 */
interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}

/**
 * Add email job to queue
 */
export async function queueEmail(data: EmailJobData, options?: {
  priority?: number;
  delay?: number;
  attempts?: number;
}): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  
  return queue.add('send-email', data, {
    priority: options?.priority ?? 0,
    delay: options?.delay,
    attempts: options?.attempts ?? 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  });
}

/**
 * Notification job data
 */
interface NotificationJobData {
  userId: string;
  type: 'email' | 'push' | 'sms' | 'in-app';
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Add notification job to queue
 */
export async function queueNotification(data: NotificationJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.NOTIFICATIONS);
  
  return queue.add('send-notification', data, {
    priority: data.type === 'push' ? 1 : 0,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 50,
    removeOnFail: 500,
  });
}

/**
 * Resume parsing job data
 */
interface ResumeParsingJobData {
  fileUrl: string;
  userId: string;
  applicationId?: string;
}

/**
 * Add resume parsing job to queue
 */
export async function queueResumeParsing(data: ResumeParsingJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.RESUME_PARSING);
  
  return queue.add('parse-resume', data, {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    // timeout: 60000, // 1 minute timeout
    removeOnComplete: 50,
    removeOnFail: 200,
  });
}

/**
 * Webhook job data
 */
interface WebhookJobData {
  url: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  secret?: string;
}

/**
 * Add webhook delivery job to queue
 */
export async function queueWebhook(data: WebhookJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.WEBHOOKS);
  
  return queue.add('deliver-webhook', data, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

/**
 * Schedule a job for future execution
 */
export async function scheduleJob<T>(
  name: string,
  data: T,
  runAt: Date,
  options?: {
    repeat?: {
      cron?: string;
      every?: number;
      limit?: number;
    };
  }
): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.SCHEDULED);
  const delay = runAt.getTime() - Date.now();
  
  return queue.add(name, data, {
    delay: delay > 0 ? delay : 0,
    repeat: options?.repeat,
    removeOnComplete: 50,
    removeOnFail: 100,
  });
}

/**
 * Get job status
 */
export async function getJobStatus(queueName: QueueName, jobId: string): Promise<{
  status: string;
  progress: number;
  result?: unknown;
  failedReason?: string;
} | null> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  
  if (!job) return null;
  
  const state = await job.getState();
  
  return {
    status: state,
    progress: job.progress as number,
    result: job.returnvalue,
    failedReason: job.failedReason,
  };
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: QueueName): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(queueName);
  
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  
  return { waiting, active, completed, failed, delayed };
}

/**
 * Retry failed jobs
 */
export async function retryFailedJobs(queueName: QueueName): Promise<number> {
  const queue = getQueue(queueName);
  const failed = await queue.getFailed();
  
  let retried = 0;
  for (const job of failed) {
    await job.retry();
    retried++;
  }
  
  return retried;
}

/**
 * Clean old jobs
 */
export async function cleanQueue(queueName: QueueName, options?: {
  grace?: number;
  limit?: number;
  status?: 'completed' | 'failed';
}): Promise<string[]> {
  const queue = getQueue(queueName);
  
  return queue.clean(
    options?.grace ?? 24 * 60 * 60 * 1000, // 24 hours default
    options?.limit ?? 1000,
    options?.status ?? 'completed'
  );
}

/**
 * Pause a queue
 */
export async function pauseQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
}

/**
 * Resume a queue
 */
export async function resumeQueue(queueName: QueueName): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
}

/**
 * Close all queues (for graceful shutdown)
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map(q => q.close());
  await Promise.all(closePromises);
  queues.clear();
}

export default {
  QUEUE_NAMES,
  getQueue,
  queueEmail,
  queueNotification,
  queueResumeParsing,
  queueWebhook,
  scheduleJob,
  getJobStatus,
  getQueueStats,
  retryFailedJobs,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  closeAllQueues,
};

export {};
