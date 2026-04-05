/**
 * Idempotency Keys (Step 55)
 * 
 * Prevents duplicate requests for critical operations:
 * - Payment processing
 * - User creation
 * - Order placement
 * 
 * Uses Redis to store idempotency keys with TTL
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import crypto from 'crypto';
import { logger } from './logger';

const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds
const KEY_PREFIX = 'idempotency:';

interface StoredResponse {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  timestamp: number;
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redis && process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

/**
 * Generate an idempotency key if not provided
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Create a cache key from the request
 */
function createCacheKey(userId: string | undefined, idempotencyKey: string, path: string): string {
  const prefix = userId || 'anonymous';
  return `${KEY_PREFIX}${prefix}:${idempotencyKey}:${path}`;
}

/**
 * Store a response for idempotency
 */
async function storeResponse(
  key: string,
  response: StoredResponse,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;
  
  try {
    await redisClient.setex(key, ttl, JSON.stringify(response));
  } catch (error) {
    logger.warn('Failed to store idempotency response', { key, error });
  }
}

/**
 * Retrieve a stored response
 */
async function getStoredResponse(key: string): Promise<StoredResponse | null> {
  const redisClient = getRedis();
  if (!redisClient) return null;
  
  try {
    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    logger.warn('Failed to retrieve idempotency response', { key, error });
  }
  
  return null;
}

/**
 * Lock a key to prevent concurrent processing
 */
async function acquireLock(key: string, timeout: number = 30): Promise<boolean> {
  const redisClient = getRedis();
  if (!redisClient) return true; // If no Redis, allow request through
  
  const lockKey = `${key}:lock`;
  try {
    const result = await redisClient.set(lockKey, Date.now().toString(), 'EX', timeout, 'NX');
    return result === 'OK';
  } catch (error) {
    logger.warn('Failed to acquire idempotency lock', { key, error });
    return true; // Allow request through on error
  }
}

/**
 * Release a lock
 */
async function releaseLock(key: string): Promise<void> {
  const redisClient = getRedis();
  if (!redisClient) return;
  
  const lockKey = `${key}:lock`;
  try {
    await redisClient.del(lockKey);
  } catch (error) {
    logger.warn('Failed to release idempotency lock', { key, error });
  }
}

/**
 * Idempotency middleware options
 */
interface IdempotencyOptions {
  /** Methods that require idempotency keys (default: POST, PUT, PATCH) */
  methods?: string[];
  /** Paths that require idempotency keys (default: all) */
  paths?: RegExp[];
  /** Whether to require idempotency key header (default: false) */
  required?: boolean;
  /** TTL for stored responses in seconds (default: 24 hours) */
  ttl?: number;
}

/**
 * Express middleware for idempotency
 */
export function idempotencyMiddleware(options: IdempotencyOptions = {}) {
  const {
    methods = ['POST', 'PUT', 'PATCH'],
    paths = [/.*/],
    required = false,
    ttl = DEFAULT_TTL,
  } = options;
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Check if this request method needs idempotency
    if (!methods.includes(req.method)) {
      next();
      return;
    }
    
    // Check if this path needs idempotency
    const pathMatches = paths.some(pattern => pattern.test(req.path));
    if (!pathMatches) {
      next();
      return;
    }
    
    // Get idempotency key from header
    const idempotencyKey = req.headers[IDEMPOTENCY_HEADER.toLowerCase()] as string | undefined;
    
    if (!idempotencyKey) {
      if (required) {
        res.status(400).json({
          error: 'Missing idempotency key',
          message: `The ${IDEMPOTENCY_HEADER} header is required for this operation`,
        });
        return;
      }
      // No key provided, proceed without idempotency
      next();
      return;
    }
    
    // Validate key format (should be UUID-like)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      res.status(400).json({
        error: 'Invalid idempotency key',
        message: 'Idempotency key must be a valid UUID',
      });
      return;
    }
    
    // Get user ID if authenticated
    const userId = (req as any).user?.id;
    const cacheKey = createCacheKey(userId, idempotencyKey, req.path);
    
    // Check for existing response
    const existingResponse = await getStoredResponse(cacheKey);
    if (existingResponse) {
      logger.info('Returning cached idempotent response', { 
        idempotencyKey, 
        path: req.path,
        originalTimestamp: existingResponse.timestamp,
      });
      
      // Return cached response
      res.set('X-Idempotency-Cached', 'true');
      Object.entries(existingResponse.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
      res.status(existingResponse.statusCode).json(existingResponse.body);
      return;
    }
    
    // Try to acquire lock
    const lockAcquired = await acquireLock(cacheKey);
    if (!lockAcquired) {
      res.status(409).json({
        error: 'Conflict',
        message: 'A request with this idempotency key is already being processed',
      });
      return;
    }
    
    // Intercept response to cache it
    const originalJson = res.json.bind(res);
    
    res.json = function (body: any) {
      // Only cache successful responses (2xx) and client errors (4xx)
      // Don't cache server errors (5xx) as they might be transient
      if (res.statusCode < 500) {
        const responseToStore: StoredResponse = {
          statusCode: res.statusCode,
          body,
          headers: {
            'Content-Type': res.get('Content-Type') || 'application/json',
          },
          timestamp: Date.now(),
        };
        
        storeResponse(cacheKey, responseToStore, ttl)
          .then(() => releaseLock(cacheKey))
          .catch(() => releaseLock(cacheKey));
      } else {
        releaseLock(cacheKey);
      }
      
      return originalJson(body);
    };
    
    next();
  };
}

/**
 * Critical paths that require idempotency
 */
export const criticalPathsIdempotency = idempotencyMiddleware({
  methods: ['POST'],
  paths: [
    /^\/api\/payments/,
    /^\/api\/orders/,
    /^\/api\/subscriptions/,
    /^\/api\/applications/,
    /^\/api\/stripe\/webhook/,
  ],
  required: true,
  ttl: 24 * 60 * 60, // 24 hours
});

/**
 * Optional idempotency for general mutations
 */
export const optionalIdempotency = idempotencyMiddleware({
  methods: ['POST', 'PUT', 'PATCH'],
  required: false,
  ttl: 60 * 60, // 1 hour
});

export default {
  idempotencyMiddleware,
  criticalPathsIdempotency,
  optionalIdempotency,
  generateIdempotencyKey,
};

export {};
