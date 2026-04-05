// @ts-nocheck
/**
 * Background Job Queue
 * 
 * Simple in-memory job queue with support for:
 * - Delayed jobs
 * - Retries with exponential backoff
 * - Job priorities
 * - Concurrent execution limits
 */

const { EventEmitter } = require('events');

/**
 * Job states
 */
const JobState = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRY: 'retry',
};

/**
 * Job priorities
 */
const Priority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 20,
};

/**
 * Job class
 */
class Job {
  constructor(type, data, options = {}) {
    this.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.data = data;
    this.state = JobState.PENDING;
    this.priority = options.priority || Priority.NORMAL;
    this.attempts = 0;
    this.maxAttempts = options.maxAttempts || 3;
    this.delay = options.delay || 0;
    this.timeout = options.timeout || 30000;
    this.createdAt = new Date();
    this.scheduledAt = options.delay 
      ? new Date(Date.now() + options.delay) 
      : new Date();
    this.startedAt = null;
    this.completedAt = null;
    this.error = null;
    this.result = null;
    this.progress = 0;
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      state: this.state,
      priority: this.priority,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts,
      progress: this.progress,
      createdAt: this.createdAt,
      scheduledAt: this.scheduledAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      error: this.error,
    };
  }
}

/**
 * Job Queue
 */
class JobQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'default';
    this.concurrency = options.concurrency || 5;
    this.jobs = new Map();
    this.handlers = new Map();
    this.running = 0;
    this.paused = false;
    this.stats = {
      processed: 0,
      failed: 0,
      completed: 0,
    };

    // Start processing
    this.processInterval = setInterval(() => this.tick(), 100);
  }

  /**
   * Register a job handler
   */
  process(type, handler) {
    this.handlers.set(type, handler);
    return this;
  }

  /**
   * Add a job to the queue
   */
  add(type, data, options = {}) {
    const job = new Job(type, data, options);
    this.jobs.set(job.id, job);
    this.emit('job:added', job);
    return job;
  }

  /**
   * Get a job by ID
   */
  getJob(id) {
    return this.jobs.get(id);
  }

  /**
   * Get all jobs
   */
  getJobs(state = null) {
    const jobs = Array.from(this.jobs.values());
    if (state) {
      return jobs.filter(j => j.state === state);
    }
    return jobs;
  }

  /**
   * Process pending jobs
   */
  async tick() {
    if (this.paused || this.running >= this.concurrency) {
      return;
    }

    // Get pending jobs that are ready to run
    const now = new Date();
    const pending = Array.from(this.jobs.values())
      .filter(j => j.state === JobState.PENDING && j.scheduledAt <= now)
      .sort((a, b) => {
        // Sort by priority (high first), then by scheduled time
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.scheduledAt - b.scheduledAt;
      });

    // Process jobs up to concurrency limit
    for (const job of pending) {
      if (this.running >= this.concurrency) break;
      this.runJob(job);
    }
  }

  /**
   * Run a single job
   */
  async runJob(job) {
    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.state = JobState.FAILED;
      job.error = `No handler registered for job type: ${job.type}`;
      this.emit('job:failed', job);
      return;
    }

    job.state = JobState.RUNNING;
    job.startedAt = new Date();
    job.attempts++;
    this.running++;
    this.emit('job:started', job);

    // Create context for job
    const context = {
      job,
      progress: (percent) => {
        job.progress = Math.min(100, Math.max(0, percent));
        this.emit('job:progress', job);
      },
    };

    // Set timeout
    const timeoutId = setTimeout(() => {
      if (job.state === JobState.RUNNING) {
        job.state = JobState.FAILED;
        job.error = 'Job timed out';
        this.running--;
        this.handleFailure(job);
      }
    }, job.timeout);

    try {
      const result = await handler(job.data, context);
      clearTimeout(timeoutId);
      
      if (job.state === JobState.RUNNING) {
        job.state = JobState.COMPLETED;
        job.result = result;
        job.completedAt = new Date();
        job.progress = 100;
        this.running--;
        this.stats.completed++;
        this.stats.processed++;
        this.emit('job:completed', job);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      job.error = error.message;
      this.running--;
      this.handleFailure(job);
    }
  }

  /**
   * Handle job failure
   */
  handleFailure(job) {
    if (job.attempts < job.maxAttempts) {
      // Retry with exponential backoff
      const backoff = Math.pow(2, job.attempts) * 1000;
      job.state = JobState.PENDING;
      job.scheduledAt = new Date(Date.now() + backoff);
      this.emit('job:retry', job);
    } else {
      job.state = JobState.FAILED;
      job.completedAt = new Date();
      this.stats.failed++;
      this.stats.processed++;
      this.emit('job:failed', job);
    }
  }

  /**
   * Retry a failed job
   */
  retry(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.state === JobState.FAILED) {
      job.state = JobState.PENDING;
      job.attempts = 0;
      job.error = null;
      job.scheduledAt = new Date();
      this.emit('job:added', job);
      return true;
    }
    return false;
  }

  /**
   * Remove a job
   */
  remove(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.delete(jobId);
      this.emit('job:removed', job);
      return true;
    }
    return false;
  }

  /**
   * Pause the queue
   */
  pause() {
    this.paused = true;
    this.emit('queue:paused');
  }

  /**
   * Resume the queue
   */
  resume() {
    this.paused = false;
    this.emit('queue:resumed');
  }

  /**
   * Clear all jobs
   */
  clear(state = null) {
    if (state) {
      for (const [id, job] of this.jobs) {
        if (job.state === state) {
          this.jobs.delete(id);
        }
      }
    } else {
      this.jobs.clear();
    }
  }

  /**
   * Get queue statistics
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      ...this.stats,
      pending: jobs.filter(j => j.state === JobState.PENDING).length,
      running: this.running,
      completed: jobs.filter(j => j.state === JobState.COMPLETED).length,
      failed: jobs.filter(j => j.state === JobState.FAILED).length,
      total: jobs.length,
    };
  }

  /**
   * Shutdown the queue
   */
  async shutdown(timeout = 5000) {
    this.paused = true;
    clearInterval(this.processInterval);

    // Wait for running jobs to complete
    const start = Date.now();
    while (this.running > 0 && Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, 100));
    }

    this.emit('queue:shutdown');
  }
}

/**
 * Create queue manager for multiple queues
 */
class QueueManager {
  constructor() {
    this.queues = new Map();
  }

  createQueue(name, options = {}) {
    const queue = new JobQueue({ name, ...options });
    this.queues.set(name, queue);
    return queue;
  }

  getQueue(name) {
    return this.queues.get(name);
  }

  getAllStats() {
    const stats = {};
    for (const [name, queue] of this.queues) {
      stats[name] = queue.getStats();
    }
    return stats;
  }

  async shutdownAll(timeout = 5000) {
    await Promise.all(
      Array.from(this.queues.values()).map(q => q.shutdown(timeout))
    );
  }
}

// Singleton queue manager
const queueManager = new QueueManager();

// Default queues
const defaultQueue = queueManager.createQueue('default');
const emailQueue = queueManager.createQueue('email', { concurrency: 3 });
const notificationQueue = queueManager.createQueue('notification', { concurrency: 10 });
const exportQueue = queueManager.createQueue('export', { concurrency: 2 });
