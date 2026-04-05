// @ts-nocheck
/**
 * Horizontal Scaling Configuration
 * Load balancing, connection pooling, and auto-scaling
 */

import os from 'os';
import cluster from 'cluster';
import logger from './logger';

// Scaling configuration
const SCALING_CONFIG = {
  // Worker configuration
  minWorkers: parseInt(process.env.MIN_WORKERS || '1'),
  maxWorkers: parseInt(process.env.MAX_WORKERS || os.cpus().length.toString()),
  
  // Auto-scaling thresholds
  scaleUpCpuThreshold: 80,  // Scale up when CPU > 80%
  scaleDownCpuThreshold: 30, // Scale down when CPU < 30%
  scaleUpMemoryThreshold: 85, // Scale up when memory > 85%
  scaleDownMemoryThreshold: 40, // Scale down when memory < 40%
  
  // Scaling cooldown
  cooldownMs: 60000,  // 1 minute between scaling operations
  
  // Health check
  healthCheckIntervalMs: 30000, // 30 seconds
  maxUnhealthyWorkers: 2,
};

// Connection pooling configuration
export const CONNECTION_POOL_CONFIG = {
  // Database connection pool
  database: {
    min: parseInt(process.env.DB_POOL_MIN || '2'),
    max: parseInt(process.env.DB_POOL_MAX || '10'),
    acquireTimeoutMs: 10000,
    idleTimeoutMs: 30000,
    reapIntervalMs: 1000,
  },
  
  // Redis connection pool
  redis: {
    minConnections: 2,
    maxConnections: 10,
    idleTimeoutMs: 30000,
  },
};

// Session configuration for stateless scaling
export const SESSION_CONFIG = {
  // Use Redis for session storage
  store: process.env.REDIS_URL ? 'redis' : 'memory',
  
  // Session settings
  secret: process.env.SESSION_SECRET || 'ngurra-secret-change-in-production',
  name: 'ngurra.sid',
  resave: false,
  saveUninitialized: false,
  
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict',
  },
};

/**
 * Worker state tracking
 */
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.lastScaleTime = 0;
    this.metrics = {
      cpuUsage: 0,
      memoryUsage: 0,
      activeWorkers: 0,
      requestsPerSecond: 0,
    };
  }

  /**
   * Initialize cluster if primary
   */
  initialize(workerScript) {
    if (cluster.isPrimary) {
      logger.info('Primary process started', { pid: process.pid });
      
      // Fork initial workers
      const numWorkers = Math.min(SCALING_CONFIG.maxWorkers, os.cpus().length);
      for (let i = 0; i < numWorkers; i++) {
        this.spawnWorker();
      }

      // Handle worker events
      cluster.on('exit', (worker, code, signal) => {
        logger.warn('Worker died', { 
          pid: worker.process.pid, 
          code, 
          signal,
        });
        this.workers.delete(worker.id);
        
        // Respawn worker if unexpected exit
        if (code !== 0) {
          setTimeout(() => this.spawnWorker(), 1000);
        }
      });

      cluster.on('message', (worker, message) => {
        this.handleWorkerMessage(worker, message);
      });

      // Start auto-scaling loop
      this.startAutoScaling();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      return true; // Is primary
    }
    
    return false; // Is worker
  }

  /**
   * Spawn a new worker
   */
  spawnWorker() {
    const worker = cluster.fork();
    this.workers.set(worker.id, {
      worker,
      startedAt: Date.now(),
      requests: 0,
      healthy: true,
    });
    
    logger.info('Worker spawned', { 
      workerId: worker.id, 
      pid: worker.process.pid,
      totalWorkers: this.workers.size,
    });
    
    return worker;
  }

  /**
   * Gracefully shutdown a worker
   */
  async shutdownWorker(workerId) {
    const workerInfo = this.workers.get(workerId);
    if (!workerInfo) return;

    const { worker } = workerInfo;
    
    // Send shutdown signal
    worker.send({ type: 'shutdown' });
    
    // Wait for graceful shutdown
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        worker.kill('SIGTERM');
        resolve();
      }, 30000);

      worker.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.workers.delete(workerId);
  }

  /**
   * Handle messages from workers
   */
  handleWorkerMessage(worker, message) {
    if (!message || !message.type) return;

    switch (message.type) {
      case 'metrics':
        this.updateWorkerMetrics(worker.id, message.data);
        break;
      case 'ready':
        logger.info('Worker ready', { workerId: worker.id });
        break;
      case 'error':
        logger.error('Worker error', { 
          workerId: worker.id, 
          error: message.error,
        });
        break;
    }
  }

  /**
   * Update metrics for a worker
   */
  updateWorkerMetrics(workerId, metrics) {
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.metrics = metrics;
      workerInfo.lastUpdate = Date.now();
    }
  }

  /**
   * Start auto-scaling loop
   */
  startAutoScaling() {
    setInterval(() => {
      this.evaluateScaling();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Evaluate if scaling is needed
   */
  async evaluateScaling() {
    const now = Date.now();
    
    // Respect cooldown
    if (now - this.lastScaleTime < SCALING_CONFIG.cooldownMs) {
      return;
    }

    // Collect metrics
    const cpuUsage = await this.getCpuUsage();
    const memoryUsage = this.getMemoryUsage();
    const activeWorkers = this.workers.size;

    this.metrics = { cpuUsage, memoryUsage, activeWorkers };

    // Scale up conditions
    if (
      (cpuUsage > SCALING_CONFIG.scaleUpCpuThreshold ||
        memoryUsage > SCALING_CONFIG.scaleUpMemoryThreshold) &&
      activeWorkers < SCALING_CONFIG.maxWorkers
    ) {
      this.scaleUp();
      this.lastScaleTime = now;
    }

    // Scale down conditions
    if (
      cpuUsage < SCALING_CONFIG.scaleDownCpuThreshold &&
      memoryUsage < SCALING_CONFIG.scaleDownMemoryThreshold &&
      activeWorkers > SCALING_CONFIG.minWorkers
    ) {
      this.scaleDown();
      this.lastScaleTime = now;
    }
  }

  /**
   * Scale up by adding a worker
   */
  scaleUp() {
    if (this.workers.size >= SCALING_CONFIG.maxWorkers) {
      return;
    }

    logger.info('Scaling up', {
      currentWorkers: this.workers.size,
      metrics: this.metrics,
    });

    this.spawnWorker();
  }

  /**
   * Scale down by removing a worker
   */
  async scaleDown() {
    if (this.workers.size <= SCALING_CONFIG.minWorkers) {
      return;
    }

    // Find oldest worker with least activity
    let targetWorkerId = null;
    let minRequests = Infinity;

    for (const [id, info] of this.workers) {
      if (info.requests < minRequests) {
        minRequests = info.requests;
        targetWorkerId = id;
      }
    }

    if (targetWorkerId) {
      logger.info('Scaling down', {
        workerId: targetWorkerId,
        currentWorkers: this.workers.size,
        metrics: this.metrics,
      });

      await this.shutdownWorker(targetWorkerId);
    }
  }

  /**
   * Get CPU usage percentage
   */
  async getCpuUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const elapedUsage = process.cpuUsage(startUsage);
        const elapedTime = process.hrtime(startTime);
        const elapedMs = elapedTime[0] * 1000 + elapedTime[1] / 1e6;
        
        const cpuPercent = 
          (100 * (elapedUsage.user + elapedUsage.system)) / 
          (elapedMs * 1000);
        
        resolve(Math.min(100, cpuPercent));
      }, 100);
    });
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    return ((totalMem - freeMem) / totalMem) * 100;
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    setInterval(() => {
      this.checkWorkersHealth();
    }, SCALING_CONFIG.healthCheckIntervalMs);
  }

  /**
   * Check health of all workers
   */
  checkWorkersHealth() {
    const now = Date.now();
    let unhealthyCount = 0;

    for (const [id, info] of this.workers) {
      // Worker is unhealthy if no update in 2x health check interval
      if (
        info.lastUpdate &&
        now - info.lastUpdate > SCALING_CONFIG.healthCheckIntervalMs * 2
      ) {
        info.healthy = false;
        unhealthyCount++;

        logger.warn('Unhealthy worker detected', { workerId: id });
      }
    }

    // Replace unhealthy workers
    if (unhealthyCount > 0 && unhealthyCount <= SCALING_CONFIG.maxUnhealthyWorkers) {
      for (const [id, info] of this.workers) {
        if (!info.healthy) {
          this.replaceWorker(id);
        }
      }
    }
  }

  /**
   * Replace an unhealthy worker
   */
  async replaceWorker(workerId) {
    logger.info('Replacing unhealthy worker', { workerId });
    
    await this.shutdownWorker(workerId);
    this.spawnWorker();
  }

  /**
   * Get cluster status
   */
  getStatus() {
    return {
      isPrimary: cluster.isPrimary,
      workers: Array.from(this.workers.entries()).map(([id, info]) => ({
        id,
        pid: info.worker.process.pid,
        healthy: info.healthy,
        uptime: Date.now() - info.startedAt,
        requests: info.requests,
      })),
      metrics: this.metrics,
      config: SCALING_CONFIG,
    };
  }
}

// Export singleton
export const workerManager = new WorkerManager();

/**
 * Load balancer health endpoint
 */
export function loadBalancerHealth() {
  return {
    status: 'healthy',
    instance: process.env.INSTANCE_ID || process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };
}

/**
 * Sticky session middleware (if needed)
 */
export function stickySession(options = {}) {
  return (req, res, next) => {
    // Use user ID or session ID for sticky routing
    const stickyCookie = req.cookies?.['ngurra.sticky'];
    
    if (!stickyCookie && req.user?.id) {
      // Set sticky cookie based on user ID
      const workerIndex = req.user.id.charCodeAt(0) % (options.numWorkers || 4);
      res.cookie('ngurra.sticky', workerIndex.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000, // 1 hour
      });
    }
    
    next();
  };
}

export default {
  SCALING_CONFIG,
  CONNECTION_POOL_CONFIG,
  SESSION_CONFIG,
  workerManager,
  loadBalancerHealth,
  stickySession,
};

export {};

