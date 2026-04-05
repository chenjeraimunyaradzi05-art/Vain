/**
 * Maintenance Mode (Step 60)
 * 
 * Allows putting the API into maintenance mode:
 * - Returns 503 for all requests
 * - Can be enabled/disabled via Redis flag or env var
 * - Allows health checks to pass
 * - Supports scheduled maintenance windows
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from './logger';

const MAINTENANCE_KEY = 'system:maintenance';
const BYPASS_HEADER = 'X-Maintenance-Bypass';

interface MaintenanceConfig {
  enabled: boolean;
  message: string;
  startTime?: Date;
  endTime?: Date;
  bypassToken?: string;
  allowedPaths: string[];
}

let redis: Redis | null = null;
let localConfig: MaintenanceConfig | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

function getRedis(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    // IMPORTANT: do not use lazyConnect without explicitly calling connect(),
    // otherwise Redis commands can hang forever and stall all requests.
    redis = new Redis(process.env.REDIS_URL, {
      connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '500', 10),
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
  }
  return redis;
}

/**
 * Default maintenance configuration
 */
function getDefaultConfig(): MaintenanceConfig {
  return {
    enabled: process.env.MAINTENANCE_MODE === 'true',
    message: process.env.MAINTENANCE_MESSAGE || 'The system is currently undergoing maintenance. Please try again later.',
    bypassToken: process.env.MAINTENANCE_BYPASS_TOKEN,
    allowedPaths: [
      '/health',
      '/health/live',
      '/health/ready',
      '/metrics',
      '/_internal/',
    ],
  };
}

/**
 * Get current maintenance configuration
 */
async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  // Check local override first
  if (localConfig) {
    return localConfig;
  }
  
  // Try Redis
  const redisClient = getRedis();
  if (redisClient) {
    try {
      const data = await withTimeout(
        redisClient.get(MAINTENANCE_KEY),
        parseInt(process.env.REDIS_OP_TIMEOUT_MS || '250', 10),
        'Redis GET maintenance config'
      );
      if (data) {
        const config = JSON.parse(data);
        return {
          ...getDefaultConfig(),
          ...config,
          startTime: config.startTime ? new Date(config.startTime) : undefined,
          endTime: config.endTime ? new Date(config.endTime) : undefined,
        };
      }
    } catch (error) {
      logger.warn('Failed to get maintenance config from Redis', { error });
    }
  }
  
  return getDefaultConfig();
}

/**
 * Check if maintenance is currently active
 */
export async function isMaintenanceActive(): Promise<boolean> {
  const config = await getMaintenanceConfig();
  
  if (!config.enabled) {
    return false;
  }
  
  const now = new Date();
  
  // Check time window
  if (config.startTime && now < config.startTime) {
    return false;
  }
  
  if (config.endTime && now > config.endTime) {
    return false;
  }
  
  return true;
}

/**
 * Enable maintenance mode
 */
export async function enableMaintenance(options: Partial<MaintenanceConfig> = {}): Promise<void> {
  const config: MaintenanceConfig = {
    ...getDefaultConfig(),
    ...options,
    enabled: true,
  };
  
  const redisClient = getRedis();
  if (redisClient) {
    try {
      await withTimeout(
        redisClient.set(MAINTENANCE_KEY, JSON.stringify(config)),
        parseInt(process.env.REDIS_OP_TIMEOUT_MS || '250', 10),
        'Redis SET maintenance config'
      );
      logger.info('Maintenance mode enabled', { config });
    } catch (error) {
      logger.error('Failed to enable maintenance mode in Redis', { error });
      // Fall back to local config
      localConfig = config;
    }
  } else {
    localConfig = config;
  }
}

/**
 * Disable maintenance mode
 */
export async function disableMaintenance(): Promise<void> {
  const redisClient = getRedis();
  if (redisClient) {
    try {
      await withTimeout(
        redisClient.del(MAINTENANCE_KEY),
        parseInt(process.env.REDIS_OP_TIMEOUT_MS || '250', 10),
        'Redis DEL maintenance config'
      );
      logger.info('Maintenance mode disabled');
    } catch (error) {
      logger.error('Failed to disable maintenance mode in Redis', { error });
    }
  }
  
  localConfig = null;
}

/**
 * Schedule maintenance window
 */
export async function scheduleMaintenanceWindow(
  startTime: Date,
  endTime: Date,
  message?: string
): Promise<void> {
  await enableMaintenance({
    startTime,
    endTime,
    message: message || `Scheduled maintenance from ${startTime.toISOString()} to ${endTime.toISOString()}`,
  });
  
  logger.info('Maintenance window scheduled', { startTime, endTime });
}

/**
 * Express middleware for maintenance mode
 */
export function maintenanceMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if path is allowed during maintenance
    const config = await getMaintenanceConfig();
    
    const isAllowedPath = config.allowedPaths.some(path => 
      req.path.startsWith(path) || req.path === path
    );
    
    if (isAllowedPath) {
      next();
      return;
    }
    
    // Check if maintenance is active
    const active = await isMaintenanceActive();
    if (!active) {
      next();
      return;
    }
    
    // Check for bypass token
    const bypassToken = req.headers[BYPASS_HEADER.toLowerCase()] as string | undefined;
    if (config.bypassToken && bypassToken === config.bypassToken) {
      logger.info('Maintenance bypass token used', { 
        ip: req.ip,
        path: req.path,
      });
      next();
      return;
    }
    
    // Return maintenance response
    const response: Record<string, any> = {
      error: 'Service Unavailable',
      message: config.message,
      maintenance: true,
    };
    
    if (config.endTime) {
      response.estimatedEndTime = config.endTime.toISOString();
      response.retryAfter = Math.ceil((config.endTime.getTime() - Date.now()) / 1000);
      res.set('Retry-After', String(response.retryAfter));
    }
    
    res.status(503).json(response);
  };
}

/**
 * Get maintenance status
 */
export async function getMaintenanceStatus(): Promise<{
  active: boolean;
  config: MaintenanceConfig;
}> {
  const config = await getMaintenanceConfig();
  const active = await isMaintenanceActive();
  
  return { active, config };
}

export default {
  isMaintenanceActive,
  enableMaintenance,
  disableMaintenance,
  scheduleMaintenanceWindow,
  maintenanceMiddleware,
  getMaintenanceStatus,
};

export {};
