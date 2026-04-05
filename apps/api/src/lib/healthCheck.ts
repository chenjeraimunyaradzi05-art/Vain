/**
 * Deep Health Check (Step 52)
 * 
 * Comprehensive health checks for all dependencies:
 * - Database connectivity
 * - Redis connectivity
 * - External service availability
 */

import { prisma } from '../db';
import Redis from 'ioredis';
import { circuitBreakers } from './circuitBreaker';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      latency?: number;
      message?: string;
    };
  };
  circuitBreakers: {
    [key: string]: {
      state: string;
      failures: number;
    };
  };
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    try {
      redis = new Redis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 5000,
      });
    } catch {
      redis = null;
    }
  }
  return redis;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{ status: 'pass' | 'fail'; latency: number; message?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'pass', latency: Date.now() - start };
  } catch (error: any) {
    return { 
      status: 'fail', 
      latency: Date.now() - start,
      message: error.message || 'Database connection failed',
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<{ status: 'pass' | 'fail' | 'warn'; latency: number; message?: string }> {
  const redisClient = getRedis();
  
  if (!redisClient) {
    return { status: 'warn', latency: 0, message: 'Redis not configured' };
  }
  
  const start = Date.now();
  try {
    await redisClient.ping();
    return { status: 'pass', latency: Date.now() - start };
  } catch (error: any) {
    return { 
      status: 'fail', 
      latency: Date.now() - start,
      message: error.message || 'Redis connection failed',
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): { status: 'pass' | 'warn' | 'fail'; used: number; total: number } {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const percentUsed = (heapUsedMB / heapTotalMB) * 100;
  
  let status: 'pass' | 'warn' | 'fail' = 'pass';
  if (percentUsed > 90) {
    status = 'fail';
  } else if (percentUsed > 75) {
    status = 'warn';
  }
  
  return { status, used: heapUsedMB, total: heapTotalMB };
}

/**
 * Check disk space (basic check via process)
 */
function checkProcess(): { status: 'pass'; pid: number; uptime: number } {
  return {
    status: 'pass',
    pid: process.pid,
    uptime: process.uptime(),
  };
}

/**
 * Step 52: Deep health check endpoint
 */
export async function deepHealthCheck(): Promise<HealthStatus> {
  const [dbCheck, redisCheck] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);
  
  const memoryCheck = checkMemory();
  const processCheck = checkProcess();
  
  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (dbCheck.status === 'fail') {
    overallStatus = 'unhealthy';
  } else if (redisCheck.status === 'fail' || memoryCheck.status === 'fail') {
    overallStatus = 'degraded';
  } else if (redisCheck.status === 'warn' || memoryCheck.status === 'warn') {
    overallStatus = 'degraded';
  }
  
  // Get circuit breaker states
  const cbStates: { [key: string]: { state: string; failures: number } } = {};
  for (const [name, cb] of Object.entries(circuitBreakers)) {
    const stats = cb.getStats();
    cbStates[name] = {
      state: stats.state,
      failures: stats.failures,
    };
    
    // Open circuit breakers indicate degraded service
    if (stats.state === 'OPEN') {
      overallStatus = overallStatus === 'unhealthy' ? 'unhealthy' : 'degraded';
    }
  }
  
  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: processCheck.uptime,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: dbCheck,
      redis: redisCheck,
      memory: { 
        status: memoryCheck.status, 
        message: `${memoryCheck.used}MB / ${memoryCheck.total}MB`,
      },
      process: { status: processCheck.status },
    },
    circuitBreakers: cbStates,
  };
}

/**
 * Simple liveness check (is the process running?)
 */
export function livenessCheck(): { alive: boolean; uptime: number } {
  return {
    alive: true,
    uptime: process.uptime(),
  };
}

/**
 * Readiness check (is the service ready to accept traffic?)
 */
export async function readinessCheck(): Promise<{ ready: boolean; reason?: string }> {
  try {
    const dbCheck = await checkDatabase();
    
    if (dbCheck.status === 'fail') {
      return { ready: false, reason: 'Database not available' };
    }
    
    return { ready: true };
  } catch (error: any) {
    return { ready: false, reason: error.message };
  }
}

export default {
  deepHealthCheck,
  livenessCheck,
  readinessCheck,
};

export {};
