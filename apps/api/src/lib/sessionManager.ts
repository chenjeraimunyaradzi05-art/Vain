// @ts-nocheck
"use strict";
/**
 * Session Manager
 * 
 * Manages user sessions across devices with security features:
 * - Track active sessions per user
 * - Logout all devices
 * - Concurrent session limits
 * - Session timeout handling
 * - Device fingerprinting
 * - Suspicious login detection
 */

import { prisma } from '../db';
import logger from './logger';
import { audit, AuditCategory, AuditEvent } from './auditLog';
import crypto from 'crypto';

// Configuration
export const SESSION_CONFIG = {
  maxConcurrentSessions: 5,       // Max sessions per user
  sessionDuration: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  activityTimeout: 30 * 60 * 1000, // 30 minutes of inactivity
  suspiciousLocationThreshold: 2,  // Number of different countries in 1 hour
};

/**
 * Generate a secure session ID
 */
export function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Parse device info from user agent
 */
export function parseDeviceInfo(userAgent) {
  if (!userAgent) return 'Unknown Device';
  
  // Simple parsing - in production, use a proper UA parser
  const patterns = {
    'iPhone': /iPhone/,
    'iPad': /iPad/,
    'Android': /Android/,
    'Windows': /Windows NT/,
    'Mac': /Macintosh/,
    'Linux': /Linux/,
    'Chrome': /Chrome\//,
    'Firefox': /Firefox\//,
    'Safari': /Safari\//,
    'Edge': /Edg\//
  };
  
  const detected = [];
  for (const [name, pattern] of Object.entries(patterns)) {
    if (pattern.test(userAgent)) {
      detected.push(name);
    }
  }
  
  return detected.length > 0 ? detected.join(' - ') : 'Unknown Device';
}

/**
 * Generate device fingerprint
 */
export function generateDeviceId(req) {
  const components = [
    req.get('User-Agent') || '',
    req.get('Accept-Language') || '',
    req.get('Accept-Encoding') || '',
    req.ip || ''
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
export async function createSession(userId, req) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_CONFIG.sessionDuration);
  
  try {
    // Check concurrent session limit
    const activeCount = await prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: now }
      }
    });
    
    // If at limit, deactivate oldest session
    if (activeCount >= SESSION_CONFIG.maxConcurrentSessions) {
      const oldestSession = await prisma.userSession.findFirst({
        where: {
          userId,
          isActive: true
        },
        orderBy: { createdAt: 'asc' }
      });
      
      if (oldestSession) {
        await prisma.userSession.update({
          where: { id: oldestSession.id },
          data: { isActive: false }
        });
        
        logger.info('Deactivated oldest session due to limit', {
          userId,
          sessionId: oldestSession.id
        });
      }
    }
    
    // Create new session
    const session = await prisma.userSession.create({
      data: {
        userId,
        deviceInfo: parseDeviceInfo(req.get('User-Agent')),
        deviceId: generateDeviceId(req),
        ipAddress: req.ip || req.connection?.remoteAddress,
        location: null, // Could integrate IP geolocation service
        isActive: true,
        lastActiveAt: now,
        expiresAt
      }
    });
    
    // Audit log
    await audit.loginSuccess(userId, req, {
      sessionId: session.id,
      deviceInfo: session.deviceInfo
    });
    
    logger.info('Session created', { userId, sessionId: session.id });
    
    return {
      sessionId: session.id,
      expiresAt: session.expiresAt,
      deviceInfo: session.deviceInfo
    };
  } catch (error) {
    logger.error('Failed to create session', { userId, error: error.message });
    throw error;
  }
}

/**
 * Validate and update session activity
 */
export async function validateSession(sessionId, userId) {
  try {
    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
        isActive: true
      }
    });
    
    if (!session) {
      return { valid: false, reason: 'Session not found or inactive' };
    }
    
    const now = new Date();
    
    // Check expiration
    if (session.expiresAt < now) {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      });
      return { valid: false, reason: 'Session expired' };
    }
    
    // Check activity timeout
    const inactiveTime = now.getTime() - session.lastActiveAt.getTime();
    if (inactiveTime > SESSION_CONFIG.activityTimeout) {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      });
      return { valid: false, reason: 'Session timed out due to inactivity' };
    }
    
    // Update last activity
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: now }
    });
    
    return { valid: true, session };
  } catch (error) {
    logger.error('Session validation error', { sessionId, error: error.message });
    return { valid: false, reason: 'Validation error' };
  }
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId) {
  const now = new Date();
  
  const sessions = await prisma.userSession.findMany({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: now }
    },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      location: true,
      lastActiveAt: true,
      createdAt: true
    },
    orderBy: { lastActiveAt: 'desc' }
  });
  
  return sessions;
}

/**
 * Invalidate a specific session
 */
export async function invalidateSession(sessionId, userId, req) {
  try {
    const session = await prisma.userSession.findFirst({
      where: { id: sessionId, userId }
    });
    
    if (!session) {
      return { success: false, message: 'Session not found' };
    }
    
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false }
    });
    
    await audit.logout(userId, req);
    
    logger.info('Session invalidated', { userId, sessionId });
    
    return { success: true, message: 'Session terminated' };
  } catch (error) {
    logger.error('Failed to invalidate session', { sessionId, error: error.message });
    return { success: false, message: 'Failed to terminate session' };
  }
}

/**
 * Invalidate all sessions for a user (logout all devices)
 */
export async function invalidateAllSessions(userId, req, exceptSessionId = null) {
  try {
    const where: any = { userId, isActive: true };
    
    // Optionally exclude current session
    if (exceptSessionId) {
      where.id = { not: exceptSessionId };
    }
    
    const result = await prisma.userSession.updateMany({
      where,
      data: { isActive: false }
    });
    
    // Audit log
    await audit.create({
      category: 'AUTH',
      event: 'LOGOUT_ALL_DEVICES',
      userId,
      request: req,
      metadata: {
        sessionsTerminated: result.count,
        exceptCurrent: !!exceptSessionId
      }
    });
    
    logger.info('All sessions invalidated', { 
      userId, 
      count: result.count,
      exceptCurrent: !!exceptSessionId 
    });
    
    return { 
      success: true, 
      message: `Terminated ${result.count} sessions`,
      count: result.count 
    };
  } catch (error) {
    logger.error('Failed to invalidate all sessions', { userId, error: error.message });
    return { success: false, message: 'Failed to terminate sessions' };
  }
}

/**
 * Detect suspicious login patterns
 */
export async function detectSuspiciousLogin(userId, req) {
  const warnings = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  try {
    // Get recent sessions
    const recentSessions = await prisma.userSession.findMany({
      where: {
        userId,
        createdAt: { gt: oneHourAgo }
      },
      select: {
        ipAddress: true,
        deviceId: true,
        location: true
      }
    });
    
    // Check for multiple IPs in short time
    const uniqueIPs = new Set(recentSessions.map(s => s.ipAddress).filter(Boolean));
    if (uniqueIPs.size >= 3) {
      warnings.push('Multiple IP addresses detected in short time');
    }
    
    // Check for new device
    const currentDeviceId = generateDeviceId(req);
    const knownDevices = new Set(recentSessions.map(s => s.deviceId));
    if (!knownDevices.has(currentDeviceId)) {
      warnings.push('Login from new device');
    }
    
    // If suspicious, log it
    if (warnings.length > 0) {
      await audit.suspiciousActivity(userId, 'suspicious_login', req, {
        warnings,
        recentSessionCount: recentSessions.length
      });
    }
    
    return {
      suspicious: warnings.length > 0,
      warnings
    };
  } catch (error) {
    logger.error('Suspicious login detection error', { error: error.message });
    return { suspicious: false, warnings: [] };
  }
}

/**
 * Clean up expired sessions (run periodically)
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false, lastActiveAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
        ]
      }
    });
    
    logger.info('Cleaned up expired sessions', { count: result.count });
    return result.count;
  } catch (error) {
    logger.error('Session cleanup error', { error: error.message });
    return 0;
  }
}

/**
 * Get session statistics for admin
 */
export async function getSessionStats() {
  const now = new Date();
  
  const [total, active, byDevice] = await Promise.all([
    prisma.userSession.count(),
    prisma.userSession.count({
      where: { isActive: true, expiresAt: { gt: now } }
    }),
    prisma.userSession.groupBy({
      by: ['deviceInfo'],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { deviceInfo: 'desc' } },
      take: 10
    })
  ]);
  
  return {
    totalSessions: total,
    activeSessions: active,
    topDevices: byDevice.map(d => ({
      device: d.deviceInfo || 'Unknown',
      count: d._count
    }))
  };
}



export {};
