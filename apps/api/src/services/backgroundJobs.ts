/**
 * Background Jobs Service (Queue System)
 * 
 * Handles:
 * - Job queuing with priorities
 * - Scheduled/delayed jobs
 * - Retry with exponential backoff
 * - Concurrency control
 * - Job status tracking
 * - Dead letter queue
 */

import { logger } from '../lib/logger';
import { redisCache } from '../lib/redisCacheWrapper';

// Types
export interface Job<T = unknown> {
  id: string;
  queue: string;
  name: string;
  data: T;
  options: JobOptions;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  progress: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  scheduledFor?: Date;
  processingTime?: number;
}

export interface JobOptions {
  priority?: number; // 1 (highest) to 10 (lowest), default 5
  delay?: number; // Delay in milliseconds
  attempts?: number; // Max retry attempts, default 3
  backoff?: BackoffStrategy;
  timeout?: number; // Job timeout in milliseconds
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface BackoffStrategy {
  type: 'fixed' | 'exponential';
  delay: number; // Base delay in ms
  maxDelay?: number; // Maximum delay for exponential
}

export type JobStatus = 
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused';

export type JobProcessor<T = unknown, R = unknown> = (
  job: Job<T>,
  progress: (percent: number) => void
) => Promise<R>;

interface QueueConfig {
  name: string;
  concurrency: number;
  processor?: JobProcessor;
  isPaused: boolean;
}

// Job processors registry
const jobProcessors: Map<string, Map<string, JobProcessor>> = new Map();
const queueConfigs: Map<string, QueueConfig> = new Map();
const activeJobs: Map<string, Set<string>> = new Map();

class BackgroundJobsService {
  private static instance: BackgroundJobsService;
  private isProcessing: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private readonly POLL_INTERVAL_MS = 1000;

  private constructor() {}

  static getInstance(): BackgroundJobsService {
    if (!BackgroundJobsService.instance) {
      BackgroundJobsService.instance = new BackgroundJobsService();
    }
    return BackgroundJobsService.instance;
  }

  // ==================== Queue Management ====================

  /**
   * Create or get a queue
   */
  createQueue(name: string, concurrency: number = 5): void {
    if (!queueConfigs.has(name)) {
      queueConfigs.set(name, {
        name,
        concurrency,
        isPaused: false,
      });
      activeJobs.set(name, new Set());
      jobProcessors.set(name, new Map());
      logger.info('Queue created', { queue: name, concurrency });
    }
  }

  /**
   * Register a job processor for a queue
   */
  registerProcessor<T = unknown, R = unknown>(
    queue: string,
    jobName: string,
    processor: JobProcessor<T, R>
  ): void {
    this.createQueue(queue);
    const processors = jobProcessors.get(queue)!;
    processors.set(jobName, processor as JobProcessor);
    logger.info('Processor registered', { queue, jobName });
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queue: string): Promise<void> {
    const config = queueConfigs.get(queue);
    if (config) {
      config.isPaused = true;
      logger.info('Queue paused', { queue });
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queue: string): Promise<void> {
    const config = queueConfigs.get(queue);
    if (config) {
      config.isPaused = false;
      logger.info('Queue resumed', { queue });
    }
  }

  // ==================== Job Operations ====================

  /**
   * Add a job to the queue
   */
  async addJob<T = unknown>(
    queue: string,
    name: string,
    data: T,
    options: JobOptions = {}
  ): Promise<Job<T>> {
    this.createQueue(queue);

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const job: Job<T> = {
      id: jobId,
      queue,
      name,
      data,
      options: {
        priority: options.priority ?? 5,
        attempts: options.attempts ?? 3,
        backoff: options.backoff ?? { type: 'exponential', delay: 1000 },
        timeout: options.timeout ?? 30000,
        removeOnComplete: options.removeOnComplete ?? true,
        removeOnFail: options.removeOnFail ?? false,
        ...options,
      },
      status: options.delay ? 'delayed' : 'waiting',
      attempts: 0,
      maxAttempts: options.attempts ?? 3,
      progress: 0,
      createdAt: now,
      scheduledFor: options.delay
        ? new Date(now.getTime() + options.delay)
        : undefined,
    };

    // Store job
    await redisCache.set(`job:${jobId}`, job, 86400 * 7); // 7 days TTL

    // Add to appropriate queue
    if (job.status === 'delayed') {
      await redisCache.zadd(
        `queue:${queue}:delayed`,
        job.scheduledFor!.getTime(),
        jobId
      );
    } else {
      // Priority queue (lower score = higher priority)
      await redisCache.zadd(
        `queue:${queue}:waiting`,
        job.options.priority!,
        jobId
      );
    }

    logger.info('Job added', { jobId, queue, name, status: job.status });

    return job;
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulk<T = unknown>(
    queue: string,
    jobs: Array<{ name: string; data: T; options?: JobOptions }>
  ): Promise<Job<T>[]> {
    const results: Job<T>[] = [];
    for (const job of jobs) {
      const added = await this.addJob(queue, job.name, job.data, job.options);
      results.push(added);
    }
    return results;
  }

  /**
   * Get job by ID
   */
  async getJob<T = unknown>(jobId: string): Promise<Job<T> | null> {
    return redisCache.get<Job<T>>(`job:${jobId}`);
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
      await redisCache.set(`job:${jobId}`, job, 86400 * 7);
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job || job.status !== 'failed') {
      return false;
    }

    job.status = 'waiting';
    job.attempts = 0;
    job.error = undefined;
    job.failedAt = undefined;

    await redisCache.set(`job:${jobId}`, job, 86400 * 7);
    await redisCache.zadd(
      `queue:${job.queue}:waiting`,
      job.options.priority!,
      jobId
    );

    logger.info('Job retried', { jobId });
    return true;
  }

  /**
   * Remove a job
   */
  async removeJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) {
      return false;
    }

    await redisCache.delete(`job:${jobId}`);
    await redisCache.zrem(`queue:${job.queue}:waiting`, jobId);
    await redisCache.zrem(`queue:${job.queue}:delayed`, jobId);
    await redisCache.zrem(`queue:${job.queue}:failed`, jobId);

    logger.info('Job removed', { jobId });
    return true;
  }

  // ==================== Processing ====================

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.pollInterval = setInterval(() => {
      this.processQueues().catch(err => {
        logger.error('Queue processing error', { error: err });
      });
    }, this.POLL_INTERVAL_MS);

    logger.info('Background job processor started');
  }

  /**
   * Stop processing jobs
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isProcessing = false;
    logger.info('Background job processor stopped');
  }

  /**
   * Process all queues
   */
  private async processQueues(): Promise<void> {
    // Move delayed jobs to waiting
    await this.promoteDelayedJobs();

    // Process each queue
    for (const [queueName, config] of queueConfigs) {
      if (config.isPaused) continue;

      const activeCount = activeJobs.get(queueName)?.size || 0;
      const availableSlots = config.concurrency - activeCount;

      if (availableSlots > 0) {
        await this.processQueue(queueName, availableSlots);
      }
    }
  }

  /**
   * Move delayed jobs to waiting queue when ready
   */
  private async promoteDelayedJobs(): Promise<void> {
    const now = Date.now();

    for (const [queueName] of queueConfigs) {
      const readyJobIds = await redisCache.zrangebyscore(
        `queue:${queueName}:delayed`,
        0,
        now
      );

      if (!readyJobIds || readyJobIds.length === 0) continue;

      for (const jobId of readyJobIds) {
        const job = await this.getJob(jobId);
        if (job) {
          job.status = 'waiting';
          job.scheduledFor = undefined;
          await redisCache.set(`job:${jobId}`, job, 86400 * 7);
          await redisCache.zrem(`queue:${queueName}:delayed`, jobId);
          await redisCache.zadd(
            `queue:${queueName}:waiting`,
            job.options.priority!,
            jobId
          );
        }
      }
    }
  }

  /**
   * Process jobs from a specific queue
   */
  private async processQueue(queueName: string, limit: number): Promise<void> {
    // Get waiting jobs (sorted by priority)
    const jobIds = await redisCache.zrange(`queue:${queueName}:waiting`, 0, limit - 1);
    
    if (!jobIds || jobIds.length === 0) return;

    const processors = jobProcessors.get(queueName);
    if (!processors) return;

    for (const jobId of jobIds) {
      const job = await this.getJob(jobId);
      if (!job) continue;

      const processor = processors.get(job.name);
      if (!processor) {
        logger.warn('No processor for job', { queue: queueName, jobName: job.name });
        continue;
      }

      // Remove from waiting
      await redisCache.zrem(`queue:${queueName}:waiting`, jobId);

      // Track active job
      activeJobs.get(queueName)!.add(jobId);

      // Process in background
      this.executeJob(job, processor).catch(err => {
        logger.error('Job execution error', { jobId, error: err });
      });
    }
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: Job, processor: JobProcessor): Promise<void> {
    const startTime = Date.now();

    try {
      // Update job status
      job.status = 'active';
      job.attempts++;
      job.startedAt = new Date();
      await redisCache.set(`job:${job.id}`, job, 86400 * 7);

      logger.info('Job started', {
        jobId: job.id,
        name: job.name,
        attempt: job.attempts,
      });

      // Create progress callback
      const progressCallback = (percent: number) => {
        this.updateProgress(job.id, percent).catch(() => {});
      };

      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.options.timeout);
      });

      const result = await Promise.race([
        processor(job, progressCallback),
        timeoutPromise,
      ]);

      // Job completed successfully
      job.status = 'completed';
      job.result = result;
      job.progress = 100;
      job.completedAt = new Date();
      job.processingTime = Date.now() - startTime;

      logger.info('Job completed', {
        jobId: job.id,
        name: job.name,
        processingTime: job.processingTime,
      });

      // Clean up or keep based on options
      if (job.options.removeOnComplete) {
        await this.removeJob(job.id);
      } else {
        await redisCache.set(`job:${job.id}`, job, 86400 * 7);
      }

    } catch (error) {
      const errorMessage = (error as Error).message;
      job.error = errorMessage;
      job.processingTime = Date.now() - startTime;

      logger.error('Job failed', {
        jobId: job.id,
        name: job.name,
        attempt: job.attempts,
        error: errorMessage,
      });

      // Check if should retry
      if (job.attempts < job.maxAttempts) {
        // Calculate backoff delay
        const backoffDelay = this.calculateBackoff(job.attempts, job.options.backoff!);
        
        job.status = 'delayed';
        job.scheduledFor = new Date(Date.now() + backoffDelay);
        
        await redisCache.set(`job:${job.id}`, job, 86400 * 7);
        await redisCache.zadd(
          `queue:${job.queue}:delayed`,
          job.scheduledFor.getTime(),
          job.id
        );

        logger.info('Job scheduled for retry', {
          jobId: job.id,
          attempt: job.attempts,
          retryIn: backoffDelay,
        });

      } else {
        // Move to failed/dead letter queue
        job.status = 'failed';
        job.failedAt = new Date();

        if (job.options.removeOnFail) {
          await this.removeJob(job.id);
        } else {
          await redisCache.set(`job:${job.id}`, job, 86400 * 7);
          await redisCache.zadd(
            `queue:${job.queue}:failed`,
            Date.now(),
            job.id
          );
        }
      }
    } finally {
      // Remove from active jobs
      activeJobs.get(job.queue)?.delete(job.id);
    }
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoff(attempt: number, backoff: BackoffStrategy): number {
    if (backoff.type === 'fixed') {
      return backoff.delay;
    }

    // Exponential backoff: delay * 2^(attempt-1)
    const delay = backoff.delay * Math.pow(2, attempt - 1);
    return backoff.maxDelay ? Math.min(delay, backoff.maxDelay) : delay;
  }

  // ==================== Queue Stats ====================

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  }> {
    const waiting = await redisCache.zcard(`queue:${queueName}:waiting`) || 0;
    const delayed = await redisCache.zcard(`queue:${queueName}:delayed`) || 0;
    const failed = await redisCache.zcard(`queue:${queueName}:failed`) || 0;
    const active = activeJobs.get(queueName)?.size || 0;
    const completed = (await redisCache.get<number>(`queue:${queueName}:completed:count`)) || 0;

    return { waiting, active, delayed, failed, completed };
  }

  /**
   * Get all queue stats
   */
  async getAllStats(): Promise<Record<string, {
    waiting: number;
    active: number;
    delayed: number;
    failed: number;
    completed: number;
  }>> {
    const stats: Record<string, {
      waiting: number;
      active: number;
      delayed: number;
      failed: number;
      completed: number;
    }> = {};

    for (const queueName of queueConfigs.keys()) {
      stats[queueName] = await this.getQueueStats(queueName);
    }

    return stats;
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(queue: string, limit: number = 50): Promise<Job[]> {
    const jobIds = await redisCache.zrevrange(`queue:${queue}:failed`, 0, limit - 1);
    if (!jobIds || jobIds.length === 0) return [];

    const jobs: Job[] = [];
    for (const jobId of jobIds) {
      const job = await this.getJob(jobId);
      if (job) jobs.push(job);
    }

    return jobs;
  }

  /**
   * Clear failed jobs
   */
  async clearFailed(queue: string): Promise<number> {
    const jobIds = await redisCache.zrange(`queue:${queue}:failed`, 0, -1);
    if (!jobIds || jobIds.length === 0) return 0;

    for (const jobId of jobIds) {
      await redisCache.delete(`job:${jobId}`);
    }
    await redisCache.delete(`queue:${queue}:failed`);

    logger.info('Failed jobs cleared', { queue, count: jobIds.length });
    return jobIds.length;
  }

  /**
   * Drain queue (remove all waiting jobs)
   */
  async drain(queue: string): Promise<number> {
    const waiting = await redisCache.zrange(`queue:${queue}:waiting`, 0, -1) || [];
    const delayed = await redisCache.zrange(`queue:${queue}:delayed`, 0, -1) || [];
    const allJobs = [...waiting, ...delayed];

    for (const jobId of allJobs) {
      await redisCache.delete(`job:${jobId}`);
    }
    await redisCache.delete(`queue:${queue}:waiting`);
    await redisCache.delete(`queue:${queue}:delayed`);

    logger.info('Queue drained', { queue, count: allJobs.length });
    return allJobs.length;
  }
}

// Pre-defined job types
export const JobTypes = {
  // Email jobs
  SEND_EMAIL: 'send_email',
  SEND_BULK_EMAIL: 'send_bulk_email',
  SEND_WEEKLY_DIGEST: 'send_weekly_digest',
  
  // Notification jobs
  SEND_PUSH_NOTIFICATION: 'send_push_notification',
  SEND_BULK_NOTIFICATION: 'send_bulk_notification',
  
  // Content processing
  PROCESS_VIDEO: 'process_video',
  GENERATE_THUMBNAILS: 'generate_thumbnails',
  MODERATE_CONTENT: 'moderate_content',
  
  // Analytics
  AGGREGATE_ANALYTICS: 'aggregate_analytics',
  GENERATE_REPORT: 'generate_report',
  
  // Matching
  COMPUTE_JOB_MATCHES: 'compute_job_matches',
  COMPUTE_MENTOR_MATCHES: 'compute_mentor_matches',
  UPDATE_FEED_RANKINGS: 'update_feed_rankings',
  
  // Data maintenance
  CLEANUP_EXPIRED_TOKENS: 'cleanup_expired_tokens',
  ARCHIVE_OLD_MESSAGES: 'archive_old_messages',
  BACKUP_DATABASE: 'backup_database',
  
  // User engagement
  SEND_PROFILE_REMINDER: 'send_profile_reminder',
  SEND_SESSION_REMINDER: 'send_session_reminder',
  SEND_INACTIVE_USER_EMAIL: 'send_inactive_user_email',
} as const;

// Queue names
export const Queues = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  CONTENT: 'content',
  ANALYTICS: 'analytics',
  MATCHING: 'matching',
  MAINTENANCE: 'maintenance',
  ENGAGEMENT: 'engagement',
} as const;

// Export singleton
export const backgroundJobs = BackgroundJobsService.getInstance();

// Initialize default queues
backgroundJobs.createQueue(Queues.EMAIL, 10);
backgroundJobs.createQueue(Queues.NOTIFICATIONS, 20);
backgroundJobs.createQueue(Queues.CONTENT, 3);
backgroundJobs.createQueue(Queues.ANALYTICS, 2);
backgroundJobs.createQueue(Queues.MATCHING, 5);
backgroundJobs.createQueue(Queues.MAINTENANCE, 1);
backgroundJobs.createQueue(Queues.ENGAGEMENT, 5);

