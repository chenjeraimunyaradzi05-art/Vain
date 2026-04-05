/**
 * API Metrics and Monitoring Middleware
 * Collects metrics for API performance monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Metrics storage (in production, use Prometheus/StatsD)
interface Metrics {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    byPath: Record<string, number>;
  };
  latency: {
    histogram: number[];
    sum: number;
    count: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  activeRequests: number;
}

const metrics: Metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byStatus: {},
    byPath: {},
  },
  latency: {
    histogram: [],
    sum: 0,
    count: 0,
  },
  errors: {
    total: 0,
    byType: {},
  },
  activeRequests: 0,
};

// Histogram buckets for latency (in ms)
const LATENCY_BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * Middleware to collect request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = process.hrtime.bigint();
  metrics.activeRequests++;
  
  // Increment total requests
  metrics.requests.total++;
  
  // Track by method
  const method = req.method;
  metrics.requests.byMethod[method] = (metrics.requests.byMethod[method] || 0) + 1;
  
  // Normalize path (remove IDs to group similar routes)
  const normalizedPath = normalizePath(req.path);
  metrics.requests.byPath[normalizedPath] = (metrics.requests.byPath[normalizedPath] || 0) + 1;
  
  // Hook into response finish event
  res.on('finish', () => {
    metrics.activeRequests--;
    
    // Calculate latency
    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1_000_000;
    
    // Update latency metrics
    metrics.latency.sum += latencyMs;
    metrics.latency.count++;
    updateHistogram(latencyMs);
    
    // Track by status code
    const statusCode = res.statusCode.toString();
    metrics.requests.byStatus[statusCode] = (metrics.requests.byStatus[statusCode] || 0) + 1;
    
    // Track errors
    if (res.statusCode >= 400) {
      metrics.errors.total++;
      const errorType = res.statusCode >= 500 ? 'server' : 'client';
      metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
    }
    
    // Log slow requests
    if (latencyMs > 1000) {
      logger.warn('Slow request detected', {
        method,
        path: req.path,
        latencyMs: Math.round(latencyMs),
        status: res.statusCode,
      });
    }
  });
  
  next();
}

/**
 * Normalize path by replacing IDs with placeholders
 */
function normalizePath(path: string): string {
  return path
    // Replace UUIDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    // Replace numeric IDs
    .replace(/\/\d+/g, '/:id')
    // Normalize trailing slashes
    .replace(/\/+$/, '');
}

/**
 * Update latency histogram
 */
function updateHistogram(latencyMs: number): void {
  for (let i = 0; i < LATENCY_BUCKETS.length; i++) {
    if (latencyMs <= LATENCY_BUCKETS[i]) {
      metrics.latency.histogram[i] = (metrics.latency.histogram[i] || 0) + 1;
      return;
    }
  }
  // Over the largest bucket
  const lastIdx = LATENCY_BUCKETS.length;
  metrics.latency.histogram[lastIdx] = (metrics.latency.histogram[lastIdx] || 0) + 1;
}

/**
 * Get current metrics snapshot
 */
export function getMetrics(): {
  requests: typeof metrics.requests;
  latency: {
    mean: number;
    p50: number;
    p95: number;
    p99: number;
    histogram: Record<string, number>;
  };
  errors: typeof metrics.errors;
  activeRequests: number;
} {
  const latencyStats = calculatePercentiles();
  
  // Convert histogram to labeled object
  const histogramLabeled: Record<string, number> = {};
  LATENCY_BUCKETS.forEach((bucket, i) => {
    histogramLabeled[`le_${bucket}ms`] = metrics.latency.histogram[i] || 0;
  });
  histogramLabeled['le_inf'] = metrics.latency.histogram[LATENCY_BUCKETS.length] || 0;
  
  return {
    requests: { ...metrics.requests },
    latency: {
      mean: metrics.latency.count > 0 ? metrics.latency.sum / metrics.latency.count : 0,
      p50: latencyStats.p50,
      p95: latencyStats.p95,
      p99: latencyStats.p99,
      histogram: histogramLabeled,
    },
    errors: { ...metrics.errors },
    activeRequests: metrics.activeRequests,
  };
}

/**
 * Calculate latency percentiles from histogram
 */
function calculatePercentiles(): { p50: number; p95: number; p99: number } {
  const total = metrics.latency.count;
  if (total === 0) {
    return { p50: 0, p95: 0, p99: 0 };
  }
  
  const p50Target = total * 0.5;
  const p95Target = total * 0.95;
  const p99Target = total * 0.99;
  
  let cumulative = 0;
  let p50 = 0, p95 = 0, p99 = 0;
  
  for (let i = 0; i <= LATENCY_BUCKETS.length; i++) {
    cumulative += metrics.latency.histogram[i] || 0;
    const bucketValue = i < LATENCY_BUCKETS.length ? LATENCY_BUCKETS[i] : LATENCY_BUCKETS[LATENCY_BUCKETS.length - 1] * 2;
    
    if (cumulative >= p50Target && p50 === 0) {
      p50 = bucketValue;
    }
    if (cumulative >= p95Target && p95 === 0) {
      p95 = bucketValue;
    }
    if (cumulative >= p99Target && p99 === 0) {
      p99 = bucketValue;
    }
  }
  
  return { p50, p95, p99 };
}

/**
 * Reset all metrics (for testing or scheduled reset)
 */
export function resetMetrics(): void {
  metrics.requests = {
    total: 0,
    byMethod: {},
    byStatus: {},
    byPath: {},
  };
  metrics.latency = {
    histogram: [],
    sum: 0,
    count: 0,
  };
  metrics.errors = {
    total: 0,
    byType: {},
  };
  // Don't reset activeRequests as those are live connections
}

/**
 * Get health check data
 */
export function getHealthStatus(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; message?: string }>;
  metrics: {
    uptime: number;
    requestsPerMinute: number;
    errorRate: number;
    avgLatencyMs: number;
  };
} {
  const now = Date.now();
  const uptimeMs = process.uptime() * 1000;
  
  // Calculate rates
  const requestsPerMinute = metrics.requests.total / (uptimeMs / 60000);
  const errorRate = metrics.requests.total > 0 
    ? (metrics.errors.total / metrics.requests.total) * 100 
    : 0;
  const avgLatency = metrics.latency.count > 0 
    ? metrics.latency.sum / metrics.latency.count 
    : 0;
  
  // Determine overall health
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const checks: Record<string, { status: string; message?: string }> = {};
  
  // Check error rate
  if (errorRate > 10) {
    checks.errorRate = { status: 'unhealthy', message: `Error rate is ${errorRate.toFixed(2)}%` };
    status = 'unhealthy';
  } else if (errorRate > 5) {
    checks.errorRate = { status: 'degraded', message: `Error rate is ${errorRate.toFixed(2)}%` };
    if (status === 'healthy') status = 'degraded';
  } else {
    checks.errorRate = { status: 'healthy' };
  }
  
  // Check latency
  if (avgLatency > 2000) {
    checks.latency = { status: 'unhealthy', message: `Avg latency is ${avgLatency.toFixed(0)}ms` };
    status = 'unhealthy';
  } else if (avgLatency > 500) {
    checks.latency = { status: 'degraded', message: `Avg latency is ${avgLatency.toFixed(0)}ms` };
    if (status === 'healthy') status = 'degraded';
  } else {
    checks.latency = { status: 'healthy' };
  }
  
  // Check active requests (potential connection leak)
  if (metrics.activeRequests > 100) {
    checks.activeRequests = { 
      status: 'degraded', 
      message: `${metrics.activeRequests} active requests` 
    };
    if (status === 'healthy') status = 'degraded';
  } else {
    checks.activeRequests = { status: 'healthy' };
  }
  
  return {
    status,
    checks,
    metrics: {
      uptime: Math.round(uptimeMs / 1000),
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      avgLatencyMs: Math.round(avgLatency),
    },
  };
}

/**
 * Prometheus-compatible metrics export
 */
export function getPrometheusMetrics(): string {
  const lines: string[] = [];
  
  // Request count
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  lines.push(`http_requests_total ${metrics.requests.total}`);
  
  // Request count by method
  for (const [method, count] of Object.entries(metrics.requests.byMethod)) {
    lines.push(`http_requests_total{method="${method}"} ${count}`);
  }
  
  // Request count by status
  for (const [status, count] of Object.entries(metrics.requests.byStatus)) {
    lines.push(`http_requests_total{status="${status}"} ${count}`);
  }
  
  // Latency histogram
  lines.push('# HELP http_request_duration_ms Request duration in milliseconds');
  lines.push('# TYPE http_request_duration_ms histogram');
  
  let cumulative = 0;
  LATENCY_BUCKETS.forEach((bucket, i) => {
    cumulative += metrics.latency.histogram[i] || 0;
    lines.push(`http_request_duration_ms_bucket{le="${bucket}"} ${cumulative}`);
  });
  cumulative += metrics.latency.histogram[LATENCY_BUCKETS.length] || 0;
  lines.push(`http_request_duration_ms_bucket{le="+Inf"} ${cumulative}`);
  lines.push(`http_request_duration_ms_sum ${metrics.latency.sum}`);
  lines.push(`http_request_duration_ms_count ${metrics.latency.count}`);
  
  // Active requests
  lines.push('# HELP http_requests_active Current number of active requests');
  lines.push('# TYPE http_requests_active gauge');
  lines.push(`http_requests_active ${metrics.activeRequests}`);
  
  // Errors
  lines.push('# HELP http_errors_total Total number of HTTP errors');
  lines.push('# TYPE http_errors_total counter');
  lines.push(`http_errors_total ${metrics.errors.total}`);
  
  return lines.join('\n');
}

/**
 * Get a summary of metrics in JSON format (for dashboards)
 */
export function getMetricsSummary(): {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byStatus: Record<string, number>;
    byPath: Record<string, number>;
  };
  latency: {
    average: number;
    p95: number;
    p99: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  activeRequests: number;
  system: {
    uptime: number;
    memory: {
      heapUsed: number;
      heapTotal: number;
      rss: number;
    };
    nodeVersion: string;
    platform: string;
  };
} {
  const latencyStats = calculatePercentiles();
  const memUsage = process.memoryUsage();
  
  return {
    requests: {
      total: metrics.requests.total,
      byMethod: { ...metrics.requests.byMethod },
      byStatus: { ...metrics.requests.byStatus },
      byPath: { ...metrics.requests.byPath },
    },
    latency: {
      average: metrics.latency.count > 0 ? metrics.latency.sum / metrics.latency.count : 0,
      p95: latencyStats.p95,
      p99: latencyStats.p99,
    },
    errors: {
      total: metrics.errors.total,
      rate: metrics.requests.total > 0 ? metrics.errors.total / metrics.requests.total : 0,
      byType: { ...metrics.errors.byType },
    },
    activeRequests: metrics.activeRequests,
    system: {
      uptime: process.uptime(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
      },
      nodeVersion: process.version,
      platform: process.platform,
    },
  };
}

export default {
  metricsMiddleware,
  getMetrics,
  getMetricsSummary,
  getHealthStatus,
  getPrometheusMetrics,
  resetMetrics,
};

export {};
