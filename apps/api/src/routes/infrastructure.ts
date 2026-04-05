// @ts-nocheck
/**
 * Infrastructure Admin Routes
 * 
 * API endpoints for infrastructure monitoring and management.
 * Restricted to admin users only.
 */

import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import logger from '../lib/logger';
import * as cache from '../lib/redisCache';
import * as bullmq from '../lib/bullmqQueue';
import * as monitoring from '../lib/monitoring';
import * as cdn from '../lib/cdn';
import * as backup from '../lib/backup';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;

const router = express.Router();

// All routes require admin role
router.use(authenticate);
router.use(authorize(['admin']));

// ==========================================
// Health & Status
// ==========================================

/**
 * GET /admin/infrastructure/health
 * Comprehensive health check
 */
router.get('/health', async (req, res) => {
  try {
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      components: {} as any,
    };

    // Database health
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.components.database = { status: 'healthy' };
    } catch (error) {
      health.components.database = { status: 'unhealthy', error: error.message };
      health.status = 'degraded';
    }

    // Redis/Cache health
    // @ts-ignore
    const cacheStats = await cache.stats();
    health.components.cache = {
      // @ts-ignore
      status: cacheStats.type === 'redis' ? 'healthy' : 'fallback',
      // @ts-ignore
      type: cacheStats.type,
    };

    // Queue health
    const queueHealth = await bullmq.healthCheck();
    health.components.queue = {
      status: queueHealth.healthy ? 'healthy' : 'unhealthy',
      error: queueHealth.error,
    };

    // CDN status
    health.components.cdn = cdn.getCDNStatus();

    // Monitoring status
    health.components.monitoring = monitoring.getHealthData();

    // Memory usage
    const memUsage = process.memoryUsage();
    health.system = {
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
      nodeVersion: process.version,
      platform: process.platform,
    };

    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// ==========================================
// Cache Management
// ==========================================

/**
 * GET /admin/infrastructure/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req, res) => {
  try {
    // @ts-ignore
    const stats = await cache.stats();
    res.json(stats);
  } catch (error) {
    logger.error('Cache stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

/**
 * POST /admin/infrastructure/cache/flush
 * Flush all cache
 */
router.post('/cache/flush', async (req, res) => {
  try {
    await cache.flush();
    logger.info('Cache flushed by admin', { userId: req.user.id });
    res.json({ message: 'Cache flushed successfully' });
  } catch (error) {
    logger.error('Cache flush error', { error: error.message });
    res.status(500).json({ error: 'Failed to flush cache' });
  }
});

/**
 * DELETE /admin/infrastructure/cache/pattern/:pattern
 * Delete cache keys matching pattern
 */
router.delete('/cache/pattern/:pattern', async (req, res) => {
  try {
    const { pattern } = req.params;
    await cache.delPattern(pattern);
    logger.info('Cache pattern deleted', { pattern, userId: req.user.id });
    res.json({ message: `Deleted keys matching: ${pattern}` });
  } catch (error) {
    logger.error('Cache delete pattern error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete cache pattern' });
  }
});

// ==========================================
// Queue Management
// ==========================================

/**
 * GET /admin/infrastructure/queues/stats
 * Get all queue statistics
 */
router.get('/queues/stats', async (req, res) => {
  try {
    const stats = await bullmq.getQueueStats();
    res.json(stats);
  } catch (error) {
    logger.error('Queue stats error', { error: error.message });
    res.status(500).json({ error: 'Failed to get queue stats' });
  }
});

/**
 * GET /admin/infrastructure/queues/health
 * Queue health check
 */
router.get('/queues/health', async (req, res) => {
  try {
    const health = await bullmq.healthCheck();
    res.json(health);
  } catch (error) {
    logger.error('Queue health error', { error: error.message });
    res.status(500).json({ error: 'Failed to check queue health' });
  }
});

// ==========================================
// CDN Management
// ==========================================

/**
 * GET /admin/infrastructure/cdn/status
 * Get CDN configuration status
 */
router.get('/cdn/status', (req, res) => {
  res.json(cdn.getCDNStatus());
});

/**
 * POST /admin/infrastructure/cdn/purge
 * Purge CDN cache for specified paths
 */
router.post('/cdn/purge', async (req, res) => {
  try {
    const { paths } = req.body;
    
    if (!paths || !Array.isArray(paths)) {
      return void res.status(400).json({ error: 'paths array required' });
    }

    const result = await cdn.purgeCache(paths);
    logger.info('CDN cache purged', { paths, userId: req.user.id, result });
    res.json(result);
  } catch (error) {
    logger.error('CDN purge error', { error: error.message });
    res.status(500).json({ error: 'Failed to purge CDN cache' });
  }
});

// ==========================================
// Backup Management
// ==========================================

/**
 * GET /admin/infrastructure/backups
 * List available backups
 */
router.get('/backups', async (req, res) => {
  try {
    const backups = await backup.listBackups();
    res.json({ backups });
  } catch (error) {
    logger.error('List backups error', { error: error.message });
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * POST /admin/infrastructure/backups/create
 * Create a new backup
 */
router.post('/backups/create', async (req, res) => {
  try {
    const { type = 'full', format = 'custom' } = req.body;
    
    logger.info('Backup requested by admin', { type, format, userId: req.user.id });
    // @ts-ignore
    const result = await backup.createBackup({ type, format });
    
    res.json(result);
  } catch (error) {
    logger.error('Create backup error', { error: error.message });
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

/**
 * POST /admin/infrastructure/backups/verify/:filename
 * Verify a backup file
 */
router.post('/backups/verify/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const backupPath = `${backup.BACKUP_CONFIG.backupDir}/${filename}`;
    
    const result = await backup.verifyBackup(backupPath);
    res.json(result);
  } catch (error) {
    logger.error('Verify backup error', { error: error.message });
    res.status(500).json({ error: 'Failed to verify backup' });
  }
});

/**
 * POST /admin/infrastructure/backups/cleanup
 * Clean up old backups
 */
router.post('/backups/cleanup', async (req, res) => {
  try {
    const result = await backup.cleanupOldBackups();
    logger.info('Backup cleanup completed', { ...result, userId: req.user.id });
    res.json(result);
  } catch (error) {
    logger.error('Backup cleanup error', { error: error.message });
    res.status(500).json({ error: 'Failed to cleanup backups' });
  }
});

/**
 * GET /admin/infrastructure/backups/pitr
 * Get PITR (Point-in-Time Recovery) information
 */
router.get('/backups/pitr', (req, res) => {
  // @ts-ignore
  res.json(backup.getPITRInfo());
});

/**
 * GET /admin/infrastructure/backups/runbook
 * Get disaster recovery runbook
 */
router.get('/backups/runbook', (req, res) => {
  // @ts-ignore
  res.json(backup.getDisasterRecoveryRunbook());
});

// ==========================================
// System Information
// ==========================================

/**
 * GET /admin/infrastructure/system
 * Get system information
 */
router.get('/system', (req, res) => {
  const os = require('os');
  
  res.json({
    node: {
      version: process.version,
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
      pid: process.pid,
    },
    os: {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      loadAvg: os.loadavg(),
    },
    process: {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
  });
});

/**
 * GET /admin/infrastructure/env
 * Get safe environment information (no secrets)
 */
router.get('/env', (req, res) => {
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    API_URL: process.env.API_URL,
    WEB_URL: process.env.WEB_URL,
    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
    CDN_PROVIDER: process.env.CDN_PROVIDER,
    FEATURE_AI_ENABLED: process.env.FEATURE_AI_ENABLED,
    FEATURE_VIDEO_CALLING: process.env.FEATURE_VIDEO_CALLING,
    MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
  };
  
  res.json(safeEnv);
});

export default router;


export {};


