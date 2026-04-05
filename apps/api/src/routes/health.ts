/**
 * Health Check Router
 * 
 * Provides comprehensive health check endpoints for monitoring.
 */

import { Router, Request, Response } from 'express';
import v8 from 'v8';
import { checkDatabaseHealth, getPoolStats } from '../lib/database';
import { getAggregatedMetrics, getSystemHealth } from '../lib/performance';
import * as cache from '../lib/redisCache';
import { getSocketMetrics, getConnectedUserCount } from '../lib/socket';

const router = Router();

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, onTimeout: () => T): Promise<T> {
  return Promise.race([
    promise,
    (async () => {
      await sleep(timeoutMs);
      return onTimeout();
    })(),
  ]);
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: ComponentHealth;
    cache: ComponentHealth;
    memory: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

/**
 * Basic liveness probe - just checks if the service is running
 * Used by container orchestration for quick health checks
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Readiness probe - checks if the service is ready to accept traffic
 * Includes database connectivity check
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const dbHealth = await withTimeout(
      checkDatabaseHealth(),
      parseInt(process.env.HEALTHCHECK_DB_TIMEOUT_MS || '1500', 10),
      () => ({ healthy: false, latencyMs: undefined, error: 'Database health check timed out' } as any)
    );
    
    if (dbHealth.healthy) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        database: { status: 'connected', latencyMs: dbHealth.latencyMs },
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        database: { status: 'disconnected', error: dbHealth.error },
      });
    }
  } catch (error: any) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

/**
 * Comprehensive health check - detailed status of all components
 */
router.get('/', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  
  // Check database
  const dbHealth = await withTimeout(
    checkDatabaseHealth(),
    parseInt(process.env.HEALTHCHECK_DB_TIMEOUT_MS || '1500', 10),
    () => ({ healthy: false, latencyMs: undefined, error: 'Database health check timed out' } as any)
  );
  const databaseCheck: ComponentHealth = {
    status: dbHealth.healthy ? 'healthy' : 'unhealthy',
    latencyMs: dbHealth.latencyMs,
    message: dbHealth.healthy ? 'Connected' : dbHealth.error,
  };

  // Check cache
  let cacheCheck: ComponentHealth;
  try {
    const cacheTestValue = `health-check-${Date.now()}`;
    const timeoutMs = parseInt(process.env.HEALTHCHECK_CACHE_TIMEOUT_MS || '800', 10);
    await withTimeout(
      cache.set('health-check', cacheTestValue, 10),
      timeoutMs,
      () => undefined as any
    );
    const retrieved = await withTimeout(
      cache.get('health-check'),
      timeoutMs,
      () => null as any
    );
    
    cacheCheck = {
      status: retrieved === cacheTestValue ? 'healthy' : 'degraded',
      message: retrieved === cacheTestValue ? 'Cache operational' : 'Cache read/write mismatch',
    };
  } catch (error: any) {
    cacheCheck = {
      status: 'degraded', // Cache is optional
      message: error.message,
    };
  }

  // Check memory
  const memoryUsage = process.memoryUsage();
  const heapStats = v8.getHeapStatistics();
  
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
  const heapLimitMB = heapStats.heap_size_limit / 1024 / 1024;
  
  // Use heap_size_limit as the denominator for health percentage
  // This correctly reflects available memory before OOM, unlike heapTotal which grows
  const heapUsagePercent = (heapUsedMB / heapLimitMB) * 100;

  const memoryCheck: ComponentHealth = {
    status: heapUsagePercent < 80 ? 'healthy' : heapUsagePercent < 90 ? 'degraded' : 'unhealthy',
    details: {
      heapUsedMB: Math.round(heapUsedMB),
      heapTotalMB: Math.round(heapTotalMB),
      heapLimitMB: Math.round(heapLimitMB),
      heapUsagePercent: Math.round(heapUsagePercent),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
    },
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (databaseCheck.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (cacheCheck.status === 'unhealthy' || memoryCheck.status === 'unhealthy') {
    overallStatus = 'degraded';
  } else if (cacheCheck.status === 'degraded' || memoryCheck.status === 'degraded') {
    overallStatus = 'degraded';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: databaseCheck,
      cache: cacheCheck,
      memory: memoryCheck,
    },
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

/**
 * Metrics endpoint for monitoring systems (Prometheus-compatible)
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  const metrics: string[] = [];
  
  // Process metrics
  const memoryUsage = process.memoryUsage();
  metrics.push(`# HELP process_memory_heap_bytes Heap memory usage`);
  metrics.push(`# TYPE process_memory_heap_bytes gauge`);
  metrics.push(`process_memory_heap_bytes{type="used"} ${memoryUsage.heapUsed}`);
  metrics.push(`process_memory_heap_bytes{type="total"} ${memoryUsage.heapTotal}`);
  
  metrics.push(`# HELP process_memory_rss_bytes Resident set size`);
  metrics.push(`# TYPE process_memory_rss_bytes gauge`);
  metrics.push(`process_memory_rss_bytes ${memoryUsage.rss}`);

  metrics.push(`# HELP process_uptime_seconds Process uptime`);
  metrics.push(`# TYPE process_uptime_seconds counter`);
  metrics.push(`process_uptime_seconds ${process.uptime()}`);

  // Socket.io metrics
  const socketStats = getSocketMetrics();
  metrics.push(`# HELP socketio_connections_total Total socket connections since start`);
  metrics.push(`# TYPE socketio_connections_total counter`);
  metrics.push(`socketio_connections_total ${socketStats.totalConnections}`);
  
  metrics.push(`# HELP socketio_connections_active Current active socket connections`);
  metrics.push(`# TYPE socketio_connections_active gauge`);
  metrics.push(`socketio_connections_active ${socketStats.activeConnections}`);
  
  metrics.push(`# HELP socketio_users_connected Current connected unique users`);
  metrics.push(`# TYPE socketio_users_connected gauge`);
  metrics.push(`socketio_users_connected ${socketStats.connectedUsers}`);
  
  metrics.push(`# HELP socketio_messages_received_total Messages received via socket`);
  metrics.push(`# TYPE socketio_messages_received_total counter`);
  metrics.push(`socketio_messages_received_total ${socketStats.messagesReceived}`);
  
  metrics.push(`# HELP socketio_messages_sent_total Messages sent via socket`);
  metrics.push(`# TYPE socketio_messages_sent_total counter`);
  metrics.push(`socketio_messages_sent_total ${socketStats.messagesSent}`);
  
  metrics.push(`# HELP socketio_errors_total Socket errors`);
  metrics.push(`# TYPE socketio_errors_total counter`);
  metrics.push(`socketio_errors_total ${socketStats.errors}`);

  // Request metrics from performance module
  const aggregatedMetrics = getAggregatedMetrics();
  
  metrics.push(`# HELP http_request_duration_seconds HTTP request latency`);
  metrics.push(`# TYPE http_request_duration_seconds summary`);
  
  for (const metric of aggregatedMetrics.slice(0, 20)) {
    const [method, path] = metric.endpoint.split(':');
    const labelPath = path?.replace(/"/g, '\\"') || 'unknown';
    metrics.push(`http_request_duration_seconds{method="${method}",path="${labelPath}",quantile="0.5"} ${metric.p50 / 1000}`);
    metrics.push(`http_request_duration_seconds{method="${method}",path="${labelPath}",quantile="0.95"} ${metric.p95 / 1000}`);
    metrics.push(`http_request_duration_seconds{method="${method}",path="${labelPath}",quantile="0.99"} ${metric.p99 / 1000}`);
  }

  res.set('Content-Type', 'text/plain');
  res.send(metrics.join('\n'));
});

/**
 * Version information
 */
router.get('/version', (_req: Request, res: Response) => {
  res.json({
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    environment: process.env.NODE_ENV || 'development',
    buildTime: process.env.BUILD_TIME || 'unknown',
    gitCommit: process.env.GIT_COMMIT || 'unknown',
  });
});

/**
 * Database pool statistics (admin only in production)
 */
router.get('/db-pool', (_req: Request, res: Response) => {
  const poolStats = getPoolStats();
  res.json(poolStats);
});

export default router;

export {};
