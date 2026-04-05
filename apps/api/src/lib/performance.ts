/**
 * Performance Monitoring Utilities
 * 
 * Provides metrics collection, request timing, and performance insights.
 * Integrates with Sentry for APM in production.
 */

import { logger } from '../lib/logger';

// Request timing storage
const requestMetrics: Map<string, RequestMetric[]> = new Map();

// Configuration
const METRICS_CONFIG = {
  // How many data points to keep per endpoint
  maxSamplesPerEndpoint: 1000,
  
  // Slow request threshold in milliseconds
  slowRequestThreshold: 1000,
  
  // Very slow request threshold
  criticalThreshold: 5000,
  
  // How often to aggregate metrics (ms)
  aggregationInterval: 60000, // 1 minute
};

interface RequestMetric {
  timestamp: number;
  duration: number;
  statusCode: number;
  method: string;
  path: string;
  userId?: string;
  memoryUsage: number;
}

interface AggregatedMetric {
  endpoint: string;
  count: number;
  avgDuration: number;
  p50: number;
  p95: number;
  p99: number;
  maxDuration: number;
  minDuration: number;
  errorRate: number;
  avgMemoryUsage: number;
}

/**
 * Record a request metric
 */
export function recordRequestMetric(metric: Omit<RequestMetric, 'timestamp' | 'memoryUsage'>): void {
  const fullMetric: RequestMetric = {
    ...metric,
    timestamp: Date.now(),
    memoryUsage: process.memoryUsage().heapUsed,
  };

  const key = `${metric.method}:${metric.path}`;
  
  if (!requestMetrics.has(key)) {
    requestMetrics.set(key, []);
  }

  const metrics = requestMetrics.get(key)!;
  metrics.push(fullMetric);

  // Trim old metrics
  if (metrics.length > METRICS_CONFIG.maxSamplesPerEndpoint) {
    metrics.splice(0, metrics.length - METRICS_CONFIG.maxSamplesPerEndpoint);
  }

  // Log slow requests
  if (fullMetric.duration > METRICS_CONFIG.criticalThreshold) {
    logger.warn('Critical slow request detected', {
      method: metric.method,
      path: metric.path,
      duration: fullMetric.duration,
      statusCode: metric.statusCode,
      userId: metric.userId,
    });
  } else if (fullMetric.duration > METRICS_CONFIG.slowRequestThreshold) {
    logger.info('Slow request detected', {
      method: metric.method,
      path: metric.path,
      duration: fullMetric.duration,
    });
  }
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArr: number[], p: number): number {
  if (sortedArr.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, index)];
}

/**
 * Get aggregated metrics for all endpoints
 */
export function getAggregatedMetrics(): AggregatedMetric[] {
  const results: AggregatedMetric[] = [];

  for (const [endpoint, metrics] of requestMetrics.entries()) {
    if (metrics.length === 0) continue;

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const errors = metrics.filter(m => m.statusCode >= 400).length;

    results.push({
      endpoint,
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      errorRate: (errors / metrics.length) * 100,
      avgMemoryUsage: metrics.reduce((a, m) => a + m.memoryUsage, 0) / metrics.length,
    });
  }

  return results.sort((a, b) => b.avgDuration - a.avgDuration);
}

/**
 * Get slow endpoints (avg response time > threshold)
 */
export function getSlowEndpoints(): AggregatedMetric[] {
  return getAggregatedMetrics().filter(
    m => m.avgDuration > METRICS_CONFIG.slowRequestThreshold
  );
}

/**
 * Get endpoints with high error rates
 */
export function getHighErrorEndpoints(minErrorRate = 5): AggregatedMetric[] {
  return getAggregatedMetrics().filter(m => m.errorRate > minErrorRate);
}

/**
 * Clear all metrics (for testing)
 */
export function clearMetrics(): void {
  requestMetrics.clear();
}

/**
 * Get system health metrics
 */
export function getSystemHealth(): {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeConnections: number;
} {
  return {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    activeConnections: 0, // Would need to track this from server
  };
}

/**
 * Express middleware for request timing
 */
export function requestTimingMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const startHrTime = process.hrtime.bigint();

    // Hook into response finish
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - startHrTime) / 1_000_000; // ms
      
      // Normalize path to avoid high cardinality
      const normalizedPath = normalizePath(req.route?.path || req.path);

      recordRequestMetric({
        duration,
        statusCode: res.statusCode,
        method: req.method,
        path: normalizedPath,
        userId: req.user?.id,
      });
    });

    next();
  };
}

/**
 * Normalize path to reduce cardinality
 * /users/123 -> /users/:id
 * /jobs/abc-def-ghi -> /jobs/:id
 */
function normalizePath(path: string): string {
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace CUIDs
    .replace(/c[a-z0-9]{24}/gi, ':id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Replace slug-like patterns after known route prefixes
    .replace(/(\/jobs|\/users|\/companies|\/courses|\/mentors)\/.+$/i, '$1/:id');
}

/**
 * Periodic metrics aggregation and logging
 */
let aggregationInterval: NodeJS.Timeout | null = null;

export function startMetricsAggregation(): void {
  if (aggregationInterval) return;

  aggregationInterval = setInterval(() => {
    const metrics = getAggregatedMetrics();
    const slowEndpoints = metrics.filter(m => m.avgDuration > METRICS_CONFIG.slowRequestThreshold);

    if (slowEndpoints.length > 0) {
      logger.info('Slow endpoints detected', {
        count: slowEndpoints.length,
        endpoints: slowEndpoints.slice(0, 5).map(e => ({
          endpoint: e.endpoint,
          avgDuration: Math.round(e.avgDuration),
          p95: Math.round(e.p95),
        })),
      });
    }

    // Log memory usage periodically
    const memory = process.memoryUsage();
    const memoryMB = {
      heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
      rss: Math.round(memory.rss / 1024 / 1024),
    };

    if (memoryMB.heapUsed > 500) {
      logger.warn('High memory usage', memoryMB);
    }
  }, METRICS_CONFIG.aggregationInterval);
}

export function stopMetricsAggregation(): void {
  if (aggregationInterval) {
    clearInterval(aggregationInterval);
    aggregationInterval = null;
  }
}

export {};
