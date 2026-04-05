"use strict";

/**
 * Session Management Routes (Step 6)
 * 
 * Track user sessions across devices, enable logout-all-devices,
 * and provide session security features.
 */

import express from 'express';
import crypto from 'crypto';
import { prisma as prismaClient } from '../db';
const prisma = prismaClient as any;
import authenticateJWT from '../middleware/auth';
import { UAParser } from 'ua-parser-js';

const router = express.Router();

// ============================================
// Helper Functions
// ============================================

/**
 * Parse user agent string to get device info
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    return {
      device: result.device.type || 'desktop',
      browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
      os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
    };
  } catch (e) {
    return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }
}

/**
 * Get client IP address
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================
// GET /sessions - List user's active sessions
// ============================================
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentSessionId = req.sessionId; // From JWT middleware

    const sessions = await prisma.userSession.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        deviceType: true,
        browser: true,
        os: true,
        ipAddress: true,
        location: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    // Mark the current session
    const sessionsWithCurrent = sessions.map(session => ({
      ...session,
      isCurrent: session.id === currentSessionId,
      lastActiveAt: session.lastActiveAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    }));

    res.json({ sessions: sessionsWithCurrent });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// ============================================
// POST /sessions - Create a new session (called during login)
// ============================================
router.post('/', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const userAgent = req.headers['user-agent'];
    const ipAddress = getClientIp(req);
    const { device, browser, os } = parseUserAgent(userAgent);

    // Check for existing sessions limit (max 10 per user)
    const existingCount = await prisma.userSession.count({
      where: {
        userId,
        isActive: true,
      },
    });

    // If too many sessions, deactivate the oldest one
    if (existingCount >= 10) {
      const oldestSession = await prisma.userSession.findFirst({
        where: { userId, isActive: true },
        orderBy: { lastActiveAt: 'asc' },
      });

      if (oldestSession) {
        await prisma.userSession.update({
          where: { id: oldestSession.id },
          data: { isActive: false },
        });
      }
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        deviceType: device,
        browser,
        os,
        ipAddress,
        userAgent: userAgent?.substring(0, 500), // Limit length
        isActive: true,
        expiresAt,
        lastActiveAt: new Date(),
      },
    });

    res.status(201).json({
      sessionId: session.id,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// ============================================
// POST /sessions/heartbeat - Update session activity
// ============================================
router.post('/heartbeat', authenticateJWT, async (req, res) => {
  try {
    const sessionId = req.sessionId;
    
    if (!sessionId) {
      return void res.json({ success: true }); // No session tracking
    }

    await prisma.userSession.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });

    res.json({ success: true });
  } catch (error) {
    // Don't fail on heartbeat errors
    console.error('Heartbeat error:', error);
    res.json({ success: true });
  }
});

// ============================================
// DELETE /sessions/:id - Revoke a specific session
// ============================================
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const currentSessionId = req.sessionId;

    // Verify ownership
    const session = await prisma.userSession.findFirst({
      where: { id, userId },
    });

    if (!session) {
      return void res.status(404).json({ error: 'Session not found' });
    }

    // Prevent revoking current session through this endpoint
    if (id === currentSessionId) {
      return void res.status(400).json({ 
        error: 'Cannot revoke current session',
        message: 'Use /auth/logout to end your current session',
      });
    }

    await prisma.userSession.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// ============================================
// POST /sessions/logout-all - Revoke all sessions except current
// ============================================
router.post('/logout-all', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const currentSessionId = req.sessionId;
    const { includeCurrent = false } = req.body;

    const where: any = {
      userId,
      isActive: true,
    };

    // Optionally exclude current session
    if (!includeCurrent && currentSessionId) {
      where.id = { not: currentSessionId };
    }

    const result = await prisma.userSession.updateMany({
      where,
      data: { isActive: false },
    });

    res.json({ 
      success: true, 
      message: `${result.count} session(s) revoked`,
      revokedCount: result.count,
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to revoke sessions' });
  }
});

// ============================================
// GET /sessions/security-log - Get recent security events
// ============================================
router.get('/security-log', authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    // Get recent sessions (active and inactive) as security log
    const sessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      select: {
        id: true,
        deviceType: true,
        browser: true,
        os: true,
        ipAddress: true,
        location: true,
        isActive: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    // Transform to security events
    const events = sessions.map(session => ({
      id: session.id,
      type: 'login',
      device: `${session.browser} on ${session.os}`,
      location: session.location || 'Unknown',
      ip: session.ipAddress,
      timestamp: session.createdAt,
      isActive: session.isActive,
    }));

    res.json({ events });
  } catch (error) {
    console.error('Security log error:', error);
    res.status(500).json({ error: 'Failed to get security log' });
  }
});

// ============================================
// Middleware to track session activity
// ============================================
async function trackSession(req, res, next) {
  try {
    // Only track for authenticated requests
    if (!req.user || !req.sessionId) {
      return next();
    }

    // Update session activity asynchronously (don't block request)
    prisma.userSession.update({
      where: { id: req.sessionId },
      data: { lastActiveAt: new Date() },
    }).catch(err => {
      console.error('Session tracking error:', err);
    });

    next();
  } catch (error) {
    next(); // Don't fail on tracking errors
  }
}

// ============================================
// Helper: Create session on login
// ============================================
async function createSessionOnLogin(userId, req) {
  try {
    const userAgent = req.headers['user-agent'];
    const ipAddress = getClientIp(req);
    const { device, browser, os } = parseUserAgent(userAgent);

    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        deviceType: device,
        browser,
        os,
        ipAddress,
        userAgent: userAgent?.substring(0, 500),
        isActive: true,
        expiresAt,
        lastActiveAt: new Date(),
      },
    });

    return session;
  } catch (error) {
    console.error('Create session on login error:', error);
    return null;
  }
}

// ============================================
// Helper: Invalidate session on logout
// ============================================
async function invalidateSession(sessionId) {
  try {
    if (!sessionId) return;
    
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });
  } catch (error) {
    console.error('Invalidate session error:', error);
  }
}

// ============================================
// Helper: Check if session is valid
// ============================================
async function isSessionValid(sessionId) {
  if (!sessionId) return false;
  
  try {
    const session = await prisma.userSession.findFirst({
      where: {
        id: sessionId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });
    
    return !!session;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
}

export default router;

module.exports.trackSession = trackSession;
module.exports.createSessionOnLogin = createSessionOnLogin;
module.exports.invalidateSession = invalidateSession;
module.exports.isSessionValid = isSessionValid;
module.exports.parseUserAgent = parseUserAgent;
module.exports.getClientIp = getClientIp;

export {};

