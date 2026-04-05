/**
 * Session Management
 * 
 * Secure session handling with Redis backend,
 * automatic rotation, and multi-device support.
 */

import Redis from 'ioredis';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

interface Session {
  id: string;
  userId: string;
  deviceId: string;
  userAgent: string;
  ip: string;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  data: Record<string, unknown>;
}

interface SessionConfig {
  prefix: string;
  maxAge: number;
  renewThreshold: number;
  maxSessions: number;
}

const DEFAULT_CONFIG: SessionConfig = {
  prefix: 'session',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  renewThreshold: 24 * 60 * 60 * 1000, // 1 day
  maxSessions: 5,
};

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }
  return redis;
}

/**
 * Generate a secure session ID
 */
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a device fingerprint
 */
function generateDeviceId(req: Request): string {
  const components = [
    req.headers['user-agent'] || '',
    req.headers['accept-language'] || '',
    req.headers['accept-encoding'] || '',
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  req: Request,
  data: Record<string, unknown> = {},
  config: Partial<SessionConfig> = {}
): Promise<Session> {
  const client = getRedisClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const now = Date.now();
  const sessionId = generateSessionId();
  const deviceId = generateDeviceId(req);
  
  const session: Session = {
    id: sessionId,
    userId,
    deviceId,
    userAgent: req.headers['user-agent'] || 'unknown',
    ip: getClientIp(req),
    createdAt: now,
    lastAccessedAt: now,
    expiresAt: now + finalConfig.maxAge,
    data,
  };

  // Store session
  const key = `${finalConfig.prefix}:${sessionId}`;
  await client.setex(
    key,
    Math.ceil(finalConfig.maxAge / 1000),
    JSON.stringify(session)
  );

  // Add to user's session list
  const userSessionsKey = `${finalConfig.prefix}:user:${userId}`;
  await client.zadd(userSessionsKey, now, sessionId);

  // Enforce max sessions limit
  await enforceSessionLimit(userId, finalConfig);

  return session;
}

/**
 * Get session by ID
 */
export async function getSession(
  sessionId: string,
  config: Partial<SessionConfig> = {}
): Promise<Session | null> {
  const client = getRedisClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const key = `${finalConfig.prefix}:${sessionId}`;
  const data = await client.get(key);
  
  if (!data) {
    return null;
  }

  const session: Session = JSON.parse(data);
  
  // Check if expired
  if (session.expiresAt < Date.now()) {
    await destroySession(sessionId, config);
    return null;
  }

  return session;
}

/**
 * Update session
 */
export async function updateSession(
  sessionId: string,
  updates: Partial<Pick<Session, 'data' | 'lastAccessedAt'>>,
  config: Partial<SessionConfig> = {}
): Promise<Session | null> {
  const client = getRedisClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const session = await getSession(sessionId, config);
  if (!session) {
    return null;
  }

  const updatedSession: Session = {
    ...session,
    lastAccessedAt: Date.now(),
    data: { ...session.data, ...(updates.data || {}) },
  };

  // Check if session should be renewed
  const timeToExpiry = session.expiresAt - Date.now();
  if (timeToExpiry < finalConfig.renewThreshold) {
    updatedSession.expiresAt = Date.now() + finalConfig.maxAge;
  }

  const key = `${finalConfig.prefix}:${sessionId}`;
  const ttl = Math.ceil((updatedSession.expiresAt - Date.now()) / 1000);
  
  await client.setex(key, ttl, JSON.stringify(updatedSession));

  return updatedSession;
}

/**
 * Destroy a session
 */
export async function destroySession(
  sessionId: string,
  config: Partial<SessionConfig> = {}
): Promise<boolean> {
  const client = getRedisClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const session = await getSession(sessionId, config);
  
  const key = `${finalConfig.prefix}:${sessionId}`;
  await client.del(key);

  // Remove from user's session list
  if (session) {
    const userSessionsKey = `${finalConfig.prefix}:user:${session.userId}`;
    await client.zrem(userSessionsKey, sessionId);
  }

  return true;
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(
  userId: string,
  config: Partial<SessionConfig> = {}
): Promise<Session[]> {
  const client = getRedisClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const userSessionsKey = `${finalConfig.prefix}:user:${userId}`;
  const sessionIds = await client.zrevrange(userSessionsKey, 0, -1);
  
  const sessions: Session[] = [];
  
  for (const sessionId of sessionIds) {
    const session = await getSession(sessionId, config);
    if (session) {
      sessions.push(session);
    }
  }

  return sessions;
}

/**
 * Destroy all sessions for a user
 */
export async function destroyAllUserSessions(
  userId: string,
  exceptSessionId?: string,
  config: Partial<SessionConfig> = {}
): Promise<number> {
  const sessions = await getUserSessions(userId, config);
  let count = 0;

  for (const session of sessions) {
    if (session.id !== exceptSessionId) {
      await destroySession(session.id, config);
      count++;
    }
  }

  return count;
}

/**
 * Enforce maximum sessions limit
 */
async function enforceSessionLimit(
  userId: string,
  config: SessionConfig
): Promise<void> {
  const client = getRedisClient();
  const userSessionsKey = `${config.prefix}:user:${userId}`;
  
  // Get all session IDs sorted by creation time (oldest first)
  const sessionCount = await client.zcard(userSessionsKey);
  
  if (sessionCount > config.maxSessions) {
    // Remove oldest sessions
    const toRemove = sessionCount - config.maxSessions;
    const oldestSessions = await client.zrange(userSessionsKey, 0, toRemove - 1);
    
    for (const sessionId of oldestSessions) {
      await destroySession(sessionId, config);
    }
  }
}

/**
 * Get client IP address
 */
function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.connection.remoteAddress ||
    'unknown'
  );
}

/**
 * Session middleware for Express
 */
export function sessionMiddleware(config: Partial<SessionConfig> = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get session ID from cookie or header
    const sessionId = 
      req.cookies?.sessionId ||
      req.headers['x-session-id'] as string;

    if (!sessionId) {
      (req as any).session = null;
      return next();
    }

    const session = await getSession(sessionId, config);
    
    if (!session) {
      // Clear invalid session cookie
      res.clearCookie('sessionId');
      (req as any).session = null;
      return next();
    }

    // Validate IP if strict mode
    if (process.env.SESSION_IP_CHECK === 'true') {
      const currentIp = getClientIp(req);
      if (session.ip !== currentIp) {
        await destroySession(sessionId, config);
        res.clearCookie('sessionId');
        (req as any).session = null;
        return next();
      }
    }

    // Update last accessed time
    await updateSession(sessionId, { lastAccessedAt: Date.now() }, config);

    // Attach session to request
    (req as any).session = session;
    (req as any).sessionId = sessionId;

    next();
  };
}

/**
 * Rotate session ID (for security after privilege changes)
 */
export async function rotateSession(
  oldSessionId: string,
  req: Request,
  config: Partial<SessionConfig> = {}
): Promise<Session | null> {
  const oldSession = await getSession(oldSessionId, config);
  
  if (!oldSession) {
    return null;
  }

  // Create new session with same data
  const newSession = await createSession(
    oldSession.userId,
    req,
    oldSession.data,
    config
  );

  // Destroy old session
  await destroySession(oldSessionId, config);

  return newSession;
}

export default {
  createSession,
  getSession,
  updateSession,
  destroySession,
  getUserSessions,
  destroyAllUserSessions,
  sessionMiddleware,
  rotateSession,
};

export {};
